"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Template } from "@/lib/ucp/types";
import { PATHS } from "@/lib/ucp/paths";
import { BLOCK_BY_TYPE } from "@/lib/blocks/registry";
import { RenderBlock, SiteChrome } from "@/lib/blocks/Render";
import { repoApi } from "@/lib/api";
import { MarketPicker } from "@/components/ui/MarketPicker";
import { MARKETS } from "@/lib/markets";
import { errorText as errText } from "@/lib/api/errors";
import { useSession } from "@/components/shell/Session";
import { LeftPanel } from "@/components/builder/LeftPanel";
import { useShellMode } from "@/components/shell/useShellMode";
import { templateBlocks } from "./TemplatePreview";
import { tplFolders, tplFolderOf } from "./TemplateLibrary";
import { useConfirm } from "@/components/ui/Confirm";

type Props = { marketId: string; envId: string; marketName: string; template: Template; templates: Template[]; used: number };
const ADD_ICON = "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 8.5v7M8.5 12h7";
const SET_ICON = "M4 6h16M4 12h16M4 18h10";

/**
 * Template builder, laid out like the page builder: component library on the left, the page on the canvas with the HSBC
 * menu and footer that every template always has, template settings on the right. Blocks show their default content.
 */
/** Line icon in the rail style, same as the page builder top bar. */
function Ico({ d }: { d: string }) { return <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none flex-none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>; }

