"use client";
import { useEffect, useRef, useState } from "react";
import type { Model, ModelField } from "@/lib/ucp/types";
import { makeBlock } from "@/lib/blocks/registry";
import { RenderBlock } from "@/lib/blocks/Render";

const inp = "border border-line-2 rounded-md px-2.5 py-1.5 text-sm text-ink bg-surface w-full";

/** What authors see: disabled controls generated per field type. */
export function FormPreview({ md, fields, locales }: { md: Pick<Model, "name">; fields: ModelField[]; locales: string[] }) {
  const ctl = (f: ModelField) => { switch (f.t) {
    case "Rich text": case "Long text": return <textarea rows={3} disabled className={inp} placeholder={f.t === "Rich text" ? "Rich text editor" : f.default || f.l} />;
    case "Date": return <input type="date" disabled className={inp} />;
    case "Date & time": return <input type="datetime-local" disabled className={inp} />;
    case "Number": case "Decimal": return <input type="number" disabled className={inp} placeholder={f.default || "0"} />;
    case "Enum": case "Select": return <select disabled className={inp}><option>{f.validation?.options?.length ? `Choose… (${f.validation.options.join(", ")})` : "Choose…"}</option></select>;
    case "Multi-select": return <div className="inline-flex border border-line-2 rounded-md overflow-hidden text-sm">{(f.validation?.options?.length ? f.validation.options.slice(0, 4) : ["Option A", "Option B", "Option C"]).map((o, i) => <button type="button" key={o} disabled className={`px-3 py-1.5 ${i === 0 ? "bg-ink text-white" : "bg-surface"}`}>{o}</button>)}</div>;
    case "Asset": case "Image": return <div className="flex gap-3 items-center border border-line-2 rounded-md p-2.5"><div className="w-16 h-12 bg-surface-3 rounded" /><div><b className="block text-sm">Choose {f.t === "Image" ? "an image" : "a file"}</b><small className="text-ink-3">from the asset library</small><div className="mt-1.5"><span className="btn btn-sm btn-secondary">Change {f.t === "Image" ? "image" : "file"}</span></div></div></div>;
    case "Reference": return <select disabled className={inp}><option>Pick {f.validation?.multiple ? "one or more" : "a"} {f.validation?.referenceModel ?? (f.k === "template" ? "template" : "content item")}{f.validation?.multiple ? " items" : ""}…</option></select>;
    case "Form reference": return <select disabled className={inp}><option>Pick a form…</option></select>;
    case "List": return <div className="grid gap-2"><div className="border border-line-2 rounded-md p-2.5"><b className="block text-xs mb-1">Item 1</b><label className="text-xs text-ink-3">Value<input disabled className={`${inp} mt-1`} /></label></div><span className="btn btn-sm btn-secondary justify-center">+ Add item</span></div>;
    case "Blocks": return <div className="p-3.5 text-center text-ink-3 border border-dashed border-line-2 rounded-lg text-sm">Blocks are edited on the page canvas</div>;
    case "Group": return <div className="border border-line-2 rounded-md p-2.5 grid gap-2"><label className="text-xs text-ink-3">Label<input disabled className={`${inp} mt-1`} /></label><label className="text-xs text-ink-3">Link<input disabled className={`${inp} mt-1`} /></label></div>;
    case "JSON": return <textarea rows={3} disabled className={`${inp}`} placeholder={"{ }"} />;
    case "URL": return <input type="url" disabled className={inp} placeholder={f.default || "https://"} />;
    default: return <input type="text" disabled className={inp} placeholder={f.default || f.l} />; } };
  const shown = fields.filter((f) => !f.hidden);
  return <div><div className="border border-line rounded-lg overflow-hidden"><div className="flex items-center gap-2 bg-surface-2 border-b border-line px-3.5 py-2 text-sm"><b>What authors see</b><span className="text-ink-3">generated from the fields of {md.name} · {shown.length} field{shown.length === 1 ? "" : "s"}{fields.length !== shown.length ? ` · ${fields.length - shown.length} hidden` : ""}</span></div>
    <div className="p-3.5 grid gap-3 max-w-[560px]">{shown.length ? shown.map((f) => f.t === "Boolean" ? <div key={f.k} className="flex items-center justify-between text-sm"><span>{f.l}</span><span className={`w-9 h-5 rounded-full relative ${f.default === "true" ? "bg-good" : "bg-surface-3 border border-line-2"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow ${f.default === "true" ? "right-0.5" : "left-0.5"}`} /></span></div>
      : <div key={f.k}><label className="text-xs text-ink-3 block mb-1">{f.l}{f.req && <small className="ml-1.5 text-brand">required</small>}{f.loc && <small className="ml-1.5 text-info">localised</small>}</label>{ctl(f)}{f.desc && <small className="block text-xs text-ink-4 mt-1">{f.desc}</small>}</div>) : <div className="text-ink-3 text-sm">No fields yet.</div>}</div></div>
    <p className="text-xs text-ink-3 mt-2">Required fields block “Send for review”. Localised fields get one value per locale ({locales.join(", ")}).</p></div>;
}

/** Block type rendered with default content, scaled to fit the card. */
export function BlockPreview({ type }: { type: string }) {
  const outer = useRef<HTMLDivElement>(null); const inner = useRef<HTMLDivElement>(null); const [box, setBox] = useState({ scale: 0.6, h: 300 });
  useEffect(() => { const fit = () => { if (!outer.current || !inner.current) return; const s = Math.min(1, outer.current.clientWidth / 1200); setBox({ scale: s, h: inner.current.offsetHeight * s }); }; fit(); const ro = new ResizeObserver(fit); if (outer.current) ro.observe(outer.current); if (inner.current) ro.observe(inner.current); return () => ro.disconnect(); }, [type]);
  const [b] = useState(() => makeBlock(type));
  return <div><div ref={outer} className="overflow-hidden bg-surface-3 border border-line rounded-lg p-3" style={{ height: box.h + 24 }}><div ref={inner} className="site desktop" style={{ transform: `scale(${box.scale})`, transformOrigin: "top left", margin: 0 }}><RenderBlock b={b} /></div></div>
    <p className="text-xs text-ink-3 mt-2">Rendered with the block’s default content. Fields map one-to-one to what authors edit in the Page Builder.</p></div>;
}

/** Core-model relationship diagram (SVG). Click a box to open that model (through the caller's navigation guard). */
