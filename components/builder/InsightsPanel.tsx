"use client";
import { useMemo, useState } from "react";
import type { Block } from "@/lib/api/types";
import { pageInsights, GROUP_TITLE, type Insight, type InsightLevel, type PageMeta } from "@/lib/ucp/insights";

type Props = {
  blocks: Block[];
  page: PageMeta;
  onFix: (apply: (b: Block[]) => Block[], label: string) => void;
  onSelectBlock: (id: string) => void;
};

const LEVEL_DOT: Record<InsightLevel, string> = { crit: "bg-crit", warn: "bg-warn", ok: "bg-good", info: "bg-info" };
const LEVEL_WORD: Record<InsightLevel, string> = { crit: "Must fix", warn: "Should fix", ok: "Passed", info: "Idea" };

/* ---------------- one finding ---------------- */
function Row({ item, area, onFix, onSelectBlock }: { item: Insight; area?: string; onFix: Props["onFix"]; onSelectBlock: Props["onSelectBlock"] }) {
  const done = item.level === "ok";
  return <li className="flex items-start gap-2.5 py-2.5 border-b border-line last:border-0">
    <span aria-hidden="true" className={`mt-1.5 w-2 h-2 rounded-full flex-none ${LEVEL_DOT[item.level]}`} />
    <div className="min-w-0 flex-1">
      <div className={`text-[13px] leading-snug ${done ? "text-ink-2" : "font-medium text-ink"}`}><span className="sr-only">{LEVEL_WORD[item.level]}: </span>{item.title}</div>
      {!done && <div className="text-[12px] text-ink-3 mt-0.5 leading-relaxed">{item.detail}</div>}
      {!done && (item.blockId || item.fix || area) && <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        {item.blockId && <button type="button" className="btn btn-sm" onClick={() => onSelectBlock(item.blockId!)}>Show on page</button>}
        {item.fix && <button type="button" className="btn btn-sm btn-primary" onClick={() => onFix(item.fix!.apply, item.fix!.label)}>{item.fix.label}</button>}
        {area && <span className="ml-auto text-[10.5px] uppercase tracking-[.06em] text-ink-4">{area}</span>}
      </div>}
    </div>
  </li>;
}

/**
 * Page insights = "can this page go out?". A clear verdict first, then what blocks review or publishing,
 * then suggestions, and the checks that passed folded away. Only checks authors can act on are listed.
 */
export function InsightsPanel({ blocks, page, onFix, onSelectBlock }: Props) {
  const result = useMemo(() => pageInsights(blocks, page), [blocks, page]);
  const tagged = useMemo(() => result.groups.flatMap((g) => g.items.map((i) => ({ i, area: GROUP_TITLE[g.id] }))), [result]);
  const must = tagged.filter((x) => x.i.level === "crit"); const should = tagged.filter((x) => x.i.level === "warn");
  const passed = result.groups.map((g) => ({ id: g.id, title: GROUP_TITLE[g.id], items: g.items.filter((i) => i.level === "ok") })).filter((g) => g.items.length);
  const passedN = passed.reduce((n, g) => n + g.items.length, 0);
  const [showPassed, setShowPassed] = useState(false);
  const live = page.status === "published";
  const verdict = must.length
    ? { tone: "crit", title: `${must.length} thing${must.length === 1 ? "" : "s"} to fix before ${live ? "the next publish" : "publishing"}`, text: must.some(({ i }) => i.id.startsWith("req-") || i.id === "empty") ? "Required content is missing, so the page cannot be sent for review yet." : "These would reach customers as they are. Fix them before the page goes live." }
    : should.length
      ? { tone: "warn", title: live ? "Live, with suggestions" : "Ready for review", text: `${should.length} suggestion${should.length === 1 ? "" : "s"} would make the page clearer or safer. They do not block publishing.` }
      : { tone: "good", title: live ? "Live and looking good" : "Ready to publish", text: "Content, compliance, accessibility and search checks all pass." };
  const toneCls = verdict.tone === "crit" ? "bg-crit-soft border-crit/30" : verdict.tone === "warn" ? "bg-warn-soft border-warn/30" : "bg-good-soft border-good/30";
  const toneTxt = verdict.tone === "crit" ? "text-crit" : verdict.tone === "warn" ? "text-warn" : "text-good";

  return <div className="grid gap-4 text-ink">
    <p className="text-[12px] text-ink-3 -mb-1">{live ? "Checked against the live page" : "Checked as you edit"} · {passedN + must.length + should.length} checks</p>

    <div role="status" className={`rounded-lg border px-3.5 py-3 ${toneCls}`}>
      <div className={`text-[14.5px] font-semibold ${toneTxt}`}>{verdict.tone === "good" ? "✓ " : verdict.tone === "crit" ? "! " : ""}{verdict.title}</div>
      <p className="text-[12.5px] text-ink-2 mt-0.5 leading-relaxed">{verdict.text}</p>
      <div className="flex gap-3 mt-2 text-[12px]"><span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-crit" />{must.length} must fix</span><span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-warn" />{should.length} should fix</span><span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-good" />{passedN} passed</span></div>
    </div>

    {must.length > 0 && <section aria-labelledby="ins-must">
      <h3 id="ins-must" className="text-[11.5px] uppercase tracking-[.06em] text-crit font-semibold mb-1">Must fix</h3>
      <ul className="border border-line rounded-lg bg-surface px-3">{must.map(({ i, area }) => <Row key={i.id} item={i} area={area} onFix={onFix} onSelectBlock={onSelectBlock} />)}</ul>
    </section>}

    {should.length > 0 && <section aria-labelledby="ins-should">
      <h3 id="ins-should" className="text-[11.5px] uppercase tracking-[.06em] text-warn font-semibold mb-1">Should fix</h3>
      <ul className="border border-line rounded-lg bg-surface px-3">{should.map(({ i, area }) => <Row key={i.id} item={i} area={area} onFix={onFix} onSelectBlock={onSelectBlock} />)}</ul>
    </section>}

    {passedN > 0 && <section className="border border-line rounded-lg bg-surface">
      <button type="button" className="w-full flex items-center gap-2 px-3 py-2.5 text-left" aria-expanded={showPassed} onClick={() => setShowPassed(!showPassed)}>
        <span className="text-ink-3 text-[11px] w-3" aria-hidden="true">{showPassed ? "▾" : "▸"}</span>
        <span className="text-[13px] font-semibold flex-1">Checks passed</span>
        <span className="text-[12px] text-good font-semibold tabular-nums">{passedN}</span>
      </button>
      {showPassed && <div className="px-3 pb-2 border-t border-line">{passed.map((g) => <div key={g.id} className="mt-2"><h4 className="text-[11px] uppercase tracking-[.06em] text-ink-3 font-semibold">{g.title}</h4><ul>{g.items.map((i) => <Row key={i.id} item={i} onFix={onFix} onSelectBlock={onSelectBlock} />)}</ul></div>)}</div>}
    </section>}
  </div>;
}
