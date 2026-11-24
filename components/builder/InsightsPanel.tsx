"use client";
import { useMemo } from "react";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { PanelSection } from "./panels/PanelSection";
import type { Block } from "@/lib/api/types";
import { pageInsights, GROUP_TITLE, type Insight, type InsightLevel, type PageMeta } from "@/lib/ucp/insights";

type Props = {
  blocks: Block[];
  page: PageMeta;
  onFix: (apply: (b: Block[]) => Block[], label: string, blockId?: string, field?: string) => void;
  onSelectBlock: (id: string) => void;
  /** Hovering a finding points at the block it is about; null on leave. */
  onHoverBlock?: (id: string | null) => void;
};

const LEVEL_DOT: Record<InsightLevel, string> = { crit: "[background-color:var(--color-bdl-rag-red)]", warn: "bg-warn", ok: "bg-good", info: "bg-info" };
const LEVEL_WORD: Record<InsightLevel, string> = { crit: "Must fix", warn: "Should fix", ok: "Passed", info: "Idea" };

/* ---------------- one finding ---------------- */
function Row({ item, area, onFix, onSelectBlock, onHoverBlock }: { item: Insight; area?: string; onFix: Props["onFix"]; onSelectBlock: Props["onSelectBlock"]; onHoverBlock?: Props["onHoverBlock"] }) {
  const done = item.level === "ok";
  const must = item.level === "crit";
  const point = item.blockId ? {
    onMouseEnter: () => onHoverBlock?.(item.blockId!),
    onMouseLeave: () => onHoverBlock?.(null),
    onFocus: () => onHoverBlock?.(item.blockId!),
    onBlur: () => onHoverBlock?.(null),
    onClick: () => onSelectBlock(item.blockId!),
  } : {};
  return <li {...point} className={`flex items-start gap-2.5 border-b border-line py-2.5 last:border-b-0 ${must ? "-mx-4 border-s-2 px-4 ps-3.5 [background-color:var(--color-bdl-error-bg)] [border-inline-start-color:transparent] hover:[border-inline-start-color:var(--color-bdl-rag-red)]" : ""} ${item.blockId ? `cursor-pointer${must ? "" : " hover:bg-surface-2"}` : ""}`}>
    <span aria-hidden="true" className={`mt-1.5 w-2 h-2 rounded-full flex-none ${LEVEL_DOT[item.level]}`} />
    <div className="min-w-0 flex-1">
      <div className={`text-sm leading-snug ${done ? "text-ink-2" : "font-medium text-ink"}`}><span className="sr-only">{LEVEL_WORD[item.level]}: </span>{item.title}</div>
      {!done && <div className="text-xs text-ink-3 mt-0.5 leading-relaxed">{item.detail}</div>}
      {!done && area && <div className="mt-1 text-[11px] font-medium uppercase tracking-[.1em] text-ink-4">{area}</div>}
      {!done && (item.blockId || item.fix) && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {item.blockId && <button type="button" className={`btn btn-sm ${must ? "btn-primary" : "btn-secondary"}`} onClick={(e) => { e.stopPropagation(); onSelectBlock(item.blockId!); }}>Show on page</button>}
        {item.fix && <button type="button" className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); onFix(item.fix!.apply, item.fix!.label, item.blockId, item.field); }}>{item.fix.label}</button>}
      </div>}
    </div>
  </li>;
}

/**
 * Page insights = "can this page go out?". A clear verdict first, then what blocks review or publishing,
 * then suggestions, and the checks that passed folded away. Only checks authors can act on are listed.
 */
export function InsightsPanel({ blocks, page, onFix, onSelectBlock, onHoverBlock }: Props) {
  const result = useMemo(() => pageInsights(blocks, page), [blocks, page]);
  const tagged = useMemo(() => result.groups.flatMap((g) => g.items.map((i) => ({ i, area: GROUP_TITLE[g.id] }))), [result]);
  const must = tagged.filter((x) => x.i.level === "crit"); const should = tagged.filter((x) => x.i.level === "warn");
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

  return <div className="-mx-4 -mt-4 flex flex-col text-ink">
    <div className="px-4 pt-3.5">
      <div role="status" className={`alert ${alertCls} !mb-3 !items-center !gap-2 !px-2.5 !py-2`}>
        {verdict.tone === "crit" ? <CircleAlert className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
          : verdict.tone === "warn" ? <TriangleAlert className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
            : <CircleCheck className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />}
        <span className="min-w-0 text-xs font-medium leading-snug">{verdict.title}</span>
      </div>

    </div>

    {must.length > 0 && <PanelSection id="ins-must" title="Must fix" count={must.length} tone="crit">
      <ul className="m-0 list-none p-0">{must.map(({ i, area }) => <Row key={i.id} item={i} area={area} onFix={onFix} onSelectBlock={onSelectBlock} onHoverBlock={onHoverBlock} />)}</ul>
    </PanelSection>}

    {should.length > 0 && <PanelSection id="ins-should" title="Should fix" count={should.length} defaultOpen={must.length === 0}>
      <ul className="m-0 list-none p-0">{should.map(({ i, area }) => <Row key={i.id} item={i} area={area} onFix={onFix} onSelectBlock={onSelectBlock} onHoverBlock={onHoverBlock} />)}</ul>
    </PanelSection>}

  </div>;
}
