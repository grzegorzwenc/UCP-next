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
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] h-full min-h-0">
      <aside className="bg-surface border-r border-line p-3 grid content-start gap-2"><Skeleton className="h-3 w-[120px] mx-2 mb-1" />{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-6" />)}</aside>
      <div className="overflow-auto min-w-0">{body}</div>
    </div>
  );
}
