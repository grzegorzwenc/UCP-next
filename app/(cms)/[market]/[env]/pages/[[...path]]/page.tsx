import { market } from "@/lib/markets";
import { children, getPage, allPages, isFolder } from "@/lib/server/pages";
import { Explorer } from "@/components/explorer/Explorer";

export default async function PagesRoute({ params, searchParams }: PageProps<"/[market]/[env]/pages/[[...path]]">) {
  const { market: mid, env: eid, path = [] } = await params;
  const sp = await searchParams;
  const mk = market(mid);
  const folderPath = [mk.root, ...path].join("/");
  const [folder, list, all] = await Promise.all([getPage(folderPath), children(folderPath), allPages(mk.root)]);
  const tree = all.filter(isFolder).map((f) => ({ path: f.path, title: f.title ?? f.name }));
  return <Explorer marketId={mid} envId={eid} root={mk.root} marketName={mk.name} flag={mk.flag} folder={folder ?? { path: folderPath, name: mk.name, title: mk.name }} items={list.items} tree={tree} allPages={all.filter((p) => !isFolder(p))} openNew={sp.new === "1"} />;
}
