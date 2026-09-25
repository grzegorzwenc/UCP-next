"use client";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Model, ModelField, ModelVersion } from "@/lib/ucp/types";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { diffFields, byOrder } from "@/lib/ucp/schema";
import { useSession } from "@/components/shell/Session";
import { FolderList, type FolderItem } from "@/components/ui/FolderList";
import { MoveDialog } from "@/components/ui/MoveDialog";
import { Menu } from "@/components/ui/Menu";
import { Avatar } from "@/components/ui/Avatar";
import { Json } from "@/components/ui/Json";
import { Pill } from "@/components/ui/Pill";
import { FieldList, FieldPanel, DocsTable } from "./FieldEditor";
import { ModelInfoForm, StatusPill, DiffView, PublishModal, UnsavedModal, CreateWizard, metaOf, type ModelMeta } from "./ModelDialogs";
import { FormPreview, BlockPreview } from "./ModelPreviews";
import { ModelMap, type Relation } from "./ModelMap";
import { camel } from "./fieldMeta";
import { ModelDetail } from "./ModelDetail";
import { Dot, ModelIcon, When, Toast, chip, Crumbs } from "./bits";
import { useUnsaved } from "./useUnsaved";
import { isAdminUser, isBlockModel, whoName, detailLink, editLink, groupLink, type ModelTab, type UsedPage } from "./fieldMeta";
export type { ModelTab, UsedPage } from "./fieldMeta";
export { camel } from "./fieldMeta";

export type Props = { base: string; marketId: string; marketName: string; marketRoot: string; locales: string[]; models: Model[]; selectedId: string; tab: ModelTab; edit: boolean; group: string; usage: Record<string, UsedPage[]>; entityCounts: Record<string, number>; templatesByModel: Record<string, { id: string; name: string }[]>; names: Record<string, string>; versions: ModelVersion[]; schema: unknown; config: unknown; viewerId: string };
type Sort = "name" | "modified" | "status" | "fields";
const STATUS_ORDER: Record<Model["status"], number> = { draft: 0, modified: 1, published: 2 };

