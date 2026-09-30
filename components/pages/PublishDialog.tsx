"use client";
import { celebrate } from "@/lib/ui/celebrate";
import { useEffect, useMemo, useState } from "react";
import { ModalShell, Err } from "@/components/models/ModalShell";
import { Pill } from "@/components/ui/Pill";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";

export type PublishItem = { path: string; title: string; status: string; publishAt?: string };
export type PublishOutcome = { path: string; title: string; ok: boolean; status?: string; reason?: string };

/** Why a page cannot be published right now (checked again on the server). */
export const publishBlock = (p: PublishItem, mayPublish: (path: string) => boolean): string =>
  !mayPublish(p.path) ? "You don't have Publish here" : p.status === "approved" || p.status === "scheduled" ? "" : p.status === "published" ? "Already live" : p.status === "review" || p.status === "inreview" ? "Still in author's review" : p.status === "reviewed" ? "Business review comes next" : p.status === "bizreview" ? "Still in business review" : "Needs review first";

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
  /* the files these pages use (images, PDFs): ones not live yet go out with the pages, or the pages cannot go live */
  const [files, setFiles] = useState<{ id: string; name: string; type: string; status: "draft" | "published"; publishedAt?: string; size?: string; folder?: string; thumb?: string }[] | null>(null);
  const [withFiles, setWithFiles] = useState(true);
  useEffect(() => { let on = true; ucpApi.publishFiles(marketId, ready.map((p) => p.path)).then((f) => on && setFiles(f), () => on && setFiles([])); return () => { on = false; }; }, [marketId, ready]);
  const draftFiles = (files ?? []).filter((f) => f.status === "draft");

  const run = async (cancel = false) => {
    if (!cancel && (whenErr || !ready.length)) return; setBusy(true); setErr(null);
    try {
      const r = await ucpApi.publish(marketId, cancel ? [single!.path] : ready.map((p) => p.path), cancel ? { cancel: true } : { at: at?.toISOString(), assets: withFiles ? draftFiles.map((f) => f.id) : [] });
      const m = cancel ? "cancel" : mode; const live = r.filter((x) => x.ok); if (m === "now" && live.length) celebrate(live.map((x) => x.title), envName); // fanfare 🎉
      if (r.every((x) => x.ok) && ready.length === pages.length) { onDone(r, m); return; }
      setResults([...r, ...pages.filter((p) => !ready.includes(p) && !cancel).map((p) => ({ path: p.path, title: p.title, ok: false, reason: publishBlock(p, mayPublish) }))]); onDone(r, m);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  if (results) return <ModalShell title="Publishing results" width={560} onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
    <ul className="grid gap-1.5">{results.map((r) => <li key={r.path} className="flex items-center gap-2 text-[13px] border border-line rounded-md px-3 py-2"><span className={r.ok ? "text-good" : "text-warn"} aria-hidden>{r.ok ? "✓" : "!"}</span><span className="truncate flex-1">{r.title}</span>{r.ok ? <Pill status={r.status ?? "published"} /> : <span className="text-[12px] text-ink-3">{r.reason}</span>}</li>)}</ul>
  </ModalShell>;

  const title = single ? `Publish “${single.title}”` : `Publish ${pages.length} pages`;
  return <ModalShell title={title} subtitle={`Goes live on ${envName}.`} width={560} onClose={onClose}
    footer={<>{single?.status === "scheduled" && <button className="btn mr-auto text-crit" disabled={busy} onClick={() => run(true)}>Cancel schedule</button>}<button className="btn" onClick={onClose}>Cancel</button>
      <button className="btn btn-primary" disabled={busy || !ready.length || !!whenErr || files === null} onClick={() => run()}>{busy ? "Working…" : mode === "now" ? `Publish now${pages.length > 1 ? ` (${ready.length})` : ""}` : `Schedule${pages.length > 1 ? ` (${ready.length})` : ""}`}</button></>}>
    {single?.status === "scheduled" && single.publishAt && <p className="text-[13px] bg-info-soft rounded-md px-3 py-2 mb-3">Scheduled for <b>{fmt(single.publishAt)}</b>. Change the time, publish it now, or cancel the schedule.</p>}
    {pages.length > 1 && <div className="mb-3"><p className="text-[12.5px] text-ink-3 mb-1.5">{ready.length} of {pages.length} can be published{ready.length < pages.length ? ". The others are skipped:" : "."}</p>
      <ul className="grid gap-1 max-h-[180px] overflow-auto">{pages.map((p) => { const why = publishBlock(p, mayPublish); return <li key={p.path} className={`flex items-center gap-2 text-[13px] border rounded-md px-3 py-1.5 ${why ? "border-line bg-surface-2 text-ink-3" : "border-line"}`}><span className="truncate flex-1">{p.title}</span><Pill status={p.status} />{why && <span className="text-[11.5px] text-warn whitespace-nowrap">{why}</span>}</li>; })}</ul></div>}
    {single && publishBlock(single, mayPublish) && <p className="text-[13px] bg-warn-soft rounded-md px-3 py-2 mb-3">{publishBlock(single, mayPublish)}. Only pages that passed review (Ready to publish) can go live.</p>}
    {ready.length > 0 && <section aria-label="Files" className="mb-3 rounded-xl border border-line overflow-hidden">
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-surface-2 border-b border-line">
        <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3"><path d="M4 5h16v14H4z" /><path d="M4 15l4.5-4.5 4 4 2.5-2.5L20 17" /></svg>
        <b className="text-[13px]">Images and files</b>
        <span className="ml-auto flex items-center gap-1.5 text-[11.5px]">{files === null ? <span className="text-ink-3">Checking…</span> : !files.length ? <span className="text-ink-3">None</span> : <>
          {draftFiles.length > 0 && <span className="rounded-full bg-warn-soft text-warn font-semibold px-2 py-0.5">{draftFiles.length} to publish</span>}
          {files.length - draftFiles.length > 0 && <span className="rounded-full bg-good-soft text-good font-semibold px-2 py-0.5">{files.length - draftFiles.length} live</span>}</>}</span>
      </div>
      {files === null ? <div className="px-3.5 py-3 grid gap-2" aria-hidden>{[0, 1].map((k) => <div key={k} className="h-9 rounded-md bg-surface-2 animate-pulse" />)}</div>
        : !files.length ? <p className="px-3.5 py-3 text-[12.5px] text-ink-3">{single ? "This page uses" : "These pages use"} no images or files from Assets, so there is nothing else to publish.</p>
        : <ul className="divide-y divide-line">{[...files].sort((a, b) => Number(a.status === "published") - Number(b.status === "published")).map((f) => { const live = f.status === "published";
          return <li key={f.id} className={`flex items-center gap-3 px-3.5 py-2.5 ${live ? "" : "bg-warn-soft/25 shadow-[inset_3px_0_0_var(--warn)]"}`}>
            <span className={`flex-none w-10 h-10 rounded-md overflow-hidden grid place-items-center ${f.type === "pdf" ? "bg-[#FDECEE] text-accent" : "bg-[linear-gradient(135deg,#dfe3ea,#b8bfcc)] text-white"}`}>
              {f.thumb ? <img src={f.thumb} alt="" className="w-full h-full object-cover" /> : f.type === "pdf" ? <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h4" /></svg> : <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v14H4z" /><path d="M4 15l4.5-4.5 4 4 2.5-2.5L20 17" /></svg>}
            </span>
            <span className="min-w-0 flex-1"><b className="block text-[13px] font-semibold truncate">{f.name}</b><span className="block text-[11.5px] text-ink-3 truncate">{f.type === "image" ? "Image" : f.type.toUpperCase()}{f.size ? ` · ${f.size}` : ""}{f.folder ? ` · ${f.folder}` : ""}</span></span>
            {live ? <span className="flex-none text-right"><span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-good bg-good-soft rounded-full px-2 py-0.5"><i className="w-1.5 h-1.5 rounded-full bg-good" />Live</span>{f.publishedAt && <span className="block text-[10.5px] text-ink-4 mt-0.5">{fmt(f.publishedAt)}</span>}</span>
              : <span className="flex-none inline-flex items-center gap-1 text-[11.5px] font-semibold text-warn bg-warn-soft rounded-full px-2 py-0.5"><i className="w-1.5 h-1.5 rounded-full bg-warn" />Not published</span>}
          </li>; })}</ul>}
      {draftFiles.length > 0 && <label className={`flex items-start gap-3 px-3.5 py-3 border-t border-line cursor-pointer ${withFiles ? "bg-accent-soft/40" : "bg-surface"}`}>
        <span className="relative mt-0.5 flex-none"><input type="checkbox" className="peer sr-only" checked={withFiles} onChange={(e) => setWithFiles(e.target.checked)} /><span className={`block w-9 h-5 rounded-full transition-colors ${withFiles ? "bg-accent" : "bg-line-2"}`} /><span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${withFiles ? "translate-x-4" : ""}`} /></span>
        <span className="text-[12.5px]"><b className="block text-[13px]">Publish {draftFiles.length === 1 ? "the file" : `the ${draftFiles.length} files`} with the page</b>
          <span className={withFiles ? "text-ink-3" : "text-warn"}>{withFiles ? `${draftFiles.length === 1 ? "It goes" : "They go"} live at the same time, so nothing on the page is missing.` : `Without ${draftFiles.length === 1 ? "it" : "them"} the ${single ? "page stays" : "pages that use them stay"} unpublished.`}</span></span>
      </label>}
    </section>}
    <div role="radiogroup" aria-label="When" className="grid gap-2">
      <label className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer ${mode === "now" ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"}`}><input type="radio" name="pub-when" className="mt-1 accent-[var(--accent)]" checked={mode === "now"} onChange={() => setMode("now")} /><span><b className="block text-[13.5px]">Publish now</b><small className="text-ink-3 text-[12.5px]">Live for customers straight away.</small></span></label>
      <label className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer ${mode === "schedule" ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"}`}><input type="radio" name="pub-when" className="mt-1 accent-[var(--accent)]" checked={mode === "schedule"} onChange={() => setMode("schedule")} /><span className="flex-1 min-w-0"><b className="block text-[13.5px]">Schedule</b><small className="text-ink-3 text-[12.5px]">Goes live automatically at the time you pick.</small>
        {mode === "schedule" && <span className="block mt-2"><input type="datetime-local" className="border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] bg-surface" value={when} min={toLocalInput(new Date(openedAt))} onChange={(e) => setWhen(e.target.value)} aria-invalid={!!whenErr} aria-label="Publish date and time" />
          <small className="block text-[11.5px] mt-1">{whenErr ? <span className="text-crit">{whenErr}</span> : <span className="text-ink-4">{at && !isNaN(at.getTime()) ? `${fmt(at.toISOString())} · ` : ""}your time zone ({tz})</span>}</small></span>}</span></label>
    </div>
    <Err err={err} />
  </ModalShell>;
}
