import { notFound } from "next/navigation";
import { market, env } from "@/lib/markets";
import { getPage } from "@/lib/server/pages";
import { listUsers, listModels, resolveBindings } from "@/lib/server/ucp";
import { bindingsOf } from "@/lib/ucp/tokens";
import { Builder } from "@/components/builder/Builder";

export default async function PageBuilderRoute({ params }: PageProps<"/[market]/[env]/page/[...path]">) {
  const { market: mid, env: eid, path } = await params;
  const mk = market(mid), ev = env(eid);
  const page = await getPage([mk.root, ...path].join("/"));
  if (!page) notFound();
  // Linked content resolves on the server too, so the first paint already shows real values instead of {{tokens}}.
  const [users, models, entities] = await Promise.all([listUsers(), listModels(), resolveBindings(bindingsOf(page.meta)).catch(() => ({}))]);
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const contentModels = models.filter((m) => m.group !== "Block types").map((m) => ({ id: m.id, name: m.displayName || m.name, fields: m.fields.filter((f) => !f.hidden).map((f) => ({ k: f.k, l: f.l })) }));
  return <Builder marketId={mid} envId={eid} marketName={mk.name} flag={mk.flag} domain={mk.domain} locale={mk.locales[0]} envName={ev.name} root={mk.root} page={page} names={names} models={contentModels} entities={entities} />;
}
