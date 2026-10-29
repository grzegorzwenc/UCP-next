"use client";

/**
 * Left tree panel of the library screens — assets, models, templates, entities.
 *
 * This *is* the card, with the same classes as the Pages folder panel
 * (`components/explorer/Explorer.tsx`): a bordered box whose header band carries the label and the
 * section's one action, the tree scrolling inside, capped below `lg` and full height above it. It
 * sits as a grid cell, so the page shell owns the gap and the padding around it — which is what
 * makes it read as a separate box rather than a column welded to the app sidebar.
 */
export function SideTree({ label, action, className = "", children }: {
  label: string;
  /** The section's primary tree action — New folder and the like — shown in the header band. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <aside className={`flex max-h-96 min-h-0 flex-col overflow-hidden border border-line bg-surface lg:max-h-none ${className}`} role="navigation" aria-label={label}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-3">
        <h2 className="text-sm font-medium text-ink-2">{label}</h2>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">{children}</div>
    </aside>
  );
}
