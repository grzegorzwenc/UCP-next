"use client";
import { useRouter, usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Blocks, Compass, CornerDownLeft, FileText, Search, Sparkles, X } from "lucide-react";
import { ucpApi } from "@/lib/api";
import type { PageSummary } from "@/lib/api/types";
import { BLOCKS } from "@/lib/blocks/registry";
import { market } from "@/lib/markets";
import { Pill } from "@/components/ui/Pill";
import { clearRecents, pushRecent, readRecents, removeRecent, type Recent } from "@/lib/search/recents";

/**
 * ⌘K command palette. Mounted once in the CMS layout. Opens on ⌘K / Ctrl+K or a `ucp:palette` window event.
 * Builder-only actions talk to the builder through window events (it owns its own state):
 *   ucp:ai        detail { prompt: string }   → start an AI task with this prompt
 *   ucp:add-block detail { type: string }     → append a block of this registry type
 * Accessibility: combobox + listbox with aria-activedescendant, Tab is trapped inside the dialog, focus returns to the opener on close.
 *
 * Presentation and behaviour follow hsbc-ucpmock's `src/lib/components/command-palette.svelte`: a
 * blurred backdrop, a panel pinned 12vh from the top, rows built as an icon tile plus a title over
 * a quieter subtitle, and — the reason the panel stays short — an opening state that offers
 * recently viewed items and a handful of suggestions rather than listing everything.
 */
const AI = [["Improve this page", "Improve this page"], ["Create a new section", "Create a promotional section for the new Premier Banking offer"], ["Translate page", "Translate this page"], ["Create mobile version", "Create mobile version"], ["Find unused components", "Find unused components"], ["Check accessibility", "Check accessibility"], ["Check content compliance", "Check content compliance"], ["Optimise SEO", "Optimise SEO"], ["Design a landing page", "Design a landing page for Premier Banking"]];
const NAV = [["Dashboard", "dashboard"], ["Pages", "pages"], ["Assets", "assets"], ["Content models", "models"], ["Content entities", "entities"], ["Templates", "templates"], ["My tasks", "tasks"], ["API & delivery", "api"], ["Users & roles", "users"], ["Audit log", "audit"], ["Why UCP", "benefits"]];

const RECENT = "Recently viewed";
const SUGGEST = "Suggestions";
/** Every group is capped, as the source project caps each of its own — this is what keeps the panel short. */
const PER_GROUP = 6;

type Item = { id: string; section: string; label: string; hint?: string; trailing?: React.ReactNode; removable?: boolean; run: () => void };

const SECTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "Ask AI": Sparkles,
  "Add component": Blocks,
  Pages: FileText,
  "Go to": Compass,
  [SUGGEST]: Compass,
};

/** The tile icon follows the entry, not its heading, so a page looks like a page wherever it appears. */
function iconFor(it: Item) {
  if (it.id.startsWith("pg:")) return FileText;
  if (it.id.startsWith("go:")) return Compass;
  return SECTION_ICON[it.section] ?? Search;
}

const KBD = "rounded border bg-muted px-1 py-0.5";

