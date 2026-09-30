import { NextRequest, NextResponse } from "next/server";
import { repo, RepoError } from "@/lib/repo";
import type { PageStatus } from "@/lib/repo";
import { logEvent, me, snapshotVersion, userName } from "@/lib/server/ucp";
import { can, permForStatus, PERM_LABEL } from "@/lib/ucp/perms";
import type { PermKey } from "@/lib/ucp/types";
import { market } from "@/lib/markets";

/**
 * Backend-for-frontend over the ContentRepository port. The browser never talks to Sling / ContentLIBRE directly.
 *   GET    /api/repo/page?path=            → PageView
 *   GET    /api/repo/children?path=&offset=&limit=
 *   POST   /api/repo/pages                 { parentPath, name, template, title }
 *   PATCH  /api/repo/page?path=            PageContentPatch (+ workflow metadata on status change)
 *   PUT    /api/repo/components?path=      ComponentNode[]
 *   DELETE /api/repo/page?path=&recursive=
 *   POST   /api/repo/move?path=            { destinationPath }
 *   GET    /api/repo/node?path=&depth=     → RepoNode (raw JCR view)
 *   POST   /api/repo/node?path=            { primaryType, props }      create any node
 *   PATCH  /api/repo/node?path=            props (null removes)        merge properties
 *   DELETE /api/repo/node?path=
 *   POST   /api/repo/node/move?path=       { destinationPath }
 *   GET    /api/repo/me
 * Every mutation is written to the audit trail (/var/audit). Clients may pass ?audit=<text> to describe a node change.
 */
const problem = (e: unknown) => {
  const err = e instanceof RepoError ? e : new RepoError(500, e instanceof Error ? e.message : "Unexpected error");
  return NextResponse.json({ type: "about:blank", title: err.message, status: err.status, detail: err.detail }, { status: err.status, headers: { "Content-Type": "application/problem+json", "X-Request-Id": err.requestId ?? crypto.randomUUID() } });
};
const marketOf = (path: string) => path.match(/^\/content\/(?:dam\/)?([a-z]{2})(\/|$)/)?.[1] ?? path.match(/^\/var\/audit\/ucp\/([a-z]{2})/)?.[1] ?? "uk";
const STATUS_TEXT: Record<PageStatus, string> = { draft: "reopened {t} as a draft", review: "sent {t} for review", inreview: "started the author's review of {t}", reviewed: "finished the author's review of {t}", bizreview: "sent {t} to business review", approved: "approved {t} · ready to publish", scheduled: "scheduled {t} for publishing", published: "published {t}", failed: "publish of {t} failed" };