export function Models(p: Props) {
  const router = useRouter(); const { user } = useSession(); const isAdmin = isAdminUser(user);
  const md = p.models.find((m) => m.id === p.selectedId);
  const [q, setQ] = useState(""); const [toast, setToast] = useState(""); const [wizard, setWizard] = useState(false); const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(false); const saveRef = useRef<(() => Promise<boolean>) | null>(null); const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2800); return () => clearTimeout(t); }, [toast]);
  useUnsaved(dirty);
  const say = (t: string) => setToast(t);
  /** In-app navigation that respects unsaved changes: asks first when an editor is dirty. */
  const go = (href: string) => { if (dirty) setPending(href); else router.push(href); };
  const groups = useMemo(() => [...new Set(p.models.map((m) => m.group))].sort((a, b) => (a === "Block types") === (b === "Block types") ? a.localeCompare(b) : a === "Block types" ? 1 : -1), [p.models]);

  async function run<T>(label: string, fn: () => Promise<T>, after?: (r: T) => void) { setBusy(label); try { const r = await fn(); after?.(r); router.refresh(); } catch (e) { say(errorText(e)); } finally { setBusy(""); } }
  const duplicate = (m: Model) => run("dup", () => ucpApi.duplicateModel(p.marketId, m.id), (n) => { say(`Duplicated as “${n.name}” (draft)`); go(detailLink(p.base, n.id)); });
  const publishQuick = (m: Model) => { if (!confirm(`Publish ${m.name} v${m.version}? Open the editor to review the changes first if you are unsure.`)) return; run("pub", () => ucpApi.publishModel(p.marketId, m.id), (n) => say(`Published ${n.name} v${n.version}`)); };
  const [moving, setMoving] = useState<Model | null>(null);
  const canMove = (id: string) => { const m = p.models.find((x) => x.id === id); return !!m && !isBlockModel(m); };
  const moveTo = (id: string, group: string, before?: string) => { const m = p.models.find((x) => x.id === id); if (!m || (m.group === group && !before)) return; run("move", () => ucpApi.moveModel(p.marketId, id, { group, before }), (n) => say(n.group !== m.group ? `Moved ${n.name} to ${n.group}` : `Reordered ${n.group}`)); };
  const remove = (m: Model) => { if (!confirm(`Delete content model “${m.name}”? Content using it keeps its data but loses validation. This cannot be undone.`)) return; run("del", () => ucpApi.deleteModel(p.marketId, m.id), () => { say(`Deleted ${m.name}`); if (md?.id === m.id) { setDirty(false); router.push(`${p.base}/models`); } }); };

  /* ---- tree: categories → models (entities live in their own section) ---- */
  const ql = q.trim().toLowerCase();
  const matchModel = (m: Model) => !ql || m.name.toLowerCase().includes(ql) || m.id.includes(ql) || (m.displayName ?? "").toLowerCase().includes(ql);
  const modelItem = (m: Model): FolderItem | null => {
    if (ql && !matchModel(m)) return null;
    const on = m.id === md?.id;
    const movable = isAdmin && !isBlockModel(m);
    return { key: m.id, label: m.name, icon: <ModelIcon m={m} />, active: on, title: movable ? `${m.name} · ${m.status} · v${m.version} · drag to move` : `${m.name} · ${m.status} · v${m.version}`, onClick: () => go(detailLink(p.base, m.id)),
      dragId: movable ? m.id : undefined, onDrop: movable ? (id) => moveTo(id, m.group, m.id) : undefined, accepts: canMove,
      right: <span className="flex items-center gap-1 pr-1.5 flex-none"><Dot status={m.status} />{isAdmin && <span className={`${on ? "" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"}`}><Menu label="⋯" ariaLabel={`Actions for ${m.name}`} buttonClassName="w-6 h-6 rounded grid place-items-center text-ink-3 hover:bg-surface-3 text-[14px] leading-none" items={[{ id: "edit", label: "Edit model", disabled: isBlockModel(m), onSelect: () => go(editLink(p.base, m.id)) }, { id: "dup", label: "Duplicate", onSelect: () => duplicate(m) }, { id: "move", label: "Move to…", disabled: isBlockModel(m), onSelect: () => setMoving(m) }, { id: "pub", label: "Publish", disabled: isBlockModel(m) || m.status === "published", onSelect: () => publishQuick(m) }, { id: "del", label: "Delete", danger: true, disabled: isBlockModel(m), onSelect: () => remove(m) }]} /></span>}</span> };
  };
  const items: FolderItem[] = groups.map((g): FolderItem => { const all = p.models.filter((m) => m.group === g).sort(byOrder); const shown = all.map(modelItem).filter((x): x is FolderItem => !!x);
    return { key: `g:${g}`, label: g, count: all.length, open: !!ql || all.some((m) => m.id === md?.id) || p.group === g || g !== "Block types", onClick: () => go(groupLink(p.base, g)), active: !md && p.group === g, children: shown, onDrop: isAdmin && g !== "Block types" ? (id) => moveTo(id, g) : undefined, accepts: canMove }; }).filter((g) => !ql || g.children!.length);

  const onCreated = (m: Model, published: boolean) => { setWizard(false); say(published ? `Created and published ${m.name} v${m.version}` : "Created as draft"); router.push(detailLink(p.base, m.id)); router.refresh(); };

  let body: React.ReactNode;
  if (md && p.edit) body = <Editor key={`${md.id}:${md.version}:${md.lastModified ?? ""}:${md.status}`} p={p} md={md} isAdmin={isAdmin} go={go} say={say} setDirty={setDirty} saveRef={saveRef} onDuplicate={() => duplicate(md)} onDelete={() => remove(md)} />;
  else if (md) body = <ModelDetail p={p} md={md} isAdmin={isAdmin} go={go} />;
  else body = <Overview key={p.group} p={p} isAdmin={isAdmin} go={go} say={say} onCreate={() => setWizard(true)} />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] grid-rows-[auto_1fr] md:grid-rows-1 h-full min-h-0">
      <aside className="bg-surface border-b md:border-b-0 md:border-r border-line p-3 md:overflow-auto">
        <h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold px-2 mb-2">Content models</h6>{isAdmin && <p className="text-[11.5px] text-ink-4 px-2 -mt-1 mb-2">Drag a model onto a category to move it.</p>}
        <label className="flex items-center gap-2 border border-line-2 rounded-md px-2.5 py-1.5 mb-2 bg-surface"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px] bg-transparent min-w-0" placeholder="Find a model" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a model" /></label>
        <FolderList key={ql ? `q:${ql}` : `sel:${md?.id ?? ""}:${p.group}`} root={{ label: "All models", count: p.models.length, active: !md && !p.group, onClick: () => go(`${p.base}/models`) }} items={items} extra={ql && !items.length ? <div className="text-[12.5px] text-ink-4 px-2 py-1">Nothing matches “{q}”</div> : undefined} />
        {isAdmin && <button className="btn btn-quiet btn-sm mt-2.5 ml-1" onClick={() => setWizard(true)}>＋ Create content model</button>}
      </aside>
      <div className="overflow-auto min-w-0 min-h-0">{body}</div>
      {wizard && isAdmin && <CreateWizard models={p.models} marketId={p.marketId} onClose={() => setWizard(false)} onDone={onCreated} />}
      {pending && <UnsavedModal busy={busy === "guard"} onStay={() => setPending(null)} onDiscard={() => { const h = pending; setPending(null); setDirty(false); router.push(h); }} onSave={async () => { setBusy("guard"); const ok = await saveRef.current?.(); setBusy(""); if (ok) { const h = pending; setPending(null); setDirty(false); router.push(h); } }} />}
      {moving && <MoveDialog title={`Move ${moving.name}`} what={moving.name} current={moving.group} targets={groups.filter((g) => g !== "Block types").map((g) => ({ id: g, label: g, hint: `${p.models.filter((m) => m.group === g).length} models` }))} allowNew onClose={() => setMoving(null)}
        onMove={async (g) => { const n = await ucpApi.moveModel(p.marketId, moving.id, { group: g }); setMoving(null); say(`Moved ${n.name} to ${n.group}`); router.refresh(); }} />}
      {toast && <Toast text={toast} />}
    </div>
  );
}

