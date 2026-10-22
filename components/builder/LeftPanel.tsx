"use client";
import { useCallback, useMemo, useState } from "react";
import type { Block } from "@/lib/api/types";
import { BLOCKS, BLOCK_BY_TYPE, GROUPS, makeBlock } from "@/lib/blocks/registry";
import { RenderBlock } from "@/lib/blocks/Render";
import { LockedVeil } from "./LockedVeil";
import { partNames, type DesignPattern } from "@/lib/blocks/patterns";
import { MARKETS } from "@/lib/markets";

/**
 * Left panel of the builder: the component library with live thumbnails; one click adds the block below the selected one.
 * Design patterns tab: groups of components saved together (built-in and saved by people), added in one click.
 */
export type LeftTab = "components" | "patterns";
type Props = { phone?: boolean; width?: number; onResizeStart?: (e: React.MouseEvent) => void; canEdit: boolean; onAdd: (type: string) => void; onClose: () => void; lockedReason?: string; onEdit?: () => void;
  /** without `patterns` (e.g. the template editor) only the component library shows */
  patterns?: DesignPattern[] | null; tab?: LeftTab; onTab?: (t: LeftTab) => void; onAddPattern?: (p: DesignPattern) => void; onRemovePattern?: (p: DesignPattern) => void; onRestorePattern?: (p: DesignPattern) => void; onDeletePattern?: (p: DesignPattern) => void; onPatternMarkets?: (p: DesignPattern) => void; mayManage?: (p: DesignPattern) => boolean; onStartPattern?: () => void; creating?: boolean };
const noop = () => {};

/** A pattern's thumbnail: its components stacked, scaled down like the component thumbnails. */
function PatternThumb({ p }: { p: DesignPattern }) {
  const blocks = useMemo(() => p.parts.filter((x) => BLOCK_BY_TYPE[x.type]).map((x, i) => ({ id: `pt_${p.id}_${i}`, type: x.type, props: x.props }) as Block), [p]);
  const [w, setW] = useState(280); // scale the 1200 px page to the card's width
  const ref = useCallback((el: HTMLSpanElement | null) => { if (!el) return; const ro = new ResizeObserver(([e]) => setW(e.contentRect.width)); ro.observe(el); return () => ro.disconnect(); }, []);
  return <span ref={ref} className="relative block h-[150px] rounded-md border border-line bg-white overflow-hidden" aria-hidden><span className="absolute left-0 top-0 origin-top-left pointer-events-none select-none site desktop" style={{ transform: `scale(${w / 1200})`, width: 1200 }}>{blocks.map((b) => <RenderBlock key={b.id} b={b} />)}</span></span>;
}

