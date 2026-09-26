import { NextRequest, NextResponse } from "next/server";
import { RepoError } from "@/lib/repo";
import { clApi, clRender, clSlingJson, clSlingPost, isEditablePath } from "@/lib/server/contentlibre";

/**
 * The page builder's backend on ContentLIBRE (UCP_BACKEND=contentlibre). Everything runs as the signed-in person.
 *
 *   GET    /api/cl/drafts?path=                    content/v1/drafts
 *   POST   /api/cl/drafts?path=                    { from?, label? }        open a draft
 *   DELETE /api/cl/drafts?path=&draft=             discard
 *   POST   /api/cl/drafts/publish?path=            { draft, revision?, force? }
 *   GET    /api/cl/page?path=&draft=               page document, content fields from the draft
 *   PATCH  /api/cl/page?path=&draft=               { title?, description?, navTitle?, hideInNav? }
 *   GET    /api/cl/model?node=                     <node>.libre-model.json + the node's own properties
 *   POST   /api/cl/component/insert                { slot, resourceType, fields[] }
 *   POST   /api/cl/component/properties            { node, entries: [name, value][] }
 *   POST   /api/cl/component/remove                { node }
 *   POST   /api/cl/component/move                  { slot, source, before? }
 *   GET    /api/cl/preview?path=&draft=            the server's render, for the preview iframe
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

async function handle(req: NextRequest, ctx: { params: Promise<{ op: string[] }> }) {
  const { op } = await ctx.params; const o = op.join("/"); const q = req.nextUrl.searchParams;
  const path = q.get("path") ?? undefined; const draft = q.get("draft") ?? undefined;
  try {
    if (o === "drafts" && req.method === "GET") return NextResponse.json(await clApi("GET", "content/v1/drafts", { path }));
    if (o === "drafts" && req.method === "POST") return NextResponse.json(await clApi("POST", "content/v1/drafts", { path }, await req.json().catch(() => ({}))), { status: 201 });
    if (o === "drafts" && req.method === "DELETE") return NextResponse.json(await clApi("DELETE", "content/v1/drafts", { path, draft }));
    if (o === "drafts/publish" && req.method === "POST") return NextResponse.json(await clApi("POST", "content/v1/drafts/publish", { path }, await req.json()));
    if (o === "page" && req.method === "GET") return NextResponse.json(await clApi("GET", "content/v1/page", { path, draft }));
    if (o === "page" && req.method === "PATCH") return NextResponse.json(await clApi("PATCH", "content/v1/page", { path, draft }, await req.json(), "application/merge-patch+json"));
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
      return NextResponse.json(await clSlingPost(`${slot}/*`, entries));
    }
    if (o === "component/properties" && req.method === "POST") {
      const b = await req.json() as { node: string; values: { field: Field; value: unknown }[] };
      const entries = b.values.flatMap((v) => encode(v.field, v.value));
      if (!entries.length) return NextResponse.json({ message: "Nothing changed." });
      return NextResponse.json(await clSlingPost(requireEditable(b.node), entries));
    }
    if (o === "component/remove" && req.method === "POST") { const b = await req.json() as { node: string }; return NextResponse.json(await clSlingPost(requireEditable(b.node), [[":operation", "delete"]])); }
    if (o === "component/move" && req.method === "POST") {
      const b = await req.json() as { slot: string; source: string; before?: string };
      const entries: [string, string][] = [[":operation", "libre:moveComponent"], [":source", requireEditable(b.source)]];
      if (b.before) entries.push([":before", b.before]);
      return NextResponse.json(await clSlingPost(requireEditable(b.slot), entries));
    }
    if (o === "preview" && req.method === "GET") {
      const html = await clRender(requireEditable(path), draft);
      return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }
    return problem(new RepoError(404, "Unknown operation", o));
  } catch (e) { return problem(e); }
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