/* ---------------- overview list / category ---------------- */
function Th({ k, s, d, on, children, className = "" }: { k?: Sort; s?: Sort; d?: "asc" | "desc"; on?: (k: Sort) => void; children: React.ReactNode; className?: string }) {
  const active = !!k && s === k;
  return <th className={`px-4 py-2.5 border-b border-line ${className}`} aria-sort={k ? (active ? (d === "asc" ? "ascending" : "descending") : "none") : undefined}>{k ? <button type="button" onClick={() => on?.(k)} className={`inline-flex items-center gap-1 uppercase tracking-[.08em] text-[11px] hover:text-ink ${active ? "text-ink font-semibold" : ""}`}>{children}<span aria-hidden className={`text-[10px] ${active ? "opacity-100" : "opacity-30"}`}>{active && d === "desc" ? "▼" : "▲"}</span></button> : children}</th>;
}
function Overview({ p, isAdmin, go, say, onCreate }: { p: Props; isAdmin: boolean; go: (href: string) => void; say: (t: string) => void; onCreate: () => void }) {
  const router = useRouter();
  const sp = useSearchParams(); const pathname = usePathname(); const view = sp.get("view") === "map" ? "map" : "table";
  const pickView = (v: "table" | "map") => { const n = new URLSearchParams(sp.toString()); if (v === "map") n.set("view", "map"); else n.delete("view"); router.replace(`${pathname}${n.size ? `?${n}` : ""}`, { scroll: false }); };
  const saveFields = async (m: Model, fields: ModelField[], msg: string) => { try { await ucpApi.saveModel(p.marketId, m.id, { fields }); say(msg); router.refresh(); } catch (e) { say(errorText(e)); } };
  const removeRel = (r: Relation) => { const m = p.models.find((x) => x.id === r.from); if (!m) return; const to = p.models.find((x) => x.id === r.to)?.name ?? r.to; if (!confirm(`Remove the connection ${m.name} → ${to}?`)) return; saveFields(m, m.fields.filter((f) => f.k !== r.key), `Removed the connection ${m.name} → ${to}`); };
  const cat = p.models.some((m) => m.group === p.group) ? p.group : "";
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [group, setGroup] = useState(cat); const [sort, setSort] = useState<Sort>("name"); const [dir, setDir] = useState<"asc" | "desc">("asc");
  const groups = [...new Set(p.models.map((m) => m.group))];
  const rows = useMemo(() => { const s = q.trim().toLowerCase();
    const r = p.models.filter((m) => (!status || m.status === status) && (!group || m.group === group) && (!s || `${m.name} ${m.id} ${m.displayName ?? ""} ${m.description ?? ""}`.toLowerCase().includes(s)));
    const cmp = (a: Model, b: Model) => sort === "modified" ? (b.lastModified ?? "").localeCompare(a.lastModified ?? "") || a.name.localeCompare(b.name) : sort === "status" ? STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name) : sort === "fields" ? b.fields.length - a.fields.length || a.name.localeCompare(b.name) : a.name.localeCompare(b.name);
    return r.sort((a, b) => (dir === "asc" ? cmp(a, b) : -cmp(a, b)));
  }, [p.models, q, status, group, sort, dir]);
  const sortBy = (k: Sort) => { if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc")); else { setSort(k); setDir("asc"); } };
  const filtered = !!(q || status || (group && group !== cat)); const sel = "border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] bg-surface";
  const inCat = cat ? p.models.filter((m) => m.group === cat).length : p.models.length;
  return <div className="p-7">
    {cat && <Crumbs items={[{ label: "Content models", href: `${p.base}/models`, onClick: () => go(`${p.base}/models`) }, { label: cat }]} />}
    <div className="flex flex-wrap items-end gap-4 mb-5"><div><h1 className="text-2xl font-semibold">{cat || "Content models"}</h1><p className="text-ink-3 text-[13px] mt-1">{cat ? `Category · ${inCat} model${inCat === 1 ? "" : "s"}` : `The structure behind every page, content item and block · ${p.models.length} model${p.models.length === 1 ? "" : "s"}`}</p></div>
      <div className="ml-auto flex gap-2 items-center">{isAdmin ? <button className="btn btn-primary" onClick={onCreate}>＋ Create content model</button> : <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 bg-surface-3 border border-line rounded-full px-3 py-1.5" title="Only site admins can change content models."><span aria-hidden="true">🔒</span>Read-only · documentation view</span>}</div></div>
    {p.models.length > 0 && <div className="flex flex-wrap items-center gap-2 mb-3">
      <label className="flex items-center gap-2 bg-surface border border-line-2 rounded-md px-2.5 py-1.5 min-w-[260px]"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px]" placeholder="Search models" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search models" /></label>
      <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="modified">Modified</option></select>
      {!cat && <select className={sel} value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Category"><option value="">All categories</option>{groups.map((g) => <option key={g}>{g}</option>)}</select>}
      <select className={sel} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort by"><option value="name">Sort: name</option><option value="modified">Sort: last modified</option><option value="status">Sort: status</option><option value="fields">Sort: fields</option></select>
      <span className="ml-auto text-[12.5px] text-ink-3">{rows.length} of {inCat}</span>
      <div role="group" aria-label="View" className="inline-flex border border-line-2 rounded-lg overflow-hidden bg-surface">{([["table", "Table"], ["map", "Map"]] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={view === v} onClick={() => pickView(v)} className={`px-3 h-8 text-[13px] font-medium ${view === v ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2"}`}>{l}</button>)}</div></div>}
    {view === "map" && rows.length ? (() => { const mapModels = rows.filter((m) => !isBlockModel(m)); return mapModels.length ? <ModelMap models={mapModels} onOpen={(id) => go(detailLink(p.base, id))} storageKey={`ucp-model-map:${cat || "all"}`}
        canConnect={isAdmin ? (id) => !isBlockModel(p.models.find((m) => m.id === id) ?? { id, locked: true }) : undefined} onConnect={isAdmin ? (a, b) => { const from = p.models.find((m) => m.id === a), to = p.models.find((m) => m.id === b); if (!from || !to) return; if (from.fields.some((f) => f.validation?.referenceModel === b)) { say(`${from.name} is already connected to ${to.name}`); return; } saveFields(from, [...from.fields, linkField(from, to)], `Connected ${from.name} → ${to.name}`); } : undefined} onRemove={isAdmin ? removeRel : undefined} />
      : <div className="p-12 text-center bg-surface border border-dashed border-line-2 rounded-xl text-ink-3 text-[13px]">Block types are shown in the table only.</div>; })()
    : rows.length ? <div className="bg-surface border border-line rounded-xl overflow-hidden"><div className="overflow-auto"><table className="w-full text-[13.5px] min-w-[880px]">
      <thead className="bg-surface-2"><tr className="text-left text-[11px] uppercase tracking-[.08em] text-ink-3"><Th k="name" s={sort} d={dir} on={sortBy}>Model</Th><Th k="status" s={sort} d={dir} on={sortBy} className="w-[120px]">Status</Th><Th k="fields" s={sort} d={dir} on={sortBy} className="w-[80px]">Fields</Th><Th k="modified" s={sort} d={dir} on={sortBy} className="w-[150px]">Last modified</Th><Th className="w-[170px]">By</Th><Th className="w-[150px]">Used on</Th></tr></thead>
      <tbody>{rows.map((m) => { const used = p.usage[m.id] ?? []; const tpl = p.templatesByModel[m.id] ?? []; const by = m.lastModifiedBy ? whoName(m.lastModifiedBy, p.names) : ""; const href = detailLink(p.base, m.id);
        return <tr key={m.id} className="hover:bg-surface-2 cursor-pointer border-t border-line" onClick={() => go(href)}>
          <td className="px-4 py-3"><div className="flex items-center gap-2.5 min-w-0"><ModelIcon m={m} /><div className="min-w-0"><Link href={href} onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(href); }} className="font-semibold hover:underline">{m.name}</Link><span className="font-mono text-[11.5px] text-ink-3 ml-2">{m.id}</span>{m.locked && <span className="ml-2 text-[10.5px] uppercase tracking-[.06em] text-ink-4" title="Translated from the Sling component dialog; read-only">read-only</span>}{m.description && <div className="text-[12.5px] text-ink-3 truncate max-w-[420px]">{m.description}</div>}</div></div></td>
          <td className="px-4 py-3"><StatusPill status={m.status} /></td>
          <td className="px-4 py-3 font-mono tabular-nums">{m.fields.length}</td>
          <td className="px-4 py-3 text-ink-2"><When iso={m.lastModified} /></td>
          <td className="px-4 py-3">{by ? <span className="inline-flex items-center gap-2"><Avatar name={by} size={22} /><span className="text-[13px] truncate">{m.lastModifiedBy === p.viewerId ? "You" : by}</span></span> : <span className="text-ink-4">—</span>}</td>
          <td className="px-4 py-3 text-ink-2 text-[12.5px]">{used.length} page{used.length === 1 ? "" : "s"}{tpl.length ? ` · ${tpl.length} template${tpl.length === 1 ? "" : "s"}` : ""}</td>
        </tr>; })}</tbody></table></div></div>
      : <div className="p-12 text-center bg-surface border border-dashed border-line-2 rounded-xl">{filtered ? <><b className="block text-[15px]">No models match</b><p className="text-ink-3 text-[13px] mt-1"><button className="underline text-ink" onClick={() => { setQ(""); setStatus(""); setGroup(cat); }}>Clear filters</button></p></>
        : isAdmin ? <><b className="block text-[15px]">No Content Models yet</b><p className="text-ink-3 text-[13px] mt-1 mb-4">Create your first Content Model to define the structure of your content.</p><button className="btn btn-primary" onClick={onCreate}>＋ Create content model</button></> : <><b className="block text-[15px]">No Content Models available.</b><p className="text-ink-3 text-[13px] mt-1">Ask a site admin to define the first one.</p></>}</div>}
  </div>;
}

