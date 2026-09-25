"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Model, ModelField, ModelVersion } from "@/lib/ucp/types";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { diffFields } from "@/lib/ucp/schema";
import { useSession } from "@/components/shell/Session";
import { FolderList, type FolderItem } from "@/components/ui/FolderList";
import { Menu } from "@/components/ui/Menu";
import { Avatar } from "@/components/ui/Avatar";
import { Json } from "@/components/ui/Json";
import { Pill } from "@/components/ui/Pill";
import { FieldList, FieldPanel, DocsTable } from "./FieldEditor";
import { ModelInfoForm, StatusPill, DiffView, PublishModal, UnsavedModal, CreateWizard, metaOf, type ModelMeta } from "./ModelDialogs";
import { Diagram, FormPreview, BlockPreview } from "./ModelPreviews";
import { useUnsaved } from "./useUnsaved";
import { isAdminUser, isBlockModel, relTime, whoName, type ModelTab, type UsedPage } from "./fieldMeta";
export type { ModelTab, UsedPage } from "./fieldMeta";
export { camel } from "./fieldMeta";

type Props = { base: string; marketId: string; marketName: string; marketRoot: string; locales: string[]; models: Model[]; selectedId: string; tab: ModelTab; group: string; usage: Record<string, UsedPage[]>; templatesByModel: Record<string, { id: string; name: string }[]>; names: Record<string, string>; versions: ModelVersion[]; schema: unknown; config: unknown; viewerId: string };
type Sort = "name" | "modified" | "status" | "fields";
const STATUS_ORDER: Record<Model["status"], number> = { draft: 0, modified: 1, published: 2 };
const modelLink = (base: string, id: string, tab: ModelTab = "fields") => `${base}/models?model=${encodeURIComponent(id)}${tab !== "fields" ? `&tab=${tab}` : ""}`;
const DOT: Record<Model["status"], { c: string; t: string }> = { draft: { c: "var(--neutral)", t: "Draft · never published" }, published: { c: "var(--good)", t: "Published · draft matches the published schema" }, modified: { c: "#E9A23B", t: "Modified · draft differs from the published schema" } };
const Dot = ({ status }: { status: Model["status"] }) => <span className="w-2 h-2 rounded-full flex-none" style={{ background: DOT[status].c }} title={DOT[status].t} aria-label={DOT[status].t} role="img" />;
const ModelIcon = ({ m, big }: { m: Pick<Model, "icon" | "group" | "id">; big?: boolean }) => { const block = isBlockModel(m); return <span className={`grid place-items-center rounded-md flex-none ${big ? "w-10 h-10 text-[20px]" : "w-6 h-6 text-[12px]"} ${block ? "bg-info-soft text-info" : "bg-accent-soft text-accent"}`} aria-hidden>{m.icon || (block ? "▤" : "▦")}</span>; };
/** Relative time with the full timestamp on hover; suppressHydrationWarning because the server renders it in UTC and "x min ago" drifts. */
const When = ({ iso, prefix = "", suffix = "" }: { iso?: string; prefix?: string; suffix?: string }) => { const t = relTime(iso); return <span suppressHydrationWarning title={t.full}>{prefix}{t.rel}{suffix}</span>; };
const Toast = ({ text }: { text: string }) => <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] shadow-xl z-[60]">{text}</div>;

