"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { repoApi } from "@/lib/api";
import { errorText as errText } from "@/lib/api/errors";
import { useSession } from "@/components/shell/Session";
import type { Model, ModelField } from "@/lib/ucp/types";
import { FIELD_TYPES } from "@/lib/ucp/seed";
import { PATHS } from "@/lib/ucp/paths";
import { makeBlock } from "@/lib/blocks/registry";
import { RenderBlock } from "@/lib/blocks/Render";
import { Pill } from "@/components/ui/Pill";
import { Json } from "@/components/ui/Json";

export type ModelTab = "fields" | "diagram" | "form" | "config";
export type UsedPage = { path: string; title: string; status: string };
type Props = { base: string; marketName: string; marketRoot: string; locales: string[]; models: Model[]; selectedId: string; tab: ModelTab; used: UsedPage[]; templates: { id: string; name: string }[]; schema: unknown; config: unknown };

export const camel = (s: string) => { const w = s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").trim().split(/\s+/).filter(Boolean); return w.map((x, i) => (i ? x[0].toUpperCase() + x.slice(1) : x)).join(""); };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const Ico = ({ core, big }: { core: boolean; big?: boolean }) => <span className={`grid place-items-center rounded-md flex-none ${big ? "w-10 h-10" : "w-6 h-6"} ${core ? "bg-accent-soft text-accent" : "bg-info-soft text-info"}`}><svg viewBox="0 0 24 24" className={big ? "w-5 h-5" : "w-3.5 h-3.5"} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={core ? "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" : "M4 5h16v14H4zM4 10h16M9 10v9"} /></svg></span>;
const inp = "border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink bg-surface w-full";
const Toggle = ({ on, onClick, title, disabled }: { on: boolean; onClick: () => void; title: string; disabled?: boolean }) => <button type="button" role="switch" aria-checked={on} title={title} disabled={disabled} onClick={onClick} className={`w-7 h-7 rounded-md border grid place-items-center text-[13px] font-bold ${on ? "bg-good text-white border-good" : "bg-surface-3 border-line-2 text-transparent"} disabled:opacity-60`}>✓</button>;

export function Models(p: Props) {
  const router = useRouter(); const { user, can } = useSession();
  const canManage = user.role === "admin" || can("manage", p.marketRoot);
  const [q, setQ] = useState(""); const [toast, setToast] = useState(""); const [busy, setBusy] = useState(false); const [newOpen, setNewOpen] = useState(false);
  const md = p.models.find((m) => m.id === p.selectedId) ?? p.models[0];
  const groups = [...new Set(p.models.map((m) => m.group))];
  const link = (id: string, tab: ModelTab = p.tab) => `${p.base}/models?model=${encodeURIComponent(id)}${tab !== "fields" ? `&tab=${tab}` : ""}`;
  const say = (t: string) => { setToast(t); setTimeout(() => setToast(""), 2400); };
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2400); return () => clearTimeout(t); }, [toast]);

  /** Persist a new field list on the model node; bumps the version when `bump` is set. */
  const save = async (fields: ModelField[], text: string, bump = true) => {
    if (!md || md.locked || !canManage) return; setBusy(true);
    try { const version = bump ? md.version + 1 : md.version; await repoApi.setProps(md.path ?? `${PATHS.models}/${md.id}`, { "ucp:fields": JSON.stringify(fields), "ucp:version": version }, { text: `${text} (v${version})`, target: "models" }); router.refresh(); return true; }
    catch (e) { say(errText(e)); return false; } finally { setBusy(false); }
  };
  const addField = async (f: ModelField) => { if (!md) return; if (md.fields.some((x) => x.k === f.k)) { say(`A field with key “${f.k}” already exists`); return false; } const ok = await save([...md.fields, f], `added field “${f.l}” to model ${md.name}`); if (ok) say(`Field added · ${md.name} is now v${md.version + 1}`); return ok; };
  const toggle = (i: number, k: "req" | "loc") => { const fs = md.fields.map((f, j) => (j === i ? { ...f, [k]: !f[k] } : f)); save(fs, `${fs[i][k] ? "set" : "unset"} “${fs[i].l}” ${k === "req" ? "required" : "localised"} on model ${md.name}`); };
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= md.fields.length) return; const fs = [...md.fields]; [fs[i], fs[j]] = [fs[j], fs[i]]; save(fs, `reordered fields of model ${md.name}`, false); };
  const remove = async (i: number) => { const f = md.fields[i]; if (!confirm(`Remove field “${f.l}” from ${md.name}?`)) return; if (await save(md.fields.filter((_, j) => j !== i), `removed field “${f.l}” from model ${md.name}`)) say("Field removed"); };
  const del = async () => { if (!md || md.locked || !canManage) return; if (!confirm("Delete this model? Content using it will keep its data but lose validation.")) return; setBusy(true); try { await repoApi.deleteNode(md.path ?? `${PATHS.models}/${md.id}`, { text: `deleted model ${md.name}`, target: "models" }); say("Model deleted"); router.push(`${p.base}/models`); router.refresh(); } catch (e) { say(errText(e)); } finally { setBusy(false); } };
  const create = async (name: string, first?: ModelField) => { const id = slugify(name); if (!id) return; if (p.models.some((m) => m.id === id)) { say(`A model with id “${id}” already exists`); return; } setBusy(true); try { await repoApi.createNode(`${PATHS.models}/${id}`, "nt:unstructured", { "jcr:title": name.trim(), "ucp:group": "Core", "ucp:version": 1, "ucp:source": "Custom", "ucp:fields": JSON.stringify(first ? [first] : []) }, { text: `created model ${name.trim()}`, target: "models" }); setNewOpen(false); say(`Model “${name.trim()}” created`); router.push(link(id, "fields")); router.refresh(); } catch (e) { say(errText(e)); } finally { setBusy(false); } };

  if (!md) return <div className="p-7"><div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">No models yet.</div></div>;
  const isBlock = md.id.startsWith("block-"); const locked = !!md.locked || !canManage;
  const TABS: [ModelTab, string][] = [["fields", "Fields"], ["diagram", isBlock ? "Rendered preview" : "Diagram"], ["form", "Form preview"], ["config", "Config"]];
  return (
    <div className="p-7">
      <div className="flex items-end gap-4 mb-5"><div><h1 className="text-2xl font-semibold">Content models</h1><p className="text-ink-3 text-[13px] mt-1">The structure behind every page, content item and block</p></div>
        <div className="ml-auto flex gap-2 items-center">{canManage ? <button className="btn btn-primary" onClick={() => setNewOpen(true)}>＋ New model</button> : <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 bg-surface-3 border border-line rounded-full px-3 py-1.5" title="Only site admins (Manage) can change content models."><span aria-hidden="true">🔒</span>Read-only · ask a site admin to change models</span>}</div></div>
      <div className="grid grid-cols-[280px_1fr] gap-4 items-start">
        <aside className="bg-surface border border-line rounded-lg p-2.5 sticky top-0">
          <label className="flex items-center gap-2 border border-line-2 rounded-md px-2.5 py-1.5 mb-2"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px] bg-transparent" placeholder="Find a model" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a model" /></label>
          {groups.map((g) => { const items = p.models.filter((m) => m.group === g && (!q || m.name.toLowerCase().includes(q.toLowerCase()) || m.id.includes(q.toLowerCase()))); return <div key={g}>
            <h6 className="text-[11px] tracking-[.1em] uppercase text-ink-3 font-semibold mx-2 mt-3 mb-1.5">{g} <span className="font-mono font-normal">{p.models.filter((m) => m.group === g).length}</span></h6>
            {items.map((m) => <Link key={m.id} href={link(m.id)} aria-current={m.id === md.id ? "page" : undefined} className={`flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-md text-[13.5px] ${m.id === md.id ? "bg-accent-soft text-accent-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`}><Ico core={m.group === "Core"} /><span className="flex-1 truncate">{m.name}</span><span className="font-mono text-[11.5px] text-ink-3">{m.fields.length}</span></Link>)}
            {!items.length && <div className="text-[12.5px] text-ink-4 px-2 py-1">No match</div>}
          </div>; })}
        </aside>
        <section className="bg-surface border border-line rounded-lg p-5 min-w-0">
          <div className="flex items-center gap-3 mb-3 flex-wrap"><Ico core={!isBlock} big /><div className="min-w-0"><h2 className="text-[22px] font-semibold leading-tight">{md.name}</h2><p className="text-[13px] text-ink-3 flex items-center gap-2 flex-wrap mt-0.5"><span className="font-mono">/v1/models/{md.id}</span>·{md.locked ? <Pill status="draft" label="Read-only · from the Sling component dialog" /> : !canManage ? <Pill status="draft" label={`v${md.version} · read-only for you`} /> : <Pill status="published" label={`v${md.version} · editable`} />}·<span>{md.source}</span></p></div>
            <div className="ml-auto flex gap-2"><Link className="btn btn-sm" href={`${p.base}/api?tab=models&model=${md.id}`}>View JSON schema</Link>{!locked && <button className="btn btn-sm" disabled={busy} onClick={del}>Delete model</button>}</div></div>
          {!md.locked && !canManage && <div className="bg-info-soft text-info px-3 py-2 rounded-md text-[12.5px] mb-3">Only site admins can change content models. You can read every field and the schema here.</div>}
          {md.locked && <div className="bg-info-soft text-info px-3 py-2 rounded-md text-[12.5px] mb-3">This block type is translated from the Sling component dialog. Fields are read-only here; change the source dialog to update them.</div>}
          <div className="flex gap-1 border-b border-line mb-4">{TABS.map(([t, l]) => <Link key={t} href={link(md.id, t)} className={`px-3 py-2 text-[13.5px] -mb-px border-b-2 ${p.tab === t ? "border-accent text-ink font-semibold" : "border-transparent text-ink-3 hover:text-ink"}`}>{l}</Link>)}</div>

          {p.tab === "diagram" && (isBlock ? <BlockPreview type={md.id.slice(6)} /> : <Diagram models={p.models.filter((m) => !m.id.startsWith("block-"))} selected={md.id} link={(id) => link(id, "diagram")} />)}
          {p.tab === "form" && <FormPreview md={md} locales={p.locales} />}
          {p.tab === "config" && <div><div className="grid grid-cols-2 gap-3.5 mb-3.5"><div><h4 className="text-[13px] font-semibold mb-1.5">UCP configuration <span className="font-normal text-ink-3">{isBlock ? "translated from the Sling dialog" : "content model definition"}</span></h4><Json value={p.config} maxHeight={420} label="configuration" /></div><div><h4 className="text-[13px] font-semibold mb-1.5">JSON Schema <span className="font-normal text-ink-3 font-mono">served at /v1/models/{md.id}</span></h4><Json value={p.schema} maxHeight={420} label="schema" /></div></div><Link className="btn btn-sm" href={`${p.base}/api?tab=models&model=${md.id}`}>Open in API &amp; delivery</Link></div>}

          {p.tab === "fields" && <>
            <div className="mb-4"><h4 className="text-[13px] font-semibold mb-1.5">Used on {p.used.length} page{p.used.length === 1 ? "" : "s"}{p.templates.length ? ` · ${p.templates.length} template${p.templates.length === 1 ? "" : "s"}` : ""} <span className="font-normal text-ink-3">{p.marketName}</span></h4>
              {p.used.length ? <div className="flex flex-wrap gap-1.5">{p.used.slice(0, 12).map((u) => <Link key={u.path} href={`${p.base}/page${u.path.replace(p.marketRoot, "")}`} className="inline-flex items-center gap-1.5 border border-line-2 rounded-full px-2.5 py-1 text-[12.5px] hover:bg-surface-2"><Pill status={u.status} />{u.title}</Link>)}{p.used.length > 12 && <span className="inline-flex items-center border border-line-2 rounded-full px-2.5 py-1 text-[12.5px] text-ink-3">+{p.used.length - 12} more</span>}</div> : <div className="text-[12.5px] text-ink-3">Not used on any page yet.</div>}
              {!!p.templates.length && <div className="flex flex-wrap gap-1.5 mt-1.5">{p.templates.map((t) => <Link key={t.id} href={`${p.base}/templates?template=${t.id}`} className="inline-flex items-center border border-line-2 rounded-full px-2.5 py-1 text-[12.5px] hover:bg-surface-2">Template: {t.name}</Link>)}</div>}</div>
            <table className="w-full text-[13.5px] border border-line"><thead><tr className="text-left text-[11.5px] uppercase tracking-[.06em] text-ink-3"><th className="p-3 border-b border-line-2">Field</th><th className="p-3 border-b border-line-2">API key</th><th className="p-3 border-b border-line-2">Type</th><th className="p-3 border-b border-line-2">Required</th><th className="p-3 border-b border-line-2">Localised</th><th className="border-b border-line-2" /></tr></thead>
              <tbody>{md.fields.map((f, i) => <tr key={f.k}><td className="p-3 border-b border-line font-semibold">{f.l}</td><td className="p-3 border-b border-line font-mono text-[12.5px]">{f.k}</td><td className="p-3 border-b border-line"><span className="inline-block bg-surface-3 border border-line rounded px-1.5 py-0.5 text-[12px]">{f.t}</span></td>
                <td className="p-3 border-b border-line">{locked ? (f.req ? <Pill status="published" label="Yes" /> : <span className="text-ink-4">—</span>) : <Toggle on={!!f.req} disabled={busy} title="Toggle required" onClick={() => toggle(i, "req")} />}</td>
                <td className="p-3 border-b border-line">{locked ? (f.loc ? <Pill status="approved" label="Yes" /> : <span className="text-ink-4">—</span>) : <Toggle on={!!f.loc} disabled={busy} title="Toggle localised" onClick={() => toggle(i, "loc")} />}</td>
                <td className="p-3 border-b border-line text-right whitespace-nowrap">{!locked && <><button className="btn btn-quiet btn-sm" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button><button className="btn btn-quiet btn-sm" disabled={busy || i === md.fields.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button><button className="btn btn-quiet btn-sm" disabled={busy} onClick={() => remove(i)}>Remove</button></>}</td></tr>)}
                {!md.fields.length && <tr><td colSpan={6} className="p-3 text-ink-3">No fields yet. Add the first one below.</td></tr>}</tbody></table>
            {!locked && <AddField key={md.id + ":" + md.version} busy={busy} onAdd={addField} />}
          </>}
        </section>
      </div>
      {newOpen && canManage && <NewModel busy={busy} onClose={() => setNewOpen(false)} onCreate={create} />}
      {toast && <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] z-50">{toast}</div>}
    </div>
  );
}

