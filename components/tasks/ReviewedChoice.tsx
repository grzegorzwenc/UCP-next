"use client";
import { useState } from "react";
import { ModalShell } from "@/components/models/ModalShell";

/**
 * "Reviewed" at the end of the author's review: the reviewer decides what happens next.
 * Send to business review → Waiting for business review assignment; Reauthor → back to Build the page (both reviews start over).
 */
export function ReviewedChoice({ title, onBehalf, onSend, onReauthor, onClose }: { title: string; onBehalf?: string; onSend: () => Promise<void> | void; onReauthor: () => Promise<void> | void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const go = async (fn: () => Promise<void> | void) => { setBusy(true); try { await fn(); onClose(); } finally { setBusy(false); } };
  const opt = "w-full text-left border rounded-lg p-3.5 flex items-start gap-3 disabled:opacity-50 transition-colors";
  return <ModalShell title="Author's review done · what next?" subtitle={<><b className="text-ink-2">{title}</b>{onBehalf ? <> · on behalf of {onBehalf}</> : null}</>} width={500} onClose={() => { if (!busy) onClose(); }}
    footer={<button className="btn" onClick={onClose} disabled={busy}>Cancel</button>}>
    <div className="grid gap-2.5">
      <button type="button" disabled={busy} onClick={() => void go(onSend)} className={`${opt} border-brand/50 bg-brand-soft/40 hover:bg-brand-soft`}>
        <span aria-hidden className="mt-0.5 grid place-items-center w-7 h-7 rounded-full bg-brand text-white flex-none"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
        <span><b className="block text-[14px]">Send to business review</b><span className="block text-[12.5px] text-ink-3 mt-0.5">The page is fine. It waits for a business reviewer to take it (Waiting for business review assignment).</span></span>
      </button>
      <button type="button" disabled={busy} onClick={() => void go(onReauthor)} className={`${opt} border-line hover:bg-surface-2`}>
        <span aria-hidden className="mt-0.5 grid place-items-center w-7 h-7 rounded-full border border-line-2 text-ink-2 flex-none"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg></span>
        <span><b className="block text-[14px]">Reauthor</b><span className="block text-[12.5px] text-ink-3 mt-0.5">Something needs changing. The page goes back to the author at Build the page, and the review starts again.</span></span>
      </button>
    </div>
  </ModalShell>;
}