export function Models(p: Props) {
  const router = useRouter(); const { user } = useSession(); const isAdmin = isAdminUser(user);
  const md = p.models.find((m) => m.id === p.selectedId);
  const [q, setQ] = useState(""); const [toast, setToast] = useState(""); const [wizard, setWizard] = useState(false); const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(false); const saveRef = useRef<(() => Promise<boolean>) | null>(null); const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2800); return () => clearTimeout(t); }, [toast]);
  useUnsaved(dirty);
  const say = (t: string) => setToast(t);
  /** In-app navigation that respects unsaved changes: asks first when the editor is dirty. */
  const go = (href: string) => { if (dirty) setPending(href); else router.push(href); };
  const groups = useMemo(() => [...new Set(p.models.map((m) => m.group))].sort((a, b) => (a === "Block types") === (b === "Block types") ? a.localeCompare(b) : a === "Block types" ? 1 : -1), [p.models]);

  async function run<T>(label: string, fn: () => Promise<T>, after?: (r: T) => void) { setBusy(label); try { const r = await fn(); after?.(r); router.refresh(); } catch (e) { say(errorText(e)); } finally { setBusy(""); } }
  const duplicate = (m: Model) => run("dup", () => ucpApi.duplicateModel(p.marketId, m.id), (n) => { say(`Duplicated as “${n.name}” (draft)`); go(modelLink(p.base, n.id)); });
  const publishQuick = (m: Model) => { if (!confirm(`Publish ${m.name} v${m.version}? Open the editor to review the changes first if you are unsure.`)) return; run("pub", () => ucpApi.publishModel(p.marketId, m.id), (n) => say(`Published ${n.name} v${n.version}`)); };
  const remove = (m: Model) => { if (!confirm(`Delete content model “${m.name}”? Content using it keeps its data but loses validation. This cannot be undone.`)) return; run("del", () => ucpApi.deleteModel(p.marketId, m.id), () => { say(`Deleted ${m.name}`); if (md?.id === m.id) { setDirty(false); router.push(`${p.base}/models`); } }); };

  /* ---- tree ---- */
  const ql = q.trim().toLowerCase();
  const match = (m: Model) => !ql || m.name.toLowerCase().includes(ql) || m.id.includes(ql) || (m.displayName ?? "").toLowerCase().includes(ql);
  const items: FolderItem[] = groups.map((g) => { const all = p.models.filter((m) => m.group === g); const shown = all.filter(match); return { key: g, label: g, count: all.length, open: !!ql || all.some((m) => m.id === md?.id) || g !== "Block types", onClick: () => go(`${p.base}/models?group=${encodeURIComponent(g)}`), active: false,
    children: shown.map((m): FolderItem => ({ key: m.id, label: m.name, icon: <ModelIcon m={m} />, active: m.id === md?.id, title: `${m.name} · ${m.status} · v${m.version}`, onClick: () => go(modelLink(p.base, m.id)),
      right: <span className="flex items-center gap-1 pr-1.5 flex-none"><Dot status={m.status} />{isAdmin && <span className={`${m.id === md?.id ? "" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"}`}><Menu label="⋯" ariaLabel={`Actions for ${m.name}`} buttonClassName="w-6 h-6 rounded grid place-items-center text-ink-3 hover:bg-surface-3 text-[14px] leading-none" items={[{ id: "edit", label: "Edit", onSelect: () => go(modelLink(p.base, m.id)) }, { id: "dup", label: "Duplicate", onSelect: () => duplicate(m) }, { id: "pub", label: "Publish", disabled: isBlockModel(m) || m.status === "published", onSelect: () => publishQuick(m) }, { id: "del", label: "Delete", danger: true, disabled: isBlockModel(m), onSelect: () => remove(m) }]} /></span>}</span> })) }; }).filter((g) => !ql || g.children!.length);

  const onCreated = (m: Model, published: boolean) => { setWizard(false); say(published ? `Created and published ${m.name} v${m.version}` : "Created as draft"); router.push(modelLink(p.base, m.id)); router.refresh(); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] grid-rows-[auto_1fr] md:grid-rows-1 h-full min-h-0">
      <aside className="bg-surface border-b md:border-b-0 md:border-r border-line p-3 md:overflow-auto">
        <h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold px-2 mb-2">Content models</h6>
        <label className="flex items-center gap-2 border border-line-2 rounded-md px-2.5 py-1.5 mb-2 bg-surface"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px] bg-transparent min-w-0" placeholder="Find a model" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a model" /></label>
        <FolderList root={{ label: "All models", count: p.models.length, active: !md, onClick: () => go(`${p.base}/models`) }} items={items} extra={ql && !items.length ? <div className="text-[12.5px] text-ink-4 px-2 py-1">No model matches “{q}”</div> : undefined} />
        {isAdmin && <button className="btn btn-quiet btn-sm mt-2.5 ml-1" onClick={() => setWizard(true)}>＋ Create content model</button>}
      </aside>
      <div className="overflow-auto min-w-0 min-h-0">
        {md
          ? <Editor key={`${md.id}:${md.version}:${md.lastModified ?? ""}:${md.status}`} p={p} md={md} isAdmin={isAdmin} go={go} say={say} setDirty={setDirty} saveRef={saveRef} onDuplicate={() => duplicate(md)} onDelete={() => remove(md)} />
          : <Overview key={p.group} p={p} isAdmin={isAdmin} go={go} onCreate={() => setWizard(true)} />}
      </div>
      {wizard && isAdmin && <CreateWizard models={p.models} marketId={p.marketId} onClose={() => setWizard(false)} onDone={onCreated} />}
      {pending && <UnsavedModal busy={busy === "guard"} onStay={() => setPending(null)} onDiscard={() => { const h = pending; setPending(null); setDirty(false); router.push(h); }} onSave={async () => { setBusy("guard"); const ok = await saveRef.current?.(); setBusy(""); if (ok) { const h = pending; setPending(null); setDirty(false); router.push(h); } }} />}
      {toast && <Toast text={toast} />}
    </div>
  );
}

