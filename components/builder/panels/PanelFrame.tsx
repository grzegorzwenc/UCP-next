"use client";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PictureInPicture2, Pin, GripVertical } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/shadcn/tooltip";
import type { Float } from "./useFloat";

/* size-6, not size-7: with three tabs beside them the header has to fit inside a 260px panel. */
const ctl = "grid size-6 flex-none cursor-pointer place-items-center rounded text-ink-3 transition-[color,background-color,border-color,transform] duration-150 ease-out hover:bg-surface-3 hover:text-ink active:scale-[0.97]";

/**
 * The collapse control, given a surface of its own.
 *
 * Bare, it was an outline glyph in a header full of other outline glyphs — the one control
 * that changes the shape of the editor read as the least important thing on the row. A light
 * `surface-2` fill was no better: at #f9f9f9 against a white header it is a 2% shade.
 *
 * So: charcoal, which is BDL's own strong treatment (`.bdl-tab-active` fills with the same
 * colour). Not brand red — that is spoken for by the underline on the active tab, and two
 * red things on one row both claiming attention is worse than none.
 */
const collapseCtl = `${ctl} bg-ink text-white hover:bg-ink-2 hover:text-white`;

/** Grip strip shown at the top of a detached panel. The only handle that moves it. */
export function GripStrip({ float }: { float: Float }) {
  return (
    <div onPointerDown={float.onGripDown} title="Drag to move"
      className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center border-b border-line bg-surface-2 active:cursor-grabbing">
      <GripVertical className="size-3.5 rotate-90 text-ink-4" strokeWidth={1.5} aria-hidden />
    </div>
  );
}

/**
 * The header both builder panels share: title, then detach/dock and close.
 *
 * The controls sit in one group at the end so the two panels mirror each other, and the
 * title stays a plain label — the panel already says what it is by what it contains, so a
 * heavier header only costs height. `tabs` renders in place of the title when a panel has
 * them, which is how the left panel puts Components / Outline / Patterns on the same row as
 * its controls instead of spending a second row on them.
 */
/** Detach + collapse, on their own, for panels that place them outside a header row. */
export function PanelControls({ float, onClose, side, canDetach = true }: { float: Float; onClose: () => void; side: "left" | "right"; canDetach?: boolean }) {
  return <PanelHeader float={float} onClose={onClose} side={side} canDetach={canDetach} bare />;
}

export function PanelHeader({ title, tabs, float, onClose, side, canDetach = true, bare = false }: {
  title?: string;
  tabs?: React.ReactNode;
  float: Float;
  onClose: () => void;
  side: "left" | "right";
  /** `bare` drops the header chrome and renders only the controls. */
  bare?: boolean;
  /** The right panel stays docked: it is the canvas's pair, and floating it over the page it
      describes puts it on top of the thing being configured. */
  canDetach?: boolean;
}) {
  return (
    <div className={bare ? "flex flex-none items-center gap-1" : "flex items-center gap-1 border-b border-line pe-1.5 ps-1"}>
      {bare ? null : tabs ?? <b className="min-w-0 flex-1 truncate px-2.5 py-2 text-sm">{title}</b>}
      {/* Keeps the last tab from sitting flush against the dock/collapse pair. */}
      {!bare && <span className="ms-2" aria-hidden />}
      {canDetach && <button type="button" className={ctl} onClick={() => (float.floating ? float.dock() : float.detach())}
        title={float.floating ? "Dock the panel back" : "Detach the panel so it floats over the canvas"}
        aria-label={float.floating ? "Dock the panel" : "Detach the panel"} aria-pressed={float.floating}>
        {float.floating ? <Pin className="size-3.5" strokeWidth={1.5} aria-hidden /> : <PictureInPicture2 className="size-3.5" strokeWidth={1.5} aria-hidden />}
      </button>}
      <button type="button" className={collapseCtl} onClick={onClose} title="Collapse the panel" aria-label="Collapse the panel">
        {side === "left" ? <PanelLeftClose className="size-3.5" strokeWidth={1.5} aria-hidden /> : <PanelRightClose className="size-3.5" strokeWidth={1.5} aria-hidden />}
      </button>
    </div>
  );
}

