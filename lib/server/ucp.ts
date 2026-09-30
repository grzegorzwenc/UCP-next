import "server-only";
import { repo } from "@/lib/repo";
import type { RepoNode, PageSummary, NodeProps } from "@/lib/repo";
import { PATHS } from "@/lib/ucp/paths";
import type { Asset, AssetType, AuditEvent, AuditType, Bindings, Entity, EntityValues, FormDef, Model, ModelField, ModelVersion, Notification, Perms, ReviewerOption, Role, Task, TaskKind, Template, User } from "@/lib/ucp/types";
import type { ResolvedEntities } from "@/lib/ucp/tokens";
import { bindingsOf } from "@/lib/ucp/tokens";
import { byOrder, sharedFields } from "@/lib/ucp/schema";
import { RepoError } from "@/lib/repo";
import { ME, SEED_USERS } from "@/lib/ucp/seed";
import { allPages } from "@/lib/server/pages";
import { sessionUserId } from "@/lib/server/session";
import { can } from "@/lib/ucp/perms";
import { market as marketOf, MARKETS } from "@/lib/markets";

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
const toAsset = (n: RepoNode): Asset => ({ a11y: n.properties["ucp:a11y"] !== undefined ? json<Asset["a11y"]>(n.properties["ucp:a11y"], {}) : undefined, id: str(n.properties["ucp:id"], n.name), path: n.path, name: str(n.properties["jcr:title"], n.name), type: (str(n.properties["dam:type"], "file") as AssetType), size: str(n.properties["dam:size"]), folder: str(n.properties["dam:folder"], n.path.split("/").slice(-2, -1)[0]), width: num(n.properties["dam:width"]), height: num(n.properties["dam:height"]), data: n.properties["ucp:data"] as string | undefined, uploaded: str(n.properties["jcr:created"]) || undefined, uploadedBy: str(n.properties["jcr:createdBy"]) || undefined });
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
/** A person's e-mail (people outside the seeded directory get the usual firstname.lastname@hsbc.com). */
export async function userEmail(id: string): Promise<string> { if (!id || id === "system") return ""; return (await getUser(id))?.email || `${id}@hsbc.com`; }
export async function userName(id: string): Promise<string> { if (id === "system") return "System"; const u = await getUser(id); return u?.name ?? id.split(".").map((s) => s[0]?.toUpperCase() + s.slice(1)).join(" "); }
export async function me(): Promise<User> { const id = (await sessionUserId()) ?? (await repo().identity().catch(() => ({ id: ME }))).id; return (await getUser(id)) ?? { id, path: `${PATHS.users}/${id}`, name: await userName(id), email: "", role: "author", team: "", perms: { root: { read: true } } }; }

/* ---------------- models (/conf/hsbc/models/<id>) + block types from the registry ---------------- */
const toModel = (n: RepoNode): Model => { const fields = json<ModelField[]>(n.properties["ucp:fields"], []); const pub = n.properties["ucp:publishedFields"] !== undefined ? json<ModelField[]>(n.properties["ucp:publishedFields"], []) : undefined; const pv = num(n.properties["ucp:publishedVersion"]);
  return { id: n.name, path: n.path, name: str(n.properties["jcr:title"], n.name), displayName: str(n.properties["ucp:displayName"]) || undefined, description: str(n.properties["jcr:description"]) || undefined, icon: str(n.properties["ucp:icon"]) || undefined, group: str(n.properties["ucp:group"], "Core"), source: str(n.properties["ucp:source"], "Core"), status: (str(n.properties["ucp:status"]) as Model["status"]) || (pv ? "published" : "draft"), version: num(n.properties["ucp:version"]) ?? 1, publishedVersion: pv, fields, publishedFields: pub, lastModified: str(n.properties["cq:lastModified"]) || str(n.properties["jcr:created"]) || undefined, lastModifiedBy: str(n.properties["cq:lastModifiedBy"]) || undefined, order: num(n.properties["ucp:order"]) }; };
/** Content models: the few core models authors build content from. Page blocks are defined by the block registry, not listed here. */
export async function listModels(): Promise<Model[]> { const m = await kids(PATHS.models, 1); return m.map(toModel); }
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
/** Audit log as the signed-in person may see it: site admins see everyone, everyone else only their own actions. */
export async function readLogFor(marketId: string, limit = 500): Promise<{ log: AuditEvent[]; own: boolean }> {
  const u = await me(); const admin = u.role === "admin" || !!u.perms.root?.manage; const all = await readLog(marketId, admin ? limit : 5000);
  return admin ? { log: all, own: false } : { log: all.filter((e) => e.who === u.id).slice(0, limit), own: true };
}
export async function logEvent(marketId: string, ev: { type: AuditType; who?: string; text: string; target?: string; level?: "crit" | ""; requestId?: string }): Promise<void> {
  const time = new Date().toISOString(); const id = `${time.replace(/[^0-9]/g, "").slice(0, 17)}-${Math.random().toString(36).slice(2, 6)}`;
  try { await repo().createNode(`${PATHS.audit(marketId)}/${id}`, "nt:unstructured", { "ucp:time": time, "ucp:type": ev.type, "ucp:who": ev.who ?? (await sessionUserId()) ?? (await repo().identity().catch(() => ({ id: ME }))).id, "ucp:text": ev.text, "ucp:target": ev.target, "ucp:level": ev.level, "ucp:requestId": ev.requestId }); } catch { /* backends without /var keep no audit trail; never fail the user's action over it */ }
}