async function handle(req: NextRequest, ctx: { params: Promise<{ op: string[] }> }) {
  const { op } = await ctx.params; const o = op.join("/"); const q = req.nextUrl.searchParams; const path = q.get("path") ?? ""; const r = repo(); const rid = crypto.randomUUID();
  const ok = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "X-Request-Id": rid, "X-Backend": r.kind } });
  const audit = (type: "content" | "publishing" | "permissions" | "system", text: string, target?: string, level?: "crit" | "") => logEvent(marketOf(target ?? path), { type, text, target: target ?? path, level, requestId: rid });
  /** Refuse what the signed-in user may not do on that folder (mirrors the UI's `can`). */
  const guard = async (perm: PermKey, p: string) => { const u = await me(); const mk = market(marketOf(p)); if (!can(u, perm, p, mk.root)) throw new RepoError(403, `You don't have ${PERM_LABEL[perm]} on ${p.replace(mk.root, "").split("/").filter(Boolean)[0] ?? mk.name}`, `Ask a site admin to grant ${PERM_LABEL[perm]} for ${u.name}`, rid); return u; };
  try {
    if (o === "me") return ok(await r.identity());
    if (o === "node" && req.method === "GET") { const n = await r.getNode(path, Number(q.get("depth") ?? 1)); return n ? ok(n) : problem(new RepoError(404, "Not found", path)); }
    if (o === "node" && (req.method === "POST" || req.method === "PATCH" || req.method === "DELETE") && (path.startsWith("/home/users") || path.startsWith("/conf/"))) { const u = await me(); if (!(u.role === "admin" || u.perms.root?.manage)) return problem(new RepoError(403, path.startsWith("/conf/") ? "Only site admins can change content models and templates" : "Only site admins can change users and permissions", `Signed in as ${u.name}`, rid)); }
    if (o === "node/move" && (path.startsWith("/home/users") || path.startsWith("/conf/"))) { const u = await me(); if (!(u.role === "admin" || u.perms.root?.manage)) return problem(new RepoError(403, "Only site admins can change platform configuration", `Signed in as ${u.name}`, rid)); }
    if ((o === "node" || o === "node/move") && req.method !== "GET" && (!path.startsWith("/") || path === "/" || path.includes("//"))) return problem(new RepoError(400, "A valid absolute node path is required", path || "(empty)", rid));
    if (o === "node" && req.method === "POST") { const b = await req.json(); const n = await r.createNode(path, b.primaryType ?? "nt:unstructured", b.props ?? {}); if (q.get("audit")) await audit((q.get("type") as "content") ?? "content", q.get("audit")!, q.get("target") ?? path); return ok(n, 201); }
    if (o === "node" && req.method === "PATCH") { const n = await r.setProps(path, await req.json()); if (q.get("audit")) await audit((q.get("type") as "content") ?? "content", q.get("audit")!, q.get("target") ?? path); return ok(n); }
    if (o === "node" && req.method === "DELETE") { await r.deleteNode(path); if (q.get("audit")) await audit((q.get("type") as "content") ?? "content", q.get("audit")!, q.get("target") ?? path); return new NextResponse(null, { status: 204, headers: { "X-Request-Id": rid } }); }
    if (o === "node/move" && req.method === "POST") { const { destinationPath } = await req.json(); const n = await r.moveNode(path, destinationPath); if (q.get("audit")) await audit("content", q.get("audit")!, destinationPath); return ok(n); }
    if (o === "page" && req.method === "GET") { const p = await r.getPage(path); return p ? ok(p) : problem(new RepoError(404, "Not found", path)); }
    if (o === "page" && req.method === "PATCH") {
      const patch = await req.json(); const before = await r.getPage(path);
      // Reauthor: the business reviewer (Review) or anyone with Edit sends a page in business review back to the author (→ draft)
      const reauthor = patch.status === "draft" && (before?.status === "inreview" || before?.status === "reviewed" || before?.status === "bizreview");
      // after the author's review the reviewer decides: on to the business review, or back to the author (Reauthor) · Edit or Review will do
      const reviewerMove = reauthor || (patch.status === "bizreview" && before?.status === "reviewed");
      const who = reviewerMove ? await guard("edit", path).catch(() => guard("review", path)) : await guard(patch.status && before && patch.status !== before.status ? permForStatus[patch.status] ?? "edit" : "edit", path);
      // an assigned review is approved by that reviewer only (site admins included; they can reassign instead)
      const assigned = typeof before?.meta?.["ucp:assignee"] === "string" ? String(before.meta["ucp:assignee"]) : "";
      const admin = who.role === "admin" || !!who.perms?.root?.manage; // site admins may approve on behalf of the reviewer (recorded in the audit log)
      if ((patch.status === "reviewed" || patch.status === "inreview") && (before?.status === "review" || before?.status === "inreview") && assigned && assigned !== who.id && !admin) throw new RepoError(403, "Only the assigned reviewer can approve this page", "Reassign the review if someone else should approve it");
      // author's review → business review → ready to publish: the business sign-off cannot be skipped
      if (patch.status === "inreview" && before?.status !== "review") throw new RepoError(409, "Only a page waiting for its author's review can be started");
      // the author never takes their own page from the Backlog (four eyes)
      const authorId = String(before?.meta?.["ucp:requestedBy"] || before?.meta?.["ucp:sentBy"] || "");
      if (patch.status === "inreview" && !assigned && authorId === who.id && !admin) throw new RepoError(403, "You wrote this page, so someone else reviews it", "Another reviewer takes it from the Backlog");
      if (patch.status === "bizreview" && (before?.status === "review" || before?.status === "inreview")) throw new RepoError(409, "The author's review comes first", "The reviewer marks it Reviewed; then it can go to the business review");
      if (patch.status === "approved" && (before?.status === "review" || before?.status === "inreview" || before?.status === "reviewed")) throw new RepoError(409, "Business review comes next", "Approve the author's review first; the business review then makes the page ready to publish");
      const bizBy = before?.meta?.["ucp:taskKind"] === "BizReview" ? before?.meta?.["ucp:taskAssignee"] : undefined;
      if (patch.status === "approved" && before?.status === "bizreview" && typeof bizBy === "string" && bizBy && bizBy !== who.id && !admin) throw new RepoError(403, "Only the assigned business reviewer can sign this page off");
      // four eyes: the business sign-off comes from someone other than the author's reviewer
      if (patch.status === "approved" && before?.status === "bizreview" && before.meta?.["ucp:authorReviewedBy"] === who.id && !admin) throw new RepoError(403, "Someone else must do the business review", "You approved the author's review of this page");
      if (patch.status && before && patch.status !== before.status) await snapshotVersion(path, `before: ${STATUS_TEXT[patch.status as PageStatus].replace("{t}", "").trim()}`, who.id);
      const p = await r.updateContent(path, patch);
      /* a site admin approving for the assigned reviewer: recorded as "on behalf of" */
      const onBehalf = !admin ? "" : patch.status === "reviewed" && (before?.status === "review" || before?.status === "inreview") && assigned && assigned !== who.id ? assigned : patch.status === "approved" && before?.status === "bizreview" && typeof bizBy === "string" && bizBy && bizBy !== who.id ? bizBy : "";
      if (patch.status && before && patch.status !== before.status) {
        const meId = who.id; const meta: Record<string, unknown> = { "ucp:sentBy": meId, "ucp:sentAt": new Date().toISOString() };
        if (patch.status === "review") { const d = new Date(); d.setDate(d.getDate() + 3); meta["ucp:due"] = d.toISOString(); meta["ucp:requestedBy"] = meId; meta["ucp:remindedAt"] = null; } // "send back to review" keeps the same reviewer else meta["ucp:due"] = null;
        if (patch.status === "inreview") { if (!assigned) meta["ucp:assignee"] = meId; meta["ucp:startedAt"] = new Date().toISOString(); } // taking an unassigned review assigns it
        if (patch.status === "reviewed") meta["ucp:authorReviewedBy"] = meId; // who did the author's review (four eyes for the business review)
        if (patch.status === "bizreview") { const d = new Date(); d.setDate(d.getDate() + 3); meta["ucp:due"] = d.toISOString(); meta["ucp:remindedAt"] = null; }
        if (reauthor) Object.assign(meta, { "ucp:reauthorBy": meId, "ucp:reauthorAt": new Date().toISOString(), "ucp:assignee": null, "ucp:authorReviewedBy": null, "ucp:taskAssignee": null, "ucp:taskKind": null, "ucp:reviewGroups": null, "ucp:remindedAt": null, "ucp:due": null }); // back to Build the page: the whole review starts again
        if (patch.status === "approved") meta["ucp:approvedBy"] = meId; // the author (ucp:requestedBy) keeps getting the "ready to publish" task
        await r.setProps(`${path}/jcr:content`, meta).catch(() => {});
        await audit(patch.status === "published" || patch.status === "approved" || patch.status === "scheduled" ? "publishing" : "content", STATUS_TEXT[patch.status as PageStatus].replace("{t}", p.title) + (onBehalf ? ` (on behalf of ${await userName(onBehalf)})` : ""), path, patch.status === "failed" ? "crit" : "");
      } else if (patch.title && before && patch.title !== before.title) await audit("content", `renamed “${before.title}” to “${patch.title}”`, path);
      return ok(await r.getPage(path));
    }
    if (o === "page" && req.method === "DELETE") { await guard("edit", path); const before = await r.getPage(path); await r.deletePage(path, q.get("recursive") === "true"); await audit("content", `deleted ${before?.title ?? path}`, path); return new NextResponse(null, { status: 204, headers: { "X-Request-Id": rid } }); }
    if (o === "children") return ok(await r.listChildren(path, { offset: Number(q.get("offset") ?? 0), limit: Number(q.get("limit") ?? 50) }));
    if (o === "pages" && req.method === "POST") { const b = await req.json(); await guard("edit", `${b.parentPath}/${b.name}`); const p = await r.createPage(b); if (b.locale || b.sourcePath) await r.setProps(`${p.path}/jcr:content`, { "jcr:language": b.locale, "ucp:sourcePath": b.sourcePath }).catch(() => {}); if (b.components) await r.saveComponents(p.path, b.components); await audit("content", `created ${p.title} in ${b.parentPath.split("/").pop()}`, p.path); return ok(await r.getPage(p.path), 201); }
    if (o === "components" && req.method === "PUT") { const comps = await req.json(); const who = await guard("edit", path); await snapshotVersion(path, "before edit", who.id); const p = await r.saveComponents(path, comps); await audit("content", `edited ${comps.length} block${comps.length === 1 ? "" : "s"} on ${p.title}`, path); return ok(p); }
    if (o === "move" && req.method === "POST") { const { destinationPath } = await req.json(); await guard("edit", path); await guard("edit", destinationPath); const p = await r.movePage(path, destinationPath); await audit("content", `moved ${p.title} to ${destinationPath.replace(/\/[^/]+$/, "")}`, destinationPath); return ok(p); }
    return problem(new RepoError(404, "Unknown operation", o));
  } catch (e) { return problem(e); }
}
export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
