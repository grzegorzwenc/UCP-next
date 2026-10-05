"use client";
import { useState } from "react";
import type { Block } from "@/lib/api/types";
import { BLOCK_BY_TYPE } from "@/lib/blocks/registry";
import { RenderBlock } from "@/lib/blocks/Render";
import { MARKETS } from "@/lib/markets";
import { ModalShell } from "@/components/models/ModalShell";

/** Where a pattern shows: every market, or only the local markets ticked here. */
function MarketPicker({ value, onChange, current }: { value: string[]; onChange: (m: string[]) => void; current: string }) {
  const only = value.length > 0;
  return <fieldset className="grid gap-2">
    <legend className="text-xs text-ink-2 font-medium mb-1">Who can use it</legend>
    <label className="flex items-start gap-2 text-[13px] cursor-pointer"><input type="radio" name="pat-where" className="mt-0.5 accent-[var(--accent)]" checked={!only} onChange={() => onChange([])} /><span><b>All markets</b><small className="block text-ink-3">Every local market sees it in Design patterns.</small></span></label>
    <label className="flex items-start gap-2 text-[13px] cursor-pointer"><input type="radio" name="pat-where" className="mt-0.5 accent-[var(--accent)]" checked={only} onChange={() => onChange([current])} /><span><b>Only some local markets</b><small className="block text-ink-3">For local campaigns, products or rules.</small></span></label>
    {only && <ul className="ml-6 grid grid-cols-2 gap-1">{MARKETS.map((m) => <li key={m.id}><label className="flex items-center gap-2 border border-line rounded-md px-2.5 py-1.5 text-[12.5px] cursor-pointer hover:bg-surface-2">
      <input type="checkbox" className="accent-[var(--accent)]" checked={value.includes(m.id)} onChange={(e) => { const next = e.target.checked ? [...value, m.id] : value.filter((x) => x !== m.id); onChange(next.length ? next : value); /* keep at least one */ }} />
      <span aria-hidden>{m.flag}</span><span className="truncate">{m.name.replace("HSBC ", "")}</span>{m.id === current && <small className="ml-auto text-ink-3">this one</small>}</label></li>)}</ul>}
  </fieldset>;
}

/** Save the selected components as a design pattern: name, description, markets, with a preview of what goes in. */
export function SavePatternDialog({ blocks, marketId, onSave, onClose }: { blocks: Block[]; marketId: string; onSave: (p: { name: string; desc: string; markets: string[] }) => Promise<string | null>; onClose: () => void }) {
  const [name, setName] = useState(""); const [desc, setDesc] = useState(""); const [markets, setMarkets] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const save = async () => { if (!name.trim()) { setErr("Give the pattern a name"); return; } setBusy(true); setErr(""); const e = await onSave({ name: name.trim(), desc: desc.trim(), markets }); setBusy(false); if (e) setErr(e); };
  return <ModalShell title="Save as design pattern" width={620} onClose={onClose}
    footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy || !name.trim()} onClick={save}>{busy ? "Saving…" : "Save pattern"}</button></>}>
    <div className="grid gap-4 md:grid-cols-[1fr_200px]">
      <div className="grid gap-3 content-start">
        <label className="block text-xs text-ink-2 font-medium">Name<input autoFocus className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink font-normal" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} placeholder="e.g. Savings product intro" /></label>
        <label className="block text-xs text-ink-2 font-medium">What it is for <span className="font-normal text-ink-3">(optional)</span><input className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink font-normal" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Top of a savings product page" /></label>
        <MarketPicker value={markets} onChange={setMarkets} current={marketId} />
        <p className="text-[12px] text-ink-3">The text and pictures are saved too; people change them after adding the pattern.</p>
        {err && <p className="text-[12.5px] text-crit font-medium" role="alert">{err}</p>}
      </div>
      <div><b className="block text-xs text-ink-2 mb-1">{blocks.length} components, in this order</b>
        <ol className="grid gap-1 mb-2">{blocks.map((b, i) => <li key={b.id} className="text-[12px] flex gap-1.5"><span className="text-ink-3 w-3.5">{i + 1}.</span>{BLOCK_BY_TYPE[b.type].name}</li>)}</ol>
        <div className="relative h-[220px] rounded-md border border-line bg-white overflow-hidden" aria-hidden><div className="absolute left-0 top-0 origin-top-left pointer-events-none select-none site desktop" style={{ transform: "scale(0.165)", width: 1200 }}>{blocks.map((b) => <RenderBlock key={b.id} b={b} />)}</div></div>
      </div>
    </div>
  </ModalShell>;
}

/** Change which markets see a saved pattern. */
export function PatternMarketsDialog({ name, value, marketId, onSave, onClose }: { name: string; value: string[]; marketId: string; onSave: (m: string[]) => void; onClose: () => void }) {
  const [markets, setMarkets] = useState(value);
  return <ModalShell title={`Markets · ${name}`} width={480} onClose={onClose}
    footer={<><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" onClick={() => onSave(markets)}>Save</button></>}>
    <MarketPicker value={markets} onChange={setMarkets} current={marketId} />
    {markets.length > 0 && !markets.includes(marketId) && <p className="mt-3 text-[12.5px] text-ink bg-warn-soft rounded-md px-2.5 py-1.5">This market will no longer see it. Pages that already use it keep their components.</p>}
  </ModalShell>;
}
