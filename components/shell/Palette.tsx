"use client";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ucpApi } from "@/lib/api";
import type { PageSummary } from "@/lib/api/types";
import { BLOCKS } from "@/lib/blocks/registry";
import { market } from "@/lib/markets";
import { Pill } from "@/components/ui/Pill";

/**
 * ⌘K command palette. Mounted once in the CMS layout. Opens on ⌘K / Ctrl+K or a `ucp:palette` window event.
 * Builder-only actions talk to the builder through window events (it owns its own state):
 *   ucp:ai        detail { prompt: string }   → start an AI task with this prompt
 *   ucp:add-block detail { type: string }     → append a block of this registry type
 * Accessibility: combobox + listbox with aria-activedescendant, Tab is trapped inside the dialog, focus returns to the opener on close.
 */
const AI = [["Improve this page", "Improve this page"], ["Create a new section", "Create a promotional section for the new Premier Banking offer"], ["Translate page", "Translate this page"], ["Create mobile version", "Create mobile version"], ["Find unused components", "Find unused components"], ["Check accessibility", "Check accessibility"], ["Check content compliance", "Check content compliance"], ["Optimise SEO", "Optimise SEO"], ["Design a landing page", "Design a landing page for Premier Banking"]];
const NAV = [["Dashboard", "dashboard"], ["Pages", "pages"], ["Assets", "assets"], ["Content models", "models"], ["Content entities", "entities"], ["Templates", "templates"], ["My tasks", "tasks"], ["API & delivery", "api"], ["Users & roles", "users"], ["Audit log", "audit"], ["Why UCP", "benefits"]];
type Item = { id: string; section: string; label: React.ReactNode; hint?: string; run: () => void };

