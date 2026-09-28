import type { Block } from "@/lib/api/types";
import { BLOCK_BY_TYPE, makeBlock, missingRequired, lines } from "@/lib/blocks/registry";
import { TOKEN_RE, resolveTokens, type ResolvedEntities } from "@/lib/ucp/tokens";
import { toPlain } from "@/lib/blocks/richtext";

/* Pure, client-safe page checks. Port of the prototype's insightsPanel() with fixes that return new blocks. */

export type InsightLevel = "crit" | "warn" | "ok" | "info";
export type InsightGroupId = "performance" | "accessibility" | "seo" | "compliance" | "content";
export type InsightFix = { label: string; apply: (blocks: Block[]) => Block[] };
export type Insight = { id: string; level: InsightLevel; title: string; detail: string; blockId?: string; field?: string; fix?: InsightFix };
export type InsightGroup = { id: InsightGroupId; title: string; score: number; items: Insight[] };
export type PageInsights = { score: number; groups: InsightGroup[] };
export type PageMeta = { title: string; description?: string; template?: string; status: string; locale?: string;
  /** Asset accessibility from the library (alt text / decorative), so an image described there counts as described. */
  assets?: Record<string, { alt?: string; decorative?: boolean }>;
  /** Content entities linked to the page; when given, {{alias.field}} tokens that do not resolve are reported. */
  entities?: ResolvedEntities };

export const GROUP_TITLE: Record<InsightGroupId, string> = { content: "Content", accessibility: "Accessibility", seo: "Search", compliance: "Compliance", performance: "Performance" };
/** Only the checks authors act on. Performance numbers were estimates, so they are no longer shown. */
const GROUP_ORDER: InsightGroupId[] = ["content", "compliance", "accessibility", "seo"];

export const HEADING_MAX = 60;
export const PARAGRAPH_MAX = 180;
export const BLOCKS_MAX = 8;
export const HEAVY_TYPES = ["mastertiles", "icontiles"];
export const VAGUE_CTAS = ["click here", "find out more", "learn more", "read more", "more", "here", "submit", "go"];
export const COMPLIANCE_WORDS = ["guaranteed", "risk-free", "risk free", "best rate", "no fees", "no risk", "cannot lose", "guarantee"];
const TEXT_KEYS = ["heading", "intro", "body", "text", "cta", "note", "items", "rows"];
const DISCLAIMER_TEMPLATES = ["rates", "campaign"];

const str = (v: unknown) => (typeof v === "string" ? toPlain(v) : ""); // formatted text is checked as plain text
const name = (b: Block) => BLOCK_BY_TYPE[b.type]?.name ?? b.type;
const setProp = (blocks: Block[], id: string, k: string, v: unknown): Block[] => blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, [k]: v } } : b));
/** First clause of a sentence: cut at the first punctuation or connective, else at the last space before the limit. */
export const firstClause = (s: string, max = HEADING_MAX) => {
  const t = s.trim(); if (t.length <= max) return t;
  const m = t.match(/^(.{10,}?)(?:[,;:–—.!?]|\s[-–—]\s|\s(?:and|or|but|so|that|which|with)\s)/i);
  if (m && m[1].length <= max) return m[1].trim();
  const cut = t.slice(0, max); const sp = cut.lastIndexOf(" "); return (sp > 20 ? cut.slice(0, sp) : cut).trim();
};
const paragraphs = (b: Block): { field: string; text: string }[] => {
  const out: { field: string; text: string }[] = [];
  for (const k of ["intro", "body", "text"]) { const v = toPlain(b.props[k]); if (!v) continue; for (const p of v.split(/\n\s*\n/)) if (p.trim()) out.push({ field: k, text: p.trim() }); }
  return out;
};
const allText = (b: Block) => TEXT_KEYS.map((k) => toPlain(b.props[k])).filter(Boolean).join(" ");
const ctaLabels = (b: Block): { field: string; label: string; row?: number }[] => {
  const out: { field: string; label: string; row?: number }[] = [];
  if (str(b.props.cta)) out.push({ field: "cta", label: str(b.props.cta) });
  if (b.type === "mastertiles") lines(b.props.items).forEach((r, i) => { if (r[5]) out.push({ field: "items", label: r[5], row: i }); });
  return out;
};
const descriptiveCta = (b: Block) => (b.type === "form" ? "Apply online" : b.type === "banner" || b.type === "mast" ? "Apply now" : "See the details");

