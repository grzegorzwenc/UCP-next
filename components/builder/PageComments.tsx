"use client";
import { useEffect, useRef, useState } from "react";
import { ucpApi, ApiError, type PageComment } from "@/lib/api";
import { useSession } from "@/components/shell/Session";
import { Avatar } from "@/components/ui/Avatar";
import { relativeTime } from "./VersionHistory";

const FIRST = 5;
const errText = (e: unknown) => (e instanceof ApiError ? e.problem.title : String(e));
const PIN = "M9 4h6l-1 5 3 3v2h-4v6l-1 1-1-1v-6H7v-2l3-3z";

/**
 * Comments on a page, shown at the top of Version history. Anyone who edits or reviews the page can comment;
 * a comment can be tied to one version ("About the version from …") and pinned so it stays at the top for everyone.
 */
type Ref = { id: string; label: string; field?: string };
/** What a comment is about, read back from its label: a quoted text, an asset (field "asset:n") or the whole component. */
function describe(r: Ref): { kind: "text" | "image" | "component"; what: string; comp: string; quote?: string } {
  const q = r.label.match(/^“([\s\S]*)” · (.+)$/); if (q) return { kind: "text", what: "Text", comp: q[2], quote: q[1] };
  const [a, b] = r.label.split(" · "); if (r.field?.startsWith("asset:") && b) return { kind: "image", what: a, comp: b };
  return { kind: "component", what: "Whole component", comp: r.label };
}
const KIND_ICON = { text: "M5 6h14M12 6v12M9 18h6", image: "M4 5h16v14H4zM4 15l4.5-4.5 4 4 2.5-2.5L20 17M15.5 9.5h.01", component: "M4 4h16v16H4zM4 9h16" };
const KindIcon = ({ k, size = 14 }: { k: keyof typeof KIND_ICON; size?: number }) => <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={KIND_ICON[k]} /></svg>;

/**
 * The picked text, image or component shown as a small card: in the composer (with ✕) it slides in when you click the page,
 * on a comment it is compact and clicking it shows that spot on the page.
 */
export function TargetCard({ target, onShow, onClear, compact = false }: { target: Ref; onShow?: (r: Ref) => void; onClear?: () => void; compact?: boolean }) {
  const d = describe(target);
  const body = <>
    <span className={`flex-none grid place-items-center rounded-md bg-brand-soft text-brand ${compact ? "w-6 h-6" : "w-8 h-8"}`}><KindIcon k={d.kind} size={compact ? 12 : 15} /></span>
    <span className="min-w-0 flex-1 text-left">
      <span className="flex items-center gap-1.5 min-w-0 text-xs font-medium uppercase tracking-[.06em] text-ink-3"><span className="truncate">{d.comp}</span><span aria-hidden className="text-ink-4">·</span><span className="flex-none">{d.what}</span></span>
      {d.quote ? <span className={`block text-ink leading-snug ${compact ? "text-xs truncate" : "text-sm line-clamp-2"}`}>“{d.quote}”</span>
        : <span className={`block text-ink-2 ${compact ? "text-xs" : "text-xs"}`}>{d.kind === "image" ? "The picture in this component" : "Everything in this component"}</span>}
    </span>
  </>;
  if (compact) return onShow ? <button type="button" onClick={() => onShow(target)} title="Show it on the page" className="group mt-1 flex items-center gap-2 w-full min-w-0 rounded-md border-l-2 border-brand bg-surface-2 hover:bg-brand-soft/60 px-2 py-1.5">{body}<span aria-hidden className="flex-none text-xs text-ink-3 group-hover:text-brand">Show</span></button>
    : <div className="mt-1 flex items-center gap-2 min-w-0 rounded-md border-l-2 border-brand bg-surface-2 px-2 py-1.5">{body}</div>;
  return <div key={`${target.id}|${target.field ?? ""}`} className="cmt-card-in flex items-center gap-2.5 min-w-0 rounded-lg border border-brand/30 border-l-[3px] border-l-accent bg-brand-soft/35 px-2.5 py-2">
    {body}
    <span className="flex flex-none flex-col items-end gap-1">
      {onClear && <button type="button" onClick={onClear} className="w-6 h-6 rounded grid place-items-center text-ink-3 hover:bg-surface-3 hover:text-ink" aria-label="Not about this · write a general comment" title="Remove · write a general comment">✕</button>}
      {onShow && <button type="button" onClick={() => onShow(target)} className="text-xs text-ink-3 hover:text-brand underline underline-offset-2">Show</button>}
    </span>
  </div>;
}
/** Kept for other screens: a one-line chip. */
export const BlockChip = ({ block, onShow }: { block: Ref; onShow?: (r: Ref) => void }) => <TargetCard target={block} onShow={onShow} compact />;

