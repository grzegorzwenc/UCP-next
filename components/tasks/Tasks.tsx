"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Task } from "@/lib/ucp/types";
import { repoApi, ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { useSession } from "@/components/shell/Session";
import { Pill } from "@/components/ui/Pill";
import { Avatar } from "@/components/ui/Avatar";
import { PageIcon } from "@/components/ui/Icons";
import { AssignDialog } from "./AssignDialog";
import { ShareReviewDialog } from "./ShareReviewDialog";
import { MARKETS, market as marketById } from "@/lib/markets";

export type PublishedItem = { path: string; title: string; when?: string; who?: string };
type View = "assign" | "inreview" | "sendbiz" | "ready" | "published";
type Props = { marketId: string; envId: string; tasks: Task[]; published: PublishedItem[]; view: string };

/** Due chip copy: overdueDays > 0 = overdue, 0 = today, -1 = tomorrow, else the date. */
export function dueLabel(t: Task): { t: string; c: "crit" | "warn" | "" } {
  const d = t.overdueDays;
  if (d > 0) return { t: `${d} day${d === 1 ? "" : "s"} overdue`, c: "crit" };
  if (d === 0) return { t: "Due today", c: "warn" };
  if (d === -1) return { t: "Due tomorrow", c: "warn" };
  return { t: "Due " + new Date(t.due).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }), c: "" };
}
/** Short date for task lists, e.g. "Mon 29 Sep, 09:00" (UK time so server and browser agree). */
export const taskDate = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }); };
/** "Waiting" = time since the task was sent (sentAt), e.g. "2 days", "18 hours", "40 min". */
export function waitingLabel(sentAt?: string): string {
  if (!sentAt) return "—"; const ms = Date.now() - new Date(sentAt).getTime(); if (!isFinite(ms) || ms < 0) return "—";
  const min = Math.round(ms / 60000); if (min < 60) return `${Math.max(min, 1)} min`;
  const h = Math.round(min / 60); if (h < 24) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24); return `${d} day${d === 1 ? "" : "s"}`;
}
const DUE_CLS = { crit: "bg-crit-soft text-crit", warn: "bg-warn-soft text-warn", "": "bg-surface-3 text-ink-2" } as const;
/** The market a page belongs to, from its repository path (/content/<market>/…). */
const marketOfPath = (path: string) => MARKETS.find((m) => path === m.root || path.startsWith(`${m.root}/`)) ?? marketById("");

/** The five stages of the review flow, as tabs. */
const VIEWS: { id: View; label: string; empty: string; of: (t: Task) => boolean }[] = [
  { id: "assign", label: "Assign to review", empty: "No page is waiting for a reviewer.", of: (t) => t.kind === "Review" && t.page.status === "review" },
  { id: "inreview", label: "In review", empty: "No author's review is in progress.", of: (t) => t.kind === "Review" && t.page.status === "inreview" },
  { id: "sendbiz", label: "Send to business review", empty: "Nothing to send to, or waiting in, the business review.", of: (t) => t.kind === "SendBiz" || t.kind === "BizReview" },
  { id: "ready", label: "Ready for publish", empty: "No page is ready to publish.", of: (t) => t.kind === "Publish" || t.kind === "Check" },
  { id: "published", label: "Published", empty: "Nothing published recently.", of: () => false },
];

/**
 * My tasks: pages by stage of the review flow — Assign to review · In review · Send to business review · Ready for publish · Published.
 * Every row has the one action that moves the page on (for the person who may do it), across all markets.
 */
