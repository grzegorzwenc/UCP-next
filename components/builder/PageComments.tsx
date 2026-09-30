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
export function PageComments({ marketId, path, about, onClearAbout, focusKey }: { marketId: string; path: string; about: { id: string; label: string } | null; onClearAbout: () => void; focusKey: number }) {
  const { user, can } = useSession(); const admin = user.role === "admin" || !!user.perms.root?.manage;
  const mayWrite = admin || can("edit", path) || can("review", path);
  const [list, setList] = useState<PageComment[] | null>(null); const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null); const [all, setAll] = useState(false); const [ask, setAsk] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { let live = true; ucpApi.comments(marketId, path).then((l) => live && setList(l), (e) => live && (setErr(errText(e)), setList([]))); return () => { live = false; }; }, [marketId, path]);
  useEffect(() => { if (focusKey) box.current?.focus(); }, [focusKey]); // "Comment" on a version row puts the cursor here

  const run = async (fn: () => Promise<PageComment[]>) => { setBusy(true); setErr(null); try { setList(await fn()); return true; } catch (e) { setErr(errText(e)); return false; } finally { setBusy(false); } };
  const add = async () => { if (!text.trim() || busy) return; if (await run(() => ucpApi.addComment(marketId, path, text, about ?? undefined))) { setText(""); onClearAbout(); } };
  const pinned = list?.filter((c) => c.pinned) ?? [];
  const rest = list?.filter((c) => !c.pinned) ?? []; const shown = all ? rest : rest.slice(0, FIRST);
  const renderItem = (c: PageComment) => { const mine = c.who === user.id;
    return <li key={c.id} className={`rounded-lg border px-2.5 py-2 ${c.pinned ? "border-warn/40 bg-warn-soft/60" : "border-line bg-surface"}`}>
          <div className="flex items-start gap-2">
            <Avatar name={c.whoName} size={24} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 text-[12px]"><b className="font-semibold text-ink">{c.whoName}</b><time className="text-ink-3" dateTime={c.time} title={new Date(c.time).toLocaleString("en-GB")} suppressHydrationWarning>{relativeTime(c.time)}</time>
                {c.guest && <span className="text-[10.5px] rounded-full bg-surface-3 px-1.5 text-ink-3" title="Commented through a review link without a UCP account">guest</span>}
                {c.pinned && <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[.06em] text-warn"><svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden><path d={PIN} /></svg>Pinned</span>}</div>
              {c.version && <div className="mt-0.5 text-[11.5px] text-info truncate">About the version from {c.version.label}</div>}
              {c.stage && <div className="mt-0.5 text-[11.5px] text-info">During the {c.stage === "review" ? "author's review" : "business review"}</div>}
              <p className="mt-0.5 text-[13px] text-ink whitespace-pre-wrap break-words">{c.text}</p>
            </div>
            {mayWrite && <div className="flex flex-none items-center gap-0.5 -mr-1">
              <button type="button" className={`w-7 h-7 rounded grid place-items-center hover:bg-surface-3 ${c.pinned ? "text-warn" : "text-ink-3"}`} disabled={busy} onClick={() => run(() => ucpApi.pinComment(marketId, path, c.id, !c.pinned))} title={c.pinned ? "Unpin" : "Pin to the top"} aria-label={c.pinned ? "Unpin comment" : "Pin comment to the top"} aria-pressed={!!c.pinned}>
                <svg viewBox="0 0 24 24" className={`w-4 h-4 stroke-current ${c.pinned ? "fill-current" : "fill-none"}`} strokeWidth={1.6} strokeLinejoin="round" aria-hidden><path d={PIN} /></svg></button>
              {(mine || admin) && (ask === c.id
                ? <span className="inline-flex items-center gap-1 text-[11.5px]"><button type="button" className="text-crit font-semibold hover:underline" onClick={async () => { setAsk(null); await run(() => ucpApi.deleteComment(marketId, path, c.id)); }}>Delete</button><button type="button" className="text-ink-3 hover:underline" onClick={() => setAsk(null)}>Keep</button></span>
                : <button type="button" className="w-7 h-7 rounded grid place-items-center text-ink-3 hover:bg-surface-3 hover:text-crit" onClick={() => setAsk(c.id)} title="Delete comment" aria-label="Delete comment"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={1.6} strokeLinecap="round" aria-hidden><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></button>)}
            </div>}
          </div>
        </li>; };

  // A fragment on purpose: the pinned strip is a direct child of the whole panel's content, so `sticky` keeps it at the top of the panel
  // for the full scroll (inside the short comments section it would leave with the section).
  return <>
    {pinned.length > 0 && <div className="sticky -top-3.5 z-10 -mx-3.5 -mt-3.5 -mb-1 px-3.5 pt-3.5 pb-2 bg-surface border-b border-line shadow-[0_6px_12px_-10px_rgba(0,0,0,.35)]"><ul className="grid gap-1.5" aria-label="Pinned comments">{pinned.map(renderItem)}</ul></div>}
  <section aria-labelledby="cm-h" className="grid gap-2">
    <div className="flex items-baseline gap-2"><h3 id="cm-h" className="text-[13px] font-semibold">Comments</h3>{!!list?.length && <span className="text-[12px] text-ink-3">{list.length}</span>}</div>
    {mayWrite && <div className="border border-line-2 rounded-lg bg-surface focus-within:border-ink-3">
      {about && <div className="flex items-center gap-2 px-2.5 pt-2 text-[11.5px]"><span className="inline-flex items-center gap-1 rounded-full bg-info-soft text-info px-2 py-0.5 min-w-0"><span className="truncate">About the version from {about.label}</span></span><button type="button" className="text-ink-3 hover:text-ink flex-none" onClick={onClearAbout} aria-label="Not about a version">✕</button></div>}
      <textarea ref={box} rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder={about ? "What about this version?" : "Add a comment for the team…"} aria-label="New comment"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void add(); } }} className="block w-full resize-y bg-transparent px-2.5 py-2 text-[13px] outline-none" />
      <div className="flex items-center gap-2 px-2 pb-2"><span className="text-[11px] text-ink-4">⌘/Ctrl + Enter to post</span><button type="button" className="btn btn-sm btn-primary ml-auto" disabled={!text.trim() || busy} onClick={add}>{busy ? "Posting…" : "Add comment"}</button></div>
    </div>}
    {err && <div className="text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded">{err}</div>}
    {list === null ? <p className="text-[12.5px] text-ink-3">Loading comments…</p> : !list.length ? <p className="text-[12.5px] text-ink-3">No comments yet.{mayWrite ? " Leave a note for the next person who edits or reviews this page." : ""}</p>
      : <ul className="grid gap-1.5">{shown.filter((c) => !c.pinned).map(renderItem)}</ul>}
    {rest.length > shown.length && <button type="button" className="btn btn-sm btn-quiet justify-self-start" onClick={() => setAll(true)}>Show all {rest.length} comments</button>}
    {all && rest.length > FIRST && <button type="button" className="btn btn-sm btn-quiet justify-self-start" onClick={() => setAll(false)}>Show fewer</button>}
  </section>
  </>;
}
