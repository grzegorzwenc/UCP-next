import "server-only";
import { repo } from "@/lib/repo";
import { allSummaries, syncTree } from "@/lib/repo/adapters/mock";
import type { PageSummary, PageView } from "@/lib/repo";

export const backend = () => repo().kind;
export const getPage = (path: string): Promise<PageView | undefined> => repo().getPage(path);
export const children = (path: string) => repo().listChildren(path, { limit: 200 });
/** Archived pages and folders (restorable, unlike deleted ones): `ucp:archived` = { by, name, at, from } on jcr:content. */
export type ArchiveInfo = { by: string; name: string; at: string; from?: string };
export const archiveOf = (p: Pick<PageSummary, "meta">): ArchiveInfo | null => { const raw = p.meta?.["ucp:archived"]; if (typeof raw !== "string" || !raw) return null; try { return JSON.parse(raw) as ArchiveInfo; } catch { return null; } };
/** Drop archived items and everything inside archived folders. */
export const withoutArchived = (l: PageSummary[]) => { const gone = l.filter((p) => archiveOf(p)).map((p) => p.path); return gone.length ? l.filter((p) => !gone.some((a) => p.path === a || p.path.startsWith(`${a}/`))) : l; };
/** Whole-subtree listing for dashboard/search. Walks children lazily on real backends. Archived items are left out unless asked for. */
export async function allPages(root: string, opts: { archived?: boolean } = {}): Promise<PageSummary[]> {
  const r = repo(); let out: PageSummary[];
  if (r.kind === "mock") { await syncTree(); out = allSummaries(root); }
  else { out = []; const acc = out; const walk = async (p: string) => { const l = await r.listChildren(p, { limit: 200 }).catch(() => ({ items: [] as PageSummary[] })); for (const it of l.items) { acc.push(it); if (it.isFolder) await walk(it.path); } }; await walk(root); }
  return opts.archived ? out : withoutArchived(out);
}
