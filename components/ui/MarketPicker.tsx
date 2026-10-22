"use client";
import { MARKETS } from "@/lib/markets";

/** Where something from the shared library (design pattern, page template) shows: every market, or only the local markets ticked here. Empty list = all. */
export function MarketPicker({ value, onChange, current, what, disabled }: { value: string[]; onChange: (m: string[]) => void; current: string; what: "pattern" | "template"; disabled?: boolean }) {
  const only = value.length > 0;
  return <fieldset className="grid gap-2">
    <legend className="text-xs text-ink-2 font-medium mb-1">Who can use it</legend>
    <label className="flex items-start gap-2 text-sm cursor-pointer"><input type="radio" name={`${what}-where`} disabled={disabled} className="mt-0.5 accent-[var(--brand)]" checked={!only} onChange={() => onChange([])} /><span><b>All markets</b><small className="block text-ink-3">{what === "pattern" ? "Every local market sees it in Design patterns." : "Every local market can create pages from it."}</small></span></label>
    <label className="flex items-start gap-2 text-sm cursor-pointer"><input type="radio" name={`${what}-where`} disabled={disabled} className="mt-0.5 accent-[var(--brand)]" checked={only} onChange={() => onChange([current])} /><span><b>Only some local markets</b><small className="block text-ink-3">For local campaigns, products or rules.</small></span></label>
    {only && <ul className="ml-6 grid grid-cols-2 gap-1">{MARKETS.map((m) => <li key={m.id}><label className="flex items-center gap-2 border border-line rounded-md px-2.5 py-1.5 text-xs cursor-pointer hover:bg-surface-2">
      <input type="checkbox" disabled={disabled} className="accent-[var(--brand)]" checked={value.includes(m.id)} onChange={(e) => { const next = e.target.checked ? [...value, m.id] : value.filter((x) => x !== m.id); onChange(next.length ? next : value); /* keep at least one */ }} />
      <span aria-hidden>{m.flag}</span><span className="truncate">{m.name.replace("HSBC ", "")}</span>{m.id === current && <small className="ml-auto text-ink-3">this one</small>}</label></li>)}</ul>}
  </fieldset>;
}

