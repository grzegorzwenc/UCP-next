"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
 */
const AI = [["Improve this page", "Improve this page"], ["Create a new section", "Create a promotional section for the new Premier Banking offer"], ["Translate page", "Translate this page"], ["Create mobile version", "Create mobile version"], ["Find unused components", "Find unused components"], ["Check accessibility", "Check accessibility"], ["Check content compliance", "Check content compliance"], ["Optimise SEO", "Optimise SEO"], ["Design a landing page", "Design a landing page for Premier Banking"]];
const NAV = [["Dashboard", "dashboard"], ["Pages", "pages"], ["Assets", "assets"], ["Content models", "models"], ["Templates", "templates"], ["My tasks", "tasks"], ["API & delivery", "api"], ["Users & roles", "users"], ["Audit log", "audit"], ["Repository (JCR)", "repo"]];
type Item = { id: string; section: string; label: React.ReactNode; hint?: string; run: () => void };

export function Palette({ marketId, envId }: { marketId: string; envId: string }) {
  const router = useRouter(); const pathname = usePathname();
  const inBuilder = pathname.includes("/page/"); const base = `/${marketId}/${envId}`; const root = market(marketId).root;
  const [open, setOpen] = useState(false); const [q, setQ] = useState(""); const [pages, setPages] = useState<PageSummary[]>([]); const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null); const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } else if (e.key === "Escape") setOpen(false); };
    const ev = () => setOpen(true);
    window.addEventListener("keydown", key); window.addEventListener("ucp:palette", ev);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("ucp:palette", ev); };
  }, []);
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);
  useEffect(() => { if (!open) return; const s = q.trim(); const t = setTimeout(() => ucpApi.search(marketId, s || "/").then((r) => setPages(s ? r.pages : r.pages.slice(0, 6))).catch(() => setPages([])), s ? 150 : 0); return () => clearTimeout(t); }, [q, open, marketId]);

  const items = useMemo<Item[]>(() => {
    const s = q.toLowerCase().trim(); const has = (x: string) => !s || x.toLowerCase().includes(s); const out: Item[] = [];
    const done = (fn: () => void) => () => { setOpen(false); fn(); };
    if (inBuilder) {
      const ai = AI.filter((x) => has(x[0]));
      ai.forEach(([l, p]) => out.push({ id: "ai:" + l, section: "✨ Ask AI", label: `✨ ${l}`, hint: "agent", run: done(() => window.dispatchEvent(new CustomEvent("ucp:ai", { detail: { prompt: p } }))) }));
      if (s && !ai.length) out.push({ id: "ai:free", section: "✨ Ask AI", label: `✨ Ask AI: “${q.trim()}”`, run: done(() => window.dispatchEvent(new CustomEvent("ucp:ai", { detail: { prompt: q.trim() } }))) });
      if (s) BLOCKS.filter((b) => b.name.toLowerCase().includes(s) || b.type.includes(s)).slice(0, 5).forEach((b) => out.push({ id: "blk:" + b.type, section: "Add component", label: b.name, hint: b.desc, run: done(() => window.dispatchEvent(new CustomEvent("ucp:add-block", { detail: { type: b.type } }))) }));
    }
    pages.slice(0, 6).forEach((p) => out.push({ id: "pg:" + p.path, section: "Pages", label: <span className="flex items-center gap-2"><Pill status={p.status} />{p.title}</span>, hint: p.path.replace(root, "") || "/", run: done(() => router.push(`${base}/page${p.path.replace(root, "")}`)) }));
    NAV.filter((x) => (inBuilder ? s && has(x[0]) : has(x[0]))).forEach(([l, seg]) => out.push({ id: "go:" + seg, section: "Go to", label: l, run: done(() => router.push(`${base}/${seg}`)) }));
    return out;
  }, [q, pages, inBuilder, base, root, router]);
  useEffect(() => { setSel(0); }, [q, pages.length]);
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" }); }, [sel]);
  if (!open) return null;
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "ArrowDown") { e.preventDefault(); setSel((i) => Math.min(i + 1, items.length - 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setSel((i) => Math.max(i - 1, 0)); } else if (e.key === "Enter") { e.preventDefault(); items[sel]?.run(); } };
  let last = "";
  return (
    <div className="fixed inset-0 bg-black/45 z-[60] flex justify-center items-start pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div role="dialog" aria-label="Command palette" className="bg-surface text-ink rounded-xl w-[min(640px,94vw)] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line text-[15px]"><span>{inBuilder ? "✨" : "⌕"}</span>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} autoComplete="off" aria-label="Command" className="flex-1 outline-none text-[15px] bg-transparent" placeholder={inBuilder ? "What would you like to do? Search pages, components or ask AI…" : "Search pages or go to…"} />
          <kbd className="font-mono text-[10.5px] border border-line-2 rounded px-1.5 py-0.5 text-ink-3">esc</kbd></div>
        <div ref={listRef} role="listbox" className="max-h-[60vh] overflow-auto py-1">
          {items.length ? items.map((it, i) => { const head = it.section !== last; last = it.section; return (
            <div key={it.id}>{head && <h6 className="px-4 pt-2.5 pb-1 text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold">{it.section}</h6>}
              <button data-i={i} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={it.run} className={`w-full flex items-center gap-3 px-4 py-2 text-[13.5px] text-left ${i === sel ? "bg-accent-soft text-accent-hover" : "hover:bg-surface-2"}`}><span className="flex-1 min-w-0">{it.label}</span>{it.hint && <small className={`text-[11.5px] truncate max-w-[45%] ${i === sel ? "text-accent-hover/80" : "text-ink-3"}`}>{it.hint}</small>}</button></div>); })
            : <div className="p-6 text-center text-ink-3 text-[13px]">Nothing matches “{q}”.</div>}
        </div>
        <div className="px-4 py-2 border-t border-line text-[11.5px] text-ink-3 flex gap-3"><span>↑↓ move</span><span>↵ run</span><span>esc close</span><span className="ml-auto">⌘K toggles</span></div>
      </div>
    </div>
  );
}
