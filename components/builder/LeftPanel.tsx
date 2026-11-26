"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { THUMB_W } from "@/lib/ucp/devices";
import { AlignLeft, CircleHelp, GripVertical, Lock, CreditCard, FileText, Image, LayoutGrid, Link2, MessageSquareQuote, Megaphone, ScrollText, Shapes, Table2, Type } from "lucide-react";
import type { Block } from "@/lib/api/types";
import { BLOCKS, BLOCK_BY_TYPE, GROUPS, PAGE_EXCLUDED, FIXED_GROUPS } from "@/lib/blocks/registry";
import { RenderBlock } from "@/lib/blocks/Render";
import { LockedVeil } from "./LockedVeil";
import { partNames, type DesignPattern } from "@/lib/blocks/patterns";
import { MARKETS } from "@/lib/markets";
import { PanelSection } from "./panels/PanelSection";
import { PanelHeader, GripStrip, panelClass, PanelBody, CollapsedRail, collapsedWidth } from "./panels/PanelFrame";
import { useFloat } from "./panels/useFloat";

/**
 * Left panel of the builder: Components, Outline and Design patterns.
 *
 * Rebuilt to the density of the UCP mock's editor panel. It used to render a 92px live
 * thumbnail and a two-line description per component, so six components filled the panel and
 * the groups could not be collapsed. It is now one line per component — icon, name, and an
 * Add button that only appears on the row under the pointer — inside collapsible groups that
 * carry their counts. The whole catalogue fits without scrolling.
 *
 * The thumbnails are gone deliberately (Leon's call): the names carry the catalogue, and the
 * canvas shows the real thing the moment a component is added.
 */
export type LeftTab = "components" | "outline" | "patterns" | "flow";

/** One icon per block type so a row reads at a glance without a preview. Grouped fallback for anything new. */
const ICONS: Record<string, typeof Type> = {
  mast: Image, contentmaster: Type, icontiles: Shapes, mastertiles: CreditCard, linktiles: Link2,
  footnotes: ScrollText, banner: Megaphone, text: AlignLeft, facts: LayoutGrid, faq: MessageSquareQuote,
  rates: Table2, form: FileText, disclaimer: ScrollText,
};
const iconFor = (type: string) => ICONS[type] ?? Shapes;

/**
 * Hover preview for a design pattern: its components rendered for real and scaled down.
 *
 * A pattern is a composition, so a name alone does not say what you are about to drop onto
 * the page — but a thumbnail big enough to read would undo the one-line density the panel was
 * rebuilt for. So the row stays one line and the picture appears beside the panel on hover.
 * It renders the same blocks the canvas does, at the desktop width scaled to the card, so it is the
 * actual pattern rather than a drawing of it.
 */
