import { NextRequest, NextResponse } from "next/server";
import { repo, RepoError } from "@/lib/repo";
import { allPages } from "@/lib/server/pages";
import { listTasks, notifications, listAssets, listUsers, createAsset, logEvent, readLog, me, listTemplates, listModels } from "@/lib/server/ucp";
import { PATHS } from "@/lib/ucp/paths";
import { CY } from "@/lib/ucp/seed";
import { market } from "@/lib/markets";

/**
 * Derived, market-scoped reads and a few multi-step actions the UI needs. Everything persists through the repo port.
 *   GET  /api/ucp/tasks?market=            Task[]
 *   GET  /api/ucp/me                       User (signed-in user, resolved from repo identity)
 *   GET  /api/ucp/assets?market=           Asset[]
 *   GET  /api/ucp/notifications?market=    Notification[]
 *   GET  /api/ucp/search?market=&q=        { pages, assets, users, templates, models }
 *   GET  /api/ucp/log?market=              AuditEvent[]
 *   POST /api/ucp/log?market=              { type, text, target, level }   explicit audit line
 *   POST /api/ucp/upload?market=&folder=   multipart files → Asset[] (data URL kept for images ≤ 1.5 MB)
 *   POST /api/ucp/translate?market=        { pages: string[], langs: string[], review: boolean, dest?: string } → created paths
 */
const problem = (e: unknown) => { const err = e instanceof RepoError ? e : new RepoError(500, e instanceof Error ? e.message : "Unexpected error"); return NextResponse.json({ type: "about:blank", title: err.message, status: err.status, detail: err.detail }, { status: err.status, headers: { "Content-Type": "application/problem+json" } }); };

async function handle(req: NextRequest, ctx: { params: Promise<{ op: string[] }> }) {
  const { op } = await ctx.params; const o = op.join("/"); const q = req.nextUrl.searchParams; const mid = q.get("market") ?? "uk"; const rid = crypto.randomUUID();
  const ok = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "X-Request-Id": rid } });
  try {
    if (o === "tasks") return ok(await listTasks(mid));
    if (o === "me") return ok(await me());
    if (o === "assets") return ok(await listAssets(mid));
    if (o === "notifications") return ok(await notifications(mid));
    if (o === "log" && req.method === "GET") return ok(await readLog(mid));
    if (o === "log" && req.method === "POST") { const b = await req.json(); await logEvent(mid, { ...b, requestId: rid }); return ok({ ok: true }, 201); }
    if (o === "search") {
      const s = (q.get("q") ?? "").toLowerCase().trim(); const root = PATHS.content(mid);
      const [pages, assets, users, templates, models] = await Promise.all([allPages(root), listAssets(mid), listUsers(), listTemplates(), listModels()]);
      const hit = (x: string) => !!s && x.toLowerCase().includes(s);
      return ok({ pages: pages.filter((p) => !p.isFolder && (hit(p.title) || hit(p.path.replace(root, "")))).slice(0, 8), assets: assets.filter((a) => hit(a.name)).slice(0, 5), users: users.filter((u) => hit(u.name) || hit(u.team)).slice(0, 4), templates: templates.filter((t) => hit(t.name)).slice(0, 3), models: models.filter((m) => hit(m.name)).slice(0, 3) });
    }
    if (o === "upload" && req.method === "POST") {
      const form = await req.formData(); const folder = q.get("folder") || "Uploads"; const by = (await me()).id; const out = [];
      for (const f of form.getAll("files")) { if (!(f instanceof File)) continue; const type = f.type.startsWith("image/") ? (f.type === "image/svg+xml" ? "svg" : "image") : f.type === "application/pdf" ? "pdf" : "file"; const size = f.size > 1048576 ? (f.size / 1048576).toFixed(1) + " MB" : Math.round(f.size / 1024) + " KB"; let data: string | undefined; if ((type === "image" || type === "svg") && f.size < 1500000) data = `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString("base64")}`; out.push(await createAsset(mid, { name: f.name, type, size, folder, data, by })); }
      await logEvent(mid, { type: "content", text: out.length === 1 ? `uploaded ${out[0].name}` : `uploaded ${out.length} files`, target: "assets", requestId: rid });
      return ok(out, 201);
    }
    if (o === "translate" && req.method === "POST") {
      const b = await req.json() as { pages: string[]; langs: string[]; review?: boolean; dest?: string; mode?: "ai" | "vendor" }; const r = repo(); const created: string[] = []; const mk = market(mid);
      const tr = (t: string, lang: string) => CY[t] && lang === "cy-GB" ? CY[t] : `${t} (${lang})`;
      for (const lang of b.langs) for (const src of b.pages) {
        const v = await r.getPage(src); if (!v) continue; const parent = b.dest || src.replace(/\/[^/]+$/, ""); const name = `${lang.split("-")[0]}-${v.name}`; const path = `${parent}/${name}`;
        if (await r.getPage(path)) { created.push(path + " (exists)"); continue; }
        const p = await r.createPage({ parentPath: parent, name, template: v.template ?? "blank", title: tr(v.title, lang) });
        await r.setProps(`${p.path}/jcr:content`, { "jcr:language": lang, "ucp:sourcePath": src, "ucp:status": b.review ? "review" : "draft", "ucp:translationMode": b.mode ?? "ai", ...(b.review ? { "ucp:sentBy": (await me()).id, "ucp:sentAt": new Date().toISOString() } : {}) }).catch(() => {});
        await r.saveComponents(p.path, v.components.map((c) => ({ ...c, props: Object.fromEntries(Object.entries(c.props).map(([k, val]) => [k, ["heading", "intro", "body", "text", "cta", "note"].includes(k) && typeof val === "string" && val && b.mode !== "vendor" ? tr(val, lang) : val])) })));
        created.push(p.path);
      }
      await logEvent(mid, { type: "content", text: `translated ${b.pages.length} page${b.pages.length === 1 ? "" : "s"} to ${b.langs.join(", ")}${b.mode === "vendor" ? " (sent to vendor)" : " (AI draft)"}`, target: PATHS.content(mid), requestId: rid });
      return ok({ created, locales: mk.locales }, 201);
    }
    return problem(new RepoError(404, "Unknown operation", o));
  } catch (e) { return problem(e); }
}
export { handle as GET, handle as POST };
