"use client";
import { useState } from "react";
import { ModalShell, Err, inputCls } from "@/components/models/ModalShell";
import { FolderIcon } from "@/components/ui/Icons";
import { errorText } from "@/lib/api/errors";

export type MoveTarget = { id: string; label: string; hint?: string };
/**
 * "Move to…" for tree items: pick the folder the item should appear in. Same result as dragging it in the tree,
 * but reachable from the keyboard and on touch screens. `allowNew` adds a "New category" option (content models).
 */
export function MoveDialog({ title, what, current, targets, allowNew, note, onClose, onMove }: { title: string; what: string; current: string; targets: MoveTarget[]; allowNew?: boolean; note?: (target: string) => React.ReactNode; onClose: () => void; onMove: (target: string) => Promise<void> }) {
  const [pick, setPick] = useState(current); const [fresh, setFresh] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const target = pick === "__new" ? fresh.trim() : pick;
  const submit = async () => { if (!target || target === current) return; setBusy(true); setErr(null); try { await onMove(target); } catch (e) { setErr(errorText(e)); setBusy(false); } };
  return <ModalShell title={title} subtitle={<>Choose where <b>{what}</b> should appear in the tree.</>} width={460} onClose={onClose}
    footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !target || target === current} onClick={submit}>{busy ? "Moving…" : "Move here"}</button></>}>
    <div role="radiogroup" aria-label="Destination folder" className="grid gap-1">
      {targets.map((t) => <label key={t.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer text-sm ${pick === t.id ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2"}`}>
        <input type="radio" name="move-target" className="accent-[var(--brand)]" checked={pick === t.id} onChange={() => setPick(t.id)} /><FolderIcon /><span className="flex-1 min-w-0 truncate">{t.label}</span>
        {t.id === current ? <small className="text-ink-4">current</small> : t.hint && <small className="text-ink-4">{t.hint}</small>}</label>)}
      {allowNew && <label className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer text-sm ${pick === "__new" ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2"}`}>
        <input type="radio" name="move-target" className="accent-[var(--brand)]" checked={pick === "__new"} onChange={() => setPick("__new")} /><span className="text-ink-3">＋</span>
        <input className={`${inputCls} mt-0`} placeholder="New category name" value={fresh} onFocus={() => setPick("__new")} onChange={(e) => setFresh(e.target.value)} aria-label="New category name" /></label>}
    </div>
    {target && target !== current && note?.(target)}
    <Err err={err} />
  </ModalShell>;
}
