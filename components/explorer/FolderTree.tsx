"use client";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { FolderIcon, SiteIcon } from "@/components/ui/Icons";

type Node = { path: string; title: string; children: Node[] };
const KEY = "ucp-tree-open";
/* Open folders are remembered per browser in localStorage, read through an external store (no setState in effects, no hydration mismatch). */
const subs = new Set<() => void>();
const readSaved = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const writeSaved = (set: Set<string>) => { try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* private mode */ } subs.forEach((f) => f()); };

/** Collapsible folder tree. Ancestors of the current folder open automatically; other toggles are remembered per browser. */
export function FolderTree({ root, marketName, flag, base, current, folders }: { root: string; marketName: string; flag: string; base: string; current: string; folders: { path: string; title: string }[] }) {
  const rel = (p: string) => p.replace(root, "") || "/";
  const tree = build(root, folders);
  const ancestors = new Set<string>([current]); /* the open folder itself shows its subfolders */ { let p = current; while (p.startsWith(root + "/")) { p = p.replace(/\/[^/]+$/, ""); ancestors.add(p); } }
  const raw = useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, readSaved, () => null);
  const saved = useMemo(() => { try { return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []); } catch { return new Set<string>(); } }, [raw]);
  const [closed, setClosed] = useState<Set<string>>(() => new Set()); // folders the person closed in this visit (wins over "ancestor of current")
  const isOpen = (p: string) => !closed.has(p) && (saved.has(p) || ancestors.has(p));
  const expand = (p: string) => { setClosed((c) => { if (!c.has(p)) return c; const n = new Set(c); n.delete(p); return n; }); if (!saved.has(p)) writeSaved(new Set([...saved, p])); };
  const toggle = (p: string) => { if (isOpen(p)) { setClosed((c) => new Set([...c, p])); const n = new Set(saved); n.delete(p); writeSaved(n); } else expand(p); };
  const ctx = { root, base, flag, current, isOpen, toggle, expand, rel };
  return <ul aria-label="Folders"><Row n={{ path: root, title: marketName, children: tree }} depth={0} ctx={ctx} /></ul>;
}
type Ctx = { root: string; base: string; flag: string; current: string; isOpen: (p: string) => boolean; toggle: (p: string) => void; expand: (p: string) => void; rel: (p: string) => string };
function Row({ n, depth, ctx }: { n: Node; depth: number; ctx: Ctx }) {
  const { root, base, flag, current, toggle, expand, rel } = ctx;
  const isOpen = ctx.isOpen(n.path) || n.path === root; const on = current === n.path; const has = n.children.length > 0;
  return (
    <li>
      <div className={`flex items-center rounded text-[13.5px] ${on ? "bg-accent-soft text-accent-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`} style={{ paddingLeft: 4 + depth * 14 }}>
        <button type="button" aria-label={isOpen ? `Collapse ${n.title}` : `Expand ${n.title}`} aria-expanded={isOpen} onClick={() => toggle(n.path)} className={`w-5 h-7 grid place-items-center text-[10px] text-ink-3 ${has ? "" : "invisible"}`}>{isOpen ? "▾" : "▸"}</button>
        <Link href={`${base}/pages${n.path === root ? "" : rel(n.path)}`} aria-current={on ? "page" : undefined} onClick={() => { if (has) expand(n.path); }} className="flex-1 min-w-0 flex items-center gap-1.5 py-1 pr-2 truncate">{n.path === root ? <SiteIcon /> : <FolderIcon />}<span className="truncate">{n.path === root ? `${flag} ${n.title}` : n.title}</span>{has && !isOpen && <small className="ml-auto text-[10.5px] text-ink-4 font-mono">{n.children.length}</small>}</Link>
      </div>
      {has && isOpen && <ul>{n.children.map((c) => <Row key={c.path} n={c} depth={depth + 1} ctx={ctx} />)}</ul>}
    </li>
  );
}
function build(root: string, folders: { path: string; title: string }[]): Node[] {
  const byPath = new Map<string, Node>(); folders.forEach((f) => byPath.set(f.path, { path: f.path, title: f.title, children: [] }));
  const top: Node[] = [];
  folders.slice().sort((a, b) => a.path.localeCompare(b.path)).forEach((f) => { const parent = f.path.replace(/\/[^/]+$/, ""); const node = byPath.get(f.path)!; if (parent === root || !byPath.has(parent)) top.push(node); else byPath.get(parent)!.children.push(node); });
  return top;
}
