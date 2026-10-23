"use client";
import { useState } from "react";
import type { Model, ModelField, FieldValidation } from "@/lib/ucp/types";
import { FIELD_TYPES } from "@/lib/ucp/seed";
import { Menu } from "@/components/ui/Menu";
import { Pill } from "@/components/ui/Pill";
import { ModalShell, Err, inputCls } from "./ModalShell";
import { sharedFields } from "@/lib/ucp/schema";
import { InfoTip } from "@/components/ui/InfoTip";
import { TYPE_META, TEXT_TYPES, NUMBER_TYPES, OPTION_TYPES, UNIQUE_TYPES, camel, keyError, validationSummary, isBlockModel } from "./fieldMeta";
import { useConfirm } from "@/components/ui/Confirm";

export const TypeChip = ({ t }: { t: string }) => <span className="inline-flex items-center gap-1 bg-surface-3 border border-line rounded px-1.5 py-0.5 text-xs whitespace-nowrap"><span className="text-xs text-ink-3">{TYPE_META[t]?.icon ?? "·"}</span>{t}</span>;
const Toggle = ({ on, onClick, title, disabled }: { on: boolean; onClick: () => void; title: string; disabled?: boolean }) => <button type="button" role="switch" aria-checked={on} title={title} aria-label={title} disabled={disabled} onClick={onClick} className={`w-7 h-7 rounded-md border grid place-items-center text-sm font-bold ${on ? "bg-good text-white border-good" : "bg-surface-3 border-line-2 text-transparent"} disabled:opacity-60`}>✓</button>;
const Eye = ({ hidden, onClick }: { hidden: boolean; onClick: () => void }) => <button type="button" aria-pressed={hidden} title={hidden ? "Hidden from authors · click to show" : "Visible to authors · click to hide"} aria-label={hidden ? "Show field to authors" : "Hide field from authors"} onClick={onClick} className={`w-7 h-7 rounded-md border grid place-items-center ${hidden ? "bg-surface-3 border-line-2 text-ink-4" : "bg-surface border-line-2 text-ink-2"}`}>
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{hidden && <path d="M4 4l16 16" />}</svg></button>;

/** Unique copy of a key: title → titleCopy → titleCopy2… */
export const copyKey = (k: string, taken: string[]) => { let n = `${k}Copy`; let i = 2; while (taken.includes(n)) n = `${k}Copy${i++}`; return n; };

/* Plain-language meaning of the field options, shown as ⓘ tooltips wherever they appear. */
export const FIELD_HELP = {
  required: "Authors must fill this in. An entity or page with this field empty cannot be sent for review.",
  localised: "One value per language of the market (e.g. English and Welsh). Leave it off for values that are the same everywhere, such as a rate or a photo.",
  default: "The value a new entity starts with. Authors can change it. Useful for fixed wording such as “Apply now”.",
  validation: "Extra rules the value must follow, such as a maximum length, a number range or a list of allowed options.",
  visible: "Hidden fields stay in the model but are not shown to authors in the form (for example values filled in by the system).",
} as const;

