"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Bindings, Entity } from "@/lib/ucp/types";
import type { ResolvedEntities } from "@/lib/ucp/tokens";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { Pill } from "@/components/ui/Pill";

/** Content models the page can link to (from the server page): id, display name and visible fields. */
export type ContentModelInfo = { id: string; name: string; fields: { k: string; l: string }[] };

/** Entities live at /content/entities/<market>/<model>/<id>, so the model is the second-last path segment. */
export const modelOfPath = (path: string) => path.split("/").filter(Boolean).slice(-2, -1)[0] ?? "";
const camel = (s: string) => s.replace(/[-_\s]+(\w)/g, (_, c: string) => c.toUpperCase()).replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/[^\w]/g, "");
/** Alias for a new binding: the model id in camelCase, with a number when it is already taken. */
export function uniqueAlias(model: string, taken: Bindings): string { const b = camel(model) || "content"; if (!(b in taken)) return b; let i = 2; while (`${b}${i}` in taken) i++; return `${b}${i}`; }

type PanelProps = { marketId: string; base: string; pagePath: string; bindings: Bindings; entities: ResolvedEntities; models: ContentModelInfo[]; blocks: { props: Record<string, unknown> }[]; canEdit: boolean; onChange: (b: Bindings) => void; say: (m: string) => void };

/** How many {{alias.…}} tokens the page text uses for one linked entity. */
const usesOf = (alias: string, blocks: { props: Record<string, unknown> }[]) => { const re = new RegExp(`\\{\\{\\s*${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.`, "g"); return blocks.reduce((n, b) => n + (JSON.stringify(b.props).match(re)?.length ?? 0), 0); };

/**
 * Right-rail "Entities" panel: the content entities this page uses, with their status and where to edit them.
 * Adding one is a single choice; its name in tokens is picked automatically.
 */
