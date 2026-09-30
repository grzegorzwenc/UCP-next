import { NextRequest, NextResponse } from "next/server";
import { RepoError } from "@/lib/repo";
import { clApi, clRender, clSlingJson, clSlingPost, isEditablePath } from "@/lib/server/contentlibre";
import { logEvent, me } from "@/lib/server/ucp";
import { repo } from "@/lib/repo";
import { getMarkets } from "@/lib/server/markets";

/** The page a content or draft-payload path belongs to: `/var/pages/drafts/content/x/<id>/jcr:content/...` → `/content/x`. */
const pageOf = (path: string) => path.replace(/^\/var\/pages\/drafts/, "").replace(/\/[a-z0-9]{8}\/jcr:content(\/.*)?$/, "").replace(/\/jcr:content(\/.*)?$/, "");

/** Records a builder action in the audit trail of the page's market. Best effort: it never fails the action it describes. */
async function audit(path: string, type: "content" | "publishing", text: string) {
  const page = pageOf(path);
  const market = (await getMarkets()).find((m) => page === m.root || page.startsWith(m.root + "/"))?.id;
  if (market) await logEvent(market, { type, text: `${text} ${page.split("/").pop()}`, target: page }).catch(() => undefined);
}

/** Answers `result` after recording what happened. */
async function done(result: unknown, path: string, type: "content" | "publishing", text: string, status = 200) {
  await audit(path, type, text);
  return NextResponse.json(result, { status });
}

/**
 * The page builder's backend on ContentLIBRE (UCP_BACKEND=contentlibre). Everything runs as the signed-in person.
 *
 *   GET    /api/cl/drafts?path=                    content/v1/drafts
 *   POST   /api/cl/drafts?path=                    { from?, label? }        open a draft
 *   DELETE /api/cl/drafts?path=&draft=             discard
 *   POST   /api/cl/drafts/publish?path=            { draft, revision?, force? }
 *   POST   /api/cl/drafts/review?path=             { draft, assignee?, due?, note? }   send for review
 *   POST   /api/cl/drafts/decision?path=           { draft, decision: approve|request-changes, comment? }
 *   POST   /api/cl/drafts/review/assign?path=      { draft, assignee? }     a different reviewer, same request
 *   POST   /api/cl/drafts/review/remind?path=      { draft }                at most every 15 minutes (429)
 *   POST   /api/cl/drafts/schedule?path=           { draft, at, revision? } publish later
 *   DELETE /api/cl/drafts/schedule?path=&draft=    off the schedule
 *   GET    /api/cl/reviews?root=                   the review queue below a root
 *   GET    /api/cl/page?path=&draft=               page document, content fields from the draft
 *   PATCH  /api/cl/page?path=&draft=               { title?, description?, navTitle?, hideInNav? }
 *   GET    /api/cl/model?node=                     <node>.libre-model.json + the node's own properties
 *   POST   /api/cl/component/insert                { slot, resourceType, fields[] }
 *   POST   /api/cl/component/properties            { node, entries: [name, value][] }
 *   POST   /api/cl/component/remove                { node }
 *   POST   /api/cl/component/move                  { slot, source, before? }
 *   GET    /api/cl/templates?path=                 the templates a page may be created from under path (`.libre-templates.json`)
 *   GET    /api/cl/preview?path=&draft=&edit=1     the server's render, for the preview iframe (edit=1: with component and field markers)
 *
 * Components use the editor's own contracts (model JSON + Sling POST), so the backend's composition validator and
 * publication rules decide every write, exactly as for ContentLIBRE's /edit.
 */
const problem = (e: unknown) => {
  const err = e instanceof RepoError ? e : new RepoError(500, e instanceof Error ? e.message : "Unexpected error");
  return NextResponse.json({ type: "about:blank", title: err.message, status: err.status, detail: err.detail }, { status: err.status, headers: { "Content-Type": "application/problem+json" } });
};
const requireEditable = (path: unknown): string => {
  if (typeof path !== "string" || !isEditablePath(path)) throw new RepoError(400, "Not a content or draft path", String(path));
  return path;
};

