"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
export const taskDate = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }); };
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
  { id: "all", label: "All", empty: "Nothing in the review flow right now.", of: (t) => ["review", "inreview", "reviewed", "bizreview", "approved", "scheduled"].includes(t.page.status) },
  { id: "backlog", label: "Backlog", empty: "No page is waiting for a reviewer.", of: (t, me) => t.kind === "Review" && t.page.status === "review" && !t.assignee && t.author !== me }, // open to everyone except the page's author (they cannot take it)
  { id: "mine", label: "Ready for review", empty: "Nothing assigned and waiting to start · take a page from the Backlog.", of: (t, me) => t.kind === "Review" && t.page.status === "review" && (!!t.assignee || t.author === me) }, // the author follows their own page here while it waits for a reviewer
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
  const [sort, setSort] = useState<"new" | "due" | "due-desc">("new");
  const [onlyMe, setOnlyMe] = useState(false); // "Assigned to me only" // New first, or by due date
  const [busy, setBusy] = useState<string | null>(null); const [toast, setToast] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Task | null>(null); const [sharing, setSharing] = useState<{ t: Task; stage: "review" | "bizreview" } | null>(null);
  const [publishing, setPublishing] = useState<Task | null>(null); // Publish now or Schedule
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { window.history.replaceState(null, "", `/${marketId}/${envId}/tasks${view === "all" ? "" : `?view=${view}`}`); }, [view, marketId, envId]); // the tab is in the URL (shareable)

  const routeOf = (path: string) => path.replace(marketOfPath(path).root, "") || "/";
  const builderHref = (path: string) => `/${marketOfPath(path).id}/${envId}/page${routeOf(path)}`;
  const match = (path: string, title: string, extra = "") => (!mkt || marketOfPath(path).id === mkt) && (!q.trim() || `${title} ${routeOf(path)} ${extra}`.toLowerCase().includes(q.toLowerCase().trim()));
  const byView = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.id, tasks.filter((t) => v.of(t, user.id) && (!onlyMe || t.assignee === user.id)).filter((t) => match(t.page.path, t.page.title, `${t.from} ${t.assigneeName ?? ""}`)).sort((a, b) => (v.id === "all" ? STAGE_ORDER.indexOf(a.page.status) - STAGE_ORDER.indexOf(b.page.status) : 0) || (a.sentAt ?? "").localeCompare(b.sentAt ?? ""))])) as Record<View, Task[]>, [tasks, q, mkt, user.id, onlyMe]); // eslint-disable-line react-hooks/exhaustive-deps
  const pub = useMemo(() => published.filter((p) => (!onlyMe || p.whoId === user.id) && match(p.path, p.title, p.who ?? "")), [published, q, mkt, onlyMe, user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = (v: View) => (v === "published" ? (isAdmin ? pub.length : pub.filter((p) => p.whoId === user.id).length) : byView[v].length);
  /* yours = assigned to you or you are the author; in the Backlog, pages you could take */
  const seenSnap = useSyncExternalStore(subscribeSeen, readSeen, () => "[]"); const seen = useMemo(() => new Set<string>(JSON.parse(seenSnap)), [seenSnap]);
  const yoursOf = (v: View, t: Task) => (v === "all" ? t.assignee === user.id || t.author === user.id : v === "backlog" ? can("review", t.page.path) : t.assignee === user.id || t.author === user.id);
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
    if (st === "review" && !t.assignee) { // Backlog: open to everyone · a reviewer takes it (nobody hands it out)
      if (t.author === user.id) out.push(<span key="w" className="text-[12px] text-ink-3 whitespace-nowrap">Waiting for a reviewer to take it</span>, <Link key="open" href={builderHref(p)} onClick={() => markSeen(onScreen.current)} className="btn btn-sm">Open</Link>); // your own page: someone else reviews it
      else if (can("review", p)) btn("claim", "Assign to me", () => run(t, () => ucpApi.claimReview(mid(t), p), `${t.page.title} is yours · find it in Ready for review`), true);
      else out.push(<span key="why" className="text-[11.5px] text-ink-3 text-right leading-tight max-w-[170px]">Only reviewers can take it · you don&apos;t have Review &amp; approve here</span>, <button key="claim" type="button" className="btn btn-sm btn-next" disabled title="You need Review & approve on this folder to take it">Assign to me</button>);
    } else if (st === "review") { // Ready for review: assigned, not started
      if (t.assignee === user.id || isAdmin) btn("release", "Back to backlog", () => run(t, () => ucpApi.releaseReview(mid(t), p), `${t.assignee === user.id ? "You are no longer the reviewer" : `${t.assigneeName ?? "The reviewer"} is no longer the reviewer`} · ${t.page.title} is back in the Backlog`));
      if (t.assignee === user.id) btn("start", "Start review", () => run(t, () => status(t, "inreview"), `${t.page.title}: review started`), true);
    } else if (st === "inreview") {
      if (can("edit", p) && !(t.assignee === user.id)) btn("remind", "Remind", remind);
      if (can("review", p) && (mine || isAdmin)) btn("reviewed", t.assignee && t.assignee !== user.id ? `Reviewed for ${t.assigneeName?.split(" ")[0]}` : "Reviewed", () => run(t, () => status(t, "reviewed"), `${t.page.title}: marked reviewed`), true);
    } else if (st === "reviewed") {
      if (can("edit", p)) btn("send", "Send to business review", () => run(t, () => status(t, "bizreview"), `${t.page.title} sent to business review`, () => setSharing({ t, stage: "bizreview" })), true);
    } else if (st === "bizreview") {
      if (isAdmin) btn("share", "Share", () => setSharing({ t, stage: "bizreview" }));
      if (can("edit", p) && !(t.assignee === user.id)) btn("remind", "Remind", remind);
      if (can("review", p) || isAdmin) btn("signoff", "Sign off", () => run(t, () => status(t, "approved"), `${t.page.title}: signed off · ready to publish`), true);
    } else if (st === "approved" || st === "scheduled") {
      change();
      if (can("publish", p)) btn("publish", "Publish", () => setPublishing(t), true); // the dialog offers Publish now or Schedule (and moves or cancels an existing schedule)
      else out.push(<span key="w" className="text-[12px] text-ink-3 whitespace-nowrap">Waiting for a publisher</span>);
    }
    return out;
  }

  const rows = view === "published" ? [] : byView[view]; const cur = VIEWS.find((v) => v.id === view)!;
  const empty = (txt: string) => <div className="p-12 text-center bg-surface border border-dashed border-line-2 rounded-xl text-[13px] text-ink-3">{q || mkt ? <>No pages match. <button className="underline text-ink" onClick={() => { setQ(""); setMkt(""); }}>Clear filters</button></> : txt}</div>;
  /* People: the author and whoever has the page now; Dates: due (coloured) and when it was sent */
  /* Backlog: nobody is assigned · a reviewer (not the author) takes it straight from the Reviewer slot */
  const openChip = (t: Task) => can("review", t.page.path) && t.author !== user.id
    ? <button type="button" disabled={busy === t.page.path} onClick={(e) => { e.stopPropagation(); run(t, () => ucpApi.claimReview(mid(t), t.page.path), `${t.page.title} is yours · find it in Ready for review`); }} className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent border border-accent/40 hover:bg-accent-soft rounded-full px-2.5 py-0.5 whitespace-nowrap" title="Nobody is assigned yet · take this review">+ Assign to me</button>
    : <span className="text-[12px] text-ink-4 whitespace-nowrap" title="Nobody is assigned yet · a reviewer takes it from the Backlog">Waiting for a reviewer</span>;
  const personLine = (label: string, name?: string, you?: boolean, open?: Task) => <div className="flex items-center gap-2 min-w-0 text-[12.5px]"><span className="w-[92px] flex-none text-ink-3 text-[11.5px]">{label}</span>{name ? <><Avatar name={name} size={20} /><span className="truncate">{you ? "You" : name}</span></> : open ? openChip(open) : <span className="text-ink-4">—</span>}</div>;
  const stagePerson = (t: Task): [string, string | undefined, boolean] => {
    const st = t.page.status; const reviewer = t.from.replace(/ \(.*\)$/, "");
    if (st === "review" || st === "inreview") return ["Reviewer", t.assigneeName, t.assignee === user.id];
    if (st === "reviewed") return ["Reviewed by", reviewer, false];
    if (st === "bizreview") return [t.assigneeName ? "Business owner" : "Business owner", t.assigneeName ?? undefined, t.assignee === user.id];
    return t.assigneeName ? ["Publisher", t.assigneeName, t.assignee === user.id] : ["Approved by", reviewer, false];
  };
  const dueChip = (t: Task) => { const d = dueLabel(t); return <span suppressHydrationWarning className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${DUE_CLS[d.c]}`}>{d.t}</span>; };
  const th = "px-4 py-2 text-left text-[10.5px] uppercase tracking-[.08em] font-semibold text-ink-3 border-b border-line";
  const sortTasks = (items: Task[]) => [...items].sort((a, b) => sort === "due" ? a.due.localeCompare(b.due) : sort === "due-desc" ? b.due.localeCompare(a.due) : Number(isNew(b)) - Number(isNew(a)));
  /* one person per column on wide screens: avatar + short name ("You" for yourself); a hint when nobody is set yet */
  const pc = "p-0 min-[1400px]:pl-6 min-[1400px]:pr-1 min-[1400px]:py-3";
  /* site admins change the peer reviewer right next to that person (no separate button); the business review is the business's own, nobody is changed there */
  const editPerson = (t: Task) => isAdmin ? <button type="button" onClick={(e) => { e.stopPropagation(); setAssigning(t); }} className="flex-none inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent hover:underline underline-offset-2" title={t.assigneeName ? `Change ${t.assigneeName}` : "Assign someone"}><span aria-hidden>✎</span>{t.assigneeName ? "Change" : "Assign"}</button> : null;
  const who = (id?: string, name?: string, none?: string, email?: string, edit?: React.ReactNode) => <div className="hidden min-[1400px]:block min-w-0 text-[12.5px]">{name ? <><span className="flex items-center gap-1.5 min-w-0"><Avatar name={name} size={20} /><span className="truncate" title={name}>{name}{id === user.id ? <span className="text-ink-3"> (you)</span> : null}</span></span>{email && <a href={`mailto:${email}`} onClick={(e) => e.stopPropagation()} className="block mt-0.5 truncate text-[11px] text-ink-3 hover:text-ink hover:underline" title={email}>{email}</a>}{edit && <span className="flex mt-1">{edit}</span>}</> : <><span className="block text-ink-4 text-[12px] truncate">{none ?? "—"}</span>{edit && <span className="flex mt-1">{edit}</span>}</>}</div>;
  const taskRow = (t: Task) => { const m = marketOfPath(t.page.path); const acts = actions(t); const [pl, pn, py] = stagePerson(t); const w = waitingLabel(t.sentAt);
          return <tr key={t.page.path + t.kind} className="hover:bg-surface-2 align-middle border-t border-line">
            <td className="px-4 py-3 max-w-0 w-full">
              <div className="flex items-center gap-2 min-w-0"><PageIcon /><Link href={builderHref(t.page.path)} onClick={() => markSeen(onScreen.current)} className="font-semibold truncate hover:underline underline-offset-2">{t.page.title}</Link>{isNew(t) && <span suppressHydrationWarning className="flex-none text-[10px] font-bold uppercase tracking-[.06em] text-white bg-accent rounded px-1.5 py-0.5">New</span>}{view === "ready" ? <Pill status={t.page.status} /> : null}</div>
              <div className="text-[12px] text-ink-3 mt-0.5 pl-[26px] truncate"><span aria-hidden>{m.flag}</span> {m.name.replace(/^HSBC /, "")} · {routeOf(t.page.path)}</div>
              {/* phones: people and due date under the title */}
              <div className="min-[1400px]:hidden mt-1.5 pl-[26px] flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]"><span className="text-ink-3">{pl}</span>{pn ? <span className="inline-flex items-center gap-1.5"><Avatar name={pn} size={18} />{py ? "You" : pn}</span> : t.page.status === "review" && !t.assignee ? openChip(t) : <span className="text-ink-4">—</span>}{((t.page.status === "review" && t.assignee) || t.page.status === "inreview") && editPerson(t)}<span className="md:hidden">{dueChip(t)}</span></div>
              <div className="md:hidden mt-2 pl-[26px] flex flex-wrap items-center gap-1.5">{acts.length ? acts : <Link href={builderHref(t.page.path)} className="btn btn-sm">Open</Link>}</div>
            </td>
            {/* wide screens: the three people of the review flow, one column each */}
            <td className={pc}>{who(t.author, t.authorName ?? t.from.replace(/ \(.*\)$/, ""), undefined, t.authorEmail)}</td>
            <td className={pc}>{t.page.status === "review" && !t.assignee ? <div className="hidden min-[1400px]:block">{openChip(t)}</div> : who(t.peer, t.peerName, t.page.status === "review" || t.page.status === "inreview" ? "Not taken yet" : undefined, t.peerEmail, t.page.status === "review" || t.page.status === "inreview" ? editPerson(t) : null)}</td>
            <td className={pc}>{who(t.biz, t.bizName, t.page.status === "bizreview" ? "Anyone with Review" : undefined, t.bizEmail)}</td>
            <td className="px-4 min-[1400px]:pl-6 min-[1400px]:pr-2 py-3 hidden md:table-cell"><div className="grid gap-1 justify-items-start">{dueChip(t)}<span className="text-[11.5px] text-ink-3 whitespace-nowrap" suppressHydrationWarning>{t.sentAt ? `Sent ${taskDate(t.sentAt)}` : ""}{w !== "—" ? <span className="block text-ink-4">waiting {w}</span> : null}</span></div></td>
            <td className="px-4 py-3 hidden md:table-cell"><div className="flex flex-wrap xl:flex-nowrap min-[1400px]:!flex-wrap min-[1600px]:!flex-nowrap items-center justify-end gap-1.5">{acts.length ? acts : <><span className="hidden lg:inline text-[12px] text-ink-4">No action for you</span><Link href={builderHref(t.page.path)} className="btn btn-sm">Open</Link></>}</div></td>
          </tr>; };
  const pubRow = (p: PublishedItem) => { const m = marketOfPath(p.path); return <tr key={p.path} className="hover:bg-surface-2 border-t border-line">
          <td className="px-4 py-3 max-w-0 w-full"><div className="flex items-center gap-2 min-w-0"><PageIcon /><Link href={builderHref(p.path)} className="font-semibold truncate hover:underline underline-offset-2">{p.title}</Link><Pill status="published" /></div>
            <div className="text-[12px] text-ink-3 mt-0.5 pl-[26px] truncate"><span aria-hidden>{m.flag}</span> {m.domain}{routeOf(p.path)}</div>
            <div className="md:hidden mt-1 pl-[26px] text-[12px] text-ink-3" suppressHydrationWarning>{p.when ? `Published ${taskDate(p.when)}` : "Published"}{p.who ? ` · ${p.who}` : ""}</div></td>
          <td colSpan={3} className={pc}><div className="hidden min-[1400px]:block">{personLine("Published by", p.who, p.whoId === user.id)}</div></td>
          <td className="px-4 min-[1400px]:pl-6 min-[1400px]:pr-2 py-3 hidden md:table-cell"><span className="inline-block"><span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-good-soft text-good whitespace-nowrap" suppressHydrationWarning>{p.when ? taskDate(p.when) : "Live"}</span></span></td>
          <td className="px-4 py-3 text-right"><Link href={builderHref(p.path)} className="btn btn-sm">Open</Link></td>
        </tr>; };
  /* One table per view (so the columns line up), with group rows: a stage heading (All) and Yours / Other people */
  type Part = { label?: string; rows: React.ReactNode[]; empty?: string };
  const othersLabel = isAdmin ? "Other people" : "Others you can act on";
  /* separate cards per group (stage), with fixed column widths so People, Dates and Action line up across cards */
  const cols = <colgroup><col /><col className="w-0 min-[1400px]:w-[172px]" /><col className="w-0 min-[1400px]:w-[172px]" /><col className="w-0 min-[1400px]:w-[172px]" /><col className="hidden md:table-column w-[180px] min-[1400px]:!w-[132px]" /><col className="hidden md:table-column w-[330px] xl:w-[470px] min-[1400px]:!w-[330px] min-[1600px]:!w-[410px]" /></colgroup>;
  const board = (groups: { key: string; head?: React.ReactNode; parts: Part[] }[]) => <div className="grid gap-6">{groups.map((g, gi) => <section key={g.key} aria-label={g.key}>
    {g.head && <div className="mb-2">{g.head}</div>}
    <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,.04)]"><table className="w-full text-[13px] md:table-fixed">
      {cols}
      {gi === 0 ? <thead className="bg-surface-2"><tr><th className={th}>Page</th><th className={`${th} !p-0 min-[1400px]:!pl-6 min-[1400px]:!pr-1 min-[1400px]:!py-2`}><span className="hidden min-[1400px]:inline">Content author</span></th><th className={`${th} !p-0 min-[1400px]:!pl-6 min-[1400px]:!pr-1 min-[1400px]:!py-2`}><span className="hidden min-[1400px]:inline">Peer reviewer</span></th><th className={`${th} !p-0 min-[1400px]:!pl-6 min-[1400px]:!pr-1 min-[1400px]:!py-2`}><span className="hidden min-[1400px]:inline">Business reviewer</span></th><th className={`${th} hidden md:table-cell min-[1400px]:!pl-6 min-[1400px]:!pr-2`} aria-sort={sort === "due" ? "ascending" : sort === "due-desc" ? "descending" : undefined}><button type="button" onClick={() => setSort(sort === "due" ? "due-desc" : "due")} className={`inline-flex items-center gap-1 uppercase tracking-[.08em] hover:text-ink ${sort !== "new" ? "text-ink" : ""}`} title="Sort by due date">Dates<span aria-hidden className={sort === "new" ? "opacity-30" : ""}>{sort === "due-desc" ? "▼" : "▲"}</span></button></th><th className={`${th} hidden md:table-cell text-right`}><span className="sr-only">Action</span></th></tr></thead> : null}
      <tbody>
      {g.parts.map((p, i) => <Fragment key={i}>
        {p.label && <tr><td colSpan={6} className={`px-4 py-2 text-[11px] uppercase tracking-[.08em] font-semibold border-t border-line first:border-t-0 ${p.label === "Yours" ? "bg-accent-soft/50 text-accent-hover shadow-[inset_3px_0_0_var(--accent)]" : "bg-surface-2 text-ink-2 shadow-[inset_3px_0_0_var(--line-2)]"}`}>{p.label} <span className="normal-case tracking-normal font-normal opacity-80">· {p.rows.length}</span></td></tr>}
        {p.rows.length ? p.rows : p.empty ? <tr><td colSpan={6} className="px-4 py-3 text-[12.5px] text-ink-4 border-t border-line">{p.empty}</td></tr> : null}
      </Fragment>)}
      </tbody>
    </table></div></section>)}</div>;
  const mineT = (t: Task) => t.assignee === user.id || t.author === user.id;
  const splitParts = (items: Task[], emptyYours: string): Part[] => { const a = sortTasks(items.filter(mineT)), b = sortTasks(items.filter((t) => !mineT(t)));
    if (!isAdmin) return [{ rows: [...a, ...b].map(taskRow), empty: emptyYours }]; // an author only sees their own (and the Backlog they may take) · no Yours / Others split needed
    return [{ label: "Yours", rows: a.map(taskRow), empty: emptyYours }, ...(b.length ? [{ label: othersLabel, rows: b.map(taskRow) }] : [])]; };

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
        <label className="inline-flex items-center gap-2 text-[13px] text-ink-2 bg-surface border border-line-2 rounded-md px-2.5 py-1.5 cursor-pointer select-none"><input type="checkbox" className="accent-[var(--accent)]" checked={onlyMe} onChange={(e) => setOnlyMe(e.target.checked)} />Assigned to me only</label>
        <select className="border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] bg-surface" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort"><option value="new">Sort: new first</option><option value="due">Sort: due date, soonest first</option><option value="due-desc">Sort: due date, latest first</option></select>
        <select className="border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] bg-surface" value={mkt} onChange={(e) => setMkt(e.target.value)} aria-label="Filter by market"><option value="">All markets</option>{markets.map((m) => <option key={m.id} value={m.id}>{m.flag} {m.name}</option>)}</select>
      </div>

      {/* backlog: one list; other stages: yours on top, other people below (authors only see their own; site admins see everyone) */}
      {view === "all" ? board(VIEWS.filter((v) => v.id !== "all").map((v) => {
          /* every stage under the tab names: yours first, then other people's; an empty stage says there is nothing for you there */
          const st = v.id === "backlog" || v.id === "mine" ? "review" : v.id === "inreview" ? "inreview" : v.id === "sendbiz" ? "reviewed" : v.id === "bizreview" ? "bizreview" : v.id === "ready" ? "approved" : "published";
          const items = v.id === "published" ? [] : rows.filter((t) => v.of(t, user.id)); const mine = pub.filter((x) => x.whoId === user.id);
          const n = v.id === "published" ? mine.length : items.length;
          const head = <h3 className="flex items-center gap-2.5"><button type="button" onClick={() => openView(v.id)} title={`Open the ${v.label} tab`} className={`pill pill-${st} text-[12.5px] px-3 py-1 hover:underline underline-offset-2 ${n ? "" : "opacity-60"}`}>{v.label}</button><span className="text-[13px] text-ink-3">{n} page{n === 1 ? "" : "s"}</span></h3>;
          return { key: v.id, head, parts: v.id === "published" ? [{ label: isAdmin ? "Yours" : undefined, rows: mine.map(pubRow), empty: "Nothing of yours published recently." }] : splitParts(items, "No actions for you at this step.") };
        }))
        : view === "backlog" ? (rows.length ? board([{ key: "b", parts: [{ rows: sortTasks(rows).map(taskRow) }] }]) : empty(cur.empty))
        : view !== "published" ? (rows.length ? board([{ key: "s", parts: splitParts(rows, "Nothing of yours at this stage.") }]) : empty(cur.empty))
        : pub.length ? board([{ key: "p", parts: isAdmin ? [{ label: "Yours", rows: pub.filter((p) => p.whoId === user.id).map(pubRow), empty: "Nothing of yours published recently." }, { label: "Other people", rows: pub.filter((p) => p.whoId !== user.id).map(pubRow) }] : [{ rows: pub.filter((p) => p.whoId === user.id).map(pubRow), empty: "Nothing of yours published recently." }] }]) : empty(cur.empty)}

      {assigning && <AssignDialog marketId={marketOfPath(assigning.page.path).id} task={assigning} pageHref={builderHref(assigning.page.path)} onClose={() => setAssigning(null)} onDone={(name) => { setToast(name ? `${assigning.page.title}: assigned to ${name}` : `${assigning.page.title}: not assigned`); setAssigning(null); router.refresh(); }} />}
      {sharing && <ShareReviewDialog key={sharing.t.page.path + sharing.stage} marketId={marketOfPath(sharing.t.page.path).id} path={sharing.t.page.path} title={sharing.t.page.title} stage={sharing.stage} onClose={() => { setSharing(null); router.refresh(); }} />}
      {publishing && <PublishDialog marketId={marketOfPath(publishing.page.path).id} envName={envById(envId).name} pages={[{ path: publishing.page.path, title: publishing.page.title, status: publishing.page.status }]} mayPublish={(p) => can("publish", p)}
        onClose={() => setPublishing(null)} onDone={(r, mode) => { setPublishing(null); const ok = r.filter((x) => x.ok).length; setToast(mode === "cancel" ? "Schedule cancelled" : ok ? (mode === "schedule" ? `${publishing.page.title} is scheduled` : `${publishing.page.title} is live`) : r[0]?.reason ?? "Nothing was published"); router.refresh(); }} />}
      {toast && <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 w-max max-w-[calc(100vw-32px)] flex items-center gap-2.5 bg-[#0F1013] text-white pl-3 pr-4 py-2.5 rounded-xl text-[13px] shadow-xl z-50"><span aria-hidden className="grid place-items-center w-5 h-5 rounded-full bg-white/15 text-[11px] flex-none">✓</span><span className="min-w-0">{toast}</span></div>}
    </div>
  );
}
