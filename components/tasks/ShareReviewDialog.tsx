"use client";
import { useEffect, useState } from "react";
import { ModalShell, Err } from "@/components/models/ModalShell";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";

const STAGE: Record<string, string> = { review: "author's review", bizreview: "business review" };
const abs = (u: string) => `${window.location.origin}${u}`;

/**
 * Share a page that is in review: a link to the review screen (preview + comments) to copy, or an e-mail invite.
 * An e-mail of a UCP user who may review the page also assigns them (the task appears in their My tasks); anyone else
 * can still comment through the link. E-mails open in the sender's own mail app — the prototype sends nothing itself.
 * Site admins can approve straight away (on behalf of the reviewer).
 */
export function ShareReviewDialog({ marketId, path, title, stage, onClose, onApprove }: { marketId: string; path: string; title: string; stage: "review" | "bizreview"; onClose: () => void; onApprove?: () => Promise<void> | void }) {
  const [url, setUrl] = useState<string | null>(null); const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState(""); const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { let live = true; ucpApi.reviewLink(marketId, path).then((r) => live && setUrl(abs(r.url)), (e) => live && setErr(errorText(e))); return () => { live = false; }; }, [marketId, path]);
  const copy = async () => { if (!url) return; try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setErr("Copy did not work · select the link and copy it by hand"); } };
  const invite = async () => {
    const to = email.trim(); if (!to || busy) return; setBusy(true); setErr(null);
    try {
      const r = await ucpApi.reviewLink(marketId, path, to); const link = abs(r.url);
      const subject = `Please review: ${title}`; const body = `Hi,\n\n${title} is ready for ${STAGE[stage]}. You can see the page and leave comments here:\n${link}\n\nThank you!`;
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      setSent(r.assigned ? `${r.assigned} is now assigned and sees it in My tasks.` : `${to} can comment through the link.`); setEmail("");
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  return <ModalShell title={`Share for ${STAGE[stage]}`} subtitle={<><b className="text-ink-2">{title}</b> · reviewers see the page and can leave comments, which show up in the page builder</>} width={540} onClose={onClose}
    footer={<>{onApprove && <button className="btn mr-auto" disabled={busy} onClick={async () => { onClose(); await onApprove(); /* the next stage opens its own share dialog */ }} title="Site admin: approve on behalf of the reviewer">{stage === "review" ? "Approve now" : "Sign off now"}</button>}<button className="btn btn-primary" onClick={onClose}>Done</button></>}>
    <label className="block text-[12.5px] font-semibold text-ink-2">Review link</label>
    <div className="mt-1 flex gap-2"><input readOnly value={url ?? "Creating the link…"} onFocus={(e) => e.currentTarget.select()} className="flex-1 min-w-0 border border-line-2 rounded-md px-2.5 py-1.5 text-[12.5px] font-mono bg-surface-2" aria-label="Review link" />
      <button className="btn btn-sm" disabled={!url} onClick={copy}>{copied ? "✓ Copied" : "Copy"}</button></div>
    <p className="text-[11.5px] text-ink-3 mt-1">Works until the {STAGE[stage]} is finished. Anyone with the link can see the page and comment.</p>
    <label className="block text-[12.5px] font-semibold text-ink-2 mt-4" htmlFor="rv-mail">Send by e-mail</label>
    <div className="mt-1 flex gap-2"><input id="rv-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void invite(); }} placeholder="name@hsbc.com" className="flex-1 min-w-0 border border-line-2 rounded-md px-2.5 py-1.5 text-[13px]" />
      <button className="btn btn-sm" disabled={!email.trim() || busy} onClick={invite}>Send e-mail</button></div>
    <p className="text-[11.5px] text-ink-3 mt-1">Opens your mail app with the link. A UCP reviewer&apos;s address also assigns them, so it appears in their My tasks.</p>
    {sent && <p role="status" className="text-[12.5px] bg-good-soft text-good rounded-md px-3 py-2 mt-3">✓ {sent}</p>}
    <Err err={err} />
  </ModalShell>;
}