/* ---------------- tasks: derived from page workflow state (status + ucp:sentBy/ucp:sentAt/ucp:due on jcr:content) ---------------- */
const hash = (s: string) => s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
export async function listTasks(marketId: string, all?: PageSummary[]): Promise<Task[]> {
  const pages = (all ?? await allPages(PATHS.content(marketId))).filter((p) => !p.isFolder); const user = await me(); const meId = user.id; const now = new Date();
  const admin = user.role === "admin" || !!user.perms.root?.manage; const root = marketOf(marketId).root;
  /* Visibility: admins see every task; everyone else only what they can act on or what they started. */
  // the Backlog (author's reviews nobody has taken) is visible to everyone; only reviewers can take one
  const mine = (p: PageSummary, kind: TaskKind) => admin || str(p.meta?.["ucp:sentBy"]) === meId || str(p.meta?.["ucp:requestedBy"]) === meId || (p.lastModifiedBy ?? ME) === meId || (kind === "Review" && (str(p.meta?.["ucp:assignee"]) ? str(p.meta?.["ucp:assignee"]) === meId : p.status === "review" || can(user, "review", p.path, root))) || (kind === "BizReview" && (taskAssignee(p, kind) ? taskAssignee(p, kind) === meId : can(user, "review", p.path, root) && str(p.meta?.["ucp:authorReviewedBy"]) !== meId)) || ((kind === "Publish" || kind === "Fix" || kind === "Check") && (taskAssignee(p, kind) ? taskAssignee(p, kind) === meId : can(user, "publish", p.path, root)));
  const dueOf = (p: PageSummary) => { const d = p.meta?.["ucp:due"]; if (typeof d === "string" && d) return new Date(d); const off = (hash(p.path) % 9) - 2; const x = new Date(now); x.setDate(x.getDate() + off); return x; };
  const mk = async (p: PageSummary, kind: TaskKind, what: string, from: string): Promise<Task> => { const due = dueOf(p); const overdueDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(due).setHours(0, 0, 0, 0)) / 86400000); return { kind, what, from, author: str(p.meta?.["ucp:requestedBy"]) || str(p.meta?.["ucp:sentBy"]) || str(p.lastModifiedBy) || undefined, /* who sent it for review */ sentAt: str(p.meta?.["ucp:sentAt"]) || p.lastModified, due: due.toISOString(), overdueDays, page: { path: p.path, title: p.title, status: p.status, template: p.template } }; };
  // "sent by" = the author who sent it for review (ucp:sentBy changes with every status change)
  const sender = async (p: PageSummary, fallback: string) => { const s = str(p.meta?.["ucp:requestedBy"]) || str(p.meta?.["ucp:sentBy"]); return s ? await userName(s) : fallback; };
  const out: Task[] = [];
  for (const p of pages) {
    if (p.status === "review" || p.status === "inreview") { const t = await mk(p, "Review", p.status === "review" ? "Waiting for author's review assignment · start it" : "In author's review · finish and mark reviewed", await sender(p, await userName(p.lastModifiedBy ?? ME))); const a = str(p.meta?.["ucp:assignee"]); if (a) { t.assignee = a; t.assigneeName = await userName(a); } const rm = str(p.meta?.["ucp:remindedAt"]); if (rm) { t.remindedAt = rm; t.remindedBy = await userName(str(p.meta?.["ucp:remindedBy"])); } out.push(t); }
    else if (p.status === "reviewed") { const by = str(p.meta?.["ucp:authorReviewedBy"]); out.push(await mk(p, "SendBiz", "Author's review done · send to business review", `${by ? await userName(by) : await sender(p, "Rachel Hughes")} (reviewed)`)); }
    else if (p.status === "bizreview") { const by = str(p.meta?.["ucp:authorReviewedBy"]); const t = await mk(p, "BizReview", "Business review · sign off before publishing", `${by ? await userName(by) : await sender(p, "Rachel Hughes")} (author's review done)`); const rm = str(p.meta?.["ucp:remindedAt"]); if (rm) { t.remindedAt = rm; t.remindedBy = await userName(str(p.meta?.["ucp:remindedBy"])); } out.push(t); }
    else if (p.status === "approved") { const by = str(p.meta?.["ucp:approvedBy"]); out.push(await mk(p, "Publish", "Business review done · ready to publish", `${by ? await userName(by) : await sender(p, "Rachel Hughes")} (approved)`)); }
    else if (p.status === "failed") out.push(await mk(p, "Fix", "Fix failed publish", "System"));
    else if (p.status === "scheduled") out.push(await mk(p, "Check", "Check scheduled publish", await sender(p, "Michael Osei")));
    else if (p.status === "draft" && (p.lastModifiedBy ?? ME) === meId) out.push(await mk(p, "Finish", "Finish draft and send for review", "You"));
  }
  for (const t of out) if (t.author) t.authorName = await userName(t.author);
  for (const t of out) { // the three people of the review flow, for the My tasks columns
    const p = pages.find((x) => x.path === t.page.path)!; const st = p.status;
    const peer = st === "review" || st === "inreview" ? str(p.meta?.["ucp:assignee"]) : str(p.meta?.["ucp:authorReviewedBy"]);
    const biz = st === "bizreview" ? taskAssignee(p, "BizReview") : st === "approved" || st === "scheduled" ? str(p.meta?.["ucp:approvedBy"]) : "";
    if (t.author) t.authorEmail = await userEmail(t.author);
    if (peer) { t.peer = peer; t.peerName = await userName(peer); t.peerEmail = await userEmail(peer); }
    if (biz) { t.biz = biz; t.bizName = await userName(biz); t.bizEmail = await userEmail(biz); }
  }
  for (const t of out) { const a = taskAssignee(pages.find((p) => p.path === t.page.path)!, t.kind); if (a) { t.assignee = a; t.assigneeName = await userName(a); } }
  return out.filter((t) => mine(pages.find((p) => p.path === t.page.path)!, t.kind)).sort((a, b) => a.due.localeCompare(b.due));
}
export async function notifications(marketId: string): Promise<Notification[]> {
  const [all, log, meUser] = await Promise.all([listTasks(marketId), readLog(marketId, 20), me()]); const meId = meUser.id;
  const tasks = all.filter((x) => !(x.kind === "Publish" && x.from.startsWith(`${meUser.name} (`))); // no "you finished the review" for the reviewer
  const rel = (iso: string) => { const d = new Date(iso); const diff = Math.round((Date.now() - d.getTime()) / 60000); return diff < 60 ? `${Math.max(diff, 0)} min ago` : diff < 1440 ? `${Math.round(diff / 60)} h ago` : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
  const t = tasks.filter((x) => x.kind !== "Review" || !x.assignee || x.assignee === meId).sort((a, b) => Number(!!b.remindedAt) - Number(!!a.remindedAt) || Number(b.assignee === meId) - Number(a.assignee === meId) || (b.sentAt ?? "").localeCompare(a.sentAt ?? "")).slice(0, 4).map((x) => ({ text: x.remindedAt && (x.kind === "Review" || x.kind === "BizReview") ? `Reminder: ${x.remindedBy} is waiting for ${x.kind === "BizReview" ? "the business review" : x.assignee === meId ? "your review" : "a review"} of ${x.page.title}` : x.kind === "Finish" ? `Your draft of ${x.page.title} is waiting to be sent for review` : `${x.from.replace(/ \(.*\)$/, "")} ${x.kind === "Review" ? (x.assignee === meId ? "assigned you to review" : "asked for a review of") : x.kind === "SendBiz" ? "finished the author's review of" : x.kind === "BizReview" ? "sent to business review:" : x.kind === "Publish" ? "finished the business review of" : x.kind === "Fix" ? "reported a failed publish of" : "is waiting on"} ${x.page.title}${x.kind === "Publish" ? " · ready to publish" : x.kind === "SendBiz" ? " · send it to business review" : x.kind === "BizReview" ? " · business sign-off needed" : ""}`, when: x.overdueDays > 0 ? `${x.overdueDays} day${x.overdueDays === 1 ? "" : "s"} overdue` : x.overdueDays === 0 ? "Due today" : `Due ${new Date(x.due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`, target: x.page.path, level: x.overdueDays > 0 ? "crit" : x.overdueDays === 0 || (x.remindedAt && (x.kind === "Review" || x.kind === "BizReview")) ? "warn" : "" }));
  const taskTargets = new Set(t.map((x) => x.target)); // a task already says it; skip the matching audit line
  const l: Notification[] = []; for (const e of log.filter((e) => e.who !== meId && !(e.target && taskTargets.has(e.target))).slice(0, 3)) l.push({ text: `${await userName(e.who)} ${e.text}`, when: rel(e.time), target: e.target, level: e.level });
  return [...t, ...l];
}

/* ---------------- delivery JSON (what the public API serves) ---------------- */
export async function pageDeliveryJson(marketId: string, path: string, host: string) {
  const v = await repo().getPage(path); if (!v) return undefined;
  const [assets, forms, templates] = await Promise.all([listAssets(marketId), listForms(), listTemplates()]);
  const route = path.replace(PATHS.content(marketId), "") || "/";
  const ents = await resolveBindings(bindingsOf(v.meta), true); const { resolveTokens } = await import("@/lib/ucp/tokens");
  v.components = v.components.map((c) => ({ ...c, props: Object.fromEntries(Object.entries(c.props).map(([k, val]) => [k, typeof val === "string" ? resolveTokens(val, ents) : val])) }));
  const blocks = v.components.map((c) => { const props: NodeProps = {}; for (const [k, val] of Object.entries(c.props)) { if (k === "ucp:id") continue; if (k === "image" && typeof val === "string") { const a = assets.find((x) => x.id === val); props[k] = a ? { id: a.id, name: a.name, url: `/v1/assets/${a.id}/original`, renditions: { hero: `/v1/assets/${a.id}/hero`, card: `/v1/assets/${a.id}/card` } } : null; } else if (k === "form" && typeof val === "string") { const f = forms.find((x) => x.id === val); props[k] = f ? { id: f.id, name: f.name, version: f.version, embed: `forms://${marketId}/${f.id}/v${f.version}` } : null; } else if (typeof val === "string" && val.includes("|") && val.includes("\n")) props[k] = val.split("\n").map((r) => r.split("|").map((x) => x.trim())); else props[k] = val; } return { id: c.props["ucp:id"] ?? c.name, type: c.resourceType.split("/").pop(), resourceType: c.resourceType, props }; });
  return { id: v.path, route, market: marketId.toUpperCase(), language: v.locale ?? "en-GB", title: v.title, status: v.status, template: v.template, templateName: templates.find((t) => t.id === v.template)?.name, updatedAt: v.lastModified, updatedBy: v.lastModifiedBy, blocks, meta: { canonical: `https://${host}${route}`, index: true, description: v.description ?? "" }, _links: { self: `/v1/pages${route}`, preview: `/v1/preview/pages${route}`, schema: "/v1/models/page", repository: v.path } };
}
export { modelSchema } from "@/lib/ucp/schema";

/* ---------------- versions: snapshots under <page>/jcr:content/ucp:versions/<id> (last 20) ---------------- */
export type PageVersion = { id: string; time: string; who: string; note: string; title: string; status: string; blocks: number };
const VER = (path: string) => `${path}/jcr:content/ucp:versions`;
/* ---------------- page comments: a thread on the page's history; pinned ones stay on top ---------------- */
export type PageComment = { id: string; who: string; whoName: string; time: string; text: string; pinned?: boolean; pinnedBy?: string; version?: { id: string; label: string }; stage?: string; guest?: boolean };
const readComments = async (path: string): Promise<PageComment[]> => { const pg = await repo().getPage(path); if (!pg) throw new RepoError(404, "Page not found", path); return json<PageComment[]>(pg.meta?.["ucp:comments"], []); };
const writeComments = (path: string, list: PageComment[]) => repo().setProps(`${path}/jcr:content`, { "ucp:comments": JSON.stringify(list) });
/** Pinned first (latest pin on top), then newest first. */
export const sortComments = (l: PageComment[]) => l.slice().sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.time.localeCompare(a.time));
export async function listComments(path: string): Promise<PageComment[]> { return sortComments(await readComments(path)); }
export async function addComment(path: string, u: Pick<User, "id" | "name">, text: string, version?: { id: string; label: string }, extra: { stage?: string; guest?: boolean } = {}): Promise<PageComment[]> {
  const t = text.trim(); if (!t) throw new RepoError(400, "Write a comment first"); if (t.length > 2000) throw new RepoError(400, "Keep comments under 2,000 characters");
  const list = await readComments(path); list.push({ id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, who: u.id, whoName: u.name, time: new Date().toISOString(), text: t, version: version?.id ? { id: version.id, label: String(version.label ?? "").slice(0, 80) } : undefined, ...extra });
  await writeComments(path, list); return sortComments(list);
}
export async function setCommentPin(path: string, u: User, id: string, pinned: boolean): Promise<PageComment[]> {
  const list = await readComments(path); const c = list.find((x) => x.id === id); if (!c) throw new RepoError(404, "Comment not found");
  c.pinned = pinned || undefined; c.pinnedBy = pinned ? u.id : undefined; await writeComments(path, list); return sortComments(list);
}
export async function deleteComment(path: string, u: User, id: string, admin: boolean): Promise<PageComment[]> {
  const list = await readComments(path); const c = list.find((x) => x.id === id); if (!c) throw new RepoError(404, "Comment not found");
  if (c.who !== u.id && !admin) throw new RepoError(403, "You can only delete your own comments");
  const next = list.filter((x) => x.id !== id); await writeComments(path, next); return sortComments(next);
}
/* ---------------- review links: send a page in review to someone by link or e-mail ---------------- */
export type ReviewLink = { token: string; stage: "review" | "bizreview"; email?: string; by: string; at: string };
export const STAGE_LABEL: Record<string, string> = { review: "Author's review", bizreview: "Business review" };
/**
 * A link for the current review stage. The link opens a review screen (preview + comments) and stops working when the stage is over.
 * With an e-mail of a UCP user who may review the page, that person is also assigned, so the task shows up in their My tasks.
 */
