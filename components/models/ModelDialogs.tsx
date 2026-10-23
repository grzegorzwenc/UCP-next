"use client";
import { useMemo, useState } from "react";
import type { Model, ModelField, ModelDiff } from "@/lib/ucp/types";
import { diffFields } from "@/lib/ucp/schema";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { Pill } from "@/components/ui/Pill";
import { ModalShell, Err, inputCls } from "./ModalShell";
import { FieldList, FieldPanel, TypeChip } from "./FieldEditor";
import { ICONS, DEFAULT_GROUPS, slugify, isBlockModel } from "./fieldMeta";

/* ---------------- model information (editor card + wizard step 1) ---------------- */
export type ModelMeta = { id: string; name: string; displayName: string; description: string; icon: string; group: string };
export const metaOf = (m: Model): ModelMeta => ({ id: m.id, name: m.name, displayName: m.displayName ?? "", description: m.description ?? "", icon: m.icon ?? "", group: m.group });
export function ModelInfoForm({ value, onChange, groups, status, idEditable, idError }: { value: ModelMeta; onChange: (v: ModelMeta) => void; groups: string[]; status?: Model["status"]; idEditable?: boolean; idError?: string }) {
  const set = (p: Partial<ModelMeta>) => onChange({ ...value, ...p });
  const allGroups = [...new Set([...groups, ...DEFAULT_GROUPS, value.group].filter((g) => g && g !== "Block types"))];
  const lbl = "text-xs text-ink-3 block";
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3">
    <label className={lbl}>Name<input className={inputCls} value={value.name} onChange={(e) => set(idEditable ? { name: e.target.value, id: slugify(e.target.value) } : { name: e.target.value })} placeholder="e.g. Branch" autoFocus={idEditable} /></label>
    <label className={lbl}>Display name <span className="text-ink-4">optional, shown to authors</span><input className={inputCls} value={value.displayName} onChange={(e) => set({ displayName: e.target.value })} placeholder={value.name || "Same as name"} /></label>
    <label className={`${lbl} col-span-2`}>Description<textarea rows={2} className={inputCls} value={value.description} onChange={(e) => set({ description: e.target.value })} placeholder="What this model is for and where it appears" /></label>
    <label className={lbl}>Model ID <span className="text-ink-4">{idEditable ? "used in the API, cannot change later" : "read-only"}</span>{idEditable ? <input className={`${inputCls} font-mono`} value={value.id} onChange={(e) => set({ id: slugify(e.target.value) })} spellCheck={false} aria-invalid={!!idError} /> : <div className={`${inputCls} font-mono bg-surface-3 text-ink-2`}>{value.id}</div>}{idError && <small className="block text-crit mt-1">{idError}</small>}{!idError && value.id && <small className="block text-ink-4 mt-1 font-mono">/v1/models/{value.id}</small>}</label>
    <label className={lbl}>Category<input className={inputCls} list="model-groups" value={value.group} onChange={(e) => set({ group: e.target.value })} placeholder="Core" /><datalist id="model-groups">{allGroups.map((g) => <option key={g} value={g} />)}</datalist></label>
    <div className={lbl}>Icon<div className="flex flex-wrap gap-1 mt-1" role="radiogroup" aria-label="Icon">{ICONS.map((i) => <button type="button" key={i} role="radio" aria-checked={value.icon === i} aria-label={`Icon ${i}`} onClick={() => set({ icon: value.icon === i ? "" : i })} className={`w-8 h-8 rounded-md border grid place-items-center text-base ${value.icon === i ? "border-brand bg-brand-soft text-brand" : "border-line-2 text-ink-2 hover:border-ink-4"}`}>{i}</button>)}</div></div>
    {status && <div className={lbl}>Status<div className="mt-1.5"><StatusPill status={status} /></div></div>}
  </div>;
}
export const StatusPill = ({ status }: { status: Model["status"] }) => (status === "modified" ? <Pill status="review" label="Modified" /> : <Pill status={status} label={status === "published" ? "Published" : "Draft"} />);

