import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The Pages screen's own skeleton. The shared `SectionSkeleton sidebar` variant mirrored the old
 * layout — a full-height 260px aside beside a `p-4 md:p-7` body — which no longer matches: the
 * screen is now two cards filling the viewport below the top bar. Built from the same wrapper classes as Explorer so
 * the placeholder occupies the same boxes by construction rather than by a guessed height, and
 * mirroring the list view, which is the default.
 */
export default function Loading() {
  return (
    <div className="flex h-[calc(100svh-4rem)] min-h-0 flex-col overflow-hidden p-4 pt-0 group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100svh-3rem)]" role="status" aria-live="polite" aria-label="Loading pages">
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]">
        <div className="flex max-h-96 min-h-0 flex-col overflow-hidden border border-line bg-surface lg:row-span-2 lg:max-h-none">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-3">
            <Skeleton className="h-4 w-[64px]" />
            <Skeleton className="size-6" />
          </div>
          <div className="grid content-start gap-1 py-1">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="flex h-8 items-center gap-2 px-3">
                <Skeleton className="size-4 shrink-0" />
                <div className="min-w-0" style={{ width: `${68 - i * 6}%` }}><Skeleton className="h-3.5 w-full" /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 items-center justify-end"><Skeleton className="h-9 w-[118px]" /></div>

        <div className="flex min-h-0 flex-col overflow-hidden border border-line bg-surface">
          <div className="flex shrink-0 items-center gap-4 border-b border-line px-4 py-3">
            <div className="grid min-w-28 flex-1 gap-1.5"><Skeleton className="h-5 w-[180px]" /><Skeleton className="h-3 w-[230px]" /></div>
            <Skeleton className="h-9 w-48 xl:w-60" />
            <Skeleton className="h-9 w-[108px] shrink-0" />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="flex h-11 items-center gap-4 border-b border-line-2 bg-surface-2 px-4">
              <Skeleton className="size-[18px] shrink-0" /><Skeleton className="h-3 w-[20%]" /><Skeleton className="h-3 w-[70px]" />
            </div>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-2">
                <Skeleton className="size-[18px] shrink-0" />
                <div className="grid min-w-0 flex-1 gap-1"><div style={{ width: `${40 - (i % 3) * 7}%` }}><Skeleton className="h-4 w-full" /></div><Skeleton className="h-3 w-[24%]" /></div>
                <Skeleton className="h-5 w-[86px] shrink-0" />
                <Skeleton className="hidden h-3.5 w-[92px] shrink-0 xl:block" />
                <Skeleton className="hidden h-3.5 w-[72px] shrink-0 md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Loading pages…</span>
    </div>
  );
}
