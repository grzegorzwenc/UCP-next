import { NextRequest, NextResponse } from "next/server";
import { repo, RepoError } from "@/lib/repo";

/**
 * Backend-for-frontend over the ContentRepository port. The browser never talks to Sling / ContentLIBRE directly.
 *   GET    /api/repo/page?path=            → PageView
 *   GET    /api/repo/children?path=&offset=&limit=
 *   POST   /api/repo/pages                 { parentPath, name, template, title }
 *   PATCH  /api/repo/page?path=            PageContentPatch
 *   PUT    /api/repo/components?path=      ComponentNode[]
 *   DELETE /api/repo/page?path=&recursive=
 *   POST   /api/repo/move?path=            { destinationPath }
 *   GET    /api/repo/node?path=&depth=     → RepoNode (raw JCR view)
 *   GET    /api/repo/me
 */
const problem = (e: unknown) => {
  const err = e instanceof RepoError ? e : new RepoError(500, e instanceof Error ? e.message : "Unexpected error");
  return NextResponse.json({ type: "about:blank", title: err.message, status: err.status, detail: err.detail }, { status: err.status, headers: { "Content-Type": "application/problem+json", "X-Request-Id": err.requestId ?? crypto.randomUUID() } });
};
async function handle(req: NextRequest, ctx: { params: Promise<{ op: string[] }> }) {
  const { op } = await ctx.params; const o = op.join("/"); const q = req.nextUrl.searchParams; const path = q.get("path") ?? ""; const r = repo();
  const ok = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "X-Request-Id": crypto.randomUUID(), "X-Backend": r.kind } });
  try {
    if (o === "me") return ok(await r.identity());
    if (o === "node") { const n = await r.getNode(path, Number(q.get("depth") ?? 1)); return n ? ok(n) : problem(new RepoError(404, "Not found")); }
    if (o === "page" && req.method === "GET") { const p = await r.getPage(path); return p ? ok(p) : problem(new RepoError(404, "Not found")); }
    if (o === "page" && req.method === "PATCH") return ok(await r.updateContent(path, await req.json()));
    if (o === "page" && req.method === "DELETE") { await r.deletePage(path, q.get("recursive") === "true"); return new NextResponse(null, { status: 204 }); }
    if (o === "children") return ok(await r.listChildren(path, { offset: Number(q.get("offset") ?? 0), limit: Number(q.get("limit") ?? 50) }));
    if (o === "pages" && req.method === "POST") return ok(await r.createPage(await req.json()), 201);
    if (o === "components" && req.method === "PUT") return ok(await r.saveComponents(path, await req.json()));
    if (o === "move" && req.method === "POST") return ok(await r.movePage(path, (await req.json()).destinationPath));
    return problem(new RepoError(404, "Unknown operation"));
  } catch (e) { return problem(e); }
}
export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
