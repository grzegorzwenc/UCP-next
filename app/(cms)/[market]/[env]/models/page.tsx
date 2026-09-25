import { market } from "@/lib/markets";
import { allPages } from "@/lib/server/pages";
import { listModels, listModelVersions, listTemplates, listUsers, me, modelUsage } from "@/lib/server/ucp";
import { modelSchema, modelConfig } from "@/lib/ucp/schema";
import { Models } from "@/components/models/Models";
import { TABS, type ModelTab, type UsedPage } from "@/components/models/fieldMeta";

/**
 * Content models: core models (editable drafts with a published schema, stored under /conf/hsbc/models) and block types
 * (read-only, from the component registry). No ?model= → overview list; ?model=<id>&tab=… → editor.
 */
export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/models">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = market(mid);
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const [models, pages, templates, users, viewer] = await Promise.all([listModels(), allPages(mk.root), listTemplates(), listUsers(), me()]);
  const md = models.find((m) => m.id === s(sp.model));
  const tab = (TABS as string[]).includes(s(sp.tab)) ? (s(sp.tab) as ModelTab) : "fields";
  const [usageRaw, versions] = await Promise.all([modelUsage(mid, pages), md && !md.locked ? listModelVersions(md.id) : Promise.resolve([])]);
  const usage: Record<string, UsedPage[]> = Object.fromEntries(Object.entries(usageRaw).map(([k, v]) => [k, v.map((p) => ({ path: p.path, title: p.title, status: p.status }))]));
  const templatesByModel: Record<string, { id: string; name: string }[]> = {};
  for (const m of models) if (m.id.startsWith("block-")) { const t = templates.filter((x) => x.blocks.includes(m.id.slice(6))).map((x) => ({ id: x.id, name: x.name })); if (t.length) templatesByModel[m.id] = t; }
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  return <Models base={`/${mid}/${eid}`} marketId={mid} marketName={mk.name} marketRoot={mk.root} locales={mk.locales} models={models} selectedId={md?.id ?? ""} tab={tab} group={s(sp.group)} usage={usage} templatesByModel={templatesByModel} names={names} versions={versions} viewerId={viewer.id}
    schema={md ? modelSchema(md) : {}} config={md ? modelConfig(md, mk.locales) : {}} />;
}
