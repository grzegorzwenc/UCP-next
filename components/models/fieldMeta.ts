import type { Model, ModelField } from "@/lib/ucp/types";

/** Client-safe helpers shared by the content-model list, editor and dialogs. */
export type ModelTab = "fields" | "diagram" | "form" | "config" | "versions";
export const TABS: ModelTab[] = ["fields", "diagram", "form", "config", "versions"];
export type UsedPage = { path: string; title: string; status: string };

export const camel = (s: string) => { const w = s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").trim().split(/\s+/).filter(Boolean); return w.map((x, i) => (i ? x[0].toUpperCase() + x.slice(1) : x)).join(""); };
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const KEY_RE = /^[a-z][A-Za-z0-9]*$/;
export const isBlockModel = (m: Pick<Model, "id" | "locked">) => !!m.locked || m.id.startsWith("block-");
export const isAdminUser = (u: { role: string; perms: Record<string, Partial<Record<string, boolean>>> }) => u.role === "admin" || !!u.perms.root?.manage;

/** Field types an editor can pick, with the glyph and the one-line hint shown on the type cards. */
export const TYPE_META: Record<string, { icon: string; hint: string }> = {
  Text: { icon: "Aa", hint: "Short single-line text" },
  "Long text": { icon: "¶", hint: "Multi-line plain text" },
  "Rich text": { icon: "B", hint: "Formatted text with links and lists" },
  Number: { icon: "#", hint: "Whole number" },
  Decimal: { icon: "0.0", hint: "Number with decimals" },
  Boolean: { icon: "◐", hint: "Yes / no switch" },
  Date: { icon: "▦", hint: "Calendar date" },
  "Date & time": { icon: "◷", hint: "Date with a time of day" },
  Select: { icon: "▾", hint: "One value from a list" },
  "Multi-select": { icon: "☷", hint: "Several values from a list" },
  Reference: { icon: "⇄", hint: "Link to another content item" },
  Asset: { icon: "⎘", hint: "File from the asset library" },
  Image: { icon: "▣", hint: "Picture with renditions" },
  URL: { icon: "⌁", hint: "Web address" },
  JSON: { icon: "{}", hint: "Free-form structured data" },
};
export const TEXT_TYPES = ["Text", "Long text", "Rich text", "URL"];
export const NUMBER_TYPES = ["Number", "Decimal"];
export const OPTION_TYPES = ["Select", "Multi-select", "Enum"];
export const UNIQUE_TYPES = ["Text", "URL", "Number", "Decimal"];

/** "max 100 chars · pattern …" for a field row. */
export function validationSummary(f: ModelField): string {
  const v = f.validation ?? {}; const p: string[] = [];
  if (v.minLength !== undefined) p.push(`min ${v.minLength} chars`); if (v.maxLength !== undefined) p.push(`max ${v.maxLength} chars`);
  if (v.min !== undefined) p.push(`min ${v.min}`); if (v.max !== undefined) p.push(`max ${v.max}`);
  if (v.pattern) p.push(`pattern ${v.pattern}`); if (v.options?.length) p.push(`${v.options.length} option${v.options.length === 1 ? "" : "s"}`);
  if (v.referenceModel) p.push(`→ ${v.referenceModel}`); if (v.unique) p.push("unique");
  return p.join(" · ");
}

/** Why a key is not acceptable, or "" when it is. `taken` = keys already in the model (minus the one being edited). */
export function keyError(key: string, taken: string[]): string {
  if (!key) return "A field name is required"; if (!KEY_RE.test(key)) return "Use camelCase: start with a lowercase letter, then letters and digits only"; if (taken.includes(key)) return "Another field already uses this name"; return "";
}

/** Relative time ("3 h ago") and the full timestamp for a tooltip. */
export function relTime(iso?: string): { rel: string; full: string } {
  if (!iso) return { rel: "—", full: "" }; const d = new Date(iso); if (isNaN(d.getTime())) return { rel: iso, full: iso };
  const diff = Math.round((Date.now() - d.getTime()) / 60000);
  const rel = diff < 2 ? "just now" : diff < 60 ? `${diff} min ago` : diff < 1440 ? `${Math.round(diff / 60)} h ago` : diff < 43200 ? `${Math.round(diff / 1440)} day${Math.round(diff / 1440) === 1 ? "" : "s"} ago` : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return { rel, full: d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) };
}
export const whoName = (id: string | undefined, names: Record<string, string>) => (!id ? "—" : id === "system" ? "System" : names[id] ?? id.split(".").map((s) => (s[0]?.toUpperCase() ?? "") + s.slice(1)).join(" "));

/** The dozen glyphs offered by the icon picker; the model's `icon` stores the glyph itself. */
export const ICONS = ["▦", "◈", "◉", "▣", "⬡", "✦", "◆", "▲", "⚑", "☷", "⌘", "❖"];
export const DEFAULT_GROUPS = ["Core", "Marketing", "Products", "Navigation", "Settings"];
