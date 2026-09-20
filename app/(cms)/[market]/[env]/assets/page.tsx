import { market } from "@/lib/markets";
import { repo } from "@/lib/repo";
import { allPages } from "@/lib/server/pages";
import { listAssets, assetFolders, assetUsage } from "@/lib/server/ucp";
import { ASSET_FOLDERS } from "@/lib/ucp/seed";
import { AssetLibrary } from "@/components/assets/AssetLibrary";

/** Asset library: every file is a dam:Asset node under /content/dam/<market>/<folder>. */
export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/assets">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = market(mid);
  const folder = typeof sp.folder === "string" ? sp.folder : "";
  const view = sp.view === "unused" || sp.view === "noalt" ? sp.view : "";
  const pages = (await allPages(mk.root)).filter((p) => !p.isFolder);
  const [assets, storedFolders, usage] = await Promise.all([listAssets(mid), assetFolders(mid), assetUsage(mid, pages)]);
  // Folders: seed order first, then anything else that exists in the repository or on an asset.
  const folders = [...ASSET_FOLDERS]; for (const f of [...storedFolders, ...assets.map((a) => a.folder)]) if (!folders.includes(f)) folders.push(f);
  // Images placed on a page without alt text (an `image` prop that points at an asset, no `alt` prop).
  const noAlt: string[] = [];
  for (const p of pages) { const v = await repo().getPage(p.path).catch(() => undefined); for (const c of v?.components ?? []) { const img = c.props["image"]; if (typeof img === "string" && img && !c.props["alt"] && !noAlt.includes(img)) noAlt.push(img); } }
  const usageSlim = Object.fromEntries(Object.entries(usage).map(([id, ps]) => [id, ps.map((p) => ({ path: p.path, title: p.title, status: p.status }))]));
  return <AssetLibrary marketId={mid} envId={eid} marketName={mk.name} flag={mk.flag} root={mk.root} assets={assets} folders={folders} usage={usageSlim} noAlt={noAlt} folder={folder} view={view} />;
}