export async function createReviewLink(marketId: string, path: string, u: User, email?: string): Promise<{ token: string; stage: string; assigned?: string; created: boolean }> {
  const pg = await repo().getPage(path); if (!pg) throw new RepoError(404, "Page not found", path);
  if (pg.status !== "review" && pg.status !== "inreview" && pg.status !== "bizreview") throw new RepoError(409, "Send the page for review first");
  const stage: "review" | "bizreview" = pg.status === "bizreview" ? "bizreview" : "review";
  const mail = email?.trim().toLowerCase() || undefined; if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) throw new RepoError(400, "That e-mail address does not look right");
  const links = json<ReviewLink[]>(pg.meta?.["ucp:reviewLinks"], []);
  const reuse = links.find((l) => l.stage === stage && (l.email ?? "") === (mail ?? ""));
  const link: ReviewLink = reuse ?? { token: crypto.randomUUID().replace(/-/g, ""), stage, email: mail, by: u.id, at: new Date().toISOString() };
  const props: NodeProps = { "ucp:reviewLinks": JSON.stringify(reuse ? links : [...links, link]) }; let assigned: string | undefined;
  const person = mail ? (await listUsers()).find((x) => x.email.toLowerCase() === mail) : undefined;
  if (person && can(person, "review", path, marketOf(marketId).root)) {
    if (stage === "review") props["ucp:assignee"] = person.id; else { props["ucp:taskAssignee"] = person.id; props["ucp:taskKind"] = "BizReview"; }
    props["ucp:assignedBy"] = u.id; assigned = person.name;
  }
  await repo().setProps(`${path}/jcr:content`, props);
  return { token: link.token, stage: link.stage, assigned, created: !reuse };
}
/** Find the page a review link belongs to (any market). `open` is false once the page left that review stage. */
export async function reviewByToken(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return undefined;
  for (const m of MARKETS) for (const p of await allPages(m.root)) {
    const l = json<ReviewLink[]>(p.meta?.["ucp:reviewLinks"], []).find((x) => x.token === token);
    if (l) { const page = await repo().getPage(p.path); if (!page) return undefined; return { marketId: m.id, market: m, page, link: l, open: (page.status === "inreview" ? "review" : page.status) === l.stage }; }
  }
  return undefined;
}
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
  if (patch.fields) { const all = await listModels(); const own = { fields: patch.fields };
    for (const f of patch.fields) { const to = f.validation?.referenceModel; if (!to || cur.fields.some((o) => o.k === f.k && o.validation?.referenceModel === to)) continue;
      const target = to === id ? own : all.find((m) => m.id === to); if (!target) throw new RepoError(400, "The connected model does not exist", to);
      if (to !== id && !sharedFields(own, target).length) throw new RepoError(400, `${cur.name} and ${all.find((m) => m.id === to)?.name ?? to} have no fields in common`, "Models can only be connected when they share at least one field (same key and type)."); } }
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

