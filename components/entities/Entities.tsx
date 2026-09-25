"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Entity, Model } from "@/lib/ucp/types";
import { useSession } from "@/components/shell/Session";
import { FolderList, type FolderItem } from "@/components/ui/FolderList";
import { MoveDialog } from "@/components/ui/MoveDialog";
import { Menu } from "@/components/ui/Menu";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill, UnsavedModal } from "@/components/models/ModelDialogs";
import { Dot, ModelIcon, When, Toast, Crumbs } from "@/components/models/bits";
import { useUnsaved } from "@/components/models/useUnsaved";
import { detailLink, entitiesLink, entityLink, whoName, TEXT_TYPES, type UsedPage } from "@/components/models/fieldMeta";
import { EntityEditor } from "./EntityEditor";
import { NewEntityModal } from "./NewEntityModal";

export type EntitiesProps = { base: string; marketId: string; marketRoot: string; models: Model[]; entities: Entity[]; usage: Record<string, UsedPage[]>; names: Record<string, string>; viewerId: string; modelId: string; entityId: string };
type Sort = "title" | "model" | "status" | "used" | "modified";
const STATUS_ORDER: Record<Entity["status"], number> = { draft: 0, modified: 1, published: 2 };

/** Plain-text preview of an entity value for tables (rich text loses its tags). */
const previewText = (v: unknown): string => (v === undefined || v === null ? "" : typeof v === "string" ? v.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : typeof v === "object" ? JSON.stringify(v) : String(v));
/** The first filled-in text value of an entity, following the order of its model's fields. */
function firstText(e: Entity, m?: Model): string {
  const fields = m ? (m.publishedFields ?? m.fields).filter((f) => !f.hidden && TEXT_TYPES.includes(f.t)) : [];
  for (const f of fields) { const t = previewText(e.values[f.k]); if (t) return t; }
  return "";
}

/**
 * Content entities: concrete content built from a content model. Tree on the left (all → one folder per model → entities),
 * list or entity editor on the right. Creating an entity: pick a model, give it a title, then fill in the fields.
 */
