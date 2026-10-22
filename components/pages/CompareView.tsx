"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Block } from "@/lib/api/types";
import type { ComponentNode } from "@/lib/repo/types";
import { componentsToBlocks } from "@/lib/repo/mapping";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { BLOCK_BY_TYPE } from "@/lib/blocks/registry";
import { toPlain } from "@/lib/blocks/richtext";
import { RenderBlock, SiteChrome, AssetsContext } from "@/lib/blocks/Render";

type Side = { label: string; title: string; components: unknown[]; time?: string; who?: string };
type Diff = { id: string; kind: "added" | "removed" | "changed" | "moved"; name: string; fields?: { label: string; before: string; after: string }[] };

const when = (t?: string) => (t ? new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");
const plain = (v: unknown) => { const s = typeof v === "string" ? toPlain(v) : v == null ? "" : JSON.stringify(v); return s.length > 90 ? s.slice(0, 89) + "…" : s; };

/** Block by block: what the authoring version adds, removes, changes or moves compared with the live page. */
function diff(live: Block[], draft: Block[]): Diff[] {
  const L = new Map(live.map((b, i) => [b.id, { b, i }])); const D = new Map(draft.map((b, i) => [b.id, { b, i }])); const out: Diff[] = [];
  const liveOrder = live.filter((b) => D.has(b.id)).map((b) => b.id); const draftOrder = draft.filter((b) => L.has(b.id)).map((b) => b.id);
  for (const b of draft) {
    const name = BLOCK_BY_TYPE[b.type]?.name ?? b.type; const l = L.get(b.id);
    if (!l) { out.push({ id: b.id, kind: "added", name }); continue; }
    const keys = [...new Set([...Object.keys(l.b.props), ...Object.keys(b.props)])];
    const fields = keys.filter((k) => JSON.stringify(l.b.props[k] ?? "") !== JSON.stringify(b.props[k] ?? "")).map((k) => ({ label: BLOCK_BY_TYPE[b.type]?.fields.find((f) => f.k === k)?.l ?? (k === "hidden" ? "Hidden" : k), before: plain(l.b.props[k]), after: plain(b.props[k]) }));
    if (fields.length) out.push({ id: b.id, kind: "changed", name, fields });
    else if (liveOrder.indexOf(b.id) !== draftOrder.indexOf(b.id)) out.push({ id: b.id, kind: "moved", name });
  }
  for (const b of live) if (!D.has(b.id)) out.push({ id: b.id, kind: "removed", name: BLOCK_BY_TYPE[b.type]?.name ?? b.type });
  return out;
}

/** The page at 1200 px, scaled down to the pane. */
function Pane({ children, paneRef, onScroll }: { children: React.ReactNode; paneRef: React.RefObject<HTMLDivElement | null>; onScroll: () => void }) {
  const box = useRef<HTMLDivElement>(null); const site = useRef<HTMLDivElement>(null); const [w, setW] = useState(0); const [h, setH] = useState(0);
  useEffect(() => { const b = box.current, s = site.current; if (!b || !s) return; const ro = new ResizeObserver(() => { setW(b.clientWidth); setH(s.offsetHeight); }); ro.observe(b); ro.observe(s); return () => ro.disconnect(); }, []);
  const fit = w ? Math.min(1, (w - 2) / 1200) : 1;
  return <div ref={paneRef} onScroll={onScroll} className="min-h-0 overflow-auto bg-bg p-3"><div ref={box} className="w-full"><div style={{ height: h ? h * fit : undefined }}><div ref={site} className="preview bg-white shadow-sm" style={{ width: 1200, transform: `scale(${fit})`, transformOrigin: "top left" }}>{children}</div></div></div></div>;
}

const TONE: Record<Diff["kind"], { word: string; cls: string; dot: string }> = {
  added: { word: "Added", cls: "text-good", dot: "bg-good" }, removed: { word: "Removed", cls: "text-crit", dot: "bg-crit" },
  changed: { word: "Changed", cls: "text-warn", dot: "bg-warn" }, moved: { word: "Moved", cls: "text-info", dot: "bg-info" },
};

/**
 * Compare: an authoring version (the current draft or a saved version) next to the live page, differences outlined on both pages
 * and listed on the right. Only for pages that are live (nothing to compare otherwise).
 */
export function CompareView({ marketId, marketName, path, onClose }: { marketId: string; marketName: string; path: string; onClose: () => void }) {
  const [version, setVersion] = useState("current");
  const [data, setData] = useState<{ live: Side | null; authoring: Side; versions: { id: string; time: string; who: string; note: string }[] } | null>(null);
  const [assets, setAssets] = useState<Record<string, { data?: string; alt?: string }>>({}); const [err, setErr] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => { let on = true; ucpApi.compare(path, version).then((d) => on && setData(d), (e) => on && setErr(errorText(e))); return () => { on = false; }; }, [path, version]);
  useEffect(() => { let on = true; ucpApi.assets(marketId).then((l) => on && setAssets(Object.fromEntries(l.map((a) => [a.id, { data: a.data }]))), () => {}); return () => { on = false; }; }, [marketId]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const liveBlocks = useMemo(() => (data?.live ? componentsToBlocks(data.live.components as ComponentNode[]) : []), [data]);
  const draftBlocks = useMemo(() => (data ? componentsToBlocks(data.authoring.components as ComponentNode[]) : []), [data]);
  const diffs = useMemo(() => diff(liveBlocks, draftBlocks), [liveBlocks, draftBlocks]);
  const state = useMemo(() => new Map(diffs.map((d) => [d.id, d.kind])), [diffs]);
  const titleChanged = !!data?.live && data.live.title !== data.authoring.title;

  /* the two pages scroll together */
  const left = useRef<HTMLDivElement>(null); const right = useRef<HTMLDivElement>(null); const syncing = useRef(false);
  const sync = (fromLeft: boolean) => {
    const f = fromLeft ? left.current : right.current, t = fromLeft ? right.current : left.current;
    if (syncing.current || !f || !t) { syncing.current = false; return; }
    syncing.current = true; t.scrollTop = (f.scrollTop / Math.max(1, f.scrollHeight - f.clientHeight)) * (t.scrollHeight - t.clientHeight);
  };
  const show = (id: string) => { setFocusId(id); for (const pane of [left.current, right.current]) { const el = pane?.querySelector<HTMLElement>(`[data-cmp="${id}"]`); if (el) { syncing.current = true; el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.remove("cmt-flash"); void el.offsetWidth; el.classList.add("cmt-flash"); } } };

  const page = (blocks: Block[], side: "draft" | "live", title: string) => <AssetsContext.Provider value={assets}><SiteChrome marketName={marketName} crumbs={[title]} device="desktop">
    {blocks.filter((b) => !b.props.hidden).map((b) => { const k = state.get(b.id); const mark = side === "live" ? (k === "removed" || k === "changed" ? k : undefined) : k && k !== "removed" ? k : undefined;
      return <div key={b.id} data-cmp={b.id} className={`cblk relative ${mark ? `cmp-${mark}` : ""} ${focusId === b.id ? "cmp-focus" : ""}`}>{mark && <span className={`cmp-tag cmp-tag-${mark}`}>{TONE[mark].word}</span>}<RenderBlock b={b} /></div>; })}
  </SiteChrome></AssetsContext.Provider>;

  return <div role="dialog" aria-modal="true" aria-label="Compare with live" className="fixed inset-0 z-[80] bg-bg flex flex-col">
    <header className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-surface border-b border-line">
      <b className="text-base">Compare with live</b><span className="text-ink-3 text-sm truncate">{data?.authoring.title ?? ""}</span>
      <button type="button" className="btn btn-sm ml-auto" onClick={onClose}>Close</button>
    </header>
    {err ? <p className="m-6 text-crit">{err}</p> : !data ? <p className="m-6 text-ink-3">Loading…</p> : !data.live ? <p className="m-6 text-ink-2">This page has never been published, so there is nothing to compare with.</p> :
    <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
      <section className="min-h-0 grid grid-rows-[auto_1fr] border-r border-line" aria-label="Authoring">
        <div className="flex items-center gap-2 px-3 py-2 bg-surface border-b border-line text-xs">
          <span className="font-medium text-xs uppercase tracking-[.06em] text-ink-3">Authoring</span>
          <select className="ml-1 min-w-0 flex-1 border border-line-2 rounded-md px-2 py-1 bg-surface text-xs" value={version} onChange={(e) => setVersion(e.target.value)} aria-label="Authoring version">
            <option value="current">Current draft</option>
            {data.versions.map((v) => <option key={v.id} value={v.id}>{when(v.time)} · {v.who.replace(/\./g, " ")}{v.note ? ` · ${v.note}` : ""}</option>)}
          </select>
        </div>
        <Pane paneRef={left} onScroll={() => sync(true)}>{page(draftBlocks, "draft", data.authoring.title)}</Pane>
      </section>
      <section className="min-h-0 grid grid-rows-[auto_1fr] border-r border-line" aria-label="Live">
        <div className="flex items-center gap-2 px-3 py-2 bg-surface border-b border-line text-xs"><span className="inline-flex items-center gap-1.5 font-medium text-xs uppercase tracking-[.06em] text-good"><i className="w-2 h-2 rounded-full bg-good" />Live</span><span className="text-ink-3 truncate">Published {when(data.live.time)}{data.live.who ? ` by ${data.live.who}` : ""}</span></div>
        <Pane paneRef={right} onScroll={() => sync(false)}>{page(liveBlocks, "live", data.live.title)}</Pane>
      </section>
      <aside className="min-h-0 overflow-auto bg-surface p-3.5 text-sm" aria-label="Differences">
        <b className="block text-sm">Differences</b>
        <p className="text-xs text-ink-3 mt-0.5">{diffs.length + (titleChanged ? 1 : 0) ? `${diffs.length + (titleChanged ? 1 : 0)} between ${version === "current" ? "the draft" : "this version"} and live` : "No differences · it matches the live page"}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-ink-3">{(Object.keys(TONE) as Diff["kind"][]).map((k) => <span key={k} className="inline-flex items-center gap-1"><i className={`w-2 h-2 rounded-full ${TONE[k].dot}`} />{TONE[k].word}</span>)}</div>
        <ul className="mt-3 grid gap-2">
          {titleChanged && <li className="rounded-lg border border-line p-2.5"><span className="text-xs font-medium uppercase tracking-[.06em] text-warn">Changed</span><b className="block">Page title</b><span className="block text-xs text-ink-3 line-through">{data.live.title}</span><span className="block text-xs">{data.authoring.title}</span></li>}
          {diffs.map((d) => <li key={d.id}><button type="button" onClick={() => show(d.id)} className={`w-full text-left rounded-lg border p-2.5 hover:bg-surface-2 ${focusId === d.id ? "border-ink-3" : "border-line"}`}>
            <span className={`text-xs font-medium uppercase tracking-[.06em] ${TONE[d.kind].cls}`}>{TONE[d.kind].word}</span><b className="block">{d.name}</b>
            {d.fields?.slice(0, 4).map((f, i) => <span key={i} className="block mt-1 text-xs"><span className="text-ink-3">{f.label}: </span>{f.before && <span className="text-ink-3 line-through">{f.before}</span>}{f.before && f.after ? " → " : ""}{f.after && <span>{f.after}</span>}</span>)}
            {d.fields && d.fields.length > 4 && <span className="block mt-1 text-xs text-ink-3">+{d.fields.length - 4} more fields</span>}
          </button></li>)}
        </ul>
      </aside>
    </div>}
  </div>;
}
