"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Model, ModelField } from "@/lib/ucp/types";

/** A connection: the master model `from` has a Reference field that points to the connected model `to`. */
export type Relation = { from: string; to: string; key: string; label: string; many: boolean; req: boolean };

/** Where a Reference field points. Older seed fields carry no referenceModel, so a few well-known keys are mapped by name. */
export const targetOf = (f: ModelField): string | null => {
  if (f.t !== "Reference") return null;
  return f.validation?.referenceModel ?? (f.k === "relatedProducts" || f.k === "product" ? "product" : f.k === "landingPage" ? "page" : null);
};
export function relationsOf(models: Model[]): Relation[] {
  const ids = new Set(models.map((m) => m.id)); const out: Relation[] = [];
  for (const m of models) for (const f of m.fields) { const to = targetOf(f); if (to && to !== m.id && ids.has(to)) out.push({ from: m.id, to, key: f.k, label: f.l, many: !!f.validation?.multiple, req: f.req }); }
  return out;
}

const BW = 212, HEAD = 30, ROW = 18, SHOWN = 6, GX = 110, GY = 84, PAD = 24;
const bh = (m: Model) => HEAD + 10 + Math.min(m.fields.length, SHOWN) * ROW + (m.fields.length > SHOWN ? ROW : 0) + 6;
type Pt = { x: number; y: number };

/** Layout: master models sit above the models they are connected to (Page → Product → Rate). Back edges of cycles are ignored. */
function treeLayout(models: Model[], rels: Relation[]): Record<string, Pt> {
  const out = new Map<string, string[]>(); for (const r of rels) if (r.from !== r.to) (out.get(r.from) ?? out.set(r.from, []).get(r.from)!).push(r.to);
  const indeg = new Map(models.map((m) => [m.id, 0])); for (const r of rels) if (r.from !== r.to) indeg.set(r.to, (indeg.get(r.to) ?? 0) + 1);
  const level = new Map<string, number>(); const state = new Map<string, 1 | 2>(); const dag: [string, string][] = [];
  const dfs = (id: string) => { state.set(id, 1); for (const t of out.get(id) ?? []) { if (state.get(t) === 1) continue; dag.push([id, t]); if (!state.get(t)) dfs(t); } state.set(id, 2); };
  for (const m of models) if (!indeg.get(m.id)) dfs(m.id);
  for (const m of models) if (!state.get(m.id)) dfs(m.id);
  for (const m of models) level.set(m.id, 0);
  for (let i = 0; i < models.length; i++) for (const [a, b] of dag) if (level.get(b)! < level.get(a)! + 1) level.set(b, level.get(a)! + 1);
  const rows: Model[][] = []; for (const m of models) (rows[level.get(m.id)!] ??= []).push(m);
  const W = Math.max(...rows.map((r) => r?.length ?? 0)) * (BW + GX);
  const pos: Record<string, Pt> = {}; let y = PAD;
  for (const r of rows) { if (!r) continue; const rw = r.length * (BW + GX) - GX; r.forEach((m, i) => { pos[m.id] = { x: PAD + (W - GX - rw) / 2 + i * (BW + GX), y }; }); y += Math.max(...r.map(bh)) + GY; }
  return pos;
}
/* Box positions the user dragged to, kept in localStorage and read through an external store (no setState in effects). */
const subs = new Set<() => void>();
const readRaw = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeRaw = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode: positions just are not kept */ } subs.forEach((f) => f()); };
function useStoredPositions(k: string): Record<string, Pt> {
  const raw = useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => readRaw(k), () => null);
  return useMemo(() => { try { return raw ? (JSON.parse(raw) as Record<string, Pt>) : {}; } catch { return {}; } }, [raw]);
}
const center = (p: Pt, m: Model) => ({ x: p.x + BW / 2, y: p.y + bh(m) / 2 });

