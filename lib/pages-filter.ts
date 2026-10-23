/**
 * The sorting and date-range logic behind the Pages list, kept out of the component so it can be
 * checked on its own. Ported from hsbc-ucpmock's `components/filters/date-range.ts` and the
 * TanStack sorting its table configures.
 */
export type Sort = { id: string; desc: boolean };

/** `YYYY-MM-DD` bounds, both inclusive; either may be missing. */
export type Range = { from?: string; to?: string };

export const rangeActive = (r: Range) => !!(r.from || r.to);

/**
 * Inclusive calendar-day test on an ISO timestamp's date part, as their `inRange` does — compared
 * as strings, which is exact for ISO dates and avoids a timezone shifting a row out of its day.
 */
export function inRange(iso: string | undefined, r: Range): boolean {
  if (!r.from && !r.to) return true;
  if (!iso) return false;
  const day = iso.slice(0, 10);
  return (!r.from || day >= r.from) && (!r.to || day <= r.to);
}

/**
 * Sorts by one key, folders always above pages so the hierarchy still reads top-down whichever
 * column is sorted. Stable: equal keys keep their incoming order.
 */
export function sortRows<T>(rows: T[], isFolder: (r: T) => boolean, key: (r: T) => string, desc: boolean): T[] {
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => {
      if (isFolder(a.row) !== isFolder(b.row)) return isFolder(a.row) ? -1 : 1;
      const x = key(a.row), y = key(b.row);
      if (x === y) return a.i - b.i;
      return (x < y ? -1 : 1) * (desc ? -1 : 1);
    })
    .map((w) => w.row);
}