export function pageInsights(blocks: Block[], page: PageMeta): PageInsights {
  const items: Record<InsightGroupId, Insight[]> = { content: [], accessibility: [], seo: [], compliance: [], performance: [] };
  const push = (g: InsightGroupId, i: Insight) => items[g].push(i);
  const visible = blocks.filter((b) => BLOCK_BY_TYPE[b.type]);

  /* ---- content ---- */
  if (!visible.length) push("content", { id: "empty", level: "crit", title: "The page is empty", detail: "Add a masthead and at least one content block.", fix: { label: "Add a masthead", apply: (bl) => [makeBlock("mast", { heading: page.title || "Your heading here" }), ...bl] } });
  else push("content", { id: "has-blocks", level: "ok", title: `${visible.length} block${visible.length === 1 ? "" : "s"} on the page`, detail: "The page has content." });

  for (const b of visible) for (const f of missingRequired(b)) push("content", { id: `req-${b.id}-${f.k}`, level: "crit", title: `${name(b)}: “${f.l}” is empty`, detail: "Required before the page can go for review.", blockId: b.id, field: f.k });

  if (page.entities) for (const b of visible) for (const k of TEXT_KEYS) { const v = str(b.props[k]); if (!v.includes("{{")) continue;
    const bad = [...new Set((v.match(new RegExp(TOKEN_RE.source, "g")) ?? []).filter((tok) => resolveTokens(tok, page.entities!) === tok))];
    if (bad.length) push("content", { id: `tok-${b.id}-${k}`, level: "crit", title: `Broken content link in ${name(b)}`, detail: `${bad.join(", ")} does not match any entity on this page, so visitors would see the raw code. Add the entity in the Entities panel or correct the token.`, blockId: b.id, field: k }); }

  if (!visible.some((b) => b.type === "mast")) push("content", { id: "no-mast", level: "warn", title: "No masthead at the top", detail: "HSBC pages open with a masthead so visitors know where they are.", fix: { label: "Add a masthead", apply: (bl) => [makeBlock("mast", { heading: page.title || "Your heading here" }), ...bl] } });
  else if (visible[0].type !== "mast") { const mastId = visible.find((b) => b.type === "mast")!.id; push("content", { id: "mast-not-first", level: "warn", title: "The masthead is not the first block", detail: "Move it to the top so the page opens with it.", blockId: mastId, fix: { label: "Move to top", apply: (bl) => { const m = bl.find((b) => b.id === mastId); return m ? [m, ...bl.filter((b) => b.id !== mastId)] : bl; } } }); }
  else push("content", { id: "mast-ok", level: "ok", title: "Opens with a masthead", detail: "Visitors see where they are straight away." });

  const seenHeadings = new Map<string, string>();
  for (const b of visible) {
    const h = str(b.props.heading).trim(); if (!h) continue;
    if (h.length > HEADING_MAX) push("content", { id: `hlen-${b.id}`, level: "warn", title: `Heading too long in ${name(b)} (${h.length} characters)`, detail: `Over ${HEADING_MAX} characters wraps to three lines on phones. Keep the first clause: “${firstClause(h)}”.`, blockId: b.id, field: "heading", fix: { label: "Shorten heading", apply: (bl) => setProp(bl, b.id, "heading", firstClause(h)) } });
    const key = h.toLowerCase(); const prev = seenHeadings.get(key);
    if (prev) push("content", { id: `hdup-${b.id}`, level: "warn", title: `Duplicate heading “${firstClause(h, 40)}”`, detail: `The same heading is used twice (${name(bl(visible, prev))} and ${name(b)}). Give each block its own heading.`, blockId: b.id, field: "heading" });
    else seenHeadings.set(key, b.id);
  }
  for (const b of visible) for (const p of paragraphs(b)) {
    if (p.text.length > PARAGRAPH_MAX) push("content", { id: `plen-${b.id}-${p.field}`, level: "warn", title: `Long paragraph in ${name(b)} (${p.text.length} characters)`, detail: `Readers skim. Keep paragraphs under ${PARAGRAPH_MAX} characters or split them with a blank line.`, blockId: b.id, field: p.field });
  }
  for (const b of visible) for (const c of ctaLabels(b)) {
    if (VAGUE_CTAS.includes(c.label.trim().toLowerCase())) {
      const better = descriptiveCta(b);
      push("content", { id: `cta-${b.id}-${c.field}-${c.row ?? 0}`, level: "warn", title: `Vague button label “${c.label}” in ${name(b)}`, detail: `Say what happens next, e.g. “${better}”. Vague labels lose clicks and confuse screen readers.`, blockId: b.id, field: c.field, fix: { label: `Rename to “${better}”`, apply: (bl) => bl.map((x) => { if (x.id !== b.id) return x; if (c.field === "cta") return { ...x, props: { ...x.props, cta: better } }; const rows = lines(x.props.items); if (rows[c.row ?? 0]) rows[c.row ?? 0][5] = better; return { ...x, props: { ...x.props, items: rows.map((r) => r.join(" | ")).join("\n") } }; }) } });
    }
  }
  for (const b of visible.filter((x) => x.type === "form")) if (!str(b.props.heading).trim()) push("content", { id: `formh-${b.id}`, level: "warn", title: "The form has no heading", detail: "Tell visitors what the form is for.", blockId: b.id, field: "heading", fix: { label: "Add “Apply online”", apply: (bl) => setProp(bl, b.id, "heading", "Apply online") } });

  /* ---- accessibility ---- */
  const imgBlocks = visible.filter((b) => str(b.props.image));
  for (const b of imgBlocks) {
    const lib = page.assets?.[str(b.props.image)];
    if (lib?.decorative) { push("accessibility", { id: `altdec-${b.id}`, level: "ok", title: `Image in ${name(b)} is decorative`, detail: "Marked decorative in the asset library, so screen readers skip it." }); continue; }
    if (!str(b.props.alt).trim() && lib?.alt?.trim()) { push("accessibility", { id: `altlib-${b.id}`, level: "ok", title: `Image in ${name(b)} has alt text`, detail: `From the asset library: “${lib.alt.trim()}”` }); continue; }
    if (!str(b.props.alt).trim()) push("accessibility", { id: `alt-${b.id}`, level: "crit", title: `Image without alt text in ${name(b)}`, detail: "Screen readers cannot describe it. Add alt text to the image in Assets (it then applies on every page) or in this block.", blockId: b.id, field: "alt", fix: { label: "Add placeholder alt", apply: (bl) => setProp(bl, b.id, "alt", str(b.props.heading).trim() || "Describe this image") } });
    else push("accessibility", { id: `altok-${b.id}`, level: "ok", title: `Image in ${name(b)} has alt text`, detail: `“${str(b.props.alt)}”` });
  }
  if (!imgBlocks.length) push("accessibility", { id: "no-img", level: "ok", title: "No images to describe", detail: "Nothing needs alt text." });
  const formNoHeading = visible.some((b) => b.type === "form" && !str(b.props.heading).trim());
  if (!formNoHeading) push("accessibility", { id: "labels-ok", level: "ok", title: "Buttons and forms are labelled", detail: "Every control has a visible name." });

  /* ---- seo ---- */
  const t = (page.title ?? "").trim();
  if (!t) push("seo", { id: "title-missing", level: "crit", title: "The page has no title", detail: "Search engines and the browser tab show the title." });
  else if (t.length < 10) push("seo", { id: "title-short", level: "warn", title: `Title is very short (${t.length} characters)`, detail: "Aim for 30–60 characters that say what the page is about." });
  else if (t.length > 60) push("seo", { id: "title-long", level: "warn", title: `Title is long (${t.length} characters)`, detail: "Search results cut titles after about 60 characters." });
  else push("seo", { id: "title-ok", level: "ok", title: "Title length is good", detail: `${t.length} characters.` });
  const d = (page.description ?? "").trim();
  if (!d) push("seo", { id: "desc-missing", level: "warn", title: "No page description", detail: "Search results show a description under the title. Add one in Page settings (about 150 characters)." });
  else if (d.length > 160) push("seo", { id: "desc-long", level: "info", title: `Description is long (${d.length} characters)`, detail: "Search results cut descriptions after about 160 characters." });
  else push("seo", { id: "desc-ok", level: "ok", title: "Page description is set", detail: `${d.length} characters.` });

  /* ---- compliance ---- */
  for (const b of visible) {
    const txt = allText(b).toLowerCase();
    const hits = COMPLIANCE_WORDS.filter((w) => txt.includes(w));
    if (hits.length) push("compliance", { id: `legal-${b.id}`, level: "warn", title: `Wording needs legal review in ${name(b)}`, detail: `Contains “${[...new Set(hits)].join("”, “")}”. Financial promotions must not promise outcomes; ask Compliance before publishing.`, blockId: b.id });
  }
  const hasSmallPrint = visible.some((b) => b.type === "disclaimer" || b.type === "footnotes");
  const hasRates = visible.some((b) => b.type === "rates" || b.type === "mastertiles");
  const needsDisclaimer = hasRates || DISCLAIMER_TEMPLATES.includes(page.template ?? "");
  if (needsDisclaimer && !visible.some((b) => b.type === "disclaimer")) push("compliance", { id: "no-disclaimer", level: hasRates ? "crit" : "warn", title: "No disclaimer", detail: hasRates ? "Pages that show rates or representative examples must carry a disclaimer." : `The “${page.template}” template expects a disclaimer at the bottom.`, fix: { label: "Add a disclaimer", apply: (bl) => [...bl, makeBlock("disclaimer")] } });
  else if (!hasSmallPrint && visible.length) push("compliance", { id: "no-smallprint", level: "info", title: "No small print", detail: "Financial promotions usually need a disclaimer or “Additional information”.", fix: { label: "Add a disclaimer", apply: (bl) => [...bl, makeBlock("disclaimer")] } });
  else if (visible.length) push("compliance", { id: "smallprint-ok", level: "ok", title: "Small print is in place", detail: "The page carries a disclaimer or additional information." });
  if (!items.compliance.some((i) => i.level === "warn" || i.level === "crit")) push("compliance", { id: "wording-ok", level: "ok", title: "No risky wording found", detail: "No promises like “guaranteed” or “no fees”." });

  /* ---- performance: kept out of the panel (estimates only) ---- */
  if (GROUP_ORDER.includes("performance")) {
  const heavy = visible.filter((b) => HEAVY_TYPES.includes(b.type));
  const renditions = imgBlocks.length * 3 + heavy.reduce((n, b) => n + lines(b.props.items).length, 0);
  if (visible.length > BLOCKS_MAX) push("performance", { id: "many-blocks", level: "warn", title: `Long page (${visible.length} blocks)`, detail: `Pages over ${BLOCKS_MAX} blocks load slower and are skimmed less. Move detail into an FAQ or a second page.` });
  else if (visible.length) push("performance", { id: "blocks-ok", level: "ok", title: "Page length is fine", detail: `${visible.length} of ${BLOCKS_MAX} recommended blocks.` });
  if (heavy.length) push("performance", { id: "heavy", level: "info", title: `${heavy.length} heavy block${heavy.length === 1 ? "" : "s"} (${heavy.map(name).join(", ")})`, detail: `${renditions} image rendition${renditions === 1 ? "" : "s"} to generate on publish.`, blockId: heavy[0].id });
  const words = visible.reduce((n, b) => n + allText(b).split(/\s+/).filter(Boolean).length, 0);
  if (words > 900) push("performance", { id: "words", level: "warn", title: `Long page (${words} words)`, detail: "Move detail into an FAQ or a second page." });
  else if (visible.length) push("performance", { id: "words-ok", level: "ok", title: `${words} words`, detail: "A comfortable read." });
  }

  const groups = GROUP_ORDER.map((id) => ({ id, title: GROUP_TITLE[id], score: groupScore(items[id]), items: items[id] }));
  const weights: Record<InsightGroupId, number> = { content: 35, accessibility: 25, seo: 15, compliance: 25, performance: 0 };
  const score = Math.round(groups.reduce((s, g) => s + g.score * weights[g.id], 0) / 100);
  return { score, groups };
}
const bl = (blocks: Block[], id: string) => blocks.find((b) => b.id === id)!;
function groupScore(list: Insight[]) { const crit = list.filter((i) => i.level === "crit").length, warn = list.filter((i) => i.level === "warn").length; return Math.max(0, Math.min(100, 100 - crit * 30 - warn * 12)); }

