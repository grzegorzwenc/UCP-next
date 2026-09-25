"use client";
import { useEffect, useRef, useState } from "react";
import { RenderBlock } from "@/lib/blocks/Render";
import { BLOCK_BY_TYPE } from "@/lib/blocks/registry";
import type { Block } from "@/lib/api/types";

/** Deterministic default-content blocks for a template (stable ids → no hydration mismatch). */
export const templateBlocks = (types: string[]): Block[] => types.filter((t) => BLOCK_BY_TYPE[t]).map((t, i) => ({ id: `tpl-${t}-${i}`, type: t, props: { ...BLOCK_BY_TYPE[t].defaults } }));

/**
 * Scaled, clipped live preview of a template rendered with the real block renderer.
 * Without `scale` the 1200 px page is fitted to the width of the box, so the thumbnail always fills the card.
 */
export function TemplatePreview({ blocks, scale, height }: { blocks: string[]; scale?: number; height: number }) {
  const bl = templateBlocks(blocks);
  const box = useRef<HTMLDivElement>(null); const [fit, setFit] = useState(scale ?? 0.25);
  useEffect(() => { if (scale !== undefined) return; const el = box.current; if (!el) return; const ro = new ResizeObserver(() => setFit(el.clientWidth / 1200)); ro.observe(el); return () => ro.disconnect(); }, [scale]);
  const s = scale ?? fit;
  return (
    <div ref={box} className="relative overflow-hidden bg-[#e9e9ec]" style={{ height }} aria-hidden>
      {bl.length ? <div className="site desktop absolute left-0 top-0 !max-w-none !shadow-none" style={{ transform: `scale(${s})`, transformOrigin: "top left", width: 1200, margin: 0 }}>
        {bl.map((b) => <RenderBlock key={b.id} b={b} />)}
      </div>
        : <div className="absolute inset-4 border-2 border-dashed border-line-2 rounded-lg grid place-items-center text-center bg-white/60"><div><span className="block text-[28px] leading-none text-ink-4">＋</span><span className="block text-[12.5px] text-ink-3 mt-1.5">Empty page</span></div></div>}
      {bl.length > 0 && <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />}
    </div>
  );
}