function AddField({ busy, onAdd }: { busy: boolean; onAdd: (f: ModelField) => Promise<boolean | undefined> }) {
  const [l, setL] = useState(""); const [k, setK] = useState(""); const [touched, setTouched] = useState(false); const [t, setT] = useState(FIELD_TYPES[0]); const [req, setReq] = useState(false); const [loc, setLoc] = useState(false);
  const key = k.trim() || camel(l);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!l.trim() || !key) return; if (await onAdd({ k: key, l: l.trim(), t, req, loc })) { setL(""); setK(""); setTouched(false); setReq(false); setLoc(false); } };
  return <form onSubmit={submit} className="mt-4 grid grid-cols-[1fr_1fr_170px_auto_auto_auto] gap-3 items-end bg-surface-2 border border-line rounded-lg p-3.5">
    <label className="text-xs text-ink-3">Field label<input className={`${inp} mt-1`} value={l} onChange={(e) => { setL(e.target.value); if (!touched) setK(camel(e.target.value)); }} placeholder="e.g. Interest rate" required /></label>
    <label className="text-xs text-ink-3">API key<input className={`${inp} mt-1 font-mono`} value={k} onChange={(e) => { setK(e.target.value); setTouched(true); }} placeholder="interestRate" /></label>
    <label className="text-xs text-ink-3">Type<select className={`${inp} mt-1`} value={t} onChange={(e) => setT(e.target.value)}>{FIELD_TYPES.map((x) => <option key={x}>{x}</option>)}</select></label>
    <label className="flex items-center gap-1.5 text-[13px] pb-2"><input type="checkbox" checked={req} onChange={(e) => setReq(e.target.checked)} /> Required</label>
    <label className="flex items-center gap-1.5 text-[13px] pb-2"><input type="checkbox" checked={loc} onChange={(e) => setLoc(e.target.checked)} /> Localised</label>
    <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !l.trim()}>＋ Add field</button>
  </form>;
}