/* ---------------- overview list ---------------- */
function Th({ k, s, d, on, children, className = "" }: { k?: Sort; s?: Sort; d?: "asc" | "desc"; on?: (k: Sort) => void; children: React.ReactNode; className?: string }) {
  const active = !!k && s === k;
  return <th className={`px-4 py-2.5 border-b border-line ${className}`} aria-sort={k ? (active ? (d === "asc" ? "ascending" : "descending") : "none") : undefined}>{k ? <button type="button" onClick={() => on?.(k)} className={`inline-flex items-center gap-1 uppercase tracking-[.08em] text-[11px] hover:text-ink ${active ? "text-ink font-semibold" : ""}`}>{children}<span aria-hidden className={`text-[10px] ${active ? "opacity-100" : "opacity-30"}`}>{active && d === "desc" ? "▼" : "▲"}</span></button> : children}</th>;
}
function Overview({ p, isAdmin, go, onCreate }: { p: Props; isAdmin: boolean; go: (href: string) => void; onCreate: () => void }) {
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [group, setGroup] = useState(p.group); const [sort, setSort] = useState<Sort>("name"); const [dir, setDir] = useState<"asc" | "desc">("asc");
  const groups = [...new Set(p.models.map((m) => m.group))];
  const rows = useMemo(() => { const s = q.trim().toLowerCase();
    const r = p.models.filter((m) => (!status || m.status === status) && (!group || m.group === group) && (!s || `${m.name} ${m.id} ${m.displayName ?? ""} ${m.description ?? ""}`.toLowerCase().includes(s)));
    const cmp = (a: Model, b: Model) => sort === "modified" ? (b.lastModified ?? "").localeCompare(a.lastModified ?? "") || a.name.localeCompare(b.name) : sort === "status" ? STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name) : sort === "fields" ? b.fields.length - a.fields.length || a.name.localeCompare(b.name) : a.name.localeCompare(b.name);
    return r.sort((a, b) => (dir === "asc" ? cmp(a, b) : -cmp(a, b))); }, [p.models, q, status, group, sort, dir]);
  const sortBy = (k: Sort) => { if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc")); else { setSort(k); setDir("asc"); } };
  const filtered = !!(q || status || group); const sel = "border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] bg-surface";
  return <div className="p-7">
    <div className="flex flex-wrap items-end gap-4 mb-5"><div><h1 className="text-2xl font-semibold">Content models</h1><p className="text-ink-3 text-[13px] mt-1">The structure behind every page, content item and block · {p.models.length} model{p.models.length === 1 ? "" : "s"}</p></div>
      <div className="ml-auto flex gap-2 items-center">{isAdmin ? <button className="btn btn-primary" onClick={onCreate}>＋ Create content model</button> : <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 bg-surface-3 border border-line rounded-full px-3 py-1.5" title="Only site admins can change content models."><span aria-hidden="true">🔒</span>Read-only · documentation view</span>}</div></div>
    {p.models.length > 0 && <div className="flex flex-wrap items-center gap-2 mb-3">
      <label className="flex items-center gap-2 bg-surface border border-line-2 rounded-md px-2.5 py-1.5 min-w-[260px]"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px]" placeholder="Search models" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search models" /></label>
      <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="modified">Modified</option></select>
      <select className={sel} value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Category"><option value="">All categories</option>{groups.map((g) => <option key={g}>{g}</option>)}</select>
      <select className={sel} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by"><option value="name">Sort: name</option><option value="modified">Sort: last modified</option><option value="status">Sort: status</option><option value="fields">Sort: fields</option></select>
      <span className="ml-auto text-[12.5px] text-ink-3">{rows.length} of {p.models.length}</span></div>}
    {rows.length ? <div className="bg-surface border border-line rounded-xl overflow-hidden"><div className="overflow-auto"><table className="w-full text-[13.5px] min-w-[900px]">
      <thead className="bg-surface-2"><tr className="text-left text-[11px] uppercase tracking-[.08em] text-ink-3"><Th k="name" s={sort} d={dir} on={sortBy}>Model</Th><Th k="status" s={sort} d={dir} on={sortBy} className="w-[120px]">Status</Th><Th k="fields" s={sort} d={dir} on={sortBy} className="w-[80px]">Fields</Th><Th className="w-[100px]">Published</Th><Th k="modified" s={sort} d={dir} on={sortBy} className="w-[150px]">Last modified</Th><Th className="w-[170px]">By</Th><Th className="w-[150px]">Used on</Th></tr></thead>
      <tbody>{rows.map((m) => { const used = p.usage[m.id] ?? []; const tpl = p.templatesByModel[m.id] ?? []; const by = m.lastModifiedBy ? whoName(m.lastModifiedBy, p.names) : ""; const href = modelLink(p.base, m.id);
        return <tr key={m.id} className="hover:bg-surface-2 cursor-pointer border-t border-line" onClick={() => go(href)}>
          <td className="px-4 py-3"><div className="flex items-center gap-2.5 min-w-0"><ModelIcon m={m} /><div className="min-w-0"><Link href={href} onClick={(e) => { e.preventDefault(); go(href); }} className="font-semibold hover:underline">{m.name}</Link><span className="font-mono text-[11.5px] text-ink-3 ml-2">{m.id}</span>{m.locked && <span className="ml-2 text-[10.5px] uppercase tracking-[.06em] text-ink-4" title="Translated from the Sling component dialog; read-only">read-only</span>}{m.description && <div className="text-[12.5px] text-ink-3 truncate max-w-[420px]">{m.description}</div>}</div></div></td>
          <td className="px-4 py-3"><StatusPill status={m.status} /></td>
          <td className="px-4 py-3 font-mono tabular-nums">{m.fields.length}</td>
          <td className="px-4 py-3 font-mono text-[12.5px]">{m.publishedVersion ? `v${m.publishedVersion}` : <span className="text-ink-4">—</span>}</td>
          <td className="px-4 py-3 text-ink-2"><When iso={m.lastModified} /></td>
          <td className="px-4 py-3">{by ? <span className="inline-flex items-center gap-2"><Avatar name={by} size={22} /><span className="text-[13px] truncate">{m.lastModifiedBy === p.viewerId ? "You" : by}</span></span> : <span className="text-ink-4">—</span>}</td>
          <td className="px-4 py-3 text-ink-2 text-[12.5px]">{used.length} page{used.length === 1 ? "" : "s"}{tpl.length ? ` · ${tpl.length} template${tpl.length === 1 ? "" : "s"}` : ""}</td>
        </tr>; })}</tbody></table></div></div>
      : <div className="p-12 text-center bg-surface border border-dashed border-line-2 rounded-xl">{filtered ? <><b className="block text-[15px]">No models match</b><p className="text-ink-3 text-[13px] mt-1"><button className="underline text-ink" onClick={() => { setQ(""); setStatus(""); setGroup(""); }}>Clear filters</button></p></>
        : isAdmin ? <><b className="block text-[15px]">No Content Models yet</b><p className="text-ink-3 text-[13px] mt-1 mb-4">Create your first Content Model to define the structure of your content.</p><button className="btn btn-primary" onClick={onCreate}>＋ Create content model</button></> : <><b className="block text-[15px]">No Content Models available.</b><p className="text-ink-3 text-[13px] mt-1">Ask a site admin to define the first one.</p></>}</div>}
  </div>;
}

