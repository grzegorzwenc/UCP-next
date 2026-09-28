import { getMarket } from "@/lib/server/markets";
import { allPages } from "@/lib/server/pages";
import { listModels, pageDeliveryJson } from "@/lib/server/ucp";
import { modelSchema } from "@/lib/ucp/schema";
import { ApiExplorer, type ApiTab } from "@/components/api/ApiExplorer";
import { repo } from "@/lib/repo";
import { BackendTool } from "@/components/shell/BackendTool";
import { contentLibreConfig } from "@/lib/server/contentlibre";

/** API & delivery: every saved page and model as JSON, with the real endpoint served under /api/delivery/v1 on this instance. */
export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/api">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = (await getMarket(mid));
  const tab = (["pages", "models", "endpoints"].includes(String(sp.tab)) ? sp.tab : "pages") as ApiTab;
  const [pages, models] = await Promise.all([allPages(mk.root).then((l) => l.filter((p) => !p.isFolder)), listModels()]);
  const pgPath = typeof sp.page === "string" && sp.page.startsWith(mk.root) ? sp.page : pages[0]?.path; const pg = pages.find((p) => p.path === pgPath) ?? pages[0];
  const md = models.find((m) => m.id === sp.model) ?? models[0];
  const pageJson = tab === "pages" && pg ? await pageDeliveryJson(mid, pg.path, mk.domain) : undefined;
  const explorer = <ApiExplorer base={`/${mid}/${eid}`} marketId={mid} domain={mk.domain} marketRoot={mk.root} tab={tab}
    pages={pages.map((p) => ({ path: p.path, title: p.title, status: p.status }))} models={models.map((m) => ({ id: m.id, name: m.name, group: m.group, version: m.version, fields: m.fields.length }))}
    page={pg ? { path: pg.path, title: pg.title, status: pg.status } : undefined} pageJson={pageJson} modelId={md?.id} modelSchema={md ? modelSchema(md) : undefined} />;
  if (repo().kind !== "contentlibre") return explorer;
  // The backend documents its own HTTP API (OpenAPI 3.1 + Swagger UI); point at it above this app's delivery preview.
  const origin = contentLibreConfig().publicOrigin;
  return (<>
    <div className="px-7 pt-7 grid gap-3 max-w-[1100px]">
      <BackendTool title="ContentLIBRE Management API" text="Pages, sites and identity, as this CMS uses them. Swagger UI with the OpenAPI 3.1 document." href={`${origin}/api/management/docs/`} action="Open Swagger" />
      <BackendTool title="Repository Manager" text="The raw repository (this CMS has no JCR screen): browse and search, stage changes and apply them in one save, packages." href={`${origin}/manage/repository?path=${encodeURIComponent(mk.root)}`} action="Open Repository Manager" />
      <BackendTool title="Repository Manager API" text="Browse, query, change sets and packages. OpenAPI 3.1 document." href={`${origin}/api/manage/repostiory/v1/openapi.json`} action="Open OpenAPI" />
    </div>
    {explorer}
  </>);
}
