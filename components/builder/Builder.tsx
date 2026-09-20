"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Block, ContentV1Page, PageStatus } from "@/lib/api/types";
import { contentV1, ApiError } from "@/lib/api";
import { BLOCKS, BLOCK_BY_TYPE, GROUPS, makeBlock, lines, joinLines, missingRequired, TEMPLATES } from "@/lib/blocks/registry";
import { RenderBlock, SiteChrome } from "@/lib/blocks/Render";
import { Pill } from "@/components/ui/Pill";

type Props = { marketId: string; envId: string; marketName: string; flag: string; domain: string; locale: string; envName: string; root: string; page: ContentV1Page };
const STEPS = [["Add blocks", "Click: open Components"], ["Fill in content", "Click: jump to next empty field"], ["Preview", "Click: toggle visitor view"], ["Send for review", "Click: send to a reviewer"], ["In review", "Click: approve (reviewers)"], ["Publish", "Click: put it live"], ["Published", "Live for customers"]];

export function Builder({ marketId, envId, marketName, flag, domain, locale, envName, root, page }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(page.blocks ?? []);
  const [status, setStatus] = useState<PageStatus>(page.status ?? "draft");
  const [title, setTitle] = useState(page.title ?? page.name);
  const [sel, setSel] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [preview, setPreview] = useState(false);
  const [left, setLeft] = useState(true); const [right, setRight] = useState(true);
  const [rightTab, setRightTab] = useState<"block" | "page">("page");
  const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState<string>("Saved");
  const [toast, setToast] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const rel = page.path.replace(root, "");
  const selected = blocks.find((b) => b.id === sel);
  const missing = useMemo(() => blocks.reduce((n, b) => n + missingRequired(b).length, 0), [blocks]);
  const cur = status === "published" ? 6 : status === "approved" || status === "scheduled" ? 5 : status === "review" ? 4 : blocks.length && !missing ? 2 : blocks.length ? 1 : 0;
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const mutate = useCallback((fn: (b: Block[]) => Block[]) => { setBlocks((b) => fn(b)); setDirty(true); setSaving("Unsaved"); }, []);
  const setProp = (id: string, k: string, v: unknown) => mutate((b) => b.map((x) => (x.id === id ? { ...x, props: { ...x.props, [k]: v } } : x)));
  const add = (type: string) => { const nb = makeBlock(type); mutate((b) => { const i = sel ? b.findIndex((x) => x.id === sel) + 1 : b.length; const c = b.slice(); c.splice(i, 0, nb); return c; }); setSel(nb.id); setRightTab("block"); setRight(true); say(`${BLOCK_BY_TYPE[type].name} added`); };
  const move = (id: string, d: number) => mutate((b) => { const i = b.findIndex((x) => x.id === id); const j = i + d; if (j < 0 || j >= b.length) return b; const c = b.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; });
  const remove = (id: string) => { mutate((b) => b.filter((x) => x.id !== id)); setSel(null); };

  async function save(extra: Partial<ContentV1Page> = {}) {
    setSaving("Saving…");
    try { await contentV1.patchPage(page.path, { title, blocks, status, ...extra }); setDirty(false); setSaving("Saved just now"); }
    catch (e) { setSaving("Save failed"); say(e instanceof ApiError ? `${e.problem.title} · request ${e.requestId ?? "n/a"}` : String(e)); throw e; }
  }
  async function transition(next: PageStatus, msg: string) {
    if (next === "review" && missing) { say(`Fill in ${missing} required field${missing === 1 ? "" : "s"} first`); const b = blocks.find((x) => missingRequired(x).length); if (b) { setSel(b.id); setRightTab("block"); setRight(true); } return; }
    setStatus(next); try { await contentV1.patchPage(page.path, { title, blocks, status: next }); setDirty(false); setSaving("Saved just now"); say(msg); } catch { setStatus(status); }
  }
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save().catch(() => {}); } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); });

  /* ---- inline editing: single click on a text of the selected block, Enter/✓ saves, Esc/✕ cancels ---- */
  const [editing, setEditing] = useState<{ el: HTMLElement; key: string; original: string } | null>(null);
  function commitInline(save: boolean) {
    if (!editing) return; const { el, key, original } = editing; el.contentEditable = "false"; el.classList.remove("editing");
    if (!save) { el.innerText = original; setEditing(null); return; }
    const [id, f, r, c] = key.split("|"); const v = el.innerText.replace(/\n+$/, "").replace(/\|/g, "/");
    const b = blocks.find((x) => x.id === id); if (!b) { setEditing(null); return; }
    if (r === undefined) setProp(id, f, v);
    else if (r === "p") { const paras = String(b.props[f] ?? "").split(/\n\s*\n/); paras[Number(c)] = v; setProp(id, f, paras.join("\n\n")); }
    else { const rows = lines(b.props[f]); if (rows[Number(r)]) { rows[Number(r)][Number(c)] = v; setProp(id, f, joinLines(rows)); } }
    setEditing(null);
  }
  function onCanvasClick(e: React.MouseEvent) {
    if (preview) return;
    const t = e.target as HTMLElement; const blk = t.closest<HTMLElement>(".block"); if (!blk) return;
    const ie = t.closest<HTMLElement>(".ie");
    if (ie && blk.dataset.id === sel && !editing) { e.preventDefault(); ie.contentEditable = "true"; ie.classList.add("editing"); ie.focus(); setEditing({ el: ie, key: ie.dataset.inline!, original: ie.innerText }); return; }
    if (editing && !ie) commitInline(true);
    if (t.closest("a, summary, .s-cta")) e.preventDefault();
    if (blk.dataset.id !== sel) { setSel(blk.dataset.id!); setRightTab("block"); setRight(true); }
  }
  function onCanvasKey(e: React.KeyboardEvent) { if (!editing) return; if (e.key === "Escape") { e.preventDefault(); commitInline(false); } if (e.key === "Enter" && !e.shiftKey && !editing.key.includes("|p|")) { e.preventDefault(); commitInline(true); say("Saved"); } }

  const nextTxt = cur === 0 ? "Add your first block from Components" : cur === 1 ? `Fill in ${missing} required field${missing === 1 ? "" : "s"}` : cur === 2 ? "Check the preview, then send for review" : cur === 4 ? "Waiting for a reviewer" : cur === 5 ? "Approved. Publish when ready" : `Live on ${domain}`;
  const flowClick = (i: number) => {
    if (i <= 2 && cur >= 4) { if (confirm("Reopen this page as a draft?")) transition("draft", "Back to draft"); return; }
    if (i === 0) { setPreview(false); setLeft(true); return; }
    if (i === 1) { setPreview(false); const b = blocks.find((x) => missingRequired(x).length) || blocks[0]; if (b) { setSel(b.id); setRightTab("block"); setRight(true); } return; }
    if (i === 2) { setPreview((p) => !p); setSel(null); return; }
    if (i === 3) { if (status === "draft" || status === "failed") transition("review", "Sent for review"); return; }
    if (i === 4) { if (status === "review") transition("approved", "Approved"); return; }
    if (i === 5) { if (status === "approved" || status === "scheduled") transition("published", `Published to ${envName}`); return; }
  };
  const filtered = BLOCKS.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="h-full grid grid-rows-[54px_48px_1fr] min-w-0 overflow-hidden">
      {/* Toolbar (docked) */}
      <div className="flex items-center gap-3 px-2.5 bg-surface border-b border-line overflow-hidden">
        <Link href={`/${marketId}/${envId}/pages${rel.replace(/\/[^/]+$/, "")}`} className="btn btn-quiet btn-sm">‹ Pages</Link>
        <div className="min-w-0 flex-1"><b className="block text-[14.5px] truncate">{title}</b><span className="block text-[11.5px] text-ink-3 truncate font-mono">{flag} {locale} · {domain}{rel}</span></div>
        <Pill status={status} />
        <div className="inline-flex border border-line-2 rounded-lg overflow-hidden">{(["desktop", "tablet", "mobile"] as const).map((d) => <button key={d} onClick={() => setDevice(d)} className={`px-2.5 h-8 text-[13px] ${device === d ? "bg-ink text-white" : "text-ink-3"}`} title={d}>{d === "desktop" ? "🖥" : d === "tablet" ? "▭" : "📱"}</button>)}</div>
        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-xs text-ink-3 bg-surface-2 rounded-full px-2.5 py-1">{saving}</span>
          <div className="flex gap-1 pl-2.5 border-l border-line"><button className={`btn btn-icon btn-sm ${left ? "on" : ""}`} onClick={() => setLeft(!left)} title="Components panel" aria-pressed={left}>▤</button><button className={`btn btn-icon btn-sm ${right ? "on" : ""}`} onClick={() => setRight(!right)} title="Right panel" aria-pressed={right}>▥</button></div>
          <div className="flex gap-1 pl-2.5 border-l border-line"><button className="btn btn-sm" onClick={() => { setPreview(!preview); setSel(null); }}>{preview ? "Edit" : "Preview"}</button><button className="btn btn-sm" onClick={() => save().then(() => say("Saved")).catch(() => {})} disabled={!dirty}>Save</button>
            {(status === "draft" || status === "failed") && <button className="btn btn-sm btn-primary" onClick={() => transition("review", "Sent for review")}>Send for review</button>}
            {status === "review" && <button className="btn btn-sm btn-primary" onClick={() => transition("approved", "Approved")}>Approve</button>}
            {(status === "approved" || status === "scheduled") && <button className="btn btn-sm btn-primary" onClick={() => transition("published", `Published to ${envName}`)}>Publish</button>}
            {status === "published" && <button className="btn btn-sm" onClick={() => transition("draft", "New draft")}>New draft</button>}</div>
        </div>
      </div>
      {/* Flow stepper */}
      <div className="flex items-center px-4 bg-surface border-b border-line overflow-hidden" role="list" aria-label="Page progress">
        <div className="flex-1 min-w-0 flex items-center overflow-x-auto h-12">
          {STEPS.map((s, i) => { const done = i < cur || (cur === 6 && i === 6); const on = i === cur && cur !== 6; return <div key={s[0]} role="listitem" className="flex items-center flex-none">
            <button onClick={() => flowClick(i)} className={`flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-3 text-[12.5px] ${on ? "text-ink font-semibold" : "text-ink-3"}`} title={s[1]}><i className={`w-6 h-6 rounded-full border-2 grid place-items-center not-italic text-[11px] font-bold ${done ? "bg-good border-good text-white" : on ? "bg-accent border-accent text-white shadow-[0_0_0_3px_var(--accent-soft)]" : "border-line-2"}`}>{done ? "✓" : i + 1}</i><span className="leading-tight">{s[0]}{on && <small className="block text-[10.5px] text-ink-3 font-normal">{s[1]}</small>}</span></button>
            {i < STEPS.length - 1 && <span className={`w-7 h-0.5 mx-1 ${i < cur ? "bg-good" : "bg-line"}`} />}</div>; })}
        </div>
        <div className="flex-none max-w-[38%] flex items-center gap-2 pl-3.5 border-l border-line text-[12.5px] text-ink-3 whitespace-nowrap overflow-hidden"><span className="text-[10.5px] tracking-[.08em] uppercase text-accent font-bold">Next</span><b className="text-ink truncate">{nextTxt}</b></div>
      </div>
      {/* Body */}
      <div className="relative min-h-0 overflow-hidden bg-bg">
        <div className={`absolute inset-0 flex flex-col ${preview ? "preview" : ""}`}>
          <div className="flex items-center gap-3 px-6 py-2 text-[12.5px] text-ink-3 border-b border-line bg-surface-2" style={{ paddingLeft: left && !preview ? 344 : 24, paddingRight: right && !preview ? 364 : 24 }}><span className="mr-auto">{preview ? "Preview: exactly what visitors will see" : "Click a block to select it. Click any text of the selected block to edit it in place."}</span><span className="border border-line-2 rounded px-2 py-0.5 bg-surface">1:1 · {device === "desktop" ? 1200 : device === "tablet" ? 768 : 390} px</span></div>
          <div ref={canvasRef} className="flex-1 overflow-auto p-6 pb-24" style={{ paddingLeft: left && !preview ? 344 : 24, paddingRight: right && !preview ? 364 : 24 }} onClick={onCanvasClick} onKeyDown={onCanvasKey}>
            <SiteChrome marketName={marketName} crumbs={[...rel.split("/").filter(Boolean).slice(0, -1), title]} device={device}>
              {blocks.length ? blocks.map((b, i) => <div key={b.id} data-id={b.id} className={`block ${sel === b.id ? "sel" : ""}`} tabIndex={0}><span className="tag">{BLOCK_BY_TYPE[b.type].name}{sel === b.id ? " · click any text to edit" : ""}</span>
                {sel === b.id && !preview && <div className="absolute -top-4 right-2.5 flex gap-0.5 bg-[#0F1013] rounded-lg p-1 z-[2] text-white text-xs" role="toolbar"><b className="px-2 py-1">{BLOCK_BY_TYPE[b.type].name}</b><button className="px-2 rounded hover:bg-white/15" onClick={(e) => { e.stopPropagation(); move(b.id, -1); }} disabled={i === 0} title="Move up">↑</button><button className="px-2 rounded hover:bg-white/15" onClick={(e) => { e.stopPropagation(); move(b.id, 1); }} disabled={i === blocks.length - 1} title="Move down">↓</button><button className="px-2 rounded hover:bg-white/15" onClick={(e) => { e.stopPropagation(); mutate((bl) => { const c = bl.slice(); c.splice(i + 1, 0, { ...b, id: makeBlock(b.type).id }); return c; }); }} title="Duplicate">⧉</button><button className="px-2 rounded hover:bg-accent" onClick={(e) => { e.stopPropagation(); remove(b.id); }} title="Remove">🗑</button></div>}
                <RenderBlock b={b} /></div>)
              : <div className="m-7 p-11 border-2 border-dashed border-line-2 rounded-xl text-center text-ink-2 text-[15px]">How do you want to start this page?<small className="block text-[13px] text-ink-3 mt-1.5">Pick a layout, or add components one by one from the left.</small><div className="grid grid-cols-3 gap-3 mt-4 text-left">{TEMPLATES.filter((t) => t.blocks.length).slice(0, 3).map((t) => <button key={t.id} className="border border-line-2 bg-surface p-3.5 text-left hover:border-ink" onClick={() => mutate(() => t.blocks.map((x) => makeBlock(x, x === "mast" ? { heading: title } : {})))}><b className="block text-[13.5px]">{t.name}</b><small className="text-ink-3">{t.desc}</small></button>)}</div></div>}
            </SiteChrome>
          </div>
          {editing && <div className="absolute left-1/2 -translate-x-1/2 bottom-6 flex gap-1 bg-[#0F1013] rounded-lg p-1 shadow-xl z-20 text-white text-xs" onMouseDown={(e) => e.preventDefault()}><span className="px-2 py-1.5 text-white/70">Editing text</span><button className="px-3 py-1.5 rounded bg-good font-semibold" onClick={() => { commitInline(true); say("Saved"); }}>✓ Save</button><button className="px-3 py-1.5 rounded hover:bg-white/15" onClick={() => commitInline(false)}>✕ Cancel</button></div>}
        </div>
        {/* Left panel */}
        {left && !preview && <aside className="absolute left-0 top-0 bottom-0 w-[320px] bg-surface border-r border-line flex flex-col z-[5]">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line"><b className="text-[13.5px]">Components</b><button className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={() => setLeft(false)} aria-label="Close">✕</button></div>
          <div className="p-3 border-b border-line"><input className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px]" placeholder="Find a component" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="flex-1 overflow-auto p-3">{GROUPS.map((g) => { const items = filtered.filter((b) => b.group === g); if (!items.length) return null; return <div key={g}><h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold mt-3 mb-1.5 first:mt-0">{g}</h6>{items.map((b) => <div key={b.type} className="border border-line rounded-xl p-2.5 mb-2.5 bg-surface hover:border-ink-3 hover:shadow-md"><div className="flex justify-between items-center mb-1"><b className="text-[13.5px]">{b.name}</b><span className="text-[10.5px] uppercase tracking-[.06em] text-ink-3 font-semibold">{b.group}</span></div><small className="block text-ink-3 text-xs mb-2">{b.desc}</small><button className="btn btn-sm w-full justify-center hover:bg-accent hover:text-white hover:border-accent" onClick={() => add(b.type)}>＋ Add to page</button></div>)}</div>; })}</div>
        </aside>}
        {/* Right panel */}
        {right && !preview && <aside className="absolute right-0 top-0 bottom-0 w-[340px] bg-surface border-l border-line flex flex-col z-[5]">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line"><b className="text-[13.5px]">{rightTab === "block" ? "Edit block" : "Page settings"}</b><button className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={() => setRight(false)} aria-label="Close">✕</button></div>
          <div className="flex border-b border-line">{(["block", "page"] as const).map((t) => <button key={t} onClick={() => setRightTab(t)} className={`flex-1 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px ${rightTab === t ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>{t === "block" ? "Edit block" : "Page"}</button>)}</div>
          <div className="flex-1 overflow-auto p-3.5 text-[13px]">
            {rightTab === "page" ? <div className="flex flex-col gap-3">
              <label className="text-xs text-ink-2 font-medium">Page title<input className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] font-normal text-ink" value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); setSaving("Unsaved"); }} /></label>
              <div className="text-xs text-ink-2 font-medium">URL<div className="mt-1 font-mono text-xs bg-surface-2 border border-line rounded-md px-2.5 py-1.5 text-ink-2 break-all">{domain}{rel}</div></div>
              <div className="text-xs text-ink-2 font-medium">Template<div className="mt-1 bg-surface-2 border border-line rounded-md px-2.5 py-1.5 font-normal text-ink-2">{TEMPLATES.find((t) => t.id === page.template)?.name ?? page.template}</div><small className="text-ink-3 font-normal">Fixed after creation</small></div>
              <div className="text-xs text-ink-2 font-medium">Repository path<div className="mt-1 font-mono text-[11.5px] bg-surface-2 border border-line rounded-md px-2.5 py-1.5 text-ink-2 break-all">{page.path}</div></div>
              <div className="text-xs text-ink-3">Created {page.created?.slice(0, 10)} · Last modified {page.lastModified?.slice(0, 16).replace("T", " ")}</div>
            </div>
            : !selected ? <div className="text-ink-3 p-2"><b className="block text-sm text-ink mb-1.5">Nothing selected</b>Click any block on the page to edit its text, images and links here.<div className="mt-3.5 flex flex-col gap-1.5">{blocks.slice(0, 8).map((k, ix) => <button key={k.id} className="btn btn-sm justify-start" onClick={() => setSel(k.id)}>{ix + 1}. {BLOCK_BY_TYPE[k.type].name}</button>)}</div></div>
            : <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between sticky -top-3.5 bg-surface pt-1 pb-2 border-b border-line"><div><b className="text-sm">{BLOCK_BY_TYPE[selected.type].name}</b><div className="text-[11px] text-ink-3">Block {blocks.indexOf(selected) + 1} of {blocks.length} · click any text on the page to edit it in place</div></div><button className="btn btn-sm" onClick={() => { setSel(null); setRightTab("page"); }}>Done</button></div>
              <div className="flex gap-1.5 flex-wrap"><button className="btn btn-sm" onClick={() => move(selected.id, -1)}>↑ Up</button><button className="btn btn-sm" onClick={() => move(selected.id, 1)}>↓ Down</button><button className="btn btn-sm" onClick={() => mutate((b) => b.map((x) => (x.id === selected.id ? { ...x, props: { ...BLOCK_BY_TYPE[x.type].defaults } } : x)))}>Reset</button><button className="btn btn-sm hover:bg-accent hover:text-white hover:border-accent" onClick={() => remove(selected.id)}>🗑 Remove</button></div>
              {BLOCK_BY_TYPE[selected.type].fields.map((f) => { const v = selected.props[f.k]; const invalid = f.req && !v; return <div key={f.k}><label className="flex justify-between text-xs text-ink-2 font-medium mb-1">{f.l}{f.req && <small className="font-mono text-[10.5px] text-ink-4">required</small>}</label>
                {f.t === "text" ? <input className={`w-full border rounded-md px-2.5 py-1.5 text-[13px] ${f.mono ? "font-mono" : ""} ${invalid ? "border-crit" : "border-line-2"}`} value={String(v ?? "")} onChange={(e) => setProp(selected.id, f.k, e.target.value)} />
                : f.t === "textarea" ? <textarea rows={4} className={`w-full border rounded-md px-2.5 py-1.5 text-[13px] ${invalid ? "border-crit" : "border-line-2"}`} value={String(v ?? "")} onChange={(e) => setProp(selected.id, f.k, e.target.value)} />
                : f.t === "lines" ? <ListEditor rows={lines(v)} hint={f.hint} onChange={(rows) => setProp(selected.id, f.k, joinLines(rows))} />
                : f.t === "select" ? <div className="flex gap-1">{f.o!.map((o) => <button key={o} className={`btn btn-sm capitalize ${v === o ? "on" : ""}`} onClick={() => setProp(selected.id, f.k, o)}>{o}</button>)}</div>
                : f.t === "bool" ? <button className={`w-9 h-5 rounded-full relative ${v ? "bg-good" : "bg-line-2"}`} aria-pressed={!!v} onClick={() => setProp(selected.id, f.k, !v)}><i className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${v ? "left-4" : "left-0.5"}`} /></button>
                : <input className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] font-mono" value={String(v ?? "")} onChange={(e) => setProp(selected.id, f.k, e.target.value)} />}
                {invalid ? <div className="text-[11.5px] text-crit mt-1">Required before the page can be sent for review.</div> : f.hint && f.t !== "lines" ? <div className="text-[11.5px] text-ink-3 mt-1">{f.hint}</div> : null}</div>; })}
            </div>}
          </div>
        </aside>}
        {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] shadow-xl z-50">{toast}</div>}
      </div>
    </div>
  );
}

