import { NextRequest, NextResponse } from "next/server";
import { repo, RepoError } from "@/lib/repo";
import { allPages } from "@/lib/server/pages";
import { KIND_OF_STATUS, permOfKind, listTasks, notifications, listAssets, listUsers, createAsset, logEvent, me, listTemplates, listModels, listVersions, restoreVersion, snapshotVersion, listModelVersions, readLogFor, publishPages, moveModel, moveEntity, createModelFolder, renameModelFolder, deleteModelFolder, listEntityFolders, createEntityFolder, renameEntityFolder, deleteEntityFolder, saveModelDraft, publishModel, restoreModelVersion, createModel, duplicateModel, deleteModel, listEntities, getEntity, createEntity, saveEntity, publishEntity, deleteEntity, entityUsage, resolveBindings, reviewerOptions, autoAssignee, userName } from "@/lib/server/ucp";
import { can } from "@/lib/ucp/perms";
import { SESSION_COOKIE } from "@/lib/server/session";
import { PATHS } from "@/lib/ucp/paths";
import { CY } from "@/lib/ucp/seed";
import { market } from "@/lib/markets";
import type { TaskKind } from "@/lib/ucp/types";

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
    /* ---- content entities: reading is open; writing needs Edit on the market (authors create content, admins define models) ---- */
    if (o.startsWith("entities")) {
      const u = await me(); const mk = market(mid); const path = q.get("path") ?? "";
      if (o === "entities" && req.method === "GET") return ok(await listEntities(mid, q.get("model") ?? undefined));
      if (o === "entities/get" && req.method === "GET") { const e = await getEntity(path); return e ? ok({ ...e, usedOn: ((await entityUsage(mid))[path] ?? []).map((p) => p.path) }) : problem(new RepoError(404, "Entity not found", path)); }
      if (o === "entities/resolve" && req.method === "POST") return ok(await resolveBindings(await req.json(), q.get("published") === "true"));
      if (req.method !== "GET" && !can(u, "edit", mk.root, mk.root)) return problem(new RepoError(403, "You don't have Edit on this market", `Signed in as ${u.name}`));
      if (o === "entities/create" && req.method === "POST") { const b = await req.json(); const e = await createEntity(mid, b.model, b.title, b.values ?? {}, u.id, typeof b.folder === "string" ? b.folder : ""); await logEvent(mid, { type: "content", text: `created ${b.model} entity “${e.title}”`, target: e.path, requestId: rid }); return ok(e, 201); }
      if (o === "entities/save" && req.method === "POST") { const e = await saveEntity(path, await req.json(), u.id); await logEvent(mid, { type: "content", text: `saved ${e.model} entity “${e.title}”`, target: e.path, requestId: rid }); return ok(e); }
      if (o === "entities/publish" && req.method === "POST") { const e = await publishEntity(path, u.id); const n = ((await entityUsage(mid))[path] ?? []).length; await logEvent(mid, { type: "publishing", text: `published ${e.model} entity “${e.title}”${n ? ` (updates ${n} page${n === 1 ? "" : "s"})` : ""}`, target: e.path, requestId: rid }); return ok(e); }
      if (o === "entities/folders" && req.method === "GET") return ok(await listEntityFolders(mid));
      if (o.startsWith("entities/folders/") && req.method === "POST") { const b = await req.json(); const act = o.slice(17);
        const r = act === "create" ? await createEntityFolder(mid, b.model, b.name) : act === "rename" ? await renameEntityFolder(mid, b.model, b.from, b.to) : act === "delete" ? await deleteEntityFolder(mid, b.model, b.name) : null;
        if (!r) return problem(new RepoError(404, "Unknown operation", o)); await logEvent(mid, { type: "content", text: act === "rename" ? `renamed entity folder “${b.from}” to “${b.to}” in ${b.model}` : `${act === "create" ? "created" : "deleted"} entity folder “${b.name}” in ${b.model}`, target: "entities", requestId: rid }); return ok(r); }
      if (o === "entities/move" && req.method === "POST") { const r = await moveEntity(mid, path, await req.json(), u.id); await logEvent(mid, { type: "content", text: `moved entity “${r.entity.title}” to ${r.entity.model}${r.rebound ? ` (re-linked ${r.rebound} page${r.rebound === 1 ? "" : "s"})` : ""}`, target: r.entity.path, requestId: rid }); return ok(r); }
      if (o === "entities/delete" && req.method === "POST") { const used = (await entityUsage(mid))[path] ?? []; if (used.length) return problem(new RepoError(409, `Used on ${used.length} page${used.length === 1 ? "" : "s"}`, "Remove it from those pages first")); await deleteEntity(path); await logEvent(mid, { type: "content", text: `deleted entity ${path.split("/").pop()}`, target: "models", requestId: rid }); return ok({ ok: true }); }
    }
    /* ---- page bindings ({{alias.field}}) ---- */
    if (o === "bindings" && req.method === "POST") { const u = await me(); const mk = market(mid); const path = q.get("path") ?? ""; if (!can(u, "edit", path, mk.root)) return problem(new RepoError(403, "You don't have Edit on this page", `Signed in as ${u.name}`)); const b = await req.json(); await repo().setProps(`${path}/jcr:content`, { "ucp:bindings": JSON.stringify(b) }); await logEvent(mid, { type: "content", text: `linked ${Object.keys(b).length} content entit${Object.keys(b).length === 1 ? "y" : "ies"} to ${path.split("/").pop()}`, target: path, requestId: rid }); return ok(b); }
    /* ---- review assignment ---- */
    if (o === "reviewers" && req.method === "GET") return ok(await reviewerOptions(mid, q.get("path") ?? ""));
    if (o === "review/send" && req.method === "POST") {
      const u = await me(); const mk = market(mid); const path = q.get("path") ?? ""; const { assignee, auto, note } = await req.json() as { assignee?: string; auto?: boolean; note?: string };
      if (!can(u, "edit", path, mk.root)) return problem(new RepoError(403, "You don't have Edit on this page", `Signed in as ${u.name}`));
      const pick = auto || !assignee ? await autoAssignee(mid, path, u.id) : (await reviewerOptions(mid, path)).find((o) => o.id === assignee);
      if (!pick) return problem(new RepoError(400, "Nobody can review this page", "Ask a site admin to grant Review & approve on this folder"));
      const r = repo(); const before = await r.getPage(path); if (!before) return problem(new RepoError(404, "Page not found", path));
      const due = new Date(); due.setDate(due.getDate() + 3);
      await r.updateContent(path, { status: "review" }); await r.setProps(`${path}/jcr:content`, { "ucp:sentBy": u.id, "ucp:requestedBy": u.id, "ucp:sentAt": new Date().toISOString(), "ucp:due": due.toISOString(), "ucp:assignee": pick.id, "ucp:assignedBy": u.id, "ucp:reviewNote": note || null });
      await logEvent(mid, { type: "content", text: `sent ${before.title} for review to ${pick.name}${auto || !assignee ? " (assigned automatically)" : ""}`, target: path, requestId: rid });
      return ok({ assignee: pick.id, assigneeName: pick.name, auto: !!(auto || !assignee) });
    }
    if (o === "review/remind" && req.method === "POST") {
      const u = await me(); const path = q.get("path") ?? ""; const pg = await repo().getPage(path);
      if (!pg) return problem(new RepoError(404, "Page not found", path));
      if (pg.status !== "review" && pg.status !== "bizreview") return problem(new RepoError(409, "The page is not in review any more"));
      if (!can(u, "edit", path, market(mid).root)) return problem(new RepoError(403, "Only people who edit this page can send reminders", `Signed in as ${u.name}`));
      const last = typeof pg.meta?.["ucp:remindedAt"] === "string" ? Date.parse(String(pg.meta["ucp:remindedAt"])) : 0;
      if (last && Date.now() - last < 15 * 60_000) return problem(new RepoError(429, "A reminder was sent a few minutes ago", "Give the reviewer a moment before sending another"));
      const rid2 = pg.status === "bizreview" ? (pg.meta?.["ucp:taskKind"] === "BizReview" && typeof pg.meta?.["ucp:taskAssignee"] === "string" ? String(pg.meta["ucp:taskAssignee"]) : "") : typeof pg.meta?.["ucp:assignee"] === "string" ? String(pg.meta["ucp:assignee"]) : ""; const reviewer = rid2 ? await userName(rid2) : pg.status === "bizreview" ? "the business reviewers" : "the reviewers";
      const at = new Date().toISOString(); await repo().setProps(`${path}/jcr:content`, { "ucp:remindedAt": at, "ucp:remindedBy": u.id });
      await logEvent(mid, { type: "content", text: `reminded ${reviewer} that ${pg.title} is waiting for review`, target: path, requestId: rid });
      return ok({ remindedAt: at, reviewer });
    }
    if (o === "review/assign" && req.method === "POST") {
      const u = await me(); if (!(u.role === "admin" || u.perms.root?.manage)) return problem(new RepoError(403, "Only site admins can change the reviewer", `Signed in as ${u.name}`));
      const path = q.get("path") ?? ""; const { assignee, auto } = await req.json() as { assignee?: string; auto?: boolean };
      const pick = auto || !assignee ? await autoAssignee(mid, path, u.id) : (await reviewerOptions(mid, path)).find((o) => o.id === assignee);
      if (!pick) return problem(new RepoError(400, "That person cannot review this page"));
      const pg = await repo().getPage(path); if (!pg || pg.status !== "review") return problem(new RepoError(409, "The page is not in review"));
      const prev = typeof pg.meta?.["ucp:assignee"] === "string" ? await userName(String(pg.meta["ucp:assignee"])) : "nobody";
      await repo().setProps(`${path}/jcr:content`, { "ucp:assignee": pick.id, "ucp:assignedBy": u.id, "ucp:sentAt": new Date().toISOString() });
      await logEvent(mid, { type: "content", text: `reassigned the review of ${pg.title} from ${prev} to ${pick.name}`, target: path, requestId: rid });
      return ok({ assignee: pick.id, assigneeName: pick.name });
    }
    /* ---- task assignment (site admins): who should pick up a Review, Publish, Fix or Check task ---- */
    if (o === "task/people" && req.method === "GET") { const k = (q.get("kind") ?? "Review") as TaskKind; return ok(await reviewerOptions(mid, q.get("path") ?? "", permOfKind(k))); }
    if (o === "task/assign" && req.method === "POST") {
      const u = await me(); if (!(u.role === "admin" || u.perms.root?.manage)) return problem(new RepoError(403, "Only site admins can assign tasks", `Signed in as ${u.name}`));
      const path = q.get("path") ?? ""; const { kind, assignee } = await req.json() as { kind: TaskKind; assignee?: string | null };
      const pg = await repo().getPage(path); if (!pg) return problem(new RepoError(404, "Page not found", path));
      if (KIND_OF_STATUS[pg.status] !== kind) return problem(new RepoError(409, "This task is already done", `The page is now ${pg.status}`));
      const pick = assignee ? (await reviewerOptions(mid, path, permOfKind(kind))).find((x) => x.id === assignee) : undefined;
      if (assignee && !pick) return problem(new RepoError(400, `That person doesn't have ${kind === "Review" ? "Review & approve" : "Publish"} on this page`));
      const key = kind === "Review" ? "ucp:assignee" : "ucp:taskAssignee"; const prevId = kind === "Review" ? pg.meta?.["ucp:assignee"] : pg.meta?.["ucp:taskKind"] === kind ? pg.meta?.["ucp:taskAssignee"] : undefined;
      const prev = typeof prevId === "string" && prevId ? await userName(prevId) : "nobody";
      await repo().setProps(`${path}/jcr:content`, { [key]: pick?.id ?? null, ...(kind === "Review" ? {} : { "ucp:taskKind": pick ? kind : null }), "ucp:assignedBy": u.id });
      await logEvent(mid, { type: "content", text: pick ? `assigned the ${kind.toLowerCase()} task on ${pg.title} to ${pick.name}${prev !== "nobody" ? ` (was ${prev})` : ""}` : `removed ${prev} from the ${kind.toLowerCase()} task on ${pg.title}`, target: path, requestId: rid });
      return ok({ assignee: pick?.id ?? null, assigneeName: pick?.name ?? null });
    }
    /* ---- content models: every mutation needs a site admin (checked here, not only hidden in the UI) ---- */
    if (o.startsWith("models")) {
      const u = await me(); const admin = u.role === "admin" || !!u.perms.root?.manage; const id = q.get("id") ?? "";
      if (o === "models/versions" && req.method === "GET") return ok(await listModelVersions(id));
      if (!admin && req.method !== "GET") return problem(new RepoError(403, "Only site admins can change content models", `Signed in as ${u.name}`));
      if (o === "models/save" && req.method === "POST") { const m = await saveModelDraft(id, await req.json(), u.id); await logEvent(mid, { type: "content", text: `saved draft v${m.version} of model ${m.name}`, target: "models", requestId: rid }); return ok(m); }
      if (o === "models/publish" && req.method === "POST") { const m = await publishModel(id, u.id); await logEvent(mid, { type: "publishing", text: `published model ${m.name} v${m.version}`, target: "models", requestId: rid }); return ok(m); }
      if (o === "models/restore" && req.method === "POST") { const { versionId } = await req.json(); const m = await restoreModelVersion(id, versionId, u.id); await logEvent(mid, { type: "content", text: `restored version ${versionId} into the draft of model ${m.name}`, target: "models", requestId: rid }); return ok(m); }
      if (o === "models/create" && req.method === "POST") { const m = await createModel(await req.json(), u.id); await logEvent(mid, { type: "content", text: `created model ${m.name}`, target: "models", requestId: rid }); return ok(m, 201); }
      if (o === "models/duplicate" && req.method === "POST") { const m = await duplicateModel(id, u.id); await logEvent(mid, { type: "content", text: `duplicated model ${id} as ${m.id}`, target: "models", requestId: rid }); return ok(m, 201); }
      if (o.startsWith("models/folders/") && req.method === "POST") { const b = await req.json(); const act = o.slice(15);
        const r = act === "create" ? await createModelFolder(b.name) : act === "rename" ? await renameModelFolder(b.from, b.to, u.id) : act === "delete" ? await deleteModelFolder(b.name) : null;
        if (!r) return problem(new RepoError(404, "Unknown operation", o)); await logEvent(mid, { type: "content", text: act === "rename" ? `renamed model folder “${b.from}” to “${b.to}”` : `${act === "create" ? "created" : "deleted"} model folder “${b.name}”`, target: "models", requestId: rid }); return ok(r); }
      if (o === "models/move" && req.method === "POST") { const b = await req.json(); const m = await moveModel(id, b, u.id); await logEvent(mid, { type: "content", text: `moved model ${m.name} to ${m.group}`, target: "models", requestId: rid }); return ok(m); }
      if (o === "models/delete" && req.method === "POST") { await deleteModel(id); await logEvent(mid, { type: "content", text: `deleted model ${id}`, target: "models", requestId: rid }); return ok({ ok: true }); }
    }
    if (o === "login" && req.method === "POST") { const { id } = await req.json(); const u = (await listUsers()).find((x) => x.id === id); if (!u) return problem(new RepoError(401, "Unknown user", id)); const res = ok({ ok: true, user: u }); res.cookies.set(SESSION_COOKIE, u.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 }); await logEvent(mid, { type: "system", who: u.id, text: "signed in (SSO stand-in)", target: `user:${u.id}`, requestId: rid }); return res; }
    if (o === "logout" && req.method === "POST") { const res = ok({ ok: true }); res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 }); return res; }
    if (o === "versions" && req.method === "GET") return ok(await listVersions(q.get("path") ?? ""));
    if (o === "versions/restore" && req.method === "POST") { const { id } = await req.json(); const path = q.get("path") ?? ""; const u = await me(); await snapshotVersion(path, "before restore", u.id); await restoreVersion(path, id); await logEvent(mid, { type: "content", text: `restored version ${id} of ${path.split("/").pop()}`, target: path, requestId: rid }); return ok({ ok: true }); }
    if (o === "me") return ok(await me());
    if (o === "assets") return ok(await listAssets(mid));
    if (o === "notifications") return ok(await notifications(mid));
    /* ---- publish now / schedule / cancel a schedule, for one page or a batch (permission checked per page) ---- */
    if (o === "publish" && req.method === "POST") { const b = await req.json(); const paths: string[] = Array.isArray(b.paths) ? b.paths.filter((x: unknown) => typeof x === "string") : [];
      if (!paths.length) return problem(new RepoError(400, "Choose at least one page")); return ok(await publishPages(mid, paths, { at: typeof b.at === "string" ? b.at : undefined, cancel: !!b.cancel }, await me())); }
    if (o === "log" && req.method === "GET") return ok((await readLogFor(mid)).log);
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
