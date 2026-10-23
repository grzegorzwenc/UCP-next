import { redirect } from "next/navigation";
import { market } from "@/lib/markets";
import { allPages } from "@/lib/server/pages";
import { listEntities, listModelFolders, listModels, listModelVersions, listTemplates, listUsers, me, modelUsage } from "@/lib/server/ucp";
import { modelSchema, modelConfig } from "@/lib/ucp/schema";
import { Models } from "@/components/models/Models";
import { TABS, type ModelTab, type UsedPage } from "@/components/models/fieldMeta";

/**
 * Content models (structure only), laid out like Pages: tree on the left, detail on the right.
 *   (none) → overview · ?group=<name> → category · ?model=<id> → model detail (a stray &tab= still lands here)
 *   ?model=<id>&edit=1&tab=… → model editor
 * Entities have their own section; old `?model=<id>&entity=<entityId>` links redirect there.
 */
export const metadata = { title: "Content models" };

export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/models">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = market(mid);
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  if (s(sp.entity)) redirect(`/${mid}/${eid}/entities?model=${encodeURIComponent(s(sp.model))}&entity=${encodeURIComponent(s(sp.entity))}`);
  const [models, pages, templates, users, viewer, entities, folders] = await Promise.all([listModels(), allPages(mk.root), listTemplates(), listUsers(), me(), listEntities(mid).catch(() => []), listModelFolders()]);
  const md = models.find((m) => m.id === s(sp.model));
  const tab = (TABS as string[]).includes(s(sp.tab)) ? (s(sp.tab) as ModelTab) : "fields";
  const edit = !!md && s(sp.edit) === "1";
  const [usageRaw, versions] = await Promise.all([modelUsage(mid, pages), md && edit && !md.locked ? listModelVersions(md.id) : Promise.resolve([])]);
  const slim = (r: Record<string, { path: string; title: string; status: string }[]>): Record<string, UsedPage[]> => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.map((p) => ({ path: p.path, title: p.title, status: p.status }))]));
  const templatesByModel: Record<string, { id: string; name: string }[]> = {};
  for (const m of models) if (m.id.startsWith("block-")) { const t = templates.filter((x) => x.blocks.includes(m.id.slice(6))).map((x) => ({ id: x.id, name: x.name })); if (t.length) templatesByModel[m.id] = t; }
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const entityCounts: Record<string, number> = {}; for (const e of entities) entityCounts[e.model] = (entityCounts[e.model] ?? 0) + 1;
  return <Models folders={folders} flag={mk.flag} base={`/${mid}/${eid}`} marketId={mid} marketName={mk.name} marketRoot={mk.root} locales={mk.locales} models={models} selectedId={md?.id ?? ""} tab={tab} edit={edit} group={s(sp.group)} usage={slim(usageRaw)} entityCounts={entityCounts} templatesByModel={templatesByModel} names={names} versions={versions} viewerId={viewer.id}
    schema={md && edit ? modelSchema(md) : {}} config={md && edit ? modelConfig(md, mk.locales) : {}} />;
}