export function Palette({ marketId, envId }: { marketId: string; envId: string }) {
  const router = useRouter(); const pathname = usePathname();
  const inBuilder = pathname.includes("/page/"); const base = `/${marketId}/${envId}`; const root = market(marketId).root;
  const [open, setOpenRaw] = useState(false); const [q, setQRaw] = useState(""); const [pages, setPages] = useState<PageSummary[]>([]); const [sel, setSel] = useState(0);
  const [recents, setRecents] = useState<Recent[]>([]);
  const inputRef = useRef<HTMLInputElement>(null); const listRef = useRef<HTMLDivElement>(null); const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null); const openRef = useRef(false);
  const listId = useId();

  /* Pure state setters (the compiler lint forbids reading refs from anything that runs during render).
     Recents are read here rather than in an effect, so the first painted frame already has them. */
  const close = useCallback(() => setOpenRaw(false), []);
  const show = useCallback(() => { setQRaw(""); setSel(0); setPages([]); setRecents(readRecents()); setOpenRaw(true); }, []);
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
  /* Pages are only searched once something is typed: the opening state offers recents and
     suggestions instead, so there is nothing to prefetch. */
  useEffect(() => {
    if (!open) return;
    const s = q.trim();
    if (!s) return;
    const t = setTimeout(() => ucpApi.search(marketId, s).then((r) => setPages(r.pages)).catch(() => setPages([])), 150);
    return () => clearTimeout(t);
  }, [q, open, marketId]);

  const items = useMemo<Item[]>(() => {
    const s = q.toLowerCase().trim(); const has = (x: string) => !s || x.toLowerCase().includes(s); const out: Item[] = [];
    const go = (seg: string) => () => router.push(`${base}/${seg}`);
    const toPage = (path: string) => () => router.push(`${base}/page${path.replace(root, "")}`);
    /* Choosing a route-shaped entry records it; everything else is builder-local. */
    const done = (fn: () => void, recent?: Recent) => () => { if (recent) pushRecent(recent); close(); fn(); };

    if (!s) {
      recents.forEach((r) => out.push({
        id: r.id, section: RECENT, label: r.label, hint: r.hint, removable: true,
        run: done(r.id.startsWith("pg:") ? toPage(r.id.slice(3)) : go(r.id.slice(3)), r),
      }));
      const taken = new Set(recents.map((r) => r.id));
      const suggestions: Item[] = [];
      if (inBuilder) {
        AI.slice(0, 3).forEach(([l, p]) => suggestions.push({ id: "ai:" + l, section: SUGGEST, label: l, hint: "agent", run: done(() => window.dispatchEvent(new CustomEvent("ucp:ai", { detail: { prompt: p } }))) }));
      }
      NAV.forEach(([l, seg]) => suggestions.push({ id: "go:" + seg, section: SUGGEST, label: l, run: done(go(seg), { id: "go:" + seg, label: l }) }));
      suggestions.filter((it) => !taken.has(it.id)).slice(0, PER_GROUP).forEach((it) => out.push(it));
      return out;
    }

    if (inBuilder) {
      const ai = AI.filter((x) => has(x[0])).slice(0, PER_GROUP);
      ai.forEach(([l, p]) => out.push({ id: "ai:" + l, section: "Ask AI", label: l, hint: "agent", run: done(() => window.dispatchEvent(new CustomEvent("ucp:ai", { detail: { prompt: p } }))) }));
      if (!ai.length) out.push({ id: "ai:free", section: "Ask AI", label: `Ask AI: “${q.trim()}”`, run: done(() => window.dispatchEvent(new CustomEvent("ucp:ai", { detail: { prompt: q.trim() } }))) });
      BLOCKS.filter((b) => b.name.toLowerCase().includes(s) || b.type.includes(s)).slice(0, PER_GROUP).forEach((b) => out.push({ id: "blk:" + b.type, section: "Add component", label: b.name, hint: b.desc, run: done(() => window.dispatchEvent(new CustomEvent("ucp:add-block", { detail: { type: b.type } }))) }));
    }
    pages.slice(0, PER_GROUP).forEach((p) => {
      const hint = p.path.replace(root, "") || "/";
      out.push({ id: "pg:" + p.path, section: "Pages", label: p.title, hint, trailing: <Pill status={p.status} />, run: done(toPage(p.path), { id: "pg:" + p.path, label: p.title, hint }) });
    });
    NAV.filter((x) => has(x[0])).slice(0, PER_GROUP).forEach(([l, seg]) => out.push({ id: "go:" + seg, section: "Go to", label: l, run: done(go(seg), { id: "go:" + seg, label: l }) }));
    return out;
  }, [q, pages, recents, inBuilder, base, root, router, close]);
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
  const opening = !q.trim();
  let last = ""; let group = -1;
  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm duration-120 animate-in fade-in motion-reduce:animate-none"
        onMouseDown={close}
        role="presentation"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onKeyDown={trap}
        className="fixed inset-x-0 top-[12vh] z-[60] mx-auto flex max-h-[70vh] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl duration-160 animate-in fade-in slide-in-from-top-2 ease-out motion-reduce:animate-none"
      >
        <div className="flex items-center gap-3.5 border-b px-6 py-3">
          <Search className="size-6 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef} type="text" data-slot="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            autoComplete="off" spellCheck={false} aria-label="Search" role="combobox" aria-expanded="true"
            aria-controls={listId} aria-autocomplete="list" aria-activedescendant={items.length ? optId(cur) : undefined}
            className="h-16 flex-1 bg-transparent py-5 text-base text-foreground outline-none placeholder:text-muted-foreground"
            placeholder={inBuilder ? "What would you like to do? Search pages, components or ask AI…" : "Search pages, templates, users, settings…"}
          />
          <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">ESC</kbd>
        </div>

        <div ref={listRef} id={listId} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {items.length ? items.map((it, i) => {
            const head = it.section !== last; last = it.section; if (head) group++;
            const Icon = iconFor(it);
            return (
              <Fragment key={it.id}>
                {head && (
                  <div className={`mb-1 flex items-center justify-between px-2 pb-1 ${opening && group > 0 ? "mt-2 border-t pt-3" : "pt-2"}`}>
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{it.section}</span>
                    {it.section === RECENT && (
                      <button type="button" className="cursor-pointer text-[11px] font-medium text-brand hover:underline dark:text-destructive" onClick={() => setRecents(clearRecents())}>
                        Clear all
                      </button>
                    )}
                  </div>
                )}
                <div className={it.removable ? "relative" : undefined}>
                  <button
                    id={optId(i)} data-i={i} role="option" aria-selected={i === cur} tabIndex={-1}
                    onMouseMove={() => setSel(i)} onClick={it.run}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-start text-sm transition-colors ${it.removable ? "pe-9" : ""} ${i === cur ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{it.label}</span>
                      {it.hint && <span className="block truncate text-xs text-muted-foreground">{it.hint}</span>}
                    </span>
                    {it.trailing && <span className="shrink-0">{it.trailing}</span>}
                    {i === cur && !it.removable && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                  {it.removable && (
                    <button
                      type="button"
                      className="absolute end-2 top-1/2 inline-flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground/60 transition-colors hover:text-foreground"
                      aria-label={`Remove ${it.label} from recently viewed`}
                      onClick={() => setRecents(removeRecent(it.id))}
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </Fragment>
            );
          }) : (
            <div className="flex flex-col items-center gap-1 px-4 py-12 text-center">
              <Search className="size-6 text-muted-foreground" />
              <p className="mt-1 text-sm font-medium">No results for “{q.trim()}”</p>
              <p className="text-xs text-muted-foreground">Try a page name, a person, a component or a setting.</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><kbd className={KBD}>↑</kbd><kbd className={KBD}>↓</kbd>Navigate</span>
          <span className="inline-flex items-center gap-1"><kbd className={KBD}>↵</kbd>Open</span>
          <span className="ms-auto inline-flex items-center gap-1"><kbd className={KBD}>⌘K</kbd>Search</span>
        </div>
      </div>
    </>
  );
}
