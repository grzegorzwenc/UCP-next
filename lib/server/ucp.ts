import "server-only";
import { repo } from "@/lib/repo";
import type { RepoNode, PageSummary, NodeProps } from "@/lib/repo";
import { PATHS } from "@/lib/ucp/paths";
import type { Asset, AssetType, AuditEvent, AuditType, FormDef, Model, ModelField, ModelVersion, Notification, Perms, Role, Task, TaskKind, Template, User } from "@/lib/ucp/types";
import { RepoError } from "@/lib/repo";
import { BLOCK_MODELS, ME, SEED_USERS } from "@/lib/ucp/seed";
import { allPages } from "@/lib/server/pages";
import { sessionUserId } from "@/lib/server/session";
import { can } from "@/lib/ucp/perms";
import { market as marketOf } from "@/lib/markets";

/**
 * Domain services over the repository port. Each object is one JCR node; these helpers only map properties.
 * Reads return [] when the backend has no such subtree (e.g. ContentLIBRE), so pages degrade instead of failing.
 */
const kids = async (path: string, depth = 1): Promise<RepoNode[]> => { try { const n = await repo().getNode(path, depth); return (n?.children ?? []).filter((c) => c.name !== "jcr:content"); } catch { return []; } };
const str = (v: unknown, d = "") => (v === undefined || v === null ? d : String(v));
const num = (v: unknown) => (typeof v === "number" ? v : v === undefined || v === null || v === "" ? undefined : Number(v));
const json = <T,>(v: unknown, d: T): T => { if (typeof v !== "string") return (v as T) ?? d; try { return JSON.parse(v) as T; } catch { return d; } };
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");

/* ---------------- assets (/content/dam/<market>/<folder>/<file>) ---------------- */
const toAsset = (n: RepoNode): Asset => ({ id: str(n.properties["ucp:id"], n.name), path: n.path, name: str(n.properties["jcr:title"], n.name), type: (str(n.properties["dam:type"], "file") as AssetType), size: str(n.properties["dam:size"]), folder: str(n.properties["dam:folder"], n.path.split("/").slice(-2, -1)[0]), width: num(n.properties["dam:width"]), height: num(n.properties["dam:height"]), data: n.properties["ucp:data"] as string | undefined, uploaded: str(n.properties["jcr:created"]) || undefined, uploadedBy: str(n.properties["jcr:createdBy"]) || undefined });
export async function listAssets(marketId: string): Promise<Asset[]> { const folders = await kids(PATHS.dam(marketId), 2); return folders.flatMap((f) => (f.children ?? []).filter((c) => c.primaryType === "dam:Asset").map(toAsset)); }
export async function assetFolders(marketId: string): Promise<string[]> { const folders = await kids(PATHS.dam(marketId), 1); return folders.map((f) => f.name); }
export async function createAsset(marketId: string, a: { name: string; type: AssetType; size: string; folder: string; width?: number; height?: number; data?: string; by: string }): Promise<Asset> {
  const folderPath = `${PATHS.dam(marketId)}/${a.folder}`; if (!(await repo().getNode(folderPath, 0))) await repo().createNode(folderPath, "sling:Folder", { "jcr:title": a.folder });
  let name = a.name; let i = 1; while (await repo().getNode(`${folderPath}/${name}`, 0)) { const m = a.name.match(/^(.*?)(\.[^.]+)?$/); name = `${m![1]}-${++i}${m![2] ?? ""}`; }
  const id = slug(name.replace(/\.[^.]+$/, "")) + "-" + Math.random().toString(36).slice(2, 6);
  const n = await repo().createNode(`${folderPath}/${name}`, "dam:Asset", { "jcr:title": name, "ucp:id": id, "dam:type": a.type, "dam:size": a.size, "dam:width": a.width, "dam:height": a.height, "dam:folder": a.folder, "ucp:data": a.data, "jcr:createdBy": a.by });
  return toAsset(n);
}
export async function assetUsage(marketId: string, all?: PageSummary[]): Promise<Record<string, PageSummary[]>> {
  // Which pages reference which asset id. Reads full pages; fine for the mock, paged on real backends.
  const pages = (all ?? await allPages(PATHS.content(marketId))).filter((p) => !p.isFolder); const out: Record<string, PageSummary[]> = {};
  for (const p of pages) { const v = await repo().getPage(p.path).catch(() => undefined); for (const c of v?.components ?? []) for (const [k, val] of Object.entries(c.props)) if ((k === "image" || k.endsWith("Image")) && typeof val === "string" && val) (out[val] ??= []).push(p); }
  return out;
}

