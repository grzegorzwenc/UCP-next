import type { Asset, FormDef, Model, ModelField, Role, PermKey, Perms, Template } from "./types";
import { BLOCKS, TEMPLATES } from "@/lib/blocks/registry";

/** Demo data shared by the mock repository seed and by UI defaults. Safe to import on the client (no secrets, no server-only). */
export const ROLES: Record<Role, { name: string; perms: Partial<Record<PermKey, boolean>> }> = {
  author: { name: "Author", perms: { read: true, edit: true } },
  reviewer: { name: "Reviewer", perms: { read: true, edit: true, review: true } },
  publisher: { name: "Publisher", perms: { read: true, review: true, publish: true } },
  admin: { name: "Site admin", perms: { read: true, edit: true, review: true, publish: true, manage: true } },
  viewer: { name: "Viewer", perms: { read: true } },
};
export const PERM_COLS: [PermKey, string, string][] = [["read", "Read", "See pages and content"], ["edit", "Edit", "Change drafts"], ["review", "Review & approve", "Approve for publishing"], ["publish", "Publish", "Push to production"], ["manage", "Manage", "Permissions and settings"]];

export const SEED_USERS: { id: string; name: string; email: string; role: Role; team: string; perms: Perms }[] = [
  { id: "super.admin", name: "Super admin", email: "ucp-admin@hsbc.com", role: "admin", team: "UCP platform team", perms: { root: { read: true, edit: true, review: true, publish: true, manage: true } } },
  { id: "jordan.mensah", name: "Jordan Mensah", email: "jordan.mensah@hsbc.com", role: "publisher", team: "Savings & Mortgages", perms: { root: { read: true, edit: true, review: true, publish: true } } },
  { id: "anna.kowalczyk", name: "Anna Kowalczyk", email: "anna.kowalczyk@hsbc.com", role: "author", team: "Cards", perms: { root: { read: true }, borrowing: { read: true, edit: true } } },
  { id: "rachel.hughes", name: "Rachel Hughes", email: "rachel.hughes@hsbc.com", role: "reviewer", team: "Compliance", perms: { root: { read: true, edit: true, review: true } } },
  { id: "michael.osei", name: "Michael Osei", email: "michael.osei@hsbc.com", role: "publisher", team: "Digital channel", perms: { root: { read: true, review: true, publish: true } } },
  { id: "priya.kaur", name: "Priya Kaur", email: "priya.kaur@hsbc.com", role: "admin", team: "Platform", perms: { root: { read: true, edit: true, review: true, publish: true, manage: true } } },
  { id: "elin.llewelyn", name: "Elin Llewelyn", email: "elin.llewelyn@hsbc.com", role: "author", team: "Welsh language", perms: { root: { read: true }, banking: { read: true, edit: true } } },
  { id: "tunde.boateng", name: "Tunde Boateng", email: "tunde.boateng@hsbc.com", role: "viewer", team: "Marketing", perms: { root: { read: true } } },
];
export const ME = "jordan.mensah";
/** Who the "Sign in with company SSO" button signs in as until real SSO is wired: the platform super admin. */
export const SSO_USER = "super.admin";

export const ASSET_FOLDERS = ["Products", "Campaigns", "Brand", "Documents", "Uploads"];
export const SEED_ASSETS: Omit<Asset, "path">[] = [
  { id: "hero-savings", name: "hero-savings-couple.jpg", type: "image", size: "1.1 MB", width: 2400, height: 1600, folder: "Products" },
  { id: "hero-cards", name: "hero-credit-cards.jpg", type: "image", size: "1.4 MB", width: 2400, height: 1600, folder: "Products" },
  { id: "hero-mortgage", name: "hero-mortgage-keys.jpg", type: "image", size: "0.9 MB", width: 1800, height: 1200, folder: "Products" },
  { id: "hero-business", name: "hero-business-owner.jpg", type: "image", size: "1.6 MB", width: 2400, height: 1600, folder: "Products" },
  { id: "hero-home", name: "hero-home-family.jpg", type: "image", size: "1.3 MB", width: 2400, height: 1600, folder: "Brand" },
  { id: "card-black", name: "card-visual-black.png", type: "image", size: "0.4 MB", width: 1200, height: 760, folder: "Products" },
  { id: "campaign-autumn", name: "campaign-autumn-leaves.jpg", type: "image", size: "1.5 MB", width: 2400, height: 1200, folder: "Campaigns" },
  { id: "isa-tcs", name: "isa-terms-and-conditions.pdf", type: "pdf", size: "320 KB", folder: "Documents" },
  { id: "bond-tcs", name: "fixed-rate-bond-terms.pdf", type: "pdf", size: "280 KB", folder: "Documents" },
  { id: "icon-shield", name: "icon-shield.svg", type: "svg", size: "8 KB", folder: "Brand" },
];

