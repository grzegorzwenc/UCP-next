import { NextRequest, NextResponse } from "next/server";
import { mock } from "@/lib/server/mock-store";

/**
 * Backend-for-frontend for the ContentLIBRE Management API.
 * - live mode: forwards /api/cl/<path> to $CONTENTLIBRE_API_URL/<path> with HTTP Basic + X-Requested-With: ContentLIBRE (machine-client contract).
 * - mock mode: serves the in-memory store with the same shapes and RFC 9457 problem documents.
 */
const MODE = process.env.CONTENTLIBRE_MODE === "live" ? "live" : "mock";
const problem = (status: number, title: string, detail?: string) =>
  NextResponse.json({ type: "about:blank", title, status, detail }, { status, headers: { "Content-Type": "application/problem+json", "X-Request-Id": crypto.randomUUID() } });

async function live(req: NextRequest, path: string) {
  const base = process.env.CONTENTLIBRE_API_URL?.replace(/\/$/, "");
  if (!base || !process.env.CONTENTLIBRE_USER) return problem(500, "ContentLIBRE not configured", "Set CONTENTLIBRE_API_URL, CONTENTLIBRE_USER and CONTENTLIBRE_PASSWORD.");
  const url = `${base}/${path}${req.nextUrl.search}`;
  const auth = "Basic " + Buffer.from(`${process.env.CONTENTLIBRE_USER}:${process.env.CONTENTLIBRE_PASSWORD ?? ""}`).toString("base64");
  const res = await fetch(url, { method: req.method, headers: { Authorization: auth, "X-Requested-With": "ContentLIBRE", Accept: req.headers.get("accept") ?? "application/json", ...(req.headers.get("content-type") ? { "Content-Type": req.headers.get("content-type")! } : {}) }, body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(), cache: "no-store" });
  const out = new NextResponse(res.body, { status: res.status });
  for (const h of ["content-type", "x-request-id"]) { const v = res.headers.get(h); if (v) out.headers.set(h, v); }
  return out;
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params; const p = path.join("/"); const q = req.nextUrl.searchParams;
  if (MODE === "live") return live(req, p);
  const ok = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "X-Request-Id": crypto.randomUUID() } });
  if (p === "identity/v1/me") return ok(mock.me());
  if (p === "content/v1/pages" && req.method === "POST") {
    const body = await req.json(); if (!body.parentPath || !body.name || !body.template) return problem(400, "Validation failed", "parentPath, name and template are required.");
    const r = mock.createPage(body); if ("error" in r && r.error) return problem(r.error, r.error === 409 ? "A page with that name already exists" : "Parent not found"); if ("page" in r) return ok(r.page, 201); return problem(500, "Unexpected");
  }
  if (p === "content/v1/page") {
    const path = q.get("path"); if (!path) return problem(400, "path is required");
    if (req.method === "GET") { const pg = mock.getPage(path); return pg ? ok(pg) : problem(404, "Not found"); }
    if (req.method === "PATCH") { const pg = mock.patchPage(path, await req.json()); return pg ? ok(pg) : problem(404, "Not found"); }
    if (req.method === "DELETE") { const r = mock.deletePage(path, q.get("recursive") === "true"); return r === 204 ? new NextResponse(null, { status: 204 }) : problem(r, r === 409 ? "Page has children; pass recursive=true" : "Not found"); }
  }
  if (p === "content/v1/children") { const path = q.get("path"); if (!path) return problem(400, "path is required"); const r = mock.children(path, Number(q.get("offset") ?? 0), Number(q.get("limit") ?? 50)); return r ? ok(r) : problem(404, "Not found"); }
  if (p === "content/v1/page/move" && req.method === "POST") { const path = q.get("path"); if (!path) return problem(400, "path is required"); const r = mock.movePage(path, (await req.json()).destinationPath); return typeof r === "number" ? problem(r, r === 409 ? "Destination is occupied" : "Not found") : ok(r); }
  return problem(401, "Unauthorized");
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
