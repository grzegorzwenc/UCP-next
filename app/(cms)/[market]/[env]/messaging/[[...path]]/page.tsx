import { market } from "@/lib/markets";
import { children, getPage, allPages, archiveOf, withoutArchived } from "@/lib/server/pages";
import { listTemplates, userName } from "@/lib/server/ucp";
import { ensureMessaging } from "@/lib/server/messaging";
import { MESSAGING_FOLDER } from "@/lib/blocks/registry";
import { Explorer } from "@/components/explorer/Explorer";

export const metadata = { title: "Messaging" };

/**
 * Messaging: the same explorer as Pages (folder tree, views, filters, actions), over <market>/messaging.
 * Messages open in the page builder and follow the page workflow; Create asks what kind of message to make.
 */
export default async function MessagingRoute({ params, searchParams }: PageProps<"/[market]/[env]/messaging/[[...path]]">) {
  const { market: mid, env: eid, path = [] } = await params;
  const sp = await searchParams; const mk = market(mid);
  await ensureMessaging(mk.root);
  const root = `${mk.root}/${MESSAGING_FOLDER}`; const folderPath = [root, ...path].join("/");
  const [folder, list, everything, templates] = await Promise.all([getPage(folderPath), children(folderPath), allPages(root, { archived: true }), listTemplates(mid)]);
  const archived = everything.filter((p) => archiveOf(p)).map((p) => ({ ...p, archive: archiveOf(p)! })); const all = withoutArchived(everything);
  const tree = all.filter((f) => f.isFolder).map((f) => ({ path: f.path, title: f.title }));
  const editorIds = [...new Set(all.filter((p) => !p.isFolder).map((p) => p.lastModifiedBy).filter((x): x is string => !!x))];
  const names = Object.fromEntries(await Promise.all(editorIds.map(async (id) => [id, await userName(id)] as const)));
  return <Explorer section="messaging" marketRoot={mk.root} marketId={mid} envId={eid} root={root} marketName={`${mk.name} › Messaging`} folder={folder && path.length ? { path: folder.path, title: folder.title } : { path: root, title: "Messaging" }} items={list.items.filter((p) => !archiveOf(p))} archived={archived} tree={tree} allPages={all.filter((p) => !p.isFolder)} names={names} templates={templates} openNew={sp.new === "1"} newTemplate={typeof sp.template === "string" ? sp.template : undefined} />;
}
