import { api } from "./client";
import type { ContentV1CreatePage, ContentV1Page, ContentV1PageList, ContentV1Move } from "./types";

/** content-v1: pages addressed by repository path. */
export const contentV1 = {
  createPage: (body: ContentV1CreatePage) => api<ContentV1Page>("/content/v1/pages", { method: "POST", body: JSON.stringify(body) }),
  getPage: (path: string) => api<ContentV1Page>("/content/v1/page", { query: { path } }),
  deletePage: (path: string, recursive = false) => api<void>("/content/v1/page", { method: "DELETE", query: { path, recursive } }),
  /** RFC 7396 merge patch over the allowlisted editable fields. */
  patchPage: (path: string, patch: Partial<ContentV1Page>) =>
    api<ContentV1Page>("/content/v1/page", { method: "PATCH", query: { path }, body: JSON.stringify(patch), headers: { "Content-Type": "application/merge-patch+json" } }),
  children: (path: string, offset = 0, limit = 50) => api<ContentV1PageList>("/content/v1/children", { query: { path, offset, limit } }),
  movePage: (path: string, body: ContentV1Move) => api<ContentV1Page>("/content/v1/page/move", { method: "POST", query: { path }, body: JSON.stringify(body) }),
};