/** The Reference field a connection drawn on the map becomes: named after the target model, key kept unique. */
function linkField(from: Pick<Model, "fields">, to: Model): ModelField {
  const base = camel(to.name) || "link"; let k = base, i = 2; while (from.fields.some((f) => f.k === k)) k = `${base}${i++}`;
  return { k, l: i > 2 ? `${to.name} ${i - 1}` : to.name, t: "Reference", req: false, loc: false, validation: { referenceModel: to.id } };
}

/* ---------------- editor ---------------- */
type EditorProps = { p: Props; md: Model; isAdmin: boolean; go: (href: string) => void; say: (t: string) => void; setDirty: (d: boolean) => void; saveRef: React.MutableRefObject<(() => Promise<boolean>) | null>; onDuplicate: () => void; onDelete: () => void };
function Editor({ p, md, isAdmin, go, say, setDirty, saveRef, onDuplicate, onDelete }: EditorProps) {
  const router = useRouter();
  const block = isBlockModel(md); const editable = isAdmin && !block;
  const [tab, setTabState] = useState<ModelTab>(p.tab);
  const setTab = (t: ModelTab) => { setTabState(t); window.history.replaceState(null, "", editLink(p.base, md.id, t)); };
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

  return <div className="p-7">
    <Crumbs items={[{ label: "Content models", href: `${p.base}/models`, onClick: () => go(`${p.base}/models`) }, { label: md.group, href: groupLink(p.base, md.group), onClick: () => go(groupLink(p.base, md.group)) }, { label: md.name, href: detailLink(p.base, md.id), onClick: () => go(detailLink(p.base, md.id)) }, { label: block ? "Details" : isAdmin ? "Edit model" : "Documentation" }]} />
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
    {tab === "diagram" && (block ? <BlockPreview type={md.id.slice(6)} /> : <ModelMap models={p.models.filter((m) => !isBlockModel(m)).map((m) => (m.id === md.id ? previewModel : m))} selected={md.id} storageKey="ucp-model-map:editor" onOpen={(id) => { if (id !== md.id) go(editLink(p.base, id, "diagram")); }}
      canConnect={editable ? (id) => id === md.id : undefined} onConnect={editable ? (a, b) => { const to = b === md.id ? previewModel : p.models.find((m) => m.id === b); if (a !== md.id || !to) return; if (fields.some((f) => f.validation?.referenceModel === b)) { say(`Already connected to ${to.name}`); return; } setFields([...fields, linkField({ fields }, to)]); say(`Connected to ${to.name}. Save the draft to keep it.`); } : undefined} onRemove={editable ? (r) => { if (r.from === md.id) setFields(fields.filter((f) => f.k !== r.key)); } : undefined} />)}
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
