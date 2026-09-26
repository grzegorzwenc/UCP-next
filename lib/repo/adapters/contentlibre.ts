import "server-only";
import { pageToNode } from "../mapping";
import type { ContentRepository, PageView, PageSummary, PageStatus } from "../types";
import { RepoError } from "../types";
import { clApi, type ClIdentity, type ClPage, type ClPageList } from "@/lib/server/contentlibre";

/**
 * Adapter for the ContentLIBRE Management API (content-v1 / identity-v1, docs/API-DESIGN.md §10 in the backend).
 * Calls run as the signed-in person (see lib/server/contentlibre.ts).
 *
 * What maps and what does not, today:
 *  - Pages: read, list, create from a template, delete, move — the API's own operations.
 *  - Status: the backend records publication, not a review workflow. `published` / `draft` map directly,
 *    `modified` (live, with an open draft) is its own status here, and `unpublished` reads as `draft`.
 *    Review / approved / scheduled do not exist on this backend yet.
 *  - A ContentLIBRE page may have child pages. It stays a page (counted, opened in the builder) and carries
 *    `hasChildren` so the explorer can also open it as a level of the tree.
 *  - Components, workflow transitions and every non-page node (assets, models, users, audit) are not exposed
 *    by the Management API yet, so those operations answer 501 rather than pretend.
 */
const notYet = (what: string) => new RepoError(501, "Not supported by the ContentLIBRE Management API yet", what);

const STATUS: Record<NonNullable<ClPage["status"]>, PageStatus> = { published: "published", modified: "modified", draft: "draft", unpublished: "draft" };

const toView = (p: ClPage): PageView => ({
  path: p.path, name: p.name, title: p.title ?? p.name, description: p.description, navTitle: p.navTitle, hideInNav: p.hideInNav,
  template: p.template?.split("/").pop(), locale: p.locale, status: p.status ? STATUS[p.status] : "draft",
  created: p.created, lastModified: p.lastModified,
  meta: {
    "libre:status": p.status, "libre:template": p.template, "libre:publishedAt": p.publishedAt, "libre:publishedBy": p.publishedBy,
    "libre:openDrafts": p.openDrafts, "libre:permissions": p.permissions,
  },
  components: [],
});
const toSummary = (p: ClPage): PageSummary => { const { components, ...rest } = toView(p); void components; return { ...rest, isFolder: false, hasChildren: !!p.hasChildren }; };

export const contentLibreRepo: ContentRepository = {
  kind: "contentlibre",
  identity: async () => { const me = await clApi<ClIdentity>("GET", "identity/v1/me"); return { id: me.id, authType: me.authType ?? "", groups: me.groups, administrator: !!me.administrator }; },
  getNode: async (path) => { const p = await contentLibreRepo.getPage(path); return p && pageToNode(p); },
  createNode: async (path) => { throw notYet(`createNode ${path}: only pages are exposed by content-v1`); },
  setProps: async (path) => { throw notYet(`setProps ${path}: page content is edited through drafts, which content-v1 does not expose yet`); },
  putFile: async (path) => { throw notYet(`putFile ${path}`); },
  deleteNode: async (path) => { throw notYet(`deleteNode ${path}`); },
  moveNode: async (path) => { throw notYet(`moveNode ${path}`); },
  getPage: async (path) => { try { return toView(await clApi<ClPage>("GET", "content/v1/page", { path })); } catch (e) { if (e instanceof RepoError && e.status === 404) return undefined; throw e; } },
  listChildren: async (path, { offset = 0, limit = 50 } = {}) => { const l = await clApi<ClPageList>("GET", "content/v1/children", { path, offset, limit }); return { items: l.items.map(toSummary), more: l.more }; },
  createPage: async (input) => toView(await clApi<ClPage>("POST", "content/v1/pages", {}, input)),
  updateContent: async (path, patch) => {
    if (patch.status) throw notYet(`status ${patch.status}: publication goes through drafts, which content-v1 does not expose yet`);
    return toView(await clApi<ClPage>("PATCH", "content/v1/page", { path }, patch, "application/merge-patch+json"));
  },
  saveComponents: async (path) => { throw notYet(`saveComponents ${path}: components are not in content-v1 yet`); },
  deletePage: (path, recursive = false) => clApi("DELETE", "content/v1/page", { path, recursive }),
  movePage: async (path, destinationPath) => toView(await clApi<ClPage>("POST", "content/v1/page/move", { path }, { destinationPath })),
};
