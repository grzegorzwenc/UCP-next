"use client";
import { UsedOn } from "@/components/models/UsedOn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Entity, EntityValues, Model, ModelField } from "@/lib/ucp/types";
import { ucpApi, ApiError } from "@/lib/api";
import { describeError, errorText } from "@/lib/api/errors";
import { AssetPicker } from "@/components/builder/AssetPicker";
import { Menu } from "@/components/ui/Menu";
import { StatusPill } from "@/components/models/ModelDialogs";
import { When, chip, Crumbs } from "@/components/models/bits";
import { inputCls } from "@/components/models/ModalShell";
import { aliasOf, detailLink, entitiesLink, entityLink, whoName, type UsedPage } from "@/components/models/fieldMeta";
import { useConfirm } from "@/components/ui/Confirm";

type Props = { base: string; marketId: string; marketRoot: string; marketName: string; flag: string; model: Model; entity: Entity; entities: Entity[]; models: Model[]; usedOn: UsedPage[]; names: Record<string, string>; viewerId: string; canEdit: boolean;
  go: (href: string) => void; say: (t: string) => void; setDirty: (d: boolean) => void; saveRef: React.MutableRefObject<(() => Promise<boolean>) | null> };
type Kind = "text" | "url" | "area" | "number" | "bool" | "date" | "datetime" | "select" | "multi" | "list" | "asset" | "ref" | "refs" | "json";

/** Which input a field gets. Unknown types (e.g. Group) fall back to JSON for structured values, text otherwise. */
function kindOf(f: ModelField, v: unknown): Kind {
  const opts = !!f.validation?.options?.length;
  switch (f.t) {
    case "Text": return "text"; case "URL": return "url"; case "Long text": case "Rich text": return "area";
    case "Number": case "Decimal": return "number"; case "Boolean": return "bool"; case "Date": return "date"; case "Date & time": return "datetime";
    case "Select": case "Enum": return opts ? "select" : "text"; case "Multi-select": return opts ? "multi" : "list";
    case "Asset": case "Image": return "asset"; case "Reference": return f.validation?.multiple ? "refs" : "ref"; case "JSON": return "json";
    default: return v !== null && typeof v === "object" ? "json" : "text";
  }
}
const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
const rawOf = (v: unknown) => (v === undefined ? "" : JSON.stringify(v, null, 2));

/** The problem with a field's value, or "" when it is fine. */
function fieldError(f: ModelField, kind: Kind, v: unknown, raw: string | undefined): string {
  const val = f.validation ?? {};
  if (kind === "json") { if (!raw?.trim()) return f.req ? "Required" : ""; try { JSON.parse(raw); return ""; } catch (e) { return `Not valid JSON: ${(e as Error).message}`; } }
  if (kind === "bool") return "";
  if (isEmpty(v)) return f.req ? "Required" : "";
  if (kind === "number") { const n = Number(v); if (typeof v !== "number" || isNaN(n)) return "Enter a number"; if (f.t === "Number" && !Number.isInteger(n)) return "Enter a whole number"; if (val.min !== undefined && n < val.min) return `Must be at least ${val.min}`; if (val.max !== undefined && n > val.max) return `Must be at most ${val.max}`; return ""; }
  if (typeof v === "string") {
    if (val.minLength !== undefined && v.length < val.minLength) return `Use at least ${val.minLength} characters (now ${v.length})`;
    if (val.maxLength !== undefined && v.length > val.maxLength) return `Use at most ${val.maxLength} characters (now ${v.length})`;
    if (val.pattern) { try { if (!new RegExp(val.pattern).test(v)) return `Doesn't match the required format (${val.pattern})`; } catch { /* a broken pattern in the model is not the author's fault */ } }
    if (kind === "url" && !/^(https?:\/\/\S+|\/\S*|mailto:\S+|tel:\S+)$/.test(v)) return "Enter a full web address (https://…) or a site path (/…)";
  }
  return "";
}

