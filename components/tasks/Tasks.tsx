"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Task } from "@/lib/ucp/types";
import { repoApi, ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { useSession } from "@/components/shell/Session";
import { Pill } from "@/components/ui/Pill";
import { Avatar } from "@/components/ui/Avatar";
import { PageIcon } from "@/components/ui/Icons";
import { AssignDialog } from "./AssignDialog";
import { ShareReviewDialog } from "./ShareReviewDialog";
import { PublishDialog } from "@/components/pages/PublishDialog";
import { MARKETS, market as marketById, env as envById } from "@/lib/markets";

export type PublishedItem = { path: string; title: string; when?: string; who?: string; whoId?: string };
type View = "all" | "backlog" | "mine" | "inreview" | "sendbiz" | "bizreview" | "ready" | "published";
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

/* "New" = something of yours at a stage you have not looked at yet. What you have seen is kept in this browser. */
const SEEN = "ucp-tasks-seen"; const seenSubs = new Set<() => void>();
const readSeen = () => { try { return localStorage.getItem(SEEN) ?? "[]"; } catch { return "[]"; } };
const subscribeSeen = (cb: () => void) => { seenSubs.add(cb); return () => { seenSubs.delete(cb); }; };
const markSeen = (keys: string[]) => { if (!keys.length) return; try { const all = new Set<string>(JSON.parse(readSeen())); keys.forEach((k) => all.add(k)); localStorage.setItem(SEEN, JSON.stringify([...all].slice(-800))); } catch { /* private mode */ } seenSubs.forEach((f) => f()); };
/** A task is "the same thing" while its page, stage and person do not change; a new stage or a new assignee makes it new again. */
const seenKey = (t: Task) => `${t.page.path}|${t.page.status}|${t.assignee ?? ""}`;

const STAGE_ORDER = ["review", "inreview", "reviewed", "bizreview", "approved", "scheduled"];
/** All (yours, any stage) and the stages of the review flow, as tabs. */
const VIEWS: { id: View; label: string; empty: string; of: (t: Task, me: string) => boolean }[] = [
  { id: "all", label: "All", empty: "Nothing is assigned to you right now.", of: (t, me) => (t.assignee === me || t.author === me) && ["review", "inreview", "reviewed", "bizreview", "approved", "scheduled"].includes(t.page.status) },
  { id: "backlog", label: "Backlog", empty: "No page is waiting for a reviewer.", of: (t) => t.kind === "Review" && t.page.status === "review" && !t.assignee },
  { id: "mine", label: "Ready for review", empty: "Nothing assigned and waiting to start · take a page from the Backlog.", of: (t) => t.kind === "Review" && t.page.status === "review" && !!t.assignee },
  { id: "inreview", label: "In review", empty: "No author's review is in progress.", of: (t) => t.kind === "Review" && t.page.status === "inreview" },
  { id: "sendbiz", label: "Reviewed by author / Send to business review", empty: "Nothing reviewed by an author is waiting to be sent on.", of: (t) => t.kind === "SendBiz" },
  { id: "bizreview", label: "In business review", empty: "No page is in the business review.", of: (t) => t.kind === "BizReview" },
  { id: "ready", label: "Ready for publish", empty: "No page is ready to publish.", of: (t) => t.kind === "Publish" || t.kind === "Check" },
  { id: "published", label: "Published", empty: "Nothing published recently.", of: () => false },
];

/**
 * My tasks: pages by stage of the review flow — Backlog · Ready for review · In review · Reviewed by author / Send to business review · In business review · Ready for publish · Published.
 * Every row has the one action that moves the page on (for the person who may do it), across all markets.
 */
export function Tasks({ marketId, envId, tasks, published, view: view0 }: Props) {
  const router = useRouter(); const { can, user } = useSession(); const isAdmin = user.role === "admin" || !!user.perms.root?.manage;
  const [view, setView] = useState<View>(() => (VIEWS.some((v) => v.id === view0) ? view0 as View : "all"));
  const [q, setQ] = useState(""); const [mkt, setMkt] = useState("");
  const [busy, setBusy] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Task | null>(null); const [sharing, setSharing] = useState<{ t: Task; stage: "review" | "bizreview" } | null>(null);
  const [publishing, setPublishing] = useState<Task | null>(null); // Publish now or Schedule
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { window.history.replaceState(null, "", `/${marketId}/${envId}/tasks${view === "all" ? "" : `?view=${view}`}`); }, [view, marketId, envId]); // the tab is in the URL (shareable)

  const routeOf = (path: string) => path.replace(marketOfPath(path).root, "") || "/";
  const builderHref = (path: string) => `/${marketOfPath(path).id}/${envId}/page${routeOf(path)}`;
  const match = (path: string, title: string, extra = "") => (!mkt || marketOfPath(path).id === mkt) && (!q.trim() || `${title} ${routeOf(path)} ${extra}`.toLowerCase().includes(q.toLowerCase().trim()));
  const byView = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.id, tasks.filter((t) => v.of(t, user.id)).filter((t) => match(t.page.path, t.page.title, `${t.from} ${t.assigneeName ?? ""}`)).sort((a, b) => (v.id === "all" ? STAGE_ORDER.indexOf(a.page.status) - STAGE_ORDER.indexOf(b.page.status) : 0) || (a.sentAt ?? "").localeCompare(b.sentAt ?? ""))])) as Record<View, Task[]>, [tasks, q, mkt, user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const pub = useMemo(() => published.filter((p) => match(p.path, p.title, p.who ?? "")), [published, q, mkt]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = (v: View) => (v === "published" ? pub.length : byView[v].length);
  /* yours = assigned to you or you are the author; in the Backlog, pages you could take */
  const seenSnap = useSyncExternalStore(subscribeSeen, readSeen, () => "[]"); const seen = useMemo(() => new Set<string>(JSON.parse(seenSnap)), [seenSnap]);
  const yoursOf = (v: View, t: Task) => (v === "all" ? true : v === "backlog" ? can("review", t.page.path) : t.assignee === user.id || t.author === user.id);
  const yours = (v: View) => (v === "published" ? [] : byView[v].filter((t) => yoursOf(v, t)));
  const fresh = (v: View) => yours(v).filter((t) => !seen.has(seenKey(t)));
  const isNew = (t: Task) => yoursOf(view, t) && !seen.has(seenKey(t));
  const totalNew = fresh("all").length, totalYours = yours("all").length;
  /* what is on screen counts as seen when you leave the tab (so "New" stays visible while you look at it) */
  const onScreen = useRef<string[]>([]);
  useEffect(() => { onScreen.current = yours(view).map(seenKey); });
  useEffect(() => { const h = () => markSeen(onScreen.current); window.addEventListener("pagehide", h); return () => window.removeEventListener("pagehide", h); }, []);
  const openView = (v: View) => { markSeen(onScreen.current); setView(v); };
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
    const change = () => { if (isAdmin) btn("person", t.assigneeName ? "Change person" : "Assign…", () => setAssigning(t)); }; // site admins: who does this step
    if (st === "review" && !t.assignee) { // Backlog: take it, or (site admins) give it to someone
      if (isAdmin) btn("assign", "Assign to someone else", () => setAssigning(t));
      if (can("review", p)) btn("claim", "Assign to me", () => run(t, () => ucpApi.claimReview(mid(t), p), `${t.page.title} is yours · find it in Ready for review`), true);
    } else if (st === "review") { // Ready for review: assigned, not started
      change();
      if (t.assignee === user.id) btn("start", "Start review", () => run(t, () => status(t, "inreview"), `${t.page.title}: review started`), true);
    } else if (st === "inreview") {
      change();
      if (can("edit", p) && !(t.assignee === user.id)) btn("remind", "Remind", remind);
      if (can("review", p) && (mine || isAdmin)) btn("reviewed", t.assignee && t.assignee !== user.id ? `Reviewed for ${t.assigneeName?.split(" ")[0]}` : "Reviewed", () => run(t, () => status(t, "reviewed"), `${t.page.title}: marked reviewed`), true);
    } else if (st === "reviewed") {
      if (can("edit", p)) btn("send", "Send to business review", () => run(t, () => status(t, "bizreview"), `${t.page.title} sent to business review`, () => setSharing({ t, stage: "bizreview" })), true);
    } else if (st === "bizreview") {
      change();
      if (can("edit", p)) btn("share", "Share", () => setSharing({ t, stage: "bizreview" }));
      if (can("edit", p) && !(t.assignee === user.id)) btn("remind", "Remind", remind);
      if (can("review", p) || isAdmin) btn("signoff", "Sign off", () => run(t, () => status(t, "approved"), `${t.page.title}: signed off · ready to publish`), true);
    } else if (st === "approved" || st === "scheduled") {
      change();
      if (can("publish", p)) btn("publish", "Publish", () => setPublishing(t), true); // the dialog offers Publish now or Schedule (and moves or cancels an existing schedule)
      else out.push(<span key="w" className="text-[12px] text-ink-3 whitespace-nowrap">Waiting for a publisher</span>);
    }
    return out;
  }
  /** Who the page is with at this stage. */
  const who = (t: Task) => {
    const st = t.page.status;
    const person = st === "review" || st === "inreview" || st === "bizreview" || st === "approved" || st === "scheduled" ? t.assigneeName : undefined;
    const label = st === "review" ? (t.assigneeName ? "Assigned to" : "Not assigned yet") : st === "inreview" ? "Reviewed by" : st === "reviewed" ? "Reviewed by" : st === "bizreview" ? (t.assigneeName ? "Sign-off by" : "Any business reviewer") : t.assigneeName ? "Publish by" : "Approved by";
    const name = person ?? (st === "reviewed" || st === "approved" || st === "scheduled" ? t.from.replace(/ \(.*\)$/, "") : "");
    return <span className="inline-flex items-center gap-2 text-[12.5px] min-w-0"><span className="text-ink-3 whitespace-nowrap">{label}</span>{name && <><Avatar name={name} size={20} /><span className="truncate">{t.assignee === user.id && person ? "you" : name}</span></>}</span>;
  };

  const rows = view === "published" ? [] : byView[view]; const cur = VIEWS.find((v) => v.id === view)!;
  const empty = (txt: string) => <div className="p-12 text-center bg-surface border border-dashed border-line-2 rounded-xl text-[13px] text-ink-3">{q || mkt ? <>No pages match. <button className="underline text-ink" onClick={() => { setQ(""); setMkt(""); }}>Clear filters</button></> : txt}</div>;
  const taskList = (items: Task[]) => items.length ? <ul className="bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden">
        {[...items].sort((a, b) => Number(isNew(b)) - Number(isNew(a))).map((t) => { const m = marketOfPath(t.page.path); const d = dueLabel(t); const acts = actions(t);
          return <li key={t.page.path + t.kind} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,220px)_auto] gap-x-4 gap-y-2 items-center px-4 py-3 hover:bg-surface-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0"><PageIcon /><Link href={builderHref(t.page.path)} onClick={() => markSeen(onScreen.current)} className="font-semibold truncate hover:underline underline-offset-2">{t.page.title}</Link>{isNew(t) && <span suppressHydrationWarning className="flex-none text-[10px] font-bold uppercase tracking-[.06em] text-white bg-accent rounded px-1.5 py-0.5">New</span>}{view === "ready" ? <Pill status={t.page.status} /> : null}</div>
              <div className="text-[12px] text-ink-3 mt-0.5 pl-[26px] truncate"><span aria-hidden>{m.flag}</span> {m.name.replace(/^HSBC /, "")} · {routeOf(t.page.path)} · by {t.authorName ?? t.from.replace(/ \(.*\)$/, "")}{waitingLabel(t.sentAt) !== "—" ? ` · waiting ${waitingLabel(t.sentAt)}` : ""}</div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-[26px] md:pl-0 min-w-0">{who(t)}<span suppressHydrationWarning className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${DUE_CLS[d.c]}`}>{d.t}</span></div>
            <div className="flex items-center gap-1.5 pl-[26px] md:pl-0 md:justify-end">{acts.length ? acts : <Link href={builderHref(t.page.path)} className="btn btn-sm">Open</Link>}</div>
          </li>; })}
      </ul> : null;
  const pubList = (items: PublishedItem[]) => items.length ? <ul className="bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden">
        {items.map((p) => { const m = marketOfPath(p.path); return <li key={p.path} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-2">
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2 min-w-0"><PageIcon /><Link href={builderHref(p.path)} className="font-semibold truncate hover:underline underline-offset-2">{p.title}</Link><Pill status="published" /></div>
            <div className="text-[12px] text-ink-3 mt-0.5 pl-[26px] truncate"><span aria-hidden>{m.flag}</span> {m.domain}{routeOf(p.path)}</div></div>
          <span className="text-[12px] text-ink-3 pl-[26px] sm:pl-0" suppressHydrationWarning>{p.when ? `Published ${taskDate(p.when)}` : "Published"}{p.who ? ` · ${p.who}` : ""}</span>
          <Link href={builderHref(p.path)} className="btn btn-sm">Open</Link>
        </li>; })}
      </ul> : null;
  /** Yours first, then other people's (the second group only when there is one). */
  function split<T>(items: T[], mine: (x: T) => boolean, render: (x: T[]) => React.ReactNode) {
    if (!items.length) return empty(cur.empty);
    const a = items.filter(mine), b = items.filter((x) => !mine(x));
    const head = (t: string, n: number) => <h3 className="flex items-baseline gap-2 text-[11.5px] uppercase tracking-[.08em] font-semibold text-ink-3 mt-5 mb-2 first:mt-0">{t}<span className="normal-case tracking-normal font-normal">{n}</span></h3>;
    return <div>
      {head("Yours", a.length)}{a.length ? render(a) : <p className="text-[12.5px] text-ink-3 bg-surface border border-dashed border-line-2 rounded-xl px-4 py-3">Nothing of yours at this stage.</p>}
      {b.length > 0 && <>{head(isAdmin ? "Other people" : "Others you can act on", b.length)}{render(b)}</>}
    </div>;
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-4"><h1 className="text-2xl font-semibold">My tasks</h1><p className="text-ink-3 text-[13px] mt-1" suppressHydrationWarning>{totalYours ? <>You have <b className="text-ink font-semibold">{totalYours}</b> page{totalYours === 1 ? "" : "s"} in the review flow{totalNew ? <> · <b className="text-accent font-semibold">{totalNew} new</b> since you last looked</> : null}. </> : null}Pages by stage, across all markets. <span className="inline-flex items-center gap-1 whitespace-nowrap"><i aria-hidden className="inline-block w-2.5 h-2.5 rounded-full bg-accent" /> red number = something new for you</span></p></div>

      {/* the five stages as tabs */}
      <div role="tablist" aria-label="Stages" className="flex gap-1 overflow-x-auto border-b border-line mb-4 -mx-1 px-1">
        {VIEWS.map((v) => { const on = view === v.id; const n = count(v.id); const nw = v.id === "published" ? 0 : fresh(v.id).length;
          const tip = nw ? `${n} page${n === 1 ? "" : "s"} · ${nw} new for you` : `${n} page${n === 1 ? "" : "s"}`;
          return <button key={v.id} role="tab" aria-selected={on} type="button" onClick={() => openView(v.id)} title={tip} className={`flex items-center gap-2 px-3 py-2.5 text-[13.5px] whitespace-nowrap border-b-2 -mb-px ${on ? "border-accent text-ink font-semibold" : "border-transparent text-ink-3 hover:text-ink"}`}>
            {v.label}
            <span suppressHydrationWarning aria-label={tip} className={`min-w-[22px] h-5 px-1.5 rounded-full grid place-items-center text-[11.5px] font-semibold ${nw ? "bg-accent text-white" : n ? "bg-surface-3 text-ink-2" : "bg-transparent text-ink-4"}`}>{n}</span>
          </button>; })}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="flex items-center gap-2 bg-surface border border-line-2 rounded-md px-2.5 py-1.5 min-w-[220px] flex-1 sm:flex-none sm:w-[300px]"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px] bg-transparent" placeholder="Find a page or person" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tasks" /></label>
        <select className="border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] bg-surface" value={mkt} onChange={(e) => setMkt(e.target.value)} aria-label="Filter by market"><option value="">All markets</option>{markets.map((m) => <option key={m.id} value={m.id}>{m.flag} {m.name}</option>)}</select>
      </div>

      {/* backlog: one list; other stages: yours on top, other people below (authors only see their own; site admins see everyone) */}
      {view === "all" ? (rows.length ? <div>{VIEWS.filter((v) => v.id !== "all" && v.id !== "published").map((v) => { const g = rows.filter((t) => v.of(t, user.id)); if (!g.length) return null; const st = g[0].page.status;
          /* the same names as the tabs, in the same order */
          return <section key={v.id} aria-label={v.label} className="mt-6 first:mt-0"><h3 className="flex items-center gap-2 mb-2"><button type="button" onClick={() => openView(v.id)} title={`Open the ${v.label} tab`} className={`pill pill-${st} hover:underline underline-offset-2`}>{v.label}</button><span className="text-[12px] text-ink-3">{g.length}</span></h3>{taskList(g)}</section>; })}</div> : empty(cur.empty))
        : view === "backlog" ? (taskList(rows) ?? empty(cur.empty))
        : view !== "published" ? split(rows, (t) => t.assignee === user.id || t.author === user.id, taskList)
        : split(pub, (p) => p.whoId === user.id, pubList)}

      {assigning && <AssignDialog marketId={marketOfPath(assigning.page.path).id} task={assigning} pageHref={builderHref(assigning.page.path)} onClose={() => setAssigning(null)} onDone={(name) => { setToast(name ? `${assigning.page.title}: assigned to ${name}` : `${assigning.page.title}: not assigned`); setAssigning(null); router.refresh(); }} />}
      {sharing && <ShareReviewDialog key={sharing.t.page.path + sharing.stage} marketId={marketOfPath(sharing.t.page.path).id} path={sharing.t.page.path} title={sharing.t.page.title} stage={sharing.stage} onClose={() => { setSharing(null); router.refresh(); }} />}
      {publishing && <PublishDialog marketId={marketOfPath(publishing.page.path).id} envName={envById(envId).name} pages={[{ path: publishing.page.path, title: publishing.page.title, status: publishing.page.status }]} mayPublish={(p) => can("publish", p)}
        onClose={() => setPublishing(null)} onDone={(r, mode) => { setPublishing(null); const ok = r.filter((x) => x.ok).length; setToast(mode === "cancel" ? "Schedule cancelled" : ok ? (mode === "schedule" ? `${publishing.page.title} is scheduled` : `${publishing.page.title} is live`) : r[0]?.reason ?? "Nothing was published"); router.refresh(); }} />}
      {toast && <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 w-max max-w-[calc(100vw-32px)] flex items-center gap-2.5 bg-[#0F1013] text-white pl-3 pr-4 py-2.5 rounded-xl text-[13px] shadow-xl z-50"><span aria-hidden className="grid place-items-center w-5 h-5 rounded-full bg-white/15 text-[11px] flex-none">✓</span><span className="min-w-0">{toast}</span></div>}
    </div>
  );
}
