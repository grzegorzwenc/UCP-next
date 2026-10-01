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
  const [picked, setPicked] = useState<string[] | null>(null); // files to publish with the pages (null = every unpublished one)
  const [step, setStep] = useState<1 | 2>(1); // 1 = images and files, 2 = when
  useEffect(() => { let on = true; ucpApi.publishFiles(marketId, ready.map((p) => p.path)).then((f) => on && setFiles(f), () => on && setFiles([])); return () => { on = false; }; }, [marketId, ready]);
  const draftFiles = (files ?? []).filter((f) => f.status === "draft");
  const chosen = picked ?? draftFiles.map((f) => f.id); const left = draftFiles.filter((f) => !chosen.includes(f.id));
  const toggle = (id: string) => setPicked(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
  const hasFiles = !!files?.length; const onFiles = step === 1 && files !== null && hasFiles && !results; // no files → straight to "when"

  const run = async (cancel = false) => {
    if (!cancel && (whenErr || !ready.length)) return; setBusy(true); setErr(null);
    try {
      const r = await ucpApi.publish(marketId, cancel ? [single!.path] : ready.map((p) => p.path), cancel ? { cancel: true } : { at: at?.toISOString(), assets: chosen });
      const m = cancel ? "cancel" : mode; const live = r.filter((x) => x.ok); if (m === "now" && live.length) celebrate(live.map((x) => x.title), envName); // fanfare 🎉
      if (r.every((x) => x.ok) && ready.length === pages.length) { onDone(r, m); return; }
      setResults([...r, ...pages.filter((p) => !ready.includes(p) && !cancel).map((p) => ({ path: p.path, title: p.title, ok: false, reason: publishBlock(p, mayPublish) }))]); onDone(r, m);
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  if (results) return <ModalShell title="Publishing results" width={560} onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
    <ul className="grid gap-1.5">{results.map((r) => <li key={r.path} className="flex items-center gap-2 text-[13px] border border-line rounded-md px-3 py-2"><span className={r.ok ? "text-good" : "text-warn"} aria-hidden>{r.ok ? "✓" : "!"}</span><span className="truncate flex-1">{r.title}</span>{r.ok ? <Pill status={r.status ?? "published"} /> : <span className="text-[12px] text-ink-3">{r.reason}</span>}</li>)}</ul>
  </ModalShell>;

  const title = single ? `Publish “${single.title}”` : `Publish ${pages.length} pages`;
  const steps = hasFiles && <ol className="flex items-center gap-2 text-[12px] mb-3" aria-label="Steps">{[["1", "Images and files"], ["2", "When to publish"]].map(([n, l], i) => { const on = (i === 0) === onFiles; const done = i === 0 && !onFiles;
    return <li key={n} className="flex items-center gap-2">{i > 0 && <span aria-hidden className="w-6 h-px bg-line-2" />}<span className={`w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold ${done ? "bg-good text-white" : on ? "bg-accent text-white" : "bg-surface-3 text-ink-3"}`}>{done ? "✓" : n}</span><span className={on ? "font-semibold text-ink" : "text-ink-3"} aria-current={on ? "step" : undefined}>{l}</span></li>; })}</ol>;
  return <ModalShell title={title} subtitle={`Goes live on ${envName}.`} width={560} onClose={onClose}
    footer={onFiles ? <><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => setStep(2)}>Choose when to publish</button></> : <>{single?.status === "scheduled" && <button className="btn mr-auto text-crit" disabled={busy} onClick={() => run(true)}>Cancel schedule</button>}{hasFiles ? <button className="btn" onClick={() => setStep(1)}>Back</button> : <button className="btn" onClick={onClose}>Cancel</button>}
      <button className="btn btn-primary" disabled={busy || !ready.length || !!whenErr || files === null} onClick={() => run()}>{busy ? "Working…" : mode === "now" ? `Publish now${pages.length > 1 ? ` (${ready.length})` : ""}` : `Schedule${pages.length > 1 ? ` (${ready.length})` : ""}`}</button></>}>
    {single?.status === "scheduled" && single.publishAt && <p className="text-[13px] bg-info-soft rounded-md px-3 py-2 mb-3">Scheduled for <b>{fmt(single.publishAt)}</b>. Change the time, publish it now, or cancel the schedule.</p>}
    {pages.length > 1 && <div className="mb-3"><p className="text-[12.5px] text-ink-3 mb-1.5">{ready.length} of {pages.length} can be published{ready.length < pages.length ? ". The others are skipped:" : "."}</p>
      <ul className="grid gap-1 max-h-[180px] overflow-auto">{pages.map((p) => { const why = publishBlock(p, mayPublish); return <li key={p.path} className={`flex items-center gap-2 text-[13px] border rounded-md px-3 py-1.5 ${why ? "border-line bg-surface-2 text-ink-3" : "border-line"}`}><span className="truncate flex-1">{p.title}</span><Pill status={p.status} />{why && <span className="text-[11.5px] text-warn whitespace-nowrap">{why}</span>}</li>; })}</ul></div>}
    {single && publishBlock(single, mayPublish) && <p className="text-[13px] bg-warn-soft rounded-md px-3 py-2 mb-3">{publishBlock(single, mayPublish)}. Only pages that passed review (Ready to publish) can go live.</p>}
    {steps}
    {ready.length > 0 && files === null && <div className="mb-3 grid gap-2" aria-label="Checking the images and files">{[0, 1].map((k) => <div key={k} className="h-12 rounded-lg bg-surface-2 animate-pulse" />)}</div>}
    {onFiles && <section aria-label="Images and files" className="rounded-xl border border-line overflow-hidden">
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-surface-2 border-b border-line">
        <b className="text-[13px]">Images and files on {single ? "this page" : "these pages"}</b>
        <span className="ml-auto flex items-center gap-1.5 text-[11.5px]">{draftFiles.length > 0 && <span className="rounded-full bg-warn-soft text-warn font-semibold px-2 py-0.5">{draftFiles.length} not published</span>}{files!.length - draftFiles.length > 0 && <span className="rounded-full bg-good-soft text-good font-semibold px-2 py-0.5">{files!.length - draftFiles.length} live</span>}</span>
      </div>
      {draftFiles.length > 1 && <label className="flex items-center gap-2 px-3.5 py-2 border-b border-line text-[12.5px] cursor-pointer hover:bg-surface-2"><input type="checkbox" className="w-4 h-4 accent-[var(--accent)]" checked={!left.length} ref={(el) => { if (el) el.indeterminate = left.length > 0 && left.length < draftFiles.length; }} onChange={(e) => setPicked(e.target.checked ? draftFiles.map((f) => f.id) : [])} /><b>Publish all {draftFiles.length} unpublished files</b></label>}
      <ul className="divide-y divide-line max-h-[300px] overflow-auto">{[...files!].sort((a, b) => Number(a.status === "published") - Number(b.status === "published")).map((f) => { const live = f.status === "published"; const on = live || chosen.includes(f.id);
        return <li key={f.id}><label className={`flex items-center gap-3 px-3.5 py-2.5 ${live ? "cursor-default" : "cursor-pointer hover:bg-surface-2"} ${!live && !on ? "bg-warn-soft/25" : ""}`}>
          <input type="checkbox" className="w-4 h-4 flex-none accent-[var(--accent)]" checked={on} disabled={live} onChange={() => toggle(f.id)} aria-label={live ? `${f.name} is already live` : `Publish ${f.name}`} />
          <span className={`flex-none w-10 h-10 rounded-md overflow-hidden grid place-items-center ${f.type === "pdf" ? "bg-[#FDECEE] text-accent" : "bg-[linear-gradient(135deg,#dfe3ea,#b8bfcc)] text-white"}`}>
            {f.thumb ? <img src={f.thumb} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement("span"), { textContent: "IMG", className: "text-[10px] font-bold" })); }} /> : f.type === "pdf" ? <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h4" /></svg> : <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v14H4z" /><path d="M4 15l4.5-4.5 4 4 2.5-2.5L20 17" /></svg>}
          </span>
          <span className="min-w-0 flex-1"><b className="block text-[13px] font-semibold truncate">{f.name}</b><span className="block text-[11.5px] text-ink-3 truncate">{f.type === "image" ? "Image" : f.type.toUpperCase()}{f.size ? ` · ${f.size}` : ""}{f.folder ? ` · ${f.folder}` : ""}</span></span>
          {live ? <span className="flex-none text-right"><span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-good bg-good-soft rounded-full px-2 py-0.5"><i className="w-1.5 h-1.5 rounded-full bg-good" />Live</span>{f.publishedAt && <span className="block text-[10.5px] text-ink-4 mt-0.5">{fmt(f.publishedAt)}</span>}</span>
            : <span className={`flex-none inline-flex items-center gap-1 text-[11.5px] font-semibold rounded-full px-2 py-0.5 ${on ? "text-accent bg-accent-soft" : "text-warn bg-warn-soft"}`}><i className={`w-1.5 h-1.5 rounded-full ${on ? "bg-accent" : "bg-warn"}`} />{on ? "Publishes with the page" : "Not published"}</span>}
        </label></li>; })}</ul>
      {left.length > 0 && <p className="px-3.5 py-2.5 border-t border-line text-[12.5px] text-warn bg-warn-soft/40">{left.length === 1 ? `${left[0].name} stays unpublished, so` : `${left.length} files stay unpublished, so`} the {single ? "page cannot" : "pages that use them cannot"} go live yet.</p>}
    </section>}
    {!onFiles && files !== null && <>
    {hasFiles && <p className="mb-3 text-[12.5px] text-ink-2 bg-surface-2 rounded-md px-3 py-2">{single ? "The page" : `${ready.length} pages`}{chosen.length ? ` and ${chosen.length} file${chosen.length === 1 ? "" : "s"}` : ""} go live together.{left.length ? <span className="text-warn"> {left.length} file{left.length === 1 ? " stays" : "s stay"} unpublished · <button type="button" className="underline" onClick={() => setStep(1)}>change</button></span> : null}</p>}
    <div role="radiogroup" aria-label="When" className="grid gap-2">
      <label className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer ${mode === "now" ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"}`}><input type="radio" name="pub-when" className="mt-1 accent-[var(--accent)]" checked={mode === "now"} onChange={() => setMode("now")} /><span><b className="block text-[13.5px]">Publish now</b><small className="text-ink-3 text-[12.5px]">Live for customers straight away.</small></span></label>
      <label className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer ${mode === "schedule" ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"}`}><input type="radio" name="pub-when" className="mt-1 accent-[var(--accent)]" checked={mode === "schedule"} onChange={() => setMode("schedule")} /><span className="flex-1 min-w-0"><b className="block text-[13.5px]">Schedule</b><small className="text-ink-3 text-[12.5px]">Goes live automatically at the time you pick.</small>
        {mode === "schedule" && <span className="block mt-2"><input type="datetime-local" className="border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] bg-surface" value={when} min={toLocalInput(new Date(openedAt))} onChange={(e) => setWhen(e.target.value)} aria-invalid={!!whenErr} aria-label="Publish date and time" />
          <small className="block text-[11.5px] mt-1">{whenErr ? <span className="text-crit">{whenErr}</span> : <span className="text-ink-4">{at && !isNaN(at.getTime()) ? `${fmt(at.toISOString())} · ` : ""}your time zone ({tz})</span>}</small></span>}</span></label>
    </div></>}
    <Err err={err} />
  </ModalShell>;
}
