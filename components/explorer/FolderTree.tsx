"use client";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { ChevronRight, Folder, FolderOpen, Layers } from "lucide-react";

type Node = { path: string; title: string; children: Node[] };
const KEY = "ucp-tree-open";

/**
 * Folder tree, ported from hsbc-ucpmock's `src/lib/components/tree/tree.svelte`.
 *
 * Its rules, which this follows: a chevron appears only where there is something to expand, the
 * root is fixed — always open, no chevron, and no indent for its children, because the market is
 * not a folder you can fold away — leaf rows get a spacer so every label lines up, each row
 * carries the number of pages beneath it, and the folder icon is quiet until its row is the
 * current one, when it takes the HSBC red.
 *
 * Ancestors of the current folder open automatically; everything else you open or close is
 * remembered per browser.
 */
const EVT = "ucp-folders";
const subscribeSaved = (cb: () => void) => { window.addEventListener("storage", cb); window.addEventListener(EVT, cb); return () => { window.removeEventListener("storage", cb); window.removeEventListener(EVT, cb); }; };
/** { path: open? } · older versions stored a list of open folders */
const readSaved = (raw: string): Record<string, boolean> => { try { const v = JSON.parse(raw || "{}"); return Array.isArray(v) ? Object.fromEntries(v.map((x: string) => [x, true])) : v && typeof v === "object" ? v : {}; } catch { return {}; } };

export function FolderTree({ root, marketName, base, current, folders, counts }: { root: string; marketName: string; base: string; current: string; folders: { path: string; title: string }[]; counts: Record<string, number> }) {
  const rel = (p: string) => p.replace(root, "") || "/";
  const tree = build(root, folders);
  const ancestors = new Set<string>(); { let p = current; while (p.startsWith(root + "/")) { p = p.replace(/\/[^/]+$/, ""); ancestors.add(p); } }
  const raw = useSyncExternalStore(subscribeSaved, () => { try { return localStorage.getItem(KEY) ?? ""; } catch { return ""; } }, () => "");
  const saved = useMemo(() => readSaved(raw), [raw]);
  const isOpen = (p: string) => saved[p] ?? ancestors.has(p);
  const open = new Set<string>([...ancestors, ...Object.keys(saved)].filter(isOpen));
  const toggle = (p: string) => { const next = { ...saved, [p]: !isOpen(p) }; try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private window */ } window.dispatchEvent(new Event(EVT)); };
  const ctx = { root, base, current, open, toggle, rel, counts };
  return <ul aria-label="Folders" className="m-0 list-none p-0"><Row n={{ path: root, title: marketName, children: tree }} depth={0} ctx={ctx} /></ul>;
}

type Ctx = { root: string; base: string; current: string; open: Set<string>; toggle: (p: string) => void; rel: (p: string) => string; counts: Record<string, number> };

const ROW = "group/row flex h-8 items-center gap-0.5 pe-3 text-sm text-ink-2 transition-[background-color,box-shadow] duration-160 ease-out hover:bg-surface-3 data-[current=true]:bg-(--sidebar-active) data-[current=true]:font-medium data-[current=true]:text-foreground data-[current=true]:shadow-[inset_2px_0_0_var(--sidebar-active-bar)] data-[current=true]:hover:bg-(--sidebar-active-hover)";
const ICON = "size-4 shrink-0 text-ink-3 group-data-[current=true]/row:text-brand";

function Row({ n, depth, ctx }: { n: Node; depth: number; ctx: Ctx }) {
  const { root, base, current, open, toggle, rel, counts } = ctx;
  /* The root is fixed: always expanded, and its children start at the same level rather than
     indenting away from a chevron that is not there. */
  const fixed = n.path === root;
  const has = n.children.length > 0;
  const isOpen = has && (fixed || open.has(n.path));
  const on = current === n.path;
  const Icon = fixed ? Layers : isOpen ? FolderOpen : Folder;
  const count = counts[n.path];
  return (
    <li className="m-0 list-none p-0">
      <div className={ROW} style={{ paddingInlineStart: fixed ? "0.75rem" : `${0.25 + depth * 0.75}rem` }} data-current={on}>
        {fixed ? null : has ? (
          <button
            type="button"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center text-ink-3 transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none"
            aria-label={isOpen ? `Collapse ${n.title}` : `Expand ${n.title}`}
            aria-expanded={isOpen}
            onClick={() => toggle(n.path)}
          >
            <ChevronRight className={`size-4 transition-transform duration-200 ease-out ${isOpen ? "rotate-90" : ""}`} />
          </button>
        ) : <span className="size-6 shrink-0" aria-hidden />}
        <Link
          href={`${base}/pages${fixed ? "" : rel(n.path)}`}
          aria-current={on ? "true" : undefined}
          className="flex h-full min-w-0 flex-1 items-center gap-2 text-start no-underline"
        >
          <Icon className={ICON} />
          <span className="min-w-0 flex-1 truncate">{n.title}</span>
          {count !== undefined && count > 0 && <span className="text-xs font-normal text-ink-3 tabular-nums">{count}</span>}
        </Link>
      </div>
      {isOpen && <ul className="m-0 list-none p-0">{n.children.map((c) => <Row key={c.path} n={c} depth={fixed ? depth : depth + 1} ctx={ctx} />)}</ul>}
    </li>
  );
}

function build(root: string, folders: { path: string; title: string }[]): Node[] {
  const byPath = new Map<string, Node>(); folders.forEach((f) => byPath.set(f.path, { path: f.path, title: f.title, children: [] }));
  const top: Node[] = [];
  folders.slice().sort((a, b) => a.path.localeCompare(b.path)).forEach((f) => { const parent = f.path.replace(/\/[^/]+$/, ""); const node = byPath.get(f.path)!; if (parent === root || !byPath.has(parent)) top.push(node); else byPath.get(parent)!.children.push(node); });
  return top;
}