export function Entities(p: EntitiesProps) {
  const router = useRouter(); const { can, marketRoot } = useSession(); const canEdit = can("edit", marketRoot);
  const md = p.models.find((m) => m.id === p.modelId);
  const ent = md && p.entityId ? p.entities.find((e) => e.model === md.id && e.id === p.entityId) : undefined;
  const [q, setQ] = useState(""); const [toast, setToast] = useState(""); const [creating, setCreating] = useState(false); const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(false); const saveRef = useRef<(() => Promise<boolean>) | null>(null); const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2800); return () => clearTimeout(t); }, [toast]);
  useUnsaved(dirty);
  const say = (t: string) => setToast(t);
  /** In-app navigation that respects unsaved changes: asks first when the editor is dirty. */
  const go = (href: string) => { if (dirty) setPending(href); else router.push(href); };
  const byModel = useMemo(() => { const o: Record<string, Entity[]> = {}; for (const e of p.entities) (o[e.model] ??= []).push(e); return o; }, [p.entities]);
  const models = useMemo(() => [...p.models].sort((a, b) => a.name.localeCompare(b.name)), [p.models]);

  /* ---- moving: drag in the tree or "Move to…"; another model folder re-types the entity and re-links its pages ---- */
  const [moving, setMoving] = useState<Entity | null>(null);
  const byPath = (path: string) => p.entities.find((e) => e.path === path);
  const lostFields = (e: Entity, to: string) => { const t = p.models.find((m) => m.id === to); return t ? Object.keys(e.values).filter((k) => e.values[k] !== "" && e.values[k] !== undefined && !t.fields.some((f) => f.k === k)) : []; };
  const moveMsg = (e: Entity, to: string) => { const t = p.models.find((m) => m.id === to)?.name ?? to; const lost = lostFields(e, to); const used = (p.usage[e.path] ?? []).length;
    return `Move “${e.title}” to ${t}?${lost.length ? `\n\n${t} has no field for: ${lost.join(", ")}. The values are kept but not shown.` : ""}${used ? `\n\nIt is used on ${used} page${used === 1 ? "" : "s"}; they will point to its new place.` : ""}`; };
  const afterMove = (r: { entity: Entity; rebound: number }, from: Entity) => { say(r.entity.model !== from.model ? `Moved “${r.entity.title}” to ${p.models.find((m) => m.id === r.entity.model)?.name ?? r.entity.model}${r.rebound ? ` · ${r.rebound} page${r.rebound === 1 ? "" : "s"} re-linked` : ""}` : "Order saved"); if (ent?.path === from.path) router.push(entityLink(p.base, r.entity.model, r.entity.id)); router.refresh(); };
  const moveEntity = async (path: string, model: string, before?: string) => { const e = byPath(path); if (!e || (e.model === model && !before)) return; if (dirty && ent?.path === path) { say("Save or discard your changes first"); return; }
    if (e.model !== model && !confirm(moveMsg(e, model))) return;
    setBusy("move"); try { afterMove(await ucpApi.moveEntity(p.marketId, path, { model, before }), e); } catch (err) { say(errorText(err)); } finally { setBusy(""); } };
  const canDrop = (path: string) => !!byPath(path);

  /* ---- tree: all entities → one folder per content model → entities ---- */
  const ql = q.trim().toLowerCase();
  const items: FolderItem[] = models.map((m): FolderItem | null => {
    const all = byModel[m.id] ?? []; const shown = ql ? all.filter((e) => e.title.toLowerCase().includes(ql) || e.id.includes(ql)) : all;
    if (ql && !shown.length) return null;
    return { key: m.id, label: m.name, count: all.length, active: m.id === md?.id && !ent, open: !!ql || m.id === md?.id, title: `${m.name} · ${all.length} entit${all.length === 1 ? "y" : "ies"}`, onClick: () => go(entitiesLink(p.base, m.id)),
      onDrop: canEdit ? (path) => moveEntity(path, m.id) : undefined, accepts: canDrop,
      children: shown.map((e): FolderItem => { const on = !!ent && ent.path === e.path; return { key: e.path, label: e.title, icon: "page", active: on, title: canEdit ? `${e.title} · ${e.status} · drag to move` : `${e.title} · ${e.status}`, onClick: () => go(entityLink(p.base, m.id, e.id)),
        dragId: canEdit ? e.path : undefined, onDrop: canEdit ? (path) => moveEntity(path, m.id, e.path) : undefined, accepts: canDrop,
        right: <span className="flex items-center gap-1 pr-1.5 flex-none"><Dot status={e.status} />{canEdit && <span className={on ? "" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"}><Menu label="⋯" ariaLabel={`Actions for ${e.title}`} buttonClassName="w-6 h-6 rounded grid place-items-center text-ink-3 hover:bg-surface-3 text-[14px] leading-none" items={[{ id: "open", label: "Open", onSelect: () => go(entityLink(p.base, m.id, e.id)) }, { id: "move", label: "Move to…", onSelect: () => setMoving(e) }]} /></span>}</span> }; }) };
  }).filter((x): x is FolderItem => !!x);

  const onCreated = (m: Model, e: Entity) => { setCreating(false); say(`Created “${e.title}” (draft). Fill in the content, then save.`); router.push(entityLink(p.base, m.id, e.id)); router.refresh(); };

  let body: React.ReactNode;
  if (md && ent) body = <EntityEditor key={`${ent.path}:${ent.lastModified ?? ""}:${ent.status}`} base={p.base} marketId={p.marketId} marketRoot={p.marketRoot} model={md} entity={ent} entities={p.entities} models={p.models} usedOn={p.usage[ent.path] ?? []} names={p.names} viewerId={p.viewerId} canEdit={canEdit} go={go} say={say} setDirty={setDirty} saveRef={saveRef} />;
  else if (md && p.entityId) body = <div className="p-7"><Crumbs items={[{ label: "Content entities", href: entitiesLink(p.base), onClick: () => go(entitiesLink(p.base)) }, { label: md.name, href: entitiesLink(p.base, md.id), onClick: () => go(entitiesLink(p.base, md.id)) }, { label: "Not found" }]} /><div className="p-12 text-center bg-surface border border-dashed border-line-2 rounded-xl"><b className="block text-[15px]">This entity no longer exists</b><p className="text-ink-3 text-[13px] mt-1">It may have been deleted. <button className="underline text-ink" onClick={() => go(entitiesLink(p.base, md.id))}>Back to {md.name} entities</button></p></div></div>;
  else body = <Overview key={md?.id ?? ""} p={p} md={md} byModel={byModel} models={models} canEdit={canEdit} go={go} onCreate={() => setCreating(true)} />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] grid-rows-[auto_1fr] md:grid-rows-1 h-full min-h-0">
      <aside className="bg-surface border-b md:border-b-0 md:border-r border-line p-3 md:overflow-auto">
        <h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold px-2 mb-2">Content entities</h6>{canEdit && <p className="text-[11.5px] text-ink-4 px-2 -mt-1 mb-2">Drag an entity to reorder it or move it to another folder.</p>}
        <label className="flex items-center gap-2 border border-line-2 rounded-md px-2.5 py-1.5 mb-2 bg-surface"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px] bg-transparent min-w-0" placeholder="Find an entity" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find an entity" /></label>
        <FolderList key={ql ? `q:${ql}` : `sel:${md?.id ?? ""}`} root={{ label: "All entities", count: p.entities.length, active: !md, onClick: () => go(entitiesLink(p.base)) }} items={items} extra={ql && !items.length ? <div className="text-[12.5px] text-ink-4 px-2 py-1">Nothing matches “{q}”</div> : undefined} />
        {canEdit && <button className="btn btn-quiet btn-sm mt-2.5 ml-1" onClick={() => setCreating(true)}>＋ Create entity</button>}
      </aside>
      <div className="overflow-y-auto overflow-x-hidden min-w-0 min-h-0">{body}</div>
      {creating && canEdit && <NewEntityModal marketId={p.marketId} models={models} initial={md} onClose={() => setCreating(false)} onDone={onCreated} />}
      {pending && <UnsavedModal what={ent ? `“${ent.title}”` : "this entity"} busy={busy === "guard"} onStay={() => setPending(null)} onDiscard={() => { const h = pending; setPending(null); setDirty(false); router.push(h); }} onSave={async () => { setBusy("guard"); const ok = await saveRef.current?.(); setBusy(""); if (ok) { const h = pending; setPending(null); setDirty(false); router.push(h); } }} />}
      {moving && <MoveDialog title={`Move ${moving.title}`} what={moving.title} current={moving.model} targets={models.map((m) => ({ id: m.id, label: m.name, hint: `${(byModel[m.id] ?? []).length} entities` }))} onClose={() => setMoving(null)}
        note={(to) => { const lost = lostFields(moving, to); const used = (p.usage[moving.path] ?? []).length; return <div className="mt-3 grid gap-1.5 text-[12.5px]">{lost.length > 0 && <p className="bg-warn-soft text-ink px-3 py-2 rounded">This model has no field for <b>{lost.join(", ")}</b>. The values are kept but not shown.</p>}{used > 0 && <p className="bg-info-soft text-ink px-3 py-2 rounded">Used on {used} page{used === 1 ? "" : "s"}. {used === 1 ? "It" : "They"} will point to the new place automatically.</p>}</div>; }}
        onMove={async (to) => { if (dirty && ent?.path === moving.path) throw new Error("Save or discard your changes first"); const r = await ucpApi.moveEntity(p.marketId, moving.path, { model: to }); const from = moving; setMoving(null); afterMove(r, from); }} />}
      {toast && <Toast text={toast} />}
    </div>
  );
}

/* ---------------- overview: all entities, or the entities of one model ---------------- */
function Th({ k, s, d, on, children, className = "" }: { k?: Sort; s?: Sort; d?: "asc" | "desc"; on?: (k: Sort) => void; children: React.ReactNode; className?: string }) {
  const active = !!k && s === k;
  return <th className={`px-4 py-2.5 border-b border-line ${className}`} aria-sort={k ? (active ? (d === "asc" ? "ascending" : "descending") : "none") : undefined}>{k ? <button type="button" onClick={() => on?.(k)} className={`inline-flex items-center gap-1 uppercase tracking-[.08em] text-[11px] hover:text-ink ${active ? "text-ink font-semibold" : ""}`}>{children}<span aria-hidden className={`text-[10px] ${active ? "opacity-100" : "opacity-30"}`}>{active && d === "desc" ? "▼" : "▲"}</span></button> : children}</th>;
}

type OverviewProps = { p: EntitiesProps; md?: Model; byModel: Record<string, Entity[]>; models: Model[]; canEdit: boolean; go: (href: string) => void; onCreate: () => void };
function Overview({ p, md, byModel, models, canEdit, go, onCreate }: OverviewProps) {
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [sort, setSort] = useState<Sort>("title"); const [dir, setDir] = useState<"asc" | "desc">("asc");
  const modelOf = useMemo(() => Object.fromEntries(p.models.map((m) => [m.id, m])), [p.models]);
  const scope = useMemo(() => (md ? byModel[md.id] ?? [] : p.entities), [md, byModel, p.entities]);
  const used = (e: Entity) => (p.usage[e.path] ?? []).length;
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const r = scope.filter((e) => (!status || e.status === status) && (!s || `${e.title} ${e.id} ${firstText(e, modelOf[e.model])}`.toLowerCase().includes(s)));
    const name = (e: Entity) => modelOf[e.model]?.name ?? e.model;
    const n = (e: Entity) => (p.usage[e.path] ?? []).length;
    const cmp = (a: Entity, b: Entity) => sort === "modified" ? (b.lastModified ?? "").localeCompare(a.lastModified ?? "") || a.title.localeCompare(b.title)
      : sort === "status" ? STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.title.localeCompare(b.title)
      : sort === "model" ? name(a).localeCompare(name(b)) || a.title.localeCompare(b.title)
      : sort === "used" ? n(b) - n(a) || a.title.localeCompare(b.title)
      : a.title.localeCompare(b.title);
    return r.sort((a, b) => (dir === "asc" ? cmp(a, b) : -cmp(a, b)));
  }, [scope, modelOf, p.usage, q, status, sort, dir]);
  const sortBy = (k: Sort) => { if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc")); else { setSort(k); setDir("asc"); } };
  const filtered = !!(q || status); const sel = "border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] bg-surface";
  const createBtn = canEdit ? <button className="btn btn-primary" onClick={onCreate}>＋ Create entity</button> : null;
  const nav = (href: string) => ({ href, onClick: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); go(href); } });

  return <div className="p-7">
    {md && <Crumbs items={[{ label: "Content entities", href: entitiesLink(p.base), onClick: () => go(entitiesLink(p.base)) }, { label: md.name }]} />}
    <div className="flex flex-wrap items-end gap-4 mb-5"><div><h1 className="text-2xl font-semibold">{md ? `${md.name} entities` : "Content entities"}</h1><p className="text-ink-3 text-[13px] mt-1">Concrete content built from a content model. Pages reuse it with {"{{tokens}}"}.{md && <> · <Link {...nav(detailLink(p.base, md.id))} className="underline hover:text-ink">View the {md.name} model</Link></>}</p></div>
      <div className="ml-auto flex gap-2 items-center">{createBtn ?? <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 bg-surface-3 border border-line rounded-full px-3 py-1.5" title="You need Edit on this site to create content."><span aria-hidden="true">🔒</span>Read-only</span>}</div></div>
    {p.entities.length > 0 && <div className="flex flex-wrap items-center gap-2 mb-3">
      <label className="flex items-center gap-2 bg-surface border border-line-2 rounded-md px-2.5 py-1.5 min-w-[260px]"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px]" placeholder="Search entities" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search entities" /></label>
      <select className={sel} value={md?.id ?? ""} onChange={(e) => go(entitiesLink(p.base, e.target.value || undefined))} aria-label="Content model"><option value="">All models</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
      <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="modified">Modified</option></select>
      <select className={sel} value={sort} onChange={(e) => { setSort(e.target.value as Sort); setDir("asc"); }} aria-label="Sort by"><option value="title">Sort: title</option><option value="modified">Sort: last modified</option><option value="status">Sort: status</option><option value="model">Sort: model</option><option value="used">Sort: used on</option></select>
      <span className="ml-auto text-[12.5px] text-ink-3">{rows.length} of {scope.length}</span></div>}
    {rows.length ? <div className="bg-surface border border-line rounded-xl overflow-hidden"><div className="overflow-auto"><table className="w-full text-[13.5px] min-w-[900px]">
      <thead className="bg-surface-2"><tr className="text-left text-[11px] uppercase tracking-[.08em] text-ink-3"><Th k="title" s={sort} d={dir} on={sortBy}>Entity</Th><Th k="model" s={sort} d={dir} on={sortBy} className="w-[170px]">Model</Th><Th k="status" s={sort} d={dir} on={sortBy} className="w-[120px]">Status</Th><Th k="used" s={sort} d={dir} on={sortBy} className="w-[110px]">Used on</Th><Th k="modified" s={sort} d={dir} on={sortBy} className="w-[140px]">Last modified</Th><Th className="w-[170px]">By</Th></tr></thead>
      <tbody>{rows.map((e) => { const m = modelOf[e.model]; const href = entityLink(p.base, e.model, e.id); const by = e.lastModifiedBy ? whoName(e.lastModifiedBy, p.names) : ""; const t = firstText(e, m); const n = used(e);
        return <tr key={e.path} className="hover:bg-surface-2 cursor-pointer border-t border-line" onClick={() => go(href)}>
          <td className="px-4 py-3"><Link {...nav(href)} className="font-semibold hover:underline">{e.title}</Link>{t ? <div className="text-[12.5px] text-ink-3 truncate max-w-[420px]" title={t}>{t}</div> : <div className="font-mono text-[11.5px] text-ink-4">{e.id}</div>}</td>
          <td className="px-4 py-3">{m && <span className="inline-flex items-center gap-1.5 border border-line-2 rounded-full pl-1 pr-2.5 py-0.5 text-[12.5px] max-w-full"><ModelIcon m={m} /><span className="truncate">{m.name}</span></span>}</td>
          <td className="px-4 py-3"><StatusPill status={e.status} /></td>
          <td className="px-4 py-3 text-ink-2 text-[12.5px]">{n} page{n === 1 ? "" : "s"}</td>
          <td className="px-4 py-3 text-ink-2"><When iso={e.lastModified} /></td>
          <td className="px-4 py-3">{by ? <span className="inline-flex items-center gap-2"><Avatar name={by} size={22} /><span className="text-[13px] truncate">{e.lastModifiedBy === p.viewerId ? "You" : by}</span></span> : <span className="text-ink-4">—</span>}</td>
        </tr>; })}</tbody></table></div></div>
      : <div className="p-12 text-center bg-surface border border-dashed border-line-2 rounded-xl">{filtered ? <><b className="block text-[15px]">No entities match</b><p className="text-ink-3 text-[13px] mt-1"><button className="underline text-ink" onClick={() => { setQ(""); setStatus(""); }}>Clear filters</button></p></>
        : md ? <><b className="block text-[15px]">No {md.name} entities yet</b><p className="text-ink-3 text-[13px] mt-1 mb-4">{md.status === "draft" ? "Publish the model first, then fill in its fields to create reusable content." : "Fill in this model’s fields to create reusable content."}</p>{md.status !== "draft" && createBtn}</>
        : <><b className="block text-[15px]">No content entities yet</b><p className="text-ink-3 text-[13px] mt-1 mb-4">Pick a content model and fill in its fields to create reusable content.</p>{createBtn}</>}</div>}
  </div>;
}
