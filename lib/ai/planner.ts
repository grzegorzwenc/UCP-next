import type { Block } from "@/lib/api/types";
import { BLOCK_BY_TYPE, makeBlock, lines, joinLines, missingRequired, TEMPLATES } from "@/lib/blocks/registry";
import { CY } from "@/lib/ucp/seed";

/**
 * Page-level AI planner. Pure and deterministic: it never calls a model. It reads the prompt and the current
 * blocks and returns a plan of small, labelled operations the author can switch on/off, run, review and undo.
 * Every op is a pure function over the block list, so the builder can snapshot before each one and revert it alone.
 * Replace `planFor` with a call to /api/ai (server-side model) when the AI service is wired up — the Op shape stays.
 */
export type OpKind = "set" | "add" | "remove" | "move" | "page";
export type Change = { block: string; field?: string; before?: string; after?: string };
export type Op = {
  id: string; label: string; kind: OpKind;
  apply(blocks: Block[]): Block[];
  describe(before: Block[], after: Block[]): Change[];
  /** kind 'page' only: a page-level field the builder sets through setPageField(k, v). */
  page?: { key: "description" | "title"; value: string };
};
export type PageInfo = { title: string; template?: string; status: string; locale: string; description?: string };
export type Plan = { title: string; understanding: string; ops: Op[]; note?: string };

export const AI_PAGE_SUGGESTIONS = ["Improve this page", "Create a promotional section for the new Premier Banking offer", "Translate this page", "Create mobile version", "Check accessibility", "Optimise SEO", "Design a landing page for Premier Banking"];

const nameOf = (b: Block) => BLOCK_BY_TYPE[b.type]?.name ?? b.type;
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const firstSentence = (s: string) => { const m = s.match(/^[^.!?]+[.!?]/); return m ? m[0].trim() : s; };
const shorten = (t: string, isHeading: boolean) => { if (!isHeading && /[.!?]/.test(t.slice(0, -1))) return firstSentence(t); const w = t.split(/\s+/); if (w.length <= 6) return t; return w.slice(0, Math.max(4, Math.ceil(w.length * 0.6))).join(" ").replace(/[,;:]$/, "") + (isHeading ? "" : "."); };
const CTA_MAP: Record<string, string> = { "find out more": "See what you could get", "learn more": "See how it works", "click here": "Apply now", "read more": "See the details", "more": "See the details" };
const VAGUE = /^(find out more|learn more|click here|read more|more|here)$/i;
const LANGS: Record<string, [string, string]> = { welsh: ["cy-GB", "Welsh"], cymraeg: ["cy-GB", "Welsh"], german: ["de-DE", "German"], french: ["fr-FR", "French"], spanish: ["es-ES", "Spanish"], polish: ["pl-PL", "Polish"], chinese: ["zh-HK", "Chinese"], arabic: ["ar-AE", "Arabic"] };
const TEXT_KEYS = ["heading", "intro", "body", "text", "cta", "note"];
/** "Create a promotional section for the new Premier Banking offer" → "Premier Banking" */
export const topicOf = (prompt: string, fallback: string) => { const m = prompt.match(/for (?:the |a |an )?(?:new )?([^.]+?)(?: offer| page| campaign| section| product)?\.?$/i); return m ? m[1].trim() : fallback; };

