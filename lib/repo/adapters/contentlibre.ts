import "server-only";
import { pageToNode } from "../mapping";
import type { ContentRepository, PageView, PageSummary, ComponentNode } from "../types";
import { RepoError } from "../types";
/** Wire types transcribed from the ContentLIBRE Swagger (content-v1). */
type ContentV1Page = { path: string; name: string; title?: string; description?: string; navTitle?: string; hideInNav?: boolean; locale?: string; template?: string; created?: string; lastModified?: string; status?: PageView["status"] };
type ContentV1PageList = { items: ContentV1Page[]; offset: number; limit: number; more: boolean };
type Problem = { type: string; title: string; status: number; detail?: string };

/**
 * Adapter for the ContentLIBRE Management API (content-v1 / identity-v1).
 * Maps its flat page document onto the JCR-shaped PageView. Components and workflow status are not in the
 * upstream allowlist yet, so they are sent in the merge patch under `ucp:*` keys (accepted once the API exposes them).
 */
const cfg = () => ({ base: (process.env.CONTENTLIBRE_API_URL ?? "").replace(/\/$/, ""), user: process.env.CONTENTLIBRE_USER ?? "", pass: process.env.CONTENTLIBRE_PASSWORD ?? "" });
async function call<T>(method: string, path: string, query: Record<string, string | number | boolean | undefined> = {}, body?: unknown, contentType = "application/json"): Promise<T> {
  const { base, user, pass } = cfg(); if (!base || !user) throw new RepoError(500, "ContentLIBRE not configured", "Set CONTENTLIBRE_API_URL, CONTENTLIBRE_USER, CONTENTLIBRE_PASSWORD");
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();
  const res = await fetch(`${base}/${path}${qs ? "?" + qs : ""}`, { method, headers: { Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"), "X-Requested-With": "ContentLIBRE", Accept: "application/json", ...(body ? { "Content-Type": contentType } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const rid = res.headers.get("X-Request-Id") ?? undefined;
  if (!res.ok) { let p: Problem | undefined; try { p = await res.json(); } catch {} throw new RepoError(res.status, p?.title ?? res.statusText, p?.detail, rid); }
  return res.status === 204 ? (undefined as T) : res.json();
}
type ClPage = ContentV1Page & { "ucp:status"?: PageView["status"]; "ucp:components"?: ComponentNode[] };
const toView = (p: ClPage): PageView => ({ path: p.path, name: p.name, title: p.title ?? p.name, description: p.description, navTitle: p.navTitle, hideInNav: p.hideInNav, template: p.template, locale: p.locale, status: p["ucp:status"] ?? p.status ?? "draft", created: p.created, lastModified: p.lastModified, components: p["ucp:components"] ?? [] });
const toSummary = (p: ClPage): PageSummary => { const { components, ...rest } = toView(p); void components; return { ...rest, isFolder: p.template === "folder" || p.template === "site" }; };

export const contentLibreRepo: ContentRepository = {
  kind: "contentlibre",
  identity: () => call("GET", "identity/v1/me"),
  getNode: async (path) => { const p = await contentLibreRepo.getPage(path); return p && pageToNode(p); },
  /* The Management API only knows pages. Non-page nodes need the Sling backend (or a future ContentLIBRE module). */
  createNode: async (path) => { throw new RepoError(501, "Not supported by the ContentLIBRE Management API", `createNode ${path}: only pages are exposed by content-v1`); },
  setProps: async (path, props) => { if (!path.endsWith("/jcr:content")) throw new RepoError(501, "Not supported by the ContentLIBRE Management API", `setProps ${path}`); const p = await call<ClPage>("PATCH", "content/v1/page", { path: path.replace(/\/jcr:content$/, "") }, props, "application/merge-patch+json"); return pageToNode(toView(p)).children![0]; },
  putFile: async (path) => { throw new RepoError(501, "Not supported by the ContentLIBRE Management API", `putFile ${path}`); },
  deleteNode: async (path) => { throw new RepoError(501, "Not supported by the ContentLIBRE Management API", `deleteNode ${path}`); },
  moveNode: async (path) => { throw new RepoError(501, "Not supported by the ContentLIBRE Management API", `moveNode ${path}`); },
  getPage: async (path) => { try { return toView(await call<ClPage>("GET", "content/v1/page", { path })); } catch (e) { if (e instanceof RepoError && e.status === 404) return undefined; throw e; } },
  listChildren: async (path, { offset = 0, limit = 50 } = {}) => { const l = await call<ContentV1PageList>("GET", "content/v1/children", { path, offset, limit }); return { items: l.items.map(toSummary), more: l.more }; },
  createPage: async (input) => toView(await call<ClPage>("POST", "content/v1/pages", {}, input)),
  updateContent: async (path, patch) => { const { status, ...rest } = patch; return toView(await call<ClPage>("PATCH", "content/v1/page", { path }, { ...rest, ...(status ? { "ucp:status": status } : {}) }, "application/merge-patch+json")); },
  saveComponents: async (path, components) => toView(await call<ClPage>("PATCH", "content/v1/page", { path }, { "ucp:components": components }, "application/merge-patch+json")),
  deletePage: (path, recursive = false) => call("DELETE", "content/v1/page", { path, recursive }),
  movePage: async (path, destinationPath) => toView(await call<ClPage>("POST", "content/v1/page/move", { path }, { destinationPath })),
};
