"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import type { Task } from "@/lib/ucp/types";
import { repoApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { useSession } from "@/components/shell/Session";
import { Pill } from "@/components/ui/Pill";
import { Avatar } from "@/components/ui/Avatar";
import { PageIcon } from "@/components/ui/Icons";

type Sort = "due" | "name" | "kind" | "from" | "assignee" | "waiting";
type Props = { marketId: string; envId: string; root: string; marketName: string; tasks: Task[]; q: string; kind: string; sort: Sort };

/** Due chip copy: overdueDays > 0 = overdue, 0 = today, -1 = tomorrow, else the date. */
export function dueLabel(t: Task): { t: string; c: "crit" | "warn" | "" } {
  const d = t.overdueDays;
  if (d > 0) return { t: `${d} day${d === 1 ? "" : "s"} overdue`, c: "crit" };
  if (d === 0) return { t: "Due today", c: "warn" };
  if (d === -1) return { t: "Due tomorrow", c: "warn" };
  return { t: "Due " + new Date(t.due).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }), c: "" };
}
/** Short date for task tables, e.g. "Mon 29 Sep, 09:00" (UK time so server and browser agree). */
export const taskDate = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }); };
/** "Waiting" = time since the task was sent (sentAt), e.g. "2 days", "18 hours", "40 min". */
export function waitingLabel(sentAt?: string): string {
  if (!sentAt) return "—"; const ms = Date.now() - new Date(sentAt).getTime(); if (!isFinite(ms) || ms < 0) return "—";
  const min = Math.round(ms / 60000); if (min < 60) return `${Math.max(min, 1)} min`;
  const h = Math.round(min / 60); if (h < 24) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24); return `${d} day${d === 1 ? "" : "s"}`;
}
const DUE_CLS = { crit: "bg-crit-soft text-crit", warn: "bg-warn-soft text-warn", "": "bg-surface-3 text-ink-2" } as const;

