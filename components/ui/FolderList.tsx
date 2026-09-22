"use client";
import Link from "next/link";
import { useState } from "react";
import { FolderIcon, SiteIcon, PageIcon } from "@/components/ui/Icons";

/**
 * One-level folder tree with the same look as the Pages tree: a root row with a chevron, folder rows with the
 * yellow folder icon, counts on the right, red highlight for the current one. Items can be links or buttons.
 */
export type FolderItem = { key: string; label: string; count?: number; active?: boolean; href?: string; onClick?: () => void; icon?: "folder" | "page" };
export function FolderList({ root, items, extra }: { root: { label: string; count?: number; active?: boolean; href?: string; onClick?: () => void }; items: FolderItem[]; extra?: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const row = (it: FolderItem, depth: number, icon: React.ReactNode, chevron?: React.ReactNode) => {
    const cls = `flex-1 min-w-0 flex items-center gap-1.5 py-1 pr-2 truncate text-left`;
    const inner = <>{icon}<span className="truncate">{it.label}</span>{it.count !== undefined && <small className="ml-auto text-[10.5px] text-ink-4 font-mono tabular-nums">{it.count}</small>}</>;
    return <div key={it.key} className={`flex items-center rounded text-[13.5px] ${it.active ? "bg-accent-soft text-accent-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`} style={{ paddingLeft: 4 + depth * 14 }}>
      {chevron ?? <span className="w-5" aria-hidden />}
      {it.href ? <Link href={it.href} className={cls}>{inner}</Link> : <button type="button" onClick={it.onClick} className={cls}>{inner}</button>}
    </div>;
  };
  return <div>
    {row({ key: "root", ...root }, 0, <SiteIcon />, <button type="button" aria-label={open ? "Collapse" : "Expand"} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="w-5 h-7 grid place-items-center text-[10px] text-ink-3">{open ? "▾" : "▸"}</button>)}
    {open && items.map((it) => row(it, 1, it.icon === "page" ? <PageIcon /> : <FolderIcon />))}
    {open && extra}
  </div>;
}