export function TemplateEditor({ marketId, envId, marketName, template: t, templates, used }: Props) {
  const ask = useConfirm();
  const router = useRouter(); const { user, can, marketRoot } = useSession();
  const ro = !(user.role === "admin" || can("manage", marketRoot));
  const base = `/${marketId}/${envId}`;
  const [name, setName] = useState(t.name); const [desc, setDesc] = useState(t.desc); const [blocks, setBlocks] = useState<string[]>(t.blocks); const [folder, setFolder] = useState(tplFolderOf(t)); const [markets, setMarkets] = useState<string[]>(t.markets ?? []);
  const [sel, setSel] = useState<number | null>(null); const [deskLeft, setDeskLeft] = useState(!ro); const [deskRight, setDeskRight] = useState(true);
  /* phones: no side rails, panels open full screen from the top bar and start closed */
  const { phone } = useShellMode(); const [phoneLeft, setPhoneLeft] = useState(false); const [phoneRight, setPhoneRight] = useState(false);
  /* top bar like the page builder: device width, panel toggles and a clean preview (no rails, no panels, no selection) */
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop"); const [preview, setPreview] = useState(false);
  useEffect(() => { if (!preview) return; const h = (e: KeyboardEvent) => { if (e.key === "Escape") setPreview(false); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [preview]);
  const left = !preview && (phone ? phoneLeft : deskLeft); const right = !preview && (phone ? phoneRight : deskRight);
  const setLeft = (v: boolean) => { if (phone) { setPhoneLeft(v); if (v) setPhoneRight(false); } else setDeskLeft(v); };
  const setRight = (v: boolean) => { if (phone) { setPhoneRight(v); if (v) setPhoneLeft(false); } else setDeskRight(v); };
  const [toast, setToast] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const folders = useMemo(() => tplFolders(templates, marketName, [folder]), [templates, marketName, folder]);
  const say = (s: string) => { setToast(s); setTimeout(() => setToast(null), 2200); };

  async function persist(next: { name?: string; desc?: string; blocks?: string[]; folder?: string; markets?: string[] }) {
    if (ro) return; const v = { name, desc, blocks, folder, markets, ...next }; setSaving(true);
    try { await repoApi.setProps(`${PATHS.templates}/${t.id}`, { "jcr:title": v.name.trim() || t.id, "jcr:description": v.desc, "ucp:blocks": v.blocks.join(","), "ucp:folder": v.folder, "ucp:markets": JSON.stringify(v.markets) }, { text: next.markets ? `set where template ${v.name.trim() || t.id} can be used: ${v.markets.length ? v.markets.join(", ") : "all markets"}` : `updated template ${v.name.trim() || t.id}`, target: "templates" }); router.refresh(); }
    catch (e) { say(errText(e)); } finally { setSaving(false); }
  }
  const setBl = (b: string[]) => { setBlocks(b); void persist({ blocks: b }); };
  /** Add below the selected block, or at the end. */
  const add = (type: string) => { if (ro) return; const at = sel === null ? blocks.length : sel + 1; const b = [...blocks]; b.splice(at, 0, type); setBl(b); setSel(at); say(`Added ${BLOCK_BY_TYPE[type]?.name ?? type}`); if (phone) setPhoneLeft(false); };
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= blocks.length) return; const b = [...blocks]; [b[i], b[j]] = [b[j], b[i]]; setBl(b); setSel(j); };
  const remove = (i: number) => { const b = blocks.filter((_, k) => k !== i); setBl(b); setSel(null); say(`Removed ${BLOCK_BY_TYPE[blocks[i]]?.name ?? blocks[i]}`); };
  async function del() {
    if (!(await ask({ title: `Delete template “${name}”? Pages already created with it are not affected.`, danger: true, confirmLabel: "Delete template" }))) return;
    try { await repoApi.deleteNode(`${PATHS.templates}/${t.id}`, { text: `deleted template ${name}`, target: "templates" }); router.push(`${base}/templates`); router.refresh(); } catch (e) { say(errText(e)); }
  }

  /* the 1200 px page is scaled to fit the canvas, like in the page builder */
  const canvas = useRef<HTMLDivElement>(null); const [avail, setAvail] = useState(0);
  useEffect(() => { const c = canvas.current; if (!c) return; const ro2 = new ResizeObserver(() => setAvail(c.clientWidth)); ro2.observe(c); return () => ro2.disconnect(); }, []);
  const siteRef = useRef<HTMLDivElement>(null); const [siteH, setSiteH] = useState(0);
  useEffect(() => { const el = siteRef.current; if (!el) return; const ro3 = new ResizeObserver(() => setSiteH(el.offsetHeight)); ro3.observe(el); return () => ro3.disconnect(); }, []);
  const padL = phone ? 12 : preview ? 24 : left ? 320 + 76 : 76, padR = phone ? 12 : preview ? 24 : right ? 320 + 76 : 76;
  const siteW = phone || device === "mobile" ? 390 : device === "tablet" ? 768 : 1200; const fit = avail ? Math.max(0.3, Math.min(1, (avail - padL - padR - 2) / siteW)) : 1;
  const rendered = useMemo(() => templateBlocks(blocks), [blocks]);

  const railBtn = (on: boolean) => `relative w-11 h-11 rounded-lg grid place-items-center ${on ? "bg-brand text-white" : "text-ink-2 hover:bg-surface-3"}`;
  return (
    <div className="h-full grid grid-rows-[54px_1fr] min-h-0 bg-bg">
      {/* top bar */}
      <div className="flex items-center gap-3 px-4 bg-surface border-b border-line min-w-0">
        <Link href={`${base}/templates?folder=${encodeURIComponent(folder)}`} className="text-sm text-ink-2 hover:text-ink whitespace-nowrap">‹ Templates</Link>
        <div className="min-w-0 flex-1"><b className="block text-sm truncate">{name || "Untitled template"}</b><span className="block text-xs text-ink-3 truncate">Template · {folder} · {markets.length ? `${markets.map((m) => MARKETS.find((k) => k.id === m)?.flag ?? m).join(" ")} only` : "all markets"} · {blocks.length} block{blocks.length === 1 ? "" : "s"} · used by {used} page{used === 1 ? "" : "s"}</span></div>
        <div className="hidden sm:inline-flex border border-line-2 rounded-lg overflow-hidden">{(["desktop", "tablet", "mobile"] as const).map((d) => <button key={d} type="button" onClick={() => setDevice(d)} className={`px-2.5 h-8 grid place-items-center ${device === d ? "bg-ink text-white" : "text-ink-3 hover:text-ink"}`} title={d} aria-label={`${d} view`} aria-pressed={device === d}><Ico d={d === "desktop" ? "M3 4.5h18v11.5H3zM8.5 20h7M12 16v4" : d === "tablet" ? "M5.5 3h13v18h-13zM11 18h2" : "M8 2.5h8v19H8zM11 18.5h2"} /></button>)}</div>
        <span className="hidden sm:inline text-xs text-ink-3 bg-surface-2 rounded-full px-2.5 py-1 whitespace-nowrap">{ro ? "🔒 Read-only" : saving ? "Saving…" : "✓ Saved"}</span>
        <div className="hidden md:flex gap-1 pl-2.5 border-l border-line">
          {!ro && <button type="button" className={`bdl-chip btn-square size-8 ${left ? "bdl-chip-active" : ""}`} onClick={() => { setPreview(false); setLeft(!left); }} title="Components panel" aria-label="Components panel" aria-pressed={left}><Ico d="M3.5 4h17v16h-17zM9 4v16" /></button>}
          <button type="button" className={`bdl-chip btn-square size-8 ${right ? "bdl-chip-active" : ""}`} onClick={() => { setPreview(false); setRight(!right); }} title="Template settings panel" aria-label="Template settings panel" aria-pressed={right}><Ico d="M3.5 4h17v16h-17zM15 4v16" /></button>
          <button type="button" className={`bdl-chip ${preview ? "bdl-chip-active" : ""}`} onClick={() => { setPreview(!preview); setSel(null); }} title="See the template as a page" aria-pressed={preview}>{preview ? <><Ico d="M6 6l12 12M18 6L6 18" />Exit preview</> : <><Ico d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />Preview</>}</button>
        </div>
        {phone && !ro && <button type="button" className={`bdl-chip ${left ? "bdl-chip-active" : ""}`} onClick={() => setLeft(!left)}>＋ Add</button>}
        {phone && <button type="button" className={`bdl-chip ${right ? "bdl-chip-active" : ""}`} onClick={() => setRight(!right)}>Settings</button>}
        <Link className="btn btn-sm btn-primary whitespace-nowrap" href={`${base}/pages?new=1&template=${t.id}`}><span className="hidden sm:inline">New page from this template</span><span className="sm:hidden">Use</span></Link>
      </div>

      <div className="relative min-h-0 overflow-hidden">
        {/* left rail + component library (same as the page builder) */}
        {!preview && <nav aria-label="Left panels" className="hidden sm:flex absolute left-0 top-0 bottom-0 w-[52px] bg-surface border-r border-line flex-col items-center py-2 gap-1.5 z-[6] cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget && !ro) setLeft(!left); }}>
          <button type="button" title="Add a component" aria-label="Add a component" aria-pressed={left} disabled={ro} onClick={() => setLeft(!left)} className={railBtn(left)}><svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current fill-none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ADD_ICON} /></svg></button>
        </nav>}
        {left && !ro && <LeftPanel phone={phone} canEdit={!ro} onAdd={add} onClose={() => setLeft(false)} />}

        {/* canvas: HSBC menu and footer are part of every template */}
        <div ref={canvas} className={`absolute inset-0 overflow-auto p-6 pb-24 ${preview ? "preview" : ""}`} style={{ paddingLeft: padL, paddingRight: padR }} onClick={(e) => { if (e.target === e.currentTarget) setSel(null); }}>
          <p className={`text-xs text-ink-3 mb-2 truncate ${preview ? "invisible" : ""}`} style={{ width: fit < 1 ? siteW * fit : siteW, maxWidth: "100%", margin: "0 auto 8px" }} title="Menu and footer are part of every HSBC page and cannot be removed.">HSBC menu and footer are always part of the template.</p>
          <div style={fit < 1 ? { width: siteW * fit, height: siteH ? siteH * fit : undefined, margin: "0 auto" } : { width: siteW, maxWidth: "100%", margin: "0 auto" }}><div ref={siteRef} style={fit < 1 ? { transform: `scale(${fit})`, transformOrigin: "top left", width: siteW } : undefined}>
            <SiteChrome marketName={marketName} crumbs={[name || "Template"]} device={phone ? "mobile" : device}>
              {rendered.length ? rendered.map((b, i) => { const on = sel === i; const def = BLOCK_BY_TYPE[b.type];
                return <div key={b.id} className={`cblk relative ${on && !preview ? "sel" : ""}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!preview) setSel(on ? null : i); }}>
                  {!preview && <span className="tag">{def?.name ?? b.type}</span>}
                  {on && !ro && <div role="toolbar" aria-label={`${def?.name} actions`} className="absolute -top-4 left-4 z-10 flex gap-1 bg-foreground text-background rounded-lg p-1 shadow-xl text-xs" style={{ transform: `scale(${1 / fit})`, transformOrigin: "top left" }} onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="px-2.5 py-1 rounded hover:bg-white/15 disabled:opacity-40" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                    <button type="button" className="px-2.5 py-1 rounded hover:bg-white/15 disabled:opacity-40" disabled={i === rendered.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                    <button type="button" className="px-2.5 py-1 rounded hover:bg-white/15" onClick={() => remove(i)} aria-label="Remove">Remove</button>
                  </div>}
                  <div className="pointer-events-none"><RenderBlock b={b} /></div>
                </div>; })
                : <div className="m-8 p-16 text-center border-2 border-dashed border-line-2 rounded-xl text-ink-3 text-xl">Empty template. {ro ? "" : "Add components from the left."}</div>}
            </SiteChrome>
          </div></div>
        </div>

        {/* right rail + template settings */}
        {!preview && <nav aria-label="Panels" className="hidden sm:flex absolute right-0 top-0 bottom-0 w-[52px] bg-surface border-l border-line flex-col items-center py-2 gap-1.5 z-[6] cursor-pointer" onClick={(e) => { if (e.target === e.currentTarget) setRight(!right); }}>
          <button type="button" title="Template settings" aria-label="Template settings" aria-pressed={right} onClick={() => setRight(!right)} className={railBtn(right)}><svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current fill-none" strokeWidth={1.7} strokeLinecap="round" aria-hidden><path d={SET_ICON} /></svg></button>
        </nav>}
        {right && <aside className={phone ? "absolute inset-0 bg-surface z-[7] flex flex-col" : "absolute right-[52px] top-0 bottom-0 w-[320px] bg-surface border-l border-line z-[5] flex flex-col"}>
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line"><b className="text-sm">Template settings</b><button type="button" className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={() => setRight(false)} aria-label="Close panel">✕</button></div>
          <div className="flex-1 overflow-auto p-3.5 grid gap-3 content-start text-sm">
            <label className="text-xs text-ink-2 font-medium">Name<input aria-label="Template name" disabled={ro} className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-sm text-ink" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== t.name && persist({ name })} /></label>
            <label className="text-xs text-ink-2 font-medium">Description<textarea aria-label="Template description" disabled={ro} rows={3} className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-sm text-ink" value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={() => desc !== t.desc && persist({ desc })} placeholder="What is this template for?" /></label>
            <label className="text-xs text-ink-2 font-medium">Folder<select disabled={ro} className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-sm text-ink bg-surface" value={folder} onChange={(e) => { setFolder(e.target.value); void persist({ folder: e.target.value }); }}>{folders.map((f) => <option key={f}>{f}</option>)}</select></label>
            <div className="border border-line rounded-lg p-3"><MarketPicker what="template" disabled={ro} value={markets} current={marketId} onChange={(m) => { setMarkets(m); void persist({ markets: m }); }} />
              {markets.length > 0 && !markets.includes(marketId) && <p className="mt-2 text-xs text-ink bg-warn-soft rounded-md px-2.5 py-1.5">{marketName} can no longer create pages from it. Pages already made with it stay as they are.</p>}</div>
            <div className="border border-line rounded-lg p-3 bg-surface-2"><div className="text-xs text-ink-2 font-medium mb-1">Always on the page</div><p className="text-xs text-ink-3">HSBC menu, breadcrumb and footer. They come from the site and are the same on every page.</p></div>
            <div className="border border-line rounded-lg p-3"><div className="text-xs text-ink-2 font-medium mb-1">Blocks, top to bottom</div>
              {blocks.length ? <ol className="grid gap-0.5">{blocks.map((b, i) => <li key={`${b}-${i}`}><button type="button" onClick={() => setSel(i)} className={`w-full flex items-center gap-2 text-left rounded px-1.5 py-1 ${sel === i ? "bg-brand-soft text-brand-hover font-medium" : "hover:bg-surface-2"}`}><span className="w-5 h-5 rounded-full grid place-items-center text-xs bg-surface-3 text-ink-2 flex-none">{i + 1}</span><span className="truncate">{BLOCK_BY_TYPE[b]?.name ?? b}</span></button></li>)}</ol> : <p className="text-xs text-ink-3">No blocks yet.</p>}</div>
            <p className="text-xs text-ink-3">Used by {used} page{used === 1 ? "" : "s"}. Changing the template does not change pages already created with it.</p>
            {!ro && t.id !== "blank" && <button className="btn btn-sm btn-secondary text-crit justify-center" onClick={del}>Delete template</button>}
          </div>
        </aside>}
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2.5 rounded-lg text-sm z-50">{toast}</div>}
    </div>
  );
}
