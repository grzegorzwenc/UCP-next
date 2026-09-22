"use client";
import { useMemo, useState } from "react";
import type { Block } from "@/lib/api/types";
import { BLOCKS, BLOCK_BY_TYPE, GROUPS, makeBlock, missingRequired } from "@/lib/blocks/registry";
import { RenderBlock } from "@/lib/blocks/Render";

/**
 * Left panel of the builder: "Add" (component library with live thumbnails, one click adds) and
 * "Outline" (the blocks already on the page: jump, reorder, remove). No jargon, one action per row.
 */
type Props = { tab: "add" | "outline"; setTab: (t: "add" | "outline") => void; phone?: boolean; width?: number; onResizeStart?: (e: React.MouseEvent) => void; blocks: Block[]; sel: string | null; canEdit: boolean; onAdd: (type: string) => void; onSelect: (id: string) => void; onMove: (id: string, d: number) => void; onRemove: (id: string) => void; onClose: () => void };
const SNIPPET_KEYS = ["heading", "intro", "body", "text", "note", "question"];

export function LeftPanel({ tab, setTab, phone, width = 320, onResizeStart, blocks, sel, canEdit, onAdd, onSelect, onMove, onRemove, onClose }: Props) {
  const [q, setQ] = useState("");
  const filtered = BLOCKS.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.desc.toLowerCase().includes(q.toLowerCase()));
  // Stable ids: the same markup on the server and in the browser (random ids would trip hydration).
  const samples = useMemo(() => Object.fromEntries(BLOCKS.map((b) => [b.type, { ...makeBlock(b.type), id: `sample_${b.type}` }])) as Record<string, Block>, []);
  return (
    <aside data-ui style={phone ? undefined : { width }} className={phone ? "absolute inset-x-0 top-0 bottom-12 bg-surface flex flex-col z-[5]" : "absolute left-[52px] top-0 bottom-0 max-w-[calc(100%-52px)] bg-surface border-r border-line flex flex-col z-[5] shadow-xl md:shadow-none"}>
      {!phone && onResizeStart && <div role="separator" aria-orientation="vertical" aria-label="Resize panel" title="Drag to resize" onMouseDown={onResizeStart} className="absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/30 active:bg-accent/40 z-10" />}
      <div className="flex items-center px-2 pt-2 border-b border-line">
        {(["add", "outline"] as const).map((t) => <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t} className={`px-3 py-2 text-[13px] font-medium border-b-2 -mb-px ${tab === t ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>{t === "add" ? "＋ Add" : `Outline · ${blocks.length}`}</button>)}
        <button type="button" className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={onClose} aria-label="Close panel">✕</button>
      </div>
      {tab === "add" ? <>
        <div className="p-3 border-b border-line"><input className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px]" placeholder="Find a component…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a component" /></div>
        <div className="flex-1 overflow-auto p-2">
          {!canEdit && <div className="m-1 mb-2 text-[12px] text-ink-3 bg-surface-3 border border-line rounded-md px-2.5 py-2">Read-only: you can look, but not add.</div>}
          {GROUPS.map((g) => { const items = filtered.filter((b) => b.group === g); if (!items.length) return null; return <div key={g}>
            <h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold mt-3 mb-1 mx-2 first:mt-1">{g}</h6>
            {items.map((b) => <button key={b.type} type="button" disabled={!canEdit} onClick={() => onAdd(b.type)} title={`Add ${b.name} below the selected block`} className="group w-full grid grid-cols-[92px_1fr_auto] items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-2 disabled:opacity-60 focus-visible:bg-surface-2">
              <span className="relative h-[60px] rounded-md border border-line bg-white overflow-hidden" aria-hidden><span className="absolute left-0 top-0 origin-top-left pointer-events-none select-none site desktop" style={{ transform: "scale(0.075)", width: 1200 }}><RenderBlock b={samples[b.type]} /></span></span>
              <span className="min-w-0"><b className="block text-[13px] text-ink truncate">{b.name}</b><small className="block text-[11.5px] text-ink-3 leading-snug line-clamp-2">{b.desc}</small></span>
              <span className="text-[12px] font-semibold text-accent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pr-1">Add</span>
            </button>)}
          </div>; })}
          {!filtered.length && <div className="p-6 text-center text-ink-3 text-[13px]">Nothing matches “{q}”.</div>}
        </div>
      </> : <div className="flex-1 overflow-auto p-2">
        {blocks.length ? <ol className="flex flex-col gap-0.5">{blocks.map((b, i) => { const def = BLOCK_BY_TYPE[b.type]; const on = sel === b.id; const missing = missingRequired(b).length; const snippet = SNIPPET_KEYS.map((k) => b.props[k]).find((v) => typeof v === "string" && v.trim()) as string | undefined;
          return <li key={b.id} className={`group grid grid-cols-[22px_1fr_auto] items-center gap-2 rounded-lg px-2 py-1.5 ${on ? "bg-accent-soft" : "hover:bg-surface-2"}`}>
            <span className={`w-[22px] h-[22px] rounded-full grid place-items-center text-[11px] font-semibold ${on ? "bg-accent text-white" : "bg-surface-3 text-ink-2"}`}>{i + 1}</span>
            <button type="button" onClick={() => onSelect(b.id)} className="min-w-0 text-left"><b className={`block text-[13px] truncate ${on ? "text-accent-hover" : "text-ink"}`}>{def.name}{b.props.hidden ? <small className="ml-1.5 font-normal text-ink-3">hidden</small> : null}{b.props.locked ? <small className="ml-1.5 font-normal text-ink-3">🔒</small> : null}{missing ? <small className="ml-1.5 font-normal text-crit">{missing} required</small> : null}</b><small className="block text-[11.5px] text-ink-3 truncate">{snippet ?? def.desc}</small></button>
            {canEdit && <span className="flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"><button type="button" className="w-6 h-6 rounded text-ink-3 hover:bg-surface-3 disabled:opacity-30" disabled={i === 0} onClick={() => onMove(b.id, -1)} aria-label="Move up">↑</button><button type="button" className="w-6 h-6 rounded text-ink-3 hover:bg-surface-3 disabled:opacity-30" disabled={i === blocks.length - 1} onClick={() => onMove(b.id, 1)} aria-label="Move down">↓</button><button type="button" className="w-6 h-6 rounded text-ink-3 hover:bg-crit-soft hover:text-crit" onClick={() => onRemove(b.id)} aria-label="Remove">✕</button></span>}
          </li>; })}</ol>
        : <div className="p-6 text-center text-ink-3 text-[13px]">No blocks yet. Add the first one from the Add tab.</div>}
      </div>}
    </aside>
  );
}
