"use client";
import { ArrowDown, ArrowUp, CalendarRange, ChevronDown, ChevronsUpDown, ListFilter, X } from "lucide-react";
import { Badge } from "@/components/shadcn/badge";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/shadcn/dropdown-menu";

/**
 * Sorting and filtering for the Pages list, ported from hsbc-ucpmock's
 * `content/sort-header.svelte` and the filter bar in
 * `routes/(app)/experience-builder/page-builder/+page.svelte`.
 *
 * Their table runs on TanStack; this does the same work with plain state, since the whole list is
 * already client-side and a table library would be 15 KB for one screen.
 */
import { rangeActive, type Range, type Sort } from "@/lib/pages-filter";

export type { Range, Sort };

/** Column header that sorts. The glyph stays hidden until the column is sorted or hovered. */
export function SortHeader({ id, label, sort, onSort }: { id: string; label: string; sort: Sort; onSort: (s: Sort) => void }) {
  const on = sort.id === id;
  return (
    <button
      type="button"
      className="group/sort -ms-1 inline-flex h-8 cursor-pointer items-center gap-1 px-1 font-medium text-foreground transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      onClick={() => onSort({ id, desc: on ? !sort.desc : false })}
      aria-label={`Sort by ${label.toLowerCase()}`}
    >
      {label}
      {on
        ? sort.desc ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />
        : <ChevronsUpDown className="size-3.5 opacity-0 transition-opacity group-hover/sort:opacity-60" />}
    </button>
  );
}

const TRIGGER = "inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 border border-line-2 bg-surface px-3 text-sm transition-colors duration-160 ease-out hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** Multi-select column filter — their Status dropdown, with the count badge on the trigger. */
export function MultiFilter({ label, noun, options, value, onChange }: {
  label: string;
  noun: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (v: string, on: boolean) => onChange(on ? [...value, v] : value.filter((x) => x !== v));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className={TRIGGER}>
            <ListFilter className="size-4 text-ink-3" />
            {label}
            {value.length > 0 && <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1 tabular-nums">{value.length}</Badge>}
            <ChevronDown className="size-4 text-ink-3" />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel className="text-xs font-normal text-ink-3">Show {noun} that are</DropdownMenuLabel>
        {options.map((o) => (
          <DropdownMenuCheckboxItem key={o.value} checked={value.includes(o.value)} onCheckedChange={(on) => toggle(o.value, !!on)}>
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Updated-on range. Their version is a two-month calendar from `bits-ui` plus
 * `@internationalized/date`; this keeps the same `{ from, to }` shape and inclusive-day semantics
 * with two native date fields, rather than adding two dependencies for one filter.
 */
export function RangeFilter({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const field = "h-9 w-full border border-line-2 bg-surface px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className={TRIGGER}>
            <CalendarRange className="size-4 text-ink-3" />
            Updated
            {rangeActive(value) && <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1 tabular-nums">1</Badge>}
            <ChevronDown className="size-4 text-ink-3" />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-64 p-3">
        <div className="grid gap-2">
          <label className="grid gap-1 text-xs text-ink-3">From<input type="date" className={field} value={value.from ?? ""} onChange={(e) => onChange({ ...value, from: e.target.value || undefined })} /></label>
          <label className="grid gap-1 text-xs text-ink-3">To<input type="date" className={field} value={value.to ?? ""} onChange={(e) => onChange({ ...value, to: e.target.value || undefined })} /></label>
          {rangeActive(value) && <button type="button" className="btn btn-sm btn-ghost cursor-pointer justify-self-start" onClick={() => onChange({})}>Clear dates</button>}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const QUICK = "inline-flex h-7 cursor-pointer items-center gap-1.5 border px-2.5 text-xs transition-colors duration-160 ease-out hover:bg-accent/60 data-[on=true]:border-foreground data-[on=true]:bg-foreground data-[on=true]:text-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** Their language quick filter: one chip per value plus All, each carrying its count. */
export function QuickChips({ label, all, options, value, onChange }: {
  label: string;
  all: number;
  options: { value: string; label: string; count: number }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  if (options.length < 2) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-line px-4 py-2" role="group" aria-label={label}>
      <span className="me-1 text-xs text-ink-3">{label}</span>
      <button type="button" className={QUICK} data-on={value.length === 0} aria-pressed={value.length === 0} onClick={() => onChange([])}>
        All <span className="opacity-70 tabular-nums">{all}</span>
      </button>
      {options.map((o) => (
        <button key={o.value} type="button" className={QUICK} data-on={value.includes(o.value)} aria-pressed={value.includes(o.value)} onClick={() => onChange(value.includes(o.value) ? [] : [o.value])}>
          {o.label} <span className="opacity-70 tabular-nums">{o.count}</span>
        </button>
      ))}
    </div>
  );
}

const CHIP = "inline-flex items-center gap-1 border border-line-2 bg-muted/60 py-0.5 ps-2 pe-1 text-xs text-foreground";
const CHIP_X = "inline-flex size-4 cursor-pointer items-center justify-center text-ink-3 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** The row of active filters, with a count of what survived and one way to clear everything. */
export function FilterChips({ shown, total, noun, chips, onClear }: {
  shown: number;
  total: number;
  noun: string;
  chips: { key: string; label: string; remove: () => void }[];
  onClear: () => void;
}) {
  if (!chips.length) return null;
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-2">
      <span className="text-xs text-ink-3">{shown} of {total} {noun}</span>
      {chips.map((c) => (
        <span key={c.key} className={CHIP}>
          {c.label}
          <button type="button" className={CHIP_X} aria-label={`Remove ${c.label}`} onClick={c.remove}><X className="size-3" /></button>
        </span>
      ))}
      <button type="button" className="ms-1 cursor-pointer text-xs underline underline-offset-2 hover:text-brand" onClick={onClear}>Clear all</button>
    </div>
  );
}