/* ---------------- schema diff (publish review, version compare) ---------------- */
const Sec = ({ title, items, tone }: { title: string; items: React.ReactNode[]; tone: string }) => (items.length ? <div><h4 className={`text-xs uppercase tracking-[.08em] font-medium mb-1.5 ${tone}`}>{title} · {items.length}</h4><ul className="grid gap-1 text-sm">{items}</ul></div> : null);
export function DiffView({ diff, compact }: { diff: ModelDiff; compact?: boolean }) {
  const validation = diff.changed.filter((c) => c.what.includes("validation"));
  const none = !diff.added.length && !diff.removed.length && !diff.changed.length;
  if (compact) return <span className="text-xs text-ink-2">{none ? "No schema changes" : [diff.added.length && `${diff.added.length} added`, diff.changed.length && `${diff.changed.length} modified`, diff.removed.length && `${diff.removed.length} removed`].filter(Boolean).join(" · ")}{diff.breaking.length ? <b className="text-crit"> · {diff.breaking.length} breaking</b> : null}</span>;
  const row = (f: ModelField, extra?: React.ReactNode) => <li key={f.k} className="flex items-start gap-2 flex-wrap"><b>{f.l}</b><span className="font-mono text-xs text-ink-3">{f.k}</span><TypeChip t={f.t} />{extra}</li>;
  return <div className="grid gap-4">
    {none && <div className="text-sm text-ink-3 border border-dashed border-line-2 rounded-lg p-4 text-center">No field changes since the published version. Publishing will only refresh the published version number.</div>}
    <Sec title="Fields added" tone="text-good" items={diff.added.map((f) => row(f))} />
    <Sec title="Fields modified" tone="text-review" items={diff.changed.map((c) => row(c.after, <span className="text-xs text-ink-2 w-full pl-0.5">{c.what.join(" · ")}</span>))} />
    <Sec title="Fields removed" tone="text-crit" items={diff.removed.map((f) => row(f))} />
    <Sec title="Validation changes" tone="text-warn" items={validation.map((c) => <li key={c.after.k} className="text-sm"><b>{c.after.l}</b> <span className="font-mono text-xs text-ink-3">{JSON.stringify(c.before.validation ?? {})} → {JSON.stringify(c.after.validation ?? {})}</span></li>)} />
  </div>;
}

/* ---------------- publish review ---------------- */
export function PublishModal({ model, fields, nextVersion, dirty, busy, onClose, onPublish }: { model: Model; fields: ModelField[]; nextVersion: number; dirty: boolean; busy: boolean; onClose: () => void; onPublish: () => Promise<void> }) {
  const diff = useMemo(() => diffFields(model.publishedFields ?? [], fields), [model.publishedFields, fields]);
  const [ack, setAck] = useState(false); const [err, setErr] = useState<string | null>(null);
  const go = async () => { setErr(null); try { await onPublish(); } catch (e) { setErr(errorText(e)); } };
  return <ModalShell title="Publish Content Model" subtitle={<><b className="text-ink">{model.name}</b> · v{model.publishedVersion ?? "—"} → v{nextVersion}{dirty && " · unsaved changes will be saved first"}</>} width={680} onClose={onClose}
    footer={<><button type="button" className="btn btn-sm btn-secondary" onClick={onClose} disabled={busy}>Cancel</button><button type="button" className="btn btn-sm btn-primary" disabled={busy || (diff.breaking.length > 0 && !ack)} onClick={go}>{busy ? "Publishing…" : `Publish v${nextVersion}`}</button></>}>
    <DiffView diff={diff} />
    {diff.breaking.length > 0 && <div className="mt-4 border border-crit/40 bg-crit-soft rounded-lg p-3.5"><h4 className="text-sm font-medium text-crit mb-1.5">Potential breaking changes</h4><ul className="grid gap-1 text-xs text-ink list-disc pl-4">{diff.breaking.map((b, i) => <li key={i}>{b}</li>)}</ul>
      <label className="flex items-center gap-2 mt-3 text-sm font-medium"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />I understand the impact on existing content and API clients</label></div>}
    <p className="text-xs text-ink-3 mt-4">Publishing makes this schema the one served at <span className="font-mono">/v1/models/{model.id}</span> and used to validate content. The draft stays editable afterwards.</p>
    <Err err={err} />
  </ModalShell>;
}

/* ---------------- unsaved changes guard ---------------- */
export function UnsavedModal({ busy, onStay, onDiscard, onSave, what = "this Content Model" }: { busy: boolean; onStay: () => void; onDiscard: () => void; onSave: () => void; what?: string }) {
  return <ModalShell title="Unsaved changes" width={460} onClose={onStay} footer={<><button type="button" className="btn btn-sm btn-secondary" onClick={onStay} disabled={busy}>Stay</button><button type="button" className="btn btn-sm btn-secondary" onClick={onDiscard} disabled={busy}>Discard changes</button><button type="button" className="btn btn-sm btn-primary" onClick={onSave} disabled={busy}>{busy ? "Saving…" : "Save"}</button></>}>
    <p className="text-sm text-ink-2">You have unsaved changes to {what}. Save them as a draft, discard them, or stay on this page.</p>
  </ModalShell>;
}