/** Crit and warn items across all groups, worst first — the "Fix these first" list. */
export const fixFirst = (r: PageInsights): Insight[] => r.groups.flatMap((g) => g.items).filter((i) => i.level === "crit" || i.level === "warn").sort((a, b) => (a.level === b.level ? 0 : a.level === "crit" ? -1 : 1));
export const scoreLabel = (n: number) => (n >= 90 ? "Good" : n >= 70 ? "Could be better" : "Needs attention");
export const scoreTone = (n: number): "good" | "warn" | "crit" => (n >= 90 ? "good" : n >= 70 ? "warn" : "crit");
/** Illustrative performance numbers (labelled "estimate" in the UI); deterministic per page. */
export function perfEstimate(blocks: Block[], page: PageMeta) {
  const seed = (page.title + blocks.length).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const imgs = blocks.filter((b) => typeof b.props.image === "string" && b.props.image).length;
  const heavy = blocks.filter((b) => HEAVY_TYPES.includes(b.type));
  const renditions = imgs * 3 + heavy.reduce((n, b) => n + lines(b.props.items).length, 0);
  const lcp = +(1.4 + imgs * 0.2 + (seed % 5) / 10).toFixed(1);
  const weight = +(0.6 + imgs * 0.35 + heavy.length * 0.15 + blocks.length * 0.03).toFixed(1);
  return { lcp, weight, renditions, cls: +((seed % 8) / 100).toFixed(2) };
}
