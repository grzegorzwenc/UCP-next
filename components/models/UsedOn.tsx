"use client";
import Link from "next/link";
import { useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { PageIcon } from "@/components/ui/Icons";
import type { UsedPage } from "./fieldMeta";

const STATUS_WORD: Record<string, string> = { published: "live", review: "waiting for a reviewer", inreview: "in author's review", reviewed: "reviewed", bizreview: "in business review", approved: "ready to publish", scheduled: "scheduled", draft: "draft", failed: "failed" };
const ORDER = ["published", "scheduled", "approved", "bizreview", "reviewed", "inreview", "review", "draft", "failed"];

/**
 * "Used on" card shared by content models and content entities: how many pages, which market, a status summary
 * and a list of the pages (title, address, status) that open in the page builder.
 */
export function UsedOn({ pages, base, marketRoot, marketName, flag, note, empty, extra, go, compact }: {
  pages: UsedPage[]; base: string; marketRoot: string; marketName: string; flag?: string; note?: React.ReactNode; empty: React.ReactNode; extra?: React.ReactNode;
  /** In-app navigation that respects unsaved changes (optional). */ go?: (href: string) => void; compact?: boolean;
}) {
  const [q, setQ] = useState(""); const [all, setAll] = useState(false);
  const counts = ORDER.map((s) => [s, pages.filter((p) => p.status === s).length] as const).filter(([, n]) => n > 0);
  const sorted = [...pages].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.title.localeCompare(b.title));
  const ql = q.trim().toLowerCase(); const hits = ql ? sorted.filter((p) => `${p.title} ${p.path}`.toLowerCase().includes(ql)) : sorted;
  const shown = all || ql ? hits : hits.slice(0, compact ? 5 : 8);
  const href = (p: UsedPage) => `${base}/page${p.path.replace(marketRoot, "")}`;
  return <section className="bg-surface border border-line rounded-xl overflow-hidden" aria-label="Where it is used">
    <header className="px-4 pt-3.5 pb-3 border-b border-line">
      <div className="flex items-baseline gap-2"><h3 className="text-sm font-medium">Used on</h3><span className="text-xl font-medium leading-none tabular-nums">{pages.length}</span><span className="text-xs text-ink-3">page{pages.length === 1 ? "" : "s"}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-ink-3 bg-surface-2 border border-line rounded-full px-2 py-0.5 whitespace-nowrap">{flag} {marketName}</span></div>
      {counts.length > 0 && <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-ink-3">{counts.map(([s, n]) => <span key={s} className="inline-flex items-center gap-1.5"><Pill status={s} label={String(n)} />{STATUS_WORD[s] ?? s}</span>)}</div>}
      {extra}
    </header>
    {pages.length ? <>
      {pages.length > 6 && <div className="px-4 pt-3"><input className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-xs" placeholder="Find a page" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a page" /></div>}
      <ul className="py-1.5">{shown.map((p) => <li key={p.path}>
        <Link href={href(p)} onClick={go ? (e) => { e.preventDefault(); go(href(p)); } : undefined} className="group flex items-center gap-2.5 px-4 py-2 hover:bg-surface-2">
          <PageIcon /><span className="flex-1 min-w-0"><span className="block text-sm font-medium text-ink truncate group-hover:underline">{p.title}</span><span className="block text-xs text-ink-3 truncate">{p.path.replace(marketRoot, "") || "/"}</span></span>
          <Pill status={p.status} /><span className="text-ink-4 group-hover:text-ink" aria-hidden>›</span></Link></li>)}
        {!shown.length && <li className="px-4 py-3 text-xs text-ink-3">No page matches “{q}”.</li>}</ul>
      {!ql && hits.length > shown.length && <div className="px-4 pb-3"><button type="button" className="btn btn-sm btn-secondary w-full justify-center" onClick={() => setAll(true)}>Show all {hits.length} pages</button></div>}
      {note && <p className="px-4 pb-3 text-xs text-ink-3">{note}</p>}
    </> : <div className="px-4 py-5 text-center"><span className="inline-grid place-items-center w-9 h-9 rounded-full bg-surface-3 text-ink-3 mb-2"><PageIcon /></span><div className="text-sm font-medium">Not used on any page yet</div><p className="text-xs text-ink-3 mt-0.5">{empty}</p></div>}
  </section>;
}
