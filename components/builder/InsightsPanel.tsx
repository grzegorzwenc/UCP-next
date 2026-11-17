"use client";
import { useMemo, useState } from "react";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { PanelSection } from "./panels/PanelSection";
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
      <div className={`text-sm leading-snug ${done ? "text-ink-2" : "font-medium text-ink"}`}><span className="sr-only">{LEVEL_WORD[item.level]}: </span>{item.title}</div>
      {!done && <div className="text-xs text-ink-3 mt-0.5 leading-relaxed">{item.detail}</div>}
      {!done && area && <div className="mt-1 text-[11px] font-medium uppercase tracking-[.1em] text-ink-4">{area}</div>}
      {!done && (item.blockId || item.fix) && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {item.blockId && <button type="button" className="btn btn-sm btn-secondary" onClick={() => onSelectBlock(item.blockId!)}>Show on page</button>}
        {item.fix && <button type="button" className="btn btn-sm btn-secondary" onClick={() => onFix(item.fix!.apply, item.fix!.label)}>{item.fix.label}</button>}
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
  /* BDL's own alert for the verdict, and the panel's collapsible sections for the groups, so
     Insights is built from the same parts as every other tab. It used to invent both: a tinted
     card with a stray "!" prefix, then red and amber uppercase headings over bordered lists —
     four weights of emphasis where the rest of the panel uses one. */
  const alertCls = verdict.tone === "crit" ? "alert-error" : verdict.tone === "warn" ? "alert-warning" : "alert-success";
  const dot = (tone: string) => (tone === "crit" ? "bg-crit" : tone === "warn" ? "bg-warn" : "bg-good");

  return <div className="-mx-4 -mt-4 flex flex-col text-ink">
    <div className="px-4 pt-3.5">
      <div role="status" className={`alert ${alertCls} !mb-0 !items-start !gap-2.5 !p-3`}>
        {verdict.tone === "crit" ? <CircleAlert className="alert-icon" strokeWidth={1.6} aria-hidden />
          : verdict.tone === "warn" ? <TriangleAlert className="alert-icon" strokeWidth={1.6} aria-hidden />
            : <CircleCheck className="alert-icon" strokeWidth={1.6} aria-hidden />}
        <div className="min-w-0">
          <div className="text-sm font-medium">{verdict.title}</div>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{verdict.text}</p>
        </div>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1.5"><i className={`size-2 rounded-full ${dot("crit")}`} />{must.length} must fix</span>
        <span className="inline-flex items-center gap-1.5"><i className={`size-2 rounded-full ${dot("warn")}`} />{should.length} should fix</span>
        <span className="inline-flex items-center gap-1.5"><i className={`size-2 rounded-full ${dot("good")}`} />{passedN} passed</span>
      </p>
      <p className="mt-1.5 mb-3 text-xs text-ink-4">{live ? "Checked against the live page" : "Checked as you edit"} · {passedN + must.length + should.length} checks</p>
    </div>

    {must.length > 0 && <PanelSection id="ins-must" title="Must fix" count={must.length}>
      <ul className="m-0 list-none p-0">{must.map(({ i, area }) => <Row key={i.id} item={i} area={area} onFix={onFix} onSelectBlock={onSelectBlock} />)}</ul>
    </PanelSection>}

    {should.length > 0 && <PanelSection id="ins-should" title="Should fix" count={should.length} defaultOpen={must.length === 0}>
      <ul className="m-0 list-none p-0">{should.map(({ i, area }) => <Row key={i.id} item={i} area={area} onFix={onFix} onSelectBlock={onSelectBlock} />)}</ul>
    </PanelSection>}

    {passedN > 0 && <PanelSection id="ins-passed" title="Passed" count={passedN} defaultOpen={false} open={showPassed} onToggle={setShowPassed}>
      {passed.map((g) => <div key={g.id} className="mb-2 last:mb-0">
        <h4 className="text-[11px] font-medium uppercase tracking-[.1em] text-ink-4">{g.title}</h4>
        <ul className="m-0 list-none p-0">{g.items.map((i) => <Row key={i.id} item={i} onFix={onFix} onSelectBlock={onSelectBlock} />)}</ul>
      </div>)}
    </PanelSection>}
  </div>;
}