/* ---- op builders (all pure) ---- */
let seq = 0;
const nid = (k: string) => `${k}-${++seq}`;
const set = (bl: Block, key: string, value: unknown, label: string): Op => ({
  id: nid("set"), label, kind: "set",
  apply: (bs) => bs.map((b) => (b.id === bl.id ? { ...b, props: { ...b.props, [key]: value } } : b)),
  describe: (before, after) => { const a = after.find((b) => b.id === bl.id), o = before.find((b) => b.id === bl.id); return a ? [{ block: nameOf(a), field: key, before: str(o?.props[key]), after: str(a.props[key]) }] : []; },
});
/** One op that changes several fields across blocks (translate, tile tightening). `edits` = [blockId, key, value][]. */
const setMany = (edits: [string, string, unknown][], label: string): Op => ({
  id: nid("set"), label, kind: "set",
  apply: (bs) => bs.map((b) => { const mine = edits.filter((e) => e[0] === b.id); return mine.length ? { ...b, props: { ...b.props, ...Object.fromEntries(mine.map((e) => [e[1], e[2]])) } } : b; }),
  describe: (before, after) => edits.flatMap(([id, key]) => { const a = after.find((b) => b.id === id), o = before.find((b) => b.id === id); return a ? [{ block: nameOf(a), field: key, before: str(o?.props[key]), after: str(a.props[key]) }] : []; }),
});
const add = (block: Block, index: number | ((bs: Block[]) => number), label: string): Op => ({
  id: nid("add"), label, kind: "add",
  apply: (bs) => { const c = bs.slice(); const i = typeof index === "function" ? index(bs) : index; c.splice(Math.max(0, Math.min(i, c.length)), 0, block); return c; },
  describe: () => [{ block: nameOf(block), after: "added block" + (block.props.heading ? `: “${str(block.props.heading)}”` : "") }],
});
const replaceAll = (blocks: Block[], label: string): Op => ({
  id: nid("add"), label, kind: "add",
  apply: () => blocks.slice(),
  describe: (before) => [...before.map((b) => ({ block: nameOf(b), before: "removed block" })), ...blocks.map((b) => ({ block: nameOf(b), after: "added block" + (b.props.heading ? `: “${str(b.props.heading)}”` : "") }))],
});
const pageOp = (key: "description" | "title", value: string, before: string | undefined, label: string): Op => ({
  id: nid("page"), label, kind: "page", page: { key, value },
  apply: (bs) => bs, describe: () => [{ block: "Page", field: key === "description" ? "meta description" : key, before: before ?? "", after: value }],
});
const noop = (label: string): Op => ({ id: nid("note"), label, kind: "page", apply: (bs) => bs, describe: () => [] });

/**
 * Revert a single op on the *current* blocks using the snapshots taken around it: added blocks are removed,
 * removed blocks are put back where they were, changed props go back to their previous values. Later ops on
 * other fields are left alone, so one change can be undone without losing the rest.
 */
export function revertOp(cur: Block[], before: Block[], after: Block[]): Block[] {
  const bIds = new Set(before.map((b) => b.id)), aIds = new Set(after.map((b) => b.id));
  let out = cur.filter((b) => !(aIds.has(b.id) && !bIds.has(b.id)));
  before.forEach((b, i) => { if (!aIds.has(b.id) && !out.some((x) => x.id === b.id)) { const c = out.slice(); c.splice(Math.min(i, c.length), 0, b); out = c; } });
  return out.map((b) => { const o = before.find((x) => x.id === b.id), a = after.find((x) => x.id === b.id); if (!o || !a) return b; const props = { ...b.props }; let changed = false; for (const k of new Set([...Object.keys(o.props), ...Object.keys(a.props)])) if (o.props[k] !== a.props[k]) { props[k] = o.props[k]; changed = true; } return changed ? { ...b, props } : b; });
}

