"use client";
import { FolderPlus } from "lucide-react";

/**
 * The folder-panel header action, ported from hsbc-ucpmock's `tree/new-folder-button.svelte`:
 * a folder-plus icon at rest whose label slides out on hover and focus, so the action names itself
 * without spending a header's worth of width on a label that is usually not needed.
 *
 * Shared by the Pages folder panel and the library screens' `SideTree`, so the two cannot drift.
 */
export function NewFolderButton({ onClick, label = "New folder" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      className="group/new -my-1 ms-auto inline-flex h-8 cursor-pointer items-center gap-0 rounded-md px-1.5 text-ink-3 transition-[background-color,box-shadow,color] duration-160 ease-out hover:bg-background hover:text-foreground hover:shadow-xs hover:ring-1 hover:ring-border focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={label}
      onClick={onClick}
    >
      <FolderPlus className="size-4 shrink-0" />
      <span className="max-w-0 overflow-hidden text-xs font-medium whitespace-nowrap opacity-0 transition-[max-width,opacity,margin] duration-200 ease-out group-hover/new:ms-1.5 group-hover/new:max-w-24 group-hover/new:opacity-100 group-focus-visible/new:ms-1.5 group-focus-visible/new:max-w-24 group-focus-visible/new:opacity-100 motion-reduce:transition-none">
        {label}
      </span>
    </button>
  );
}
