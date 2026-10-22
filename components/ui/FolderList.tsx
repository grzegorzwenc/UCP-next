"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { FolderIcon, SiteIcon, PageIcon } from "@/components/ui/Icons";

/**
 * Folder tree with the same look as the Pages tree: a root row with a chevron, folder rows with the
 * yellow folder icon, counts on the right, red highlight for the current one. Items can be links or buttons.
 * Items may nest one level deeper through `children` (collapsible, `open` sets the initial state) and can carry
 * extra content on the right (`right`: a status dot, a hover menu…). `icon` accepts a custom node too.
 * Drag and drop: items with `dragId` can be dragged; rows with `onDrop` accept them. Dropping on a folder row puts the
 * item into that folder, dropping on an item row puts it just above that item. `accepts` can refuse a drop.
 */
export type FolderItem = { key: string; label: string; count?: number; active?: boolean; href?: string; onClick?: () => void; icon?: "folder" | "page" | React.ReactNode; title?: string; right?: React.ReactNode; children?: FolderItem[]; open?: boolean; dragId?: string; onDrop?: (dragId: string) => void; accepts?: (dragId: string) => boolean };
const MIME = "text/x-ucp-tree";
export function FolderList({ root, items, extra }: { root: { label: string; count?: number; active?: boolean; href?: string; onClick?: () => void }; items: FolderItem[]; extra?: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [ov, setOv] = useState<Record<string, boolean>>({}); // per-item expand overrides (default comes from `item.open`)
  const [drag, setDragState] = useState<string | null>(null); const dragRef = useRef<string | null>(null); // ref: read by drop even before React re-renders
  const setDrag = (v: string | null) => { dragRef.current = v; setDragState(v); }; const [over, setOver] = useState<string | null>(null);
  const isOpen = (it: FolderItem) => ov[it.key] ?? !!it.open;
  const flip = (it: FolderItem) => setOv((o) => ({ ...o, [it.key]: !isOpen(it) }));
  const row = (it: FolderItem, depth: number, icon: React.ReactNode, chevron?: React.ReactNode) => {
    const cls = `flex-1 min-w-0 flex items-center gap-1.5 py-1 pr-2 truncate text-left`;
    const inner = <>{icon}<span className="truncate">{it.label}</span>{it.count !== undefined && <small className="ml-auto text-[10.5px] text-ink-4 font-mono tabular-nums">{it.count}</small>}</>;
    const folder = !!it.children; const cur = drag; const ok = !!cur && !!it.onDrop && it.dragId !== cur && (it.accepts?.(cur) ?? true); const hot = ok && over === it.key;
    const dnd = { draggable: !!it.dragId || undefined,
      onDragStart: it.dragId ? (e: React.DragEvent) => { e.dataTransfer.setData(MIME, it.dragId!); e.dataTransfer.effectAllowed = "move"; setDrag(it.dragId!); } : undefined,
      onDragEnd: () => { setDrag(null); setOver(null); },
      onDragOver: it.onDrop ? (e: React.DragEvent) => { const c = dragRef.current; if (!c || c === it.dragId || !(it.accepts?.(c) ?? true)) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== it.key) setOver(it.key); } : undefined,
      onDragLeave: it.onDrop ? () => setOver((o) => (o === it.key ? null : o)) : undefined,
      onDrop: it.onDrop ? (e: React.DragEvent) => { e.preventDefault(); const id = e.dataTransfer.getData(MIME) || dragRef.current; setDrag(null); setOver(null); if (id && id !== it.dragId) it.onDrop!(id); } : undefined };
    return <div key={it.key} title={it.title} {...dnd} className={`group flex items-center rounded text-[13.5px] ${it.dragId ? "cursor-grab active:cursor-grabbing" : ""} ${drag && it.dragId === drag ? "opacity-40" : ""} ${hot && folder ? "ring-2 ring-brand bg-brand-soft" : ""} ${hot && !folder ? "shadow-[inset_0_2px_0_0_var(--color-brand)]" : ""} ${it.active ? "bg-brand-soft text-brand-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`} style={{ paddingLeft: 4 + depth * 14 }}>
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