/* ---------------- create wizard ---------------- */
type Step = 0 | 1 | 2;
export function CreateWizard({ models, marketId, folders, onClose, onDone }: { models: Model[]; marketId: string; folders?: string[]; onClose: () => void; onDone: (m: Model, published: boolean) => void }) {
  const [step, setStep] = useState<Step>(0);
  const [meta, setMeta] = useState<ModelMeta>({ id: "", name: "", displayName: "", description: "", icon: "", group: "Core" });
  const [fields, setFields] = useState<ModelField[]>([]); const [panel, setPanel] = useState<{ index: number | null } | null>(null);
  const [busy, setBusy] = useState<"" | "draft" | "publish">(""); const [err, setErr] = useState<string | null>(null);
  const groups = [...new Set([...(folders ?? []), ...models.filter((m) => !isBlockModel(m)).map((m) => m.group)])];
  const idErr = !meta.name.trim() ? "" : !meta.id ? "The name must contain letters or digits" : models.some((m) => m.id === meta.id) ? "A model with this ID already exists" : "";
  const step1ok = !!meta.name.trim() && !!meta.id && !idErr;
  const STEPS = ["Model information", "Define fields", "Review"];
  async function create(publish: boolean) {
    setBusy(publish ? "publish" : "draft"); setErr(null);
    try { let m = await ucpApi.createModel(marketId, { id: meta.id, name: meta.name.trim(), displayName: meta.displayName.trim() || undefined, description: meta.description.trim() || undefined, icon: meta.icon || undefined, group: meta.group.trim() || "Core", fields });
      if (publish) m = await ucpApi.publishModel(marketId, m.id); onDone(m, publish); }
    catch (e) { setErr(errorText(e)); setBusy(""); }
  }
  const footer = <>
    <button type="button" className="btn btn-sm btn-secondary" onClick={onClose} disabled={!!busy}>Cancel</button>
    {step > 0 && <button type="button" className="btn btn-sm btn-secondary" onClick={() => setStep((step - 1) as Step)} disabled={!!busy}>Back</button>}
    {step < 2 ? <button type="button" className="btn btn-sm btn-primary" disabled={step === 0 && !step1ok} onClick={() => setStep((step + 1) as Step)}>{step === 0 ? "Next: define fields" : "Next: review"}</button>
      : <><button type="button" className="btn btn-sm btn-secondary" disabled={!!busy} onClick={() => create(true)}>{busy === "publish" ? "Publishing…" : "Save & publish"}</button><button type="button" className="btn btn-sm btn-primary" disabled={!!busy} onClick={() => create(false)}>{busy === "draft" ? "Saving…" : "Save as draft"}</button></>}
  </>;
  return <>
    <ModalShell title="New content model" subtitle={<span className="inline-flex gap-3">{STEPS.map((s, i) => <span key={s} className={`inline-flex items-center gap-1.5 ${i === step ? "text-ink font-medium" : i < step ? "text-good" : ""}`}><span className={`w-[18px] h-[18px] rounded-full grid place-items-center text-xs font-medium ${i === step ? "bg-brand text-white" : i < step ? "bg-good text-white" : "bg-surface-3 text-ink-3"}`}>{i < step ? "✓" : i + 1}</span>{s}</span>)}</span>} width={step === 1 ? 1040 : 720} onClose={onClose} footer={footer}>
      {step === 0 && <ModelInfoForm value={meta} onChange={setMeta} groups={groups} idEditable idError={idErr} />}
      {step === 1 && <div className="grid gap-2"><p className="text-xs text-ink-3">Fields can also be added later. Start with what the API and authors need on day one.</p><FieldList fields={fields} onChange={setFields} onEdit={(i) => setPanel({ index: i })} onAdd={() => setPanel({ index: null })} /></div>}
      {step === 2 && <div className="grid gap-4">
        <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-1.5 text-sm"><span className="text-ink-3">Name</span><b>{meta.icon && <span className="mr-1.5">{meta.icon}</span>}{meta.name}{meta.displayName && <span className="font-normal text-ink-3"> · shown as “{meta.displayName}”</span>}</b><span className="text-ink-3">Model ID</span><span className="font-mono text-sm">{meta.id}</span><span className="text-ink-3">Category</span><span>{meta.group || "Core"}</span><span className="text-ink-3">Description</span><span className="text-ink-2">{meta.description || <span className="text-ink-4">—</span>}</span><span className="text-ink-3">Status after save</span><span><StatusPill status="draft" /></span></div>
        <div><h4 className="text-xs uppercase tracking-[.08em] font-medium text-ink-3 mb-1.5">Fields · {fields.length}</h4>{fields.length ? <ul className="grid gap-1 text-sm">{fields.map((f, i) => <li key={f.k} className="flex items-center gap-2 flex-wrap"><span className="text-xs text-ink-4 w-4 text-right tabular-nums">{i + 1}</span><b>{f.l}</b><span className="font-mono text-xs text-ink-3">{f.k}</span><TypeChip t={f.t} />{f.req && <small className="text-brand">required</small>}{f.loc && <small className="text-info">localised</small>}{f.hidden && <small className="text-ink-4">hidden</small>}</li>)}</ul> : <div className="text-sm text-ink-3">No fields yet · you can add them in the editor.</div>}</div>
        <p className="text-xs text-ink-3">“Save as draft” creates the model without exposing it in the delivery API. “Save & publish” creates it and publishes v1 immediately.</p>
        <Err err={err} /></div>}
    </ModalShell>
    {panel && <FieldPanel models={models} taken={fields.map((f) => f.k).filter((k) => panel.index === null || k !== fields[panel.index].k)} initial={panel.index === null ? undefined : fields[panel.index]} onClose={() => setPanel(null)} onSubmit={(f) => { setFields(panel.index === null ? [...fields, f] : fields.map((x, i) => (i === panel.index ? f : x))); setPanel(null); }} />}
  </>;
}
