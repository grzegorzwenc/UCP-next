import "server-only";
import type { RepoNode } from "../types";

/*
 * Shared state for the hosted demo. Cloudflare runs the Worker in several isolates, each with its own memory, so the in-memory
 * repository would differ from request to request (a comment is there, then it is not). The whole tree is therefore kept in
 * Workers KV: every change writes it back with a new version number, and before reading an isolate checks the number and
 * reloads the tree when another isolate changed it. Locally (next dev, no KV binding) nothing here runs.
 */
type KV = { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void> };
const TREE = "repo:v13:tree", VER = "repo:v13:ver"; // bump with the seed (v13: review-flow demo pages and people)
const s = globalThis as unknown as { __ucpShared?: { ver: number; checked: number } };
const st = () => (s.__ucpShared ??= { ver: 0, checked: 0 });

/*
 * The Worker runtime puts its context on the global under this symbol before handling a request,
 * and `getCloudflareContext()` reads it from there. Off Workers the symbol is absent and that call
 * falls through to wrangler's `getPlatformProxy()`, which boots a local miniflare + workerd to
 * emulate the binding and persists it to SQLite under `.wrangler/state`.
 *
 * Checking the symbol first keeps the promise the comment above makes — locally, nothing here
 * runs. There are no isolates in a single `next dev` process, so the in-memory tree is already
 * correct, and the emulator was pure overhead: it logged SQLITE_BUSY_RECOVERY on every request
 * whenever a previous dev server had left a hot WAL behind.
 */
const CF_CONTEXT = Symbol.for("__cloudflare-context__");

let kvCache: KV | null | undefined;
async function kv(): Promise<KV | null> {
  if (kvCache !== undefined) return kvCache;
  if (!(CF_CONTEXT in globalThis)) return (kvCache = null); // next dev / next start: no Worker, no KV
  try { const { getCloudflareContext } = await import("@opennextjs/cloudflare"); const env = (await getCloudflareContext({ async: true })).env as unknown as { UCP_STATE?: KV }; kvCache = env.UCP_STATE ?? null; }
  catch { kvCache = null; } // not on Cloudflare
  return kvCache;
}

/** Bring this isolate's tree up to date (checked at most every 300 ms). */
export async function syncIn(get: () => RepoNode | undefined, set: (t: RepoNode) => void): Promise<void> {
  const k = await kv(); if (!k) return; const now = Date.now(); const me = st();
  if (now - me.checked < 300 && get()) return; me.checked = now;
  const v = Number(await k.get(VER)) || 0;
  if (v > me.ver || !get()) { const raw = v ? await k.get(TREE) : null; if (raw) { set(JSON.parse(raw) as RepoNode); me.ver = v; } }
}

/** Store the tree after a change so every other isolate sees it. */
export async function syncOut(tree: RepoNode): Promise<void> {
  const k = await kv(); if (!k) return; const me = st();
  const v = Math.max(me.ver + 1, Date.now()); me.ver = v; me.checked = Date.now();
  await k.put(TREE, JSON.stringify(tree)); await k.put(VER, String(v));
}