/* ---------------- one field ---------------- */
type FieldProps = { f: ModelField; kind: Kind; v: unknown; raw?: string; err: string; marketId: string; refOptions: { value: string; label: string }[]; onValue: (v: unknown) => void; onRaw: (s: string) => void };
function Field({ f, kind, v, raw, err, marketId, refOptions, onValue, onRaw }: FieldProps) {
  const id = `fld-${f.k}`; const help = f.desc ? `${id}-help` : undefined; const errId = err ? `${id}-err` : undefined;
  const aria = { id, "aria-invalid": !!err || undefined, "aria-describedby": [help, errId].filter(Boolean).join(" ") || undefined };
  const cls = `${inputCls} ${err ? "border-crit" : ""}`; const s = typeof v === "string" ? v : v === undefined || v === null ? "" : String(v); const val = f.validation ?? {};
  let control: React.ReactNode;
  if (kind === "area") control = <textarea {...aria} rows={f.t === "Rich text" ? 5 : 3} className={cls} value={s} maxLength={undefined} onChange={(e) => onValue(e.target.value)} />;
  else if (kind === "number") control = <input {...aria} type="number" className={`${cls} max-w-[220px]`} step={f.t === "Decimal" ? "any" : 1} min={val.min} max={val.max} value={typeof v === "number" ? v : s} onChange={(e) => onValue(e.target.value === "" ? undefined : Number(e.target.value))} />;
  else if (kind === "bool") control = <button {...aria} type="button" role="switch" aria-checked={!!v} onClick={() => onValue(!v)} className={`mt-1 inline-flex items-center gap-2 text-[13px]`}><span className={`w-9 h-5 rounded-full relative transition-colors ${v ? "bg-good" : "bg-surface-3 border border-line-2"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${v ? "left-[18px]" : "left-0.5"}`} /></span>{v ? "Yes" : "No"}</button>;
  else if (kind === "date") control = <input {...aria} type="date" className={`${cls} max-w-[220px]`} value={s.slice(0, 10)} onChange={(e) => onValue(e.target.value)} />;
  else if (kind === "datetime") control = <input {...aria} type="datetime-local" className={`${cls} max-w-[260px]`} value={s.slice(0, 16)} onChange={(e) => onValue(e.target.value)} />;
  else if (kind === "select") control = <select {...aria} className={`${cls} max-w-[360px]`} value={s} onChange={(e) => onValue(e.target.value || undefined)}><option value="">— Choose —</option>{val.options!.map((o) => <option key={o}>{o}</option>)}{s && !val.options!.includes(s) && <option value={s}>{s} (not in the list)</option>}</select>;
  else if (kind === "multi") { const arr = Array.isArray(v) ? (v as string[]) : []; control = <div {...aria} role="group" className="mt-1 flex flex-wrap gap-1.5">{val.options!.map((o) => { const on = arr.includes(o); return <label key={o} className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-[12.5px] cursor-pointer ${on ? "bg-accent-soft border-accent text-accent-hover font-semibold" : "border-line-2 hover:bg-surface-2"}`}><input type="checkbox" className="sr-only" checked={on} onChange={() => onValue(on ? arr.filter((x) => x !== o) : [...arr, o])} />{on ? "✓ " : ""}{o}</label>; })}</div>; }
  else if (kind === "list") { const arr = Array.isArray(v) ? (v as unknown[]).map(String) : s ? [s] : []; control = <><input {...aria} className={cls} defaultValue={arr.join(", ")} onChange={(e) => onValue(e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /><p className="text-[11.5px] text-ink-4 mt-1">Separate values with commas.</p></>; }
  else if (kind === "asset") control = <div className="mt-1"><AssetPicker marketId={marketId} value={s} onChange={(a) => onValue(a || undefined)} invalid={!!err} /></div>;
  else if (kind === "ref") control = <select {...aria} className={`${cls} max-w-[420px]`} value={s} onChange={(e) => onValue(e.target.value || undefined)}><option value="">— None —</option>{refOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}{s && !refOptions.some((o) => o.value === s) && <option value={s}>{s} (not found)</option>}</select>;
  else if (kind === "refs") { const arr = Array.isArray(v) ? (v as unknown[]).map(String) : s ? [s] : []; const toggle = (x: string) => onValue(arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);
    control = <div className="mt-1 grid gap-1 max-w-[420px] border border-line-2 rounded-md p-2 max-h-[200px] overflow-auto" role="group" aria-labelledby={id}>{refOptions.length ? refOptions.map((o) => <label key={o.value} className="flex items-center gap-2 text-[13px] px-1 py-0.5 rounded hover:bg-surface-2"><input type="checkbox" className="accent-[var(--accent)]" checked={arr.includes(o.value)} onChange={() => toggle(o.value)} />{o.label}</label>) : <span className="text-[12.5px] text-ink-4 px-1">Nothing to pick yet.</span>}</div>; }
  else if (kind === "json") control = <textarea {...aria} rows={5} spellCheck={false} className={`${cls} font-mono text-[12.5px]`} value={raw ?? ""} onChange={(e) => onRaw(e.target.value)} placeholder='{ "key": "value" }' />;
  else control = <input {...aria} type={kind === "url" ? "url" : "text"} className={cls} value={s} onChange={(e) => onValue(e.target.value)} />;
  const count = (kind === "text" || kind === "area") && val.maxLength !== undefined ? <span className={`ml-auto font-mono text-[11px] ${s.length > val.maxLength ? "text-crit" : "text-ink-4"}`}>{s.length}/{val.maxLength}</span> : null;
  return <div>
    <div className="flex items-baseline gap-2"><label htmlFor={id} className="text-[13px] font-semibold">{f.l}{f.req && <span className="text-accent ml-0.5" aria-label="required">*</span>}</label>{f.loc && <span className="text-[10.5px] uppercase tracking-[.06em] text-ink-4">localised</span>}{count}</div>
    {f.desc && <p id={help} className="text-[12px] text-ink-3">{f.desc}</p>}
    {control}
    {err && <p id={errId} role="alert" className="text-crit text-[12px] mt-1">{err}</p>}
  </div>;
}

/* ---------------- editor ---------------- */
/** Entity editor: a form generated from the model's published schema, with Save / Publish like a page. */
export function EntityEditor({ base, marketId, marketRoot, marketName, flag, model, entity, entities, models, usedOn, names, viewerId, canEdit, go, say, setDirty, saveRef }: Props) {
  const ask = useConfirm();
  const router = useRouter();
  const schema = useMemo(() => (model.publishedFields ?? model.fields).filter((f) => !f.hidden), [model]);
  const kinds = useMemo(() => Object.fromEntries(schema.map((f) => [f.k, kindOf(f, entity.values[f.k])])) as Record<string, Kind>, [schema, entity.values]);
  const initRaw = useMemo(() => Object.fromEntries(schema.filter((f) => kinds[f.k] === "json").map((f) => [f.k, rawOf(entity.values[f.k])])) as Record<string, string>, [schema, kinds, entity.values]);
  const [title, setTitle] = useState(entity.title); const [values, setValues] = useState<EntityValues>(entity.values); const [raw, setRaw] = useState<Record<string, string>>(initRaw);
  const [busy, setBusy] = useState(""); const [blocked, setBlocked] = useState<string | null>(null);
  const initial = useMemo(() => JSON.stringify({ t: entity.title, v: entity.values }), [entity]);
  const dirty = canEdit && (JSON.stringify({ t: title, v: values }) !== initial || Object.keys(raw).some((k) => raw[k] !== initRaw[k]));
  const errors = Object.fromEntries(schema.map((f) => [f.k, fieldError(f, kinds[f.k], values[f.k], raw[f.k])]).filter(([, e]) => e)) as Record<string, string>;
  const titleErr = title.trim() ? "" : "Give the entity a title"; const nErr = Object.keys(errors).length + (titleErr ? 1 : 0); const invalid = nErr > 0;
  useEffect(() => { setDirty(dirty); }, [dirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

  const setVal = (k: string, v: unknown) => setValues((o) => { const n = { ...o }; if (v === undefined) delete n[k]; else n[k] = v; return n; });
  const setJson = (k: string, s: string) => { setRaw((o) => ({ ...o, [k]: s })); if (!s.trim()) setVal(k, undefined); else { try { setVal(k, JSON.parse(s)); } catch { /* keep the last valid value until the text parses */ } } };
  const refOptions = (f: ModelField) => { const rm = f.validation?.referenceModel; const mName = (id: string) => models.find((m) => m.id === id)?.name ?? id;
    return entities.filter((e) => e.path !== entity.path && (!rm || e.model === rm)).map((e) => ({ value: e.path, label: rm ? e.title : `${e.title} · ${mName(e.model)}` })); };

  const save = async (): Promise<boolean> => { if (invalid) { say(`Fix ${nErr} field${nErr === 1 ? "" : "s"} before saving`); return false; } setBusy("save"); try { await ucpApi.saveEntity(marketId, entity.path, { title: title.trim(), values }); say("Draft saved"); router.refresh(); return true; } catch (e) { say(errorText(e)); return false; } finally { setBusy(""); } };
  useEffect(() => { saveRef.current = save; return () => { saveRef.current = null; }; });
  const publish = async () => { if (invalid) return; setBusy("publish"); try { if (dirty) await ucpApi.saveEntity(marketId, entity.path, { title: title.trim(), values }); await ucpApi.publishEntity(marketId, entity.path); say(usedOn.length ? `Published · ${usedOn.length} page${usedOn.length === 1 ? "" : "s"} updated` : "Published"); setDirty(false); router.refresh(); } catch (e) { say(errorText(e)); } finally { setBusy(""); } };
  const duplicate = async () => { setBusy("dup"); try { const n = await ucpApi.createEntity(marketId, model.id, `${entity.title} (copy)`, entity.values); say(`Duplicated as “${n.title}” (draft)`); go(entityLink(base, model.id, n.id)); router.refresh(); } catch (e) { say(errorText(e)); } finally { setBusy(""); } };
  const remove = async () => {
    if (!(await ask({ title: `Delete “${entity.title}”? This cannot be undone.`, danger: true, confirmLabel: "Delete entity" }))) return; setBusy("del"); setBlocked(null);
    try { await ucpApi.deleteEntity(marketId, entity.path); say(`Deleted ${entity.title}`); setDirty(false); router.push(entitiesLink(base, model.id)); router.refresh(); }
    catch (e) { if (e instanceof ApiError && e.problem.status === 409) { const d = describeError(e); setBlocked(`${d.title}. ${d.detail ?? "Remove it from those pages first."}`); } else say(errorText(e)); }
    finally { setBusy(""); }
  };
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); say(`Copied ${t}`); } catch { say("Couldn't copy. Select the token and copy it by hand."); } };
  const alias = aliasOf(model.id); const pageHref = (path: string) => `${base}/page${path.replace(marketRoot, "")}`;
  const nav = (href: string) => ({ href, onClick: (e: React.MouseEvent) => { e.preventDefault(); go(href); } });
  const by = entity.lastModifiedBy ? (entity.lastModifiedBy === viewerId ? "you" : whoName(entity.lastModifiedBy, names)) : "";
  const pubDisabled = (entity.status === "published" && !dirty) || invalid || !!busy;

  return <div className="p-4 md:p-7">
    <Crumbs items={[{ label: "Content entities", href: entitiesLink(base), onClick: () => go(entitiesLink(base)) }, { label: model.name, href: entitiesLink(base, model.id), onClick: () => go(entitiesLink(base, model.id)) }, { label: title || entity.title }]} />
    <div className="flex items-start gap-3 mb-4 flex-wrap"><div className="min-w-0 flex-1 basis-full sm:basis-0">
      <div className="flex items-center gap-2.5 flex-wrap">
        {canEdit ? <input aria-label="Entity title" value={title} onChange={(e) => setTitle(e.target.value)} className={`text-2xl font-semibold leading-tight bg-transparent border-b-2 ${titleErr ? "border-crit" : "border-transparent hover:border-line-2 focus:border-accent"} outline-none min-w-0 max-w-full`} style={{ width: `${Math.max(8, title.length + 1)}ch` }} />
          : <h1 className="text-2xl font-semibold leading-tight">{entity.title}</h1>}
        <StatusPill status={entity.status} />{dirty && <span className="text-[11.5px] font-semibold text-warn bg-warn-soft rounded-full px-2 py-0.5">Unsaved changes</span>}</div>
      {titleErr && <p role="alert" className="text-crit text-[12px] mt-1">{titleErr}</p>}
      <p className="text-[13px] text-ink-3 mt-1 flex items-center gap-2 flex-wrap"><Link {...nav(detailLink(base, model.id))} className={`${chip} hover:bg-surface-2`} title="Open this content model in Content models">Model: {model.name} v{model.publishedVersion ?? model.version}</Link>{entity.lastModified && <When iso={entity.lastModified} prefix="Last modified " suffix={by ? ` by ${by}` : ""} />}</p></div>
      <div className="ml-auto flex gap-2 items-center flex-wrap">
        {canEdit ? <>{invalid && <span className="text-[12.5px] text-crit">{nErr} field{nErr === 1 ? "" : "s"} to fix</span>}
          <button className="btn" disabled={!dirty || invalid || !!busy} onClick={save}>{busy === "save" ? "Saving…" : "Save"}</button>
          <button className="btn btn-primary" disabled={pubDisabled} onClick={publish} title={entity.status === "published" && !dirty ? "Everything is published" : invalid ? "Fix the highlighted fields first" : undefined}>{busy === "publish" ? "Publishing…" : "Publish"}</button>
          <Menu label="More ▾" ariaLabel="More actions" buttonClassName="btn" items={[{ id: "dup", label: "Duplicate", disabled: !!busy, onSelect: duplicate }, { id: "del", label: "Delete", danger: true, disabled: !!busy, onSelect: remove }]} /></>
          : <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 bg-surface-3 border border-line rounded-full px-3 py-1.5" title="You need Edit on this site to change content."><span aria-hidden="true">🔒</span>Read-only</span>}
      </div></div>
    {blocked && <div role="alert" className="bg-crit-soft text-crit px-3 py-2.5 rounded-md text-[13px] mb-3 flex items-start gap-2"><div className="flex-1"><b>Can’t delete “{entity.title}”.</b> {blocked}{!!usedOn.length && <span className="block mt-1 text-ink-2">{usedOn.map((u, i) => <span key={u.path}>{i > 0 && ", "}<Link {...nav(pageHref(u.path))} className="underline">{u.title}</Link></span>)}</span>}</div><button className="text-ink-3 hover:text-ink" aria-label="Dismiss" onClick={() => setBlocked(null)}>×</button></div>}
    {entity.status === "modified" && !dirty && <div className="bg-warn-soft text-ink-2 px-3 py-2 rounded-md text-[12.5px] mb-3">This entity has changes that are not published yet. Visitors still see the published version.</div>}

    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start min-w-0">
      <form className="bg-surface border border-line rounded-xl p-5 min-w-0" onSubmit={(e) => { e.preventDefault(); if (dirty) save(); }}>
        <fieldset disabled={!canEdit || !!busy} className="grid gap-4 min-w-0">
          <legend className="sr-only">{model.name} content</legend>
          {schema.length ? schema.map((f) => <Field key={f.k} f={f} kind={kinds[f.k]} v={values[f.k]} raw={raw[f.k]} err={errors[f.k] ?? ""} marketId={marketId} refOptions={kinds[f.k] === "ref" || kinds[f.k] === "refs" ? refOptions(f) : []} onValue={(v) => setVal(f.k, v)} onRaw={(s) => setJson(f.k, s)} />)
            : <p className="text-[13px] text-ink-3">This model has no fields authors can fill in yet.</p>}
        </fieldset>
      </form>
      <aside className="grid gap-4 min-w-0">
        <UsedOn compact pages={usedOn} base={base} marketRoot={marketRoot} marketName={marketName} flag={flag} go={go} note="Publishing this entity updates these pages automatically." empty="Open a page, click a text and use ⤓ Choose content to show this entity there." />
        <section className="bg-surface border border-line rounded-xl p-4"><h2 className="text-[13px] font-semibold mb-1">Tokens you can use on pages</h2>
          <p className="text-[12px] text-ink-3 mb-2">Type a token into any text on a page that uses this {model.name.toLowerCase()}. It shows this field’s value.</p>
          <ul className="grid gap-1">{schema.map((f) => { const t = `{{${alias}.${f.k}}}`; return <li key={f.k} className="flex items-center gap-2 min-w-0"><code className="font-mono text-[12px] bg-surface-3 border border-line rounded px-1.5 py-0.5 truncate min-w-0 max-w-[65%]">{t}</code><span className="text-[11.5px] text-ink-4 truncate flex-1">{f.l}</span><button type="button" className="btn btn-sm btn-quiet" onClick={() => copy(t)} aria-label={`Copy ${t}`}>Copy</button></li>; })}</ul></section>
      </aside>
    </div>
  </div>;
}
