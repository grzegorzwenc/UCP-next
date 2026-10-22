"use client";
import { useState } from "react";
import type { Asset, AssetA11y } from "@/lib/ucp/types";
import { a11yGaps } from "@/lib/ucp/schema";

const inp = "mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink bg-surface disabled:bg-surface-2";
const LANG: Record<string, string> = { "en-GB": "English (UK)", "cy-GB": "Welsh", "en-HK": "English (Hong Kong)", "zh-HK": "Chinese (Hong Kong)", "fr-FR": "French", "de-DE": "German" };
const ALT_MAX = 150;

/** Hints for alt text that screen reader users find unhelpful. */
function altHint(s: string, fileName: string): string {
  const t = s.trim().toLowerCase(); if (!t) return "";
  if (/^(image|picture|photo|graphic|icon) (of|showing)\b/.test(t)) return "No need to start with “image of”. Screen readers already say it is an image.";
  if (t === fileName.toLowerCase() || /\.(jpe?g|png|gif|svg|webp)$/.test(t)) return "Describe what the image shows, not the file name.";
  if (s.length > ALT_MAX) return `Keep it under ${ALT_MAX} characters. Use the long description for detail.`;
  return "";
}

/**
 * Accessibility for one asset. Images and icons: decorative switch or alt text per locale, long description, caption.
 * Documents: title, language, tagged-PDF check and a short text summary. Saved on the asset (ucp:a11y), so every page that uses it gets the same text.
 */
export function A11yPanel({ asset, locales, canEdit, busy, onSave }: { asset: Asset; locales: string[]; canEdit: boolean; busy: boolean; onSave: (v: AssetA11y) => void }) {
  const [v, setV] = useState<AssetA11y>(() => asset.a11y ?? {});
  const set = (p: Partial<AssetA11y>) => setV((x) => ({ ...x, ...p }));
  const dirty = JSON.stringify(v) !== JSON.stringify(asset.a11y ?? {});
  const gaps = a11yGaps({ type: asset.type, a11y: v }, locales[0]);
  const image = asset.type === "image" || asset.type === "svg";
  const lbl = "block text-[12.5px] font-semibold mt-3";

  return <section aria-labelledby="a11y-h" className="mt-4 border-t border-line pt-3">
    <div className="flex items-center gap-2"><h3 id="a11y-h" className="text-[13px] font-semibold">Accessibility</h3>
      {gaps.length ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-warn-soft text-warn">Missing: {gaps.join(", ")}</span> : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-good-soft text-good">Complete</span>}</div>
    <fieldset disabled={!canEdit || busy} className="min-w-0">
      {image ? <>
        <label className="flex items-start gap-2 text-[13px] mt-2.5"><input type="checkbox" className="mt-0.5 accent-[var(--brand)]" checked={!!v.decorative} onChange={(e) => set({ decorative: e.target.checked })} /><span>Decorative only<small className="block text-[11.5px] text-ink-3">Screen readers skip it. Use this when the image adds nothing to the text.</small></span></label>
        {!v.decorative && <>
          {locales.map((l, i) => { const val = v.alt?.[l] ?? ""; const hint = altHint(val, asset.name); return <label key={l} className={lbl}>Alt text{locales.length > 1 && <span className="font-normal text-ink-3"> · {LANG[l] ?? l}{i === 0 ? " (required)" : ""}</span>}
            <textarea rows={2} className={inp} value={val} maxLength={300} placeholder={i === 0 ? "What does the image show? e.g. Couple reviewing savings on a laptop" : "Translation of the alt text"} onChange={(e) => set({ alt: { ...(v.alt ?? {}), [l]: e.target.value } })} aria-invalid={i === 0 && !val.trim()} />
            <span className="flex text-[11px] font-normal mt-0.5"><span className={hint ? "text-warn" : "text-ink-4"}>{hint || (i === 0 ? "Short and specific. Shown to screen readers and when the image fails to load." : "")}</span><span className={`ml-auto font-mono ${val.length > ALT_MAX ? "text-crit" : "text-ink-4"}`}>{val.length}/{ALT_MAX}</span></span></label>; })}
          <label className={lbl}>Long description <span className="font-normal text-ink-3">optional</span><textarea rows={3} className={inp} value={v.longDescription ?? ""} placeholder="For charts, maps and infographics: the full information the image carries." onChange={(e) => set({ longDescription: e.target.value })} /></label>
        </>}
        <label className={lbl}>Caption <span className="font-normal text-ink-3">optional, shown under the image</span><input className={inp} value={v.caption ?? ""} onChange={(e) => set({ caption: e.target.value })} /></label>
      </> : <>
        <label className={lbl}>Document title<input className={inp} value={v.title ?? ""} placeholder="e.g. Savings account terms and conditions" onChange={(e) => set({ title: e.target.value })} /><small className="block text-[11px] font-normal text-ink-4 mt-0.5">Read out instead of the file name.</small></label>
        <label className={lbl}>Language<select className={inp} value={v.lang ?? ""} onChange={(e) => set({ lang: e.target.value || undefined })}><option value="">Choose…</option>{[...new Set([...locales, ...Object.keys(LANG)])].map((l) => <option key={l} value={l}>{LANG[l] ?? l}</option>)}</select></label>
        <label className="flex items-start gap-2 text-[13px] mt-3"><input type="checkbox" className="mt-0.5 accent-[var(--brand)]" checked={!!v.tagged} onChange={(e) => set({ tagged: e.target.checked })} /><span>Tagged PDF, checked for accessibility<small className="block text-[11.5px] text-ink-3">Headings, reading order and alt text inside the file were checked (e.g. with PAC or Acrobat).</small></span></label>
        <label className={lbl}>Summary <span className="font-normal text-ink-3">optional</span><textarea rows={3} className={inp} value={v.summary ?? ""} placeholder="What the document is about, for people who cannot open it." onChange={(e) => set({ summary: e.target.value })} /></label>
      </>}
    </fieldset>
    {canEdit && <div className="flex items-center gap-2 mt-3"><button className="btn btn-sm btn-primary" disabled={!dirty || busy} onClick={() => onSave(v)}>{busy ? "Saving…" : "Save accessibility"}</button>{dirty && <button className="btn btn-sm btn-quiet" disabled={busy} onClick={() => setV(asset.a11y ?? {})}>Discard</button>}</div>}
    {asset.a11y?.checkedBy && <p className="text-[11.5px] text-ink-4 mt-2">Last updated by {asset.a11y.checkedBy}{asset.a11y.checkedAt ? ` · ${new Date(asset.a11y.checkedAt).toLocaleDateString("en-GB", { timeZone: "Europe/London" })}` : ""}</p>}
  </section>;
}
