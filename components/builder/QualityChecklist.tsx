"use client";
import { useMemo } from "react";
import { PanelSection } from "./panels/PanelSection";
import type { Block } from "@/lib/api/types";
import { BLOCK_BY_TYPE, makeBlock, missingRequired } from "@/lib/blocks/registry";
import { toPlain } from "@/lib/blocks/richtext";
import { pageInsights, HEADING_MAX, PARAGRAPH_MAX, VAGUE_CTAS, COMPLIANCE_WORDS, type PageMeta, type Insight } from "@/lib/ucp/insights";

/** What the pointer is on in the author's preview: a text (field key), an asset ("asset:n") or a whole component. */
export type QcTarget = { id: string; field?: string; text?: string; kind: "text" | "image" | "block" };
type Check = { ok: boolean | "warn"; label: string; value?: string; /** the block this row is about, when it is about one: the row then takes you there */ blockId?: string };

/** One band of the checklist, on the same section as Page insights: a rotating chevron and a
 *  BDL count badge, red on the band that blocks review. */
function Section({ id, title, tone, rows, onShow, collapsed }: { id: string; title: string; tone: "crit" | "warn"; rows: Check[]; onShow?: (blockId: string) => void;
  /** Starts folded away, for the band that does not block anything. */
  collapsed?: boolean }) {
  if (!rows.length) return null;
  return <PanelSection id={id} title={title} count={rows.length} tone={tone === "crit" ? "crit" : undefined} defaultOpen={!collapsed}>
    <Rows checks={rows} onShow={onShow} />
  </PanelSection>;
}
function Rows({ checks, onShow }: { checks: Check[]; onShow?: (blockId: string) => void }) {
  /* A row that is not passing and names a block takes you to it. A passing row, or one about the
     page rather than a place on it (the title tag, say), stays plain text — nothing should look
     clickable unless there is somewhere to go. */
  return <ul className="divide-y divide-line">{checks.map((c, i) => {
    const body = <>
      <span aria-hidden className={`mt-1.5 h-2 w-2 flex-none rounded-full ${c.ok === false ? "[background-color:var(--color-bdl-rag-red)]" : c.ok === "warn" ? "bg-warn" : "bg-good"}`} />
      <span className="min-w-0 flex-1"><span className="block text-sm leading-snug font-medium text-ink"><span className="sr-only">{c.ok === false ? "Must fix: " : c.ok === "warn" ? "Should fix: " : "Passed: "}</span>{c.label}</span>{c.value && <span className="mt-0.5 block text-xs leading-relaxed break-words text-ink-3">{c.value}</span>}</span></>;
    const go = c.ok !== true && c.blockId && onShow;
    const must = c.ok === false;
    const skin = must ? "-mx-3 border-s-2 px-3 ps-2.5 [background-color:var(--color-bdl-error-bg)] [border-inline-start-color:transparent] hover:[border-inline-start-color:var(--color-bdl-rag-red)]" : "";
    return <li key={i}>{go
      ? <button type="button" onClick={() => onShow!(c.blockId!)} title={`${c.label} — show it on the page`} className={`flex w-full cursor-pointer items-start gap-2.5 py-2.5 text-left ${skin} [&>span:first-child>span:first-child]:underline-offset-2 hover:[&>span:first-child>span:first-child]:underline`}>{body}</button>
      : <span className={`flex items-start gap-2.5 py-2.5 ${skin}`}>{body}</span>}</li>; })}</ul>;
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

export function QualityChecklist({ blocks, meta, url, templateName, target, onShow, onSend }: { blocks: Block[]; meta: PageMeta; url: string; templateName: string; target: QcTarget | null; /** show a block on the page: scroll to it and flash it */ onShow?: (blockId: string) => void; /** send the page for review from here, when nothing blocks it */ onSend?: () => void }) {
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
  const masts = blocks.filter((x) => !x.props.hidden && x.type === "mast");
  const firstMissing = blocks.find((x) => missingRequired(x).length);
  const needsFields = firstMissing ? { block: firstMissing, label: BLOCK_BY_TYPE[firstMissing.type]?.name ?? firstMissing.type } : null;
  /* One list, split by what it asks of you: Must fix, Should fix, Passed. It used to be a flat run
     of checks with a tick or a cross, followed by a separate "To look at" list — so a Must-fix item
     appeared twice (once as "Page insights · 1 to fix", once by name) and the two lists disagreed
     about how serious anything was. The "Page insights" summary row is gone: the items are here. */
  const page: Check[] = [
    { ok: !!t && t.length <= 60 ? true : t ? "warn" : false, label: "Title tag", value: t ? `${t} · ${t.length} characters` : "Missing" },
    { ok: !!d && d.length <= 160 ? true : d ? "warn" : "warn", label: "Meta description", value: d ? `${d} · ${d.length} characters` : "Missing · search results show text from the page instead" },
    { ok: true, label: "Canonical URL", value: url },
    { ok: true, label: "Page type", value: templateName },
    { ok: masts.length === 1 ? true : "warn", label: "One main heading (masthead)", value: masts.length ? undefined : "No masthead on the page", blockId: masts[1]?.id ?? masts[0]?.id },
    { ok: !needsFields, label: "Required fields filled", value: needsFields ? `${needsFields.label}: ${missingRequired(needsFields.block).map((f) => f.l).join(", ")}` : undefined, blockId: needsFields?.block.id },
  ];
  const asCheck = (i: Insight): Check => ({ ok: i.level === "crit" ? false : "warn", label: i.title, value: i.detail, blockId: i.blockId });
  const mustRows = [...page.filter((c) => c.ok === false), ...must.map(asCheck)];
  const shouldRows = [...page.filter((c) => c.ok === "warn"), ...should.map(asCheck)];

  return <div className="-mx-3.5 -mt-3.5 flex flex-col text-ink">
    <div className="px-3.5 pt-3.5">
    <p className="mb-2 text-xs text-ink-3">Point at a text, a picture or a component to check it.</p>
    {/* The decision lives here rather than in a dialog after the preview: the list of what is wrong
        and the button that acts on it are the same panel, so there is nothing to remember. */}
    {onSend && (mustRows.length
      ? <p role="status" className="alert alert-error mb-3 text-sm"><span>This page cannot go for review until the {mustRows.length} <b>Must fix</b> {mustRows.length === 1 ? "item is" : "items are"} done.</span></p>
      : <p className="mb-3 text-xs text-ink-3">{shouldRows.length ? `${shouldRows.length} thing${shouldRows.length === 1 ? "" : "s"} to check, none blocking` : "Nothing is blocking it"}</p>)}
    </div>
    <Section id="qc-must" title="Must fix" tone="crit" rows={mustRows} onShow={onShow} />
    <Section id="qc-should" title="Should fix" tone="warn" rows={shouldRows} onShow={onShow} collapsed />
  </div>;
}
