import { market } from "@/lib/markets";
import { allPages } from "@/lib/server/pages";
import { listModels, listTemplates, modelUsage } from "@/lib/server/ucp";
import { modelSchema, modelConfig } from "@/lib/ucp/schema";
import { Models, type ModelTab, type UsedPage } from "@/components/models/Models";

/** Content models: core models (editable, stored under /conf/hsbc/models) and block types (read-only, from the component registry). */
export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/models">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = market(mid);
  const [models, pages, templates] = await Promise.all([listModels(), allPages(mk.root), listTemplates()]);
  const selId = typeof sp.model === "string" ? sp.model : ""; const md = models.find((m) => m.id === selId) ?? models[0];
  const tab = (["fields", "diagram", "form", "config"].includes(String(sp.tab)) ? sp.tab : "fields") as ModelTab;
  const usage = await modelUsage(mid, pages);
  const used: UsedPage[] = (usage[md?.id] ?? []).map((p) => ({ path: p.path, title: p.title, status: p.status }));
  const tpls = md?.id.startsWith("block-") ? templates.filter((t) => t.blocks.includes(md.id.slice(6))).map((t) => ({ id: t.id, name: t.name })) : [];
  return <Models base={`/${mid}/${eid}`} marketName={mk.name} marketRoot={mk.root} locales={mk.locales} models={models} selectedId={md?.id ?? ""} tab={tab} used={used} templates={tpls}
    schema={md ? modelSchema(md) : {}} config={md ? modelConfig(md, mk.locales) : {}} />;
}