function ListEditor({ rows, hint, onChange }: { rows: string[][]; hint?: string; onChange: (rows: string[][]) => void }) {
  const cols = (hint ?? "Value").split("|").map((c) => c.trim());
  const set = (r: number, c: number, v: string) => { const n = rows.map((x) => x.slice()); while (n[r].length <= c) n[r].push(""); n[r][c] = v.replace(/\|/g, "/"); onChange(n); };
  return <div className="flex flex-col gap-2">{rows.map((r, ri) => <div key={ri} className="border border-line bg-surface-2 p-2.5 rounded-md"><div className="flex justify-between items-center mb-1"><b className="text-[12.5px]">Item {ri + 1}</b><span className="flex gap-0.5"><button className="btn btn-quiet btn-sm" disabled={ri === 0} onClick={() => { const n = rows.slice(); [n[ri - 1], n[ri]] = [n[ri], n[ri - 1]]; onChange(n); }} aria-label="Move up">↑</button><button className="btn btn-quiet btn-sm" disabled={ri === rows.length - 1} onClick={() => { const n = rows.slice(); [n[ri + 1], n[ri]] = [n[ri], n[ri + 1]]; onChange(n); }} aria-label="Move down">↓</button><button className="btn btn-quiet btn-sm" onClick={() => onChange(rows.filter((_, i) => i !== ri))} aria-label="Remove">✕</button></span></div>
    {cols.map((c, ci) => <label key={ci} className="block mt-1.5 text-[11.5px] text-ink-3">{c}{c.toLowerCase().includes("text") || c.toLowerCase().includes("answer") ? <textarea rows={2} className="mt-0.5 w-full border border-line-2 rounded px-2 py-1 text-[13px] text-ink" value={r[ci] ?? ""} onChange={(e) => set(ri, ci, e.target.value)} /> : <input className="mt-0.5 w-full border border-line-2 rounded px-2 py-1 text-[13px] text-ink" value={r[ci] ?? ""} onChange={(e) => set(ri, ci, e.target.value)} />}</label>)}</div>)}
    <button className="btn btn-sm justify-center" onClick={() => onChange([...rows, cols.map(() => "")])}>＋ Add item</button></div>;
}
