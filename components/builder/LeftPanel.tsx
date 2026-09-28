"use client";
import { useMemo, useState } from "react";
import type { Block } from "@/lib/api/types";
import { BLOCKS, GROUPS, makeBlock } from "@/lib/blocks/registry";
import { RenderBlock } from "@/lib/blocks/Render";
import { LockedVeil } from "./LockedVeil";

/**
 * Left panel of the builder: the component library with live thumbnails; one click adds the block below the selected one.
 */
type Props = { phone?: boolean; width?: number; onResizeStart?: (e: React.MouseEvent) => void; canEdit: boolean; onAdd: (type: string) => void; onClose: () => void; lockedReason?: string; onEdit?: () => void };

export function LeftPanel({ phone, width = 320, onResizeStart, canEdit, onAdd, onClose, lockedReason, onEdit }: Props) {
  const [q, setQ] = useState("");
  const filtered = BLOCKS.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()) || b.desc.toLowerCase().includes(q.toLowerCase()));
  // Stable ids: the same markup on the server and in the browser (random ids would trip hydration).
  const samples = useMemo(() => Object.fromEntries(BLOCKS.map((b) => [b.type, { ...makeBlock(b.type), id: `sample_${b.type}` }])) as Record<string, Block>, []);
  return (
    <aside data-ui style={phone ? undefined : { width }} className={phone ? "absolute inset-x-0 top-0 bottom-12 bg-surface flex flex-col z-[5]" : "absolute left-[52px] top-0 bottom-0 max-w-[calc(100%-52px)] bg-surface border-r border-line flex flex-col z-[5] shadow-xl md:shadow-none"}>
      {!phone && onResizeStart && <div role="separator" aria-orientation="vertical" aria-label="Resize panel" title="Drag to resize" onMouseDown={onResizeStart} className="absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/30 active:bg-accent/40 z-10" />}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line">
        <b className="text-[13.5px]">Add a component</b>
        <button type="button" className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={onClose} aria-label="Close panel">✕</button>
      </div>
      <LockedVeil on={!!lockedReason} reason={lockedReason ?? ""} onEdit={onEdit}>
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
      </LockedVeil>
    </aside>
  );
}
