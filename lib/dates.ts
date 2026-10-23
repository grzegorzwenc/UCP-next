/**
 * One way to write a date. The dashboard previously used three — a relative string in one card,
 * `23 Oct` in another and a raw ISO `2026-10-23` in a third — so the same information read
 * differently depending on where you looked.
 *
 * UK convention throughout: day before month, month as a short word, 24-hour clock. Recent times
 * stay relative because "20 min ago" answers "is this fresh?" faster than a timestamp does.
 */
const MIN = 60_000;

/**
 * `23 Oct 2026`. The year is always shown: dropping it for the current year saved three
 * characters and cost the reader the one thing they most often want to confirm, and the source
 * project's own formatters (`src/lib/data/content.ts`) always carry it.
 */
export function ukDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** `23 Oct 2026 14:05` — their `formatDateTime`, for a column or tooltip wanting the moment. */
export function ukDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).replace(",", "");
}

/** Relative while that is more useful than a date, then the UK date. */
export function ago(iso?: string, at: number = Date.now()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mins = Math.round((at - d.getTime()) / MIN);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  if (mins < 48 * 60) return "yesterday";
  return ukDate(iso);
}

/** A due date read as urgency: overdue, today, or the UK date. */
export function due(iso: string | undefined, overdueDays: number): string {
  if (overdueDays > 0) return `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`;
  if (overdueDays === 0) return "Due today";
  return iso ? `Due ${ukDate(iso)}` : "";
}