/* ---- individual planners ---- */
function improveOps(blocks: Block[], page: PageInfo): Op[] {
  const ops: Op[] = [];
  const mast = blocks.find((b) => b.type === "mast");
  if (mast && str(mast.props.intro).length > 70) ops.push(set(mast, "intro", shorten(str(mast.props.intro), false), "Rewrite the masthead sub-heading to be more concise"));
  if (mast && !str(mast.props.cta).trim()) ops.push(set(mast, "cta", "Apply now", "Add a primary call to action to the masthead"));
  for (const b of blocks) { const h = str(b.props.heading); if (h.length > 60) ops.push(set(b, "heading", shorten(h, true), `Shorten the heading in ${nameOf(b)}`)); }
  for (const b of blocks) { const body = str(b.props.body); if (body.length > 220) { const paras = body.split(/\n\s*\n/); const tight = paras.slice(0, 2).map((p) => { const s = p.split(/(?<=[.!?])\s+/); return s.slice(0, 2).join(" "); }).join("\n\n"); if (tight !== body) ops.push(set(b, "body", tight, `Tighten the intro copy in ${nameOf(b)}`)); } }
  for (const b of blocks) for (const k of ["cta"]) { const v = str(b.props[k]).trim(); if (v && VAGUE.test(v)) ops.push(set(b, k, CTA_MAP[v.toLowerCase()] ?? "Apply now", `Make the ${nameOf(b)} button more compelling`)); }
  // long tile descriptions (lines fields with a "Text" column)
  const edits: [string, string, unknown][] = []; let n = 0;
  for (const b of blocks) for (const f of BLOCK_BY_TYPE[b.type]?.fields ?? []) { if (f.t !== "lines" || !f.hint) continue; const ci = f.hint.split("|").map((c) => c.trim().toLowerCase()).findIndex((c) => c === "text"); if (ci < 0) continue; const rows = lines(b.props[f.k]); let touched = false; const next = rows.map((r) => { const t = r[ci] ?? ""; if (t.length > 110) { const s = shorten(t, false); if (s !== t) { n++; touched = true; const c = r.slice(); c[ci] = s; return c; } } return r; }); if (touched) edits.push([b.id, f.k, joinLines(next)]); }
  if (n) ops.push(setMany(edits, `Tighten ${n} long tile description${n === 1 ? "" : "s"}`));
  for (const b of blocks) for (const f of missingRequired(b)) { if (f.t === "text" || f.t === "textarea") ops.push(set(b, f.k, f.k === "heading" ? page.title : str(BLOCK_BY_TYPE[b.type].defaults[f.k]) || `About ${page.title}`, `Fill in the empty ${f.l.toLowerCase()} in ${nameOf(b)}`)); }
  if (!blocks.some((b) => b.type === "faq")) { const anchor = blocks.find((b) => b.type === "icontiles" || b.type === "contentmaster" || b.type === "text"); const faq = makeBlock("faq", { heading: "Questions before you apply", items: "Will checking affect my credit score? | No. The eligibility check is a soft search.\nHow long does a decision take? | Most customers get a decision in under 10 minutes." }); ops.push(add(faq, (bs) => (anchor ? bs.findIndex((x) => x.id === anchor.id) + 1 : Math.max(0, bs.length - 1)), anchor ? `Add an FAQ block after ${nameOf(anchor)}` : "Add an FAQ block")); }
  if (!blocks.some((b) => ["banner", "form", "mastertiles"].includes(b.type))) ops.push(add(makeBlock("banner", { heading: "Ready to get started?", text: "Apply online in about five minutes.", cta: "Apply now", style: "dark" }), (bs) => Math.min(2, bs.length), "Add a Call-to-action banner"));
  if (!blocks.some((b) => b.type === "footnotes" || b.type === "disclaimer")) ops.push(add(makeBlock("footnotes", {}), (bs) => bs.length, "Add the regulatory “Additional information” section"));
  return ops;
}
function promoOps(blocks: Block[], topic: string): Op[] {
  const at = (bs: Block[]) => Math.min(bs.findIndex((b) => b.type === "mast") + 1 || 0, bs.length);
  const banner = makeBlock("banner", { heading: `Discover ${topic}`, text: "Eligibility criteria apply. Talk to us or apply online in minutes.", cta: "Apply now", link: "#", style: "dark" });
  const text = makeBlock("text", { heading: topic, body: `${topic} gives you a dedicated relationship manager, preferential rates and worldwide support, with no monthly fee when you meet the eligibility criteria.\n\nEligibility criteria apply. Credit is subject to status.` });
  return [add(text, at, `Add a Rich text block introducing “${topic}” after the masthead`), add(banner, (bs) => at(bs) + 1, `Add a Call-to-action banner for ${topic}`)];
}
function translateOps(blocks: Block[], locale: string, lang: string): Op[] {
  const tr = (t: string) => CY[t] ?? (locale === "cy-GB" ? (CY[t.trim()] ?? `${t} (cy)`) : `${t} (${locale.split("-")[0]})`);
  const edits: [string, string, unknown][] = [];
  for (const b of blocks) for (const k of TEXT_KEYS) { const v = b.props[k]; if (typeof v === "string" && v.trim()) edits.push([b.id, k, tr(v)]); }
  return edits.length ? [setMany(edits, `Translate ${edits.length} text field${edits.length === 1 ? "" : "s"} to ${lang} (${locale})`)] : [];
}
function mobileOps(blocks: Block[]): Op[] {
  const ops: Op[] = [];
  for (const b of blocks) if (["mastertiles", "rates", "linktiles"].includes(b.type) && !b.props.hideMobile) ops.push(set(b, "hideMobile", true, `Hide ${nameOf(b)} on mobile (heavy block)`));
  for (const b of blocks) { const h = str(b.props.heading); if (h.length > 48) ops.push(set(b, "heading", shorten(h, true), `Shorten the heading in ${nameOf(b)} so it fits on 390 px`)); }
  for (const b of blocks) for (const k of ["intro", "text"]) { const v = str(b.props[k]); if (v.length > 80) ops.push(set(b, k, shorten(v, false), `Shorten the ${k === "intro" ? "sub-heading" : "text"} in ${nameOf(b)}`)); }
  if (!blocks.some((b) => b.type === "banner")) ops.push(add(makeBlock("banner", { heading: "Apply in the app", text: "Five minutes, no paperwork.", cta: "Open the app", style: "dark" }), (bs) => Math.min(2, bs.length), "Add a thumb-reachable call-to-action banner"));
  return ops;
}
function accessibilityOps(blocks: Block[], page: PageInfo): Op[] {
  const ops: Op[] = [];
  const imgs = blocks.filter((b) => BLOCK_BY_TYPE[b.type]?.fields.some((f) => f.t === "asset") && str(b.props.image) && !str(b.props.alt));
  if (imgs.length) ops.push(setMany(imgs.map((b) => [b.id, "alt", `Photo: ${str(b.props.heading) || page.title}`]), `Set alt text on ${imgs.length} image${imgs.length === 1 ? "" : "s"}`));
  const masts = blocks.filter((b) => b.type === "mast");
  if (masts.length === 0 && blocks.length) { const first = blocks[0]; if (BLOCK_BY_TYPE[first.type]?.fields.some((f) => f.k === "heading") && !str(first.props.heading)) ops.push(set(first, "heading", page.title, `Add a page heading (h1) to ${nameOf(first)}`)); }
  for (const b of blocks) { const h = BLOCK_BY_TYPE[b.type]?.fields.find((f) => f.k === "heading"); if (h && !str(b.props.heading) && b.type !== "mast" && !h.req) ops.push(set(b, "heading", BLOCK_BY_TYPE[b.type].defaults.heading, `Add a heading to ${nameOf(b)} so screen readers can skip to it`)); }
  for (const b of blocks) { const v = str(b.props.cta).trim(); if (v && VAGUE.test(v)) ops.push(set(b, "cta", `Find out more about ${str(b.props.heading) || page.title}`.replace(/\.$/, ""), `Make the “${v}” link in ${nameOf(b)} descriptive`)); }
  return ops;
}
function seoOps(blocks: Block[], page: PageInfo): Op[] {
  const ops: Op[] = [];
  const mast = blocks.find((b) => b.type === "mast"); const cm = blocks.find((b) => b.type === "contentmaster" || b.type === "text");
  const src = [str(mast?.props.intro), firstSentence(str(cm?.props.body))].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  let desc = src || `${page.title} from HSBC UK. Compare options, check eligibility and apply online.`;
  if (!/hsbc/i.test(desc)) desc = `${desc.replace(/\.$/, "")}. ${page.title} from HSBC UK.`;
  if (desc.length > 155) desc = desc.slice(0, 152).replace(/\s+\S*$/, "") + "…";
  if (desc !== (page.description ?? "")) ops.push(pageOp("description", desc, page.description, "Set a meta description (≤155 characters)"));
  if (mast && str(mast.props.heading).toLowerCase() !== page.title.toLowerCase() && str(mast.props.heading).length > 0 && !str(mast.props.heading).toLowerCase().includes(page.title.toLowerCase())) ops.push(set(mast, "heading", page.title, "Align the h1 with the page title (primary keyword)"));
  if (!blocks.some((b) => b.type === "faq")) ops.push(add(makeBlock("faq", { heading: `${page.title}: common questions`, items: `Can I apply for ${page.title.toLowerCase()} online? | Yes, most customers can apply online in about five minutes.\nWho is eligible? | You need to be a UK resident aged 18 or over. Eligibility criteria apply.` }), (bs) => Math.max(0, bs.length - 1), "Add an FAQ block (eligible for FAQ rich results)"));
  for (const b of blocks) for (const f of BLOCK_BY_TYPE[b.type]?.fields ?? []) { if (f.t !== "lines" || !f.hint) continue; const ci = f.hint.split("|").map((c) => c.trim().toLowerCase()).findIndex((c) => c === "link"); if (ci < 0) continue; const rows = lines(b.props[f.k]); if (rows.some((r) => !(r[ci] ?? "").trim() || r[ci] === "#")) ops.push(set(b, f.k, joinLines(rows.map((r) => { const c = r.slice(); if (!(c[ci] ?? "").trim() || c[ci] === "#") c[ci] = `/${(c[0] ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`; return c; })), `Fill in empty links in ${nameOf(b)} (crawlable internal links)`)); }
  return ops;
}
function designOps(blocks: Block[], topic: string): Op[] {
  const layout = () => [
    makeBlock("mast", { heading: topic, intro: "Banking that goes further, with a dedicated relationship manager and preferential rates.", cta: "Check eligibility", link: "#", image: "hero-cards" }),
    makeBlock("contentmaster", { heading: `What is ${topic}?`, body: `${topic} brings together everyday banking, savings and borrowing with a personal relationship manager and worldwide support.` }),
    makeBlock("icontiles", { heading: "Benefits at a glance", items: "star | Preferential rates | Better rates across savings, mortgages and FX.\nwallet | Personal support | Relationship manager and a 24/7 priority line.\nbag | Worldwide cover | Travel insurance and emergency assistance." }),
    makeBlock("facts", { heading: "Key facts", items: "Monthly fee | £0 with eligibility\nRelationship manager | Yes\nWorldwide support | 24/7" }),
    makeBlock("faq", { heading: "Common questions", items: `Who can apply for ${topic}? | Customers who meet the income or savings criteria. Eligibility criteria apply.\nHow long does it take? | Apply online in about ten minutes.` }),
    makeBlock("banner", { heading: `Ready to join ${topic}?`, text: "Apply online in about ten minutes. Eligibility criteria apply.", cta: "Apply now", link: "#", style: "dark" }),
    makeBlock("footnotes", { items: `Eligibility criteria apply. Credit is subject to status.\n${topic} is available to customers who meet the income or savings criteria.` }),
  ];
  if (!blocks.length) return [replaceAll(layout(), `Build a 7-block campaign landing page for ${topic} from the component library`)];
  const [, cm, icons, , , banner] = layout();
  const at = (bs: Block[]) => Math.max(0, bs.length - (bs.some((b) => b.type === "footnotes" || b.type === "disclaimer") ? 1 : 0));
  return [add(cm, at, `Add a Content master section for ${topic}`), add(icons, at, "Add Icon tiles with three benefits"), add(banner, at, `Add a call to action “Apply now” for ${topic}`)];
}

