"use client";
import { useEffect, useMemo, useState } from "react";
import type { Entity } from "@/lib/ucp/types";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { ModalShell } from "@/components/models/ModalShell";
import { FolderIcon, PageIcon } from "@/components/ui/Icons";
import { Pill } from "@/components/ui/Pill";
import type { ContentModelInfo } from "./LinkedContent";

/** Icon for "use content from an entity" (a card with an arrow into it). */
export function ContentIcon({ className = "w-4 h-4" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={`${className} fill-none stroke-current`} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="13" height="16" rx="2" /><path d="M7 9h5M7 13h3" /><path d="M21 12h-7m0 0 3-3m-3 3 3 3" /></svg>;
}

export type ContentChoice = { entity: Entity; field: { k: string; l: string } };
type Place = { model: string; folder: string | null }; // folder null = every entity of the model

const plain = (v: unknown) => (typeof v === "string" ? v.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : v === undefined || v === null || typeof v === "object" ? "" : String(v));
const cut = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const fieldsOf = (m: ContentModelInfo | undefined, e: Entity) => { const f = m?.fields.length ? m.fields : Object.keys(e.values).map((k) => ({ k, l: k })); return f.some((x) => x.k === "title") ? f : [{ k: "title", l: "Title" }, ...f]; };
const valueOf = (e: Entity, k: string) => plain(k === "title" ? e.values.title ?? e.title : e.values[k]);

/**
 * "Choose content": browse folder → entity → field and use that field's value here. The text field then inherits the
 * entity's content (it is stored as a {{alias.field}} token and follows every change to the entity).
 */
export function ContentPicker({ marketId, marketName, flag, locale, models, current, onClose, onPick }: { marketId: string; marketName: string; flag: string; locale: string; models: ContentModelInfo[]; current?: string; onClose: () => void; onPick: (c: ContentChoice) => void }) {
  const [all, setAll] = useState<Entity[] | null>(null); const [folders, setFolders] = useState<Record<string, string[]>>({}); const [err, setErr] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null); const [ent, setEnt] = useState<string>(""); const [field, setField] = useState<string>(""); const [q, setQ] = useState("");
  useEffect(() => { let on = true; Promise.all([ucpApi.entities(marketId), ucpApi.entityFolders(marketId).catch(() => ({}))]).then(([es, fs]) => { if (!on) return; setAll(es); setFolders(fs); const first = models.find((m) => es.some((e) => e.model === m.id)); if (first) setPlace({ model: first.id, folder: null }); }).catch((e) => { if (on) { setAll([]); setErr(errorText(e)); } }); return () => { on = false; }; }, [marketId, models]);
  const ql = q.trim().toLowerCase();
  const list = useMemo(() => (all ?? []).filter((e) => (ql ? `${e.title} ${plain(e.values.description)}`.toLowerCase().includes(ql) : place && e.model === place.model && (place.folder === null || (e.folder ?? "") === place.folder))), [all, place, ql]);
  const chosen = (all ?? []).find((e) => e.path === ent); const model = chosen ? models.find((m) => m.id === chosen.model) : undefined;
  const fields = chosen ? fieldsOf(model, chosen) : []; const f = fields.find((x) => x.k === field);
  const count = (m: string, folder: string | null) => (all ?? []).filter((e) => e.model === m && (folder === null || (e.folder ?? "") === folder)).length;
  const col = "min-h-0 overflow-auto border border-line rounded-lg bg-surface";
  const rowCls = (on: boolean) => `w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded text-[13px] ${on ? "bg-accent-soft text-accent-hover font-semibold" : "hover:bg-surface-3 text-ink-2"}`;

  return <ModalShell title="Choose content" subtitle={<>Pick a folder, an entity and the field to show{current ? <> in <b>{current}</b></> : null}. The text then inherits it and updates when the entity changes.</>} width={880} onClose={onClose}
    footer={<>{chosen && f && <span className="mr-auto text-[12.5px] text-ink-3 min-w-0 truncate">Shows: <b className="text-ink">{cut(valueOf(chosen, f.k), 70) || "(empty)"}</b></span>}<button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!chosen || !f} onClick={() => chosen && f && onPick({ entity: chosen, field: f })}>Use this content</button></>}>
    <div className="flex flex-wrap items-center gap-2 mb-3 text-[12px]">
      <span className="inline-flex items-center gap-1.5 bg-surface-2 border border-line rounded-full px-2.5 py-1"><span className="text-ink-3">Market</span><b>{flag} {marketName}</b></span>
      <span className="inline-flex items-center gap-1.5 bg-surface-2 border border-line rounded-full px-2.5 py-1"><span className="text-ink-3">Language root</span><b className="font-mono">{locale}</b></span>
      <span className="inline-flex items-center gap-1.5 bg-surface-2 border border-line rounded-full px-2.5 py-1 font-mono text-ink-3" title="Where these entities are stored">/content/entities/{marketId}</span>
    </div>
    <label className="flex items-center gap-2 border border-line-2 rounded-md px-2.5 py-1.5 mb-3 bg-surface"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px] bg-transparent" placeholder="Search all entities" autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search all entities" /></label>
    <div className="grid grid-cols-[200px_1fr_1.2fr] gap-3 h-[360px]">
      <div className={col} aria-label="Folders"><div className="px-2.5 pt-2 pb-1 text-[10.5px] uppercase tracking-[.08em] text-ink-3 font-semibold">1 · Folder</div><div className="p-1">
        {models.filter((m) => count(m.id, null) > 0).map((m) => <div key={m.id}>
          <button type="button" className={rowCls(!ql && place?.model === m.id && place.folder === null)} onClick={() => { setQ(""); setPlace({ model: m.id, folder: null }); setEnt(""); setField(""); }}><FolderIcon /><span className="flex-1 truncate">{m.name}</span><small className="text-[10.5px] text-ink-4 font-mono">{count(m.id, null)}</small></button>
          {(folders[m.id] ?? []).map((fo) => <button key={fo} type="button" className={`${rowCls(!ql && place?.model === m.id && place.folder === fo)} pl-7`} onClick={() => { setQ(""); setPlace({ model: m.id, folder: fo }); setEnt(""); setField(""); }}><FolderIcon /><span className="flex-1 truncate">{fo}</span><small className="text-[10.5px] text-ink-4 font-mono">{count(m.id, fo)}</small></button>)}
        </div>)}
        {all !== null && !all.length && <p className="text-[12px] text-ink-3 p-2">No entities yet. Create them in Content entities.</p>}
      </div></div>
      <div className={col} aria-label="Entities"><div className="px-2.5 pt-2 pb-1 text-[10.5px] uppercase tracking-[.08em] text-ink-3 font-semibold">2 · Entity{ql ? " · search results" : ""}</div><div className="p-1">
        {all === null ? <p className="text-[12px] text-ink-3 p-2">Loading…</p> : list.length ? list.map((e) => <button key={e.path} type="button" className={rowCls(ent === e.path)} onClick={() => { setEnt(e.path); setField(fieldsOf(models.find((m) => m.id === e.model), e)[0]?.k ?? ""); }}>
          <PageIcon /><span className="flex-1 min-w-0"><span className="block truncate">{e.title}</span><span className="block text-[11px] font-normal text-ink-3 truncate">{cut(plain(e.values.description) || models.find((m) => m.id === e.model)?.name || "", 60)}</span></span>{e.status !== "published" && <Pill status={e.status === "modified" ? "review" : "draft"} label={e.status === "modified" ? "Modified" : "Draft"} />}</button>)
          : <p className="text-[12px] text-ink-3 p-2">{ql ? "Nothing matches." : "No entities in this folder."}</p>}
      </div></div>
      <div className={col} aria-label="Fields"><div className="px-2.5 pt-2 pb-1 text-[10.5px] uppercase tracking-[.08em] text-ink-3 font-semibold">3 · Field to show</div><div className="p-1">
        {chosen ? fields.map((x) => { const v = valueOf(chosen, x.k); return <button key={x.k} type="button" className={`${rowCls(field === x.k)} items-start`} onClick={() => setField(x.k)}>
          <input type="radio" readOnly checked={field === x.k} className="mt-1 accent-[var(--accent)]" tabIndex={-1} aria-hidden /><span className="flex-1 min-w-0"><span className="block">{x.l}</span><span className={`block text-[11.5px] font-normal ${v ? "text-ink-3" : "text-ink-4 italic"}`}>{v ? cut(v) : "empty"}</span></span></button>; })
          : <p className="text-[12px] text-ink-3 p-2">Choose an entity to see its fields.</p>}
      </div></div>
    </div>
    {err && <div role="alert" className="text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded mt-3">{err}</div>}
  </ModalShell>;
}
