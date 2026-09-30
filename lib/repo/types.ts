/**
 * Domain model shaped after JCR / Sling so the real backend (Apache Sling + Oak/JCR on Felix) plugs in without
 * changing the UI. A page is a node (cq:Page-like) with a `jcr:content` child; components live under
 * `jcr:content/root` as child nodes carrying `sling:resourceType`. Anything ContentLIBRE-specific is mapped in its adapter.
 */
export type NodeProps = Record<string, unknown>;

export type RepoNode = {
  path: string;                 // absolute repository path, e.g. /content/uk/borrowing/credit-cards
  name: string;                 // last path segment
  primaryType: string;          // jcr:primaryType, e.g. "cq:Page" | "sling:Folder" | "nt:unstructured"
  properties: NodeProps;        // node properties (flattened, JCR names kept: jcr:title, sling:resourceType, ...)
  children?: RepoNode[];        // present when fetched with depth > 0
};

/** review = waiting for the author's review, inreview = the reviewer took it (in author's review), reviewed = author's review done (the author sends it on), bizreview = business review (sign-off), approved = ready to publish. */
export type PageStatus = "draft" | "review" | "inreview" | "reviewed" | "bizreview" | "approved" | "scheduled" | "published" | "failed";

/** Component instance = child node of jcr:content/root. `resourceType` maps 1:1 to the block registry. */
export type ComponentNode = { name: string; resourceType: string; props: NodeProps };

/** UI-facing page view assembled from the node tree. */
export type PageView = {
  path: string; name: string;
  title: string; description?: string; navTitle?: string; hideInNav?: boolean;
  template?: string; locale?: string; resourceType?: string;
  status: PageStatus;
  created?: string; lastModified?: string; lastModifiedBy?: string;
  /** Raw jcr:content properties (workflow metadata such as ucp:sentBy, ucp:due, ucp:sourcePath live here). */
  meta?: NodeProps;
  components: ComponentNode[];
};
export type PageSummary = Omit<PageView, "components"> & { isFolder: boolean; childCount?: number };

export type Identity = { id: string; authType: string; groups: string[] };

export type CreatePageInput = { parentPath: string; name: string; template: string; title?: string };
export type PageContentPatch = Partial<Pick<PageView, "title" | "description" | "navTitle" | "hideInNav" | "locale" | "status">>;

export class RepoError extends Error {
  constructor(public status: number, message: string, public detail?: string, public requestId?: string) { super(message); }
}

/** The port every adapter implements. Paths are absolute JCR paths. */
export interface ContentRepository {
  readonly kind: "mock" | "contentlibre" | "sling";
  identity(): Promise<Identity>;
  /** Raw node tree (CRXDE-style inspection). depth = how many child levels to include. */
  getNode(path: string, depth?: number): Promise<RepoNode | undefined>;
  /* ---- generic node operations: everything that is not a page (assets, users, models, templates, audit) goes through these ---- */
  createNode(path: string, primaryType: string, props?: NodeProps): Promise<RepoNode>;
  /** Merge properties; a `null` value removes the property. Returns the node (depth 1). */
  setProps(path: string, props: NodeProps): Promise<RepoNode>;
  /** Store a binary (asset rendition). Sling: multipart POST creating nt:file; mock: inline data URL. */
  putFile(path: string, data: Uint8Array, mime: string): Promise<RepoNode>;
  deleteNode(path: string): Promise<void>;
  moveNode(path: string, destinationPath: string): Promise<RepoNode>;
  getPage(path: string): Promise<PageView | undefined>;
  listChildren(path: string, opts?: { offset?: number; limit?: number }): Promise<{ items: PageSummary[]; more: boolean }>;
  createPage(input: CreatePageInput): Promise<PageView>;
  updateContent(path: string, patch: PageContentPatch): Promise<PageView>;
  saveComponents(path: string, components: ComponentNode[]): Promise<PageView>;
  deletePage(path: string, recursive?: boolean): Promise<void>;
  movePage(path: string, destinationPath: string): Promise<PageView>;
}
