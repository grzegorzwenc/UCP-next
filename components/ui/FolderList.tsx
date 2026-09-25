"use client";
import Link from "next/link";
import { useState } from "react";
import { FolderIcon, SiteIcon, PageIcon } from "@/components/ui/Icons";

/**
 * Folder tree with the same look as the Pages tree: a root row with a chevron, folder rows with the
 * yellow folder icon, counts on the right, red highlight for the current one. Items can be links or buttons.
 * Items may nest one level deeper through `children` (collapsible, `open` sets the initial state) and can carry
 * extra content on the right (`right`: a status dot, a hover menu…). `icon` accepts a custom node too.
 */
export type FolderItem = { key: string; label: string; count?: number; active?: boolean; href?: string; onClick?: () => void; icon?: "folder" | "page" | React.ReactNode; title?: string; right?: React.ReactNode; children?: FolderItem[]; open?: boolean };
export function FolderList({ root, items, extra }: { root: { label: string; count?: number; active?: boolean; href?: string; onClick?: () => void }; items: FolderItem[]; extra?: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [ov, setOv] = useState<Record<string, boolean>>({}); // per-item expand overrides (default comes from `item.open`)
  const isOpen = (it: FolderItem) => ov[it.key] ?? !!it.open;
  const flip = (it: FolderItem) => setOv((o) => ({ ...o, [it.key]: !isOpen(it) }));
  const row = (it: FolderItem, depth: number, icon: React.ReactNode, chevron?: React.ReactNode) => {
    const cls = `flex-1 min-w-0 flex items-center gap-1.5 py-1 pr-2 truncate text-left`;
    const inner = <>{icon}<span className="truncate">{it.label}</span>{it.count !== undefined && <small className="ml-auto text-[10.5px] text-ink-4 font-mono tabular-nums">{it.count}</small>}</>;
    return <div key={it.key} title={it.title} className={`group flex items-center rounded text-[13.5px] ${it.active ? "bg-accent-soft text-accent-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`} style={{ paddingLeft: 4 + depth * 14 }}>
      {chevron ?? <span className="w-5" aria-hidden />}
      {it.href ? <Link href={it.href} className={cls} aria-current={it.active ? "page" : undefined}>{inner}</Link> : <button type="button" onClick={it.onClick} className={cls} aria-current={it.active ? "page" : undefined}>{inner}</button>}
      {it.right}
    </div>;
  };
  const iconOf = (it: FolderItem, fallback: React.ReactNode) => (it.icon === "page" ? <PageIcon /> : it.icon === "folder" || it.icon === undefined ? fallback : it.icon);
  const node = (it: FolderItem, depth: number): React.ReactNode => {
    const has = !!it.children?.length; const exp = has && isOpen(it);
    const chevron = has ? <button type="button" aria-label={exp ? `Collapse ${it.label}` : `Expand ${it.label}`} aria-expanded={exp} onClick={() => flip(it)} className="w-5 h-7 grid place-items-center text-[10px] text-ink-3">{exp ? "▾" : "▸"}</button> : undefined;
    return <div key={it.key}>{row(it, depth, iconOf(it, <FolderIcon />), chevron)}{exp && it.children!.map((c) => node(c, depth + 1))}</div>;
  };
  return <div>
    {row({ key: "root", ...root }, 0, <SiteIcon />, <button type="button" aria-label={open ? "Collapse" : "Expand"} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="w-5 h-7 grid place-items-center text-[10px] text-ink-3">{open ? "▾" : "▸"}</button>)}
    {open && items.map((it) => node(it, 1))}
    {open && extra}
  </div>;
}