function NewModel({ busy, onClose, onCreate }: { busy: boolean; onClose: () => void; onCreate: (name: string, first?: ModelField) => void }) {
  const [name, setName] = useState(""); const [fl, setFl] = useState(""); const [ft, setFt] = useState(FIELD_TYPES[0]); const id = slugify(name);
  return <div className="fixed inset-0 bg-black/45 grid place-items-center z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-labelledby="nm" className="bg-surface rounded-xl w-[min(520px,94vw)] shadow-2xl">
      <header className="px-6 pt-5 pb-3 flex items-center"><h2 id="nm" className="text-lg font-semibold">New content model</h2><button className="ml-auto w-8 h-8 rounded text-ink-3 hover:bg-surface-3" onClick={onClose} aria-label="Close">×</button></header>
      <div className="px-6 pb-2 grid gap-3">
        <label className="text-xs text-ink-3">Model name<input autoFocus className={`${inp} mt-1`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Branch" /></label>
        <div className="font-mono text-[12px] text-ink-3">API id: {id || "…"} · endpoint /v1/models/{id || "…"} · group: Core</div>
        <div className="grid grid-cols-[1fr_170px] gap-3"><label className="text-xs text-ink-3">First field (optional)<input className={`${inp} mt-1`} value={fl} onChange={(e) => setFl(e.target.value)} placeholder="e.g. Name" /></label><label className="text-xs text-ink-3">Type<select className={`${inp} mt-1`} value={ft} onChange={(e) => setFt(e.target.value)}>{FIELD_TYPES.map((x) => <option key={x}>{x}</option>)}</select></label></div>
      </div>
      <footer className="px-6 pb-5 pt-3 flex justify-end gap-2"><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!id || busy} onClick={() => onCreate(name, fl.trim() ? { k: camel(fl), l: fl.trim(), t: ft, req: false, loc: false } : undefined)}>{busy ? "Creating…" : "Create and add fields"}</button></footer>
    </div></div>;
}