/** Build a plan for a natural-language prompt. Deterministic; safe to call on every keystroke. */
export function planFor(prompt: string, blocks: Block[], page: PageInfo): Plan {
  seq = 0;
  const c = prompt.trim().toLowerCase();
  const tpl = TEMPLATES.find((t) => t.id === page.template)?.name ?? page.template ?? "no";
  const names = [...new Set(blocks.map(nameOf))];
  const understanding = `“${page.title}” has ${blocks.length} block${blocks.length === 1 ? "" : "s"}${names.length ? ` (${names.slice(0, 4).join(", ")}${names.length > 4 ? ", …" : ""})` : ""}, uses the ${tpl} template and is ${page.status}. Locale ${page.locale}.`;
  const topic = topicOf(prompt, page.title);
  if (/design|landing page|build a page/.test(c)) return { title: `Design a landing page for ${topic}`, understanding, ops: designOps(blocks, topic), note: blocks.length ? "The page already has content, so the campaign section is appended above the small print instead of replacing anything." : undefined };
  if (/translat|welsh|cymraeg|german|french|spanish|polish/.test(c)) {
    const hit = Object.keys(LANGS).find((k) => c.includes(k)); const [loc, lang] = hit ? LANGS[hit] : ["cy-GB", "Welsh"];
    return { title: `Translate this page to ${lang}`, understanding: `${understanding} Target locale: ${loc}.`, ops: translateOps(blocks, loc, lang), note: `Only phrases from the HSBC glossary are translated properly; everything else is marked “(${loc.split("-")[0]})” as a draft. Full machine translation needs the AI service (UCP_AI_URL), which is not connected.` };
  }
  if (/mobile|small screen|phone/.test(c)) return { title: "Create mobile version", understanding, ops: mobileOps(blocks), note: "Heavy blocks are hidden on mobile with the “Hide on mobile” switch (you can turn any of them back on in Configure → Behaviour)." };
  if (/accessib|wcag|a11y|screen reader/.test(c)) { const ops = accessibilityOps(blocks, page); return { title: "Check accessibility", understanding, ops, note: ops.length ? "Contrast and focus order come from the HSBC design system and pass WCAG 2.2 AA without changes." : "No accessibility issues found · WCAG 2.2 AA. Contrast, focus order and heading order all pass." }; }
  if (/seo|search engine|meta|keyword/.test(c)) return { title: "Optimise SEO", understanding, ops: seoOps(blocks, page), note: "The meta description is a page setting: it is applied to Page settings and saved with the page." };
  if (/promo|section|offer|campaign/.test(c)) return { title: `Create a promotional section for ${topic}`, understanding, ops: promoOps(blocks, topic) };
  if (/improve|better|polish|tidy|concise|shorter|compelling/.test(c)) { const ops = improveOps(blocks, page); return { title: "Improve this page", understanding, ops: ops.length ? ops : [noop("Page already follows HSBC content patterns — nothing to change")] }; }
  const ops = improveOps(blocks, page);
  return { title: prompt.trim(), understanding, ops: [noop("This request needs the AI service (not connected) — here is what I can do offline"), ...ops], note: "Only the offline suggestions below are applied. Connect the AI service (UCP_AI_URL) to run free-form requests." };
}
