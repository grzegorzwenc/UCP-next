import Link from "next/link";

/**
 * A panel of uniform rows: a title line, a quieter meta line under it, and an optional trailing
 * badge. Ported from hsbc-ucpmock, where the three bottom cards on home all share one row shape —
 * which is what makes them read as a set.
 *
 * Before this, the dashboard's three list panels each had their own: one led with a pill, one with
 * a 26px avatar, one carried an extra monospaced path column, and they showed 5, 6 and an
 * unbounded number of rows. Same information, three different shapes and three different heights.
 */
export type ListRow = {
  /** Stable key and, when set, the row's destination. */
  id: string;
  href?: string;
  title: React.ReactNode;
  /** The quiet second line — who, where, or when. */
  meta?: React.ReactNode;
  /** A badge or timestamp pinned right. */
  trailing?: React.ReactNode;
};

export function ListCard({
  title, action, rows, empty, max = 5,
}: {
  title: string;
  action?: { label: string; href: string };
  rows: ListRow[];
  empty: string;
  max?: number;
}) {
  const shown = rows.slice(0, max);
  return (
    <div className="bg-surface border border-line min-w-0 h-full flex flex-col">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3 shrink-0">
        <h3 className="min-w-0 truncate text-sm font-medium text-ink-2">{title}</h3>
        {action && <Link href={action.href} className="ms-auto shrink-0 text-xs font-medium text-info hover:underline">{action.label}</Link>}
      </div>
      <div className="flex-1 min-h-0">
        {shown.length === 0
          ? <p className="px-4 py-3 text-sm text-ink-3">{empty}</p>
          : <ul>
              {shown.map((r) => {
                const body = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.title}</span>
                      {r.meta && <span className="block truncate text-xs text-ink-3">{r.meta}</span>}
                    </span>
                    {r.trailing && <span className="shrink-0 text-xs text-ink-3">{r.trailing}</span>}
                  </>
                );
                const row = "flex items-center gap-3 px-4 py-2.5 border-b border-line last:border-0 transition-colors duration-160 ease-out";
                return (
                  <li key={r.id}>
                    {r.href
                      ? <Link href={r.href} className={`${row} no-underline hover:bg-muted/40`}>{body}</Link>
                      : <div className={row}>{body}</div>}
                  </li>
                );
              })}
            </ul>}
      </div>
    </div>
  );
}
