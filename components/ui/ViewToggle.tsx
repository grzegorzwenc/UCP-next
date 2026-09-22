"use client";
import Link from "next/link";

/** Segmented Grid / List switch. Pass `hrefs` to drive it by URL (server-rendered lists) or `onChange` for client state. */
export function ViewToggle({ value, onChange, hrefs, className = "" }: { value: "grid" | "list"; onChange?: (v: "grid" | "list") => void; hrefs?: { grid: string; list: string }; className?: string }) {
  const items: ["grid" | "list", string, React.ReactNode][] = [
    ["grid", "Grid", <svg key="g" viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth={1.8} aria-hidden><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>],
    ["list", "List", <svg key="l" viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M4 6h16M4 12h16M4 18h16" /></svg>],
  ];
  return <div role="group" aria-label="View" className={`inline-flex border border-line-2 rounded-lg overflow-hidden bg-surface ${className}`}>
    {items.map(([v, l, ic]) => { const on = value === v; const cls = `inline-flex items-center gap-1.5 px-3 h-8 text-[13px] font-medium ${on ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2"}`;
      return hrefs ? <Link key={v} href={hrefs[v]} aria-current={on ? "true" : undefined} className={cls}>{ic}{l}</Link> : <button key={v} type="button" aria-pressed={on} onClick={() => onChange?.(v)} className={cls}>{ic}{l}</button>; })}
  </div>;
}
