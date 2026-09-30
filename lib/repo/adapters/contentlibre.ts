import "server-only";
import { pageToNode } from "../mapping";
import type { ContentRepository, PageView, PageSummary, PageStatus, RepoNode, NodeProps } from "../types";
import { RepoError } from "../types";
import { clApi, clSlingJsonOrNone, clSlingPost, clSlingPostMultipart, type ClIdentity, type ClPage, type ClPageList } from "@/lib/server/contentlibre";

/**
 * Adapter for ContentLIBRE. Calls run as the signed-in person (see lib/server/contentlibre.ts).
 *
 * Pages go through the Management API (content-v1 / identity-v1, docs/API-DESIGN.md §10 in the backend):
 *  - read, list, create from a template, delete, move; drafts and publishing are the builder's (app/api/cl).
 *  - Status: `published` / `draft` map directly, `modified` (live, with an open draft) is its own status here, and
 *    `unpublished` reads as `draft`. The review is the open draft's: `review` while it waits, then the CMS's own
 *    stages past it (`inreview`, `reviewed`, `bizreview`, kept beside the page), `approved` once the backend approved.
 *  - Beside a page: what the CMS keeps that is not the page's payload - comments, locks, the review stage, review
 *    links and groups - lives at /var/ucp/pages<page path> (`ucp-frontend.json`). A `ucp:*` write to a page's
 *    jcr:content goes there, and reading a page merges it back; what the backend knows (who asked, who reviews, when,
 *    the schedule) always wins over a copy kept beside it.
 *  - A ContentLIBRE page may have child pages. It stays a page (counted, opened in the builder) and carries
 *    `hasChildren` so the explorer can also open it as a level of the tree.
 *
 * Everything else the CMS stores - content models, templates, forms, content entities, assets, audit events - is a
 * plain node, read and written with Sling's own contracts (`.N.json`, Sling POST) under the roots the backend's
 * `ucp-frontend.json` creates. The front end keeps its logical paths; STORAGE maps them to where they live, and the
 * backend's ACLs decide who may write (models and templates: administrators; the audit trail: append-only).
 */
const notYet = (what: string) => new RepoError(501, "Not supported by the ContentLIBRE backend yet", what);

/** Logical root (as the front end names it) → storage root in ContentLIBRE. Nothing outside these is reachable as a node. */
const STORAGE: [logical: string, storage: string][] = [
  ["/conf/hsbc", "/conf/ucp"],
  ["/content/entities", "/var/ucp/entities"],
  ["/var/audit/ucp", "/var/ucp/audit"],
  ["/content/dam", "/content/dam"],
];
const under = (path: string, root: string) => path === root || path.startsWith(root + "/");

/* ---------------- beside the page ---------------- */
const SIDECAR = "/var/ucp/pages";
const sidecarOf = (page: string) => SIDECAR + page;
type Side = Record<string, unknown>;
/** The CMS's own properties of a sidecar node: `ucp:*` values, never its child nodes. */
const sideProps = (json: Record<string, unknown> | undefined): Side =>
  Object.fromEntries(Object.entries(json ?? {}).filter(([k, v]) => k.startsWith("ucp:") && (v === null || typeof v !== "object" || Array.isArray(v))));
const readSidecar = async (page: string): Promise<Side> => sideProps(await clSlingJsonOrNone<Record<string, unknown>>(`${sidecarOf(page)}.json`).catch(() => undefined));
/** The sidecars of a page's children, keyed by page path, in one read. */
async function readSidecars(parent: string): Promise<Record<string, Side>> {
  const j = await clSlingJsonOrNone<Record<string, unknown>>(`${sidecarOf(parent)}.1.json`).catch(() => undefined);
  const out: Record<string, Side> = {};
  for (const [k, v] of Object.entries(j ?? {})) if (v && typeof v === "object" && !Array.isArray(v)) out[`${parent}/${k}`] = sideProps(v as Record<string, unknown>);
  return out;
}
async function writeSidecar(page: string, props: NodeProps) {
  const form = toForm(Object.fromEntries(Object.entries(props).filter(([k]) => k.startsWith("ucp:"))));
  if (form.length) await clSlingPost(sidecarOf(page), form);
}
/** `<page>/jcr:content` of a site page → the page; anything the CMS stores itself → undefined. */
const pageOfContent = (path: string) => (!toStorage(path) && path.endsWith("/jcr:content") ? path.slice(0, -"/jcr:content".length) : undefined);