/** Sortable column header (hoisted so it keeps its identity between renders). */
function Th({ k, sort, dir, onSort, children, className = "" }: { k?: Sort; sort: Sort; dir: "asc" | "desc"; onSort: (k: Sort) => void; children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 border-b border-line ${className}`} aria-sort={k && sort === k ? (dir === "asc" ? "ascending" : "descending") : undefined}>{k ? <button type="button" onClick={() => onSort(k)} className={`inline-flex items-center gap-1 uppercase tracking-[.08em] text-[11px] hover:text-ink ${sort === k ? "text-ink font-semibold" : ""}`}>{children}<span aria-hidden className={`text-[10px] ${sort === k ? "opacity-100" : "opacity-30"}`}>{sort === k && dir === "desc" ? "▼" : "▲"}</span></button> : children}</th>;
}

export function Tasks({ marketId, envId, root, marketName, tasks, q: q0, kind: kind0, sort: sort0 }: Props) {
  const router = useRouter(); const { can } = useSession();
  const base = `/${marketId}/${envId}`;
  const routeOf = (path: string) => path.replace(root, "") || "/";
  const builderHref = (path: string) => `${base}/page${routeOf(path)}`;
  const [q, setQ] = useState(q0); const [kind, setKind] = useState(kind0); const [sort, setSort] = useState<Sort>(sort0); const [dir, setDir] = useState<"asc" | "desc">("asc"); const [when, setWhen] = useState<"" | "overdue" | "today" | "later">("");
  const [busy, setBusy] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
  // keep the URL shareable (?q=&kind=&sort=) without triggering a navigation
  useEffect(() => { const p = new URLSearchParams(); if (q) p.set("q", q); if (kind) p.set("kind", kind); if (sort !== "due") p.set("sort", sort); const s = p.toString(); window.history.replaceState(null, "", `${base}/tasks${s ? "?" + s : ""}`); }, [q, kind, sort, base]);

  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    const r = tasks.filter((t) => (!kind || t.kind === kind) && (!when || (when === "overdue" ? t.overdueDays > 0 : when === "today" ? t.overdueDays === 0 : t.overdueDays < 0)) && (!s || `${t.page.title} ${t.what} ${t.from} ${t.assigneeName ?? ""} ${routeOf(t.page.path)}`.toLowerCase().includes(s)));
    const cmp = (a: Task, b: Task) => sort === "name" ? a.page.title.localeCompare(b.page.title) : sort === "kind" ? a.kind.localeCompare(b.kind) || a.due.localeCompare(b.due) : sort === "from" ? a.from.localeCompare(b.from) : sort === "assignee" ? (+!a.assigneeName - +!b.assigneeName || (a.assigneeName ?? "").localeCompare(b.assigneeName ?? "")) : sort === "waiting" ? (a.sentAt ?? "").localeCompare(b.sentAt ?? "") : a.due.localeCompare(b.due);
    return r.sort((a, b) => (dir === "asc" ? cmp(a, b) : -cmp(a, b)));
  }, [tasks, q, kind, sort, dir, when]); // eslint-disable-line react-hooks/exhaustive-deps
  const sortBy = (k: Sort) => { if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc")); else { setSort(k); setDir("asc"); } };
  const thp = { sort, dir, onSort: sortBy };
  const overdue = tasks.filter((t) => t.overdueDays > 0).length;

  async function act(e: React.MouseEvent, t: Task) {
    e.stopPropagation();
    if (t.kind === "Publish" || t.kind === "Fix") {
      setBusy(t.page.path);
      try { await repoApi.updateContent(t.page.path, { status: "published" }); setToast(t.kind === "Fix" ? `Publish retried · ${t.page.title} is live` : `${t.page.title} published`); router.refresh(); }
      catch (err) { setToast(errorText(err)); }
      finally { setBusy(null); }
      return;
    }
    router.push(builderHref(t.page.path)); // Review / Check / Finish happen in the builder
  }

  return (
    <div className="p-4 md:p-7">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3 mb-5">
        <div><h1 className="text-2xl font-semibold">My tasks</h1><p className="text-ink-3 text-[13px] mt-1">{tasks.length} open on {marketName}{overdue > 0 && <> · <span className="text-crit font-semibold">{overdue} overdue</span></>}</p></div>
        <div className="ml-auto flex gap-2"><Link href={`${base}/audit`} className="btn">What changed recently</Link></div>
      </div>
      {/* Summary tiles (same style as the dashboard tiles); click one to filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
        {([["", "Open tasks", tasks.length, "var(--accent)", "Everything waiting on you"], ["overdue", "Overdue", tasks.filter((t) => t.overdueDays > 0).length, "var(--crit)", "Past their due date"], ["today", "Due today", tasks.filter((t) => t.overdueDays === 0).length, "var(--warn)", "Finish before the end of the day"], ["later", "Coming up", tasks.filter((t) => t.overdueDays < 0).length, "var(--info)", "Due later this week"]] as const).map(([k, l, n, c, sub]) => (
          <button key={l} type="button" aria-pressed={when === k} onClick={() => setWhen(k)} className={`text-left bg-surface border p-5 min-h-[120px] flex flex-col gap-1 hover:border-ink-3 hover:shadow-md ${when === k ? "border-ink shadow-md" : "border-line"}`} style={{ borderTop: `4px solid ${c}` }}>
            <span className="text-[13px] text-ink-2">{l}</span>
            <span className="text-[36px] font-light leading-none tabular-nums" style={{ color: c === "var(--crit)" && n > 0 ? c : undefined }}>{n}</span>
            <span className="text-[12.5px] text-ink-3 mt-auto">{when === k ? "Showing these" : sub}</span>
          </button>))}
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="flex items-center gap-2 bg-surface border border-line-2 rounded-md px-2.5 py-1.5 min-w-[260px]"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px]" placeholder="Search tasks, pages, people" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tasks" /></label>
        <span className="ml-auto text-[12.5px] text-ink-3">{rows.length} of {tasks.length}</span>
      </div>
      {rows.length ? (
        <div className="bg-surface border border-line rounded-xl overflow-hidden"><div className="overflow-auto"><table className="w-full text-[13.5px] [&_tr>*:nth-child(1)]:hidden md:[&_tr>*:nth-child(1)]:table-cell [&_tr>*:nth-child(6)]:hidden sm:[&_tr>*:nth-child(6)]:table-cell [&_tr>*:nth-child(3)]:hidden 2xl:[&_tr>*:nth-child(3)]:table-cell [&_tr>*:nth-child(5)]:hidden 2xl:[&_tr>*:nth-child(5)]:table-cell [&_tr>*:nth-child(4)]:hidden 2xl:[&_tr>*:nth-child(4)]:table-cell">
          <thead className="bg-surface-2"><tr className="text-left text-[11px] uppercase tracking-[.08em] text-ink-3"><Th {...thp} k="kind" className="w-[130px]">Type</Th><Th {...thp} k="name">Page · what to do</Th><Th {...thp} k="from" className="w-[200px]">Sent by</Th><Th {...thp} k="assignee" className="w-[190px]">Assigned to</Th><Th {...thp} k="waiting" className="w-[110px]">Waiting</Th><Th {...thp} k="due" className="w-[170px]">Due · sent</Th><Th {...thp} className="w-[150px] text-right">Action</Th></tr></thead>
          <tbody>{([["Overdue", (t: Task) => t.overdueDays > 0, "text-crit"], ["Due today", (t: Task) => t.overdueDays === 0, "text-warn"], ["Coming up", (t: Task) => t.overdueDays < 0, "text-ink-3"]] as const).map(([title, pred, cls]) => { const grouped = sort === "due" && dir === "asc"; const list = grouped ? rows.filter(pred) : (title === "Overdue" ? rows : []); if (!list.length) return null; return <Fragment key={title}>
            {grouped && <tr><td colSpan={7} className={`px-4 pt-3 pb-1.5 text-[10.5px] uppercase tracking-[.1em] font-semibold ${cls}`}>{title} · {list.length}</td></tr>}
            {list.map((t) => { const d = dueLabel(t); const primary = t.kind === "Review" || t.kind === "Publish"; const label = t.kind === "Review" ? "Review" : t.kind === "Publish" ? "Publish" : t.kind === "Fix" ? "Retry publish" : t.kind === "Check" ? "Check" : "Continue";
              const needs = t.kind === "Publish" || t.kind === "Fix" ? "publish" : t.kind === "Review" ? "review" : null; const allowed = !needs || can(needs, t.page.path); const waiting = needs === "publish" ? "Waiting for a publisher" : "Waiting for a reviewer"; const w = waitingLabel(t.sentAt); const sender = t.from.replace(/ \(.*\)$/, "");
              return <tr key={t.page.path + t.kind} className="hover:bg-surface-2 cursor-pointer border-t border-line" onClick={() => router.push(builderHref(t.page.path))}>
                <td className="px-4 py-3"><Pill status={t.page.status} label={t.kind} /></td>
                <td className="px-4 py-3"><div className="flex items-center gap-2 min-w-0"><PageIcon /><b className="truncate">{t.page.title}</b><span className="hidden sm:inline font-mono text-[11.5px] text-ink-3 truncate">{routeOf(t.page.path)}</span></div><div className="text-[12.5px] text-ink-2 mt-0.5 pl-[26px]">{t.what}</div><div className="sm:hidden mt-1.5 pl-[26px] flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-3" suppressHydrationWarning><span className={`inline-block font-semibold px-2 py-0.5 rounded-full ${DUE_CLS[d.c]}`}>{d.t}</span>Due {taskDate(t.due)}</div></td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-2"><Avatar name={sender} size={24} /><span className="text-[13px]">{t.from}</span></span></td>
                <td className="px-4 py-3">{t.assigneeName ? <span className="inline-flex items-center gap-2"><Avatar name={t.assigneeName} size={24} /><span className="text-[13px]">{t.assigneeName}</span></span> : <span className="text-[12.5px] text-ink-3">Anyone with Review</span>}</td>
                <td className="px-4 py-3 text-ink-3">{w}</td>
                <td className="px-4 py-3"><span suppressHydrationWarning className={`inline-block text-[12px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${DUE_CLS[d.c]}`}>{d.t}</span>
                  <div className="text-[11.5px] text-ink-3 mt-1 leading-snug sm:whitespace-nowrap" suppressHydrationWarning><span title="Due date">Due {taskDate(t.due)}</span>{t.sentAt && <span className="block" title="Sent date">Sent {taskDate(t.sentAt)}</span>}</div></td>
                <td className="px-4 py-3 text-right">{allowed ? <button className={`btn btn-sm ${primary ? "btn-primary" : ""}`} disabled={busy === t.page.path} onClick={(e) => act(e, t)}>{busy === t.page.path ? "Working…" : label}</button> : <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 whitespace-nowrap" title={`You don't have ${needs === "publish" ? "Publish" : "Review & approve"} here`}><span aria-hidden="true">🔒</span>{waiting}</span>}</td>
              </tr>; })}
          </Fragment>; })}</tbody>
        </table></div></div>
      ) : (
        <div className="p-12 text-center bg-surface border border-dashed border-line-2 rounded-xl"><b className="block text-[15px]">{q || kind || when ? "No tasks match" : "All clear"}</b><p className="text-ink-3 text-[13px] mt-1">{q || kind || when ? <button className="underline text-ink" onClick={() => { setQ(""); setKind(""); setWhen(""); }}>Clear filters</button> : "Nothing is waiting on you. New review and publish requests will show up here."}</p></div>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] shadow-xl z-50">{toast}</div>}
    </div>
  );
}
