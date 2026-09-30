import { getMarkets } from "@/lib/server/markets";
import { listTasks, userName } from "@/lib/server/ucp";
import { allPages } from "@/lib/server/pages";
import { Tasks, type PublishedItem } from "@/components/tasks/Tasks";

/** My tasks: pages by stage of the review flow across every market, derived from page workflow state in the repository. */
export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/tasks">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams;
  const markets = await getMarkets();
  const tasks = (await Promise.all(markets.map((m) => listTasks(m.id)))).flat();
  /* Published: the most recent live pages (30), newest first */
  const live = (await Promise.all(markets.map((m) => allPages(m.root)))).flat().filter((p) => !p.isFolder && p.status === "published").sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? "")).slice(0, 30);
  const published: PublishedItem[] = await Promise.all(live.map(async (p) => ({ path: p.path, title: p.title, when: p.lastModified, whoId: p.lastModifiedBy, who: p.lastModifiedBy ? await userName(p.lastModifiedBy) : undefined })));
  return <Tasks marketId={mid} envId={eid} tasks={tasks} published={published} view={typeof sp.view === "string" ? sp.view : ""} />;
}