/* ---------------- the review, past the draft's own states ---------------- */
type Drafts = { open: { id: string; review?: ClPage["review"] }[] };
const STAGES = ["inreview", "reviewed", "bizreview"] as const;
/** The CMS stage of the review now open, when the one recorded beside the page is for this request (not an older one). */
function stageOf(p: ClPage, side: Side): PageStatus | undefined {
  const raw = side["ucp:reviewStage"]; if (typeof raw !== "string" || !p.review?.requestedAt) return undefined;
  try { const s = JSON.parse(raw) as { stage?: string; for?: string }; return s.for === p.review.requestedAt && (STAGES as readonly string[]).includes(s.stage ?? "") ? (s.stage as PageStatus) : undefined; } catch { return undefined; }
}
/**
 * A status change asked for by the CMS's workflow, made where it belongs: sending for review, approving and sending back
 * are the backend's decisions on the open draft (it checks who may); the stages in between are the CMS's and are kept
 * beside the page, stamped with the request they belong to.
 */
async function transition(path: string, to: PageStatus): Promise<void> {
  const d = await clApi<Drafts>("GET", "content/v1/drafts", { path });
  const draft = d.open.find((x) => x.review?.state === "IN_REVIEW") ?? d.open[0];
  const inReview = draft?.review?.state === "IN_REVIEW";
  const stage = (s: PageStatus | null) => writeSidecar(path, { "ucp:reviewStage": s && draft?.review?.requestedAt ? JSON.stringify({ stage: s, for: draft.review.requestedAt }) : null });
  const decide = (decision: "approve" | "request-changes", comment?: string) => clApi("POST", "content/v1/drafts/decision", { path }, { draft: draft!.id, decision, comment });
  switch (to) {
    case "review":
      if (inReview) return stage(null);
      if (!draft) throw new RepoError(409, "There is no draft to review", "Edit the page to open a draft, then send it for review");
      await clApi("POST", "content/v1/drafts/review", { path }, { draft: draft.id }); return;
    case "inreview": case "reviewed": case "bizreview":
      if (!inReview) throw new RepoError(409, "The page is not in review", "Send it for review first");
      return stage(to);
    case "approved":
      if (draft?.review?.state === "APPROVED") return;
      if (!inReview) throw new RepoError(409, "The page is not in review", "Send it for review first");
      await decide("approve"); return stage(null);
    case "draft":
      if (!inReview) return;
      await decide("request-changes", "Sent back to the author."); return stage(null);
    default:
      throw notYet(`status ${to}: publication goes through drafts (Publish)`);
  }
}
const toStorage = (path: string): string | undefined => { for (const [l, s] of STORAGE) if (under(path, l)) return s + path.slice(l.length); return undefined; };
const requireStorage = (path: string): string => {
  const s = toStorage(path);
  if (!s || path.split("/").some((seg) => seg === ".." || seg === ".")) throw notYet(`${path}: not a node this CMS stores on ContentLIBRE`);
  return s;
};

/**
 * AEM node types the front end's data model uses and this repository does not register. Stored as nt:unstructured
 * with the intended type in `ucp:primaryType`, and reported back as that type, so the domain code is unchanged.
 */
const AEM_TYPES = new Set(["dam:Asset", "cq:Template", "cq:Page", "cq:PageContent"]);
const TYPE_PROP = "ucp:primaryType";

/** Sling JSON → RepoNode, under the LOGICAL path. Sling nests children as object-valued keys beside the properties. */
function fromSling(path: string, json: Record<string, unknown>): RepoNode {
  const properties: NodeProps = {}; const children: RepoNode[] = [];
  for (const [k, v] of Object.entries(json)) {
    if (v && typeof v === "object" && !Array.isArray(v)) children.push(fromSling(`${path}/${k}`, v as Record<string, unknown>)); else properties[k] = v;
  }
  const primaryType = String(properties[TYPE_PROP] ?? properties["jcr:primaryType"] ?? "nt:unstructured");
  return { path, name: path.split("/").pop()!, primaryType, properties, children: children.length ? children : undefined };
}

