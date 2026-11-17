"use client";
import { useEffect, useState } from "react";
import { ucpApi, ApiError, type JiraState } from "@/lib/api";
import { jiraLabel } from "@/lib/ucp/jira";
import { TargetCard } from "./PageComments";

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
  const [text, setText] = useState(""); const [busy, setBusy] = useState<"" | "sync" | "comment" | "link">(""); const [err, setErr] = useState(""); const [note, setNote] = useState("");
  useEffect(() => { let live = true; if (!jira) return; ucpApi.jira(marketId, path).then((s) => live && setSt(s), (e) => live && setErr(e instanceof ApiError ? e.problem.title : "Could not load the ticket")); return () => { live = false; }; }, [marketId, path, jira]);
  const key = jira ? jiraLabel(jira) : "";
  const act = async (b: typeof busy, fn: () => Promise<JiraState>, done?: string) => { setBusy(b); setErr(""); setNote(""); try { const s = await fn(); setSt(s); onChange?.(s); if (done) setNote(done); return true; } catch (e) { setErr(e instanceof ApiError ? e.problem.title : "That did not work"); return false; } finally { setBusy(""); } };
  const link = async () => { setBusy("link"); setLinkErr(""); const e = await onLink(draft); setBusy(""); if (e) setLinkErr(e); else setEditing(!draft.trim()); };
  const sync = () => act("sync", async () => { const r = await ucpApi.jiraSync(marketId, path, step); setTimeout(() => setNote(r.sent ? `Synced · ${r.sent} comment${r.sent === 1 ? "" : "s"} sent to ${key}` : `Synced · every open comment was already in ${key}`)); return r.state; });
  const comment = async () => { const t = text.trim(); if (!t) return; if (await act("comment", () => ucpApi.jiraComment(marketId, path, t), `Added to ${key} and to Comments`)) setText(""); };

  const synced = !!st?.sync; const shown = (st?.entries ?? []).filter((c) => c.kind !== "sync");
  const syncBtn = (big: boolean) => <button className={`btn btn-sm whitespace-nowrap flex-none ${big ? "btn-primary w-full justify-center" : ""}`} disabled={!canWork || !st || busy === "sync"} onClick={() => void sync()}>
    <svg aria-hidden viewBox="0 0 24 24" className={`w-3.5 h-3.5 stroke-current fill-none ${busy === "sync" ? "animate-spin" : ""}`} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" /></svg>
    {busy === "sync" ? "Syncing…" : big ? `Sync with ${key}` : "Sync"}</button>;

  /* Three steps: 1 add the link → 2 sync with Jira → 3 the ticket's comments, then Add a comment */
  return <div className="flex-1 overflow-auto p-3.5 text-sm flex flex-col gap-4">
    {(!jira || editing) ? <form onSubmit={(e) => { e.preventDefault(); void link(); }} className="flex flex-col gap-2">
      <b className="text-sm">{jira ? "Change the Jira link" : "Add a Jira link"}</b>
      <p className="text-xs text-ink-3 -mt-1">Link this page to its ticket, then sync to see and add comments.</p>
      <input id="jp-link" className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-sm bg-surface" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="UCP-123 or https://…atlassian.net/browse/…" aria-label="Jira link or ticket key" disabled={!canWork} />
      {linkErr && <small className="text-crit">{linkErr}</small>}
      <div className="flex items-center gap-2">{jira && <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>}<button className="btn btn-sm btn-primary ml-auto" disabled={!canWork || busy === "link" || !draft.trim() || draft.trim() === jira}>{jira ? "Save link" : "Add link"}</button></div>
    </form> : <>
      {/* the linked ticket */}
      <section aria-label="Jira ticket" className="rounded-lg border border-line bg-surface-2 p-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-2"><span className="text-xs text-ink-3">Ticket</span><a href={jira} target="_blank" rel="noopener noreferrer" className="font-mono text-sm font-bold hover:underline underline-offset-2" title={`Open ${key} in Jira`}>{key} ↗</a>
          {canWork && <button type="button" className="ml-auto text-xs text-ink-3 underline underline-offset-2 hover:text-ink" onClick={() => { setDraft(jira); setEditing(true); }}>Change</button>}</div>
        {synced ? <div className="flex items-center gap-2">{syncBtn(false)}<span className="text-xs text-ink-3" suppressHydrationWarning>Synced {when(st!.sync!.at)} · {st!.sync!.byName}</span></div>
          : <>{syncBtn(true)}<p className="text-xs text-ink-3 -mt-1">Sync first: it brings in the ticket&apos;s comments and posts where this page is.</p></>}
      </section>
      {note && <p role="status" className="text-xs bg-good-soft text-good rounded-md px-3 py-2 -mt-2">✓ {note}</p>}
      {err && <p role="alert" className="text-xs text-crit -mt-2">{err}</p>}

      {synced && <>
        {/* the ticket's comments */}
        <section aria-labelledby="jp-act" className="flex flex-col gap-2">
          <h3 id="jp-act" className="text-xs font-medium uppercase tracking-[.08em] text-ink-3">Comments in {key}{shown.length ? ` · ${shown.length}` : ""}</h3>
          <ol className="flex flex-col gap-2">
            {shown.length === 0 ? <li className="text-xs text-ink-3">No comments yet. Add the first one below.</li>
              : shown.map((c) => <li key={c.id} className="rounded-lg border border-line bg-surface px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs"><b className="text-ink whitespace-nowrap">{c.whoName}</b><span className="text-ink-3 whitespace-nowrap" suppressHydrationWarning>{when(c.time)}</span>{c.kind === "page" && <span className="rounded-full px-2 py-0.5 bg-surface-3 text-ink-2 whitespace-nowrap">From Comments</span>}</div>
              {c.origin && c.origin !== "Page comment" && <div className="mt-1 text-xs text-info">{c.origin.replace(/^Page comment · /, "")}</div>}
              {c.about && <TargetCard target={{ id: c.commentId ?? c.id, label: c.about }} compact />}
              <p className="mt-1 whitespace-pre-wrap break-words text-ink-2">{c.text}</p>
            </li>)}
          </ol>
        </section>
        {/* add a comment */}
        <section aria-labelledby="jp-com" className="flex flex-col gap-2 border-t border-line pt-3">
          <h3 id="jp-com" className="text-xs font-medium uppercase tracking-[.08em] text-ink-3">Add a comment</h3>
          <textarea id="jp-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} disabled={!canWork} maxLength={2000} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void comment(); } }}
            placeholder={`Write a comment for ${key}…`} aria-label={`Comment for ${key}`} className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-sm bg-surface" />
          <div className="flex items-center gap-2"><small className="text-xs text-ink-3 mr-auto">Also shows in Comments · ⌘↵</small><button className="btn btn-sm btn-primary" disabled={!canWork || !text.trim() || busy === "comment"} onClick={() => void comment()}>Add a comment</button></div>
        </section>
      </>}
      <p className="text-xs text-ink-3 border-t border-line pt-3">Prototype: the link, syncs and comments are kept with the page. Once the Jira connection is set up, they go to {key} as well.</p>
    </>}
  </div>;
}
