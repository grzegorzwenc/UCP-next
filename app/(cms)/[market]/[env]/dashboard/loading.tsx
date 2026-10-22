import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/shadcn/card";

/**
 * The dashboard's own skeleton. The shared SectionSkeleton renders a table under `p-4 md:p-7`,
 * which no longer matches this screen (`p-4 pt-0`, a welcome heading and a card grid) — the
 * mismatch showed up as the content visibly jumping when the real page swapped in.
 *
 * Built from the same wrapper classes and the same Card shell as page.tsx, so the placeholder
 * occupies the same height by construction rather than by a guessed pixel value.
 */
export default function Loading() {
  return (
    <div className="p-4 pt-0 pb-14" role="status" aria-live="polite" aria-label="Loading the dashboard">
      {/* matches <header className="mb-3"> with a text-3xl h1 */}
      <header className="mb-3"><Skeleton className="h-9 w-[320px] max-w-full" /></header>
      {/* matches the "What do you want to do?" label */}
      <Skeleton className="h-5 w-[190px] mb-3" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} size="sm" className="h-full py-5">
            <CardContent className="flex h-full flex-col gap-4">
              <Skeleton className="size-10 shrink-0" />
              <div>
                <Skeleton className="h-6 w-[60%]" />
                <div className="mt-1 min-h-10 grid gap-1.5 content-start">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-[70%]" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4 mb-5">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[150px]" />)}
      </div>
      <span className="sr-only">Loading the dashboard…</span>
    </div>
  );
}
