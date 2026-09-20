import type { PageView, PageSummary, CreatePageInput, PageContentPatch, ComponentNode, Identity, Problem, RepoNode, NodeProps } from "./types";
import type { Task, Notification, Asset, AuditEvent, User, Template, Model } from "@/lib/ucp/types";
import { ApiError } from "./types";
export * from "./types";

type Query = Record<string, string | number | boolean | undefined>;
async function call<T>(base: string, op: string, init: RequestInit & { query?: Query } = {}): Promise<T> {
  const { query, headers, ...rest } = init;
  const qs = query ? "?" + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString() : "";
  const isForm = rest.body instanceof FormData;
  const res = await fetch(`${base}/${op}${qs}`, { ...rest, headers: { Accept: "application/json", ...(rest.body && !isForm ? { "Content-Type": "application/json" } : {}), ...((headers as Record<string, string>) || {}) } });
  const requestId = res.headers.get("X-Request-Id") ?? undefined;
  if (!res.ok) { let p: Problem = { type: "about:blank", title: res.statusText, status: res.status }; try { p = await res.json(); } catch {} throw new ApiError(p, requestId); }
  return res.status === 204 ? (undefined as T) : res.json();
}
const R = <T,>(op: string, init?: RequestInit & { query?: Query }) => call<T>("/api/repo", op, init);
const U = <T,>(op: string, init?: RequestInit & { query?: Query }) => call<T>("/api/ucp", op, init);

/** Browser-side repository client (mirrors the ContentRepository port through the BFF). */
export const repoApi = {
  me: () => R<Identity>("me"),
  getPage: (path: string) => R<PageView>("page", { query: { path } }),
  children: (path: string, offset = 0, limit = 50) => R<{ items: PageSummary[]; more: boolean }>("children", { query: { path, offset, limit } }),
  createPage: (input: CreatePageInput & { locale?: string; sourcePath?: string; components?: ComponentNode[] }) => R<PageView>("pages", { method: "POST", body: JSON.stringify(input) }),
  updateContent: (path: string, patch: PageContentPatch) => R<PageView>("page", { method: "PATCH", query: { path }, body: JSON.stringify(patch) }),
  saveComponents: (path: string, components: ComponentNode[]) => R<PageView>("components", { method: "PUT", query: { path }, body: JSON.stringify(components) }),
  deletePage: (path: string, recursive = false) => R<void>("page", { method: "DELETE", query: { path, recursive } }),
  movePage: (path: string, destinationPath: string) => R<PageView>("move", { method: "POST", query: { path }, body: JSON.stringify({ destinationPath }) }),
  /* generic nodes (assets, users, models, templates…). `audit` = human-readable line for the audit log, `target` = what it is about. */
  node: (path: string, depth = 1) => R<RepoNode>("node", { query: { path, depth } }),
  createNode: (path: string, primaryType: string, props: NodeProps = {}, audit?: { text: string; type?: "content" | "permissions" | "system"; target?: string }) => R<RepoNode>("node", { method: "POST", query: { path, audit: audit?.text, type: audit?.type, target: audit?.target }, body: JSON.stringify({ primaryType, props }) }),
  setProps: (path: string, props: NodeProps, audit?: { text: string; type?: "content" | "permissions" | "system"; target?: string }) => R<RepoNode>("node", { method: "PATCH", query: { path, audit: audit?.text, type: audit?.type, target: audit?.target }, body: JSON.stringify(props) }),
  deleteNode: (path: string, audit?: { text: string; type?: "content" | "permissions" | "system"; target?: string }) => R<void>("node", { method: "DELETE", query: { path, audit: audit?.text, type: audit?.type, target: audit?.target } }),
  moveNode: (path: string, destinationPath: string, audit?: string) => R<RepoNode>("node/move", { method: "POST", query: { path, audit }, body: JSON.stringify({ destinationPath }) }),
};
/** Market-scoped derived reads and actions. */
export const ucpApi = {
  me: () => U<User>("me"),
  tasks: (market: string) => U<Task[]>("tasks", { query: { market } }),
  assets: (market: string) => U<Asset[]>("assets", { query: { market } }),
  notifications: (market: string) => U<Notification[]>("notifications", { query: { market } }),
  search: (market: string, q: string) => U<{ pages: PageSummary[]; assets: Asset[]; users: User[]; templates: Template[]; models: Model[] }>("search", { query: { market, q } }),
  log: (market: string) => U<AuditEvent[]>("log", { query: { market } }),
  logEvent: (market: string, ev: { type: "content" | "publishing" | "permissions" | "system"; text: string; target?: string; level?: "crit" | "" }) => U<{ ok: true }>("log", { method: "POST", query: { market }, body: JSON.stringify(ev) }),
  upload: (market: string, folder: string, files: File[]) => { const fd = new FormData(); files.forEach((f) => fd.append("files", f)); return U<Asset[]>("upload", { method: "POST", query: { market, folder }, body: fd }); },
  translate: (market: string, body: { pages: string[]; langs: string[]; review?: boolean; dest?: string; mode?: "ai" | "vendor" }) => U<{ created: string[] }>("translate", { method: "POST", query: { market }, body: JSON.stringify(body) }),
};