/* ---------------- users (/home/users/<id>) ---------------- */
const toUser = (n: RepoNode): User => ({ id: n.name, path: n.path, name: str(n.properties["ucp:name"], n.name), email: str(n.properties["profile/email"]), role: (str(n.properties["ucp:role"], "viewer") as Role), team: str(n.properties["ucp:team"]), perms: json<Perms>(n.properties["ucp:perms"], {}) });
export async function listUsers(): Promise<User[]> { const u = await kids(PATHS.users, 1); return u.length ? u.map(toUser) : SEED_USERS.map((x) => ({ ...x, path: `${PATHS.users}/${x.id}` })); }
export async function getUser(id: string): Promise<User | undefined> { return (await listUsers()).find((u) => u.id === id); }
export async function userName(id: string): Promise<string> { if (id === "system") return "System"; const u = await getUser(id); return u?.name ?? id.split(".").map((s) => s[0]?.toUpperCase() + s.slice(1)).join(" "); }
export async function me(): Promise<User> { const id = (await sessionUserId()) ?? (await repo().identity().catch(() => ({ id: ME }))).id; return (await getUser(id)) ?? { id, path: `${PATHS.users}/${id}`, name: await userName(id), email: "", role: "author", team: "", perms: { root: { read: true } } }; }

/* ---------------- models (/conf/hsbc/models/<id>) + block types from the registry ---------------- */
const toModel = (n: RepoNode): Model => { const fields = json<ModelField[]>(n.properties["ucp:fields"], []); const pub = n.properties["ucp:publishedFields"] !== undefined ? json<ModelField[]>(n.properties["ucp:publishedFields"], []) : undefined; const pv = num(n.properties["ucp:publishedVersion"]);
  return { id: n.name, path: n.path, name: str(n.properties["jcr:title"], n.name), displayName: str(n.properties["ucp:displayName"]) || undefined, description: str(n.properties["jcr:description"]) || undefined, icon: str(n.properties["ucp:icon"]) || undefined, group: str(n.properties["ucp:group"], "Core"), source: str(n.properties["ucp:source"], "Core"), status: (str(n.properties["ucp:status"]) as Model["status"]) || (pv ? "published" : "draft"), version: num(n.properties["ucp:version"]) ?? 1, publishedVersion: pv, fields, publishedFields: pub, lastModified: str(n.properties["cq:lastModified"]) || str(n.properties["jcr:created"]) || undefined, lastModifiedBy: str(n.properties["cq:lastModifiedBy"]) || undefined }; };
export async function listModels(): Promise<Model[]> { const m = await kids(PATHS.models, 1); return [...m.map(toModel), ...BLOCK_MODELS]; }
export async function getModel(id: string): Promise<Model | undefined> { return (await listModels()).find((m) => m.id === id); }

/** Which pages use a model. Block types: pages whose components include that block. Core models: derived from the blocks that carry that content. */
export async function modelUsage(marketId: string, all?: PageSummary[]): Promise<Record<string, PageSummary[]>> {
  const pages = (all ?? await allPages(PATHS.content(marketId))).filter((p) => !p.isFolder); const out: Record<string, PageSummary[]> = {};
  const add = (id: string, p: PageSummary) => { (out[id] ??= []); if (!out[id].includes(p)) out[id].push(p); };
  for (const p of pages) {
    add("page", p); if (p.template === "campaign") add("campaign", p);
    const v = await repo().getPage(p.path).catch(() => undefined);
    for (const c of v?.components ?? []) { const t = c.resourceType.split("/").pop() ?? ""; add("block-" + t, p); if (t === "mastertiles" || t === "cards") add("product", p); if (t === "rates") add("rate", p); if (t === "faq") add("faq-item", p); }
  }
  return out;
}