/* ---------------- editor ---------------- */
type EditorProps = { p: Props; md: Model; isAdmin: boolean; go: (href: string) => void; say: (t: string) => void; setDirty: (d: boolean) => void; saveRef: React.MutableRefObject<(() => Promise<boolean>) | null>; onDuplicate: () => void; onDelete: () => void };
function Editor({ p, md, isAdmin, go, say, setDirty, saveRef, onDuplicate, onDelete }: EditorProps) {
  const router = useRouter();
  const block = isBlockModel(md); const editable = isAdmin && !block;
  const [tab, setTabState] = useState<ModelTab>(p.tab);
  const setTab = (t: ModelTab) => { setTabState(t); window.history.replaceState(null, "", modelLink(p.base, md.id, t)); };
  const [meta, setMeta] = useState<ModelMeta>(() => metaOf(md)); const [fields, setFields] = useState<ModelField[]>(md.fields);
  const initial = useMemo(() => JSON.stringify({ meta: metaOf(md), fields: md.fields }), [md]);
  const dirty = editable && JSON.stringify({ meta, fields }) !== initial;
  const fieldsChanged = JSON.stringify(fields) !== JSON.stringify(md.fields);
  const nextVersion = fieldsChanged && md.publishedVersion && md.version === md.publishedVersion ? md.version + 1 : md.version;
  const [busy, setBusy] = useState(""); const [panel, setPanel] = useState<{ index: number | null } | null>(null); const [publishOpen, setPublishOpen] = useState(false);
  useEffect(() => { setDirty(dirty); }, [dirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);
  const save = async (): Promise<boolean> => { setBusy("save"); try { const m = await ucpApi.saveModel(p.marketId, md.id, { name: meta.name.trim() || md.name, displayName: meta.displayName.trim(), description: meta.description.trim(), icon: meta.icon, group: meta.group.trim() || "Core", ...(fieldsChanged ? { fields } : {}) }); say(`Draft v${m.version} saved`); router.refresh(); return true; } catch (e) { say(errorText(e)); return false; } finally { setBusy(""); } };
  useEffect(() => { saveRef.current = save; return () => { saveRef.current = null; }; });
  const publish = async () => { setBusy("publish"); try { if (dirty) await ucpApi.saveModel(p.marketId, md.id, { name: meta.name.trim() || md.name, displayName: meta.displayName.trim(), description: meta.description.trim(), icon: meta.icon, group: meta.group.trim() || "Core", ...(fieldsChanged ? { fields } : {}) }); const m = await ucpApi.publishModel(p.marketId, md.id); setPublishOpen(false); say(`Published v${m.version}`); router.refresh(); } finally { setBusy(""); } };
  const restoreDraft = () => { if (!md.publishedFields) return; if (!confirm("Replace the draft fields with the published schema? Unsaved field changes are lost; nothing is saved until you click Save.")) return; setFields(md.publishedFields); };
  const used = p.usage[md.id] ?? []; const tpls = p.templatesByModel[md.id] ?? [];
  const TABS_UI: [ModelTab, string][] = [["fields", "Fields"], ["diagram", block ? "Rendered preview" : "Diagram"], ["form", "Form preview"], ["config", "Config"], ...(block ? [] : [["versions", "Versions"] as [ModelTab, string]])];
  const previewModel = { ...md, name: meta.name || md.name, fields };
  const chip = "inline-flex items-center gap-1 font-mono text-[11.5px] bg-surface-3 border border-line rounded px-1.5 py-0.5";

  return <div className="p-7">
    <div className="text-[13px] text-ink-3 mb-2 flex gap-1.5 flex-wrap"><Link href={`${p.base}/models`} onClick={(e) => { e.preventDefault(); go(`${p.base}/models`); }} className="hover:text-ink">Content models</Link><span className="text-ink-4">/</span><span>{md.group}</span><span className="text-ink-4">/</span><b className="text-ink">{md.name}</b></div>
    <div className="flex items-start gap-3 mb-4 flex-wrap"><ModelIcon m={{ ...md, icon: meta.icon || md.icon }} big /><div className="min-w-0">
      <div className="flex items-center gap-2.5 flex-wrap"><h1 className="text-2xl font-semibold leading-tight">{meta.name || md.name}</h1><StatusPill status={md.status} /><span className={chip} title="Draft version">v{md.version}</span>{md.publishedVersion && <span className={chip} title="Version served by the delivery API">Published: v{md.publishedVersion}</span>}{dirty && <span className="text-[11.5px] font-semibold text-warn bg-warn-soft rounded-full px-2 py-0.5">Unsaved changes</span>}</div>
      <p className="text-[13px] text-ink-3 mt-1 flex items-center gap-2 flex-wrap"><span className="font-mono">/v1/models/{md.id}</span><span>·</span><span>{md.source}</span>{md.lastModified && <><span>·</span><When iso={md.lastModified} prefix="Last modified " suffix={md.lastModifiedBy ? ` by ${md.lastModifiedBy === p.viewerId ? "you" : whoName(md.lastModifiedBy, p.names)}` : ""} /></>}</p></div>
      <div className="ml-auto flex gap-2 items-center flex-wrap">
        <Link className="btn btn-sm" href={`${p.base}/api?tab=models&model=${md.id}`} onClick={(e) => { e.preventDefault(); go(`${p.base}/api?tab=models&model=${md.id}`); }}>View JSON schema</Link>
        {isAdmin && <>{editable && <button className="btn" disabled={!dirty || !!busy} onClick={save}>{busy === "save" ? "Saving…" : "Save"}</button>}
          {editable && <button className="btn btn-primary" disabled={(md.status === "published" && !dirty) || !!busy} onClick={() => setPublishOpen(true)} title={md.status === "published" && !dirty ? "The published schema is up to date" : undefined}>Publish</button>}
          <Menu label="More ▾" ariaLabel="More actions" buttonClassName="btn" items={[{ id: "dup", label: "Duplicate", onSelect: onDuplicate }, { id: "restore", label: "Restore published schema into draft", disabled: !editable || !md.publishedFields, onSelect: restoreDraft }, { id: "del", label: "Delete", danger: true, disabled: !editable, onSelect: onDelete }]} /></>}
      </div></div>
    {block && <div className="bg-info-soft text-info px-3 py-2 rounded-md text-[12.5px] mb-3">This block type is translated from the Sling component dialog. Fields are read-only here; change the source dialog to update them.</div>}
    {!isAdmin && !block && <div className="bg-info-soft text-info px-3 py-2 rounded-md text-[12.5px] mb-3">Only site admins can change content models. This is the documentation view of the current draft.</div>}
    <div className="flex gap-1 border-b border-line mb-4" role="tablist">{TABS_UI.map(([t, l]) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`px-3 py-2 text-[13.5px] -mb-px border-b-2 ${tab === t ? "border-accent text-ink font-semibold" : "border-transparent text-ink-3 hover:text-ink"}`}>{l}</button>)}</div>

    {tab === "fields" && <div className="grid gap-4">
      <details open className="bg-surface border border-line rounded-lg"><summary className="cursor-pointer px-4 py-3 text-[13px] font-semibold select-none">Model information</summary>
        <div className="px-4 pb-4">{editable ? <ModelInfoForm value={meta} onChange={setMeta} groups={[...new Set(p.models.map((m) => m.group))]} status={md.status} />
          : <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-1.5 text-[13.5px]"><dt className="text-ink-3">Name</dt><dd>{md.name}</dd><dt className="text-ink-3">Display name</dt><dd>{md.displayName || <span className="text-ink-4">—</span>}</dd><dt className="text-ink-3">Description</dt><dd className="text-ink-2">{md.description || <span className="text-ink-4">—</span>}</dd><dt className="text-ink-3">Model ID</dt><dd className="font-mono text-[13px]">{md.id}</dd><dt className="text-ink-3">Category</dt><dd>{md.group}</dd><dt className="text-ink-3">Status</dt><dd><StatusPill status={md.status} /></dd></dl>}</div></details>
      {editable ? <FieldList fields={fields} onChange={setFields} onEdit={(i) => setPanel({ index: i })} onAdd={() => setPanel({ index: null })} /> : <DocsTable fields={md.fields} />}
      <div className="bg-surface border border-line rounded-lg p-4"><h4 className="text-[13px] font-semibold mb-1.5">Used on {used.length} page{used.length === 1 ? "" : "s"}{tpls.length ? ` · ${tpls.length} template${tpls.length === 1 ? "" : "s"}` : ""} <span className="font-normal text-ink-3">{p.marketName}</span></h4>
        {used.length ? <div className="flex flex-wrap gap-1.5">{used.slice(0, 12).map((u) => <Link key={u.path} href={`${p.base}/page${u.path.replace(p.marketRoot, "")}`} onClick={(e) => { e.preventDefault(); go(`${p.base}/page${u.path.replace(p.marketRoot, "")}`); }} className="inline-flex items-center gap-1.5 border border-line-2 rounded-full px-2.5 py-1 text-[12.5px] hover:bg-surface-2"><Pill status={u.status} />{u.title}</Link>)}{used.length > 12 && <span className="inline-flex items-center border border-line-2 rounded-full px-2.5 py-1 text-[12.5px] text-ink-3">+{used.length - 12} more</span>}</div> : <div className="text-[12.5px] text-ink-3">Not used on any page yet.</div>}
        {!!tpls.length && <div className="flex flex-wrap gap-1.5 mt-1.5">{tpls.map((t) => <Link key={t.id} href={`${p.base}/templates?template=${t.id}`} onClick={(e) => { e.preventDefault(); go(`${p.base}/templates?template=${t.id}`); }} className="inline-flex items-center border border-line-2 rounded-full px-2.5 py-1 text-[12.5px] hover:bg-surface-2">Template: {t.name}</Link>)}</div>}</div>
    </div>}
    {tab === "diagram" && (block ? <BlockPreview type={md.id.slice(6)} /> : <Diagram models={p.models.filter((m) => !isBlockModel(m)).map((m) => (m.id === md.id ? previewModel : m))} selected={md.id} onOpen={(id) => { if (id !== md.id) go(modelLink(p.base, id, "diagram")); }} />)}
    {tab === "form" && <FormPreview md={previewModel} fields={fields} locales={p.locales} />}
    {tab === "config" && <div><div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3.5"><div><h4 className="text-[13px] font-semibold mb-1.5">UCP configuration <span className="font-normal text-ink-3">{block ? "translated from the Sling dialog" : "content model definition"}</span></h4><Json value={p.config} maxHeight={420} label="configuration" /></div><div><h4 className="text-[13px] font-semibold mb-1.5">JSON Schema <span className="font-normal text-ink-3 font-mono">served at /v1/models/{md.id}</span></h4><Json value={p.schema} maxHeight={420} label="schema" /></div></div>{dirty && <p className="text-[12.5px] text-ink-3 mb-2">Shows the last saved draft. Save to refresh it with your changes.</p>}<Link className="btn btn-sm" href={`${p.base}/api?tab=models&model=${md.id}`} onClick={(e) => { e.preventDefault(); go(`${p.base}/api?tab=models&model=${md.id}`); }}>Open in API &amp; delivery</Link></div>}
    {tab === "versions" && !block && <VersionsTab p={p} md={md} current={fields} isAdmin={isAdmin} say={say} />}

    {panel && <FieldPanel models={p.models} taken={fields.map((f) => f.k).filter((k) => panel.index === null || k !== fields[panel.index].k)} initial={panel.index === null ? undefined : fields[panel.index]} onClose={() => setPanel(null)} onSubmit={(f) => { setFields(panel.index === null ? [...fields, f] : fields.map((x, i) => (i === panel.index ? f : x))); setPanel(null); }} />}
    {publishOpen && <PublishModal model={md} fields={fields} nextVersion={nextVersion} dirty={dirty} busy={busy === "publish"} onClose={() => setPublishOpen(false)} onPublish={publish} />}
  </div>;
}

/* ---------------- versions tab ---------------- */
function VersionsTab({ p, md, current, isAdmin, say }: { p: Props; md: Model; current: ModelField[]; isAdmin: boolean; say: (t: string) => void }) {
  const router = useRouter();
  const [versions, setVersions] = useState<ModelVersion[]>(p.versions); const [loading, setLoading] = useState(true); const [compare, setCompare] = useState<string | null>(null); const [busy, setBusy] = useState("");
  useEffect(() => { let on = true; ucpApi.modelVersions(md.id).then((v) => { if (on) setVersions(v); }).catch(() => {}).finally(() => { if (on) setLoading(false); }); return () => { on = false; }; }, [md.id]);
  const restore = async (v: ModelVersion) => { if (!confirm(`Restore version ${v.version} (${v.note}) into the draft? The published schema is not changed; you can review and publish afterwards.`)) return; setBusy(v.id); try { const m = await ucpApi.restoreModelVersion(p.marketId, md.id, v.id); say(`Restored v${v.version} into draft v${m.version}`); router.refresh(); } catch (e) { say(errorText(e)); } finally { setBusy(""); } };
  return <div className="grid gap-3">
    <div className="flex items-center gap-3 flex-wrap text-[13px]"><b>{md.publishedVersion && md.publishedVersion !== md.version ? `Published: v${md.publishedVersion} · Draft: v${md.version}` : md.publishedVersion ? `Published: v${md.publishedVersion}` : `Draft: v${md.version} · never published`}</b><span className="text-ink-3">{versions.length} snapshot{versions.length === 1 ? "" : "s"} · every saved draft and every publish keeps one</span>{loading && <span className="text-ink-4">refreshing…</span>}</div>
    {versions.length ? <div className="bg-surface border border-line rounded-xl overflow-hidden"><div className="overflow-auto"><table className="w-full text-[13.5px] min-w-[760px]"><thead className="bg-surface-2"><tr className="text-left text-[11px] uppercase tracking-[.08em] text-ink-3"><th className="px-4 py-2.5 border-b border-line w-[90px]">Version</th><th className="px-4 py-2.5 border-b border-line w-[110px]">State</th><th className="px-4 py-2.5 border-b border-line w-[200px]">Who</th><th className="px-4 py-2.5 border-b border-line w-[150px]">When</th><th className="px-4 py-2.5 border-b border-line">Note</th><th className="px-4 py-2.5 border-b border-line text-right w-[300px]"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{versions.map((v) => { const who = whoName(v.who, p.names); const on = compare === v.id; const diff = on ? diffFields(v.fields, current) : null; return <FragmentRow key={v.id} on={on} diff={diff}>
        <td className="px-4 py-3 font-mono">v{v.version}</td><td className="px-4 py-3">{v.published ? <Pill status="published" label="Published" /> : <Pill status="draft" label="Draft" />}</td>
        <td className="px-4 py-3"><span className="inline-flex items-center gap-2"><Avatar name={who} size={22} /><span>{v.who === p.viewerId ? "You" : who}</span></span></td><td className="px-4 py-3 text-ink-2"><When iso={v.time} /></td><td className="px-4 py-3 text-ink-2">{v.note} <span className="text-ink-4 font-mono text-[11.5px]">· {v.fields.length} field{v.fields.length === 1 ? "" : "s"}</span></td>
        <td className="px-4 py-3 text-right whitespace-nowrap"><button className={`btn btn-sm mr-1.5 ${on ? "on" : ""}`} aria-pressed={on} onClick={() => setCompare(on ? null : v.id)}>{on ? "Hide comparison" : "Compare with current"}</button>{isAdmin && <button className="btn btn-sm" disabled={!!busy} onClick={() => restore(v)}>{busy === v.id ? "Restoring…" : "Restore into draft"}</button>}</td>
      </FragmentRow>; })}</tbody></table></div></div>
      : <div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">{loading ? "Loading versions…" : "No snapshots yet. Save the draft or publish to create the first one."}</div>}
  </div>;
}
function FragmentRow({ on, diff, children }: { on: boolean; diff: ReturnType<typeof diffFields> | null; children: React.ReactNode }) {
  return <><tr className={`border-t border-line ${on ? "bg-accent-soft/30" : "hover:bg-surface-2"}`}>{children}</tr>{on && diff && <tr className="bg-surface-2"><td colSpan={6} className="px-4 py-3"><div className="mb-2"><DiffView diff={diff} compact /> <span className="text-[12px] text-ink-4">(this version → current draft)</span></div><DiffView diff={diff} /></td></tr>}</>;
}
