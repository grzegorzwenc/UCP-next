"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * Left tree panel of two-pane screens. From md up it is the usual side column. On phones it folds into one
 * "Folders · current place" button, so the list comes first; it folds again by itself after you pick something.
 */
export function SideTree({ label, current, className = "", children }: { label: string; current?: string; className?: string; children: React.ReactNode }) {
  const here = `${usePathname()}?${useSearchParams().toString()}`;
  const [openAt, setOpenAt] = useState<string | null>(null); const open = openAt === here;
  return <aside className={`bg-surface border-b md:border-b-0 md:border-r border-line md:overflow-auto ${className}`}>
    <button type="button" className="md:hidden w-full flex items-center gap-2 px-4 py-3 text-left text-sm" aria-expanded={open} onClick={() => setOpenAt(open ? null : here)}>
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current text-ink-3 flex-none" strokeWidth={1.8} aria-hidden><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
      <b className="font-medium">{label}</b>{current && <span className="text-ink-3 truncate min-w-0">· {current}</span>}
      <span className="ml-auto text-ink-3 text-xs" aria-hidden>{open ? "▴" : "▾"}</span>
    </button>
    <div className={`${open ? "block border-t border-line" : "hidden"} md:block p-3`}>{children}</div>
  </aside>;
}
