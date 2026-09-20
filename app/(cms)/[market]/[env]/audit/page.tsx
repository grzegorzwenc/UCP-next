import { env, market } from "@/lib/markets";
import { allPages } from "@/lib/server/pages";
import { listUsers, readLog } from "@/lib/server/ucp";
import { AuditLog } from "@/components/audit/AuditLog";

/** Audit log: append-only events under /var/audit/ucp/<market>. Filtering happens client-side. */
export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/audit">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = market(mid); const ev = env(eid);
  const [log, users, pages] = await Promise.all([readLog(mid, 1000), listUsers(), allPages(mk.root)]);
  const names: Record<string, string> = { system: "System" }; users.forEach((u) => { names[u.id] = u.name; });
  const pageTitles: Record<string, string> = {}; pages.forEach((p) => { pageTitles[p.path] = p.title; });
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  return <AuditLog log={log} names={names} pageTitles={pageTitles} base={`/${mid}/${eid}`} root={mk.root} marketName={mk.name} envName={ev.name} initial={{ type: s("type"), q: s("q"), who: s("who"), period: s("period") }} />;
}
