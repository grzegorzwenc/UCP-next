"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronRight, FileText, Folder, FolderOpen, Layers } from "lucide-react";

/**
 * The side tree for the library screens — assets, models, templates and entities.
 *
 * Rows are the same construction as the Pages tree (`components/explorer/FolderTree.tsx`, itself a
 * port of hsbc-ucpmock's `tree/tree.svelte`), so the four library screens and Pages read as one
 * component: a chevron only where there is something to expand, leaf rows padded to match, the
 * root fixed — always open, no chevron, because the library itself is not a folder you fold away —
 * counts right-aligned in `tabular-nums`, and a folder icon that stays quiet until its row is the
 * current one, when it takes the HSBC red.
 *
 * Items can be links or buttons, may nest through `children` (`open` sets the initial state) and
 * can carry extra content on the right (`right`: a status dot, a hover menu…). `icon` accepts
 * "folder", "page" or a node of its own. Drag and drop: items with `dragId` can be dragged, rows
 * with `onDrop` accept them — dropping on a folder moves into it, dropping on an item puts the
 * dragged thing just above it, and `accepts` can refuse.
 */
export type FolderItem = { key: string; label: string; count?: number; active?: boolean; href?: string; onClick?: () => void; icon?: "folder" | "page" | React.ReactNode; title?: string; right?: React.ReactNode; children?: FolderItem[]; open?: boolean; dragId?: string; onDrop?: (dragId: string) => void; accepts?: (dragId: string) => boolean };

const MIME = "text/x-ucp-tree";

const ROW = "group/row flex h-8 items-center gap-0.5 pe-3 text-sm text-ink-2 transition-[background-color,box-shadow] duration-160 ease-out hover:bg-surface-3 data-[current=true]:bg-(--sidebar-active) data-[current=true]:font-medium data-[current=true]:text-foreground data-[current=true]:shadow-[inset_2px_0_0_var(--sidebar-active-bar)] data-[current=true]:hover:bg-(--sidebar-active-hover)";
const ICON = "size-4 shrink-0 text-ink-3 group-data-[current=true]/row:text-brand";
const HIT = "flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 text-start no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none";

export function FolderList({ root, items, extra }: { root: { label: string; count?: number; active?: boolean; href?: string; onClick?: () => void }; items: FolderItem[]; extra?: React.ReactNode }) {
  const [ov, setOv] = useState<Record<string, boolean>>({}); // per-item expand overrides (default comes from `item.open`)
  const [drag, setDragState] = useState<string | null>(null); const dragRef = useRef<string | null>(null); // ref: read by drop even before React re-renders
  const setDrag = (v: string | null) => { dragRef.current = v; setDragState(v); }; const [over, setOver] = useState<string | null>(null);
  const isOpen = (it: FolderItem) => ov[it.key] ?? !!it.open;
  const flip = (it: FolderItem) => setOv((o) => ({ ...o, [it.key]: !isOpen(it) }));

  const row = (it: FolderItem, depth: number, icon: React.ReactNode, lead?: React.ReactNode, fixed = false) => {
    const inner = <>{icon}<span className="min-w-0 flex-1 truncate">{it.label}</span>{it.count !== undefined && <span className="text-xs font-normal text-ink-3 tabular-nums">{it.count}</span>}</>;
    const folder = !!it.children; const cur = drag; const ok = !!cur && !!it.onDrop && it.dragId !== cur && (it.accepts?.(cur) ?? true); const hot = ok && over === it.key;
    const dnd = { draggable: !!it.dragId || undefined,
      onDragStart: it.dragId ? (e: React.DragEvent) => { e.dataTransfer.setData(MIME, it.dragId!); e.dataTransfer.effectAllowed = "move"; setDrag(it.dragId!); } : undefined,
      onDragEnd: () => { setDrag(null); setOver(null); },
      onDragOver: it.onDrop ? (e: React.DragEvent) => { const c = dragRef.current; if (!c || c === it.dragId || !(it.accepts?.(c) ?? true)) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (over !== it.key) setOver(it.key); } : undefined,
      onDragLeave: it.onDrop ? () => setOver((o) => (o === it.key ? null : o)) : undefined,
      onDrop: it.onDrop ? (e: React.DragEvent) => { e.preventDefault(); const id = e.dataTransfer.getData(MIME) || dragRef.current; setDrag(null); setOver(null); if (id && id !== it.dragId) it.onDrop!(id); } : undefined };
    return <div
      key={it.key}
      title={it.title}
      {...dnd}
      data-current={!!it.active}
      className={`${ROW} ${it.dragId ? "cursor-grab active:cursor-grabbing" : ""} ${drag && it.dragId === drag ? "opacity-40" : ""} ${hot && folder ? "ring-2 ring-brand ring-inset" : ""} ${hot && !folder ? "shadow-[inset_0_2px_0_0_var(--color-brand)]" : ""}`}
      style={{ paddingInlineStart: fixed ? "0.75rem" : `${0.25 + depth * 0.75}rem` }}
    >
      {lead ?? (fixed ? null : <span className="size-6 shrink-0" aria-hidden />)}
      {it.href
        ? <Link href={it.href} className={HIT} aria-current={it.active ? "page" : undefined}>{inner}</Link>
        : <button type="button" onClick={it.onClick} className={HIT} aria-current={it.active ? "page" : undefined}>{inner}</button>}
      {it.right}
    </div>;
  };

  const iconOf = (it: FolderItem, fallback: React.ReactNode) => (it.icon === "page" ? <FileText className={ICON} /> : it.icon === "folder" || it.icon === undefined ? fallback : it.icon);

  const node = (it: FolderItem, depth: number): React.ReactNode => {
    const has = !!it.children?.length; const exp = has && isOpen(it);
    const chevron = has
      ? <button
          type="button"
          aria-label={exp ? `Collapse ${it.label}` : `Expand ${it.label}`}
          aria-expanded={exp}
          onClick={() => flip(it)}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center text-ink-3 transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none"
        >
          <ChevronRight className={`size-4 transition-transform duration-200 ease-out ${exp ? "rotate-90" : ""}`} />
        </button>
      : undefined;
    return <div key={it.key}>{row(it, depth, iconOf(it, exp ? <FolderOpen className={ICON} /> : <Folder className={ICON} />), chevron)}{exp && it.children!.map((c) => node(c, depth + 1))}</div>;
  };

  /* The root is fixed: no chevron, and its children start at the level it would have indented
     them to, so every label lines up under it rather than off a chevron that is not there. */
  return <div>
    {row({ key: "root", ...root }, 0, <Layers className={ICON} />, undefined, true)}
    {items.map((it) => node(it, 0))}
    {extra}
  </div>;
}
