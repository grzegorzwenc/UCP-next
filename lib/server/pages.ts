import "server-only";
import { repo } from "@/lib/repo";
import { allSummaries } from "@/lib/repo/adapters/mock";
import type { PageSummary, PageView } from "@/lib/repo";

export const backend = () => repo().kind;
export const getPage = (path: string): Promise<PageView | undefined> => repo().getPage(path);
export const children = (path: string) => repo().listChildren(path, { limit: 200 });
/** Whole-subtree listing for dashboard/search. Walks children lazily on real backends. */
export async function allPages(root: string): Promise<PageSummary[]> {
  const r = repo();
  if (r.kind === "mock") return allSummaries(root);
  const out: PageSummary[] = [];
  const walk = async (p: string) => { const l = await r.listChildren(p, { limit: 200 }).catch(() => ({ items: [] as PageSummary[] })); for (const it of l.items) { out.push(it); if (it.isFolder) await walk(it.path); } };
  await walk(root); return out;
}