/** What authors see: disabled controls generated per field type. */
function FormPreview({ md, locales }: { md: Model; locales: string[] }) {
  const ctl = (f: ModelField) => { switch (f.t) {
    case "Rich text": return <textarea rows={3} disabled className={inp} placeholder="Rich text editor" />;
    case "Date": return <input type="date" disabled className={inp} />;
    case "Number": case "Decimal": return <input type="number" disabled className={inp} placeholder="0" />;
    case "Enum": return <select disabled className={inp}><option>Choose…</option></select>;
    case "Multi-select": return <div className="inline-flex border border-line-2 rounded-md overflow-hidden text-[13px]">{["Option A", "Option B", "Option C"].map((o, i) => <button type="button" key={o} disabled className={`px-3 py-1.5 ${i === 0 ? "bg-ink text-white" : "bg-surface"}`}>{o}</button>)}</div>;
    case "Asset": return <div className="flex gap-3 items-center border border-line-2 rounded-md p-2.5"><div className="w-16 h-12 bg-surface-3 rounded" /><div><b className="block text-[13px]">Choose an image</b><small className="text-ink-3">from the asset library</small><div className="mt-1.5"><span className="btn btn-sm">Change image</span></div></div></div>;
    case "Reference": return <select disabled className={inp}><option>Pick a {f.k === "template" ? "template" : "content item"}…</option></select>;
    case "Form reference": return <select disabled className={inp}><option>Pick a form…</option></select>;
    case "List": return <div className="grid gap-2"><div className="border border-line-2 rounded-md p-2.5"><b className="block text-[12.5px] mb-1">Item 1</b><label className="text-xs text-ink-3">Value<input disabled className={`${inp} mt-1`} /></label></div><span className="btn btn-sm justify-center">+ Add item</span></div>;
    case "Blocks": return <div className="p-3.5 text-center text-ink-3 border border-dashed border-line-2 rounded-lg text-[13px]">Blocks are edited on the page canvas</div>;
    case "Group": return <div className="border border-line-2 rounded-md p-2.5 grid gap-2"><label className="text-xs text-ink-3">Label<input disabled className={`${inp} mt-1`} /></label><label className="text-xs text-ink-3">Link<input disabled className={`${inp} mt-1`} /></label></div>;
    default: return <input type="text" disabled className={inp} placeholder={f.l} />; } };
  return <div><div className="border border-line rounded-lg overflow-hidden"><div className="flex items-center gap-2 bg-surface-2 border-b border-line px-3.5 py-2 text-[13px]"><b>What authors see</b><span className="text-ink-3">generated from the fields of {md.name} · {md.fields.length} field{md.fields.length === 1 ? "" : "s"}</span></div>
    <div className="p-3.5 grid gap-3 max-w-[560px]">{md.fields.length ? md.fields.map((f) => f.t === "Boolean" ? <div key={f.k} className="flex items-center justify-between text-[13px]"><span>{f.l}</span><span className="w-9 h-5 rounded-full bg-good relative"><span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white" /></span></div>
      : <div key={f.k}><label className="text-xs text-ink-3 block mb-1">{f.l}{f.req && <small className="ml-1.5 text-accent">required</small>}{f.loc && <small className="ml-1.5 text-info">localised</small>}</label>{ctl(f)}</div>) : <div className="text-ink-3 text-[13px]">No fields yet.</div>}</div></div>
    <p className="text-[12.5px] text-ink-3 mt-2">Required fields block “Send for review”. Localised fields get one value per locale ({locales.join(", ")}).</p></div>;
}

