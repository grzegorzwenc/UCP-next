import { market } from "@/lib/markets";
import { allPages } from "@/lib/server/pages";
import { listAssets, assetFolders, assetUsage } from "@/lib/server/ucp";
import { ASSET_FOLDERS } from "@/lib/ucp/seed";
import { AssetLibrary } from "@/components/assets/AssetLibrary";

/** Asset library: every file is a dam:Asset node under /content/dam/<market>/<folder>. */
export const metadata = { title: "Assets" };

export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/assets">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = market(mid);
  const folder = typeof sp.folder === "string" ? sp.folder : "";
  const view = sp.view === "unused" || sp.view === "noalt" ? sp.view : "";
  const pages = (await allPages(mk.root)).filter((p) => !p.isFolder);
  const [assets, storedFolders, usage] = await Promise.all([listAssets(mid), assetFolders(mid), assetUsage(mid, pages)]);
  // Folders: seed order first, then anything else that exists in the repository or on an asset.
  const folders = [...ASSET_FOLDERS]; for (const f of [...storedFolders, ...assets.map((a) => a.folder)]) if (!folders.includes(f)) folders.push(f);
  const usageSlim = Object.fromEntries(Object.entries(usage).map(([id, ps]) => [id, ps.map((p) => ({ path: p.path, title: p.title, status: p.status }))]));
  return <AssetLibrary marketId={mid} envId={eid} marketName={mk.name} flag={mk.flag} root={mk.root} assets={assets} folders={folders} usage={usageSlim} locales={mk.locales} folder={folder} view={view} />;
}
