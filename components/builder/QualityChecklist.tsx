"use client";
import { useMemo } from "react";
import type { Block } from "@/lib/api/types";
import { BLOCK_BY_TYPE, makeBlock, missingRequired } from "@/lib/blocks/registry";
import { toPlain } from "@/lib/blocks/richtext";
import { pageInsights, HEADING_MAX, PARAGRAPH_MAX, VAGUE_CTAS, COMPLIANCE_WORDS, type PageMeta, type Insight } from "@/lib/ucp/insights";

/** What the pointer is on in the author's preview: a text (field key), an asset ("asset:n") or a whole component. */
export type QcTarget = { id: string; field?: string; text?: string; kind: "text" | "image" | "block" };
type Check = { ok: boolean | "warn"; label: string; value?: string };

const Mark = ({ ok }: { ok: Check["ok"] }) => ok === true
  ? <svg aria-label="Passed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
  : ok === "warn" ? <svg aria-label="Check this" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2.4" strokeLinecap="round"><path d="M12 7v6M12 17h.01" /><circle cx="12" cy="12" r="9" /></svg>
  : <svg aria-label="Needs fixing" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>;

function Rows({ checks }: { checks: Check[] }) {
  return <ul className="divide-y divide-line">{checks.map((c, i) => <li key={i} className="flex items-start gap-2.5 py-2.5">
    <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-ink">{c.label}</span>{c.value && <span className="block text-xs text-ink-2 mt-0.5 break-words">{c.value}</span>}</span>
    <span className="flex-none mt-0.5"><Mark ok={c.ok} /></span></li>)}</ul>;
}

const fieldOf = (key?: string) => key?.split("|")[1];
const isDefault = (b: Block, k: string, v: string) => { const d = toPlain(makeBlock(b.type).props[k]); return !!v && !!d && v.trim() === d.trim(); };

/** Checks for one piece of the page: its own rules plus what Page insights found for it. */
function elementChecks(b: Block, t: QcTarget, assets: PageMeta["assets"], found: Insight[]): Check[] {
  const def = BLOCK_BY_TYPE[b.type]; const out: Check[] = [];
  if (t.kind === "text") {
    const k = fieldOf(t.field) ?? ""; const text = (t.text ?? "").trim(); const heading = /heading|title/.test(k); const cta = k === "cta" || /button/i.test(k);
    out.push({ ok: !!text, label: "Has text", value: text ? undefined : "Empty" });
    const max = heading ? HEADING_MAX : PARAGRAPH_MAX;
    if (text) out.push({ ok: text.length <= max ? true : "warn", label: `Length (up to ${max})`, value: `${text.length} characters` });
    out.push({ ok: !isDefault(b, k, text), label: "Not the example text", value: isDefault(b, k, text) ? "Still the text the template came with" : undefined });
    if (cta || (b.type === "mastertiles" && t.field?.split("|")[2])) out.push({ ok: !VAGUE_CTAS.includes(text.toLowerCase()), label: "Button says what happens", value: VAGUE_CTAS.includes(text.toLowerCase()) ? `“${text}” is vague` : undefined });
    const risky = COMPLIANCE_WORDS.find((w) => text.toLowerCase().includes(w));
    out.push({ ok: !risky, label: "No risky wording", value: risky ? `“${risky}” needs compliance approval` : undefined });
    if (cta && "link" in b.props) { const l = String(b.props.link ?? "").trim(); out.push({ ok: !!l && l !== "#", label: "Button has a link", value: l && l !== "#" ? l : "No link yet" }); }
  } else if (t.kind === "image") {
    if (b.type === "mast") { const id = String(b.props.image ?? ""); const a = id ? assets?.[id] : undefined; out.push({ ok: !id ? "warn" : !!(a?.alt || a?.decorative), label: "Alt text", value: !id ? "No photo chosen" : a?.decorative ? "Marked decorative" : a?.alt ? a.alt : "No alt text · add it in Assets" }); }
    else out.push({ ok: true, label: "Decorative picture", value: "Screen readers skip it; the text next to it carries the meaning" });
  }
  const miss = missingRequired(b); out.push({ ok: !miss.length, label: `${def.name}: required fields`, value: miss.length ? `Missing: ${miss.join(", ")}` : undefined });
  const k = fieldOf(t.field);
  for (const i of found.filter((i) => i.blockId === b.id && i.level !== "ok" && (!k || !i.field || i.field === k))) out.push({ ok: i.level === "crit" ? false : "warn", label: i.title, value: i.detail });
  return out;
}

export function QualityChecklist({ blocks, meta, url, templateName, target }: { blocks: Block[]; meta: PageMeta; url: string; templateName: string; target: QcTarget | null }) {
  const insights = useMemo(() => pageInsights(blocks, meta), [blocks, meta]);
  const found = useMemo(() => insights.groups.flatMap((g) => g.items), [insights]);
  const b = target ? blocks.find((x) => x.id === target.id) : undefined;
  if (target && b) {
    const def = BLOCK_BY_TYPE[b.type]; const k = fieldOf(target.field); const fl = def.fields.find((f) => f.k === k)?.l;
    const what = target.kind === "image" ? "Picture" : target.kind === "text" ? fl ?? "Text" : "Whole component";
    return <div>
      <div className="rounded-lg bg-surface-2 border border-line px-3 py-2"><span className="block text-xs font-medium uppercase tracking-[.06em] text-ink-3">{def.name} · {what}</span>
        {target.text && <span className="block text-sm text-ink mt-0.5 line-clamp-3">“{target.text}”</span>}</div>
      <Rows checks={elementChecks(b, target, meta.assets, found)} />
    </div>;
  }
  const t = meta.title.trim(); const d = (meta.description ?? "").trim();
  const must = found.filter((i) => i.level === "crit"); const should = found.filter((i) => i.level === "warn");
  const page: Check[] = [
    { ok: !!t && t.length <= 60 ? true : t ? "warn" : false, label: "Title tag", value: t ? `${t} · ${t.length} characters` : "Missing" },
    { ok: !!d && d.length <= 160 ? true : d ? "warn" : "warn", label: "Meta description", value: d ? `${d} · ${d.length} characters` : "Missing · search results show text from the page instead" },
    { ok: true, label: "Canonical URL", value: url },
    { ok: true, label: "Page type", value: templateName },
    { ok: blocks.filter((x) => !x.props.hidden && x.type === "mast").length === 1 ? true : "warn", label: "One main heading (masthead)", value: undefined },
    { ok: !blocks.some((x) => missingRequired(x).length), label: "Required fields filled" },
    { ok: must.length === 0 ? (should.length ? "warn" : true) : false, label: "Page insights", value: must.length ? `${must.length} to fix · ${should.length} to check` : should.length ? `${should.length} to check` : "All checks pass" },
  ];
  return <div>
    <p className="text-xs text-ink-3 mb-1">Point at a text, a picture or a component to check it.</p>
    <Rows checks={page} />
    {[...must, ...should].length > 0 && <div className="mt-2 border-t border-line pt-2"><b className="block text-xs uppercase tracking-[.06em] text-ink-3 mb-1">To look at</b>
      <ul className="grid gap-1">{[...must, ...should].slice(0, 8).map((i) => <li key={i.id + (i.blockId ?? "")} className="flex gap-2 text-xs"><span aria-hidden className={`mt-1.5 w-2 h-2 rounded-full flex-none ${i.level === "crit" ? "bg-crit" : "bg-warn"}`} /><span>{i.title}</span></li>)}</ul></div>}
  </div>;
}
