import { env, market } from "@/lib/markets";
import { allPages } from "@/lib/server/pages";
import { listUsers, readLog } from "@/lib/server/ucp";
import { Users } from "@/components/users/Users";

/** Users & permissions: users live at /home/users/<id>, per-folder grants as JSON in ucp:perms. */
export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/users">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = market(mid); const ev = env(eid);
  const [users, log, pages] = await Promise.all([listUsers(), readLog(mid, 300), allPages(mk.root)]);
  const folders = pages.filter((p) => p.isFolder && p.path.startsWith(mk.root + "/") && !p.path.slice(mk.root.length + 1).includes("/")).map((p) => ({ key: p.path.split("/").pop()!, title: p.title, path: p.path }));
  const pageTitles: Record<string, string> = {}; pages.forEach((p) => { pageTitles[p.path] = p.title; });
  const selected = typeof sp.user === "string" ? sp.user : "";
  return <Users users={users} folders={folders} log={log} pageTitles={pageTitles} base={`/${mid}/${eid}`} root={mk.root} marketName={mk.name} marketFlag={mk.flag} envName={ev.name} selectedId={selected} />;
}