export const FORMS: FormDef[] = [
  { id: "apply-savings", name: "Apply for a savings account", version: 3 },
  { id: "apply-card", name: "Credit card application", version: 5 },
  { id: "mortgage-callback", name: "Request a mortgage call back", version: 2 },
  { id: "contact", name: "Contact us", version: 1 },
];

export const FIELD_TYPES = ["Text", "Rich text", "Number", "Decimal", "Boolean", "Date", "Enum", "Multi-select", "Asset", "Reference", "Group", "List", "Form reference"];
const f = (k: string, l: string, t: string, req = false, loc = false): ModelField => ({ k, l, t, req, loc });
export const SEED_MODELS: Omit<Model, "path">[] = [
  { id: "page", name: "Page", group: "Core", version: 2, source: "Core", fields: [f("title", "Title", "Text", true, true), f("slug", "URL slug", "Text", true), f("template", "Template", "Reference", true), f("metaDescription", "Meta description", "Text", false, true), f("owner", "Owner", "Reference"), f("status", "Status", "Enum", true), f("publishAt", "Publish at", "Date"), f("locales", "Locales", "Multi-select"), f("blocks", "Blocks", "Blocks", true, true)] },
  { id: "product", name: "Product", group: "Core", version: 4, source: "Core", fields: [f("title", "Title", "Text", true, true), f("description", "Description", "Rich text", false, true), f("image", "Image", "Asset"), f("cta", "Call to action", "Group", false, true), f("relatedProducts", "Related products", "Reference"), f("category", "Category", "Enum", true), f("marketAvailability", "Market availability", "Multi-select")] },
  { id: "rate", name: "Rate", group: "Core", version: 3, source: "Core", fields: [f("product", "Product", "Reference", true), f("term", "Term", "Text", true, true), f("aer", "AER", "Decimal", true), f("gross", "Gross", "Decimal"), f("validFrom", "Valid from", "Date", true)] },
  { id: "campaign", name: "Campaign", group: "Core", version: 2, source: "Core", fields: [f("name", "Name", "Text", true), f("startDate", "Start date", "Date", true), f("endDate", "End date", "Date", true), f("offer", "Offer", "Rich text", false, true), f("landingPage", "Landing page", "Reference"), f("markets", "Markets", "Multi-select")] },
  { id: "faq-item", name: "FAQ item", group: "Core", version: 1, source: "Core", fields: [f("question", "Question", "Text", true, true), f("answer", "Answer", "Rich text", true, true)] },
];
/** Block-type models are derived from the component registry (read-only: the source of truth is the Sling component dialog). */
const T: Record<string, string> = { text: "Text", textarea: "Rich text", lines: "List", select: "Enum", bool: "Boolean", asset: "Asset", form: "Form reference" };
export const BLOCK_MODELS: Model[] = BLOCKS.map((c) => ({ id: "block-" + c.type, name: c.name, group: "Block types", version: 1, source: "Translated from the Sling component dialog", locked: true, fields: c.fields.map((x) => f(x.k, x.l, T[x.t] ?? x.t, !!x.req, x.t === "text" || x.t === "textarea" || x.t === "lines")) }));

export const TEMPLATE_FOLDERS = ["Global (all markets)", "Campaigns", "Archived"];
export const SEED_TEMPLATES: Omit<Template, "path">[] = TEMPLATES.map((t) => ({ ...t, folder: t.id === "campaign" ? "Campaigns" : "Global (all markets)" }));

/** Tiny Welsh glossary so the translation flow produces something recognisable without an MT service. */
export const CY: Record<string, string> = { "Rewards credit cards": "Cardiau credyd gwobrwyon", "Credit cards": "Cardiau credyd", "Current accounts": "Cyfrifon cyfredol", "Savings": "Cynilion", "Cash ISA": "ISA Arian Parod", "Mortgages": "Morgeisi", "Home": "Hafan", "Contact us": "Cysylltwch â ni", "Apply now": "Gwnewch gais nawr", "Find out more": "Darganfod mwy", "Discover our range of rewards cards": "Darganfyddwch ein hystod o gardiau gwobrwyon" };
