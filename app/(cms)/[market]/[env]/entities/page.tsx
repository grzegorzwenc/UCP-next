import { getMarket } from "@/lib/server/markets";
import { allPages } from "@/lib/server/pages";
import { entityUsage, listEntities, listEntityFolders, listModels, listUsers, me } from "@/lib/server/ucp";
import { Entities } from "@/components/entities/Entities";
import type { UsedPage } from "@/components/models/fieldMeta";

/**
 * Content entities: concrete content built from a content model, laid out like Pages (tree left, detail right).
 *   (none) → all entities · ?model=<id> → entities of one model · ?model=<id>&entity=<entityId> → entity editor
 */
export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/entities">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = (await getMarket(mid));
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const [all, pages, users, viewer, ents, folders] = await Promise.all([listModels(), allPages(mk.root), listUsers(), me(), listEntities(mid).catch(() => []), listEntityFolders(mid).catch(() => ({}))]);
  const models = all.filter((m) => !m.locked && !m.id.startsWith("block-"));
  const known = new Set(models.map((m) => m.id)); const entities = ents.filter((e) => known.has(e.model));
  const usageRaw = await entityUsage(mid, pages);
  const usage: Record<string, UsedPage[]> = Object.fromEntries(Object.entries(usageRaw).map(([k, v]) => [k, v.map((p) => ({ path: p.path, title: p.title, status: p.status }))]));
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const model = known.has(s(sp.model)) ? s(sp.model) : "";
  return <Entities base={`/${mid}/${eid}`} marketId={mid} marketRoot={mk.root} marketName={mk.name} flag={mk.flag} models={models} entities={entities} usage={usage} names={names} viewerId={viewer.id} modelId={model} entityId={model ? s(sp.entity) : ""} folders={folders} folder={model ? s(sp.folder) : ""} />;
}
