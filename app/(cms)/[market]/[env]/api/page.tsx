import { market } from "@/lib/markets";
import { allPages } from "@/lib/server/pages";
import { listModels, pageDeliveryJson } from "@/lib/server/ucp";
import { modelSchema } from "@/lib/ucp/schema";
import { ApiExplorer, type ApiTab } from "@/components/api/ApiExplorer";

/** API & delivery: every saved page and model as JSON, with the real endpoint served under /api/delivery/v1 on this instance. */
export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/api">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = market(mid);
  const tab = (["pages", "models", "endpoints"].includes(String(sp.tab)) ? sp.tab : "pages") as ApiTab;
  const [pages, models] = await Promise.all([allPages(mk.root).then((l) => l.filter((p) => !p.isFolder)), listModels()]);
  const pgPath = typeof sp.page === "string" && sp.page.startsWith(mk.root) ? sp.page : pages[0]?.path; const pg = pages.find((p) => p.path === pgPath) ?? pages[0];
  const md = models.find((m) => m.id === sp.model) ?? models[0];
  const pageJson = tab === "pages" && pg ? await pageDeliveryJson(mid, pg.path, mk.domain) : undefined;
  return <ApiExplorer base={`/${mid}/${eid}`} marketId={mid} domain={mk.domain} marketRoot={mk.root} tab={tab}
    pages={pages.map((p) => ({ path: p.path, title: p.title, status: p.status }))} models={models.map((m) => ({ id: m.id, name: m.name, group: m.group, version: m.version, fields: m.fields.length }))}
    page={pg ? { path: pg.path, title: pg.title, status: pg.status } : undefined} pageJson={pageJson} modelId={md?.id} modelSchema={md ? modelSchema(md) : undefined} />;
}
