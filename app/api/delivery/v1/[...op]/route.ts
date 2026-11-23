import { NextRequest, NextResponse } from "next/server";
import { pageDeliveryJson, modelSchema, listModels, listAssets, listTemplates } from "@/lib/server/ucp";
import { allPages } from "@/lib/server/pages";
import { MARKETS, market } from "@/lib/markets";
import { PATHS } from "@/lib/ucp/paths";
import { formDefinition } from "@/lib/forms/model";
import { messagePayload, messageSchema, type Channel } from "@/lib/messaging/model";
import { channelOf, isMessagingPath, isAppTree, isFormTemplate, MESSAGING_FOLDER, FORMS_FOLDER } from "@/lib/blocks/registry";
import { getPage } from "@/lib/server/pages";
import { stockPhoto } from "@/lib/blocks/photo";

/**
 * Public delivery API (read-only JSON), the same payload the “API & delivery” screen documents.
 *   GET /api/delivery/v1/pages?market=uk&status=            list
 *   GET /api/delivery/v1/pages/<route>?market=uk            one page with resolved blocks / assets / forms
 *   GET /api/delivery/v1/preview/pages/<route>?market=uk    same, drafts included
 *   GET /api/delivery/v1/models                             all models
 *   GET /api/delivery/v1/models/<id>                        JSON Schema
 *   GET /api/delivery/v1/assets/<id>/<rendition>            asset (data URL redirect for mock uploads)
 *   GET /api/delivery/v1/messages?market=uk&channel=sms     published messages (MDP / MDX)
 *   GET /api/delivery/v1/messages/<id>?market=uk            one published message: the frozen, approved version
 *   GET /api/delivery/v1/schemas/messages/<channel>         JSON Schema of the message contract
 *   GET /api/delivery/v1/forms?market=uk                    published form definitions
 *   GET /api/delivery/v1/forms/<id>?market=uk               one form definition (AEM Forms core components) for the Forms solution
 * Only published pages are served on the non-preview route.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ op: string[] }> }) {
  const { op } = await ctx.params; const q = req.nextUrl.searchParams; const mid = q.get("market") ?? "uk"; const mk = market(mid); const host = mk.domain;
  const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { "X-Request-Id": crypto.randomUUID(), "Cache-Control": "public, max-age=60", "Access-Control-Allow-Origin": "*" } });
  const notFound = (detail: string) => NextResponse.json({ type: "about:blank", title: "Not found", status: 404, detail }, { status: 404, headers: { "Content-Type": "application/problem+json" } });
  const [head, ...rest] = op;
  if (head === "models" && !rest.length) return json({ items: (await listModels()).map((m) => ({ id: m.id, name: m.name, group: m.group, version: m.version, fields: m.fields.length, _links: { schema: `/v1/models/${m.id}` } })) });
  if (head === "models") { const m = (await listModels()).find((x) => x.id === rest[0]); return m ? json(modelSchema(m)) : notFound(`model ${rest[0]}`); }
  if (head === "assets") { const a = (await listAssets(mid)).find((x) => x.id === rest[0]); if (!a) return notFound(`asset ${rest[0]}`); return json({ id: a.id, name: a.name, type: a.type, rendition: rest[1] ?? "original", width: a.width, height: a.height, url: a.data ?? null, note: a.data ? "inline data for mock uploads" : "binary served by the DAM on the Sling backend" }); }
  if (head === "markets") return json({ items: MARKETS.map((m) => ({ id: m.id, name: m.name, locales: m.locales, domain: m.domain, status: m.status })) });
  if (head === "templates") return json({ items: await listTemplates(mid) });
  if (head === "schemas" && rest[0] === "messages") { const ch = rest[1] as Channel; return ["email", "push", "sms", "inapp"].includes(ch) ? json(messageSchema(ch)) : notFound(`schema messages/${rest[1] ?? ""}`); }
  if (head === "forms") {
    /* forms are pages under <market>/forms, built in the page builder for their host page; the Forms solution gets the published ones */
    const froot = `${mk.root}/${FORMS_FOLDER}`; const all = (await allPages(froot)).filter((p) => !p.isFolder && isFormTemplate(p.template));
    if (!rest.length) { const items = all.filter((p) => p.status === "published"); return json({ items: items.map((p) => ({ id: p.name, title: p.title, hostPage: String(p.meta?.["ucp:hostPage"] ?? "").replace(mk.root, "") || null, publishedAt: p.lastModified, _links: { self: `/v1/forms/${p.name}?market=${mid}` } })), total: items.length }); }
    const hit = all.find((p) => p.name === rest[0]); const pg = hit ? await getPage(hit.path) : undefined; if (!pg) return notFound(`form ${rest[0]}`);
    if (pg.status !== "published") return NextResponse.json({ type: "about:blank", title: "Not published", status: 404, detail: `Form ${rest[0]} has no published version yet` }, { status: 404, headers: { "Content-Type": "application/problem+json" } });
    return json(formDefinition({ id: pg.name, title: pg.title, status: pg.status, locale: pg.locale || (mk.locales?.[0] ?? "en-GB"), market: mid, hostPage: String(pg.meta?.["ucp:hostPage"] ?? "").replace(mk.root, "") || undefined, updatedAt: pg.lastModified, meta: pg.meta }, pg.components));
  }

  if (head === "messages") {
    /* messages are pages under <market>/messaging, built in the page builder; MDP gets the published ones */
    const loc = mk.locales?.[0] ?? "en-GB"; const origin = req.nextUrl.origin; const mroot = `${mk.root}/${MESSAGING_FOLDER}`;
    const img = (id: string) => (id === "hsbc-logo" ? `${origin}/hsbc-logo.svg` : `${origin}${stockPhoto(id)}`); // the DAM rendition URL on the real backend
    if (!rest.length) { const ch = q.get("channel"); const items = (await allPages(mroot)).filter((p) => !p.isFolder && p.status === "published" && channelOf(p.template) && (!ch || channelOf(p.template) === ch)); return json({ items: items.map((p) => ({ id: p.path.slice(mroot.length + 1), channel: channelOf(p.template), name: p.title, publishedAt: p.lastModified, _links: { self: `/v1/messages/${p.path.slice(mroot.length + 1)}?market=${mid}` } })), total: items.length }); }
    const path = `${mroot}/${rest.join("/")}`; const pg = isMessagingPath(path, mk.root) ? await getPage(path) : undefined; const ch = channelOf(pg?.template);
    if (!pg || !ch) return notFound(`message ${rest.join("/")}`);
    if (pg.status !== "published") return NextResponse.json({ type: "about:blank", title: "Not published", status: 404, detail: `Message ${rest.join("/")} has no published version yet` }, { status: 404, headers: { "Content-Type": "application/problem+json" } });
    return json(messagePayload({ id: rest.join("/"), name: pg.title, channel: ch, status: pg.status, locale: pg.locale || loc, market: mid, updatedAt: pg.lastModified, updatedBy: pg.lastModifiedBy }, pg.components, img));
  }

  const preview = head === "preview"; const segs = preview ? rest.slice(1) : rest;
  if ((head === "pages" || (preview && rest[0] === "pages"))) {
    if (!segs.length) { const st = q.get("status"); const items = (await allPages(PATHS.content(mid))).filter((p) => !p.isFolder && !isAppTree(p.path, mk.root) && (preview || p.status === "published") && (!st || p.status === st)); return json({ items: items.map((p) => ({ route: p.path.replace(PATHS.content(mid), "") || "/", title: p.title, status: p.status, template: p.template, updatedAt: p.lastModified, _links: { self: `/v1/pages${p.path.replace(PATHS.content(mid), "")}` } })), total: items.length }); }
    const path = `${PATHS.content(mid)}/${segs.join("/")}`; const j = await pageDeliveryJson(mid, path, host); if (!j) return notFound(`page ${segs.join("/")}`);
    if (!preview && j.status !== "published") return NextResponse.json({ type: "about:blank", title: "Not published", status: 404, detail: `Available on the preview API: /v1/preview/pages/${segs.join("/")}` }, { status: 404, headers: { "Content-Type": "application/problem+json" } });
    return json(j);
  }
  return notFound(op.join("/"));
}