/* ---------------- read-only documentation table (authors, block types) ---------------- */
export function DocsTable({ fields }: { fields: ModelField[] }) {
  const th = "p-3 border-b border-line-2 font-medium"; const td = "p-3 border-b border-line align-top";
  return <div className="overflow-auto bg-surface border border-line rounded-lg"><table className="w-full text-sm [&_tr>*:nth-child(2)]:hidden sm:[&_tr>*:nth-child(2)]:table-cell [&_tr>*:nth-child(4)]:hidden md:[&_tr>*:nth-child(4)]:table-cell"><thead><tr className="text-left text-xs uppercase tracking-[.06em] text-ink-3"><th className={th}>Field</th><th className={th}>Type</th><th className={th}>Required<InfoTip label="Required" text={FIELD_HELP.required} /></th><th className={th}>Localised<InfoTip label="Localised" text={FIELD_HELP.localised} /></th><th className={`${th} hidden xl:table-cell`}>Default<InfoTip label="Default" text={FIELD_HELP.default} /></th><th className={`${th} hidden xl:table-cell`}>Validation<InfoTip label="Validation" text={FIELD_HELP.validation} align="right" /></th><th className={`${th} hidden lg:table-cell`}>Description</th></tr></thead>
    <tbody>{fields.map((f) => <tr key={f.k} className={f.hidden ? "text-ink-3" : ""}><td className={td}><b>{f.l}</b>{f.hidden && <span className="ml-1.5 text-xs uppercase tracking-[.06em] text-ink-4">hidden</span>}<div className="font-mono text-xs text-ink-3">{f.k}</div>{validationSummary(f) && <div className="text-xs text-ink-3 xl:hidden">{validationSummary(f)}</div>}</td><td className={td}><TypeChip t={f.t} /></td><td className={td}>{f.req ? <Pill status="published" label="Yes" /> : <span className="text-ink-4">—</span>}</td><td className={td}>{f.loc ? <Pill status="approved" label="Yes" /> : <span className="text-ink-4">—</span>}</td><td className={`${td} font-mono text-xs hidden xl:table-cell`}>{f.default || <span className="text-ink-4">—</span>}</td><td className={`${td} text-xs hidden xl:table-cell`}>{validationSummary(f) || <span className="text-ink-4">—</span>}</td><td className={`${td} text-xs text-ink-2 hidden lg:table-cell`}>{f.desc || <span className="text-ink-4">—</span>}</td></tr>)}
      {!fields.length && <tr><td colSpan={7} className="p-6 text-center text-ink-3">This model has no fields.</td></tr>}</tbody></table></div>;
}