type Field = { name: string; type: string; default?: unknown };
/** The encoding ContentLIBRE's editor uses (core.mjs `encode`): the field's JCR type rides as a @TypeHint. */
function encode(field: Field, value: unknown): [string, string][] {
  if (field.type === "readonly") return [];
  if (field.type === "boolean") return [[`${field.name}@TypeHint`, "Boolean"], [field.name, value ? "true" : "false"]];
  if (field.type === "long") return [[`${field.name}@TypeHint`, "Long"], [field.name, String(value ?? 0)]];
  if (field.type === "string[]") return [[`${field.name}@TypeHint`, "String[]"], ...((Array.isArray(value) ? value : []) as unknown[]).map((v): [string, string] => [field.name, String(v)])];
  return [[field.name, value === null || value === undefined ? "" : String(value)]];
}

/** Writes a lock stops (Pages → Lock); the review goes on - asking, reminding and deciding are not edits. */
const LOCKED = new Set(["drafts:POST", "drafts:DELETE", "drafts/publish:POST", "drafts/schedule:POST", "page:PATCH", "component/insert:POST", "component/properties:POST", "component/remove:POST", "component/move:POST"]);
/** A locked page is changed only by whoever locked it or a site admin - the same rule the CMS's own routes apply. */
async function lockGuard(page: string) {
  const raw = (await repo().getPage(page).catch(() => undefined))?.meta?.["ucp:pageLock"]; if (typeof raw !== "string" || !raw) return;
  let lk: { by?: string; name?: string } = {}; try { lk = JSON.parse(raw) as typeof lk; } catch { return; }
  const u = await me(); if (lk.by === u.id || u.role === "admin" || u.perms.root?.manage) return;
  throw new RepoError(423, `Locked by ${lk.name ?? "someone"}`, "Ask them or a site admin to unlock it in Pages");
}

