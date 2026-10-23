/**
 * "Recently viewed" for the command palette — a short list, persisted per browser.
 *
 * Ported from hsbc-ucpmock's `src/lib/search/recents.svelte.ts`, same key idiom and same cap, with
 * one change forced by our data: that project's entries are all static, so it stores ids and
 * resolves them back to titles when the palette opens. Our pages come from the API, so an id on
 * its own cannot be rendered — the label is stored alongside it.
 *
 * Only entries that resolve to a route are recorded. An AI prompt or a block insertion means
 * something only inside the builder it was invoked from, so replaying one from a palette opened
 * elsewhere would be nonsense.
 *
 * Module-scope functions rather than a hook: this is a per-viewer convenience, and writing to
 * storage from component code trips the React Compiler's immutability rule.
 */
const KEY = "ucp:search-recents";
const MAX = 6;

export type Recent = { id: string; label: string; hint?: string };

export function readRecents(): Recent[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list
      .filter((r): r is Recent => !!r && typeof r.id === "string" && typeof r.label === "string")
      .slice(0, MAX);
  } catch {
    return [];
  }
}

function write(list: Recent[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* in-memory only */ }
}

/** Most recent first, de-duplicated. Returns the new list so the caller can set state from it. */
export function pushRecent(entry: Recent): Recent[] {
  const list = [entry, ...readRecents().filter((x) => x.id !== entry.id)].slice(0, MAX);
  write(list);
  return list;
}

export function removeRecent(id: string): Recent[] {
  const list = readRecents().filter((x) => x.id !== id);
  write(list);
  return list;
}

export function clearRecents(): Recent[] {
  write([]);
  return [];
}