/* ---------------- schema builder: draggable rows ---------------- */
export function FieldList({ fields, onChange, onEdit, onAdd }: { fields: ModelField[]; onChange: (f: ModelField[]) => void; onEdit: (i: number) => void; onAdd: () => void }) {
  const ask = useConfirm();
  const [drag, setDrag] = useState<number | null>(null); const [over, setOver] = useState<number | null>(null);
  const move = (from: number, to: number) => { if (from === to || to < 0 || to >= fields.length) return; const fs = [...fields]; const [x] = fs.splice(from, 1); fs.splice(to, 0, x); onChange(fs); };
  const patch = (i: number, p: Partial<ModelField>) => onChange(fields.map((f, j) => (j === i ? { ...f, ...p } : f)));
  const dup = (i: number) => { const f = fields[i]; const c: ModelField = { ...f, k: copyKey(f.k, fields.map((x) => x.k)), l: `${f.l} (copy)` }; const fs = [...fields]; fs.splice(i + 1, 0, c); onChange(fs); };
  const del = async (i: number) => { if (!(await ask({ title: `Remove field “${fields[i].l}”? Existing content keeps its value until the model is published.`, danger: true, confirmLabel: "Remove field" }))) return; onChange(fields.filter((_, j) => j !== i)); };
  const th = "px-1.5 py-2.5 md:p-2.5 border-b border-line-2 font-medium whitespace-nowrap"; const td = "px-1.5 py-2.5 md:p-2.5 border-b border-line align-middle";
  return <div className="bg-surface border border-line rounded-lg overflow-hidden">
    <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-surface-2"><b className="text-sm">Fields</b><span className="text-xs text-ink-3">{fields.length} field{fields.length === 1 ? "" : "s"} · drag rows to reorder</span><button type="button" className="btn btn-sm btn-primary ml-auto" onClick={onAdd}>＋ Add field</button></div>
    <div className="overflow-auto"><table className="w-full text-sm [&_tr>*:nth-child(3)]:hidden md:[&_tr>*:nth-child(3)]:table-cell [&_tr>*:nth-child(5)]:hidden md:[&_tr>*:nth-child(5)]:table-cell [&_tr>*:nth-child(8)]:hidden md:[&_tr>*:nth-child(8)]:table-cell"><thead><tr className="text-left text-xs uppercase tracking-[.08em] text-ink-3"><th className={`${th} md:w-[64px]`}><span className="sr-only">Order</span>#</th><th className={th}>Field</th><th className={th}>Type</th><th className={`${th} md:w-[104px]`}>Required<InfoTip label="Required" text={FIELD_HELP.required} /></th><th className={`${th} w-[104px]`}>Localised<InfoTip label="Localised" text={FIELD_HELP.localised} /></th><th className={`${th} hidden xl:table-cell`}>Default<InfoTip label="Default" text={FIELD_HELP.default} /></th><th className={`${th} hidden xl:table-cell`}>Validation<InfoTip label="Validation" text={FIELD_HELP.validation} /></th><th className={`${th} w-[84px]`}>Visible<InfoTip label="Visible" text={FIELD_HELP.visible} align="right" /></th><th className={`${th} text-right`}><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{fields.map((f, i) => <tr key={f.k} draggable onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", f.k); }} onDragOver={(e) => { if (drag === null) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== i) setOver(i); }} onDragLeave={() => { if (over === i) setOver(null); }} onDrop={(e) => { e.preventDefault(); if (drag !== null) move(drag, i); setDrag(null); setOver(null); }} onDragEnd={() => { setDrag(null); setOver(null); }}
        className={`group ${drag === i ? "opacity-40" : ""} ${over === i && drag !== i ? "bg-brand-soft/60 outline outline-2 outline-brand -outline-offset-2" : "hover:bg-surface-2"} ${f.hidden ? "text-ink-3" : ""}`}>
        <td className={td}><div className="flex items-center gap-1"><span className="cursor-grab text-ink-4 select-none text-sm leading-none" title="Drag to reorder" aria-hidden>⋮⋮</span><span className="text-xs text-ink-3 tabular-nums w-5 text-right">{i + 1}</span><span className="grid"><button type="button" className="text-xs leading-none text-ink-4 hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${f.l} up`}>▲</button><button type="button" className="text-xs leading-none text-ink-4 hover:text-ink disabled:opacity-30" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${f.l} down`}>▼</button></span></div></td>
        <td className={td}><button type="button" className="text-left" onClick={() => onEdit(i)}><b className="block">{f.l}</b><span className="font-mono text-xs text-ink-3 break-all">{f.k}</span></button>{f.desc && <div className="text-xs text-ink-3 mt-0.5 max-w-[280px] truncate" title={f.desc}>{f.desc}</div>}{validationSummary(f) && <div className="text-xs text-ink-3 mt-0.5 xl:hidden">{validationSummary(f)}</div>}</td>
        <td className={td}><TypeChip t={f.t} /></td>
        <td className={td}><Toggle on={!!f.req} title={`${f.l}: required`} onClick={() => patch(i, { req: !f.req })} /></td>
        <td className={td}><Toggle on={!!f.loc} title={`${f.l}: localised`} onClick={() => patch(i, { loc: !f.loc })} /></td>
        <td className={`${td} font-mono text-xs hidden xl:table-cell`}>{f.default || <span className="text-ink-4">—</span>}</td>
        <td className={`${td} text-xs text-ink-2 hidden xl:table-cell`}>{validationSummary(f) || <span className="text-ink-4">—</span>}</td>
        <td className={td}><Eye hidden={!!f.hidden} onClick={() => patch(i, { hidden: !f.hidden })} /></td>
        <td className={`${td} text-right whitespace-nowrap`}><button type="button" className="btn btn-sm btn-secondary mr-1.5 hidden lg:inline-flex" onClick={() => onEdit(i)}>Edit</button><Menu label="⋯" ariaLabel={`Actions for ${f.l}`} buttonClassName="btn btn-sm btn-icon" items={[{ id: "edit", label: "Edit", onSelect: () => onEdit(i) }, { id: "dup", label: "Duplicate", onSelect: () => dup(i) }, { id: "del", label: "Delete", danger: true, onSelect: () => del(i) }]} /></td>
      </tr>)}
      {!fields.length && <tr><td colSpan={9} className="p-8 text-center text-ink-3">No fields yet. <button type="button" className="underline text-ink" onClick={onAdd}>Add the first field</button>.</td></tr>}</tbody></table></div>
  </div>;
}

