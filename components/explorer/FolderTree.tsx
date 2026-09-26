"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FolderIcon, SiteIcon } from "@/components/ui/Icons";

type Node = { path: string; title: string; children: Node[] };
const KEY = "ucp-tree-open";

/** Collapsible folder tree. Ancestors of the current folder open automatically; other toggles are remembered per browser. */
export function FolderTree({ root, marketName, flag, base, current, folders }: { root: string; marketName: string; flag: string; base: string; current: string; folders: { path: string; title: string }[] }) {
  const rel = (p: string) => p.replace(root, "") || "/";
  const tree = build(root, folders);
  const ancestors = new Set<string>(); { let p = current; while (p.startsWith(root + "/")) { p = p.replace(/\/[^/]+$/, ""); ancestors.add(p); } }
  const [open, setOpen] = useState<Set<string>>(() => new Set<string>([...ancestors]));
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(KEY) || "[]") as string[]; setOpen((o) => new Set([...o, ...saved, ...ancestors])); } catch {} /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [current]);
  const toggle = (p: string) => setOpen((o) => { const n = new Set(o); if (n.has(p)) n.delete(p); else n.add(p); try { localStorage.setItem(KEY, JSON.stringify([...n])); } catch {} return n; });
  const ctx = { root, base, flag, current, open, toggle, rel };
  return <ul aria-label="Folders"><Row n={{ path: root, title: marketName, children: tree }} depth={0} ctx={ctx} /></ul>;
}
type Ctx = { root: string; base: string; flag: string; current: string; open: Set<string>; toggle: (p: string) => void; rel: (p: string) => string };
function Row({ n, depth, ctx }: { n: Node; depth: number; ctx: Ctx }) {
  const { root, base, flag, current, open, toggle, rel } = ctx;
  const isOpen = open.has(n.path) || n.path === root; const on = current === n.path; const has = n.children.length > 0;
  return (
    <li>
      <div className={`flex items-center rounded text-[13.5px] ${on ? "bg-accent-soft text-accent-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`} style={{ paddingLeft: 4 + depth * 14 }}>
        <button type="button" aria-label={isOpen ? `Collapse ${n.title}` : `Expand ${n.title}`} aria-expanded={isOpen} onClick={() => toggle(n.path)} className={`w-5 h-7 grid place-items-center text-[10px] text-ink-3 ${has ? "" : "invisible"}`}>{isOpen ? "▾" : "▸"}</button>
        <Link href={`${base}/pages${n.path === root ? "" : rel(n.path)}`} className="flex-1 min-w-0 flex items-center gap-1.5 py-1 pr-2 truncate">{n.path === root ? <SiteIcon /> : <FolderIcon />}<span className="truncate">{n.path === root ? `${flag} ${n.title}` : n.title}</span>{has && !isOpen && <small className="ml-auto text-[10.5px] text-ink-4 font-mono">{n.children.length}</small>}</Link>
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
