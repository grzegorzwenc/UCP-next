"use client";
import { useEffect, useRef, useState } from "react";
import type { Model, ModelField } from "@/lib/ucp/types";
import { makeBlock } from "@/lib/blocks/registry";
import { RenderBlock } from "@/lib/blocks/Render";

const inp = "border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink bg-surface w-full";

/** What authors see: disabled controls generated per field type. */
export function FormPreview({ md, fields, locales }: { md: Pick<Model, "name">; fields: ModelField[]; locales: string[] }) {
  const ctl = (f: ModelField) => { switch (f.t) {
    case "Rich text": case "Long text": return <textarea rows={3} disabled className={inp} placeholder={f.t === "Rich text" ? "Rich text editor" : f.default || f.l} />;
    case "Date": return <input type="date" disabled className={inp} />;
    case "Date & time": return <input type="datetime-local" disabled className={inp} />;
    case "Number": case "Decimal": return <input type="number" disabled className={inp} placeholder={f.default || "0"} />;
    case "Enum": case "Select": return <select disabled className={inp}><option>{f.validation?.options?.length ? `Choose… (${f.validation.options.join(", ")})` : "Choose…"}</option></select>;
    case "Multi-select": return <div className="inline-flex border border-line-2 rounded-md overflow-hidden text-[13px]">{(f.validation?.options?.length ? f.validation.options.slice(0, 4) : ["Option A", "Option B", "Option C"]).map((o, i) => <button type="button" key={o} disabled className={`px-3 py-1.5 ${i === 0 ? "bg-ink text-white" : "bg-surface"}`}>{o}</button>)}</div>;
    case "Asset": case "Image": return <div className="flex gap-3 items-center border border-line-2 rounded-md p-2.5"><div className="w-16 h-12 bg-surface-3 rounded" /><div><b className="block text-[13px]">Choose {f.t === "Image" ? "an image" : "a file"}</b><small className="text-ink-3">from the asset library</small><div className="mt-1.5"><span className="btn btn-sm">Change {f.t === "Image" ? "image" : "file"}</span></div></div></div>;
    case "Reference": return <select disabled className={inp}><option>Pick a {f.validation?.referenceModel ?? (f.k === "template" ? "template" : "content item")}…</option></select>;
    case "Form reference": return <select disabled className={inp}><option>Pick a form…</option></select>;
    case "List": return <div className="grid gap-2"><div className="border border-line-2 rounded-md p-2.5"><b className="block text-[12.5px] mb-1">Item 1</b><label className="text-xs text-ink-3">Value<input disabled className={`${inp} mt-1`} /></label></div><span className="btn btn-sm justify-center">+ Add item</span></div>;
    case "Blocks": return <div className="p-3.5 text-center text-ink-3 border border-dashed border-line-2 rounded-lg text-[13px]">Blocks are edited on the page canvas</div>;
    case "Group": return <div className="border border-line-2 rounded-md p-2.5 grid gap-2"><label className="text-xs text-ink-3">Label<input disabled className={`${inp} mt-1`} /></label><label className="text-xs text-ink-3">Link<input disabled className={`${inp} mt-1`} /></label></div>;
    case "JSON": return <textarea rows={3} disabled className={`${inp} font-mono`} placeholder={"{ }"} />;
    case "URL": return <input type="url" disabled className={inp} placeholder={f.default || "https://"} />;
    default: return <input type="text" disabled className={inp} placeholder={f.default || f.l} />; } };
  const shown = fields.filter((f) => !f.hidden);
  return <div><div className="border border-line rounded-lg overflow-hidden"><div className="flex items-center gap-2 bg-surface-2 border-b border-line px-3.5 py-2 text-[13px]"><b>What authors see</b><span className="text-ink-3">generated from the fields of {md.name} · {shown.length} field{shown.length === 1 ? "" : "s"}{fields.length !== shown.length ? ` · ${fields.length - shown.length} hidden` : ""}</span></div>
    <div className="p-3.5 grid gap-3 max-w-[560px]">{shown.length ? shown.map((f) => f.t === "Boolean" ? <div key={f.k} className="flex items-center justify-between text-[13px]"><span>{f.l}</span><span className={`w-9 h-5 rounded-full relative ${f.default === "true" ? "bg-good" : "bg-surface-3 border border-line-2"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow ${f.default === "true" ? "right-0.5" : "left-0.5"}`} /></span></div>
      : <div key={f.k}><label className="text-xs text-ink-3 block mb-1">{f.l}{f.req && <small className="ml-1.5 text-accent">required</small>}{f.loc && <small className="ml-1.5 text-info">localised</small>}</label>{ctl(f)}{f.desc && <small className="block text-[11.5px] text-ink-4 mt-1">{f.desc}</small>}</div>) : <div className="text-ink-3 text-[13px]">No fields yet.</div>}</div></div>
    <p className="text-[12.5px] text-ink-3 mt-2">Required fields block “Send for review”. Localised fields get one value per locale ({locales.join(", ")}).</p></div>;
}