/** Renumber a folder so `id` lands before `before` (or last). Returns the new id order. */
function placeIn(ids: string[], id: string, before?: string): string[] { const r = ids.filter((x) => x !== id); const at = before ? r.indexOf(before) : -1; r.splice(at < 0 ? r.length : at, 0, id); return r; }
/** Move a model to another category and/or position. Organising only: the schema, version and status stay as they are. */
export async function moveModel(id: string, to: { group?: string; before?: string }, who: string): Promise<Model> {
  const all = await listModels(); const cur = all.find((m) => m.id === id); if (!cur || cur.locked) throw new RepoError(cur ? 403 : 404, cur ? "Block-type models cannot be moved" : "Model not found", id);
  const group = (to.group ?? cur.group).trim() || cur.group; if (group === "Block types") throw new RepoError(400, "“Block types” is reserved for page blocks");
  const siblings = all.filter((m) => !m.locked && m.group === group && m.id !== id).sort(byOrder).map((m) => m.id);
  const order = placeIn(siblings, id, to.before && siblings.includes(to.before) ? to.before : undefined);
  for (const [i, mid] of order.entries()) await repo().setProps(`${PATHS.models}/${mid}`, mid === id ? { "ucp:group": group, "ucp:order": i, "cq:lastModified": new Date().toISOString(), "cq:lastModifiedBy": who } : { "ucp:order": i });
  return (await listModels()).find((m) => m.id === id)!;
}

