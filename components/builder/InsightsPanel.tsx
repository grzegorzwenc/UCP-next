"use client";
import { useMemo, useState } from "react";
import type { Block } from "@/lib/api/types";
import { pageInsights, fixFirst, scoreLabel, scoreTone, perfEstimate, type Insight, type InsightGroup, type InsightLevel, type PageMeta } from "@/lib/ucp/insights";

type Props = {
  blocks: Block[];
  page: PageMeta;
  onFix: (apply: (b: Block[]) => Block[], label: string) => void;
  onSelectBlock: (id: string) => void;
};

const TONE_VAR: Record<"good" | "warn" | "crit", string> = { good: "var(--good)", warn: "var(--warn)", crit: "var(--crit)" };
const LEVEL_DOT: Record<InsightLevel, string> = { crit: "bg-crit", warn: "bg-warn", ok: "bg-good", info: "bg-info" };
const LEVEL_WORD: Record<InsightLevel, string> = { crit: "Must fix", warn: "Should fix", ok: "Fine", info: "Idea" };

/* ---------------- score dial (SVG ring, colour by score) ---------------- */
function ScoreDial({ score }: { score: number }) {
  const r = 34, c = 2 * Math.PI * r, tone = scoreTone(score);
  return <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`Page score ${score} out of 100, ${scoreLabel(score)}`}>
    <circle cx="44" cy="44" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
    <circle cx="44" cy="44" r={r} fill="none" stroke={TONE_VAR[tone]} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} transform="rotate(-90 44 44)" style={{ transition: "stroke-dasharray .4s ease" }} />
    <text x="44" y="44" textAnchor="middle" dominantBaseline="central" fontSize="24" fontWeight="600" fill="var(--ink)">{score}</text>
  </svg>;
}

/* ---------------- one finding row ---------------- */
function InsightRow({ item, onFix, onSelectBlock }: { item: Insight; onFix: Props["onFix"]; onSelectBlock: Props["onSelectBlock"] }) {
  const muted = item.level === "ok";
  return <li className={`flex items-start gap-2.5 py-2.5 border-b border-line last:border-0 ${muted ? "opacity-60" : ""}`}>
    <span aria-hidden="true" className={`mt-1.5 w-2 h-2 rounded-full flex-none ${LEVEL_DOT[item.level]}`} />
    <div className="min-w-0 flex-1">
      <div className="text-[13px] font-medium text-ink leading-snug"><span className="sr-only">{LEVEL_WORD[item.level]}: </span>{item.title}</div>
      <div className="text-[12px] text-ink-3 mt-0.5 leading-relaxed">{item.detail}</div>
      {(item.blockId || item.fix) && !muted && <div className="mt-1.5 flex gap-1.5">
        {item.blockId && <button type="button" className="btn btn-sm" onClick={() => onSelectBlock(item.blockId!)}>Show</button>}
        {item.fix && <button type="button" className="btn btn-sm btn-primary" onClick={() => onFix(item.fix!.apply, item.fix!.label)}>{item.fix.label}</button>}
      </div>}
    </div>
  </li>;
}

/* ---------------- collapsible group with score bar ---------------- */
function GroupSection({ group, onFix, onSelectBlock }: { group: InsightGroup; onFix: Props["onFix"]; onSelectBlock: Props["onSelectBlock"] }) {
  const todo = group.items.filter((i) => i.level === "crit" || i.level === "warn").length;
  const [open, setOpen] = useState(todo > 0);
  const tone = scoreTone(group.score);
  return <section className="border border-line rounded-lg bg-surface">
    <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="text-ink-3 text-[11px] w-3" aria-hidden="true">{open ? "▾" : "▸"}</span>
      <span className="text-[13px] font-semibold text-ink flex-1">{group.title}</span>
      <span className="text-[12px] text-ink-3">{todo ? `${todo} to fix` : "All good"}</span>
      <span className="w-20 h-1.5 rounded-full bg-line overflow-hidden" aria-hidden="true"><span className="block h-full rounded-full" style={{ width: `${group.score}%`, background: TONE_VAR[tone] }} /></span>
      <span className="text-[12px] font-mono text-ink-2 w-7 text-right">{group.score}</span>
    </button>
    {open && <ul className="px-3 pb-1 border-t border-line">{group.items.map((i) => <InsightRow key={i.id} item={i} onFix={onFix} onSelectBlock={onSelectBlock} />)}</ul>}
  </section>;
}