/** Width of the slim bar a collapsed panel leaves behind. */
export const RAIL_W = 48;

/**
 * Rail buttons across both bars: 40px target, 20px glyph at 1.6 stroke.
 *
 * The weight is deliberate. A 24px glyph at 1.7 looked heavy-handed beside the 14px icons in
 * the docked panel's rows — at rail size a thick stroke reads as a different, louder icon set
 * rather than the same one repeated, so the two sides stopped looking related.
 */
const railBtn = "grid size-10 cursor-pointer place-items-center rounded-lg text-ink-3 transition-[color,background-color,transform] duration-150 ease-out hover:bg-surface-3 hover:text-ink active:scale-[0.97]";

/**
 * The panel container. Its WIDTH animates; the body inside is clipped by `overflow: hidden`.
 * Closed, a left panel narrows to its rail; a right panel closes to nothing, because its rail
 * is the builder's own 7-icon nav sitting beside it.
 */
export function panelClass(side: "left" | "right", floating: boolean, phone?: boolean) {
  if (phone) return "absolute inset-x-0 top-0 bottom-12 bg-surface flex flex-col z-[5]";
  if (floating) return "fixed top-28 z-30 flex max-h-[72vh] flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-2xl " + (side === "left" ? "left-6" : "right-[72px]");
  return `bld-panel absolute ${side === "left" ? "left-0 border-r" : "right-0 border-l"} top-0 bottom-0 bg-surface border-line z-[5]`;
}

/** Collapsed width: a left panel leaves its rail behind, a right panel leaves nothing. */
/** Both panels leave the same slim bar behind when collapsed. */
export const collapsedWidth = () => RAIL_W;

/**
 * The body.
 *
 * Docked it is absolutely positioned at a fixed width, anchored to the container's moving
 * edge, so collapsing wipes it rather than squashing it. Detached that would be wrong: an
 * absolutely positioned child gives the floating card nothing to size itself from, and the
 * card collapses to nothing. So when floating the body returns to normal flow and the
 * container carries the width instead.
 */
export function PanelBody({ open, width, floating = false, children }: { open: boolean; width: number; floating?: boolean; children: React.ReactNode }) {
  if (floating) return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  return <div className="bld-panel-body" data-on={open} style={{ width }} aria-hidden={!open} inert={!open || undefined}>{children}</div>;
}

/**
 * The slim bar a collapsed panel leaves behind, carrying the control that brings it back.
 *
 * This is the only way to reopen a panel now that the top bar's two toggles are gone: the
 * control that reopens a thing belongs where the thing was, not in a toolbar on the other
 * side of the screen. It fades in on a delay so it never overlaps the panel sliding out.
 */
export function CollapsedRail({ side, label, onOpen, show, items = [] }: {
  side: "left" | "right";
  label: string;
  onOpen: () => void;
  show: boolean;
  /** The panel's tabs, repeated on the bar so a collapsed panel can be reopened straight onto one. */
  items?: { key: string; label: string; path: string; active?: boolean; onClick: () => void }[];
}) {
  return (
    <div aria-hidden={!show} inert={!show || undefined} data-on={show} style={{ width: RAIL_W }}
      className="bld-panel-rail bg-surface py-2.5" role="toolbar" aria-orientation="vertical" aria-label={label}>
      <button type="button" onClick={onOpen} title={label} aria-label={label} className={railBtn}>
        {side === "left" ? <PanelLeftOpen className="size-5" strokeWidth={1.5} aria-hidden /> : <PanelRightOpen className="size-5" strokeWidth={1.5} aria-hidden />}
      </button>
      {items.length > 0 && <span className="my-1 h-px w-5 bg-line" aria-hidden />}
      {items.map((it) => (
        <button key={it.key} type="button" onClick={it.onClick} title={it.label} aria-label={it.label} aria-pressed={it.active}
          className={`${railBtn} ${it.active ? "text-brand" : ""}`}>
          <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={it.path} /></svg>
        </button>
      ))}
    </div>
  );
}

