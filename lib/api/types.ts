/** Types transcribed from the ContentLIBRE Management API (v0.1.0, OAS 3.1): modules content-v1 and identity-v1. */
export type Problem = { type: string; title: string; status: number; detail?: string; instance?: string; errors?: { field: string; message: string }[] };

export type ContentV1CreatePage = { parentPath: string; name: string; template: string; title?: string };
export type ContentV1Page = {
  path: string; name: string; title?: string; description?: string; navTitle?: string; hideInNav?: boolean;
  locale?: string; template?: string; created?: string; lastModified?: string;
  /** UCP extension (authoring status + blocks). Not in the upstream allowlist yet: the mock stores them; the live adapter keeps them in a sidecar until the API exposes them. */
  status?: PageStatus; blocks?: Block[];
};
export type ContentV1PageList = { items: ContentV1Page[]; offset: number; limit: number; more: boolean };
export type ContentV1Move = { destinationPath: string };
export type IdentityV1Me = { id: string; authType: string; groups: string[] };

export type PageStatus = "draft" | "review" | "approved" | "scheduled" | "published" | "failed";
export type Block = { id: string; type: string; props: Record<string, unknown> };

export class ApiError extends Error {
  constructor(public problem: Problem, public requestId?: string) { super(problem.title || `HTTP ${problem.status}`); }
}
