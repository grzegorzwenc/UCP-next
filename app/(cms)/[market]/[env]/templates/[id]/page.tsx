import { notFound } from "next/navigation";
import { market } from "@/lib/markets";
import { allPages } from "@/lib/server/pages";
import { listTemplates } from "@/lib/server/ucp";
import { TemplateEditor } from "@/components/templates/TemplateEditor";

export default async function Page({ params }: PageProps<"/[market]/[env]/templates/[id]">) {
  const { market: mid, env: eid, id } = await params; const mk = market(mid);
  const [templates, pages] = await Promise.all([listTemplates(), allPages(mk.root)]);
  const t = templates.find((x) => x.id === id); if (!t) notFound();
  const used = pages.filter((p) => !p.isFolder && p.template === id).length;
  return <TemplateEditor marketId={mid} envId={eid} marketName={mk.name} template={t} templates={templates} used={used} />;
}