/** Properties as Sling POST form entries: numbers and booleans keep their JCR type, objects travel as JSON text, null removes. */
function toForm(props: NodeProps): [string, string][] {
  const form: [string, string][] = [];
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue;
    if (v === null) { form.push([`${k}@Delete`, ""]); continue; }
    if (typeof v === "boolean") form.push([`${k}@TypeHint`, "Boolean"], [k, String(v)]);
    else if (typeof v === "number") form.push([`${k}@TypeHint`, Number.isInteger(v) ? "Long" : "Double"], [k, String(v)]);
    else form.push([k, typeof v === "string" ? v : JSON.stringify(v)]);
  }
  return form;
}

async function readNode(path: string, depth: number): Promise<RepoNode | undefined> {
  const json = await clSlingJsonOrNone<Record<string, unknown>>(`${requireStorage(path)}.${Math.max(0, Math.min(depth, 6))}.json`);
  return json && fromSling(path, json);
}
async function mustRead(path: string, depth: number): Promise<RepoNode> {
  const n = await readNode(path, depth);
  if (!n) throw new RepoError(404, "Not found", path);
  return n;
}

const STATUS: Record<NonNullable<ClPage["status"]>, PageStatus> = { published: "published", modified: "modified", draft: "draft", unpublished: "draft" };

/**
 * The review of the newest open draft decides the workflow status the CMS shows: waiting → `review`, approved at the
 * current revision → `approved`. Changes requested, or an approval the draft has outgrown, fall back to the
 * publication status - the draft needs work again - and say why in `libre:reviewState`.
 */
function statusOf(p: ClPage, side: Side = {}): PageStatus {
  // A schedule outranks the review it was made on; a failed one is what the author has to act on.
  if (p.schedule?.failed) return "failed";
  if (p.schedule?.publishAt) return "scheduled";
  // The draft's review; past "waiting" the stage is the CMS's (started, reviewed by the author, in business review).
  if (p.review?.state === "IN_REVIEW") return stageOf(p, side) ?? "review";
  if (p.review?.state === "APPROVED") return "approved";
  return p.status ? STATUS[p.status] : "draft";
}

/** What the backend owns is read from the backend only - a copy kept beside the page never stands in for it. */
const OWNED = new Set(["ucp:sentBy", "ucp:requestedBy", "ucp:sentAt", "ucp:assignee", "ucp:assignedBy", "ucp:due", "ucp:remindedAt", "ucp:remindedBy", "ucp:approvedBy", "ucp:publishAt"]);
const ownOnly = (side: Side) => Object.fromEntries(Object.entries(side).filter(([k]) => !OWNED.has(k)));
const defined = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const toView = (p: ClPage, side: Side = {}): PageView => ({
  path: p.path, name: p.name, title: p.title ?? p.name, description: p.description, navTitle: p.navTitle, hideInNav: p.hideInNav,
  template: p.template?.split("/").pop(), locale: p.locale, status: statusOf(p, side),
  created: p.created, lastModified: p.lastModified,
  meta: { ...ownOnly(side), ...defined({
    "libre:status": p.status, "libre:template": p.template, "libre:publishedAt": p.publishedAt, "libre:publishedBy": p.publishedBy,
    "libre:openDrafts": p.openDrafts, "libre:permissions": p.permissions,
    // The workflow fields the CMS's task list reads (lib/server/ucp.ts listTasks), from the backend's review.
    "libre:reviewState": p.review?.state, "libre:reviewDecidedBy": p.review?.decidedBy, "libre:reviewComment": p.review?.comment,
    "ucp:sentBy": p.review?.requestedBy, "ucp:requestedBy": p.review?.requestedBy, "ucp:sentAt": p.review?.requestedAt, "ucp:assignee": p.review?.assignee, "ucp:due": p.review?.due,
    "ucp:remindedAt": p.review?.remindedAt, "ucp:remindedBy": p.review?.remindedBy, "ucp:approvedBy": p.review?.decidedBy,
    "ucp:publishAt": p.schedule?.publishAt, "libre:scheduledBy": p.schedule?.scheduledBy, "libre:scheduleFailed": p.schedule?.failed,
  }) },
  components: [],
});
const toSummary = (p: ClPage, side: Side = {}): PageSummary => { const { components, ...rest } = toView(p, side); void components; return { ...rest, isFolder: false, hasChildren: !!p.hasChildren }; };