/* ---------------- panel ---------------- */
export function InsightsPanel({ blocks, page, onFix, onSelectBlock }: Props) {
  const result = useMemo(() => pageInsights(blocks, page), [blocks, page]);
  const first = useMemo(() => fixFirst(result), [result]);
  const perf = useMemo(() => perfEstimate(blocks, page), [blocks, page]);
  const tone = scoreTone(result.score);
  const label = scoreLabel(result.score);
  return <div className="grid gap-4 text-ink">
    <header>
      <h2 className="text-[15px] font-semibold">Page insights</h2>
      <p className="text-[12px] text-ink-3 mt-0.5">{page.status === "published" ? "Checked against the live page" : "Checked as you edit · not live yet"}</p>
    </header>

    <div className="flex items-center gap-4 p-3 rounded-lg border border-line bg-surface">
      <ScoreDial score={result.score} />
      <div className="min-w-0">
        <div className="text-[15px] font-semibold" style={{ color: TONE_VAR[tone] }}>{label}</div>
        <div className="text-[12px] text-ink-3 mt-0.5 leading-relaxed">Page score combines content, accessibility, search, compliance and speed.</div>
        <div className="text-[12px] text-ink-2 mt-1">{first.length ? `${first.length} thing${first.length === 1 ? "" : "s"} to fix` : "Nothing to fix"}</div>
      </div>
    </div>

    <section>
      <h3 className="text-[11.5px] uppercase tracking-[.06em] text-ink-3 font-semibold mb-1">{first.length ? "Fix these first" : "Nothing to fix"}</h3>
      {first.length
        ? <ul className="border border-line rounded-lg bg-surface px-3">{first.map((i) => <InsightRow key={i.id} item={i} onFix={onFix} onSelectBlock={onSelectBlock} />)}</ul>
        : <div className="p-4 rounded-lg bg-good-soft text-good text-[13px]"><b>All clear.</b> Content, accessibility, search, compliance and speed all look good.</div>}
    </section>

    <section className="grid gap-2">
      <h3 className="text-[11.5px] uppercase tracking-[.06em] text-ink-3 font-semibold">By area</h3>
      {result.groups.map((g) => <GroupSection key={g.id} group={g} onFix={onFix} onSelectBlock={onSelectBlock} />)}
    </section>

    <section className="border border-line rounded-lg bg-surface p-3">
      <div className="flex items-center gap-2 mb-2"><h3 className="text-[13px] font-semibold">Speed</h3><span className="text-[10.5px] uppercase tracking-[.06em] px-1.5 py-0.5 rounded bg-surface-3 text-ink-3">estimate</span></div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Main image shows in</dt><dd className={`text-[16px] font-semibold ${perf.lcp > 2.5 ? "text-warn" : "text-ink"}`}>{perf.lcp} s</dd></div>
        <div className="rounded-md bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Page weight</dt><dd className={`text-[16px] font-semibold ${perf.weight > 2 ? "text-warn" : "text-ink"}`}>{perf.weight} MB</dd></div>
        <div className="rounded-md bg-surface-2 p-2"><dt className="text-[11px] text-ink-3">Images to generate</dt><dd className="text-[16px] font-semibold text-ink">{perf.renditions}</dd></div>
      </dl>
      <p className="text-[11.5px] text-ink-4 mt-2">Numbers are estimates from the block mix, not real measurements. Real figures appear once the page is live.</p>
    </section>
  </div>;
}
