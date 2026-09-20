/**
 * Domain objects that live in the repository next to pages. Every one of them is a plain JCR node
 * (see lib/server/ucp.ts for the paths) so the Sling backend stores them without any extra service.
 */
export type AssetType = "image" | "pdf" | "svg" | "file";
export type Asset = { id: string; path: string; name: string; type: AssetType; size: string; folder: string; width?: number; height?: number; data?: string; uploaded?: string; uploadedBy?: string };

export type Role = "author" | "reviewer" | "publisher" | "admin" | "viewer";
export type PermKey = "read" | "edit" | "review" | "publish" | "manage";
export type Perms = Record<string, Partial<Record<PermKey, boolean>>>; // folder name ("root" = whole site) → grants
export type User = { id: string; path: string; name: string; email: string; role: Role; team: string; perms: Perms };

export type FieldType = "Text" | "Rich text" | "Number" | "Decimal" | "Boolean" | "Date" | "Enum" | "Multi-select" | "Asset" | "Reference" | "Group" | "List" | "Form reference" | "Blocks";
export type ModelField = { k: string; l: string; t: FieldType | string; req: boolean; loc: boolean };
export type Model = { id: string; path?: string; name: string; group: "Core" | "Block types" | string; version: number; source: string; locked?: boolean; fields: ModelField[] };

export type Template = { id: string; path: string; name: string; desc: string; blocks: string[]; folder: string };
export type FormDef = { id: string; name: string; version: number };

export type AuditType = "content" | "publishing" | "permissions" | "system";
export type AuditEvent = { id: string; path: string; time: string; type: AuditType; who: string; text: string; target?: string; level?: "crit" | ""; requestId?: string };

export type TaskKind = "Review" | "Publish" | "Fix" | "Check" | "Finish";
export type Task = { kind: TaskKind; what: string; from: string; sentAt?: string; due: string; overdueDays: number; page: { path: string; title: string; status: string; template?: string } };

export type Notification = { text: string; when: string; target?: string; level?: string };
