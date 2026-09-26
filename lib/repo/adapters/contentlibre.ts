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
 *    `unpublished` reads as `draft`. Review / approved / scheduled do not exist on this backend yet.
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
function statusOf(p: ClPage): PageStatus {
  if (p.review?.state === "IN_REVIEW") return "review";
  if (p.review?.state === "APPROVED") return "approved";
  return p.status ? STATUS[p.status] : "draft";
}

const toView = (p: ClPage): PageView => ({
  path: p.path, name: p.name, title: p.title ?? p.name, description: p.description, navTitle: p.navTitle, hideInNav: p.hideInNav,
  template: p.template?.split("/").pop(), locale: p.locale, status: statusOf(p),
  created: p.created, lastModified: p.lastModified,
  meta: {
    "libre:status": p.status, "libre:template": p.template, "libre:publishedAt": p.publishedAt, "libre:publishedBy": p.publishedBy,
    "libre:openDrafts": p.openDrafts, "libre:permissions": p.permissions,
    // The workflow fields the CMS's task list reads (lib/server/ucp.ts listTasks), from the backend's review.
    "libre:reviewState": p.review?.state, "libre:reviewDecidedBy": p.review?.decidedBy, "libre:reviewComment": p.review?.comment,
    "ucp:sentBy": p.review?.requestedBy, "ucp:sentAt": p.review?.requestedAt, "ucp:assignee": p.review?.assignee, "ucp:due": p.review?.due,
  },
  components: [],
});
const toSummary = (p: ClPage): PageSummary => { const { components, ...rest } = toView(p); void components; return { ...rest, isFolder: false, hasChildren: !!p.hasChildren }; };

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
  setProps: async (path, props) => { await clSlingPost(requireStorage(path), toForm(props)); return mustRead(path, 1); },
  putFile: async (path, data, mime) => {
    const storage = requireStorage(path); const name = storage.split("/").pop()!;
    const form = new FormData(); form.append(name, new Blob([new Uint8Array(data)], { type: mime }), name); form.append(`${name}@TypeHint`, "nt:file");
    await clSlingPostMultipart(storage.slice(0, storage.lastIndexOf("/")), form);
    return mustRead(path, 0);
  },
  deleteNode: async (path) => { await clSlingPost(requireStorage(path), [[":operation", "delete"]]); },
  moveNode: async (path, dest) => { await clSlingPost(requireStorage(path), [[":operation", "move"], [":dest", requireStorage(dest)]]); return mustRead(dest, 1); },
  getPage: async (path) => { try { return toView(await clApi<ClPage>("GET", "content/v1/page", { path })); } catch (e) { if (e instanceof RepoError && e.status === 404) return undefined; throw e; } },
  listChildren: async (path, { offset = 0, limit = 50 } = {}) => { const l = await clApi<ClPageList>("GET", "content/v1/children", { path, offset, limit }); return { items: l.items.map(toSummary), more: l.more }; },
  createPage: async (input) => toView(await clApi<ClPage>("POST", "content/v1/pages", {}, input)),
  updateContent: async (path, patch) => {
    if (patch.status) throw notYet(`status ${patch.status}: publication goes through drafts (the builder)`);
    return toView(await clApi<ClPage>("PATCH", "content/v1/page", { path }, patch, "application/merge-patch+json"));
  },
  saveComponents: async (path) => { throw notYet(`saveComponents ${path}: components are edited in the builder through the backend's own contracts`); },
  deletePage: (path, recursive = false) => clApi("DELETE", "content/v1/page", { path, recursive }),
  movePage: async (path, destinationPath) => toView(await clApi<ClPage>("POST", "content/v1/page/move", { path }, { destinationPath })),
};
