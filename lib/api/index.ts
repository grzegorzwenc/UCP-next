import type { PageView, PageSummary, CreatePageInput, PageContentPatch, ComponentNode, Identity, Problem, RepoNode, NodeProps } from "./types";
import type { Task, Notification, Asset, AuditEvent, User, Template, Model, ModelField, ModelVersion, Entity, EntityValues, Bindings, ReviewerOption, TaskKind } from "@/lib/ucp/types";
import type { ResolvedEntities } from "@/lib/ucp/tokens";
import { ApiError } from "./types";
export type PageComment = { id: string; who: string; whoName: string; time: string; text: string; pinned?: boolean; pinnedBy?: string; version?: { id: string; label: string }; stage?: string; guest?: boolean; block?: { id: string; label: string; field?: string }; resolved?: { by: string; name: string; at: string } };
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
  copyPage: (path: string, destinationPath: string, title?: string) => R<PageView>("page/copy", { method: "POST", query: { path }, body: JSON.stringify({ destinationPath, title }) }),
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
  login: (id: string) => U<{ ok: true; user: User }>("login", { method: "POST", body: JSON.stringify({ id }) }),
  /** Real sign-in against the backend (ContentLIBRE): the BFF keeps the backend session, the browser never sees it. */
  signIn: (username: string, password: string) => U<{ ok: true; user: { id: string } }>("login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => U<{ ok: true }>("logout", { method: "POST", body: "{}" }),
  /* page comments (Version history panel) */
  comments: (market: string, path: string) => U<PageComment[]>("comments", { query: { market, path } }),
  addComment: (market: string, path: string, text: string, version?: { id: string; label: string }, block?: { id: string; label: string; field?: string }) => U<PageComment[]>("comments/add", { method: "POST", query: { market, path }, body: JSON.stringify({ text, version, block }) }),
  pinComment: (market: string, path: string, id: string, pinned: boolean) => U<PageComment[]>("comments/pin", { method: "POST", query: { market, path }, body: JSON.stringify({ id, pinned }) }),
  resolveComment: (market: string, path: string, id: string, resolved: boolean) => U<PageComment[]>("comments/resolve", { method: "POST", query: { market, path }, body: JSON.stringify({ id, resolved }) }),
  deleteComment: (market: string, path: string, id: string) => U<PageComment[]>("comments/delete", { method: "POST", query: { market, path }, body: JSON.stringify({ id }) }),
  compare: (path: string, version?: string) => U<{ live: { label: string; title: string; components: unknown[]; time?: string; who?: string } | null; authoring: { label: string; title: string; components: unknown[]; time?: string; who?: string }; versions: { id: string; time: string; who: string; note: string; title: string; status: string; blocks: number }[] }>("compare", { query: { path, version } }),
  versions: (path: string) => U<{ id: string; time: string; who: string; note: string; title: string; status: string; blocks: number }[]>("versions", { query: { path } }),
  restoreVersion: (market: string, path: string, id: string) => U<{ ok: true }>("versions/restore", { method: "POST", query: { market, path }, body: JSON.stringify({ id }) }),
  /* content models (admin-only mutations; the server refuses others with 403) */
  modelVersions: (id: string) => U<ModelVersion[]>("models/versions", { query: { id } }),
  saveModel: (market: string, id: string, patch: { name?: string; displayName?: string; description?: string; icon?: string; group?: string; fields?: ModelField[] }) => U<Model>("models/save", { method: "POST", query: { market, id }, body: JSON.stringify(patch) }),
  publishModel: (market: string, id: string) => U<Model>("models/publish", { method: "POST", query: { market, id }, body: "{}" }),
  restoreModelVersion: (market: string, id: string, versionId: string) => U<Model>("models/restore", { method: "POST", query: { market, id }, body: JSON.stringify({ versionId }) }),
  createModel: (market: string, input: { id?: string; name: string; displayName?: string; description?: string; icon?: string; group?: string; fields?: ModelField[] }) => U<Model>("models/create", { method: "POST", query: { market }, body: JSON.stringify(input) }),
  duplicateModel: (market: string, id: string) => U<Model>("models/duplicate", { method: "POST", query: { market, id }, body: "{}" }),
  modelFolder: (market: string, act: "create" | "rename" | "delete", body: { name?: string; from?: string; to?: string }) => U<string[]>(`models/folders/${act}`, { method: "POST", query: { market }, body: JSON.stringify(body) }),
  moveModel: (market: string, id: string, to: { group?: string; before?: string }) => U<Model>("models/move", { method: "POST", query: { market, id }, body: JSON.stringify(to) }),
  deleteModel: (market: string, id: string) => U<{ ok: true }>("models/delete", { method: "POST", query: { market, id }, body: "{}" }),
  /** Publish now (no `at`), schedule (`at` in the future) or cancel a schedule, for one page or many. */
  publish: (market: string, paths: string[], opts: { at?: string; cancel?: boolean } = {}) => U<{ path: string; title: string; ok: boolean; status?: string; reason?: string }[]>("publish", { method: "POST", query: { market }, body: JSON.stringify({ paths, ...opts }) }),
  /* content entities */
  entities: (market: string, model?: string) => U<Entity[]>("entities", { query: { market, model } }),
  entity: (market: string, path: string) => U<Entity>("entities/get", { query: { market, path } }),
  createEntity: (market: string, model: string, title: string, values: EntityValues = {}, folder = "") => U<Entity>("entities/create", { method: "POST", query: { market }, body: JSON.stringify({ model, title, values, folder }) }),
  saveEntity: (market: string, path: string, patch: { title?: string; values?: EntityValues }) => U<Entity>("entities/save", { method: "POST", query: { market, path }, body: JSON.stringify(patch) }),
  publishEntity: (market: string, path: string) => U<Entity>("entities/publish", { method: "POST", query: { market, path }, body: "{}" }),
  entityFolders: (market: string) => U<Record<string, string[]>>("entities/folders", { query: { market } }),
  entityFolder: (market: string, act: "create" | "rename" | "delete", body: { model: string; name?: string; from?: string; to?: string }) => U<string[]>(`entities/folders/${act}`, { method: "POST", query: { market }, body: JSON.stringify(body) }),
  moveEntity: (market: string, path: string, to: { model?: string; before?: string; folder?: string }) => U<{ entity: Entity; rebound: number; missing: string[] }>("entities/move", { method: "POST", query: { market, path }, body: JSON.stringify(to) }),
  deleteEntity: (market: string, path: string) => U<{ ok: true }>("entities/delete", { method: "POST", query: { market, path }, body: "{}" }),
  resolveBindings: (market: string, bindings: Bindings, published = false) => U<ResolvedEntities>("entities/resolve", { method: "POST", query: { market, published }, body: JSON.stringify(bindings) }),
  saveBindings: (market: string, path: string, bindings: Bindings) => U<Bindings>("bindings", { method: "POST", query: { market, path }, body: JSON.stringify(bindings) }),
  /* review assignment */
  reviewers: (market: string, path: string) => U<ReviewerOption[]>("reviewers", { query: { market, path } }),
  sendForReview: (market: string, path: string, body: { note?: string }) => U<{ assignee: string; assigneeName: string }>("review/send", { method: "POST", query: { market, path }, body: JSON.stringify(body) }),
  /** Link (and optional e-mail invite) for the current review stage; an e-mail of a UCP reviewer also assigns them. */
  reviewGroups: (market: string, path: string) => U<{ team: string; members: { id: string; name: string; email: string; canSignOff: boolean }[]; shared: boolean }[]>("review/groups", { query: { market, path } }),
  shareWithGroup: (market: string, path: string, team: string) => U<{ token: string; url: string; members: { id: string; name: string; email: string; canSignOff: boolean }[]; created: boolean }>("review/group", { method: "POST", query: { market, path }, body: JSON.stringify({ team }) }),
  reviewLink: (market: string, path: string, email?: string) => U<{ token: string; stage: "review" | "bizreview"; assigned?: string; url: string }>("review/link", { method: "POST", query: { market, path }, body: JSON.stringify({ email }) }),
  /** Comment from the review screen (signed in, or a guest with name + e-mail). */
  reviewDecide: (token: string, body: { decision: "signoff" | "reauthor"; name?: string; email?: string; note?: string }) => U<{ decision: "signoff" | "reauthor"; by: string; at: string }>("review/decide", { method: "POST", query: { token }, body: JSON.stringify(body) }),
  reviewComment: (token: string, body: { text: string; name?: string; email?: string; block?: { id: string; label: string; field?: string } }) => U<PageComment[]>("review/comment", { method: "POST", query: { token }, body: JSON.stringify(body) }),
  /** Take a waiting author's review (assign it to yourself). */
  lockPages: (market: string, paths: string[], locked: boolean) => U<{ changed: number }>("pages/lock", { method: "POST", query: { market }, body: JSON.stringify({ paths, locked }) }),
  claimBizReview: (market: string, path: string) => U<{ assignee: string; assigneeName: string }>("bizreview/claim", { method: "POST", query: { market, path }, body: "{}" }),
  claimReview: (market: string, path: string) => U<{ assignee: string; assigneeName: string }>("review/claim", { method: "POST", query: { market, path }, body: "{}" }),
  releaseReview: (market: string, path: string) => U<{ ok: boolean }>("review/release", { method: "POST", query: { market, path }, body: "{}" }),
  /** Nudge the reviewer of a page in review ("I'm waiting"); at most once every 15 minutes. */
  remindReviewer: (market: string, path: string) => U<{ remindedAt: string; reviewer: string }>("review/remind", { method: "POST", query: { market, path }, body: "{}" }),
  reassignReview: (market: string, path: string, body: { assignee?: string; auto?: boolean }) => U<{ assignee: string; assigneeName: string }>("review/assign", { method: "POST", query: { market, path }, body: JSON.stringify(body) }),
  /* task assignment (site admins) */
  taskPeople: (market: string, path: string, kind: TaskKind) => U<ReviewerOption[]>("task/people", { query: { market, path, kind } }),
  assignTask: (market: string, path: string, kind: TaskKind, assignee: string | null) => U<{ assignee: string | null; assigneeName: string | null }>("task/assign", { method: "POST", query: { market, path }, body: JSON.stringify({ kind, assignee }) }),
  translate: (market: string, body: { pages: string[]; langs: string[]; review?: boolean; dest?: string; mode?: "ai" | "vendor" }) => U<{ created: string[] }>("translate", { method: "POST", query: { market }, body: JSON.stringify(body) }),
};