function PatternPreview({ p, top, left }: { p: DesignPattern; top: number; left: number }) {
  const blocks = useMemo(
    () => p.parts.filter((x) => BLOCK_BY_TYPE[x.type]).map((x, i) => ({ id: `pv_${p.id}_${i}`, type: x.type, props: x.props }) as Block),
    [p],
  );
  /* 360 rather than 300: at 300 the desktop page scaled to 0.23 and the body text came out
     around 3px — a grey smear rather than a preview. Wider helps, but a thumbnail can only ever
     show shape at this size, so the card leans on that: the crop fades out instead of stopping
     mid-sentence, and the words that actually identify the pattern sit underneath in real type. */
  const W = 360;
  return (
    <div role="tooltip" style={{ top, left, width: W }}
      className="pointer-events-none fixed z-40 overflow-hidden rounded-lg border border-line bg-surface shadow-2xl transition-[opacity,transform] duration-150 ease-out starting:translate-x-[-4px] starting:opacity-0">
      <div className="relative h-[150px] overflow-hidden border-b border-line bg-white">
        <span aria-hidden className="site desktop pointer-events-none absolute left-0 top-0 origin-top-left select-none" style={{ transform: `scale(${W / THUMB_W})`, width: THUMB_W }}>
          {blocks.map((b) => <RenderBlock key={b.id} b={b} />)}
        </span>
        {/* The pattern is almost always taller than the crop; fade it out so the cut reads as a
            thumbnail rather than as something that failed to load. */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-white" />
      </div>
      <div className="grid gap-0.5 p-3">
        <b className="truncate text-sm text-ink">{p.name}</b>
        {p.desc && <small className="truncate text-xs text-ink-2">{p.desc}</small>}
        <small className="truncate text-xs text-ink-3">{p.parts.length} components · {p.markets?.length ? p.markets.map((m) => MARKETS.find((k) => k.id === m)?.flag ?? m).join(" ") + " only" : "All markets"}</small>
      </div>
    </div>
  );
}

type Props = {
  phone?: boolean; width?: number;
  canEdit: boolean; onAdd: (type: string) => void; onClose: () => void; onOpenPanel?: () => void;
  /** Component groups to offer (Messaging limits the palette per channel); default: every page group. */
  allowedGroups?: string[];
  /** Replays the editor tour. Lives on the panel's bottom bar, which is where the tour ends. */
  onHelp?: () => void;
  /** dataTransfer types the canvas listens for, so a component or a pattern can be dragged onto the page. */
  dragType?: string;
  patternDragType?: string; lockedReason?: string; onEdit?: () => void;
  /** Outline: the page's blocks in document order, and the selection, so the tree can mirror the canvas. */
  blocks?: Block[]; selected?: string | null; onSelect?: (id: string) => void;
  /** Dragging an outline row to a new position reorders the page itself. */
  onReorder?: (id: string, to: number) => void;
  /** without `patterns` (e.g. the template editor) only the component library shows */
  /** Forms: the Steps tab (layout, steps, end pages, rules), shown first. */
  flow?: React.ReactNode;
  patterns?: DesignPattern[] | null; tab?: LeftTab; onTab?: (t: LeftTab) => void;
  onAddPattern?: (p: DesignPattern) => void; onRemovePattern?: (p: DesignPattern) => void; onRestorePattern?: (p: DesignPattern) => void;
  onDeletePattern?: (p: DesignPattern) => void; onPatternMarkets?: (p: DesignPattern) => void; mayManage?: (p: DesignPattern) => boolean;
  onStartPattern?: () => void; creating?: boolean;
  /** The tabs, repeated on the collapsed rail so the panel can be reopened straight onto one. */
  railItems?: { key: string; label: string; path: string; active?: boolean; onClick: () => void }[];
  /** Told when the panel is detached, so the builder can give the docked column back to the canvas. */
  onFloatChange?: (floating: boolean) => void;
  /** Closed panels stay mounted so the collapse can animate and the panel keeps its state. */
  open?: boolean;
  /** Focus mode: no panel and no rail at all, so the canvas gets the whole width. */
  hidden?: boolean;
};
const noop = () => {};

const tabCls = (on: boolean, tight = false) =>
  `relative cursor-pointer whitespace-nowrap ${tight ? "px-1.5" : "px-2.5"} py-2 text-xs font-medium transition-colors duration-150 ease-out ${on ? "text-ink after:absolute after:inset-x-1.5 after:bottom-0 after:h-0.5 after:bg-brand" : "text-ink-3 hover:text-ink"}`;
/** Row affordances appear only on the row under the pointer, which is what keeps a long list quiet. */
const rowCls = "group/item flex h-7 w-full cursor-grab items-center gap-2 ps-7 pe-1.5 text-left active:cursor-grabbing transition-colors duration-150 ease-out hover:bg-surface-2 disabled:cursor-default disabled:opacity-50";

export function LeftPanel({
  phone, width = 280, canEdit, onAdd, allowedGroups, onClose, onOpenPanel = noop, onHelp, dragType, patternDragType, lockedReason, onEdit,
  blocks = [], selected = null, onSelect = noop, onReorder, flow,
  tab: tabIn = "components", onTab = noop, patterns, onAddPattern = noop, onRemovePattern = noop, onRestorePattern = noop,
  onDeletePattern = noop, onPatternMarkets = noop, mayManage = () => false, onStartPattern = noop, creating = false, onFloatChange, open = true, hidden = false, railItems = [],
}: Props) {
  const withPatterns = patterns !== undefined;
  const tab: LeftTab = tabIn === "flow" ? (flow ? "flow" : "components") : withPatterns || tabIn !== "patterns" ? tabIn : "components";
  const [showArchived, setShowArchived] = useState(false);
  const [q, setQ] = useState("");
  const float = useFloat(onFloatChange);
  /* Reordering from the outline. `moveId` is the row being dragged, `moveAt` the gap it would
     land in. A separate dataTransfer type from the palette's, so the canvas — which listens for
     new components — ignores an outline drag rather than adding a second copy of the block. */
  const MOVE_TYPE = `${dragType ?? "x"}+move`;
  const [moveId, setMoveId] = useState<string | null>(null);
  /** The outline stays readable while a page is locked, but reordering from it is an edit. */
  const canReorder = !!onReorder && canEdit && !lockedReason;
  const [moveAt, setMoveAt] = useState<number | null>(null);
  const outlineRef = useRef<HTMLUListElement>(null);
  const outlineIndexAt = (y: number) => {
    const rows = [...(outlineRef.current?.querySelectorAll<HTMLElement>("li[data-id]") ?? [])];
    for (let i = 0; i < rows.length; i++) { const r = rows[i].getBoundingClientRect(); if (y < r.top + r.height / 2) return i; }
    return rows.length;
  };
  const endMove = () => { setMoveId(null); setMoveAt(null); };
  /* Pattern hover preview. The short delay stops a card flashing for every row while the
     pointer sweeps the list; leaving a row clears it immediately, because a stale preview
     beside a different row is worse than none. */
  const [preview, setPreview] = useState<{ p: DesignPattern; top: number; left: number } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearPreview = useCallback(() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); setPreview(null); }, []);
  useEffect(() => clearPreview, [clearPreview]);
  // Hover or keyboard focus — a keyboard user picking a pattern needs the preview just as much.
  const previewOn = (p: DesignPattern) => (e: React.SyntheticEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setPreview({
      p,
      // Keep the card on screen when the row is near the bottom of a long list.
      top: Math.max(8, Math.min(r.top - 8, window.innerHeight - 260)),
      left: r.right + 8,
    }), 140);
  };
  const needle = q.trim().toLowerCase();

  const groups = useMemo(() => (allowedGroups ?? GROUPS.filter((g) => !PAGE_EXCLUDED.includes(g))).map((g) => ({
    id: g,
    items: BLOCKS.filter((b) => b.group === g && (!needle || b.name.toLowerCase().includes(needle) || b.desc.toLowerCase().includes(needle))),
  })).filter((g) => g.items.length > 0), [needle, allowedGroups]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  const match = (p: DesignPattern) => !needle || `${p.name} ${p.desc} ${partNames(p)}`.toLowerCase().includes(needle);
  const pats = (patterns ?? []).filter((p) => !p.archived && match(p));
  /* Two groups, so the row no longer has to repeat where each pattern came from. */
  const patGroups = useMemo(() => [
    { id: "Design system", items: pats.filter((p) => p.builtIn) },
    { id: "Saved by the team", items: pats.filter((p) => !p.builtIn) },
  ].filter((g) => g.items.length > 0), [patterns, needle]); // eslint-disable-line react-hooks/exhaustive-deps
  const archived = (patterns ?? []).filter((p) => p.archived && match(p));
  const where = (p: DesignPattern) => (p.markets?.length ? p.markets.map((m) => MARKETS.find((k) => k.id === m)?.flag ?? m).join(" ") + " only" : "All markets");

  const searching = needle.length > 0;
  const placeholder = tab === "patterns" ? "Find a pattern…" : "Find a component…";

  /* The mock's tab style: a quiet label with an underline on the active one. BDL's `bdl-tab`
     fills the active tab with charcoal, which at this size reads as a heavy block in a panel
     meant to be calm — so the panel keeps the mock's treatment. */
  const tabs = (
    <div role="tablist" aria-label="Left panel" className="flex min-w-0 flex-1 items-center">
      {/* Order is deliberate: the two things you add from come first, and Outline — which is
          about what is already on the page — sits last. */}
      {flow && <button role="tab" aria-selected={tab === "flow"} className={tabCls(tab === "flow")} onClick={() => onTab("flow")}>Steps</button>}
      <button role="tab" aria-selected={tab === "components"} className={tabCls(tab === "components")} onClick={() => onTab("components")}>Components</button>
      {withPatterns && <button role="tab" aria-selected={tab === "patterns"} className={tabCls(tab === "patterns")} onClick={() => onTab("patterns")}>Patterns</button>}
      <button role="tab" aria-selected={tab === "outline"} className={tabCls(tab === "outline")} onClick={() => onTab("outline")}>Outline</button>
    </div>
  );

  return (
    /* Container animates its WIDTH; the rail sits at the outer edge and the body is a fixed-width
       child pinned to the inner edge, so collapsing wipes the body out instead of squashing it.
       No resize handle: the panel is a fixed width, like the mock. */
    <aside data-ui data-side="left" {...float.panelProps}
      style={phone ? float.panelProps.style : float.floating ? { width, ...float.panelProps.style } : { width: hidden ? 0 : open ? width : collapsedWidth(), ...float.panelProps.style }}
      className={panelClass("left", float.floating, phone)}>
      {!float.floating && <CollapsedRail side="left" show={!open} label="Open the panel" onOpen={onOpenPanel} items={railItems} />}
      <PanelBody open={open} width={width} floating={float.floating}>
      {float.floating && <GripStrip float={float} />}
      <PanelHeader tabs={tabs} float={float} onClose={onClose} side="left" />
      {tab !== "outline" && tab !== "flow" && <div className="flex shrink-0 items-center gap-1 border-b border-line p-2.5">
        {(
          <div className="relative min-w-0 flex-1">
            <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 fill-none stroke-current text-ink-3" strokeWidth={1.8} strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
            <input className="bdl-field !ps-9 !pe-8" placeholder={placeholder} aria-label={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button type="button" onClick={() => setQ("")} aria-label="Clear the search"
              className="absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 cursor-pointer place-items-center rounded text-ink-3 hover:text-ink">
              <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>}
          </div>
        )}
      </div>}

      <LockedVeil on={!!lockedReason && tab !== "outline"} reason={lockedReason ?? ""} onEdit={onEdit}>
        {!canEdit && tab !== "outline" && <div className="shrink-0 border-b border-line bg-surface-3 px-3 py-2 text-xs text-ink-3">Read-only: you can look, but not add.</div>}

        {tab === "flow" && flow}

        {/* ---- Components: one line each, inside collapsible groups ---- */}
        {tab === "components" && (
          <div className="min-h-0 flex-1 overflow-auto">
            {total === 0
              ? <Empty q={q} onClear={() => setQ("")} />
              : groups.map((g, gi) => (
                /* Only the first group starts open, so the panel opens tidy instead of as one long list.
                   While searching every group is forced open — a hit hidden inside a collapsed group reads as "no results". */
                <PanelSection key={g.id} id={`grp-${g.id}`} title={FIXED_GROUPS.includes(g.id) ? `${g.id} · fixed` : g.id} count={g.items.length} defaultOpen={gi === 0 || !!allowedGroups?.includes("Body")} {...(searching ? { open: true } : {})}>
                  <ul className="m-0 list-none p-0">
                    {FIXED_GROUPS.includes(g.id) && <li className="px-3 pb-1 text-[11px] text-ink-3">Comes with the template. Click to edit it.</li>}
                    {g.items.map((b) => { const Icon = iconFor(b.type); const fixed = FIXED_GROUPS.includes(g.id); return (
                      <li key={b.type} className="m-0 p-0">
                        {/* Click to add after the selection, or drag onto the page to choose where it lands. */}
                        <button type="button" disabled={!canEdit} onClick={() => onAdd(b.type)} title={fixed ? `${b.desc} · edit only` : b.desc} className={rowCls}
                          draggable={!!dragType && canEdit && !fixed}
                          onDragStart={(e) => { if (!dragType) return; e.dataTransfer.setData(dragType, b.type); e.dataTransfer.effectAllowed = "copy"; }}>
                          <Icon className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{b.name}</span>
                          <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded text-ink-3 opacity-0 transition-opacity duration-150 ease-out group-hover/item:opacity-100 group-focus-visible/item:opacity-100">
                            <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round"><path d={fixed ? "M4 20h4L19 9l-4-4L4 16z" : "M12 5v14M5 12h14"} /></svg>
                          </span>
                        </button>
                      </li>
                    ); })}
                  </ul>
                </PanelSection>
              ))}
          </div>
        )}

        {/* ---- Outline: the page's blocks in order. One level — the document is a flat stack. ---- */}
        {tab === "outline" && (
          <div className="min-h-0 flex-1 overflow-auto py-1">
            {blocks.length === 0
              ? <p className="px-4 py-8 text-center text-sm text-ink-3">Nothing on the page yet. Add a component to start.</p>
              : <ul ref={outlineRef} className="m-0 list-none p-0"
                  onDragOver={(e) => { if (!canReorder || !e.dataTransfer.types.includes(MOVE_TYPE)) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; const i = outlineIndexAt(e.clientY); if (i !== moveAt) setMoveAt(i); }}
                  onDrop={(e) => { if (!canReorder) return; const id = e.dataTransfer.getData(MOVE_TYPE); if (!id) return; e.preventDefault(); const to = moveAt ?? outlineIndexAt(e.clientY); endMove(); onReorder(id, to); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setMoveAt(null); }}>
                {blocks.map((b, i) => { const def = BLOCK_BY_TYPE[b.type]; const Icon = iconFor(b.type); const on = selected === b.id; return (
                  <li key={b.id} data-id={b.id} className="relative m-0 p-0">
                    {moveAt === i && <div aria-hidden className="absolute inset-x-0 -top-px z-10 h-0.5 bg-brand" />}
                    <button type="button" onClick={() => onSelect(b.id)} aria-current={on ? "true" : undefined}
                      draggable={!!canReorder}
                      onDragStart={(e) => { if (!canReorder) return; e.dataTransfer.setData(MOVE_TYPE, b.id); e.dataTransfer.effectAllowed = "move"; setMoveId(b.id); }}
                      onDragEnd={endMove}
                      className={`group/row flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-[color,background-color,opacity] duration-150 ease-out hover:bg-surface-2 ${canReorder ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${moveId === b.id ? "opacity-40" : ""} ${on ? "bg-brand-soft text-ink shadow-[inset_2px_0_0_var(--color-brand,currentColor)]" : "text-ink-2"}`}>
                      <span className="w-4 shrink-0 text-right text-xs tabular-nums text-ink-4">{i + 1}</span>
                      <Icon className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{def?.name ?? b.type}</span>
                      {b.props.hidden ? <span className="flex-none text-xs text-ink-4">hidden</span> : null}
                      {b.props.locked ? <Lock className="size-3 shrink-0 text-ink-4" strokeWidth={1.5} aria-label="Locked" /> : null}
                      {onReorder && <GripVertical className="size-3.5 shrink-0 text-ink-4 opacity-0 transition-opacity duration-150 ease-out group-hover/row:opacity-100" strokeWidth={1.5} aria-hidden />}
                    </button>
                    {moveAt === i + 1 && i === blocks.length - 1 && <div aria-hidden className="absolute inset-x-0 -bottom-px z-10 h-0.5 bg-brand" />}
                  </li>
                ); })}
              </ul>}
          </div>
        )}

        {/* ---- Design patterns ----
             Grouped and one-line, exactly like the components list. The per-row "System" badge
             and the "N components · All markets" sub-line are gone: the badge said the same word
             on every row, and the sub-line was identical on all but one. The group heading now
             carries the first, the hover preview carries the detail, and only a genuine market
             restriction still shows on the row — because that is the only part that varies. ---- */}
        {tab === "patterns" && (
          <div className="min-h-0 flex-1 overflow-auto">
            {patterns === null && <div className="p-6 text-center text-sm text-ink-3">Loading…</div>}
            {patterns !== null && !pats.length && <Empty q={q} onClear={() => setQ("")} none="No patterns yet." />}
            {patGroups.map((g, gi) => (
              <PanelSection key={g.id} id={`pat-${g.id}`} title={g.id} count={g.items.length} defaultOpen={gi === 0} {...(searching ? { open: true } : {})}>
                <ul className="m-0 list-none p-0">
                  {g.items.map((p) => (
                    <li key={p.id} className="group/item relative m-0 p-0" onMouseEnter={previewOn(p)} onMouseLeave={clearPreview}>
                      <button type="button" disabled={!canEdit} onClick={() => { clearPreview(); onAddPattern(p); }} onFocus={previewOn(p)} onBlur={clearPreview}
                        title={p.desc || p.name} className={rowCls}
                        draggable={!!patternDragType && canEdit}
                        onDragStart={(e) => { if (!patternDragType) return; e.dataTransfer.setData(patternDragType, p.id); e.dataTransfer.effectAllowed = "copy"; clearPreview(); }}>
                        <Shapes className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{p.name}</span>
                        {p.markets?.length ? <span className="flex-none text-[11px] leading-none" title={where(p)} aria-label={where(p)}>{p.markets.map((m) => MARKETS.find((k) => k.id === m)?.flag ?? m).join("")}</span> : null}
                        <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded text-ink-3 opacity-0 transition-opacity duration-150 ease-out group-hover/item:opacity-100">
                          <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                        </span>
                      </button>
                      {mayManage(p) && (
                        <span className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-1 bg-surface-2 opacity-0 transition-opacity duration-150 ease-out group-hover/item:opacity-100 focus-within:opacity-100">
                          <button type="button" onClick={() => onPatternMarkets(p)} title="Choose the markets that see this pattern" className="cursor-pointer border border-line bg-surface px-1.5 py-0.5 text-xs font-medium text-ink-2 hover:text-ink">Markets</button>
                          <button type="button" onClick={() => onRemovePattern(p)} title={`Remove ${p.name}`} aria-label={`Remove ${p.name}`} className="grid size-5 cursor-pointer place-items-center rounded border border-line bg-surface text-ink-3 hover:border-crit hover:text-crit">
                            <svg viewBox="0 0 24 24" aria-hidden className="size-3 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h14M10 11v6M14 11v6M6.5 7l1 13h9l1-13M9 7V4h6v3" /></svg>
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </PanelSection>
            ))}
            {archived.length > 0 && (
              <PanelSection id="archived" title="Archived" count={archived.length} defaultOpen={false} open={showArchived} onToggle={setShowArchived}>
                <ul className="m-0 grid list-none gap-1 p-0">
                  {archived.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-xs">
                      <span className="min-w-0 flex-1"><b className="block truncate text-ink-2">{p.name}</b><small className="text-xs block text-ink-3">by {p.archived!.name} · {new Date(p.archived!.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></span>
                      {mayManage(p) && <><button type="button" className="btn btn-sm btn-secondary" onClick={() => onRestorePattern(p)}>Restore</button><button type="button" className="btn btn-sm btn-secondary text-brand" onClick={() => onDeletePattern(p)}>Delete</button></>}
                    </li>
                  ))}
                </ul>
              </PanelSection>
            )}
            {/* Creating one is an action, not an item, so it sits at the end rather than shouting from the top. */}
            {canEdit && (
              <button type="button" onClick={onStartPattern} disabled={creating}
                className="flex w-full cursor-pointer items-center gap-2 border-t border-line px-2.5 py-2 text-left text-[13px] text-ink-2 transition-colors duration-150 ease-out hover:bg-surface-2 hover:text-ink disabled:cursor-default disabled:text-brand">
                <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 shrink-0 fill-none stroke-current" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                <span className="min-w-0 flex-1 truncate">{creating ? "Pick the components on the page…" : "Create a design pattern"}</span>
              </button>
            )}
          </div>
        )}
      </LockedVeil>

      {/* The bottom bar is the tour's home now — the running commentary that used to live here
          said what the rows already show. */}
      {onHelp && (
        <div className="flex shrink-0 items-center border-t border-line px-1.5 py-1.5 text-xs">
          <button type="button" data-tour-help onClick={onHelp} title="How the editor works" aria-label="How the editor works"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-ink-3 transition-[color,background-color] duration-150 ease-out hover:bg-surface-3 hover:text-ink">
            <CircleHelp className="size-3.5 shrink-0" strokeWidth={1.6} aria-hidden />
            How it works
          </button>
        </div>
      )}
      </PanelBody>
      {preview && !float.floating && open && <PatternPreview {...preview} />}
    </aside>
  );
}

function Empty({ q, onClear, none = "Nothing here yet." }: { q: string; onClear: () => void; none?: string }) {
  if (!q.trim()) return <p className="p-6 text-center text-sm text-ink-3">{none}</p>;
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium">Nothing matches “{q.trim()}”</p>
      <p className="mt-1 text-xs text-ink-3">Try a shorter word, or clear the search.</p>
      <button type="button" className="btn btn-sm btn-secondary mt-3" onClick={onClear}>Clear search</button>
    </div>
  );
}
