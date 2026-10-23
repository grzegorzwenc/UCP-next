"use client";
import { ChevronDown, Folder, Layers } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/shadcn/dropdown-menu";

export type FolderOption = { path: string; name: string; depth: number };

/**
 * Where a new page or folder goes. Ported from hsbc-ucpmock's
 * `src/lib/components/pages/create-page-dialog.svelte`: a full-width outline trigger showing the
 * chosen folder with its icon, opening a radio list whose rows indent by depth so the hierarchy
 * is visible. It replaces a native `<select>` that showed raw paths and flattened the tree into
 * indistinguishable lines.
 */
export function LocationSelect({ value, onChange, options, rootPath, label }: {
  value: string;
  onChange: (path: string) => void;
  options: FolderOption[];
  rootPath: string;
  label?: string;
}) {
  const current = options.find((o) => o.path === value);
  const Icon = value === rootPath ? Layers : Folder;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className="flex h-9 w-full cursor-pointer items-center justify-between gap-2 border border-line-2 bg-surface px-3 text-sm font-normal transition-colors duration-160 ease-out hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="inline-flex min-w-0 items-center gap-2">
              <Icon className="size-4 shrink-0 text-ink-3" />
              <span className="truncate">{current?.name ?? value}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-ink-3" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="max-h-64 w-(--anchor-width) overflow-y-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.path} value={o.path} style={{ paddingInlineStart: `${2 + o.depth * 0.875}rem` }}>
              {o.path === rootPath ? <Layers className="size-4 text-ink-3" /> : <Folder className="size-4 text-ink-3" />}
              {o.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
