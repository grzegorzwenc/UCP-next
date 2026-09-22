"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Task, TaskKind } from "@/lib/ucp/types";
import { repoApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { useSession } from "@/components/shell/Session";
import { Pill } from "@/components/ui/Pill";

type Sort = "due" | "name" | "kind";
type Props = { marketId: string; envId: string; root: string; marketName: string; tasks: Task[]; q: string; kind: string; sort: Sort };
const KINDS: TaskKind[] = ["Review", "Publish", "Fix", "Check", "Finish"];

/** Due chip copy: overdueDays > 0 = overdue, 0 = today, -1 = tomorrow, else the date. */
export function dueLabel(t: Task): { t: string; c: "crit" | "warn" | "" } {
  const d = t.overdueDays;
  if (d > 0) return { t: `${d} day${d === 1 ? "" : "s"} overdue`, c: "crit" };
  if (d === 0) return { t: "Due today", c: "warn" };
  if (d === -1) return { t: "Due tomorrow", c: "warn" };
  return { t: "Due " + new Date(t.due).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), c: "" };
}
/** "Waiting" = time since the task was sent (sentAt), e.g. "2 days", "18 hours", "40 min". */
export function waitingLabel(sentAt?: string): string {
  if (!sentAt) return "—"; const ms = Date.now() - new Date(sentAt).getTime(); if (!isFinite(ms) || ms < 0) return "—";
  const min = Math.round(ms / 60000); if (min < 60) return `${Math.max(min, 1)} min`;
  const h = Math.round(min / 60); if (h < 24) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24); return `${d} day${d === 1 ? "" : "s"}`;
}
const DUE_CLS = { crit: "bg-crit-soft text-crit", warn: "bg-warn-soft text-warn", "": "bg-surface-3 text-ink-2" } as const;

export function Tasks({ marketId, envId, root, marketName, tasks, q: q0, kind: kind0, sort: sort0 }: Props) {
  const router = useRouter(); const { can } = useSession();
  const base = `/${marketId}/${envId}`;
  const routeOf = (path: string) => path.replace(root, "") || "/";
  const builderHref = (path: string) => `${base}/page${routeOf(path)}`;
  const [q, setQ] = useState(q0); const [kind, setKind] = useState(kind0); const [sort, setSort] = useState<Sort>(sort0);
  const [busy, setBusy] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
  // keep the URL shareable (?q=&kind=&sort=) without triggering a navigation
  useEffect(() => { const p = new URLSearchParams(); if (q) p.set("q", q); if (kind) p.set("kind", kind); if (sort !== "due") p.set("sort", sort); const s = p.toString(); window.history.replaceState(null, "", `${base}/tasks${s ? "?" + s : ""}`); }, [q, kind, sort, base]);

  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    const r = tasks.filter((t) => (!kind || t.kind === kind) && (!s || `${t.page.title} ${t.what} ${t.from} ${routeOf(t.page.path)}`.toLowerCase().includes(s)));
    return r.sort((a, b) => sort === "name" ? a.page.title.localeCompare(b.page.title) : sort === "kind" ? a.kind.localeCompare(b.kind) || a.due.localeCompare(b.due) : a.due.localeCompare(b.due));
  }, [tasks, q, kind, sort]); // eslint-disable-line react-hooks/exhaustive-deps
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
    <div className="p-7">
      <div className="flex items-end gap-4 mb-5">
        <div><h1 className="text-2xl font-semibold">My tasks</h1><p className="text-ink-3 text-[13px] mt-1">{tasks.length} open on {marketName}{overdue > 0 && <> · <span className="text-crit font-semibold">{overdue} overdue</span></>}</p></div>
        <div className="ml-auto flex gap-2"><Link href={`${base}/audit`} className="btn">What changed recently</Link></div>
      </div>
      <div className="flex items-center gap-2 mb-3.5">
        <label className="flex items-center gap-2 bg-surface border border-line-2 rounded-md px-2.5 py-1.5 min-w-[280px]"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px]" placeholder="Search tasks, pages, people" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tasks" /></label>
        <select aria-label="Filter by type" className="border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] bg-surface" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">All types</option>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
        <select aria-label="Sort" className="border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] bg-surface" value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="due">Sort: due date</option><option value="name">Sort: page name</option><option value="kind">Sort: task type</option></select>
        <span className="ml-auto text-[12.5px] text-ink-3">{rows.length} shown</span>
      </div>
      {rows.length ? (
        <table className="w-full text-[13.5px] bg-surface border border-line">
          <thead><tr className="text-left text-[11.5px] uppercase tracking-[.06em] text-ink-3"><th className="p-3 border-b border-line-2">Task</th><th className="p-3 border-b border-line-2">Page</th><th className="p-3 border-b border-line-2">Sent by</th><th className="p-3 border-b border-line-2">Waiting</th><th className="p-3 border-b border-line-2">Due</th><th className="p-3 border-b border-line-2" /></tr></thead>
          <tbody>{rows.map((t) => { const d = dueLabel(t); const primary = t.kind === "Review" || t.kind === "Publish"; const label = t.kind === "Review" ? "Review" : t.kind === "Publish" ? "Publish" : t.kind === "Fix" ? "Retry" : "Open";
            const needs = t.kind === "Publish" || t.kind === "Fix" ? "publish" : t.kind === "Review" ? "review" : null; const allowed = !needs || can(needs, t.page.path); const waiting = needs === "publish" ? "Waiting for a publisher" : "Waiting for a reviewer"; return (
            <tr key={t.page.path + t.kind} className="hover:bg-surface-2 cursor-pointer" onClick={() => router.push(builderHref(t.page.path))}>
              <td className="p-3 border-b border-line"><Pill status={t.page.status} label={t.kind} /> <b className="ml-1.5">{t.what}</b></td>
              <td className="p-3 border-b border-line"><span className="font-medium">{t.page.title}</span><div className="font-mono text-[11.5px] text-ink-3">{routeOf(t.page.path)}</div></td>
              <td className="p-3 border-b border-line">{t.from}</td>
              <td className="p-3 border-b border-line text-ink-3">{waitingLabel(t.sentAt)}</td>
              <td className="p-3 border-b border-line"><span className={`inline-block text-[12px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${DUE_CLS[d.c]}`}>{d.t}</span></td>
              <td className="p-3 border-b border-line text-right">{allowed ? <button className={`btn btn-sm ${primary ? "btn-primary" : ""}`} disabled={busy === t.page.path} onClick={(e) => act(e, t)}>{busy === t.page.path ? "Working…" : label}</button> : <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 whitespace-nowrap" title={`You don't have ${needs === "publish" ? "Publish" : "Review & approve"} here`}><span aria-hidden="true">🔒</span>{waiting}</span>}</td>
            </tr>); })}</tbody>
        </table>
      ) : (
        <div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">No tasks match. {q || kind ? <button className="underline text-ink" onClick={() => { setQ(""); setKind(""); }}>Clear filters</button> : "Nothing is waiting on you."}</div>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] shadow-xl z-50">{toast}</div>}
    </div>
  );
}