/** Path between two boxes: vertical when one sits above the other, horizontal otherwise; `bend` spreads parallel links apart. */
function edgePath(a: Pt, ma: Model, b: Pt, mb: Model, bend: number): { d: string; lx: number; ly: number; end: Pt } {
  const ca = center(a, ma), cb = center(b, mb); const ha = bh(ma), hb = bh(mb);
  if (b.y >= a.y + ha + 8 || a.y >= b.y + hb + 8) { const down = b.y > a.y; const x1 = ca.x + bend, y1 = down ? a.y + ha : a.y, x2 = cb.x + bend, y2 = down ? b.y : b.y + hb; const my = (y1 + y2) / 2;
    return { d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`, lx: (x1 + x2) / 2, ly: my - 5, end: { x: x2, y: y2 } }; }
  const right = b.x > a.x; const x1 = right ? a.x + BW : a.x, y1 = ca.y + bend / 2, x2 = right ? b.x : b.x + BW, y2 = cb.y + bend / 2; const mx = (x1 + x2) / 2;
  return { d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`, lx: mx, ly: (y1 + y2) / 2 - 6, end: { x: x2, y: y2 } };
}

type Props = {
  models: Model[]; selected?: string; onOpen: (id: string) => void;
  /** Which models may get a new link from here (admins; in the editor only the model being edited). */
  canConnect?: (from: string) => boolean; onConnect?: (from: string, to: string) => void; onRemove?: (r: Relation) => void;
  /** localStorage key for positions the user dragged boxes to. */
  storageKey?: string;
};

/**
 * Content model map. Boxes are models, arrows are Reference fields. Admins drag from the ＋ handle of a model onto another
 * model to connect them (master → connected model); clicking the handle then a model does the same.
 * Boxes can be dragged to tidy the picture (kept per browser). Click a box to open the model, click an arrow to inspect or remove it.
 */
export function ModelMap({ models, selected, onOpen, canConnect, onConnect, onRemove, storageKey = "ucp-model-map" }: Props) {
  const rels = useMemo(() => relationsOf(models), [models]);
  const key = `${storageKey}:tree`; const stored = useStoredPositions(key);
  const [moving, setMoving] = useState<{ id: string; p: Pt } | null>(null); // box being dragged right now
  const custom = useMemo(() => (moving ? { ...stored, [moving.id]: moving.p } : stored), [stored, moving]);
  const auto = useMemo(() => treeLayout(models, rels), [models, rels]);
  const pos = useMemo(() => { const o: Record<string, Pt> = {}; for (const m of models) o[m.id] = custom[m.id] ?? auto[m.id]; return o; }, [models, auto, custom]);
  const byId = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);

  const svg = useRef<SVGSVGElement>(null);
  type Link = { from: string; x: number; y: number; moved: boolean } | null;
  const [link, setLinkState] = useState<Link>(null); const linkRef = useRef<Link>(null); // ref = what fast pointer events read before React re-renders
  const setLink = (v: Link) => { linkRef.current = v; setLinkState(v); };
  const [pick, setPick] = useState<string | null>(null); // click-to-connect mode: the source model
  const [edge, setEdge] = useState<string | null>(null); // `${from}.${key}`
  const drag = useRef<{ id: string; dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setPick(null); linkRef.current = null; setLinkState(null); setEdge(null); } }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, []);

  const W = Math.max(640, ...models.map((m) => pos[m.id].x + BW + 90)); const H = Math.max(240, ...models.map((m) => pos[m.id].y + bh(m) + PAD));
  const toSvg = (e: { clientX: number; clientY: number }): Pt => { const s = svg.current; const ctm = s?.getScreenCTM(); if (!s || !ctm) return { x: 0, y: 0 }; const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse()); return { x: p.x, y: p.y }; };
  const hit = (p: Pt) => models.find((m) => p.x >= pos[m.id].x && p.x <= pos[m.id].x + BW && p.y >= pos[m.id].y && p.y <= pos[m.id].y + bh(m))?.id;
  const connectable = (id: string) => !!onConnect && (canConnect?.(id) ?? true);
  const persist = (next: Record<string, Pt>) => writeRaw(key, Object.keys(next).length ? JSON.stringify(next) : null);
  const finishConnect = (from: string, to: string) => { setPick(null); setLink(null); onConnect?.(from, to); };

  const onBoxDown = (e: React.PointerEvent, id: string) => { if (e.button !== 0) return; const p = toSvg(e); drag.current = { id, dx: p.x - pos[id].x, dy: p.y - pos[id].y, sx: p.x, sy: p.y, moved: false }; svg.current?.setPointerCapture(e.pointerId); };
  const onHandleDown = (e: React.PointerEvent, id: string) => { e.stopPropagation(); if (e.button !== 0) return; const p = toSvg(e); setLink({ from: id, x: p.x, y: p.y, moved: false }); svg.current?.setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    const p = toSvg(e);
    const l = linkRef.current; if (l) { setLink({ ...l, x: p.x, y: p.y, moved: l.moved || Math.hypot(p.x - pos[l.from].x - BW + 16, p.y - pos[l.from].y - HEAD / 2) > 10 }); return; }
    const d = drag.current; if (!d) return;
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) < 5) return;
    d.moved = true; setMoving({ id: d.id, p: { x: Math.max(4, p.x - d.dx), y: Math.max(4, p.y - d.dy) } });
  };
  const onUp = (e: React.PointerEvent) => {
    const l = linkRef.current; if (l) { const p = toSvg(e); const to = hit(p); const moved = l.moved || Math.hypot(p.x - pos[l.from].x - BW + 16, p.y - pos[l.from].y - HEAD / 2) > 10; if (moved && to && to !== l.from) finishConnect(l.from, to); else if (!moved) { setPick(l.from); setLink(null); } else setLink(null); return; }
    const d = drag.current; drag.current = null; if (!d) return;
    if (d.moved) { persist({ ...stored, [d.id]: pos[d.id] }); setMoving(null); return; }
    if (pick) { if (pick !== d.id) finishConnect(pick, d.id); } else onOpen(d.id);
  };

  const pairs = new Map<string, number>(); // spread parallel links between the same two models
  const sel = edge ? rels.find((r) => `${r.from}.${r.key}` === edge) : undefined;
  const hover = link?.moved ? hit({ x: link.x, y: link.y }) : undefined; const hoverOk = hover && hover !== link?.from ? hover : undefined;
  const busy = !!link || !!pick;

  return <div>
    <div className="flex flex-wrap items-center gap-2 mb-2">
      {Object.keys(stored).length > 0 && <button type="button" className="btn btn-sm btn-quiet" onClick={() => persist({})}>Reset positions</button>}
      <span className="text-[12.5px] text-ink-3 ml-1">{onConnect ? <>Drag <b className="text-accent">＋</b> from one model onto another to connect them. Click a line to remove it.</> : "Click a model to open it."}</span>
    </div>
    {pick && <div role="status" className="flex items-center gap-2 text-[13px] bg-info-soft border border-line rounded-md px-3 py-2 mb-2">Click the model to connect <b>{byId.get(pick)?.name}</b> to.<button type="button" className="btn btn-sm ml-auto" onClick={() => setPick(null)}>Cancel</button></div>}
    <div className="border border-line rounded-lg bg-surface-2 overflow-auto" style={{ backgroundImage: "radial-gradient(#D7D8DC 1px, transparent 1px)", backgroundSize: "18px 18px" }}>
      <svg ref={svg} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Content model map" className="block select-none touch-none [&_g:focus]:outline-none [&_g:focus-visible]:outline-2 [&_g:focus-visible]:outline-accent" style={{ fontFamily: "var(--font-sans)", cursor: busy ? "crosshair" : undefined }} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; setLink(null); setMoving(null); }}>
        <defs>
          <marker id="mm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#6B6F7A" /></marker>
          <marker id="mm-arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#DB0011" /></marker>
        </defs>
        {rels.map((r) => {
          const a = byId.get(r.from)!, b = byId.get(r.to)!; const pk = [r.from, r.to].sort().join("|"); const n = pairs.get(pk) ?? 0; pairs.set(pk, n + 1);
          const g = edgePath(pos[r.from], a, pos[r.to], b, n * 16); const id = `${r.from}.${r.key}`; const on = edge === id || (!!selected && (r.from === selected || r.to === selected));
          const strong = edge === id; const txt = r.label;
          return <g key={id} role="button" tabIndex={0} aria-label={`${a.name} to ${b.name}: ${txt}`} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setEdge(edge === id ? null : id); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEdge(edge === id ? null : id); } }} onPointerDown={(e) => e.stopPropagation()}>
            <path d={g.d} fill="none" stroke="transparent" strokeWidth={14} />
            <path d={g.d} fill="none" stroke={on ? "#DB0011" : "#8A8F99"} strokeWidth={strong ? 2.6 : on ? 1.8 : 1.4} markerEnd={`url(#${on ? "mm-arrow-on" : "mm-arrow"})`} />
            <rect x={g.lx - txt.length * 3.1 - 6} y={g.ly - 11} width={txt.length * 6.2 + 12} height={16} rx={8} fill="#fff" stroke={on ? "#DB0011" : "#D7D8DC"} />
            <text x={g.lx} y={g.ly + 1} textAnchor="middle" fontSize={10.5} fill={on ? "#AF000D" : "#40434C"}>{txt}</text>
          </g>;
        })}
        {link?.moved && (() => { const s = pos[link.from]; return <path d={`M${s.x + BW - 16},${s.y + HEAD / 2} L${link.x},${link.y}`} stroke="#DB0011" strokeWidth={2} strokeDasharray="6 4" fill="none" markerEnd="url(#mm-arrow-on)" pointerEvents="none" />; })()}
        {models.map((m) => {
          const q = pos[m.id]; const on = m.id === selected; const target = hoverOk === m.id || (!!pick && busy && pick !== m.id); const h = bh(m); const canLink = connectable(m.id);
          return <g key={m.id} role="link" tabIndex={0} aria-label={pick ? `Link ${byId.get(pick)?.name} to ${m.name}` : `Open ${m.name}`} style={{ cursor: pick ? "crosshair" : "grab" }}
            onPointerDown={(e) => onBoxDown(e, m.id)} onKeyDown={(e) => { if (e.key === "Enter") { if (pick) { if (pick !== m.id) finishConnect(pick, m.id); } else onOpen(m.id); } }}>
            <rect x={q.x + 2} y={q.y + 3} width={BW} height={h} rx={6} fill="#0F10131A" />
            <rect x={q.x} y={q.y} width={BW} height={h} rx={6} fill="#fff" stroke={hoverOk === m.id || on ? "#DB0011" : "#D7D8DC"} strokeWidth={hoverOk === m.id ? 2.5 : on ? 2 : 1} strokeDasharray={target && hoverOk !== m.id ? "4 3" : undefined} />
            <path d={`M${q.x},${q.y + 6} a6,6 0 0 1 6,-6 h${BW - 12} a6,6 0 0 1 6,6 v${HEAD - 6} h-${BW} z`} fill={on ? "#DB0011" : "#17181C"} />
            <text x={q.x + 10} y={q.y + 19.5} fontSize={13} fontWeight={600} fill="#fff">{m.name.length > 20 ? `${m.name.slice(0, 19)}…` : m.name} <tspan fontWeight={400} fontSize={11} fill="#ffffffb3">v{m.version}</tspan></text>
            {m.fields.slice(0, SHOWN).map((f, i) => { const ref = !!targetOf(f); return <text key={f.k} x={q.x + 10} y={q.y + HEAD + 18 + i * ROW} fontSize={11.5} fill={ref ? "#AF000D" : "#40434C"}>{ref ? "⇄ " : f.req ? "● " : "○ "}{f.l.length > 18 ? `${f.l.slice(0, 17)}…` : f.l}<tspan fill="#9DA1AC" fontFamily="var(--font-mono)" fontSize={10.5}> {f.t}</tspan></text>; })}
            {m.fields.length > SHOWN && <text x={q.x + 10} y={q.y + HEAD + 18 + SHOWN * ROW} fontSize={11} fill="#9DA1AC">+{m.fields.length - SHOWN} more</text>}
            {canLink && <g role="button" tabIndex={0} aria-label={`Link ${m.name} to another model`} style={{ cursor: "crosshair" }} onPointerDown={(e) => onHandleDown(e, m.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); setPick(m.id); } }}>
              <title>Drag onto another model to link them</title>
              <circle cx={q.x + BW - 16} cy={q.y + HEAD / 2} r={9} fill={pick === m.id ? "#DB0011" : "#fff"} stroke="#DB0011" strokeWidth={1.5} />
              <text x={q.x + BW - 16} y={q.y + HEAD / 2 + 4.5} textAnchor="middle" fontSize={14} fontWeight={700} fill={pick === m.id ? "#fff" : "#DB0011"}>+</text></g>}
          </g>;
        })}
      </svg>
    </div>
    {sel ? <div className="flex flex-wrap items-center gap-2 mt-2 bg-surface border border-line rounded-lg px-3 py-2 text-[13px]">
      <span><b>{byId.get(sel.from)?.name}</b> → <b>{byId.get(sel.to)?.name}</b></span>
      <span className="ml-auto flex gap-2"><button type="button" className="btn btn-sm" onClick={() => setEdge(null)}>Close</button>{onRemove && connectable(sel.from) && <button type="button" className="btn btn-sm text-crit" onClick={() => { setEdge(null); onRemove(sel); }}>Remove connection</button>}</span></div> : null}
  </div>;
}
