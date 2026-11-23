import { market } from "@/lib/markets";
import { children, getPage, allPages, archiveOf, withoutArchived } from "@/lib/server/pages";
import { listTemplates, userName } from "@/lib/server/ucp";
import { ensureForms } from "@/lib/server/forms";
import { FORMS_FOLDER, isAppTree } from "@/lib/blocks/registry";
import { Explorer } from "@/components/explorer/Explorer";

export const metadata = { title: "Forms" };

/**
 * Forms: the same explorer as Pages over <market>/forms, whose folders mirror the site because every form is
 * built for the page that hosts it. Forms open in the page builder, on their host page, and follow the page workflow.
 */
export default async function FormsRoute({ params, searchParams }: PageProps<"/[market]/[env]/forms/[[...path]]">) {
  const { market: mid, env: eid, path = [] } = await params;
  const sp = await searchParams; const mk = market(mid);
  await ensureForms(mk.root);
  const root = `${mk.root}/${FORMS_FOLDER}`; const folderPath = [root, ...path].join("/");
  const [folder, list, everything, templates, site] = await Promise.all([getPage(folderPath), children(folderPath), allPages(root, { archived: true }), listTemplates(mid), allPages(mk.root)]);
  const archived = everything.filter((p) => archiveOf(p)).map((p) => ({ ...p, archive: archiveOf(p)! })); const all = withoutArchived(everything);
  const tree = all.filter((f) => f.isFolder).map((f) => ({ path: f.path, title: f.title }));
  const editorIds = [...new Set(all.filter((p) => !p.isFolder).map((p) => p.lastModifiedBy).filter((x): x is string => !!x))];
  const names = Object.fromEntries(await Promise.all(editorIds.map(async (id) => [id, await userName(id)] as const)));
  const hostPages = site.filter((p) => !isAppTree(p.path, mk.root)).map((p) => ({ path: p.path, title: p.title, rel: p.path.replace(mk.root, "") || "/", folder: p.isFolder }));
  /* one tree for the market: page folders (P), then Messaging (M) and Forms (F) */
  const marketFolders = (await allPages(mk.root)).filter((f) => f.isFolder).map((f) => ({ path: f.path, title: f.title }));
  return <Explorer market={{ root: mk.root, name: mk.name, folders: marketFolders }} section="forms" hostPages={hostPages} marketRoot={mk.root} marketId={mid} envId={eid} root={root} marketName={`${mk.name} › Forms`} folder={folder && path.length ? { path: folder.path, title: folder.title } : { path: root, title: "Forms" }} items={list.items.filter((p) => !archiveOf(p))} archived={archived} tree={tree} allPages={all.filter((p) => !p.isFolder)} names={names} templates={templates} openNew={sp.new === "1"} newTemplate={typeof sp.template === "string" ? sp.template : undefined} />;
}
