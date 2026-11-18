"use client";
import { useEffect, useState } from "react";
import { ucpApi, ApiError, type JiraState } from "@/lib/api";
import { jiraLabel } from "@/lib/ucp/jira";
import { TargetCard } from "./PageComments";
import { JiraChip } from "@/components/ui/JiraChip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";

const SYNC_ICON = "M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4";
const PEN_ICON = "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z";
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

/**
 * Right rail → Jira, in three steps: add the ticket's link → sync with Jira → the ticket's comments, then "Add a comment"
 * (it also shows in the page's Comments). Page comments can be sent one by one from Comments, or all open ones with Sync.
 * Prototype: everything is kept on the page and listed here; nothing reaches Jira until the Jira API is connected.
 */
export function JiraPanel({ marketId, path, jira, step, canWork, onLink, onChange }: {
  marketId: string; path: string; jira: string; step: string; canWork: boolean;
  /** link, change or remove the ticket; resolves to an error text or "" */ onLink: (value: string) => Promise<string>;
  /** integration switched, or page comments changed (the Comments tab and the builder reload them) */ onChange?: (s: JiraState) => void;
}) {
  const [st, setSt] = useState<JiraState | null>(null);
  const [draft, setDraft] = useState(jira); const [linkErr, setLinkErr] = useState(""); const [editing, setEditing] = useState(!jira);
  const [ask, setAsk] = useState("");  // the entry awaiting a "Delete / Keep" answer
  const [text, setText] = useState(""); const [busy, setBusy] = useState<"" | "sync" | "comment" | "link" | "del">(""); const [err, setErr] = useState(""); const [note, setNote] = useState("");
  useEffect(() => { let live = true; if (!jira) return; ucpApi.jira(marketId, path).then((s) => live && setSt(s), (e) => live && setErr(e instanceof ApiError ? e.problem.title : "Could not load the ticket")); return () => { live = false; }; }, [marketId, path, jira]);
  const key = jira ? jiraLabel(jira) : "";
  const act = async (b: typeof busy, fn: () => Promise<JiraState>, done?: string) => { setBusy(b); setErr(""); setNote(""); try { const s = await fn(); setSt(s); onChange?.(s); if (done) setNote(done); return true; } catch (e) { setErr(e instanceof ApiError ? e.problem.title : "That did not work"); return false; } finally { setBusy(""); } };
  const link = async () => { setBusy("link"); setLinkErr(""); const e = await onLink(draft); setBusy(""); if (e) setLinkErr(e); else setEditing(!draft.trim()); };
  const sync = () => act("sync", async () => { const r = await ucpApi.jiraSync(marketId, path, step); setTimeout(() => setNote(r.sent ? `Synced · ${r.sent} comment${r.sent === 1 ? "" : "s"} sent to ${key}` : `Synced · every open comment was already in ${key}`)); return r.state; });
  const remove = async (id: string) => { setAsk(""); await act("del", () => ucpApi.jiraDelete(marketId, path, id), "Comment removed"); };
  const comment = async () => { const t = text.trim(); if (!t) return; if (await act("comment", () => ucpApi.jiraComment(marketId, path, t), `Added to ${key} and to Comments`)) setText(""); };

  const synced = !!st?.sync; const shown = (st?.entries ?? []).filter((c) => c.kind !== "sync");
  /* An action as an icon with a tooltip: the ticket row carries two of them, and spelling both out
     ("Sync with UCP-4821", "Edit the link") pushed the badge off the row on a 320px panel. */
  const iconBtn = (onClick: () => void, label: string, disabled: boolean, d: string, spin = false) =>
    <Tooltip>
      <TooltipTrigger render={<button type="button" aria-label={label} disabled={!canWork || disabled} onClick={onClick} className="btn btn-sm btn-secondary size-[30px] justify-center px-0" />}>
        <svg aria-hidden viewBox="0 0 24 24" className={`w-3.5 h-3.5 stroke-current fill-none ${spin ? "animate-spin" : ""}`} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>;
  const syncBtn = (big: boolean) => <button className={`btn btn-sm whitespace-nowrap flex-none ${big ? "btn-primary w-full justify-center" : ""}`} disabled={!canWork || !st || busy === "sync"} onClick={() => void sync()}>
    <svg aria-hidden viewBox="0 0 24 24" className={`w-3.5 h-3.5 stroke-current fill-none ${busy === "sync" ? "animate-spin" : ""}`} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" /></svg>
    {busy === "sync" ? "Syncing…" : big ? `Sync with ${key}` : "Sync"}</button>;

  /* Three steps: 1 add the link → 2 sync with Jira → 3 the ticket's comments, then Add a comment */
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-3.5 text-sm">
    {(!jira || editing) ? <form key="edit" onSubmit={(e) => { e.preventDefault(); void link(); }} className="cmt-card-in flex flex-col gap-2">
      <b className="text-sm">{jira ? "Change the Jira link" : "Add a Jira link"}</b>
      <p className="text-xs text-ink-3 -mt-1">Link this page to its ticket, then sync to see and add comments.</p>
      <input id="jp-link" className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-sm bg-surface" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="UCP-123 or https://…atlassian.net/browse/…" aria-label="Jira link or ticket key" disabled={!canWork} />
      {linkErr && <small className="text-crit">{linkErr}</small>}
      <div className="flex items-center gap-2">{jira && <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>}<button className="btn btn-sm btn-primary ml-auto" disabled={!canWork || busy === "link" || !draft.trim() || draft.trim() === jira}>{jira ? "Save link" : "Add link"}</button></div>
    </form> : <div key="view" className="cmt-card-in flex flex-col gap-4">
      {/* the linked ticket */}
      <section aria-label="Jira ticket" className="border border-line bg-surface-2 p-3 flex flex-col gap-2.5">
        {/* One row: the ticket, then its two actions as icon buttons so they take a button's worth of
            room between them rather than two labelled buttons' worth. The labels move to tooltips. */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-3">Ticket</span><JiraChip url={jira} />
          <span className="ml-auto flex flex-none items-center gap-1">
            {synced && iconBtn(sync, "Sync with " + key, busy === "sync", SYNC_ICON, busy === "sync")}
            {canWork && iconBtn(() => { setDraft(jira); setEditing(true); }, "Edit the link", false, PEN_ICON)}
          </span>
        </div>
        {synced
          ? <p className="truncate text-xs text-ink-3" suppressHydrationWarning title={`Last synced ${when(st!.sync!.at)} by ${st!.sync!.byName}`}>Last synced {when(st!.sync!.at)} · {st!.sync!.byName}</p>
          : <>{syncBtn(true)}<p className="text-xs text-ink-3 -mt-1">Sync first: it brings in the ticket&apos;s comments and posts where this page is.</p></>}
      </section>
      {note && <p role="status" className="text-xs bg-good-soft text-good rounded-md px-3 py-2 -mt-2">✓ {note}</p>}
      {err && <p role="alert" className="text-xs text-crit -mt-2">{err}</p>}

      {synced && <>
        {/* The box sits above the list, as it does in the Comments tab — you come here to say something,
            and a composer under a growing list walks away from you. */}
        {/* No "Add a comment" heading: the box's placeholder, the button and the section above it
            all said the word, four times in a column barely taller than a hand. */}
        <section aria-label={`Add a comment to ${key}`} className="flex flex-col gap-2">
          <textarea id="jp-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} disabled={!canWork} maxLength={2000} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void comment(); } }}
            placeholder={`Write a comment for ${key}…`} aria-label={`Comment for ${key}`} className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-sm bg-surface" />
          <div className="flex flex-col gap-1.5">
            <button className="btn btn-sm btn-primary w-full justify-center" disabled={!canWork || !text.trim() || busy === "comment"} onClick={() => void comment()}>{busy === "comment" ? "Adding…" : "Add a comment"}</button>
            <small className="text-xs text-ink-3">Also shows in Comments · ⌘↵ to add</small>
          </div>
        </section>
        {/* the ticket's comments */}
        <section aria-labelledby="jp-act" className="flex flex-col gap-2 border-t border-line pt-3">
          <h3 id="jp-act" className="text-xs font-medium uppercase tracking-[.08em] text-ink-3">Comments in {key}{shown.length ? ` · ${shown.length}` : ""}</h3>
          <ol className="flex flex-col gap-2">
            {shown.length === 0 ? <li className="text-xs text-ink-3">None yet.</li>
              /* `cmt-card-in` runs on mount, and the list is keyed by entry id, so only a comment that
                 is actually new animates — a sync that returns the same ids leaves the rows alone. */
              : shown.map((c) => <li key={c.id} className="cmt-card-in group/jc border border-line bg-surface px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs"><b className="text-ink whitespace-nowrap">{c.whoName}</b><span className="text-ink-3 whitespace-nowrap" suppressHydrationWarning>{when(c.time)}</span>{c.kind === "page" && <span className="rounded-full px-2 py-0.5 bg-surface-3 text-ink-2 whitespace-nowrap">From Comments</span>}
                {canWork && (ask === c.id
                  ? <span className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap"><button type="button" className="font-medium text-crit hover:underline" disabled={busy === "del"} onClick={() => void remove(c.id)}>Delete</button><button type="button" className="text-ink-3 hover:underline" onClick={() => setAsk("")}>Keep</button></span>
                  : <button type="button" aria-label="Delete this comment" title="Delete this comment" onClick={() => setAsk(c.id)}
                      className="ml-auto grid h-6 w-6 flex-none place-items-center text-ink-3 opacity-0 transition-opacity hover:text-crit focus-visible:opacity-100 group-hover/jc:opacity-100">
                      <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth={1.6} strokeLinecap="round"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                    </button>)}</div>
              {c.origin && c.origin !== "Page comment" && <div className="mt-1 text-xs text-info">{c.origin.replace(/^Page comment · /, "")}</div>}
              {c.about && <TargetCard target={{ id: c.commentId ?? c.id, label: c.about }} compact />}
              <p className="mt-1 whitespace-pre-wrap break-words text-ink-2">{c.text}</p>
            </li>)}
          </ol>
        </section>
      </>}
    </div>}
    </div>
    {/* Pinned to the foot of the panel rather than trailing the content: it is a standing caveat
        about the whole tab, not a footnote to whatever happens to be the last thing on screen. */}
    <p className="flex-none border-t border-line px-3.5 py-2.5 text-xs text-ink-3">Prototype: the link, syncs and comments are kept with the page. Once the Jira connection is set up, they go to {key || "Jira"} as well.</p>
  </div>;
}