export function PageComments({ marketId, path, about, onClearAbout, focusKey, target, onClearTarget, onShowBlock, onList, bare }: { /** inside a panel that already says "Comments" */ bare?: boolean; marketId: string; path: string; about: { id: string; label: string } | null; onClearAbout: () => void; focusKey: number;
  /** review: the component picked on the page (the next comment is about it) */ target?: Ref | null; onClearTarget?: () => void; onShowBlock?: (r: Ref) => void; onList?: (l: PageComment[]) => void }) {
  const { user, can } = useSession(); const admin = user.role === "admin" || !!user.perms.root?.manage;
  const mayWrite = admin || can("edit", path) || can("review", path);
  const [list, setList] = useState<PageComment[] | null>(null); const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null); const [all, setAll] = useState(false); const [ask, setAsk] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { let live = true; ucpApi.comments(marketId, path).then((l) => live && setList(l), (e) => live && (setErr(errText(e)), setList([]))); return () => { live = false; }; }, [marketId, path]);
  const onListRef = useRef(onList); useEffect(() => { onListRef.current = onList; });
  useEffect(() => { if (list) onListRef.current?.(list); }, [list]); // the page shows a marker on components with comments
  useEffect(() => { if (target) box.current?.focus(); }, [target]); // picking a component on the page puts the cursor here
  useEffect(() => { if (focusKey) box.current?.focus(); }, [focusKey]); // "Comment" on a version row puts the cursor here

  const run = async (fn: () => Promise<PageComment[]>) => { setBusy(true); setErr(null); try { setList(await fn()); return true; } catch (e) { setErr(errText(e)); return false; } finally { setBusy(false); } };
  const add = async () => { if (!text.trim() || busy) return; if (await run(() => ucpApi.addComment(marketId, path, text, about ?? undefined, target ?? undefined))) { setText(""); onClearAbout(); onClearTarget?.(); } };
  const open = list?.filter((c) => !c.resolved) ?? []; const resolved = list?.filter((c) => c.resolved) ?? []; const [showResolved, setShowResolved] = useState(false);
  const [undo, setUndo] = useState<string | null>(null); const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined); // "Comment resolved · Undo" for a few seconds
  const resolve = async (c: PageComment) => { const was = !!c.resolved; if (await run(() => ucpApi.resolveComment(marketId, path, c.id, !was))) { clearTimeout(undoTimer.current); if (!was) { setUndo(c.id); undoTimer.current = setTimeout(() => setUndo(null), 6000); } else setUndo(null); } };
  const pinned = open.filter((c) => c.pinned);
  const rest = open.filter((c) => !c.pinned); const shown = all ? rest : rest.slice(0, FIRST);
  const renderItem = (c: PageComment) => { const mine = c.who === user.id;
    return <li key={c.id} className={`min-w-0 rounded-lg border px-2.5 py-2 ${c.resolved ? "border-line bg-surface-2/70" : c.pinned ? "border-warn/40 bg-warn-soft/60" : "border-line bg-surface"}`}>
          <div className="flex items-start gap-2">
            <Avatar name={c.whoName} size={24} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 text-xs"><b className="font-medium text-ink">{c.whoName}</b><time className="text-ink-3" dateTime={c.time} title={new Date(c.time).toLocaleString("en-GB")} suppressHydrationWarning>{relativeTime(c.time)}</time>
                {c.guest && <span className="text-xs rounded-full bg-surface-3 px-1.5 text-ink-3" title="Commented through a review link without a UCP account">guest</span>}
                {c.pinned && <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[.06em] text-warn"><svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden><path d={PIN} /></svg>Pinned</span>}</div>
              {c.block && <TargetCard target={c.block} onShow={onShowBlock} compact />}
              {c.version && <div className="mt-0.5 text-xs text-info truncate">About the version from {c.version.label}</div>}
              {c.stage && <div className="mt-0.5 text-xs text-info">During the {c.stage === "review" ? "author's review" : "business review"}</div>}
              <p className={`mt-0.5 text-sm whitespace-pre-wrap break-words ${c.resolved ? "text-ink-3" : "text-ink"}`}>{c.text}</p>
              {c.resolved && <div className="mt-1 inline-flex items-center gap-1 text-xs text-good"><svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>Resolved by {c.resolved.by === user.id ? "you" : c.resolved.name} · <time dateTime={c.resolved.at} suppressHydrationWarning>{relativeTime(c.resolved.at)}</time></div>}
            </div>
            {mayWrite && <div className="flex flex-none items-center gap-0.5 -mr-1">
              <button type="button" className={`w-7 h-7 rounded grid place-items-center hover:bg-surface-3 ${c.resolved ? "text-good" : "text-ink-3 hover:text-good"}`} disabled={busy} onClick={() => void resolve(c)} title={c.resolved ? "Reopen · show it on the page again" : "Resolve · done, no longer shown on the page"} aria-label={c.resolved ? "Reopen comment" : "Resolve comment"} aria-pressed={!!c.resolved}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" /></svg></button>
              {!c.resolved && <button type="button" className={`w-7 h-7 rounded grid place-items-center hover:bg-surface-3 ${c.pinned ? "text-warn" : "text-ink-3"}`} disabled={busy} onClick={() => run(() => ucpApi.pinComment(marketId, path, c.id, !c.pinned))} title={c.pinned ? "Unpin" : "Pin to the top"} aria-label={c.pinned ? "Unpin comment" : "Pin comment to the top"} aria-pressed={!!c.pinned}>
                <svg viewBox="0 0 24 24" className={`w-4 h-4 stroke-current ${c.pinned ? "fill-current" : "fill-none"}`} strokeWidth={1.6} strokeLinejoin="round" aria-hidden><path d={PIN} /></svg></button>}
              {(mine || admin) && (ask === c.id
                ? <span className="inline-flex items-center gap-1 text-xs"><button type="button" className="text-crit font-medium hover:underline" onClick={async () => { setAsk(null); await run(() => ucpApi.deleteComment(marketId, path, c.id)); }}>Delete</button><button type="button" className="text-ink-3 hover:underline" onClick={() => setAsk(null)}>Keep</button></span>
                : <button type="button" className="w-7 h-7 rounded grid place-items-center text-ink-3 hover:bg-surface-3 hover:text-crit" onClick={() => setAsk(c.id)} title="Delete comment" aria-label="Delete comment"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={1.6} strokeLinecap="round" aria-hidden><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button>)}
            </div>}
          </div>
        </li>; };

  // A fragment on purpose: the pinned strip is a direct child of the whole panel's content, so `sticky` keeps it at the top of the panel
  // for the full scroll (inside the short comments section it would leave with the section).
  return <>
    {pinned.length > 0 && <div className="sticky -top-3.5 z-10 -mx-3.5 -mt-3.5 mb-3 px-3.5 pt-3.5 pb-2.5 bg-surface border-b border-line shadow-[0_6px_12px_-10px_rgba(0,0,0,.35)]"><ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5" aria-label="Pinned comments">{pinned.map(renderItem)}</ul></div>}
  <section aria-labelledby="cm-h" className="grid grid-cols-[minmax(0,1fr)] gap-2">
    <div className={`flex items-baseline gap-2 ${bare ? "sr-only" : ""}`}><h3 id="cm-h" className="text-sm font-medium">Comments</h3>{!!open.length && <span className="text-xs text-ink-3">{open.length}</span>}</div>
    {mayWrite && <div className="border border-line-2 rounded-lg bg-surface focus-within:border-ink-3">
      {target && <div className="p-2 pb-0"><TargetCard key={`${target.id}|${target.field ?? ""}`} target={target} onShow={onShowBlock} onClear={onClearTarget} /></div>}
      {about && <div className="flex items-center gap-2 px-2.5 pt-2 text-xs"><span className="inline-flex items-center gap-1 rounded-full bg-info-soft text-info px-2 py-0.5 min-w-0"><span className="truncate">About the version from {about.label}</span></span><button type="button" className="text-ink-3 hover:text-ink flex-none" onClick={onClearAbout} aria-label="Not about a version">✕</button></div>}
      <textarea ref={box} rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder={target ? "What should change here?" : about ? "What about this version?" : target !== undefined ? "Click a text or an image on the page, or write a general comment…" : "Add a comment for the team…"} aria-label="New comment"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void add(); } }} className="block w-full resize-y bg-transparent px-2.5 py-2 text-sm outline-none" />
      <div className="flex items-center gap-2 px-2 pb-2"><span className="text-xs text-ink-4">⌘/Ctrl + Enter to post</span><button type="button" className="btn btn-sm btn-primary ml-auto" disabled={!text.trim() || busy} onClick={add}>{busy ? "Posting…" : "Add comment"}</button></div>
    </div>}
    {undo && <div role="status" className="cmt-card-in flex items-center gap-2 bg-foreground text-background rounded-lg px-3 py-2 text-xs"><svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#7FD1A8]"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>Comment resolved · hidden from the page
      <button type="button" className="ml-auto font-medium underline underline-offset-2 hover:text-white/80" disabled={busy} onClick={async () => { const id = undo; setUndo(null); clearTimeout(undoTimer.current); await run(() => ucpApi.resolveComment(marketId, path, id, false)); }}>Undo</button></div>}
    {err && <div className="text-crit text-xs bg-crit-soft px-3 py-2 rounded">{err}</div>}
    {list === null ? <p className="text-xs text-ink-3">Loading comments…</p> : !list.length ? <p className="text-xs text-ink-3">No comments yet.{mayWrite ? " Leave a note for the next person who edits or reviews this page." : ""}</p>
      : <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">{shown.filter((c) => !c.pinned).map(renderItem)}</ul>}
    {rest.length > shown.length && <button type="button" className="btn btn-sm btn-quiet justify-self-start" onClick={() => setAll(true)}>Show all {rest.length} comments</button>}
    {all && rest.length > FIRST && <button type="button" className="btn btn-sm btn-quiet justify-self-start" onClick={() => setAll(false)}>Show fewer</button>}
    {resolved.length > 0 && <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5 pt-1">
      <button type="button" onClick={() => setShowResolved(!showResolved)} aria-expanded={showResolved} className="flex items-center gap-2 text-xs font-medium text-ink-2 hover:text-ink justify-self-start">
        <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={`transition-transform ${showResolved ? "rotate-90" : ""}`}><path d="M9 6l6 6-6 6" /></svg>
        <span className="text-good">Resolved</span><span className="text-ink-3 font-normal">{resolved.length} · not shown on the page</span></button>
      {showResolved && <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">{resolved.map(renderItem)}</ul>}
    </div>}
  </section>
  </>;
}
