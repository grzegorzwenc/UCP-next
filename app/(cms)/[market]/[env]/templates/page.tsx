import { market } from "@/lib/markets";
import { allPages } from "@/lib/server/pages";
import { listTemplates } from "@/lib/server/ucp";
import { TemplateLibrary } from "@/components/templates/TemplateLibrary";

export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/templates">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = market(mid);
  const [templates, pages] = await Promise.all([listTemplates(), allPages(mk.root)]);
  const used: Record<string, number> = {};
  for (const p of pages) if (!p.isFolder && p.template) used[p.template] = (used[p.template] ?? 0) + 1;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return <TemplateLibrary marketId={mid} envId={eid} marketName={mk.name} flag={mk.flag} templates={templates} used={used} folder={s(sp.folder)} view={s(sp.view) === "list" ? "list" : "grid"} q={s(sp.q)} />;
}
