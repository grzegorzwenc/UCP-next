import { notFound } from "next/navigation";
import { env } from "@/lib/markets";
import { getMarket } from "@/lib/server/markets";
import { getPage, backend } from "@/lib/server/pages";
import { listUsers, listModels, resolveBindings } from "@/lib/server/ucp";
import { bindingsOf } from "@/lib/ucp/tokens";
import { Builder } from "@/components/builder/Builder";
import { ClBuilder } from "@/components/builder/ClBuilder";
import { contentLibreConfig } from "@/lib/server/contentlibre";

export default async function PageBuilderRoute({ params }: PageProps<"/[market]/[env]/page/[...path]">) {
  const { market: mid, env: eid, path } = await params;
  const mk = (await getMarket(mid)), ev = env(eid);
  const pagePath = [mk.root, ...path].join("/");
  const page = await getPage(pagePath);
  if (!page) notFound();
  // ContentLIBRE renders its own components: the builder previews the server's render and edits through drafts.
  if (backend() === "contentlibre") {
    const parent = path.length > 1 ? `/${path.slice(0, -1).join("/")}` : "";
    return <ClBuilder path={pagePath} listUrl={`/${mid}/${eid}/pages${parent}`} marketId={mid} assetOrigin={contentLibreConfig().publicOrigin} />;
  }
  // Linked content resolves on the server too, so the first paint already shows real values instead of {{tokens}}.
  const [users, models, entities] = await Promise.all([listUsers(), listModels(), resolveBindings(bindingsOf(page.meta)).catch(() => ({}))]);
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const contentModels = models.filter((m) => m.group !== "Block types").map((m) => ({ id: m.id, name: m.displayName || m.name, fields: m.fields.filter((f) => !f.hidden).map((f) => ({ k: f.k, l: f.l })) }));
  return <Builder marketId={mid} envId={eid} marketName={mk.name} flag={mk.flag} domain={mk.domain} locale={mk.locales[0]} envName={ev.name} root={mk.root} page={page} names={names} models={contentModels} entities={entities} />;
}