/**
 * The right panel's tabs, as icons across the top of the panel itself.
 *
 * They used to be a permanent 52px rail beside the panel — a column of chrome standing there
 * whether the panel was open or not. Moving them inside mirrors the left panel: no rail while
 * expanded, a slim bar only once collapsed, and 52px back to the canvas.
 *
 * Icons alone need their names available, so each carries a hover/focus tooltip, and the open
 * one is named in full on the row underneath. `aria-label` carries the name regardless, so the
 * tooltip is a convenience for sighted users rather than the only way to know what a tab is.
 */
/* A full second before a tooltip appears. These tabs are used many times a session and their
   icons sit shoulder to shoulder, so a quick tooltip fires constantly just from crossing the
   row on the way somewhere else. The delay means it only speaks when someone actually pauses
   to ask what an icon is. */
const TOOLTIP_DELAY = 1000;

export function IconTabs({ items, label, leading }: {
  label: string;
  items: { key: string; label: string; path: string; active?: boolean; badge?: number; onClick: () => void }[];
  /** Pinned to the START of the row — the collapse control leads, as on the left panel. */
  leading?: React.ReactNode;
}) {
  return (
    /* A nested provider: the delay belongs to this row, not to every tooltip in the editor. */
    <TooltipProvider delay={TOOLTIP_DELAY}>
    <div role="tablist" aria-label={label} className="flex shrink-0 items-stretch border-b border-line px-1">
      {leading && <span className="flex flex-none items-center pe-1">{leading}</span>}
      {items.map((it) => (
        <Tooltip key={it.key}>
          <TooltipTrigger
            render={
              /* Same selected treatment as the left panel's tabs: the label darkens and a brand
                 underline sits on the row's edge — no filled box, so the two panels match. The
                 buttons flex, so seven icons share the full width instead of bunching left. The
                 glyph is 14px at 1.5 stroke — the same as the collapse control beside it. */
              <button type="button" role="tab" aria-selected={it.active} aria-label={it.badge ? `${it.label}, ${it.badge}` : it.label} onClick={it.onClick}
                className={`relative flex flex-1 cursor-pointer items-center justify-center py-2.5 transition-colors duration-150 ease-out ${it.active ? "text-ink after:absolute after:inset-x-1.5 after:bottom-0 after:h-0.5 after:bg-brand" : "text-ink-3 hover:text-ink"}`}>
                <span className="relative inline-flex">
                  <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-none stroke-current" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={it.path} /></svg>
                  {!!it.badge && it.badge > 0 && (
                    /* A dot, not a count: on a row of seven 14px icons a numbered pill was the
                       loudest thing in the panel, and the exact number is not what you need at a
                       glance — only that the tab has something waiting. The ring keeps it legible
                       against the icon it sits on. */
                    <span aria-hidden className="absolute -right-1 -top-0.5 size-1.5 rounded-full bg-brand ring-2 ring-surface" />
                  )}
                </span>
              </button>
            }
          />
          <TooltipContent side="bottom">{it.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
    </TooltipProvider>
  );
}

/** The collapse control on its own, for panels that place it outside a header row. */
export function CollapseButton({ side, onClose }: { side: "left" | "right"; onClose: () => void }) {
  return (
    <button type="button" className={collapseCtl} onClick={onClose} title="Collapse the panel" aria-label="Collapse the panel">
      {side === "left" ? <PanelLeftClose className="size-3.5" strokeWidth={1.5} aria-hidden /> : <PanelRightClose className="size-3.5" strokeWidth={1.5} aria-hidden />}
    </button>
  );
}
