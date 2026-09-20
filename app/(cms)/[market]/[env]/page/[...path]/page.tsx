import { notFound } from "next/navigation";
import { market, env } from "@/lib/markets";
import { getPage } from "@/lib/server/pages";
import { Builder } from "@/components/builder/Builder";

export default async function PageBuilderRoute({ params }: PageProps<"/[market]/[env]/page/[...path]">) {
  const { market: mid, env: eid, path } = await params;
  const mk = market(mid), ev = env(eid);
  const page = await getPage([mk.root, ...path].join("/"));
  if (!page) notFound();
  return <Builder marketId={mid} envId={eid} marketName={mk.name} flag={mk.flag} domain={mk.domain} locale={mk.locales[0]} envName={ev.name} root={mk.root} page={page} />;
}
