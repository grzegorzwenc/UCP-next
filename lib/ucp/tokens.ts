import type { Bindings, EntityValues } from "./types";

/** {{alias.field}} tokens let pages reuse content entity values instead of copying text. */
export const TOKEN_RE = /\{\{\s*([a-zA-Z][\w-]*)\.([a-zA-Z][\w]*)\s*\}\}/g;
export type ResolvedEntities = Record<string, { title: string; values: EntityValues; path: string }>; // alias → entity
export const hasTokens = (s: unknown) => typeof s === "string" && /\{\{\s*[a-zA-Z][\w-]*\.[a-zA-Z]\w*\s*\}\}/.test(s);
const show = (v: unknown) => (v === undefined || v === null ? "" : typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : Array.isArray(v) ? v.join(", ") : JSON.stringify(v));
/** Replace every token; unknown aliases/fields stay visible as the token so authors notice. */
export function resolveTokens(s: string, ents: ResolvedEntities): string {
  return s.replace(new RegExp(TOKEN_RE.source, "g"), (m, alias: string, field: string) => { const e = ents[alias]; if (!e) return m; if (field === "title" && e.values.title === undefined) return e.title; const v = e.values[field]; return v === undefined ? m : show(v); });
}
/** Split into parts so the builder can highlight resolved tokens. */
export function tokenParts(s: string, ents: ResolvedEntities): { text: string; token?: string; ok?: boolean }[] {
  // A fresh RegExp per call: resolveTokens() uses the shared global TOKEN_RE and would reset its lastIndex mid-loop.
  const re = new RegExp(TOKEN_RE.source, "g");
  const out: { text: string; token?: string; ok?: boolean }[] = []; let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(s))) { if (m.index > last) out.push({ text: s.slice(last, m.index) }); const r = resolveTokens(m[0], ents); out.push({ text: r, token: m[0], ok: r !== m[0] }); last = m.index + m[0].length; }
  if (last < s.length) out.push({ text: s.slice(last) }); return out;
}
export const bindingsOf = (meta: Record<string, unknown> | undefined): Bindings => { const b = meta?.["ucp:bindings"]; if (typeof b !== "string") return (b as Bindings) ?? {}; try { return JSON.parse(b) as Bindings; } catch { return {}; } };
