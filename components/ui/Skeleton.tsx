/** Grey placeholder blocks shown while a section loads (route-level loading.tsx). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`bg-surface-3 animate-pulse rounded-md ${className}`} />;
}

/** Header bar (title + subtitle + action) followed by rows or tiles. */
export function SectionSkeleton({ section, rows = 8, tiles = false, sidebar = false }: { section: string; rows?: number; tiles?: boolean; sidebar?: boolean }) {
  const body = (
    <div className="p-4 md:p-7" role="status" aria-live="polite" aria-label={`Loading ${section}`}>
      <div className="flex items-end gap-4 mb-6"><div className="grid gap-2"><Skeleton className="h-7 w-[260px]" /><Skeleton className="h-3.5 w-[380px]" /></div><div className="ml-auto flex gap-2"><Skeleton className="h-9 w-[110px]" /><Skeleton className="h-9 w-[140px]" /></div></div>
      <div className="flex gap-2 mb-4"><Skeleton className="h-9 w-[280px]" /><Skeleton className="h-9 w-[120px]" /></div>
      {tiles
        ? <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-[150px]" />)}</div>
        : <div className="bg-surface border border-line">{Array.from({ length: rows }, (_, i) => <div key={i} className="flex items-center gap-4 p-3 border-b border-line last:border-0"><Skeleton className="h-4 w-4" /><Skeleton className="h-4 w-[30%]" /><Skeleton className="h-5 w-[70px] rounded-full" /><Skeleton className="h-4 w-[20%]" /><Skeleton className="h-4 w-[14%] ml-auto" /></div>)}</div>}
      <span className="sr-only">Loading {section}…</span>
    </div>
  );
  if (!sidebar) return body;
  return (
    /* mirrors the library shell: the page gutter, a gap, the 16rem SideTree card and a body card */
    <div className="grid h-[calc(100svh-4rem)] min-h-0 grid-cols-1 gap-4 overflow-hidden p-4 pt-0 lg:grid-cols-[16rem_minmax(0,1fr)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100svh-3rem)]">
      <aside className="flex max-h-96 min-h-0 flex-col overflow-hidden border border-line bg-surface lg:max-h-none">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-3">
          <Skeleton className="h-4 w-[64px]" /><Skeleton className="size-6" />
        </div>
        <div className="grid content-start gap-1 py-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex h-8 items-center gap-2 px-3">
              <Skeleton className="size-4 shrink-0" />
              <div className="min-w-0" style={{ width: `${68 - i * 6}%` }}><Skeleton className="h-3.5 w-full" /></div>
            </div>
          ))}
        </div>
      </aside>
      <div className="min-h-0 min-w-0 overflow-auto border border-line bg-surface">{body}</div>
    </div>
  );
}
