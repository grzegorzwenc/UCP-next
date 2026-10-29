"use client";
import Link from "next/link";
import { ExternalLink, Folder, FolderUp, Grid3x3, LayoutGrid, Link as LinkIcon, List, Pencil } from "lucide-react";
import { PageThumb } from "@/components/explorer/PageThumb";
import { Pill } from "@/components/ui/Pill";
import { ukDate } from "@/lib/dates";
import type { PageSummary } from "@/lib/api/types";

export type View = "compact" | "grid" | "list";

/**
 * The three library views from hsbc-ucpmock's `library-browser.svelte` — compact, grid and list —
 * plus the folder tiles that sit above the items in the two card views, and the card itself
 * (`item-card.svelte`).
 *
 * In both card views folders are shown as tiles rather than mixed into the item grid, which is
 * what stops a folder reading as a page. The folder icon is quiet until you hover it, when it
 * takes the HSBC red, the same move the tree makes for the selected row.
 */
const TOGGLE_ITEM = "inline-flex size-9 cursor-pointer items-center justify-center transition-colors duration-160 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none";

const ALL_VIEWS: View[] = ["compact", "grid", "list"];

export function ViewToggle({ view, onChange, modes = ALL_VIEWS }: { view: View; onChange: (v: View) => void; modes?: readonly View[] }) {
  const item = (v: View, Icon: React.ComponentType<{ className?: string }>, title: string) => (
    <button
      type="button"
      aria-pressed={view === v}
      title={title}
      aria-label={`${title} view`}
      onClick={() => onChange(v)}
      className={`${TOGGLE_ITEM} border-s border-line-2 first:border-s-0 ${view === v ? "bg-foreground text-background" : "text-ink-3 hover:bg-accent/40 hover:text-ink"}`}
    >
      <Icon className="size-4" />
    </button>
  );
  return (
    <div className="inline-flex shrink-0 border border-line-2" role="group" aria-label="View">
      {modes.includes("compact") && item("compact", Grid3x3, "Compact")}
      {modes.includes("grid") && item("grid", LayoutGrid, "Grid")}
      {modes.includes("list") && item("list", List, "List")}
    </div>
  );
}

export function FolderTiles({ folders, base, rel, counts, scopeName, upHref, upName }: {
  folders: PageSummary[];
  base: string;
  rel: (p: string) => string;
  counts: Record<string, number>;
  scopeName: string;
  /** The parent folder, when there is one — the card views have no breadcrumb of their own. */
  upHref?: string;
  /** The parent's name, so the tile can say where it goes. */
  upName?: string;
}) {
  if (!folders.length && !upHref) return null;
  return (
    <section aria-label={`Folders in ${scopeName}`}>
      <h3 className="mb-2 text-xs font-medium text-ink-3">Folders</h3>
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(12rem,1fr))]">
        {upHref && (
          <Link
            href={upHref}
            className="group flex cursor-pointer items-center gap-2 border border-dashed border-line bg-surface px-3 py-2 text-start text-sm text-ink-3 no-underline transition-[background-color,box-shadow] duration-160 ease-out hover:bg-accent/40 hover:text-ink hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <FolderUp className="size-4 shrink-0 transition-colors group-hover:text-brand" />
            <span className="min-w-0 flex-1 truncate font-medium">{upName ? `Up to ${upName}` : "Up one level"}</span>
          </Link>
        )}
        {folders.map((f) => (
          <Link
            key={f.path}
            href={`${base}/pages${rel(f.path)}`}
            className="group flex cursor-pointer items-center gap-2 border border-line bg-surface px-3 py-2 text-start text-sm no-underline transition-[background-color,box-shadow] duration-160 ease-out hover:bg-accent/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Folder className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-brand" />
            <span className="min-w-0 flex-1 truncate font-medium">{f.title}</span>
            {!!counts[f.path] && <span className="text-xs text-ink-3 tabular-nums">{counts[f.path]}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}

const ACTION = "inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-ink no-underline transition-colors duration-160 ease-out hover:text-brand focus-visible:underline focus-visible:outline-none";

export function PageCard({ page, href, compact, folderName, menu, rel, onCopyUrl }: {
  page: PageSummary;
  href: string;
  compact: boolean;
  folderName?: string;
  menu: React.ReactNode;
  rel: (p: string) => string;
  /** Copies the page's public address; the caller owns the clipboard and the toast. */
  onCopyUrl: () => void;
}) {
  const meta = [rel(page.path), compact ? null : ukDate(page.lastModified), folderName].filter(Boolean).join(" · ");
  return (
    <div className="group flex flex-col border border-line bg-surface transition-[box-shadow] duration-160 ease-out hover:shadow-sm">
      <Link href={href} aria-label={`Edit ${page.title}`} className="block w-full border-b border-line focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none">
        <PageThumb template={page.template} className="aspect-[16/10] w-full" />
      </Link>
      <div className={`flex flex-col ${compact ? "gap-0.5 p-2" : "gap-1 p-3"}`}>
        <div className="flex items-center gap-2">
          <Pill status={page.status} />
          <span className="-me-1.5 ms-auto">{menu}</span>
        </div>
        <Link href={href} title={page.title} className={`block w-full truncate text-start font-medium text-ink no-underline hover:underline ${compact ? "text-xs" : "text-sm"}`}>
          {page.title}
        </Link>
        <p className="truncate text-xs text-ink-3" title={meta}>{meta}</p>
        {/* Their three card actions. Compact drops the row, as theirs does. */}
        {!compact && (
          <div className="mt-1.5 flex items-center gap-4">
            <Link href={href} className={ACTION}><Pencil className="size-3.5" />Edit</Link>
            <Link href={`${href}?preview=1`} target="_blank" rel="noreferrer" className={ACTION}><ExternalLink className="size-3.5" />Preview</Link>
            <button type="button" className={ACTION} onClick={onCopyUrl}><LinkIcon className="size-3.5" />URL</button>
          </div>
        )}
      </div>
    </div>
  );
}
