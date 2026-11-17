"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset } from "@/lib/ucp/types";
import { ucpApi, ApiError } from "@/lib/api";
import { ModalShell } from "@/components/models/ModalShell";

const errText = (e: unknown) => (e instanceof ApiError ? `${e.problem.title} · request ${e.requestId ?? "n/a"}` : e instanceof Error ? e.message : "Something went wrong");

function Thumb({ a, className = "" }: { a?: Asset; className?: string }) {
  return a?.data
    ? <div className={`bg-surface-3 bg-cover bg-center ${className}`} style={{ backgroundImage: `url(${a.data})` }} role="img" aria-label={a.name} />
    : <div className={`bg-surface-3 grid place-items-center text-ink-4 text-xs font-medium tracking-[.1em] ${className}`}>{a ? a.type.toUpperCase() : "NONE"}</div>;
}

/** Field editor for `asset` props: shows the current picture and opens the library to pick or upload another. */
export function AssetPicker({ marketId, value, onChange, invalid }: { marketId: string; value: string; onChange: (id: string) => void; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [q, setQ] = useState(""); const [folder, setFolder] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const uplRef = useRef<HTMLInputElement>(null);
  const load = () => ucpApi.assets(marketId).then(setAssets).catch((e) => setErr(errText(e)));
  useEffect(() => { if (open && assets === null) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (value && assets === null) load(); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = assets?.find((a) => a.id === value);
  const folders = useMemo(() => Array.from(new Set((assets ?? []).filter((a) => a.type === "image" || a.type === "svg").map((a) => a.folder))), [assets]);
  const list = (assets ?? []).filter((a) => (a.type === "image" || a.type === "svg") && (!folder || a.folder === folder) && (!q || a.name.toLowerCase().includes(q.toLowerCase())));
  const upload = async (files: File[]) => { if (!files.length) return; setBusy(true); setErr(null); try { const out = await ucpApi.upload(marketId, "Uploads", files); setAssets((prev) => [...out, ...(prev ?? [])]); if (out[0]) { onChange(out[0].id); setOpen(false); } } catch (e) { setErr(errText(e)); } finally { setBusy(false); } };
  return <div>
    {/* Two rows, not one: a thumbnail, a filename, its size and folder, a Change button and a
        remove button do not fit across a 320px panel — the name truncated to a few characters
        and the metadata wrapped to three lines. The file identifies itself on top, the actions
        sit underneath at full width. */}
    <div className={`grid gap-2 border p-2 ${invalid ? "border-crit" : "border-line-2"}`}>
      <div className="flex items-center gap-2.5">
        <Thumb a={current} className="w-14 h-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs" title={current?.name ?? value}>{current ? current.name : value ? <span className="text-ink-3">{value}</span> : <span className="text-ink-3">No image chosen</span>}</div>
          {current && <div className="truncate text-xs text-ink-3">{current.size} · {current.folder}</div>}
        </div>
      </div>
      <div className="flex gap-1.5">
        <button className="btn btn-sm btn-secondary flex-1 justify-center" onClick={() => setOpen(true)}>{value ? "Change" : "Choose image"}</button>
        {value && <button className="btn btn-sm btn-secondary" onClick={() => onChange("")} aria-label="Remove image" title="Remove image"><svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>}
      </div>
    </div>
    {/* the shared dialog, so this matches every other one: BDL square panel, blurred backdrop, focus trap */}
    {open && <ModalShell title="Choose an image" width={720} onClose={() => setOpen(false)}
      footer={<button className="btn btn-sm btn-secondary" disabled={busy} onClick={() => uplRef.current?.click()}>{busy ? "Uploading…" : "Upload new"}</button>}>
      <input ref={uplRef} type="file" multiple accept="image/*,.svg" className="hidden" onChange={(e) => { upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      <div className="flex gap-2"><input className="bdl-field flex-1" placeholder="Find a file by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a file by name" /><span className="bdl-select w-[160px] flex-none"><select className="bdl-field" value={folder} onChange={(e) => setFolder(e.target.value)} aria-label="Folder"><option value="">All folders</option>{folders.map((f) => <option key={f} value={f}>{f}</option>)}</select></span></div>
      {err && <div className="mt-3 text-crit text-xs bg-crit-soft px-3 py-2 rounded">{err}</div>}
      <div className="mt-3 min-h-[200px]">
        {assets === null && !err ? <div className="p-10 text-center text-ink-3">Loading library…</div>
          : list.length ? <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">{list.map((a) => <button key={a.id} onClick={() => { onChange(a.id); setOpen(false); }} className={`text-left bg-surface border p-2 hover:border-ink-4 ${a.id === value ? "border-brand ring-2 ring-brand-soft" : "border-line"}`}><Thumb a={a} className="w-full h-[84px]" /><b className="block text-xs mt-1.5 truncate" title={a.name}>{a.name}</b><small className="text-ink-3 text-xs">{a.size} · {a.folder}</small></button>)}</div>
          : <div className="p-10 text-center text-ink-3 border border-dashed border-line-2">No images match. <button className="underline" onClick={() => uplRef.current?.click()}>Upload one</button>.</div>}
      </div>
    </ModalShell>}
  </div>;
}
