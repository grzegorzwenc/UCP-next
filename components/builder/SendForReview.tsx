"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ReviewerOption } from "@/lib/ucp/types";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { Avatar } from "@/components/ui/Avatar";
import { ModalShell, Err } from "@/components/models/ModalShell";
import { FloatingPanel } from "@/components/review/FloatingPanel";

export type ReviewBody = { note?: string };
const openTxt = (n: number) => `${n} open review${n === 1 ? "" : "s"}`;
/** Automatic choice: the reviewer with the fewest open reviews who is not the sender (list comes sorted from the server). */
export const autoPick = (rs: ReviewerOption[], meId: string) => rs.find((r) => r.id !== meId) ?? rs[0];

function useReviewers(marketId: string, pagePath: string) {
  const [list, setList] = useState<ReviewerOption[] | null>(null); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { let on = true; ucpApi.reviewers(marketId, pagePath).then((r) => { if (on) setList(r); }).catch((e) => { if (on) { setList([]); setErr(errorText(e)); } }); return () => { on = false; }; }, [marketId, pagePath]);
  return { list, err };
}

type Shared = { marketId: string; pagePath: string; onClose: () => void; onSend: (body: ReviewBody) => Promise<void> };

/** The form itself, shared by the modal, the workflow drawer and the Quality checklist panel. */
function useSend({ marketId, pagePath, onSend, fill = false }: Omit<Shared, "onClose"> & { /** stretch the note to the height the surface gives it (the panel), rather than a fixed 3 rows (the modal) */ fill?: boolean }) {
  const { list, err: loadErr } = useReviewers(marketId, pagePath);
  const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const none = list !== null && !list.length; const ready = !busy && !none && list !== null;
  async function send() {
    if (!ready) return; setBusy(true); setErr(null);
    try { await onSend({ note: note.trim() || undefined }); }
    catch (e) { setErr(errorText(e)); setBusy(false); }
  }
  const body = <div className={`flex flex-col gap-3 text-sm ${fill ? "h-full" : ""}`}>
    <div className="border border-line rounded-lg p-3 bg-surface-2"><b className="block font-medium">It goes to the Backlog · open to all reviewers</b>
      <span className="block text-xs text-ink-3 mt-0.5">{list === null ? "Checking who can review it…" : none ? "Nobody has Review on this folder yet. Ask a site admin to grant it." : `Nobody is assigned. Any of the ${list.length} reviewer${list.length === 1 ? "" : "s"} who can review this page takes it from My tasks → Backlog.`}</span>
      {list && list.length > 0 && <span className="flex items-center gap-1 mt-2" aria-label="Reviewers who can take it">{list.slice(0, 8).map((r) => <span key={r.id} title={r.name}><Avatar name={r.name} size={22} /></span>)}{list.length > 8 && <span className="text-xs text-ink-3 ml-1">+{list.length - 8}</span>}</span>}</div>
    {/* In the panel the note takes the height left over -- a 3-row box under a tall empty card read
        as "there is nothing more to say here". It keeps 3 rows as its floor, so a short panel scrolls
        rather than crushing it. */}
    <label className={`text-xs text-ink-2 font-medium ${fill ? "flex min-h-0 flex-1 flex-col" : ""}`}><span>Note for the reviewer <span className="font-normal text-ink-3">(optional)</span></span>
      <textarea rows={3} className={`bdl-field mt-1 ${fill ? "min-h-[4.5rem] flex-1 resize-none" : ""}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should they look at?" /></label>
    <Err err={err ?? loadErr} />
  </div>;
  return { body, busy, ready, send };
}

/** "Send page for review": the page goes to the Backlog, open to every reviewer (nobody is assigned · a reviewer takes it in My tasks), plus an optional note. */
export function SendForReviewModal({ marketId, pagePath, onClose, onSend, inline = false }: Shared & { /** render just the form, for embedding in a panel */ inline?: boolean }) {
  const { body, busy, ready, send } = useSend({ marketId, pagePath, onSend });
  const cancel = <button className="btn btn-sm btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>;
  const go = (label: string) => <button className="btn btn-sm btn-primary" onClick={() => void send()} disabled={!ready}>{busy ? "Sending…" : label}</button>;
  /* `inline`: the workflow drawer shows this in place of a modal, the same as the share panel —
     the actions live in the drawer now, so a dialog over it put two surfaces on one decision. */
  if (inline) return <div className="flex flex-col">{body}<div className="mt-3 flex items-center justify-end gap-2">{cancel}{go("Send for review")}</div></div>;

  return <ModalShell title="Send page for review" subtitle="The page becomes read-only until the review is finished or someone reopens it." width={520} onClose={() => { if (!busy) onClose(); }}
    footer={<>{cancel}{go("Send to the Backlog")}</>}>
    {body}
  </ModalShell>;
}

/**
 * The same decision inside the Quality checklist panel, which is where the page was judged ready.
 * A modal over the preview would cover the page it is about and leave two surfaces (panel and
 * dialog) on one decision; this keeps the footer buttons exactly where "Send for review" was.
 */
export function SendForReviewPanel({ marketId, pagePath, onClose, onSend, ...panel }: Shared & { width?: number; bottom?: number; open: boolean; onToggle: (open: boolean) => void; icon?: React.ReactNode }) {
  const { body, busy, ready, send } = useSend({ marketId, pagePath, onSend, fill: true });
  return <FloatingPanel {...panel} title="Send for review" hint="The page becomes read-only until the review is finished or someone reopens it."
    footer={<div className="flex items-center gap-2">
      <button className="btn btn-sm btn-secondary flex-1 justify-center" onClick={onClose} disabled={busy}>Cancel</button>
      <button className="btn btn-sm btn-primary flex-1 justify-center" onClick={() => void send()} disabled={!ready}>{busy ? "Sending…" : "Send for review"}</button>
    </div>}>
    {body}
  </FloatingPanel>;
}

/** Toolbar chip while a page is in review. Site admins can click it to change the reviewer; for everyone else it is plain text. */
export function AssigneeChip({ name, admin, marketId, pagePath, meId, onReassigned }: { name: string; admin: boolean; marketId: string; pagePath: string; meId: string; onReassigned: (r: { assignee: string; assigneeName: string }) => void }) {
  const [at, setAt] = useState<{ top: number; right: number } | null>(null); const btn = useRef<HTMLButtonElement>(null);
  const body = <><span className="text-ink-3 hidden xl:inline">Assigned to</span><Avatar name={name} size={20} /><b className="font-medium truncate max-w-[140px]">{name}</b></>;
  const cls = "inline-flex items-center gap-1.5 text-xs whitespace-nowrap border border-line-2 rounded-full pl-2.5 pr-1.5 py-0.5";
  if (!admin) return <span className={cls}>{body}</span>;
  const toggle = () => { if (at) { setAt(null); return; } const r = btn.current?.getBoundingClientRect(); if (r) setAt({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) }); };
  return <>
    <button ref={btn} type="button" className={`${cls} hover:bg-surface-2`} title="Change reviewer" aria-expanded={!!at} onClick={toggle}>{body}<ChevronDown className="size-3 text-ink-3" strokeWidth={1.5} aria-hidden /></button>
    {at && <ReassignPopover at={at} marketId={marketId} pagePath={pagePath} meId={meId} onClose={() => setAt(null)} onDone={(r) => { setAt(null); onReassigned(r); }} />}
  </>;
}

function ReassignPopover({ at, marketId, pagePath, meId, onClose, onDone }: { at: { top: number; right: number }; marketId: string; pagePath: string; meId: string; onClose: () => void; onDone: (r: { assignee: string; assigneeName: string }) => void }) {
  const { list, err: loadErr } = useReviewers(marketId, pagePath); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);
  const auto = list ? autoPick(list, meId) : undefined;
  async function go(body: { assignee?: string; auto?: boolean }) { setBusy(true); setErr(null); try { onDone(await ucpApi.reassignReview(marketId, pagePath, body)); } catch (e) { setErr(errorText(e)); setBusy(false); } }
  return <>
    <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
    <div role="dialog" aria-label="Change reviewer" className="fixed z-50 w-[320px] bg-surface border border-line rounded-xl shadow-2xl p-3 text-sm flex flex-col gap-2" style={{ top: at.top, right: at.right }}>
      <b className="text-sm">Change reviewer</b>
      <button type="button" disabled={busy || !auto} onClick={() => void go({ auto: true })} className="text-left border border-line rounded-lg px-3 py-2 hover:bg-surface-2 disabled:opacity-50"><b className="block font-medium">Assign automatically</b><span className="text-xs text-ink-3">{auto ? `${auto.name} (${auto.activeReviews} open)` : list === null ? "Finding a reviewer…" : "Nobody can review this page"}</span></button>
      {list === null ? <span className="text-xs text-ink-3">Loading reviewers…</span> : <div className="border border-line rounded-lg divide-y divide-line max-h-60 overflow-auto">{list.map((r) => <button key={r.id} type="button" disabled={busy} onClick={() => void go({ assignee: r.id })} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-50">
        <Avatar name={r.name} size={24} /><span className="min-w-0 flex-1"><b className="block text-sm font-medium truncate">{r.name}</b><span className="block text-xs text-ink-3 truncate">{r.team || "—"}</span></span><span className="text-xs text-ink-3 whitespace-nowrap">{openTxt(r.activeReviews)}</span></button>)}</div>}
      <Err err={err ?? loadErr} />
    </div>
  </>;
}