/* ---------------- templates (/conf/hsbc/settings/wcm/templates/<id>) ---------------- */
const toTemplate = (n: RepoNode): Template => ({ id: n.name, path: n.path, name: str(n.properties["jcr:title"], n.name), desc: str(n.properties["jcr:description"]), blocks: str(n.properties["ucp:blocks"]).split(",").filter(Boolean), folder: str(n.properties["ucp:folder"], "Global (all markets)") });
export async function listTemplates(): Promise<Template[]> { const t = await kids(PATHS.templates, 1); return t.filter((x) => x.name !== "folder").map(toTemplate); }
export async function listForms(): Promise<FormDef[]> { const f = await kids(PATHS.forms, 1); return f.map((n) => ({ id: n.name, name: str(n.properties["jcr:title"], n.name), version: num(n.properties["ucp:version"]) ?? 1 })); }

/* ---------------- audit (/var/audit/ucp/<market>/<id>, append-only) ---------------- */
const toEvent = (n: RepoNode): AuditEvent => ({ id: n.name, path: n.path, time: str(n.properties["ucp:time"], str(n.properties["jcr:created"])), type: (str(n.properties["ucp:type"], "content") as AuditType), who: str(n.properties["ucp:who"], "system"), text: str(n.properties["ucp:text"]), target: str(n.properties["ucp:target"]) || undefined, level: (str(n.properties["ucp:level"]) as AuditEvent["level"]) || "", requestId: str(n.properties["ucp:requestId"]) || undefined });
export async function readLog(marketId: string, limit = 500): Promise<AuditEvent[]> { const ev = await kids(PATHS.audit(marketId), 1); return ev.map(toEvent).sort((a, b) => b.time.localeCompare(a.time)).slice(0, limit); }
export async function logEvent(marketId: string, ev: { type: AuditType; who?: string; text: string; target?: string; level?: "crit" | ""; requestId?: string }): Promise<void> {
  const time = new Date().toISOString(); const id = `${time.replace(/[^0-9]/g, "").slice(0, 17)}-${Math.random().toString(36).slice(2, 6)}`;
  try { await repo().createNode(`${PATHS.audit(marketId)}/${id}`, "nt:unstructured", { "ucp:time": time, "ucp:type": ev.type, "ucp:who": ev.who ?? (await repo().identity().catch(() => ({ id: ME }))).id, "ucp:text": ev.text, "ucp:target": ev.target, "ucp:level": ev.level, "ucp:requestId": ev.requestId }); } catch { /* backends without /var keep no audit trail; never fail the user's action over it */ }
}