/* ---------------- content entities: /content/entities/<market>/<model>/<entity> ---------------- */
const toEntity = (n: RepoNode): Entity => { const pub = n.properties["ucp:publishedValues"]; return { id: n.name, path: n.path, model: n.path.split("/").slice(-2, -1)[0], title: str(n.properties["jcr:title"], n.name), status: (str(n.properties["ucp:status"]) as Entity["status"]) || "draft", values: json<EntityValues>(n.properties["ucp:values"], {}), publishedValues: pub !== undefined ? json<EntityValues>(pub, {}) : undefined, lastModified: str(n.properties["cq:lastModified"]) || str(n.properties["jcr:created"]) || undefined, lastModifiedBy: str(n.properties["cq:lastModifiedBy"]) || undefined, order: num(n.properties["ucp:order"]), folder: str(n.properties["ucp:folder"]) || undefined }; };
export async function listEntities(marketId: string, model?: string): Promise<Entity[]> {
  const models = model ? [model] : (await kids(PATHS.entities(marketId), 1)).map((n) => n.name);
  const out: Entity[] = []; for (const m of models) out.push(...(await kids(`${PATHS.entities(marketId)}/${m}`, 1)).map(toEntity)); return out.sort(byOrder);
}
export async function getEntity(path: string): Promise<Entity | undefined> { const n = await repo().getNode(path, 0).catch(() => undefined); return n ? toEntity(n) : undefined; }
export async function createEntity(marketId: string, model: string, title: string, values: EntityValues, who: string, folder = ""): Promise<Entity> {
  const base = `${PATHS.entities(marketId)}/${model}`; if (!(await repo().getNode(base, 0))) await repo().createNode(base, "sling:Folder", { "jcr:title": model });
  let id = slug(title) || "item"; let i = 2; while (await repo().getNode(`${base}/${id}`, 0)) id = `${slug(title)}-${i++}`;
  const n = await repo().createNode(`${base}/${id}`, "nt:unstructured", { "jcr:title": title, "ucp:model": model, "ucp:status": "draft", "ucp:values": JSON.stringify(values), "ucp:folder": folder, "cq:lastModified": new Date().toISOString(), "cq:lastModifiedBy": who });
  return toEntity(n);
}
export async function saveEntity(path: string, patch: { title?: string; values?: EntityValues }, who: string): Promise<Entity> {
  const cur = await getEntity(path); if (!cur) throw new RepoError(404, "Entity not found", path);
  const props: NodeProps = { "cq:lastModified": new Date().toISOString(), "cq:lastModifiedBy": who, "ucp:status": cur.publishedValues ? "modified" : "draft" };
  if (patch.title !== undefined) props["jcr:title"] = patch.title; if (patch.values) props["ucp:values"] = JSON.stringify(patch.values);
  await repo().setProps(path, props); return (await getEntity(path))!;
}
export async function publishEntity(path: string, who: string): Promise<Entity> { const cur = await getEntity(path); if (!cur) throw new RepoError(404, "Entity not found", path); await repo().setProps(path, { "ucp:publishedValues": JSON.stringify(cur.values), "ucp:status": "published", "cq:lastModified": new Date().toISOString(), "cq:lastModifiedBy": who }); return (await getEntity(path))!; }
/** Move an entity to another model folder and/or position. Pages that bind it are re-pointed to the new path; values are kept as they are. */
export async function moveEntity(marketId: string, path: string, to: { model?: string; before?: string; folder?: string }, who: string): Promise<{ entity: Entity; rebound: number; missing: string[] }> {
  const cur = await getEntity(path); if (!cur) throw new RepoError(404, "Entity not found", path);
  const model = to.model || cur.model; let dest = path; let rebound = 0; let missing: string[] = [];
  if (model !== cur.model) {
    const md = await getModel(model); if (!md || md.locked) throw new RepoError(400, "Pick a content model to move it to", model);
    missing = Object.keys(cur.values).filter((k) => !md.fields.some((f) => f.k === k));
    const base = `${PATHS.entities(marketId)}/${model}`; if (!(await repo().getNode(base, 0))) await repo().createNode(base, "sling:Folder", { "jcr:title": model });
    let id = cur.id; let i = 2; while (await repo().getNode(`${base}/${id}`, 0)) id = `${cur.id}-${i++}`;
    dest = `${base}/${id}`; await repo().moveNode(path, dest);
    await repo().setProps(dest, { "ucp:model": model, "cq:lastModified": new Date().toISOString(), "cq:lastModifiedBy": who });
    for (const p of (await entityUsage(marketId))[path] ?? []) { const b = bindingsOf(p.meta); for (const k of Object.keys(b)) if (b[k] === path) b[k] = dest; await repo().setProps(`${p.path}/jcr:content`, { "ucp:bindings": JSON.stringify(b) }); rebound++; }
  }
  const folder = to.folder !== undefined ? to.folder : model !== cur.model ? "" : cur.folder ?? "";
  if (folder && !(await listEntityFolders(marketId))[model]?.includes(folder)) throw new RepoError(400, "That folder does not exist", folder);
  await repo().setProps(dest, { "ucp:folder": folder });
  const siblings = (await listEntities(marketId, model)).filter((e) => e.path !== dest && (e.folder ?? "") === folder).map((e) => e.path);
  const order = placeIn(siblings, dest, to.before && siblings.includes(to.before) ? to.before : undefined);
  for (const [i, ep] of order.entries()) await repo().setProps(ep, { "ucp:order": i });
  return { entity: (await getEntity(dest))!, rebound, missing };
}
/* ---------------- folders: content-model categories and entity folders (stored as JSON lists on the parent node) ---------------- */
const clean = (n: string) => n.replace(/\s+/g, " ").trim().slice(0, 60);
const readList = async (path: string): Promise<string[]> => { const n = await repo().getNode(path, 0).catch(() => undefined); return n ? json<string[]>(n.properties["ucp:folders"], []) : []; };
/** Model folders: saved folders plus every category a model already uses. */
export async function listModelFolders(): Promise<string[]> { const saved = await readList(PATHS.models); const used = (await listModels()).map((m) => m.group); return [...new Set(["Core", ...saved, ...used])]; }
export async function createModelFolder(name: string): Promise<string[]> {
  const n = clean(name); if (!n) throw new RepoError(400, "Give the folder a name"); const all = await listModelFolders(); if (all.some((x) => x.toLowerCase() === n.toLowerCase())) throw new RepoError(409, "A folder with this name already exists", n);
  await repo().setProps(PATHS.models, { "ucp:folders": JSON.stringify([...(await readList(PATHS.models)), n]) }); return listModelFolders();
}
export async function renameModelFolder(from: string, to: string, who: string): Promise<string[]> {
  const n = clean(to); if (!n) throw new RepoError(400, "Give the folder a name"); if (n !== from && (await listModelFolders()).some((x) => x.toLowerCase() === n.toLowerCase())) throw new RepoError(409, "A folder with this name already exists", n);
  await repo().setProps(PATHS.models, { "ucp:folders": JSON.stringify([...new Set((await readList(PATHS.models)).map((x) => (x === from ? n : x)).concat(n))]) });
  for (const m of (await listModels()).filter((m) => m.group === from)) await repo().setProps(`${PATHS.models}/${m.id}`, { "ucp:group": n, "cq:lastModified": new Date().toISOString(), "cq:lastModifiedBy": who });
  return listModelFolders();
}
export async function deleteModelFolder(name: string): Promise<string[]> {
  const inside = (await listModels()).filter((m) => m.group === name).length; if (inside) throw new RepoError(409, `The folder still has ${inside} model${inside === 1 ? "" : "s"}`, "Move them to another folder first");
  await repo().setProps(PATHS.models, { "ucp:folders": JSON.stringify((await readList(PATHS.models)).filter((x) => x !== name)) }); return listModelFolders();
}
/** Entity folders per model: { product: ["Savings", "Cards"] }. */
export async function listEntityFolders(marketId: string): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {}; for (const n of await kids(PATHS.entities(marketId), 1)) { const l = json<string[]>(n.properties["ucp:folders"], []); if (l.length) out[n.name] = l; } return out;
}
async function entityModelNode(marketId: string, model: string) { const base = `${PATHS.entities(marketId)}/${model}`; if (!(await repo().getNode(base, 0))) await repo().createNode(base, "sling:Folder", { "jcr:title": model }); return base; }
export async function createEntityFolder(marketId: string, model: string, name: string): Promise<string[]> {
  if (!(await getModel(model))) throw new RepoError(404, "Model not found", model);
  const n = clean(name); if (!n) throw new RepoError(400, "Give the folder a name"); const base = await entityModelNode(marketId, model); const cur = await readList(base);
  if (cur.some((x) => x.toLowerCase() === n.toLowerCase())) throw new RepoError(409, "A folder with this name already exists", n);
  await repo().setProps(base, { "ucp:folders": JSON.stringify([...cur, n]) }); return [...cur, n];
}
export async function renameEntityFolder(marketId: string, model: string, from: string, to: string): Promise<string[]> {
  const n = clean(to); if (!n) throw new RepoError(400, "Give the folder a name"); const base = await entityModelNode(marketId, model); const cur = await readList(base);
  if (n !== from && cur.some((x) => x.toLowerCase() === n.toLowerCase())) throw new RepoError(409, "A folder with this name already exists", n);
  const next = cur.map((x) => (x === from ? n : x)); await repo().setProps(base, { "ucp:folders": JSON.stringify(next) });
  for (const e of (await listEntities(marketId, model)).filter((e) => e.folder === from)) await repo().setProps(e.path, { "ucp:folder": n }); return next;
}
export async function deleteEntityFolder(marketId: string, model: string, name: string): Promise<string[]> {
  const inside = (await listEntities(marketId, model)).filter((e) => e.folder === name).length; if (inside) throw new RepoError(409, `The folder still has ${inside} entit${inside === 1 ? "y" : "ies"}`, "Move them out first");
  const base = await entityModelNode(marketId, model); const next = (await readList(base)).filter((x) => x !== name); await repo().setProps(base, { "ucp:folders": JSON.stringify(next) }); return next;
}
export async function deleteEntity(path: string): Promise<void> { await repo().deleteNode(path); }
/** Which pages bind which entity (via ucp:bindings on jcr:content). */
export async function entityUsage(marketId: string, all?: PageSummary[]): Promise<Record<string, PageSummary[]>> {
  const pages = (all ?? await allPages(PATHS.content(marketId))).filter((p) => !p.isFolder); const out: Record<string, PageSummary[]> = {};
  for (const p of pages) for (const path of Object.values(bindingsOf(p.meta))) (out[path] ??= []).push(p); return out;
}
/** Resolve a page's bindings to entity values. `published` = what visitors see (published values), otherwise the latest draft. */
export async function resolveBindings(b: Bindings, published = false): Promise<ResolvedEntities> {
  const out: ResolvedEntities = {}; for (const [alias, path] of Object.entries(b)) { const e = await getEntity(path); if (e) out[alias] = { title: e.title, path, values: published ? (e.publishedValues ?? e.values) : e.values }; } return out;
}

