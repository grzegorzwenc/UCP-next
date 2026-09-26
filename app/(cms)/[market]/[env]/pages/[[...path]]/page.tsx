import { getMarket } from "@/lib/server/markets";
import { children, getPage, allPages } from "@/lib/server/pages";
import { listTemplates } from "@/lib/server/ucp";
import { Explorer } from "@/components/explorer/Explorer";

export default async function PagesRoute({ params, searchParams }: PageProps<"/[market]/[env]/pages/[[...path]]">) {
  const { market: mid, env: eid, path = [] } = await params;
  const sp = await searchParams;
  const mk = (await getMarket(mid));
  const folderPath = [mk.root, ...path].join("/");
  const [folder, list, all, templates] = await Promise.all([getPage(folderPath), children(folderPath), allPages(mk.root), listTemplates()]);
  const tree = all.filter((f) => f.isFolder || f.hasChildren).map((f) => ({ path: f.path, title: f.title }));
  return <Explorer marketId={mid} envId={eid} root={mk.root} marketName={mk.name} flag={mk.flag} folder={folder ? { path: folder.path, title: folder.title } : { path: folderPath, title: mk.name }} items={list.items} tree={tree} allPages={all.filter((p) => !p.isFolder)} templates={templates} openNew={sp.new === "1"} newTemplate={typeof sp.template === "string" ? sp.template : undefined} />;
}
