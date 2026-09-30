"use client";
import { useMemo, useState } from "react";
import { ModalShell, Err } from "@/components/models/ModalShell";
import { Pill } from "@/components/ui/Pill";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";

export type PublishItem = { path: string; title: string; status: string; publishAt?: string };
export type PublishOutcome = { path: string; title: string; ok: boolean; status?: string; reason?: string };

/** Why a page cannot be published right now (checked again on the server). */
export const publishBlock = (p: PublishItem, mayPublish: (path: string) => boolean): string =>
  !mayPublish(p.path) ? "You don't have Publish here" : p.status === "approved" || p.status === "scheduled" ? "" : p.status === "published" ? "Already live" : p.status === "review" ? "Still in author's review" : p.status === "reviewed" ? "Business review comes next" : p.status === "bizreview" ? "Still in business review" : "Needs review first";

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmt = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
/** Tomorrow 09:00 in the browser's time zone. */
const defaultWhen = () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return toLocalInput(d); };

/**
 * Publish one page or a batch: "Publish now" or "Schedule" for a date and time. Pages that cannot go live yet are listed
 * with the reason and skipped. A scheduled single page can also be moved or cancelled from here.
 */
export function PublishDialog({ marketId, envName, pages, mayPublish, onClose, onDone }: { marketId: string; envName: string; pages: PublishItem[]; mayPublish: (path: string) => boolean; onClose: () => void; onDone: (results: PublishOutcome[], mode: "now" | "schedule" | "cancel") => void }) {
  const single = pages.length === 1 ? pages[0] : undefined;
  const ready = useMemo(() => pages.filter((p) => !publishBlock(p, mayPublish)), [pages, mayPublish]);
  const [mode, setMode] = useState<"now" | "schedule">(single?.status === "scheduled" ? "schedule" : "now");
  const [when, setWhen] = useState(() => (single?.publishAt ? toLocalInput(new Date(single.publishAt)) : defaultWhen()));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<PublishOutcome[] | null>(null);
  const [openedAt] = useState(() => Date.now()); // "now" for validation, fixed while the dialog is open
  const at = mode === "schedule" ? new Date(when) : undefined;
  const whenErr = mode === "schedule" && (!when || isNaN(at!.getTime()) ? "Pick a date and time" : at!.getTime() < openedAt + 5 * 60_000 ? "Pick a time at least 5 minutes from now" : "");
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const run = async (cancel = false) => {
    if (!cancel && (whenErr || !ready.length)) return; setBusy(true); setErr(null);
    try {
      const r = await ucpApi.publish(marketId, cancel ? [single!.path] : ready.map((p) => p.path), cancel ? { cancel: true } : { at: at?.toISOString() });
      const m = cancel ? "cancel" : mode; if (r.every((x) => x.ok) && ready.length === pages.length) { onDone(r, m); return; }
      setResults([...r, ...pages.filter((p) => !ready.includes(p) && !cancel).map((p) => ({ path: p.path, title: p.title, ok: false, reason: publishBlock(p, mayPublish) }))]); onDone(r, m);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  if (results) return <ModalShell title="Publishing results" width={560} onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
    <ul className="grid gap-1.5">{results.map((r) => <li key={r.path} className="flex items-center gap-2 text-[13px] border border-line rounded-md px-3 py-2"><span className={r.ok ? "text-good" : "text-warn"} aria-hidden>{r.ok ? "✓" : "!"}</span><span className="truncate flex-1">{r.title}</span>{r.ok ? <Pill status={r.status ?? "published"} /> : <span className="text-[12px] text-ink-3">{r.reason}</span>}</li>)}</ul>
  </ModalShell>;

  const title = single ? `Publish “${single.title}”` : `Publish ${pages.length} pages`;
  return <ModalShell title={title} subtitle={`Goes live on ${envName}. You can publish now or pick a date and time.`} width={560} onClose={onClose}
    footer={<>{single?.status === "scheduled" && <button className="btn mr-auto text-crit" disabled={busy} onClick={() => run(true)}>Cancel schedule</button>}<button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={busy || !ready.length || !!whenErr} onClick={() => run()}>{busy ? "Working…" : mode === "now" ? `Publish now${pages.length > 1 ? ` (${ready.length})` : ""}` : `Schedule${pages.length > 1 ? ` (${ready.length})` : ""}`}</button></>}>
    {single?.status === "scheduled" && single.publishAt && <p className="text-[13px] bg-info-soft rounded-md px-3 py-2 mb-3">Scheduled for <b>{fmt(single.publishAt)}</b>. Change the time, publish it now, or cancel the schedule.</p>}
    {pages.length > 1 && <div className="mb-3"><p className="text-[12.5px] text-ink-3 mb-1.5">{ready.length} of {pages.length} can be published{ready.length < pages.length ? ". The others are skipped:" : "."}</p>
      <ul className="grid gap-1 max-h-[180px] overflow-auto">{pages.map((p) => { const why = publishBlock(p, mayPublish); return <li key={p.path} className={`flex items-center gap-2 text-[13px] border rounded-md px-3 py-1.5 ${why ? "border-line bg-surface-2 text-ink-3" : "border-line"}`}><span className="truncate flex-1">{p.title}</span><Pill status={p.status} />{why && <span className="text-[11.5px] text-warn whitespace-nowrap">{why}</span>}</li>; })}</ul></div>}
    {single && publishBlock(single, mayPublish) && <p className="text-[13px] bg-warn-soft rounded-md px-3 py-2 mb-3">{publishBlock(single, mayPublish)}. Only pages that passed review (Ready to publish) can go live.</p>}
    <div role="radiogroup" aria-label="When" className="grid gap-2">
      <label className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer ${mode === "now" ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"}`}><input type="radio" name="pub-when" className="mt-1 accent-[var(--accent)]" checked={mode === "now"} onChange={() => setMode("now")} /><span><b className="block text-[13.5px]">Publish now</b><small className="text-ink-3 text-[12.5px]">Live for customers straight away.</small></span></label>
      <label className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer ${mode === "schedule" ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"}`}><input type="radio" name="pub-when" className="mt-1 accent-[var(--accent)]" checked={mode === "schedule"} onChange={() => setMode("schedule")} /><span className="flex-1 min-w-0"><b className="block text-[13.5px]">Schedule</b><small className="text-ink-3 text-[12.5px]">Goes live automatically at the time you pick.</small>
        {mode === "schedule" && <span className="block mt-2"><input type="datetime-local" className="border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] bg-surface" value={when} min={toLocalInput(new Date(openedAt))} onChange={(e) => setWhen(e.target.value)} aria-invalid={!!whenErr} aria-label="Publish date and time" />
          <small className="block text-[11.5px] mt-1">{whenErr ? <span className="text-crit">{whenErr}</span> : <span className="text-ink-4">{at && !isNaN(at.getTime()) ? `${fmt(at.toISOString())} · ` : ""}your time zone ({tz})</span>}</small></span>}</span></label>
    </div>
    <Err err={err} />
  </ModalShell>;
}