export function EntitiesPanel({ marketId, base, pagePath, bindings, entities, models, blocks, canEdit, onChange, say }: PanelProps) {
  const [all, setAll] = useState<Entity[] | null>(null); const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false); const [pick, setPick] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { let on = true; ucpApi.entities(marketId).then((es) => { if (on) setAll(es); }).catch((e) => { if (on) { setAll([]); setErr(errorText(e)); } }); return () => { on = false; }; }, [marketId]);
  const byPath = useMemo(() => Object.fromEntries((all ?? []).map((e) => [e.path, e])), [all]);
  const byModel = useMemo(() => { const g: Record<string, Entity[]> = {}; for (const e of all ?? []) if (!Object.values(bindings).includes(e.path)) (g[e.model] ??= []).push(e); return g; }, [all, bindings]);
  const modelName = (id: string) => models.find((m) => m.id === id)?.name ?? id;
  /* tokens typed in the text whose name is not linked to an entity yet: offer to link them */
  const typed = useMemo(() => { const n: Record<string, number> = {}; const re = /\{\{\s*([a-zA-Z][\w-]*)\./g; for (const b of blocks) for (const m of JSON.stringify(b.props).matchAll(re)) n[m[1]] = (n[m[1]] ?? 0) + 1; return Object.entries(n).filter(([a]) => !(a in bindings)); }, [blocks, bindings]);
  const [linkPick, setLinkPick] = useState<Record<string, string>>({});
  const rows = Object.entries(bindings).map(([alias, path]) => ({ alias, path, e: byPath[path], mid: byPath[path]?.model ?? modelOfPath(path), title: byPath[path]?.title ?? entities[alias]?.title, uses: usesOf(alias, blocks) }));

  async function save(next: Bindings, msg: string) {
    setBusy(true); setErr(null);
    try { const saved = await ucpApi.saveBindings(marketId, pagePath, next); onChange(saved ?? next); say(msg); return true; }
    catch (e) { setErr(errorText(e)); return false; } finally { setBusy(false); }
  }
  async function add() { const e = byPath[pick]; if (!e) return; const alias = uniqueAlias(e.model, bindings); if (await save({ ...bindings, [alias]: e.path }, `Added ${e.title} · use {{${alias}.title}} in text`)) { setAdding(false); setPick(""); } }
  const remove = (alias: string, title?: string) => { const next = { ...bindings }; delete next[alias]; void save(next, `Removed ${title ?? alias} from this page`); };

  return <div className="flex flex-col gap-3">
    <p className="text-xs text-ink-3">Content entities used on this page. Change them in Content entities and every page that uses them updates.</p>
    {!rows.length && !adding && <div className="border border-dashed border-line-2 rounded-lg p-4 text-center text-ink-3 text-xs"><b className="block text-ink text-sm mb-0.5">No entities on this page</b>{canEdit ? "Add one to reuse its text here." : "Nothing on this page comes from content entities."}</div>}
    {rows.length > 0 && <ul className="border border-line rounded-lg divide-y divide-line">{rows.map((r) => <li key={r.alias} className="px-3 py-2.5">
      <div className="flex items-start gap-2"><b className="flex-1 min-w-0 text-sm leading-snug break-words">{r.title ?? "Missing entity"}</b>
        {canEdit && !r.uses && <button className="flex-none w-6 h-6 -mt-0.5 rounded text-ink-3 hover:bg-surface-3" title="Remove from this page" aria-label={`Remove ${r.title ?? r.alias} from this page`} disabled={busy} onClick={() => remove(r.alias, r.title)}>✕</button>}</div>
      <div className="text-xs text-ink-3 mt-0.5">{modelName(r.mid)} · {r.uses ? `used ${r.uses}× in the text` : "not used in the text yet"}</div>
      <div className="flex items-center gap-2 mt-2">{r.e && (r.e.status === "modified" ? <Pill status="review" label="Modified" /> : <Pill status={r.e.status} label={r.e.status === "published" ? "Published" : "Draft"} />)}
        {r.e && <Link className="btn btn-sm btn-secondary ml-auto" href={`${base}/entities?model=${encodeURIComponent(r.mid)}&entity=${encodeURIComponent(r.e.id)}`}>Open</Link>}</div>
    </li>)}</ul>}
    {typed.length > 0 && <div className="border border-warn/40 bg-warn-soft rounded-lg p-2.5 flex flex-col gap-2">
      <b className="text-xs">Not linked yet</b>
      {typed.map(([alias, n]) => <div key={alias} className="flex flex-col gap-1.5">
        <div className="text-xs"><span>{`{{${alias}.…}}`}</span> is used {n}× but no entity is linked as “{alias}”, so visitors would see the code.</div>
        {canEdit && <div className="flex gap-1.5"><select className="flex-1 min-w-0 border border-line-2 rounded-md px-2 py-1 text-xs bg-surface" value={linkPick[alias] ?? ""} onChange={(e) => setLinkPick((x) => ({ ...x, [alias]: e.target.value }))} aria-label={`Entity for ${alias}`}><option value="">Choose an entity…</option>{(all ?? []).map((e) => <option key={e.path} value={e.path}>{e.title} · {modelName(e.model)}</option>)}</select>
          <button className="btn btn-sm btn-primary" disabled={!linkPick[alias] || busy} onClick={() => void save({ ...bindings, [alias]: linkPick[alias] }, `Linked “${alias}” to ${byPath[linkPick[alias]]?.title ?? "the entity"}`)}>Link</button></div>}
      </div>)}
    </div>}
    {canEdit && (adding ? <div className="border border-line rounded-lg p-2.5 flex flex-col gap-2 bg-surface-2">
      <label className="text-xs text-ink-2 font-medium">Entity<select className="mt-1 w-full border border-line-2 rounded-md px-2 py-1.5 text-sm font-normal text-ink bg-surface" value={pick} onChange={(e) => setPick(e.target.value)} autoFocus>
        <option value="">{all === null ? "Loading…" : "Choose an entity…"}</option>
        {Object.keys(byModel).sort().map((m) => <optgroup key={m} label={modelName(m)}>{byModel[m].map((x) => <option key={x.path} value={x.path}>{x.title}{x.status === "draft" ? " (draft)" : ""}</option>)}</optgroup>)}</select></label>
      <div className="flex justify-end gap-2"><button className="btn btn-sm btn-secondary" onClick={() => { setAdding(false); setPick(""); }}>Cancel</button><button className="btn btn-sm btn-primary" disabled={!pick || busy} onClick={() => void add()}>{busy ? "Adding…" : "Add"}</button></div>
    </div> : <button className="btn btn-sm btn-secondary justify-center" onClick={() => setAdding(true)}>＋ Add entity</button>)}
    {err && <div role="alert" className="text-crit text-xs bg-crit-soft px-3 py-2 rounded">{err}</div>}
  </div>;
}

