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
/** Token chips for one binding: `{{alias.field}}` per field of the entity's model. */
export type TokenGroup = { alias: string; title: string; tokens: { token: string; label: string }[] };

/** Entities live at /content/entities/<market>/<model>/<id>, so the model is the second-last path segment. */
export const modelOfPath = (path: string) => path.split("/").filter(Boolean).slice(-2, -1)[0] ?? "";
const camel = (s: string) => s.replace(/[-_\s]+(\w)/g, (_, c: string) => c.toUpperCase()).replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/[^\w]/g, "");
/** Alias for a new binding: the model id in camelCase, with a number when it is already taken. */
export function uniqueAlias(model: string, taken: Bindings): string { const b = camel(model) || "content"; if (!(b in taken)) return b; let i = 2; while (`${b}${i}` in taken) i++; return `${b}${i}`; }

export function tokenGroups(bindings: Bindings, entities: ResolvedEntities, models: ContentModelInfo[]): TokenGroup[] {
  return Object.entries(bindings).map(([alias, path]) => {
    const m = models.find((x) => x.id === modelOfPath(path)); const e = entities[alias];
    const fields = m?.fields.length ? m.fields : Object.keys(e?.values ?? {}).map((k) => ({ k, l: k }));
    const all = fields.some((f) => f.k === "title") ? fields : [{ k: "title", l: "Title" }, ...fields];
    return { alias, title: e?.title ?? path.split("/").pop() ?? alias, tokens: all.map((f) => ({ token: `{{${alias}.${f.k}}}`, label: f.l })) };
  });
}

/** Clickable `{{alias.field}}` chips. */
export function TokenChips({ groups, onPick }: { groups: TokenGroup[]; onPick: (token: string, label: string) => void }) {
  return <div className="flex flex-wrap gap-1">{groups.flatMap((g) => g.tokens).map((t) => <button key={t.token} type="button" title={`${t.label} · click to insert or copy`} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(t.token, t.label)} className="font-mono text-[11.5px] px-2 py-0.5 rounded-full border border-line-2 bg-surface-2 text-ink-2 hover:border-ink hover:text-ink">{t.token}</button>)}</div>;
}

type PanelProps = { marketId: string; base: string; pagePath: string; bindings: Bindings; entities: ResolvedEntities; models: ContentModelInfo[]; canEdit: boolean; configuring: boolean; onChange: (b: Bindings) => void; onChip: (token: string, label: string) => void; say: (m: string) => void };

