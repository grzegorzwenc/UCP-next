import type { Block } from "@/lib/api/types";
import { BLOCK_BY_TYPE, lines, joinLines } from "@/lib/blocks/registry";

/**
 * Block-scoped AI proposals. This is a deterministic stand-in: it never calls a model. Each suggestion returns
 * the changed props plus a note, and the UI shows a before/after diff that the author must Apply.
 * Replace `proposeAi` with a call to /api/ai (server-side model) when the AI service is wired up.
 */
export type AiProposal = { prompt: string; note: string; props: Record<string, unknown> };
export const AI_SUGGESTIONS = ["Make this more concise", "Make the CTA more compelling", "Generate alternative copy", "Translate to German"];

const firstSentence = (s: string) => { const m = s.match(/^[^.!?]+[.!?]/); return m ? m[0].trim() : s; };
const CTA_MAP: Record<string, string> = { "apply now": "Apply in minutes", "find out more": "See what you could get", "learn more": "See how it works", "get started": "Start today", "continue": "Continue securely" };
const DE: Record<string, string> = { "credit cards": "Kreditkarten", "rewards credit cards": "Bonus-Kreditkarten", "apply now": "Jetzt beantragen", "find out more": "Mehr erfahren", "current accounts": "Girokonten", "savings": "Sparen", "mortgages": "Hypotheken", "loans": "Kredite" };

export function proposeAi(prompt: string, b: Block): AiProposal {
  const p = prompt.toLowerCase(); const def = BLOCK_BY_TYPE[b.type]; const props: Record<string, unknown> = {};
  const textFields = def.fields.filter((f) => f.t === "text" || f.t === "textarea").map((f) => f.k);
  const ctaFields = def.fields.filter((f) => f.k === "cta" || f.l.toLowerCase().includes("button label")).map((f) => f.k);
  if (p.includes("concise") || p.includes("shorter")) {
    for (const k of textFields) { const v = String(b.props[k] ?? ""); if (v.length > 60) { const s = firstSentence(v); if (s !== v) props[k] = s; } }
    if (def.fields.some((f) => f.t === "lines")) { const k = def.fields.find((f) => f.t === "lines")!.k; const rows = lines(b.props[k]).map((r) => r.map((c) => (c.length > 60 ? firstSentence(c) : c))); const j = joinLines(rows); if (j !== String(b.props[k] ?? "")) props[k] = j; }
    return { prompt, note: Object.keys(props).length ? "Kept the first sentence of each long text. Review before applying." : "Nothing here is long enough to shorten.", props };
  }
  if (p.includes("cta") || p.includes("button") || p.includes("compelling")) {
    for (const k of ctaFields) { const v = String(b.props[k] ?? "").trim(); if (v) props[k] = CTA_MAP[v.toLowerCase()] ?? `${v} today`; }
    if (!ctaFields.length && def.fields.some((f) => f.t === "lines")) { const f = def.fields.find((x) => x.t === "lines")!; const cols = (f.hint ?? "").split("|").map((c) => c.trim().toLowerCase()); const ci = cols.findIndex((c) => c.includes("button")); if (ci >= 0) { const rows = lines(b.props[f.k]).map((r) => { const n = r.slice(); const v = (n[ci] ?? "").trim(); n[ci] = CTA_MAP[v.toLowerCase()] ?? (v ? `${v} today` : "Apply in minutes"); return n; }); props[f.k] = joinLines(rows); } }
    return { prompt, note: Object.keys(props).length ? "Action-led button labels. Check the tone against the HSBC voice guide." : "This block has no button.", props };
  }
  if (p.includes("alternative") || p.includes("rewrite") || p.includes("variant")) {
    const h = String(b.props.heading ?? ""); if (h) props.heading = h.endsWith("?") ? h : `${h}: what you need to know`;
    const sub = textFields.find((k) => k !== "heading" && b.props[k]); if (sub) props[sub] = `Compare options, check eligibility and apply online in minutes. ${firstSentence(String(b.props[sub]))}`;
    return { prompt, note: "One alternative. Ask again for another variant.", props };
  }
  if (p.includes("german") || p.includes("translate")) {
    for (const k of textFields) { const v = String(b.props[k] ?? ""); const t = DE[v.toLowerCase()]; if (t) props[k] = t; }
    return { prompt, note: Object.keys(props).length ? "Only phrases from the demo glossary were translated. Full translation needs the AI service." : "Translation needs the AI service (UCP_AI_URL). The mock only knows a few demo phrases.", props };
  }
  return { prompt, note: "This prompt needs the AI service (not connected in the mock). Try one of the suggestions above.", props };
}
