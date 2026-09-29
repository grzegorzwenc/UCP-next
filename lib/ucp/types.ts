/**
 * Domain objects that live in the repository next to pages. Every one of them is a plain JCR node
 * (see lib/server/ucp.ts for the paths) so the Sling backend stores them without any extra service.
 */
export type AssetType = "image" | "pdf" | "svg" | "file";
/** Accessibility data kept on every asset. Images: alt text per locale (or decorative), long description, caption. Documents: title, language, tagged PDF, text summary. */
export type AssetA11y = { alt?: Record<string, string>; decorative?: boolean; longDescription?: string; caption?: string; title?: string; lang?: string; tagged?: boolean; summary?: string; checkedBy?: string; checkedAt?: string };
export type Asset = { a11y?: AssetA11y; id: string; path: string; name: string; type: AssetType; size: string; folder: string; width?: number; height?: number; data?: string; uploaded?: string; uploadedBy?: string };

export type Role = "author" | "reviewer" | "publisher" | "admin" | "viewer";
export type PermKey = "read" | "edit" | "review" | "publish" | "manage";
export type Perms = Record<string, Partial<Record<PermKey, boolean>>>; // folder name ("root" = whole site) → grants
export type User = { id: string; path: string; name: string; email: string; role: Role; team: string; perms: Perms };

export type FieldType = "Text" | "Long text" | "Rich text" | "Number" | "Decimal" | "Boolean" | "Date" | "Date & time" | "Select" | "Multi-select" | "Reference" | "Asset" | "Image" | "URL" | "JSON" | "Enum" | "Group" | "List" | "Form reference" | "Blocks";
export type FieldValidation = { min?: number; max?: number; minLength?: number; maxLength?: number; pattern?: string; options?: string[]; referenceModel?: string; unique?: boolean; /** Reference fields: link to many items instead of one. */ multiple?: boolean };
export type ModelField = { k: string; l: string; t: FieldType | string; req: boolean; loc: boolean; desc?: string; default?: string; hidden?: boolean; validation?: FieldValidation };
export type ModelStatus = "draft" | "published" | "modified";
export type Model = {
  id: string; path?: string; name: string; displayName?: string; description?: string; icon?: string; group: "Core" | "Block types" | string; source: string; locked?: boolean;
  status: ModelStatus; version: number; publishedVersion?: number; fields: ModelField[]; publishedFields?: ModelField[];
  lastModified?: string; lastModifiedBy?: string; order?: number;
};
export type ModelVersion = { id: string; version: number; time: string; who: string; note: string; published: boolean; fields: ModelField[] };
export type ModelDiff = { added: ModelField[]; removed: ModelField[]; changed: { before: ModelField; after: ModelField; what: string[] }[]; breaking: string[] };

export type Template = { id: string; path: string; name: string; desc: string; blocks: string[]; folder: string };
export type FormDef = { id: string; name: string; version: number };

export type AuditType = "content" | "publishing" | "permissions" | "system";
export type AuditEvent = { id: string; path: string; time: string; type: AuditType; who: string; text: string; target?: string; level?: "crit" | ""; requestId?: string };

export type TaskKind = "Review" | "BizReview" | "Publish" | "Fix" | "Check" | "Finish";
export type Task = { kind: TaskKind; what: string; from: string; sentAt?: string; due: string; overdueDays: number; assignee?: string; assigneeName?: string; remindedAt?: string; remindedBy?: string; page: { path: string; title: string; status: string; template?: string } };

/** A concrete content item built from a content model (e.g. Product → "HSBC Savings Account"). */
export type EntityValues = Record<string, unknown>;
export type Entity = { id: string; path: string; model: string; title: string; status: "draft" | "published" | "modified"; values: EntityValues; publishedValues?: EntityValues; lastModified?: string; lastModifiedBy?: string; usedOn?: string[]; order?: number; /** Folder inside the model's folder in the entities tree (empty = directly in the model folder). */ folder?: string };
/** Page → entity bindings: alias used in {{alias.field}} tokens → entity path. Stored on the page as ucp:bindings. */
export type Bindings = Record<string, string>;
export type ReviewerOption = { id: string; name: string; team: string; activeReviews: number };

export type Notification = { text: string; when: string; target?: string; level?: string };