/* ---------------- review assignment ---------------- */
export async function reviewerOptions(marketId: string, pagePath: string, perm: "review" | "publish" = "review"): Promise<ReviewerOption[]> {
  const [users, pages] = await Promise.all([listUsers(), allPages(PATHS.content(marketId))]); const root = marketOf(marketId).root;
  const active = (id: string) => pages.filter((p) => ((p.status === "review" || p.status === "inreview") && str(p.meta?.["ucp:assignee"]) === id) || (p.status !== "review" && p.status !== "inreview" && str(p.meta?.["ucp:taskAssignee"]) === id && str(p.meta?.["ucp:taskKind"]) === KIND_OF_STATUS[p.status])).length;
  return users.filter((u) => can(u, perm, pagePath, root)).map((u) => ({ id: u.id, name: u.name, team: u.team, activeReviews: active(u.id) })).sort((a, b) => a.activeReviews - b.activeReviews || a.name.localeCompare(b.name));
}
/** Which task a page status stands for (tasks other than Review keep their assignee in ucp:taskAssignee + ucp:taskKind). */
export const KIND_OF_STATUS: Record<string, TaskKind> = { review: "Review", inreview: "Review", bizreview: "BizReview", approved: "Publish", failed: "Fix", scheduled: "Check" };
/** The permission someone needs to take a task of this kind. */
export const permOfKind = (k: TaskKind): "review" | "publish" => (k === "Review" || k === "BizReview" ? "review" : "publish");
/** Assignee of a non-review task, only while the page is still in the state that created it. */
const taskAssignee = (p: PageSummary, kind: TaskKind) => (kind !== "Review" && str(p.meta?.["ucp:taskKind"]) === kind ? str(p.meta?.["ucp:taskAssignee"]) : "");
/** Pick the reviewer with the fewest active reviews (never the sender when someone else is available). */
export async function autoAssignee(marketId: string, pagePath: string, senderId: string): Promise<ReviewerOption | undefined> { const opts = await reviewerOptions(marketId, pagePath); return opts.find((o) => o.id !== senderId) ?? opts[0]; }

