"use client";
import { useState } from "react";
import { ModalShell, Err, inputCls } from "@/components/models/ModalShell";
import { errorText } from "@/lib/api/errors";

/** Small "name this" dialog: new folder, rename folder. Enter submits, Escape closes. */
export function NameDialog({ title, subtitle, label = "Name", initial = "", action, onClose, onSubmit, where, preview, placeholder, children }: { title: string; subtitle?: React.ReactNode; label?: string; initial?: string; action: string; onClose: () => void; onSubmit: (name: string) => Promise<void>;
  /** The destination, shown under the name field -- the pages folder dialog's "Where" row. */
  where?: React.ReactNode;
  /** Where the thing will land, shown under the field as the pages folder dialog does. */
  preview?: (name: string) => React.ReactNode; placeholder?: string; children?: React.ReactNode }) {
  const [name, setName] = useState(initial); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const ok = !!name.trim() && name.trim() !== initial;
  const submit = async () => { if (!ok || busy) return; setBusy(true); setErr(null); try { await onSubmit(name.trim()); } catch (e) { setErr(errorText(e)); setBusy(false); } };
  return <ModalShell title={title} subtitle={subtitle} width={460} onClose={onClose}
    footer={<><button className="btn btn-sm btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-sm btn-primary" disabled={!ok || busy} onClick={submit}>{busy ? "Saving…" : action}</button></>}>
    {children}
    <label className="block text-sm font-medium">{label}<input className={inputCls} value={name} autoFocus maxLength={60} placeholder={placeholder} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} /></label>
    {where && <div className="mt-3 text-sm font-medium">Where<span className="mt-1 block font-normal">{where}</span></div>}
    {preview && <div className="mt-2 text-xs text-ink-3">{preview(name.trim())}</div>}
    <Err err={err} />
  </ModalShell>;
}
