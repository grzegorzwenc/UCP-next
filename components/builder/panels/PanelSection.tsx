"use client";
import { useState } from "react";

/**
 * A collapsible section header, shared by both builder panels: the left panel's component
 * groups and the right panel's Content / Layout / Behaviour / Metadata.
 *
 * Deliberately not animated open and closed. Expanding a group is a tens-of-times-a-day
 * action, and height animation on a list that long is the kind of motion that reads as lag
 * rather than as feedback. Only the chevron rotates, which is what the mock does too.
 *
 * `count` is shown right-aligned when given — the group sizes are useful at a glance and
 * they are what makes a collapsed list still legible.
 */
export function PanelSection({ id, title, count, defaultOpen = true, open: openIn, onToggle, right, children }: {
  id?: string;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  /** Controlled mode: when `open` is given the caller owns the state (used for "search forces open"). */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  /** Optional control pinned to the right of the header, e.g. a "Clear" link. */
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [selfOpen, setSelfOpen] = useState(defaultOpen);
  const open = openIn ?? selfOpen;
  const toggle = () => { if (openIn === undefined) setSelfOpen(!open); onToggle?.(!open); };
  const panelId = id ? `${id}-panel` : undefined;
  return (
    <div className="border-b border-line/70 last:border-b-0">
      <h6 className="m-0">
        <button type="button" aria-expanded={open} aria-controls={panelId}
          className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[.1em] text-ink-3 transition-colors hover:text-ink"
          onClick={toggle}>
          <Chevron open={open} />
          <span className="min-w-0 truncate">{title}</span>
          {count !== undefined && <span className="ml-auto font-normal tabular-nums opacity-70">{count}</span>}
        </button>
      </h6>
      {open && <div id={panelId} className="px-4 pb-3.5">{children}</div>}
      {open && right}
    </div>
  );
}

/** The one moving part: 200ms ease-out, which is the only motion a disclosure needs. */
export function Chevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden
      className={`size-3.5 shrink-0 fill-none stroke-current transition-transform duration-200 ease-out ${open ? "rotate-90" : ""} ${className}`}
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