/** Block type rendered with default content, scaled to fit the card. */
export function BlockPreview({ type }: { type: string }) {
  const outer = useRef<HTMLDivElement>(null); const inner = useRef<HTMLDivElement>(null); const [box, setBox] = useState({ scale: 0.6, h: 300 });
  useEffect(() => { const fit = () => { if (!outer.current || !inner.current) return; const s = Math.min(1, outer.current.clientWidth / 1200); setBox({ scale: s, h: inner.current.offsetHeight * s }); }; fit(); const ro = new ResizeObserver(fit); if (outer.current) ro.observe(outer.current); if (inner.current) ro.observe(inner.current); return () => ro.disconnect(); }, [type]);
  const [b] = useState(() => makeBlock(type));
  return <div><div ref={outer} className="overflow-hidden bg-surface-3 border border-line rounded-lg p-3" style={{ height: box.h + 24 }}><div ref={inner} className="site desktop" style={{ transform: `scale(${box.scale})`, transformOrigin: "top left", margin: 0 }}><RenderBlock b={b} /></div></div>
    <p className="text-[12.5px] text-ink-3 mt-2">Rendered with the block’s default content. Fields map one-to-one to what authors edit in the Page Builder.</p></div>;
}

/** Core-model relationship diagram (SVG). Click a box to open that model (through the caller's navigation guard). */
export function Diagram({ models, selected, onOpen }: { models: Model[]; selected: string; onOpen: (id: string) => void }) {
  const BW = 210, COLS = 3, CW = 260, RH = 230; const BH = (m: Model) => 34 + Math.min(m.fields.length, 8) * 18 + 8;
  const pos: Record<string, { x: number; y: number }> = {}; models.forEach((m, i) => { pos[m.id] = { x: 20 + (i % COLS) * CW, y: 20 + Math.floor(i / COLS) * RH }; });
  const refs: [string, string, string][] = []; models.forEach((m) => m.fields.forEach((f) => { if (f.t === "Reference" || f.t === "Blocks") { const tgt = f.validation?.referenceModel ?? (f.k === "relatedProducts" || f.k === "product" ? "product" : f.k === "landingPage" || f.k === "blocks" ? "page" : null); if (tgt && pos[tgt] && tgt !== m.id) refs.push([m.id, tgt, f.l]); } }));
  const W = 20 + Math.min(models.length, COLS) * CW, H = 20 + Math.ceil(models.length / COLS) * RH;
  const byId = (id: string) => models.find((m) => m.id === id)!;
  return <div><div className="border border-line rounded-lg bg-surface-2 overflow-auto"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Content model diagram" className="w-full max-w-[900px] block" style={{ fontFamily: "var(--font-sans)" }}>
    {refs.map(([a, b, l], i) => { const pa = pos[a], pb = pos[b]; const x1 = pa.x + BW / 2, y1 = pa.y + BH(byId(a)) / 2, x2 = pb.x + BW / 2, y2 = pb.y + BH(byId(b)) / 2; return <g key={i}><path d={`M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`} fill="none" stroke="#DB0011" strokeWidth={1.5} strokeDasharray="4 3" /><circle cx={x2} cy={y2} r={4} fill="#DB0011" /><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize={10.5} fill="#DB0011">{l}</text></g>; })}
    {models.map((m) => { const q = pos[m.id]; const on = m.id === selected; return <g key={m.id} role="link" tabIndex={0} aria-label={`Open ${m.name}`} style={{ cursor: "pointer" }} onClick={() => onOpen(m.id)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(m.id); }}>
      <rect x={q.x} y={q.y} width={BW} height={BH(m)} fill="#fff" stroke={on ? "#DB0011" : "#D7D8DC"} strokeWidth={on ? 2 : 1} /><rect x={q.x} y={q.y} width={BW} height={28} fill={on ? "#DB0011" : "#17181C"} />
      <text x={q.x + 10} y={q.y + 19} fontSize={13} fontWeight={600} fill="#fff">{m.name} <tspan fontWeight={400} fontSize={11} fill="#ffffffb3">v{m.version}</tspan></text>
      {m.fields.slice(0, 8).map((f, i) => <text key={f.k} x={q.x + 10} y={q.y + 46 + i * 18} fontSize={11.5} fill="#40434C">{f.req ? "● " : "○ "}{f.l}<tspan fill="#9DA1AC" fontFamily="var(--font-mono)" fontSize={10.5}> {f.t}</tspan></text>)}
      {m.fields.length > 8 && <text x={q.x + 10} y={q.y + 46 + 8 * 18} fontSize={11} fill="#9DA1AC">+{m.fields.length - 8} more</text>}</g>; })}
  </svg></div>
    <div className="flex flex-wrap gap-4 text-[12.5px] text-ink-3 mt-2"><span>● required field</span><span>○ optional</span><span className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-0.5 bg-accent" />reference between models</span><span>Click a model to open it</span></div></div>;
}