/* ---------------- tasks: derived from page workflow state (status + ucp:sentBy/ucp:sentAt/ucp:due on jcr:content) ---------------- */
const hash = (s: string) => s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
export async function listTasks(marketId: string, all?: PageSummary[]): Promise<Task[]> {
  const pages = (all ?? await allPages(PATHS.content(marketId))).filter((p) => !p.isFolder); const user = await me(); const meId = user.id; const now = new Date();
  const admin = user.role === "admin" || !!user.perms.root?.manage; const root = marketOf(marketId).root;
  /* Visibility: admins see every task; everyone else only what they can act on or what they started. */
  const mine = (p: PageSummary, kind: TaskKind) => admin || str(p.meta?.["ucp:sentBy"]) === meId || (p.lastModifiedBy ?? ME) === meId || (kind === "Review" && can(user, "review", p.path, root)) || ((kind === "Publish" || kind === "Fix" || kind === "Check") && can(user, "publish", p.path, root));
  const dueOf = (p: PageSummary) => { const d = p.meta?.["ucp:due"]; if (typeof d === "string" && d) return new Date(d); const off = (hash(p.path) % 9) - 2; const x = new Date(now); x.setDate(x.getDate() + off); return x; };
  const mk = async (p: PageSummary, kind: TaskKind, what: string, from: string): Promise<Task> => { const due = dueOf(p); const overdueDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(due).setHours(0, 0, 0, 0)) / 86400000); return { kind, what, from, sentAt: str(p.meta?.["ucp:sentAt"]) || p.lastModified, due: due.toISOString(), overdueDays, page: { path: p.path, title: p.title, status: p.status, template: p.template } }; };
  const sender = async (p: PageSummary, fallback: string) => { const s = str(p.meta?.["ucp:sentBy"]); return s ? await userName(s) : fallback; };
  const out: Task[] = [];
  for (const p of pages) {
    if (p.status === "review") out.push(await mk(p, "Review", "Review and approve", await sender(p, await userName(p.lastModifiedBy ?? ME))));
    else if (p.status === "approved") out.push(await mk(p, "Publish", "Publish approved page", `${await sender(p, "Rachel Hughes")} (approved)`));
    else if (p.status === "failed") out.push(await mk(p, "Fix", "Fix failed publish", "System"));
    else if (p.status === "scheduled") out.push(await mk(p, "Check", "Check scheduled publish", await sender(p, "Michael Osei")));
    else if (p.status === "draft" && (p.lastModifiedBy ?? ME) === meId) out.push(await mk(p, "Finish", "Finish draft and send for review", "You"));
  }
  return out.filter((t) => mine(pages.find((p) => p.path === t.page.path)!, t.kind)).sort((a, b) => a.due.localeCompare(b.due));
}
export async function notifications(marketId: string): Promise<Notification[]> {
  const [tasks, log, meId] = await Promise.all([listTasks(marketId), readLog(marketId, 20), me().then((u) => u.id)]);
  const rel = (iso: string) => { const d = new Date(iso); const diff = Math.round((Date.now() - d.getTime()) / 60000); return diff < 60 ? `${Math.max(diff, 0)} min ago` : diff < 1440 ? `${Math.round(diff / 60)} h ago` : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
  const t = tasks.slice(0, 4).map((x) => ({ text: `${x.from} ${x.kind === "Review" ? "asked you to review" : x.kind === "Publish" ? "approved" : x.kind === "Fix" ? "reported a failed publish of" : "is waiting on"} ${x.page.title}`, when: x.overdueDays > 0 ? `${x.overdueDays} day${x.overdueDays === 1 ? "" : "s"} overdue` : x.overdueDays === 0 ? "Due today" : `Due ${new Date(x.due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`, target: x.page.path, level: x.overdueDays > 0 ? "crit" : x.overdueDays === 0 ? "warn" : "" }));
  const l: Notification[] = []; for (const e of log.filter((e) => e.who !== meId).slice(0, 3)) l.push({ text: `${await userName(e.who)} ${e.text}`, when: rel(e.time), target: e.target, level: e.level });
  return [...t, ...l];
}

/* ---------------- delivery JSON (what the public API serves) ---------------- */
export async function pageDeliveryJson(marketId: string, path: string, host: string) {
  const v = await repo().getPage(path); if (!v) return undefined;
  const [assets, forms, templates] = await Promise.all([listAssets(marketId), listForms(), listTemplates()]);
  const route = path.replace(PATHS.content(marketId), "") || "/";
  const blocks = v.components.map((c) => { const props: NodeProps = {}; for (const [k, val] of Object.entries(c.props)) { if (k === "ucp:id") continue; if (k === "image" && typeof val === "string") { const a = assets.find((x) => x.id === val); props[k] = a ? { id: a.id, name: a.name, url: `/v1/assets/${a.id}/original`, renditions: { hero: `/v1/assets/${a.id}/hero`, card: `/v1/assets/${a.id}/card` } } : null; } else if (k === "form" && typeof val === "string") { const f = forms.find((x) => x.id === val); props[k] = f ? { id: f.id, name: f.name, version: f.version, embed: `forms://${marketId}/${f.id}/v${f.version}` } : null; } else if (typeof val === "string" && val.includes("|") && val.includes("\n")) props[k] = val.split("\n").map((r) => r.split("|").map((x) => x.trim())); else props[k] = val; } return { id: c.props["ucp:id"] ?? c.name, type: c.resourceType.split("/").pop(), resourceType: c.resourceType, props }; });
  return { id: v.path, route, market: marketId.toUpperCase(), language: v.locale ?? "en-GB", title: v.title, status: v.status, template: v.template, templateName: templates.find((t) => t.id === v.template)?.name, updatedAt: v.lastModified, updatedBy: v.lastModifiedBy, blocks, meta: { canonical: `https://${host}${route}`, index: true, description: v.description ?? "" }, _links: { self: `/v1/pages${route}`, preview: `/v1/preview/pages${route}`, schema: "/v1/models/page", repository: v.path } };
}
export { modelSchema } from "@/lib/ucp/schema";

/* ---------------- versions: snapshots under <page>/jcr:content/ucp:versions/<id> (last 20) ---------------- */
export type PageVersion = { id: string; time: string; who: string; note: string; title: string; status: string; blocks: number };
const VER = (path: string) => `${path}/jcr:content/ucp:versions`;
export async function listVersions(path: string): Promise<PageVersion[]> { const v = await kids(VER(path), 1); return v.map((n) => ({ id: n.name, time: str(n.properties["ucp:time"]), who: str(n.properties["ucp:who"]), note: str(n.properties["ucp:note"]), title: str(n.properties["ucp:title"]), status: str(n.properties["ucp:status"]), blocks: json<unknown[]>(n.properties["ucp:components"], []).length })).sort((a, b) => b.time.localeCompare(a.time)); }
export async function snapshotVersion(path: string, note: string, who: string): Promise<void> {
  const v = await repo().getPage(path); if (!v) return; const time = new Date().toISOString(); const id = `v${time.replace(/[^0-9]/g, "").slice(0, 17)}`;
  try { await repo().createNode(`${VER(path)}/${id}`, "nt:unstructured", { "ucp:time": time, "ucp:who": who, "ucp:note": note, "ucp:title": v.title, "ucp:status": v.status, "ucp:components": JSON.stringify(v.components) });
    const all = await listVersions(path); for (const old of all.slice(20)) await repo().deleteNode(`${VER(path)}/${old.id}`).catch(() => {}); } catch { /* backends without version nodes keep no history */ }
}
export async function restoreVersion(path: string, id: string): Promise<void> {
  const n = await repo().getNode(`${VER(path)}/${id}`, 0); if (!n) throw new Error("Version not found");
  await repo().saveComponents(path, json(n.properties["ucp:components"], [])); const title = str(n.properties["ucp:title"]); if (title) await repo().updateContent(path, { title });
}

/* ---------------- content model lifecycle: draft → publish, versions under <model>/ucp:versions ---------------- */
const MVER = (id: string) => `${PATHS.models}/${id}/ucp:versions`;
export async function listModelVersions(id: string): Promise<ModelVersion[]> { const v = await kids(MVER(id), 1); return v.map((n) => ({ id: n.name, version: num(n.properties["ucp:version"]) ?? 0, time: str(n.properties["ucp:time"]), who: str(n.properties["ucp:who"]), note: str(n.properties["ucp:note"]), published: n.properties["ucp:published"] === true || n.properties["ucp:published"] === "true", fields: json<ModelField[]>(n.properties["ucp:fields"], []) })).sort((a, b) => b.version - a.version || b.time.localeCompare(a.time)); }
async function snapshotModel(id: string, m: Model, note: string, who: string, published: boolean) {
  const time = new Date().toISOString(); const vid = `v${m.version}-${time.replace(/[^0-9]/g, "").slice(8, 14)}`;
  await repo().createNode(`${MVER(id)}/${vid}`, "nt:unstructured", { "ucp:version": m.version, "ucp:time": time, "ucp:who": who, "ucp:note": note, "ucp:published": published, "ucp:fields": JSON.stringify(m.fields) }).catch(() => {});
}
/** Save the draft: fields and/or metadata. Bumps the draft version and marks a published model as "modified". */
export async function saveModelDraft(id: string, patch: { name?: string; displayName?: string; description?: string; icon?: string; group?: string; fields?: ModelField[] }, who: string): Promise<Model> {
  const cur = (await listModels()).find((m) => m.id === id); if (!cur || cur.locked) throw new RepoError(cur ? 403 : 404, cur ? "Block-type models are read-only" : "Model not found", id);
  const props: NodeProps = { "cq:lastModified": new Date().toISOString(), "cq:lastModifiedBy": who };
  if (patch.name !== undefined) props["jcr:title"] = patch.name; if (patch.displayName !== undefined) props["ucp:displayName"] = patch.displayName; if (patch.description !== undefined) props["jcr:description"] = patch.description; if (patch.icon !== undefined) props["ucp:icon"] = patch.icon; if (patch.group !== undefined) props["ucp:group"] = patch.group;
  if (patch.fields) { props["ucp:fields"] = JSON.stringify(patch.fields); props["ucp:version"] = cur.publishedVersion && cur.version === cur.publishedVersion ? cur.version + 1 : cur.version; }
  props["ucp:status"] = cur.publishedVersion ? "modified" : "draft";
  await repo().setProps(`${PATHS.models}/${id}`, props);
  const next = (await listModels()).find((m) => m.id === id)!; if (patch.fields) await snapshotModel(id, next, "draft saved", who, false); return next;
}
/** Publish the draft: the published schema becomes the current fields; a published version snapshot is kept. */
export async function publishModel(id: string, who: string): Promise<Model> {
  const cur = (await listModels()).find((m) => m.id === id); if (!cur || cur.locked) throw new RepoError(cur ? 403 : 404, cur ? "Block-type models are read-only" : "Model not found", id);
  await repo().setProps(`${PATHS.models}/${id}`, { "ucp:publishedFields": JSON.stringify(cur.fields), "ucp:publishedVersion": cur.version, "ucp:status": "published", "cq:lastModified": new Date().toISOString(), "cq:lastModifiedBy": who });
  const next = (await listModels()).find((m) => m.id === id)!; await snapshotModel(id, next, `published v${next.version}`, who, true); return next;
}
/** Restore a version into the draft (never touches the published schema). */
export async function restoreModelVersion(id: string, versionId: string, who: string): Promise<Model> {
  const v = (await listModelVersions(id)).find((x) => x.id === versionId); if (!v) throw new RepoError(404, "Version not found", versionId);
  const cur = (await listModels()).find((m) => m.id === id)!;
  return saveModelDraft(id, { fields: v.fields }, who).then(async () => { await repo().setProps(`${PATHS.models}/${id}`, { "ucp:version": cur.version + 1 }); return (await listModels()).find((m) => m.id === id)!; });
}
export async function createModel(input: { id: string; name: string; displayName?: string; description?: string; icon?: string; group?: string; fields?: ModelField[] }, who: string): Promise<Model> {
  const id = slug(input.id || input.name); if (!id) throw new RepoError(400, "A model needs a name"); if (await repo().getNode(`${PATHS.models}/${id}`, 0)) throw new RepoError(409, "A model with this ID already exists", id);
  const n = await repo().createNode(`${PATHS.models}/${id}`, "nt:unstructured", { "jcr:title": input.name, "ucp:displayName": input.displayName, "jcr:description": input.description, "ucp:icon": input.icon, "ucp:group": input.group || "Core", "ucp:source": "Custom", "ucp:status": "draft", "ucp:version": 1, "ucp:fields": JSON.stringify(input.fields ?? []), "cq:lastModified": new Date().toISOString(), "cq:lastModifiedBy": who });
  return toModel({ ...n, properties: n.properties });
}
export async function duplicateModel(id: string, who: string): Promise<Model> {
  const cur = (await listModels()).find((m) => m.id === id); if (!cur) throw new RepoError(404, "Model not found", id);
  let nid = `${id}-copy`; let i = 2; while (await repo().getNode(`${PATHS.models}/${nid}`, 0)) nid = `${id}-copy-${i++}`;
  return createModel({ id: nid, name: `${cur.name} (copy)`, displayName: cur.displayName, description: cur.description, icon: cur.icon, group: cur.locked ? "Core" : cur.group, fields: cur.fields }, who);
}
export async function deleteModel(id: string): Promise<void> { const cur = (await listModels()).find((m) => m.id === id); if (!cur || cur.locked) throw new RepoError(cur ? 403 : 404, cur ? "Block-type models cannot be deleted" : "Model not found", id); await repo().deleteNode(`${PATHS.models}/${id}`); }
