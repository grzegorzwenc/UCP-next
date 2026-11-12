import { Skeleton } from "@/components/ui/Skeleton";

/**
 * "Loading editor" — the page builder's own skeleton, and the one working-state look the
 * editor shell uses while it opens or closes.
 *
 * It replaces the generic `SectionSkeleton section="the page builder"`, which drew a title,
 * a filter bar and eight table rows: the Pages *library* shape, not the editor's. Every
 * placeholder landed in the wrong place and the whole screen jumped once the Builder mounted.
 *
 * This mirrors the shell by construction rather than by guessed heights — the same
 * `54px / 48px / 1fr` rows as the Builder grid, the two 52px icon rails, and the left
 * panel's 320px default (`leftW`, left open / right closed, which is how the editor starts).
 *
 * Keep it in step with Builder.tsx. The stepper row and the hint bar are both scheduled to
 * go in the de-clutter follow-ups, and this file is the only other place that assumes them.
 */

/** Ring spinner over the canvas. Fast (700ms) on purpose: a quicker spin reads as a quicker load. */
function Spinner() {
  return (
    <div
      className="size-8 animate-spin rounded-full border-2 border-brand/25 border-t-brand [animation-duration:700ms] motion-reduce:animate-pulse motion-reduce:border-t-brand/25"
      aria-hidden="true"
    />
  );
}

/**
 * Full-screen working state: spinner over a label. Used for the editor's own transitions
 * ("Saving changes…", "Closing editor") where the shell is already mounted, so it veils
 * instead of re-drawing the skeleton.
 */
export function EditorVeil({ label, detail }: { label: string; detail?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-bg transition-opacity duration-200 ease-out starting:opacity-0"
    >
      <Spinner />
      <p className="text-sm font-medium" aria-live="polite">{label}</p>
      {detail && <p className="text-xs text-ink-3">{detail}</p>}
    </div>
  );
}

/** Route-level fallback for the page builder. Mirrors the editor shell: toolbar, stepper, rails, canvas. */
export function EditorSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading editor"
      className="grid h-dvh grid-rows-[54px_48px_1fr] min-w-0 overflow-hidden"
    >
      {/* Toolbar: close + title left · device switch centre · status and actions right */}
      <div className="flex items-center gap-3 border-b border-line bg-surface px-2.5">
        <Skeleton className="size-8 shrink-0" />
        <div className="grid min-w-0 flex-1 gap-1.5">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[260px]" />
        </div>
        <Skeleton className="hidden h-8 w-[118px] shrink-0 lg:block" />
        <div className="flex flex-1 items-center justify-end gap-2.5">
          <Skeleton className="hidden h-6 w-[84px] shrink-0 sm:block" />
          <Skeleton className="h-8 w-[70px] shrink-0" />
          <Skeleton className="h-8 w-[88px] shrink-0" />
        </div>
      </div>

      {/* Flow stepper: the current step reads wider than the ones around it */}
      <div className="flex items-center gap-2 overflow-hidden border-b border-line bg-surface px-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <Skeleton className={`h-3 shrink-0 ${i === 0 ? "w-[96px]" : "hidden w-[64px] min-[1400px]:block"}`} />
            {i < 4 && <span className="h-0.5 min-w-1 flex-1 bg-line" />}
          </div>
        ))}
      </div>

      {/* Body: left rail · left panel · canvas · right rail */}
      <div className="flex min-h-0 bg-bg">
        <div className="flex w-[52px] shrink-0 flex-col items-center gap-1.5 border-r border-line bg-surface py-2">
          <Skeleton className="size-11" />
          <Skeleton className="size-11" />
        </div>
        <div className="hidden w-[320px] shrink-0 flex-col border-r border-line bg-surface md:flex">
          <div className="flex shrink-0 items-center gap-2 border-b border-line px-3.5 py-2.5">
            <Skeleton className="h-4 w-[124px]" />
            <Skeleton className="ml-auto size-7" />
          </div>
          <div className="shrink-0 border-b border-line p-3"><Skeleton className="h-8 w-full" /></div>
          <div className="grid content-start gap-1 p-2">
            {[72, 56, 64, 48, 68, 52, 60, 44].map((w, i) => (
              <div key={i} className="flex h-9 items-center gap-2 px-1.5">
                <Skeleton className="size-4 shrink-0" />
                <div className="min-w-0" style={{ width: `${w}%` }}><Skeleton className="h-3.5 w-full" /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas: the page sheet at its real width, with the spinner over it */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface-2 px-6 py-2">
            <Skeleton className="h-3 w-[280px]" />
            <Skeleton className="ml-auto h-5 w-[92px]" />
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden p-6">
            <div className="mx-auto h-full w-full max-w-[1200px] border border-line bg-surface shadow-md" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Spinner />
              <p className="text-sm font-medium">Loading editor</p>
              <p className="text-xs text-ink-3">Getting the page and its components ready</p>
            </div>
          </div>
        </div>

        <div className="flex w-[52px] shrink-0 flex-col items-center gap-1.5 border-l border-line bg-surface py-2">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="size-11" />)}
        </div>
      </div>

      <span className="sr-only">Loading editor…</span>
    </div>
  );
}