export const contentLibreRepo: ContentRepository = {
  kind: "contentlibre",
  identity: async () => { const me = await clApi<ClIdentity>("GET", "identity/v1/me"); return { id: me.id, authType: me.authType ?? "", groups: me.groups, administrator: !!me.administrator }; },
  getNode: async (path, depth = 1) => {
    if (toStorage(path)) return readNode(path, depth);
    const p = await contentLibreRepo.getPage(path); return p && pageToNode(p);
  },
  createNode: async (path, primaryType, props = {}) => {
    const storage = requireStorage(path);
    const type: [string, string][] = AEM_TYPES.has(primaryType) ? [["jcr:primaryType", "nt:unstructured"], [TYPE_PROP, primaryType]] : [["jcr:primaryType", primaryType]];
    await clSlingPost(storage, [...type, ...toForm(props)]);
    return mustRead(path, 1);
  },
  setProps: async (path, props) => {
    const page = pageOfContent(path);
    if (page) {
      const other = Object.entries(props).filter(([k, v]) => !k.startsWith("ucp:") && v !== undefined).map(([k]) => k);
      if (other.length) throw notYet(`${other.join(", ")} on ${page}: page properties change in a draft (the builder)`);
      await writeSidecar(page, props);
      const p = await contentLibreRepo.getPage(page); if (!p) throw new RepoError(404, "Page not found", page); return pageToNode(p);
    }
    await clSlingPost(requireStorage(path), toForm(props)); return mustRead(path, 1);
  },
  putFile: async (path, data, mime) => {
    const storage = requireStorage(path); const name = storage.split("/").pop()!;
    const form = new FormData(); form.append(name, new Blob([new Uint8Array(data)], { type: mime }), name); form.append(`${name}@TypeHint`, "nt:file");
    await clSlingPostMultipart(storage.slice(0, storage.lastIndexOf("/")), form);
    return mustRead(path, 0);
  },
  deleteNode: async (path) => { await clSlingPost(requireStorage(path), [[":operation", "delete"]]); },
  moveNode: async (path, dest) => { await clSlingPost(requireStorage(path), [[":operation", "move"], [":dest", requireStorage(dest)]]); return mustRead(dest, 1); },
  getPage: async (path) => {
    try { const [p, side] = await Promise.all([clApi<ClPage>("GET", "content/v1/page", { path }), readSidecar(path)]); return toView(p, side); }
    catch (e) { if (e instanceof RepoError && e.status === 404) return undefined; throw e; }
  },
  listChildren: async (path, { offset = 0, limit = 50 } = {}) => {
    const [l, sides] = await Promise.all([clApi<ClPageList>("GET", "content/v1/children", { path, offset, limit }), readSidecars(path)]);
    return { items: l.items.map((p) => toSummary(p, sides[p.path])), more: l.more };
  },
  // content/v1/pages accepts exactly these four and refuses anything else; the body is built, not passed through.
  createPage: async ({ parentPath, name, template, title }) => toView(await clApi<ClPage>("POST", "content/v1/pages", {}, { parentPath, name, template, title })),
  // The backend's copy: the source's template seeded with its published payload, as a new page's first draft.
  copyPage: async (path, destinationPath, title) => toView(await clApi<ClPage>("POST", "content/v1/page/copy", { path }, { destinationPath, title })),
  updateContent: async (path, patch) => {
    const { status, ...rest } = patch;
    if (status) await transition(path, status);
    if (!Object.keys(rest).length) { const p = await contentLibreRepo.getPage(path); if (!p) throw new RepoError(404, "Page not found", path); return p; }
    return toView(await clApi<ClPage>("PATCH", "content/v1/page", { path }, rest, "application/merge-patch+json"), await readSidecar(path));
  },
  saveComponents: async (path) => { throw notYet(`saveComponents ${path}: components are edited in the builder through the backend's own contracts`); },
  // What was kept beside a page goes with it: deleted with it, moved with it (best effort - the page is what matters).
  deletePage: async (path, recursive = false) => { await clApi("DELETE", "content/v1/page", { path, recursive }); await clSlingPost(sidecarOf(path), [[":operation", "delete"]]).catch(() => {}); },
  movePage: async (path, destinationPath) => {
    const moved = await clApi<ClPage>("POST", "content/v1/page/move", { path }, { destinationPath });
    if (await clSlingJsonOrNone(`${sidecarOf(path)}.json`).catch(() => undefined)) {
      await clSlingPost(sidecarOf(destinationPath.slice(0, destinationPath.lastIndexOf("/"))), []).catch(() => {});
      await clSlingPost(sidecarOf(path), [[":operation", "move"], [":dest", sidecarOf(destinationPath)]]).catch(() => {});
    }
    return toView(moved, await readSidecar(destinationPath));
  },
};
