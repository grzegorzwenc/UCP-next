"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export type MenuItem = { id: string; label: React.ReactNode; onSelect: () => void; disabled?: boolean; danger?: boolean };

/**
 * Accessible dropdown menu (WAI-ARIA menu button pattern).
 *   - trigger: aria-haspopup="menu" + aria-expanded, opens with click, Enter, Space, ArrowDown (first item) or ArrowUp (last item)
 *   - items: role="menuitem" with roving tabindex; ArrowUp/Down wrap, Home/End jump, Escape closes and returns focus to the trigger
 *   - clicking outside (or focusing outside) closes it
 */
export function Menu({ label, ariaLabel, items, align = "right", className = "", buttonClassName = "btn btn-sm" }: { label: React.ReactNode; ariaLabel?: string; items: MenuItem[]; align?: "left" | "right"; className?: string; buttonClassName?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null); const btnRef = useRef<HTMLButtonElement>(null); const listRef = useRef<HTMLDivElement>(null);
  const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

  const close = useCallback((restore = true) => { setOpen(false); if (restore) btnRef.current?.focus(); }, []);
  const show = (start: "first" | "last") => { setActive(start === "first" ? enabled[0] ?? 0 : enabled[enabled.length - 1] ?? 0); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.focus();
  }, [open, active]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | FocusEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("focusin", away);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("focusin", away); };
  }, [open]);

  const step = (d: 1 | -1) => { if (!enabled.length) return; const pos = enabled.indexOf(active); setActive(enabled[(pos + d + enabled.length) % enabled.length]); };
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); step(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); step(-1); }
    else if (e.key === "Home") { e.preventDefault(); setActive(enabled[0] ?? 0); }
    else if (e.key === "End") { e.preventDefault(); setActive(enabled[enabled.length - 1] ?? 0); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "Tab") close(false);
  };
  const onButtonKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); show("first"); }
    else if (e.key === "ArrowUp") { e.preventDefault(); show("last"); }
  };
  const run = (it: MenuItem) => { if (it.disabled) return; close(); it.onSelect(); };

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button ref={btnRef} type="button" id={`${id}-btn`} className={buttonClassName} aria-label={ariaLabel} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? `${id}-menu` : undefined}
        onClick={(e) => { e.stopPropagation(); if (open) close(); else show("first"); }} onKeyDown={onButtonKey}>{label}</button>
      {open && (
        <div ref={listRef} id={`${id}-menu`} role="menu" aria-labelledby={`${id}-btn`} onKeyDown={onListKey}
          className={`absolute top-full mt-1 min-w-[176px] bg-surface border border-line rounded-lg shadow-2xl py-1 text-[13px] text-ink z-30 ${align === "right" ? "right-0" : "left-0"}`}>
          {items.map((it, i) => (
            <button key={it.id} type="button" role="menuitem" data-i={i} tabIndex={i === active ? 0 : -1} disabled={it.disabled} aria-disabled={it.disabled || undefined}
              onMouseEnter={() => !it.disabled && setActive(i)} onClick={(e) => { e.stopPropagation(); run(it); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-surface-3 focus:bg-surface-3 outline-none disabled:opacity-40 ${it.danger ? "text-brand border-t border-line mt-1" : ""}`}>{it.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