export function Palette({ marketId, envId }: { marketId: string; envId: string }) {
  const router = useRouter(); const pathname = usePathname();
  const inBuilder = pathname.includes("/page/"); const base = `/${marketId}/${envId}`; const root = market(marketId).root;
  const [open, setOpenRaw] = useState(false); const [q, setQRaw] = useState(""); const [pages, setPages] = useState<PageSummary[]>([]); const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null); const listRef = useRef<HTMLDivElement>(null); const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null); const openRef = useRef(false);
  const listId = useId();

  /* Pure state setters (the compiler lint forbids reading refs from anything that runs during render). */
  const close = useCallback(() => setOpenRaw(false), []);
  const show = useCallback(() => { setQRaw(""); setSel(0); setOpenRaw(true); }, []);
  const setQ = (v: string) => { setQRaw(v); setSel(0); };
  useEffect(() => { openRef.current = open; }, [open]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (openRef.current) close(); else show(); } else if (e.key === "Escape") close(); };
    window.addEventListener("keydown", key); window.addEventListener("ucp:palette", show);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("ucp:palette", show); };
  }, [close, show]);
  /* Focus management: remember the opener, focus the input, and hand focus back when the palette closes. */
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => { clearTimeout(t); const el = restoreRef.current; restoreRef.current = null; setTimeout(() => el?.focus?.(), 0); };
  }, [open]);
  useEffect(() => { if (!open) return; const s = q.trim(); const t = setTimeout(() => ucpApi.search(marketId, s || "/").then((r) => { setPages(s ? r.pages : r.pages.slice(0, 6)); }).catch(() => setPages([])), s ? 150 : 0); return () => clearTimeout(t); }, [q, open, marketId]);

  const items = useMemo<Item[]>(() => {
    const s = q.toLowerCase().trim(); const has = (x: string) => !s || x.toLowerCase().includes(s); const out: Item[] = [];
    const done = (fn: () => void) => () => { close(); fn(); };
    if (inBuilder) {
      const ai = AI.filter((x) => has(x[0]));
      ai.forEach(([l, p]) => out.push({ id: "ai:" + l, section: "✨ Ask AI", label: `✨ ${l}`, hint: "agent", run: done(() => window.dispatchEvent(new CustomEvent("ucp:ai", { detail: { prompt: p } }))) }));
      if (s && !ai.length) out.push({ id: "ai:free", section: "✨ Ask AI", label: `✨ Ask AI: “${q.trim()}”`, run: done(() => window.dispatchEvent(new CustomEvent("ucp:ai", { detail: { prompt: q.trim() } }))) });
      if (s) BLOCKS.filter((b) => b.name.toLowerCase().includes(s) || b.type.includes(s)).slice(0, 5).forEach((b) => out.push({ id: "blk:" + b.type, section: "Add component", label: b.name, hint: b.desc, run: done(() => window.dispatchEvent(new CustomEvent("ucp:add-block", { detail: { type: b.type } }))) }));
    }
    pages.slice(0, 6).forEach((p) => out.push({ id: "pg:" + p.path, section: "Pages", label: <span className="flex items-center gap-2"><Pill status={p.status} />{p.title}</span>, hint: p.path.replace(root, "") || "/", run: done(() => router.push(`${base}/page${p.path.replace(root, "")}`)) }));
    NAV.filter((x) => (inBuilder ? s && has(x[0]) : has(x[0]))).forEach(([l, seg]) => out.push({ id: "go:" + seg, section: "Go to", label: l, run: done(() => router.push(`${base}/${seg}`)) }));
    return out;
  }, [q, pages, inBuilder, base, root, router, close]);
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" }); }, [sel]);
  if (!open) return null;
  const cur = Math.min(sel, Math.max(items.length - 1, 0));
  const optId = (i: number) => `${listId}-opt-${i}`;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Home") { e.preventDefault(); setSel(0); }
    else if (e.key === "End") { e.preventDefault(); setSel(Math.max(items.length - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); items[cur]?.run(); }
  };
  /* Focus trap: Tab cycles between the focusable elements inside the dialog. */
  const trap = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    // only what can really take focus (visible), and we move focus ourselves so it never slips out past a hidden element
    const f = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("input, button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])") ?? []).filter((el) => el.getClientRects().length > 0); if (!f.length) return;
    e.preventDefault(); const i = f.indexOf(document.activeElement as HTMLElement);
    f[(i < 0 ? 0 : i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  };
  let last = "";
  return (
    <div className="fixed inset-0 bg-black/45 z-[60] flex justify-center items-start pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={trap} className="bg-surface text-ink rounded-xl w-[min(640px,94vw)] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line text-base"><span aria-hidden>{inBuilder ? "✨" : "⌕"}</span>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} autoComplete="off" aria-label="Command" role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list" aria-activedescendant={items.length ? optId(cur) : undefined} className="flex-1 outline-none text-base bg-transparent" placeholder={inBuilder ? "What would you like to do? Search pages, components or ask AI…" : "Search pages or go to…"} />
          <kbd className="font-mono text-xs border border-line-2 rounded px-1.5 py-0.5 text-ink-3">esc</kbd></div>
        <div ref={listRef} id={listId} role="listbox" aria-label="Results" className="max-h-[60vh] overflow-auto py-1">
          {items.length ? items.map((it, i) => { const head = it.section !== last; last = it.section; return (
            <div key={it.id}>{head && <h6 className="px-4 pt-2.5 pb-1 text-xs tracking-[.1em] uppercase text-ink-3 font-medium">{it.section}</h6>}
              <button id={optId(i)} data-i={i} role="option" aria-selected={i === cur} tabIndex={-1} onMouseEnter={() => setSel(i)} onClick={it.run} className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left ${i === cur ? "bg-brand-soft text-brand-hover" : "hover:bg-surface-2"}`}><span className="flex-1 min-w-0">{it.label}</span>{it.hint && <small className={`text-xs truncate max-w-[45%] ${i === cur ? "text-brand-hover/80" : "text-ink-3"}`}>{it.hint}</small>}</button></div>); })
            : <div className="p-6 text-center text-ink-3 text-sm">Nothing matches “{q}”.</div>}
        </div>
        <div className="px-4 py-2 border-t border-line text-xs text-ink-3 flex gap-3"><span>↑↓ move</span><span>↵ run</span><span>esc close</span><span className="ml-auto">⌘K toggles</span></div>
      </div>
    </div>
  );
}
