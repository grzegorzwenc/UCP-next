/**
 * Which workspace cards a person has hidden, and the order they sit in, per row.
 *
 * Held in a cookie rather than localStorage so the server can render the saved layout on the
 * first paint. localStorage is only readable after hydration, which would mean painting the
 * default layout and then rearranging it in front of the user — the same jitter we removed from
 * the font loading and the dashboard skeleton.
 *
 * No "use client": both the page (server) and the Workspace component (client) import this.
 */
export const LAYOUT_COOKIE = "ucp_dash";

export type RowLayout = {
  /** Every card in the row, in display order — hidden ones included. */
  order: string[];
  hidden: string[];
};

export type Layout = Record<string, RowLayout>;

/** `charts=status,-activity;lists=tasks,recent,log` — a `-` prefix marks a card as hidden. */
export function encodeLayout(layout: Layout): string {
  return Object.entries(layout)
    .map(([row, r]) => `${row}=${r.order.map((id) => (r.hidden.includes(id) ? `-${id}` : id)).join(",")}`)
    .join(";");
}

/**
 * Parses a cookie value back into a layout, discarding anything malformed. Ids are restricted to
 * word characters so the `-` hidden marker can never be part of one, and so a tampered cookie
 * cannot put arbitrary strings into the component's keys.
 */
export function decodeLayout(raw?: string): Layout {
  const out: Layout = {};
  if (!raw) return out;
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    return out;
  }
  for (const part of text.split(";")) {
    const [row, list] = part.split("=");
    if (!row || !list || !/^\w+$/.test(row)) continue;
    const order: string[] = [];
    const hidden: string[] = [];
    for (const token of list.split(",")) {
      const isHidden = token.startsWith("-");
      const id = isHidden ? token.slice(1) : token;
      if (!/^\w+$/.test(id) || order.includes(id)) continue;
      order.push(id);
      if (isHidden) hidden.push(id);
    }
    if (order.length) out[row] = { order, hidden };
  }
  return out;
}

/**
 * Writes the layout back for the next server render. Module scope rather than a closure inside
 * the component: writing to `document.cookie` from component code trips the React Compiler's
 * immutability rule, since it cannot tell a handler from render.
 */
export function writeLayout(layout: Layout): void {
  try {
    document.cookie = `${LAYOUT_COOKIE}=${encodeURIComponent(encodeLayout(layout))}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } catch { /* cookies unavailable */ }
}

/**
 * Reconciles a saved row against the cards that actually exist now: unknown ids are dropped and
 * new ones appended, so adding a card to the dashboard later makes it appear for everyone instead
 * of being silently absent. `min` is the row's floor — the charts row has to keep one card, so a
 * cookie claiming otherwise gets cards shown again rather than rendering an empty row.
 */
export function reconcileRow(ids: string[], saved: RowLayout | undefined, min: number): RowLayout {
  const known = new Set(ids);
  const order = (saved?.order ?? []).filter((id) => known.has(id));
  for (const id of ids) if (!order.includes(id)) order.push(id);
  const hidden = (saved?.hidden ?? []).filter((id) => known.has(id));
  while (hidden.length && order.length - hidden.length < min) hidden.pop();
  return { order, hidden };
}