/* ---------------- add / edit field panel ---------------- */
type PanelProps = { models: Model[]; own?: { id: string; fields: ModelField[] }; taken: string[]; initial?: ModelField; onClose: () => void; onSubmit: (f: ModelField) => void };
export function FieldPanel({ models, own, taken, initial, onClose, onSubmit }: PanelProps) {
  const [type, setType] = useState<string>(initial?.t ?? "");
  const [label, setLabel] = useState(initial?.l ?? ""); const [key, setKey] = useState(initial?.k ?? ""); const [keyTouched, setKeyTouched] = useState(!!initial);
  const [req, setReq] = useState(!!initial?.req); const [loc, setLoc] = useState(!!initial?.loc); const [hidden, setHidden] = useState(!!initial?.hidden);
  const [def, setDef] = useState(initial?.default ?? ""); const [desc, setDesc] = useState(initial?.desc ?? "");
  const v0 = initial?.validation ?? {};
  const [minLength, setMinLength] = useState(v0.minLength?.toString() ?? ""); const [maxLength, setMaxLength] = useState(v0.maxLength?.toString() ?? ""); const [pattern, setPattern] = useState(v0.pattern ?? "");
  const [min, setMin] = useState(v0.min?.toString() ?? ""); const [max, setMax] = useState(v0.max?.toString() ?? "");
  const [options, setOptions] = useState<string[]>(v0.options?.length ? v0.options : [""]); const [refModel, setRefModel] = useState(v0.referenceModel ?? ""); const [multiple, setMultiple] = useState(!!v0.multiple); const [unique, setUnique] = useState(!!v0.unique);
  const [tried, setTried] = useState(false);
  const kErr = keyError(key, taken); const lErr = label.trim() ? "" : "A label is required";
  const num = (s: string) => (s.trim() === "" || isNaN(Number(s)) ? undefined : Number(s));
  const rangeErr = TEXT_TYPES.includes(type) && num(minLength) !== undefined && num(maxLength) !== undefined && num(minLength)! > num(maxLength)! ? "Min length is greater than max length" : NUMBER_TYPES.includes(type) && num(min) !== undefined && num(max) !== undefined && num(min)! > num(max)! ? "Min is greater than max" : "";
  let patErr = ""; if (pattern) { try { new RegExp(pattern); } catch { patErr = "Not a valid regular expression"; } }
  const optErr = OPTION_TYPES.includes(type) && !options.some((o) => o.trim()) ? "Add at least one option" : "";
  const refErr = type === "Reference" && !refModel ? "Pick the model this field points to" : "";
  const valid = !kErr && !lErr && !rangeErr && !patErr && !optErr && !refErr;
  const submit = (e: React.FormEvent) => { e.preventDefault(); setTried(true); if (!valid) return;
    const val: FieldValidation = {};
    if (TEXT_TYPES.includes(type)) { if (num(minLength) !== undefined) val.minLength = num(minLength); if (num(maxLength) !== undefined) val.maxLength = num(maxLength); if (pattern.trim()) val.pattern = pattern.trim(); }
    if (NUMBER_TYPES.includes(type)) { if (num(min) !== undefined) val.min = num(min); if (num(max) !== undefined) val.max = num(max); }
    if (OPTION_TYPES.includes(type)) val.options = options.map((o) => o.trim()).filter(Boolean);
    if (type === "Reference") { val.referenceModel = refModel; if (multiple) val.multiple = true; } if (UNIQUE_TYPES.includes(type) && unique) val.unique = true;
    const f: ModelField = { k: key, l: label.trim(), t: type, req, loc }; if (desc.trim()) f.desc = desc.trim(); if (def.trim()) f.default = def.trim(); if (hidden) f.hidden = true; if (Object.keys(val).length) f.validation = val;
    onSubmit(f); };
  const editing = !!initial; const title = editing ? `Edit field “${initial.l}”` : type ? `Add ${type} field` : "Add field";
  const refTargets = models.filter((m) => !isBlockModel(m) && m.id !== own?.id);
  const linkable = (m: Model) => !own || sharedFields(own, m).length > 0 || initial?.validation?.referenceModel === m.id;
  const fieldLbl = "text-xs text-ink-3 block"; const showErr = (s: string) => (tried && s ? <small className="block text-crit mt-1">{s}</small> : null);

  if (!type) return <ModalShell title={title} subtitle="Step 1 of 2 · pick a type" width={760} onClose={onClose} footer={<button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>Cancel</button>}>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 py-1">{FIELD_TYPES.map((t) => <button type="button" key={t} onClick={() => setType(t)} className="text-left border border-line rounded-lg p-3 hover:border-brand hover:bg-brand-soft/40 focus:outline-none focus:ring-2 focus:ring-brand"><span className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-md bg-surface-3 grid place-items-center text-xs text-ink-2 flex-none">{TYPE_META[t]?.icon ?? "·"}</span><span className="min-w-0"><b className="block text-sm">{t}</b><small className="block text-ink-3 text-xs leading-snug">{TYPE_META[t]?.hint}</small></span></span></button>)}</div>
  </ModalShell>;

  return <ModalShell title={title} subtitle={editing ? <>Type <b className="text-ink">{type}</b> · changing the type is a breaking change, so it is fixed while editing</> : <>Step 2 of 2 · configure the field · <button type="button" className="underline" onClick={() => setType("")}>change type</button></>} width={760} onClose={onClose}
    footer={<><button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>Cancel</button><button type="submit" form="field-form" className="btn btn-sm btn-primary" disabled={tried && !valid}>{editing ? "Save field" : "Add field"}</button></>}>
    <form id="field-form" onSubmit={submit} className="grid grid-cols-2 gap-x-4 gap-y-3 py-1" noValidate>
      <label className={fieldLbl}>Label<input autoFocus className={inputCls} value={label} onChange={(e) => { setLabel(e.target.value); if (!keyTouched) setKey(camel(e.target.value)); }} placeholder="e.g. Interest rate" aria-invalid={tried && !!lErr} />{showErr(lErr)}</label>
      <label className={fieldLbl}>Field name <span className="text-ink-4">API key</span><input className={`${inputCls} font-mono`} value={key} onChange={(e) => { setKey(e.target.value); setKeyTouched(true); }} placeholder="interestRate" aria-invalid={tried && !!kErr} spellCheck={false} />{showErr(kErr)}{!kErr && key && <small className="block text-ink-4 mt-1 font-mono">/v1/content/…/{key}</small>}</label>
      <div className="col-span-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink">
        <label className="flex items-center gap-2"><input type="checkbox" checked={req} onChange={(e) => setReq(e.target.checked)} />Required<InfoTip label="Required" text={FIELD_HELP.required} align="left" /> <span className="text-ink-3">blocks “Send for review” when empty</span></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={loc} onChange={(e) => setLoc(e.target.checked)} />Localised<InfoTip label="Localised" text={FIELD_HELP.localised} align="left" /> <span className="text-ink-3">one value per language</span></label>
      </div>
      <label className={fieldLbl}><span className="inline-flex items-center">Default value<InfoTip label="Default value" text={FIELD_HELP.default} align="left" /></span>{type === "Boolean" ? <select className={inputCls} value={def} onChange={(e) => setDef(e.target.value)}><option value="">None</option><option value="true">On</option><option value="false">Off</option></select> : type === "Select" && options.some((o) => o.trim()) ? <select className={inputCls} value={def} onChange={(e) => setDef(e.target.value)}><option value="">None</option>{options.filter((o) => o.trim()).map((o) => <option key={o}>{o.trim()}</option>)}</select> : <input className={`${inputCls} ${type === "JSON" ? "font-mono" : ""}`} value={def} onChange={(e) => setDef(e.target.value)} placeholder={NUMBER_TYPES.includes(type) ? "0" : type === "URL" ? "https://" : "Leave empty for none"} type={NUMBER_TYPES.includes(type) ? "number" : type === "Date" ? "date" : "text"} />}</label>
      <label className={fieldLbl}>Description <span className="text-ink-4">shown to authors as help text</span><input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What should go here?" /></label>

      <fieldset className="col-span-2 border border-line rounded-lg p-3.5 mt-1"><legend className="px-1 text-xs font-medium text-ink-2 inline-flex items-center">Validation<InfoTip label="Validation" text={FIELD_HELP.validation} align="left" /></legend>
        {TEXT_TYPES.includes(type) && <div className="grid grid-cols-3 gap-3"><label className={fieldLbl}>Min length<input type="number" min={0} className={inputCls} value={minLength} onChange={(e) => setMinLength(e.target.value)} /></label><label className={fieldLbl}>Max length<input type="number" min={0} className={inputCls} value={maxLength} onChange={(e) => setMaxLength(e.target.value)} placeholder="e.g. 100" /></label><label className={fieldLbl}>Pattern <span className="text-ink-4">regular expression</span><input className={`${inputCls} font-mono`} value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder={type === "URL" ? "^https://" : "^[A-Z]"} spellCheck={false} aria-invalid={!!patErr} />{patErr && <small className="block text-crit mt-1">{patErr}</small>}</label></div>}
        {NUMBER_TYPES.includes(type) && <div className="grid grid-cols-3 gap-3"><label className={fieldLbl}>Minimum<input type="number" step={type === "Decimal" ? "any" : 1} className={inputCls} value={min} onChange={(e) => setMin(e.target.value)} /></label><label className={fieldLbl}>Maximum<input type="number" step={type === "Decimal" ? "any" : 1} className={inputCls} value={max} onChange={(e) => setMax(e.target.value)} /></label></div>}
        {OPTION_TYPES.includes(type) && <div><span className={fieldLbl}>Options <span className="text-ink-4">one per row, in the order authors see them</span></span><div className="grid gap-1.5 mt-1 max-w-[420px]">{options.map((o, i) => <div key={i} className="flex gap-1.5"><input className={`${inputCls} mt-0`} value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Option ${i + 1}`} aria-label={`Option ${i + 1}`} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setOptions([...options.slice(0, i + 1), "", ...options.slice(i + 1)]); } }} /><button type="button" className="btn-icon" aria-label={`Remove option ${i + 1}`} disabled={options.length === 1} onClick={() => setOptions(options.filter((_, j) => j !== i))}>×</button></div>)}<button type="button" className="btn btn-sm btn-secondary w-fit" onClick={() => setOptions([...options, ""])}>＋ Add option</button></div>{showErr(optErr)}</div>}
        {type === "Reference" && <label className={`${fieldLbl} max-w-[420px]`}>Target model<select className={inputCls} value={refModel} onChange={(e) => setRefModel(e.target.value)} aria-invalid={tried && !!refErr}><option value="">Choose a model…</option>{refTargets.map((m) => <option key={m.id} value={m.id} disabled={!linkable(m)}>{m.name} ({m.id}){linkable(m) ? "" : " · no fields in common"}</option>)}</select>{showErr(refErr)}</label>}
        {type === "Reference" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-[var(--brand)]" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} />Allow several items <span className="text-ink-4 text-xs">(a list of links instead of one)</span></label>}
        {UNIQUE_TYPES.includes(type) && <label className="flex items-center gap-2 text-sm text-ink mt-3"><input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} />Values must be unique across items of this model</label>}
        {!TEXT_TYPES.includes(type) && !NUMBER_TYPES.includes(type) && !OPTION_TYPES.includes(type) && type !== "Reference" && <div className="text-xs text-ink-3">No validation options for {type} fields.</div>}
        {rangeErr && <small className="block text-crit mt-2">{rangeErr}</small>}
      </fieldset>
      <fieldset className="col-span-2 border border-line rounded-lg p-3.5"><legend className="px-1 text-xs font-medium text-ink-2">Visibility</legend>
        <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />Hidden <span className="text-ink-3">kept in the API and schema, but not shown in the authoring form</span></label></fieldset>
      {tried && !valid && <Err err="Fix the highlighted fields to continue." />}
    </form>
  </ModalShell>;
}
