import { market } from "@/lib/markets";
import { children, getPage, allPages } from "@/lib/server/pages";
import { Explorer } from "@/components/explorer/Explorer";

export default async function PagesRoute({ params, searchParams }: PageProps<"/[market]/[env]/pages/[[...path]]">) {
  const { market: mid, env: eid, path = [] } = await params;
  const sp = await searchParams;
  const mk = market(mid);
  const folderPath = [mk.root, ...path].join("/");
  const [folder, list, all] = await Promise.all([getPage(folderPath), children(folderPath), allPages(mk.root)]);
  const tree = all.filter((f) => f.isFolder).map((f) => ({ path: f.path, title: f.title }));
  return <Explorer marketId={mid} envId={eid} root={mk.root} marketName={mk.name} flag={mk.flag} folder={folder ? { path: folder.path, title: folder.title } : { path: folderPath, title: mk.name }} items={list.items} tree={tree} allPages={all.filter((p) => !p.isFolder)} openNew={sp.new === "1"} />;
}
