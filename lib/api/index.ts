import type { PageView, PageSummary, CreatePageInput, PageContentPatch, ComponentNode, Identity, Problem } from "./types";
import { ApiError } from "./types";
export * from "./types";

type Query = Record<string, string | number | boolean | undefined>;
async function call<T>(op: string, init: RequestInit & { query?: Query } = {}): Promise<T> {
  const { query, headers, ...rest } = init;
  const qs = query ? "?" + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : "";
  const res = await fetch(`/api/repo/${op}${qs}`, { ...rest, headers: { Accept: "application/json", ...(rest.body ? { "Content-Type": "application/json" } : {}), ...((headers as Record<string, string>) || {}) } });
  const requestId = res.headers.get("X-Request-Id") ?? undefined;
  if (!res.ok) { let p: Problem = { type: "about:blank", title: res.statusText, status: res.status }; try { p = await res.json(); } catch {} throw new ApiError(p, requestId); }
  return res.status === 204 ? (undefined as T) : res.json();
}
/** Browser-side repository client (mirrors the ContentRepository port through the BFF). */
export const repoApi = {
  me: () => call<Identity>("me"),
  getPage: (path: string) => call<PageView>("page", { query: { path } }),
  children: (path: string, offset = 0, limit = 50) => call<{ items: PageSummary[]; more: boolean }>("children", { query: { path, offset, limit } }),
  createPage: (input: CreatePageInput) => call<PageView>("pages", { method: "POST", body: JSON.stringify(input) }),
  updateContent: (path: string, patch: PageContentPatch) => call<PageView>("page", { method: "PATCH", query: { path }, body: JSON.stringify(patch) }),
  saveComponents: (path: string, components: ComponentNode[]) => call<PageView>("components", { method: "PUT", query: { path }, body: JSON.stringify(components) }),
  deletePage: (path: string, recursive = false) => call<void>("page", { method: "DELETE", query: { path, recursive } }),
  movePage: (path: string, destinationPath: string) => call<PageView>("move", { method: "POST", query: { path }, body: JSON.stringify({ destinationPath }) }),
};