/* ---------------- publishing: now or at a date, one page or many ---------------- */
export type PublishResult = { path: string; title: string; ok: boolean; status?: string; reason?: string };
const PUBLISHABLE = ["approved", "scheduled"];
/**
 * Publish pages now (`at` empty or in the past) or schedule them for `at`. Only approved or already scheduled pages
 * can go live, and the person needs Publish on each page. Every page is handled on its own; the result says why one was skipped.
 */
export async function publishPages(marketId: string, paths: string[], opts: { at?: string; cancel?: boolean }, u: User): Promise<PublishResult[]> {
  const mk = marketOf(marketId); const now = new Date(); const at = opts.at ? new Date(opts.at) : undefined;
  if (at && isNaN(at.getTime())) throw new RepoError(400, "That date is not valid", opts.at);
  const schedule = !!at && at.getTime() > now.getTime() + 60_000; const out: PublishResult[] = [];
  for (const path of [...new Set(paths)]) {
    const pg = await repo().getPage(path).catch(() => undefined);
    if (!pg) { out.push({ path, title: path, ok: false, reason: "Page not found" }); continue; }
    const r = { path, title: pg.title };
    if (!can(u, "publish", path, mk.root)) { out.push({ ...r, ok: false, reason: "You don't have Publish on this page" }); continue; }
    if (opts.cancel) {
      if (pg.status !== "scheduled") { out.push({ ...r, ok: false, reason: "Not scheduled" }); continue; }
      await repo().updateContent(path, { status: "approved" }); await repo().setProps(`${path}/jcr:content`, { "ucp:publishAt": null });
      await logEvent(marketId, { type: "publishing", who: u.id, text: `cancelled the scheduled publish of ${pg.title}`, target: path }); out.push({ ...r, ok: true, status: "approved" }); continue;
    }
    if (!PUBLISHABLE.includes(pg.status)) { out.push({ ...r, ok: false, reason: pg.status === "published" ? "Already live" : pg.status === "review" || pg.status === "inreview" ? "Still in author's review" : pg.status === "reviewed" ? "Business review comes next" : pg.status === "bizreview" ? "Still in business review" : "Needs approval first" }); continue; }
    const stamp = new Date().toISOString();
    if (schedule) {
      await snapshotVersion(path, "before: scheduled for publishing", u.id);
      await repo().updateContent(path, { status: "scheduled" }); await repo().setProps(`${path}/jcr:content`, { "ucp:publishAt": at!.toISOString(), "ucp:sentBy": u.id, "ucp:sentAt": stamp, "ucp:due": null });
      await logEvent(marketId, { type: "publishing", who: u.id, text: `scheduled ${pg.title} for ${at!.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" })}`, target: path });
      out.push({ ...r, ok: true, status: "scheduled" });
    } else {
      await snapshotVersion(path, "before: published", u.id);
      await repo().updateContent(path, { status: "published" }); await repo().setProps(`${path}/jcr:content`, { "ucp:publishAt": null, "ucp:publishedAt": stamp, "ucp:publishedBy": u.id, "ucp:sentBy": u.id, "ucp:sentAt": stamp, "ucp:due": null });
      await logEvent(marketId, { type: "publishing", who: u.id, text: `published ${pg.title}`, target: path });
      out.push({ ...r, ok: true, status: "published" });
    }
  }
  return out;
}
/** Scheduled pages whose time has come go live. Called when CMS screens load (a real backend would run this as a job). */
export async function publishDue(marketId: string): Promise<number> {
  const mk = marketOf(marketId); const now = Date.now(); let n = 0;
  for (const p of await allPages(mk.root).catch(() => [])) {
    const at = typeof p.meta?.["ucp:publishAt"] === "string" ? Date.parse(String(p.meta["ucp:publishAt"])) : NaN;
    if (p.status !== "scheduled" || isNaN(at) || at > now) continue;
    await repo().updateContent(p.path, { status: "published" }); await repo().setProps(`${p.path}/jcr:content`, { "ucp:publishAt": null, "ucp:publishedAt": new Date().toISOString(), "ucp:publishedBy": "system" });
    await logEvent(marketId, { type: "publishing", who: "system", text: `published ${p.title} (scheduled)`, target: p.path }); n++;
  }
  return n;
}
