import { RenderBlock } from "@/lib/blocks/Render";
import { BLOCK_BY_TYPE } from "@/lib/blocks/registry";
import type { Block } from "@/lib/api/types";

/** Deterministic default-content blocks for a template (stable ids → no hydration mismatch). */
export const templateBlocks = (types: string[]): Block[] => types.filter((t) => BLOCK_BY_TYPE[t]).map((t, i) => ({ id: `tpl-${t}-${i}`, type: t, props: { ...BLOCK_BY_TYPE[t].defaults } }));

/** Scaled, clipped live preview of a template rendered with the real block renderer. */
export function TemplatePreview({ blocks, scale, height }: { blocks: string[]; scale: number; height: number }) {
  const bl = templateBlocks(blocks);
  return (
    <div className="relative overflow-hidden bg-[#e9e9ec] border-b border-line" style={{ height }} aria-hidden>
      <div className="site desktop absolute left-0 top-0 !max-w-none !shadow-none" style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 1200, margin: 0 }}>
        {bl.length ? bl.map((b) => <RenderBlock key={b.id} b={b} />) : <div className="p-16 text-center text-[28px] text-ink-4">Blank page</div>}
      </div>
    </div>
  );
}
