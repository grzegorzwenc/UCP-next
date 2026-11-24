"use client";
import { useId, useState } from "react";
import { Info } from "lucide-react";

/**
 * Small ⓘ with an explanation. Shows on hover and on keyboard focus (and on tap), so it works for mouse, keyboard and touch.
 * `align` keeps the bubble inside tables: "left" opens to the right of the icon, "right" to the left.
 */
export function InfoTip({ text, label, align = "center" }: { text: React.ReactNode; label: string; align?: "left" | "center" | "right" }) {
  const [open, setOpen] = useState(false); const id = useId();
  const pos = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return <span className="relative inline-flex align-middle normal-case tracking-normal font-normal" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" aria-label={`What does ${label} mean?`} aria-describedby={open ? id : undefined} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
      className="ml-1 inline-flex cursor-pointer text-ink-4 transition-colors hover:text-ink"><Info className="size-3.5" aria-hidden /></button>
    {open && <span role="tooltip" id={id} className={`absolute z-40 top-full mt-1.5 ${pos} w-[240px] rounded-md bg-foreground text-background text-xs leading-snug px-2.5 py-2 shadow-xl text-left whitespace-normal`}>{text}</span>}
  </span>;
}