/** Right-rail panel: content entities linked to this page, their tokens, and ＋ Link content. */
export function LinkedContentPanel({ marketId, base, pagePath, bindings, entities, models, canEdit, configuring, onChange, onChip, say }: PanelProps) {
  const [all, setAll] = useState<Entity[] | null>(null); const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false); const [model, setModel] = useState(""); const [entity, setEntity] = useState(""); const [alias, setAlias] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { let on = true; ucpApi.entities(marketId).then((es) => { if (on) setAll(es); }).catch((e) => { if (on) { setAll([]); setErr(errorText(e)); } }); return () => { on = false; }; }, [marketId]);
  const byPath = useMemo(() => Object.fromEntries((all ?? []).map((e) => [e.path, e])), [all]);
  const byModel = useMemo(() => { const g: Record<string, Entity[]> = {}; for (const e of all ?? []) (g[e.model] ??= []).push(e); return g; }, [all]);
  const groups = tokenGroups(bindings, entities, models);
  const modelName = (id: string) => models.find((m) => m.id === id)?.name ?? id;

  async function save(next: Bindings, msg: string) {
    setBusy(true); setErr(null);
    try { const saved = await ucpApi.saveBindings(marketId, pagePath, next); onChange(saved ?? next); say(msg); return true; }
    catch (e) { setErr(errorText(e)); return false; }
    finally { setBusy(false); }
  }
  const pickModel = (m: string) => { setModel(m); setEntity(""); setAlias(m ? uniqueAlias(m, bindings) : ""); };
  const aliasOk = /^[a-zA-Z][\w-]*$/.test(alias) && !(alias in bindings);
  async function add() { if (!entity || !aliasOk) return; if (await save({ ...bindings, [alias]: entity }, `Linked ${byPath[entity]?.title ?? "content"} as {{${alias}.…}}`)) { setAdding(false); pickModel(""); } }
  const remove = (a: string) => { const next = { ...bindings }; delete next[a]; void save(next, `Removed ${a} · its tokens now show as unknown`); };

  return <div className="flex flex-col gap-3">
    <p className="text-[12px] text-ink-3">Reuse text from content items instead of copying it. Put a token like <span className="font-mono">{"{{product.title}}"}</span> in any text and it shows the item’s current value.</p>
    {configuring && groups.length > 0 && <div className="text-[12px] bg-info-soft text-info rounded-md px-2.5 py-1.5">Click a token to insert it into the field you last clicked in Configure.</div>}
    {!groups.length && !adding && <div className="border border-dashed border-line-2 rounded-lg p-4 text-center text-ink-3 text-[12.5px]"><b className="block text-ink text-[13px] mb-0.5">No linked content yet</b>{canEdit ? "Link a content item to use its values on this page." : "Nothing on this page comes from content items."}</div>}
    {groups.map((g) => { const path = bindings[g.alias]; const e = byPath[path]; const mid = e?.model ?? modelOfPath(path); const known = !!entities[g.alias] || !!e;
      return <div key={g.alias} className="border border-line rounded-lg p-2.5 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1"><div className="font-mono text-[12px] text-ink-2">{g.alias}</div><b className="block text-[13px] truncate">{known ? (e?.title ?? g.title) : "Missing content item"}</b><div className="text-[11.5px] text-ink-3">{modelName(mid)}</div></div>
          {e && (e.status === "modified" ? <Pill status="review" label="Modified" /> : <Pill status={e.status} label={e.status === "published" ? "Published" : "Draft"} />)}
        </div>
        <TokenChips groups={[g]} onPick={onChip} />
        <div className="flex gap-1.5">{known && <Link className="btn btn-sm" href={`${base}/models?model=${encodeURIComponent(mid)}&entity=${encodeURIComponent(e?.id ?? path.split("/").pop() ?? "")}`}>Open</Link>}{canEdit && <button className="btn btn-sm btn-quiet" disabled={busy} onClick={() => remove(g.alias)}>Remove</button>}</div>
      </div>; })}
    {canEdit && (adding ? <div className="border border-line rounded-lg p-2.5 flex flex-col gap-2.5 bg-surface-2">
      <b className="text-[13px]">Link content</b>
      <label className="text-xs text-ink-2 font-medium">Content type<select className="mt-1 w-full border border-line-2 rounded-md px-2 py-1.5 text-[13px] font-normal text-ink bg-surface" value={model} onChange={(e) => pickModel(e.target.value)}><option value="">Choose…</option>{Object.keys(byModel).sort().map((m) => <option key={m} value={m}>{modelName(m)} ({byModel[m].length})</option>)}</select></label>
      {all === null && <span className="text-[12px] text-ink-3">Loading content…</span>}
      {model && <label className="text-xs text-ink-2 font-medium">Item<select className="mt-1 w-full border border-line-2 rounded-md px-2 py-1.5 text-[13px] font-normal text-ink bg-surface" value={entity} onChange={(e) => setEntity(e.target.value)}><option value="">Choose…</option>{(byModel[model] ?? []).map((x) => <option key={x.path} value={x.path}>{x.title}{x.status === "draft" ? " (draft)" : ""}</option>)}</select></label>}
      {model && <label className="text-xs text-ink-2 font-medium">Name in tokens<input className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] font-mono font-normal text-ink bg-surface" value={alias} onChange={(e) => setAlias(e.target.value.trim())} /><small className={`font-normal ${alias && !aliasOk ? "text-crit" : "text-ink-3"}`}>{alias && !aliasOk ? (alias in bindings ? "Already used on this page" : "Letters and numbers only, starting with a letter") : <>Tokens will look like <span className="font-mono">{`{{${alias || "name"}.title}}`}</span></>}</small></label>}
      <div className="flex justify-end gap-2"><button className="btn btn-sm" onClick={() => { setAdding(false); pickModel(""); }}>Cancel</button><button className="btn btn-sm btn-primary" disabled={!entity || !aliasOk || busy} onClick={() => void add()}>{busy ? "Linking…" : "Link"}</button></div>
    </div> : <button className="btn btn-sm justify-center" onClick={() => setAdding(true)}>＋ Link content</button>)}
    {err && <div role="alert" className="text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded">{err}</div>}
  </div>;
}
