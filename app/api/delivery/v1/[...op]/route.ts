import { NextRequest, NextResponse } from "next/server";
import { pageDeliveryJson, modelSchema, listModels, listAssets, listTemplates } from "@/lib/server/ucp";
import { allPages } from "@/lib/server/pages";
import { getMarket, getMarkets } from "@/lib/server/markets";
import { PATHS } from "@/lib/ucp/paths";

/**
 * Public delivery API (read-only JSON), the same payload the “API & delivery” screen documents.
 *   GET /api/delivery/v1/pages?market=uk&status=            list
 *   GET /api/delivery/v1/pages/<route>?market=uk            one page with resolved blocks / assets / forms
 *   GET /api/delivery/v1/preview/pages/<route>?market=uk    same, drafts included
 *   GET /api/delivery/v1/models                             all models
 *   GET /api/delivery/v1/models/<id>                        JSON Schema
 *   GET /api/delivery/v1/assets/<id>/<rendition>            asset (data URL redirect for mock uploads)
 * Only published pages are served on the non-preview route.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ op: string[] }> }) {
  const { op } = await ctx.params; const q = req.nextUrl.searchParams; const mid = q.get("market") ?? "uk"; const mk = (await getMarket(mid)); const host = mk.domain;
  const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "X-Request-Id": crypto.randomUUID(), "Cache-Control": "public, max-age=60", "Access-Control-Allow-Origin": "*" } });
  const notFound = (detail: string) => NextResponse.json({ type: "about:blank", title: "Not found", status: 404, detail }, { status: 404, headers: { "Content-Type": "application/problem+json" } });
  const [head, ...rest] = op;
  if (head === "models" && !rest.length) return json({ items: (await listModels()).map((m) => ({ id: m.id, name: m.name, group: m.group, version: m.version, fields: m.fields.length, _links: { schema: `/v1/models/${m.id}` } })) });
  if (head === "models") { const m = (await listModels()).find((x) => x.id === rest[0]); return m ? json(modelSchema(m)) : notFound(`model ${rest[0]}`); }
  if (head === "assets") { const a = (await listAssets(mid)).find((x) => x.id === rest[0]); if (!a) return notFound(`asset ${rest[0]}`); return json({ id: a.id, name: a.name, type: a.type, rendition: rest[1] ?? "original", width: a.width, height: a.height, url: a.data ?? null, note: a.data ? "inline data for mock uploads" : "binary served by the DAM on the Sling backend" }); }
  if (head === "markets") return json({ items: (await getMarkets()).map((m) => ({ id: m.id, name: m.name, locales: m.locales, domain: m.domain, status: m.status })) });
  if (head === "templates") return json({ items: await listTemplates() });
  const preview = head === "preview"; const segs = preview ? rest.slice(1) : rest;
  if ((head === "pages" || (preview && rest[0] === "pages"))) {
    if (!segs.length) { const st = q.get("status"); const items = (await allPages(PATHS.content(mid))).filter((p) => !p.isFolder && (preview || p.status === "published") && (!st || p.status === st)); return json({ items: items.map((p) => ({ route: p.path.replace(PATHS.content(mid), "") || "/", title: p.title, status: p.status, template: p.template, updatedAt: p.lastModified, _links: { self: `/v1/pages${p.path.replace(PATHS.content(mid), "")}` } })), total: items.length }); }
    const path = `${PATHS.content(mid)}/${segs.join("/")}`; const j = await pageDeliveryJson(mid, path, host); if (!j) return notFound(`page ${segs.join("/")}`);
    if (!preview && j.status !== "published") return NextResponse.json({ type: "about:blank", title: "Not published", status: 404, detail: `Available on the preview API: /v1/preview/pages/${segs.join("/")}` }, { status: 404, headers: { "Content-Type": "application/problem+json" } });
    return json(j);
  }
  return notFound(op.join("/"));
}