/** Block type rendered with default content, scaled to fit the card. */
function BlockPreview({ type }: { type: string }) {
  const outer = useRef<HTMLDivElement>(null); const inner = useRef<HTMLDivElement>(null); const [box, setBox] = useState({ scale: 0.6, h: 300 });
  useEffect(() => { const fit = () => { if (!outer.current || !inner.current) return; const s = Math.min(1, outer.current.clientWidth / 1200); setBox({ scale: s, h: inner.current.offsetHeight * s }); }; fit(); const ro = new ResizeObserver(fit); if (outer.current) ro.observe(outer.current); if (inner.current) ro.observe(inner.current); return () => ro.disconnect(); }, [type]);
  const [b] = useState(() => makeBlock(type));
  return <div><div ref={outer} className="overflow-hidden bg-surface-3 border border-line rounded-lg p-3" style={{ height: box.h + 24 }}><div ref={inner} className="site desktop" style={{ transform: `scale(${box.scale})`, transformOrigin: "top left", margin: 0 }}><RenderBlock b={b} /></div></div>
    <p className="text-[12.5px] text-ink-3 mt-2">Rendered with the block’s default content. Fields map one-to-one to what authors edit in the Page Builder.</p></div>;
}

/** Core-model relationship diagram (SVG). Click a box to open that model. */
function Diagram({ models, selected, link }: { models: Model[]; selected: string; link: (id: string) => string }) {
  const router = useRouter();
  const BW = 210, COLS = 3, CW = 260, RH = 230; const BH = (m: Model) => 34 + Math.min(m.fields.length, 8) * 18 + 8;
  const pos: Record<string, { x: number; y: number }> = {}; models.forEach((m, i) => { pos[m.id] = { x: 20 + (i % COLS) * CW, y: 20 + Math.floor(i / COLS) * RH }; });
  const refs: [string, string, string][] = []; models.forEach((m) => m.fields.forEach((f) => { if (f.t === "Reference" || f.t === "Blocks") { const tgt = f.k === "relatedProducts" || f.k === "product" ? "product" : f.k === "landingPage" || f.k === "blocks" ? "page" : null; if (tgt && pos[tgt] && tgt !== m.id) refs.push([m.id, tgt, f.l]); } }));
  const W = 20 + Math.min(models.length, COLS) * CW, H = 20 + Math.ceil(models.length / COLS) * RH;
  const byId = (id: string) => models.find((m) => m.id === id)!;
  return <div><div className="border border-line rounded-lg bg-surface-2 overflow-auto"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Content model diagram" className="w-full max-w-[900px] block" style={{ fontFamily: "var(--font-sans)" }}>
    {refs.map(([a, b, l], i) => { const pa = pos[a], pb = pos[b]; const x1 = pa.x + BW / 2, y1 = pa.y + BH(byId(a)) / 2, x2 = pb.x + BW / 2, y2 = pb.y + BH(byId(b)) / 2; return <g key={i}><path d={`M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`} fill="none" stroke="#DB0011" strokeWidth={1.5} strokeDasharray="4 3" /><circle cx={x2} cy={y2} r={4} fill="#DB0011" /><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize={10.5} fill="#DB0011">{l}</text></g>; })}
    {models.map((m) => { const q = pos[m.id]; const on = m.id === selected; return <g key={m.id} role="link" tabIndex={0} aria-label={`Open ${m.name}`} style={{ cursor: "pointer" }} onClick={() => router.push(link(m.id))} onKeyDown={(e) => { if (e.key === "Enter") router.push(link(m.id)); }}>
      <rect x={q.x} y={q.y} width={BW} height={BH(m)} fill="#fff" stroke={on ? "#DB0011" : "#D7D8DC"} strokeWidth={on ? 2 : 1} /><rect x={q.x} y={q.y} width={BW} height={28} fill={on ? "#DB0011" : "#17181C"} />
      <text x={q.x + 10} y={q.y + 19} fontSize={13} fontWeight={600} fill="#fff">{m.name} <tspan fontWeight={400} fontSize={11} fill="#ffffffb3">v{m.version}</tspan></text>
      {m.fields.slice(0, 8).map((f, i) => <text key={f.k} x={q.x + 10} y={q.y + 46 + i * 18} fontSize={11.5} fill="#40434C">{f.req ? "● " : "○ "}{f.l}<tspan fill="#9DA1AC" fontFamily="var(--font-mono)" fontSize={10.5}> {f.t}</tspan></text>)}
      {m.fields.length > 8 && <text x={q.x + 10} y={q.y + 46 + 8 * 18} fontSize={11} fill="#9DA1AC">+{m.fields.length - 8} more</text>}</g>; })}
  </svg></div>
    <div className="flex flex-wrap gap-4 text-[12.5px] text-ink-3 mt-2"><span>● required field</span><span>○ optional</span><span className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-0.5 bg-accent" />reference between models</span><span>Click a model to open it</span></div></div>;
}
