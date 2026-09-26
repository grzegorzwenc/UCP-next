import { getMarket } from "@/lib/server/markets";
import { repo } from "@/lib/repo";
import type { RepoNode } from "@/lib/repo";
import { RepoTree } from "@/components/repo/RepoTree";
import { BackendTool } from "@/components/shell/BackendTool";
import { contentLibreConfig } from "@/lib/server/contentlibre";

/** CRXDE-style view of the raw repository: lets you verify that the page builder really writes JCR nodes. */
export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/repo">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams; const mk = (await getMarket(mid));
  const path = typeof sp.path === "string" && sp.path.startsWith("/content") ? sp.path : mk.root;
  const r = repo();
  if (r.kind === "contentlibre") {
    // ContentLIBRE ships a full repository workbench (browse, query, atomic changes, packages); link to it rather than duplicate it.
    const tool = `${contentLibreConfig().publicOrigin}/manage/repository?path=${encodeURIComponent(path)}`;
    return (<div className="p-7 max-w-[960px]">
      <h1 className="text-2xl font-semibold mb-1">Repository (JCR)</h1>
      <p className="text-ink-3 text-[13px] mb-5">Backend: <b className="font-mono text-ink">contentlibre</b>. The raw repository is managed in ContentLIBRE&apos;s Repository Manager.</p>
      <BackendTool title="Repository Manager" text="Browse and search the JCR, stage changes and apply them in one save, deploy and export packages." href={tool} action="Open Repository Manager" />
    </div>);
  }
  const node: RepoNode | undefined = await r.getNode(path, 4);
  return (<div className="p-7">
    <div className="flex items-end justify-between gap-4 mb-5"><div><h1 className="text-2xl font-semibold">Repository (JCR)</h1><p className="text-ink-3 text-[13px] mt-1">Raw node tree behind the CMS. Backend: <b className="font-mono text-ink">{r.kind}</b>. Pages are <code>cq:Page</code>, content sits in <code>jcr:content</code>, components under <code>jcr:content/root</code>.</p></div>
      <form className="flex gap-2"><input name="path" defaultValue={path} className="border border-line px-3 py-2 text-[13px] font-mono w-[420px]" aria-label="Repository path" /><button className="btn btn-sm">Go</button></form></div>
    {node ? <RepoTree root={node} base={`/${mid}/${eid}`} marketRoot={mk.root} /> : <div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">No node at <code>{path}</code>.</div>}
  </div>);
}
