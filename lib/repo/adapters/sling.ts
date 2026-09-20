import "server-only";
import type { ContentRepository, RepoNode, PageContentPatch, ComponentNode } from "../types";
import { RepoError } from "../types";
import { nodeToPage, nodeToSummary } from "../mapping";

/**
 * Adapter for the target platform: Apache Sling on Oak/JCR (Felix/OSGi).
 * Reads use Sling's default GET servlet JSON rendering (`<path>.<depth>.json` / `.infinity.json`).
 * Writes use the Sling POST servlet (`:operation`, `:nameHint`, `sling:resourceType`, `@TypeHint`, `:applyTo`).
 * Auth: HTTP Basic (or a session cookie passed through). Configure with SLING_URL, SLING_USER, SLING_PASSWORD.
 * This is a thin, complete mapping; tune resource types / template paths to the real component library when it lands.
 */
const cfg = () => ({ base: (process.env.SLING_URL ?? "").replace(/\/$/, ""), user: process.env.SLING_USER ?? "", pass: process.env.SLING_PASSWORD ?? "" });
const auth = (): Record<string, string> => { const { user, pass } = cfg(); return user ? { Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") } : {}; };

/** Sling JSON → RepoNode. Sling nests children as object-valued keys and puts properties alongside them. */
function fromSling(path: string, json: Record<string, unknown>): RepoNode {
  const properties: Record<string, unknown> = {}; const children: RepoNode[] = [];
  for (const [k, v] of Object.entries(json)) {
    if (v && typeof v === "object" && !Array.isArray(v)) children.push(fromSling(`${path}/${k}`, v as Record<string, unknown>)); else properties[k] = v;
  }
  return { path, name: path.split("/").pop()!, primaryType: String(properties["jcr:primaryType"] ?? "nt:unstructured"), properties, children: children.length ? children : undefined };
}
async function getJson(path: string, depth: number | "infinity") {
  const { base } = cfg(); if (!base) throw new RepoError(500, "Sling not configured", "Set SLING_URL, SLING_USER, SLING_PASSWORD");
  const res = await fetch(`${base}${path}.${depth}.json`, { headers: { ...auth(), Accept: "application/json" }, cache: "no-store" });
  if (res.status === 404) return undefined; if (!res.ok) throw new RepoError(res.status, `Sling GET ${path} failed`);
  return fromSling(path, await res.json());
}
async function post(path: string, form: Record<string, string | string[]>) {
  const { base } = cfg(); const body = new URLSearchParams(); for (const [k, v] of Object.entries(form)) (Array.isArray(v) ? v : [v]).forEach((x) => body.append(k, x));
  const res = await fetch(`${base}${path}`, { method: "POST", headers: { ...auth(), Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
  if (!res.ok) throw new RepoError(res.status, `Sling POST ${path} failed`);
}
const propMap: Record<keyof PageContentPatch, string> = { title: "jcr:title", description: "jcr:description", navTitle: "navTitle", hideInNav: "hideInNav", locale: "jcr:language", status: "ucp:status" };

export const slingRepo: ContentRepository = {
  kind: "sling",
  identity: async () => { const { base } = cfg(); const res = await fetch(`${base}/system/sling/info.sessionInfo.json`, { headers: auth(), cache: "no-store" }); const j = res.ok ? await res.json() : {}; return { id: j.userID ?? "anonymous", authType: j.authType ?? "basic", groups: [] }; },
  getNode: async (path, depth = 1) => (await getJson(path, depth)) ?? undefined,
  getPage: async (path) => { const n = await getJson(path, "infinity"); return n ? nodeToPage(n) : undefined; },
  listChildren: async (path, { offset = 0, limit = 50 } = {}) => { const n = await getJson(path, 2); if (!n) throw new RepoError(404, "Not found"); const kids = (n.children ?? []).filter((c) => c.name !== "jcr:content"); return { items: kids.slice(offset, offset + limit).map(nodeToSummary), more: kids.length > offset + limit }; },
  createPage: async ({ parentPath, name, template, title }) => {
    const path = `${parentPath}/${name}`;
    await post(path, { "jcr:primaryType": "cq:Page" });
    await post(`${path}/jcr:content`, { "jcr:primaryType": "cq:PageContent", "jcr:title": title ?? name, "sling:resourceType": "hsbc/components/page", "cq:template": `/conf/hsbc/settings/wcm/templates/${template}`, "ucp:status": "draft" });
    await post(`${path}/jcr:content/root`, { "jcr:primaryType": "nt:unstructured", "sling:resourceType": "hsbc/components/container" });
    const n = await getJson(path, "infinity"); return nodeToPage(n!);
  },
  updateContent: async (path, patch) => { const form: Record<string, string> = {}; for (const [k, v] of Object.entries(patch)) if (v !== undefined) form[propMap[k as keyof PageContentPatch]] = String(v); form["cq:lastModified"] = new Date().toISOString(); await post(`${path}/jcr:content`, form); return nodeToPage((await getJson(path, "infinity"))!); },
  saveComponents: async (path, components: ComponentNode[]) => {
    await post(`${path}/jcr:content/root`, { ":operation": "delete" });
    await post(`${path}/jcr:content/root`, { "jcr:primaryType": "nt:unstructured", "sling:resourceType": "hsbc/components/container" });
    for (const c of components) { const form: Record<string, string> = { "sling:resourceType": c.resourceType }; for (const [k, v] of Object.entries(c.props)) form[k] = typeof v === "string" ? v : JSON.stringify(v); await post(`${path}/jcr:content/root/${c.name}`, form); }
    return nodeToPage((await getJson(path, "infinity"))!);
  },
  deletePage: async (path) => { await post(path, { ":operation": "delete" }); },
  movePage: async (path, destinationPath) => { await post(path, { ":operation": "move", ":dest": destinationPath }); return nodeToPage((await getJson(destinationPath, "infinity"))!); },
};
