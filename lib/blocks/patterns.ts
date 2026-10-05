import type { Block } from "@/lib/api/types";
import { BLOCK_BY_TYPE, makeBlock } from "./registry";

/** A design pattern: several library components saved together, added to a page in one go (with the content they were saved with). */
export type PatternPart = { type: string; props: Record<string, unknown> };
/** `markets`: the local markets that see it (empty = every market). `archived`: hidden from the library, can be restored. */
export type DesignPattern = { id: string; name: string; desc: string; parts: PatternPart[]; builtIn?: boolean; by?: string; byName?: string; created?: string; markets?: string[]; archived?: { by: string; name: string; at: string } };

const part = (type: string, props: Record<string, unknown> = {}): PatternPart => ({ type, props: { ...BLOCK_BY_TYPE[type].defaults, ...props } });

/** Ready-made patterns every market gets (the design system's own); people add their own next to them. */
export const BUILT_IN_PATTERNS: DesignPattern[] = [
  { id: "product-intro", name: "Product introduction", desc: "Masthead, what it is and three benefits", builtIn: true, parts: [part("mast"), part("contentmaster"), part("icontiles")] },
  { id: "choose-a-card", name: "Choose a product", desc: "Product tiles, other options and the small print", builtIn: true, parts: [part("mastertiles"), part("linktiles"), part("footnotes")] },
  { id: "rates-and-questions", name: "Rates and questions", desc: "Key facts, rates table and FAQ", builtIn: true, parts: [part("facts"), part("rates"), part("faq")] },
  { id: "uk-isa-promo", name: "ISA season promotion", desc: "UK only: masthead, rates and the FSCS small print", builtIn: true, markets: ["uk"], parts: [part("mast", { heading: "Make the most of your ISA allowance", intro: "Save up to £20,000 tax-free this tax year." }), part("rates"), part("disclaimer")] },
  { id: "apply-close", name: "Apply section", desc: "Call to action, form and disclaimer", builtIn: true, parts: [part("banner"), part("form"), part("disclaimer")] },
];

/** Blocks → pattern parts (hidden/locked flags are page decisions, not part of the pattern). */
export const toParts = (blocks: Block[]): PatternPart[] => blocks.map((b) => { const { hidden: _h, locked: _l, ...props } = b.props; void _h; void _l; return { type: b.type, props }; });
/** Pattern → fresh blocks with new ids, ready to insert. Unknown component types (removed from the library) are skipped. */
export const fromPattern = (p: DesignPattern): Block[] => p.parts.filter((x) => BLOCK_BY_TYPE[x.type]).map((x) => makeBlock(x.type, x.props));
export const partNames = (p: DesignPattern) => p.parts.filter((x) => BLOCK_BY_TYPE[x.type]).map((x) => BLOCK_BY_TYPE[x.type].name).join(" · ");