export function Tasks({ marketId, envId, tasks, published, view: view0 }: Props) {
  const router = useRouter(); const { can, user } = useSession(); const isAdmin = user.role === "admin" || !!user.perms.root?.manage;
  const [view, setView] = useState<View>(() => (VIEWS.some((v) => v.id === view0) ? view0 as View : "assign"));
  const [q, setQ] = useState(""); const [mkt, setMkt] = useState("");
  const [busy, setBusy] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Task | null>(null); const [sharing, setSharing] = useState<{ t: Task; stage: "review" | "bizreview" } | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { window.history.replaceState(null, "", `/${marketId}/${envId}/tasks${view === "assign" ? "" : `?view=${view}`}`); }, [view, marketId, envId]); // the tab is in the URL (shareable)

  const routeOf = (path: string) => path.replace(marketOfPath(path).root, "") || "/";
  const builderHref = (path: string) => `/${marketOfPath(path).id}/${envId}/page${routeOf(path)}`;
  const match = (path: string, title: string, extra = "") => (!mkt || marketOfPath(path).id === mkt) && (!q.trim() || `${title} ${routeOf(path)} ${extra}`.toLowerCase().includes(q.toLowerCase().trim()));
  const byView = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.id, tasks.filter(v.of).filter((t) => match(t.page.path, t.page.title, `${t.from} ${t.assigneeName ?? ""}`)).sort((a, b) => (a.sentAt ?? "").localeCompare(b.sentAt ?? ""))])) as Record<View, Task[]>, [tasks, q, mkt]); // eslint-disable-line react-hooks/exhaustive-deps
  const pub = useMemo(() => published.filter((p) => match(p.path, p.title, p.who ?? "")), [published, q, mkt]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = (v: View) => (v === "published" ? pub.length : byView[v].length);
  const markets = useMemo(() => MARKETS.filter((m) => tasks.some((t) => marketOfPath(t.page.path).id === m.id) || published.some((p) => marketOfPath(p.path).id === m.id)), [tasks, published]);

  const run = async (t: Task, fn: () => Promise<unknown>, done: string, after?: () => void) => {
    setBusy(t.page.path); try { await fn(); setToast(done); after?.(); router.refresh(); } catch (e) { setToast(errorText(e)); } finally { setBusy(null); }
  };
  const status = (t: Task, s: string) => repoApi.updateContent(t.page.path, { status: s as never });
  const mid = (t: Task) => marketOfPath(t.page.path).id;

  /** The action(s) for a row: only what this person may do at this stage. */
  function actions(t: Task) {
    const p = t.page.path; const st = t.page.status; const b = busy === p; const out: React.ReactNode[] = [];
    const mine = !t.assignee || t.assignee === user.id; const btn = (k: string, label: string, onClick: () => void, next = false) => out.push(<button key={k} type="button" className={`btn btn-sm ${next ? "btn-next" : ""}`} disabled={b} onClick={(e) => { e.stopPropagation(); onClick(); }}>{b && next ? "Working…" : label}</button>);
    const remind = () => run(t, () => ucpApi.remindReviewer(mid(t), p), "Reminder sent");
    if (st === "review") {
      if (isAdmin) btn("assign", t.assigneeName ? "Change" : "Assign", () => setAssigning(t));
      if (can("review", p) && mine) btn("start", "Start review", () => run(t, () => status(t, "inreview"), `${t.page.title}: review started · it is yours`), true);
    } else if (st === "inreview") {
      if (can("edit", p) && !(t.assignee === user.id)) btn("remind", "Remind", remind);
      if (can("review", p) && (mine || isAdmin)) btn("reviewed", t.assignee && t.assignee !== user.id ? `Reviewed for ${t.assigneeName?.split(" ")[0]}` : "Reviewed", () => run(t, () => status(t, "reviewed"), `${t.page.title}: marked reviewed`), true);
    } else if (st === "reviewed") {
      if (can("edit", p)) btn("send", "Send to business review", () => run(t, () => status(t, "bizreview"), `${t.page.title} sent to business review`, () => setSharing({ t, stage: "bizreview" })), true);
    } else if (st === "bizreview") {
      if (can("edit", p)) btn("share", "Share", () => setSharing({ t, stage: "bizreview" }));
      if (can("edit", p) && !(t.assignee === user.id)) btn("remind", "Remind", remind);
      if (can("review", p) || isAdmin) btn("signoff", "Sign off", () => run(t, () => status(t, "approved"), `${t.page.title}: signed off · ready to publish`), true);
    } else if (st === "approved" || st === "scheduled") {
      if (can("publish", p)) btn("publish", st === "scheduled" ? "Publish now" : "Publish", () => run(t, () => status(t, "published"), `${t.page.title} is live`), true);
      else out.push(<span key="w" className="text-[12px] text-ink-3 whitespace-nowrap">Waiting for a publisher</span>);
    }
    return out;
  }
  /** Who the page is with at this stage. */
  const who = (t: Task) => {
    const st = t.page.status;
    const person = st === "review" || st === "inreview" ? t.assigneeName : st === "bizreview" ? t.assigneeName : undefined;
    const label = st === "review" ? (t.assigneeName ? "Assigned to" : "Not assigned yet") : st === "inreview" ? "Reviewed by" : st === "reviewed" ? "Reviewed by" : st === "bizreview" ? (t.assigneeName ? "Sign-off by" : "Any business reviewer") : "Approved by";
    const name = person ?? (st === "reviewed" || st === "approved" || st === "scheduled" ? t.from.replace(/ \(.*\)$/, "") : "");
    return <span className="inline-flex items-center gap-2 text-[12.5px] min-w-0"><span className="text-ink-3 whitespace-nowrap">{label}</span>{name && <><Avatar name={name} size={20} /><span className="truncate">{t.assignee === user.id && person ? "you" : name}</span></>}</span>;
  };

  const rows = view === "published" ? [] : byView[view]; const cur = VIEWS.find((v) => v.id === view)!;
  return (
    <div className="p-4 md:p-7">
      <div className="mb-4"><h1 className="text-2xl font-semibold">My tasks</h1><p className="text-ink-3 text-[13px] mt-1">Pages by stage of the review flow, across all markets.</p></div>

      {/* the five stages as tabs */}
      <div role="tablist" aria-label="Stages" className="flex gap-1 overflow-x-auto border-b border-line mb-4 -mx-1 px-1">
        {VIEWS.map((v, i) => { const on = view === v.id; const n = count(v.id);
          return <button key={v.id} role="tab" aria-selected={on} type="button" onClick={() => setView(v.id)} className={`flex items-center gap-2 px-3 py-2.5 text-[13.5px] whitespace-nowrap border-b-2 -mb-px ${on ? "border-accent text-ink font-semibold" : "border-transparent text-ink-3 hover:text-ink"}`}>
            <span className={`w-5 h-5 rounded-full grid place-items-center text-[10.5px] font-bold ${on ? "bg-accent text-white" : "bg-surface-3 text-ink-2"}`}>{i + 1}</span>{v.label}
            <span className={`min-w-[20px] h-5 px-1.5 rounded-full grid place-items-center text-[11px] font-semibold ${n ? (on ? "bg-accent-soft text-accent-hover" : "bg-surface-3 text-ink-2") : "text-ink-4"}`}>{n}</span></button>; })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="flex items-center gap-2 bg-surface border border-line-2 rounded-md px-2.5 py-1.5 min-w-[220px] flex-1 sm:flex-none sm:w-[300px]"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px] bg-transparent" placeholder="Find a page or person" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tasks" /></label>
        <select className="border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] bg-surface" value={mkt} onChange={(e) => setMkt(e.target.value)} aria-label="Filter by market"><option value="">All markets</option>{markets.map((m) => <option key={m.id} value={m.id}>{m.flag} {m.name}</option>)}</select>
      </div>

      {view !== "published" ? (rows.length ? <ul className="bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden">
        {rows.map((t) => { const m = marketOfPath(t.page.path); const d = dueLabel(t); const acts = actions(t);
          return <li key={t.page.path + t.kind} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,220px)_auto] gap-x-4 gap-y-2 items-center px-4 py-3 hover:bg-surface-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0"><PageIcon /><Link href={builderHref(t.page.path)} className="font-semibold truncate hover:underline underline-offset-2">{t.page.title}</Link>{view === "sendbiz" || view === "ready" ? <Pill status={t.page.status} /> : null}</div>
              <div className="text-[12px] text-ink-3 mt-0.5 pl-[26px] truncate"><span aria-hidden>{m.flag}</span> {m.name.replace(/^HSBC /, "")} · {routeOf(t.page.path)} · sent by {t.from.replace(/ \(.*\)$/, "")}{waitingLabel(t.sentAt) !== "—" ? ` · waiting ${waitingLabel(t.sentAt)}` : ""}</div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-[26px] md:pl-0 min-w-0">{who(t)}<span suppressHydrationWarning className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${DUE_CLS[d.c]}`}>{d.t}</span></div>
            <div className="flex items-center gap-1.5 pl-[26px] md:pl-0 md:justify-end">{acts.length ? acts : <Link href={builderHref(t.page.path)} className="btn btn-sm">Open</Link>}</div>
          </li>; })}
      </ul> : <div className="p-12 text-center bg-surface border border-dashed border-line-2 rounded-xl text-[13px] text-ink-3">{q || mkt ? <>No pages match. <button className="underline text-ink" onClick={() => { setQ(""); setMkt(""); }}>Clear filters</button></> : cur.empty}</div>)
      : pub.length ? <ul className="bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden">
        {pub.map((p) => { const m = marketOfPath(p.path); return <li key={p.path} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-2">
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2 min-w-0"><PageIcon /><Link href={builderHref(p.path)} className="font-semibold truncate hover:underline underline-offset-2">{p.title}</Link><Pill status="published" /></div>
            <div className="text-[12px] text-ink-3 mt-0.5 pl-[26px] truncate"><span aria-hidden>{m.flag}</span> {m.domain}{routeOf(p.path)}</div></div>
          <span className="text-[12px] text-ink-3 pl-[26px] sm:pl-0" suppressHydrationWarning>{p.when ? `Published ${taskDate(p.when)}` : "Published"}{p.who ? ` · ${p.who}` : ""}</span>
          <Link href={builderHref(p.path)} className="btn btn-sm">Open</Link>
        </li>; })}
      </ul> : <div className="p-12 text-center bg-surface border border-dashed border-line-2 rounded-xl text-[13px] text-ink-3">{cur.empty}</div>}

      {assigning && <AssignDialog marketId={marketOfPath(assigning.page.path).id} task={assigning} pageHref={builderHref(assigning.page.path)} onClose={() => setAssigning(null)} onDone={(name) => { setToast(name ? `${assigning.page.title}: assigned to ${name}` : `${assigning.page.title}: not assigned`); setAssigning(null); router.refresh(); }} />}
      {sharing && <ShareReviewDialog key={sharing.t.page.path + sharing.stage} marketId={marketOfPath(sharing.t.page.path).id} path={sharing.t.page.path} title={sharing.t.page.title} stage={sharing.stage} onClose={() => { setSharing(null); router.refresh(); }} />}
      {toast && <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 w-max max-w-[calc(100vw-32px)] flex items-center gap-2.5 bg-[#0F1013] text-white pl-3 pr-4 py-2.5 rounded-xl text-[13px] shadow-xl z-50"><span aria-hidden className="grid place-items-center w-5 h-5 rounded-full bg-white/15 text-[11px] flex-none">✓</span><span className="min-w-0">{toast}</span></div>}
    </div>
  );
}
