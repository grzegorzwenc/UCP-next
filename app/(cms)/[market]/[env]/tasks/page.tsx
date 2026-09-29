import { market, MARKETS } from "@/lib/markets";
import { listTasks } from "@/lib/server/ucp";
import { Tasks } from "@/components/tasks/Tasks";

/** My tasks: the review / publishing queue across every market, derived from page workflow state in the repository. */
export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/tasks">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = market(mid);
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const tasks = (await Promise.all(MARKETS.map((m) => listTasks(m.id)))).flat();
  const sort = ["due", "name", "kind"].includes(s(sp.sort)) ? (s(sp.sort) as "due" | "name" | "kind") : "due";
  return <Tasks marketId={mid} envId={eid} root={mk.root} marketName={mk.name} tasks={tasks} q={s(sp.q)} kind={s(sp.kind)} sort={sort} />;
}