async function handle(req: NextRequest, ctx: { params: Promise<{ op: string[] }> }) {
  const { op } = await ctx.params; const o = op.join("/"); const q = req.nextUrl.searchParams;
  const path = q.get("path") ?? undefined; const draft = q.get("draft") ?? undefined;
  try {
    if (LOCKED.has(`${o}:${req.method}`)) {
      const b = o.startsWith("component/") ? await req.clone().json().catch(() => ({})) as { node?: string; slot?: string } : {};
      const target = path ?? b.node ?? b.slot; if (target) await lockGuard(pageOf(target));
    }
    if (o === "drafts" && req.method === "GET") return NextResponse.json(await clApi("GET", "content/v1/drafts", { path }));
    if (o === "drafts" && req.method === "POST") return done(await clApi("POST", "content/v1/drafts", { path }, await req.json().catch(() => ({}))), path!, "content", "opened a draft of", 201);
    if (o === "drafts" && req.method === "DELETE") return done(await clApi("DELETE", "content/v1/drafts", { path, draft }), path!, "content", "discarded a draft of");
    if (o === "drafts/publish" && req.method === "POST") return done(await clApi("POST", "content/v1/drafts/publish", { path }, await req.json()), path!, "publishing", "published");
    if (o === "drafts/review" && req.method === "POST") return done(await clApi("POST", "content/v1/drafts/review", { path }, await req.json()), path!, "publishing", "sent for review");
    if (o === "drafts/decision" && req.method === "POST") { const b = await req.json() as { decision?: string }; return done(await clApi("POST", "content/v1/drafts/decision", { path }, b), path!, "publishing", b.decision === "approve" ? "approved" : "requested changes to"); }
    if (o === "drafts/review/assign" && req.method === "POST") { const b = await req.json() as { assignee?: string }; return done(await clApi("POST", "content/v1/drafts/review/assign", { path }, b), path!, "content", b.assignee ? `asked ${b.assignee} to review` : "opened the review to any approver of"); }
    if (o === "drafts/review/remind" && req.method === "POST") return done(await clApi("POST", "content/v1/drafts/review/remind", { path }, await req.json()), path!, "content", "reminded the reviewer of");
    if (o === "drafts/schedule" && req.method === "POST") return done(await clApi("POST", "content/v1/drafts/schedule", { path }, await req.json()), path!, "publishing", "scheduled the publication of");
    if (o === "drafts/schedule" && req.method === "DELETE") return done(await clApi("DELETE", "content/v1/drafts/schedule", { path, draft }), path!, "publishing", "cancelled the scheduled publication of");
    if (o === "reviews" && req.method === "GET") return NextResponse.json(await clApi("GET", "content/v1/drafts/reviews", { root: q.get("root") ?? undefined }));
    if (o === "page" && req.method === "GET") return NextResponse.json(await clApi("GET", "content/v1/page", { path, draft }));
    if (o === "page" && req.method === "PATCH") return done(await clApi("PATCH", "content/v1/page", { path, draft }, await req.json(), "application/merge-patch+json"), path!, "content", "edited the details of");
    if (o === "model" && req.method === "GET") {
      const node = requireEditable(q.get("node"));
      const [model, props] = await Promise.all([clSlingJson(`${node}.libre-model.json`), clSlingJson<Record<string, unknown>>(`${node}.json`)]);
      return NextResponse.json({ ...(model as object), values: props });
    }
    if (o === "component/insert" && req.method === "POST") {
      const b = await req.json() as { slot: string; resourceType: string; fields?: Field[]; before?: string };
      const slot = requireEditable(b.slot); const short = b.resourceType.split("/").pop() ?? "component";
      const entries: [string, string][] = [[":nameHint", short], ["sling:resourceType", b.resourceType], ...(b.before ? [[":order", `before ${b.before}`] as [string, string]] : [])];
      for (const f of b.fields ?? []) entries.push(...encode(f, f.default));
      return done(await clSlingPost(`${slot}/*`, entries), slot, "content", `added a ${short} to`);
    }
    if (o === "component/properties" && req.method === "POST") {
      const b = await req.json() as { node: string; values: { field: Field; value: unknown }[] };
      const entries = b.values.flatMap((v) => encode(v.field, v.value));
      if (!entries.length) return NextResponse.json({ message: "Nothing changed." });
      return done(await clSlingPost(requireEditable(b.node), entries), b.node, "content", "edited");
    }
    if (o === "component/remove" && req.method === "POST") { const b = await req.json() as { node: string }; return done(await clSlingPost(requireEditable(b.node), [[":operation", "delete"]]), b.node, "content", "removed a component from"); }
    if (o === "component/move" && req.method === "POST") {
      const b = await req.json() as { slot: string; source: string; before?: string };
      const entries: [string, string][] = [[":operation", "libre:moveComponent"], [":source", requireEditable(b.source)]];
      if (b.before) entries.push([":before", b.before]);
      return done(await clSlingPost(requireEditable(b.slot), entries), b.slot, "content", "reordered");
    }
    if (o === "templates" && req.method === "GET") {
      // content/v1/pages names a template by its path. The catalog's own eligibility (allowed parents and parent templates). Names only: titles live under /apps,
      // which authors cannot read, so the label is the name, sentence-cased.
      const r = await clSlingJson<{ templates?: { path: string; name: string }[] }>(`${requireEditable(path)}.libre-templates.json`);
      return NextResponse.json((r.templates ?? []).map((t) => ({ id: t.path, path: t.path, name: t.name.replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase()), desc: t.name, blocks: [], folder: "" })));
    }
    if (o === "preview" && req.method === "GET") {
      const html = await clRender(requireEditable(path), draft, q.get("edit") === "1");
      return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }
    return problem(new RepoError(404, "Unknown operation", o));
  } catch (e) { return problem(e); }
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
