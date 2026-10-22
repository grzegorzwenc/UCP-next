"use client";
import { useState } from "react";
import { ModalShell, Err, inputCls } from "@/components/models/ModalShell";
import { errorText } from "@/lib/api/errors";

/** Small "name this" dialog: new folder, rename folder. Enter submits, Escape closes. */
export function NameDialog({ title, subtitle, label = "Name", initial = "", action, onClose, onSubmit, children }: { title: string; subtitle?: React.ReactNode; label?: string; initial?: string; action: string; onClose: () => void; onSubmit: (name: string) => Promise<void>; children?: React.ReactNode }) {
  const [name, setName] = useState(initial); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const ok = !!name.trim() && name.trim() !== initial;
  const submit = async () => { if (!ok || busy) return; setBusy(true); setErr(null); try { await onSubmit(name.trim()); } catch (e) { setErr(errorText(e)); setBusy(false); } };
  return <ModalShell title={title} subtitle={subtitle} width={440} onClose={onClose}
    footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!ok || busy} onClick={submit}>{busy ? "Saving…" : action}</button></>}>
    {children}
    <label className="block text-sm font-medium">{label}<input className={inputCls} value={name} autoFocus maxLength={60} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} /></label>
    <Err err={err} />
  </ModalShell>;
}