export function LeftPanel({ phone, width = 320, onResizeStart, canEdit, onAdd, onClose, lockedReason, onEdit, tab: tabIn = "components", onTab = noop, patterns, onAddPattern = noop, onRemovePattern = noop, onRestorePattern = noop, onDeletePattern = noop, onPatternMarkets = noop, mayManage = () => false, onStartPattern = noop, creating = false }: Props) {
  const withPatterns = patterns !== undefined; const tab = withPatterns ? tabIn : "components";
  const [showArchived, setShowArchived] = useState(false);
  const [q, setQ] = useState("");
  const filtered = BLOCKS.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.desc.toLowerCase().includes(q.toLowerCase()));
  const match = (p: DesignPattern) => !q || `${p.name} ${p.desc} ${partNames(p)}`.toLowerCase().includes(q.toLowerCase());
  const pats = (patterns ?? []).filter((p) => !p.archived && match(p)); const archived = (patterns ?? []).filter((p) => p.archived && match(p));
  const where = (p: DesignPattern) => (p.markets?.length ? p.markets.map((m) => MARKETS.find((k) => k.id === m)?.flag ?? m).join(" ") + " only" : "All markets");
  void onTab; // the left rail switches between components and patterns
  // Stable ids: the same markup on the server and in the browser (random ids would trip hydration).
  const samples = useMemo(() => Object.fromEntries(BLOCKS.map((b) => [b.type, { ...makeBlock(b.type), id: `sample_${b.type}` }])) as Record<string, Block>, []);
  return (
    <aside data-ui style={phone ? undefined : { width }} className={phone ? "absolute inset-x-0 top-0 bottom-12 bg-surface flex flex-col z-[5]" : "absolute left-[52px] top-0 bottom-0 max-w-[calc(100%-52px)] bg-surface border-r border-line flex flex-col z-[5] shadow-xl md:shadow-none"}>
      {!phone && onResizeStart && <div role="separator" aria-orientation="vertical" aria-label="Resize panel" title="Drag to resize" onMouseDown={onResizeStart} className="absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand/30 active:bg-brand/40 z-10" />}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line">
        <b className="text-[13.5px]">{tab === "patterns" ? "Add a design pattern" : "Add a component"}</b>
        <button type="button" className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={onClose} aria-label="Close panel">✕</button>
      </div>
      <LockedVeil on={!!lockedReason} reason={lockedReason ?? ""} onEdit={onEdit}>
        <div className="p-3 border-b border-line"><input className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px]" placeholder={tab === "patterns" ? "Find a pattern…" : "Find a component…"} value={q} onChange={(e) => setQ(e.target.value)} aria-label={tab === "patterns" ? "Find a pattern" : "Find a component"} /></div>
        {tab === "patterns" ? <div className="flex-1 overflow-auto p-2">
          {canEdit && <button type="button" onClick={onStartPattern} disabled={creating} className="m-1 mb-3 w-[calc(100%-8px)] flex items-center gap-3 rounded-lg border-2 border-dashed border-line-2 px-3 py-3 text-left hover:border-brand hover:bg-brand-soft disabled:border-brand disabled:bg-brand-soft">
            <span className="w-10 h-10 flex-none rounded-lg bg-brand text-white grid place-items-center" aria-hidden><svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth={1.8} strokeLinejoin="round"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h16v7H4z" /></svg></span>
            <span className="min-w-0"><b className="block text-[13.5px] text-ink">{creating ? "Creating a design pattern…" : "Create a design pattern"}</b><small className="block text-[12px] text-ink-3 leading-snug">{creating ? "Click components on the page, then Name it and save" : "Pick components on the page, then give it a name"}</small></span></button>}
          {!canEdit && <div className="m-1 mb-2 text-[12px] text-ink-3 bg-surface-3 border border-line rounded-md px-2.5 py-2">Read-only: you can look, but not add.</div>}
          {patterns === null && <div className="p-6 text-center text-ink-3 text-[13px]">Loading…</div>}
          {pats.map((p) => <div key={p.id} className="group relative rounded-lg p-2 hover:bg-surface-2">
            <button type="button" disabled={!canEdit} onClick={() => onAddPattern(p)} title={`Add ${p.name} below the selected block`} className="w-full text-left disabled:opacity-60">
              <PatternThumb p={p} />
              <span className="flex items-center gap-2 mt-1.5"><b className="text-[13px] text-ink truncate">{p.name}</b><span className={`flex-none text-[10.5px] font-semibold rounded px-1.5 py-px ${p.builtIn ? "bg-surface-3 text-ink-2" : "bg-info-soft text-info"}`}>{p.builtIn ? "Design system" : "Saved"}</span><span className="ml-auto text-[12px] font-semibold text-brand opacity-0 group-hover:opacity-100">Add</span></span>
              {p.desc && <small className="block text-[11.5px] text-ink-2 leading-snug">{p.desc}</small>}
              <small className="block text-[11px] text-ink-3 leading-snug">{p.parts.length} components · {partNames(p)}</small>
              <small className="block text-[11px] text-ink-3 leading-snug"><span className={p.markets?.length ? "font-semibold text-ink-2" : ""}>{where(p)}</span>{p.byName ? ` · by ${p.byName}` : ""}</small>
            </button>
            {mayManage(p) && <span className="absolute right-3 top-3 flex gap-1">
              <button type="button" onClick={() => onPatternMarkets(p)} className="h-8 px-2 rounded-md border border-line bg-surface/95 shadow-sm text-[12px] font-medium text-ink-2 hover:text-ink hover:border-ink-4 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" title="Choose the markets that see this pattern">Markets</button>
              <button type="button" onClick={() => onRemovePattern(p)} className="w-8 h-8 rounded-md border border-line bg-surface/95 shadow-sm grid place-items-center text-ink-3 hover:text-crit hover:border-crit" title={`Remove ${p.name}`} aria-label={`Remove ${p.name}`}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 7h14M10 11v6M14 11v6M6.5 7l1 13h9l1-13M9 7V4h6v3" /></svg></button></span>}
          </div>)}
          {patterns !== null && !pats.length && <div className="p-6 text-center text-ink-3 text-[13px]">{q ? `Nothing matches “${q}”.` : "No patterns yet."}</div>}
          {archived.length > 0 && <div className="mt-3 border-t border-line pt-2">
            <button type="button" className="w-full flex items-center gap-2 px-2 py-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink" aria-expanded={showArchived} onClick={() => setShowArchived(!showArchived)}><span aria-hidden>{showArchived ? "▾" : "▸"}</span>Archived · {archived.length}<span className="ml-auto font-normal text-ink-3">can be restored</span></button>
            {showArchived && <ul className="grid gap-1 mt-1">{archived.map((p) => <li key={p.id} className="flex items-center gap-2 rounded-md border border-line px-2.5 py-2 text-[12.5px]">
              <span className="min-w-0 flex-1"><b className="block truncate text-ink-2">{p.name}</b><small className="block text-[11px] text-ink-3">Archived by {p.archived!.name} · {new Date(p.archived!.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></span>
              {mayManage(p) && <><button type="button" className="btn btn-sm" onClick={() => onRestorePattern(p)}>Restore</button><button type="button" className="btn btn-sm text-brand" onClick={() => onDeletePattern(p)}>Delete</button></>}</li>)}</ul>}
          </div>}
        </div> : <div className="flex-1 overflow-auto p-2">
          {!canEdit && <div className="m-1 mb-2 text-[12px] text-ink-3 bg-surface-3 border border-line rounded-md px-2.5 py-2">Read-only: you can look, but not add.</div>}
          {GROUPS.map((g) => { const items = filtered.filter((b) => b.group === g); if (!items.length) return null; return <div key={g}>
            <h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold mt-3 mb-1 mx-2 first:mt-1">{g}</h6>
            {items.map((b) => <button key={b.type} type="button" disabled={!canEdit} onClick={() => onAdd(b.type)} title={`Add ${b.name} below the selected block`} className="group w-full grid grid-cols-[92px_1fr_auto] items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-2 disabled:opacity-60 focus-visible:bg-surface-2">
              <span className="relative h-[60px] rounded-md border border-line bg-white overflow-hidden" aria-hidden><span className="absolute left-0 top-0 origin-top-left pointer-events-none select-none site desktop" style={{ transform: "scale(0.075)", width: 1200 }}><RenderBlock b={samples[b.type]} /></span></span>
              <span className="min-w-0"><b className="block text-[13px] text-ink truncate">{b.name}</b><small className="block text-[11.5px] text-ink-3 leading-snug line-clamp-2">{b.desc}</small></span>
              <span className="text-[12px] font-semibold text-brand opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pr-1">Add</span>
            </button>)}
          </div>; })}
          {!filtered.length && <div className="p-6 text-center text-ink-3 text-[13px]">Nothing matches “{q}”.</div>}
        </div>}
      </LockedVeil>
    </aside>
  );
}
