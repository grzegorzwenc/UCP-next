"use client";
import Link from "next/link";
import { useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { Json } from "@/components/ui/Json";

export type ApiTab = "pages" | "models" | "endpoints";
type PageRow = { path: string; title: string; status: string };
type ModelRow = { id: string; name: string; group: string; version: number; fields: number };
type Props = { base: string; marketId: string; domain: string; marketRoot: string; tab: ApiTab; pages: PageRow[]; models: ModelRow[]; page?: PageRow; pageJson?: unknown; modelId?: string; modelSchema?: unknown };

const STATS: [string, string, string?][] = [["4.2M", "requests · last 24 h"], ["84 ms", "typical response (p95) · last 24 h"], ["0.03%", "errors · last 24 h", "text-crit"], ["12", "connected apps"]];
const ENDPOINTS: [string, string, string][] = [
  ["GET /v1/pages", "List of pages (filter by folder, status, updatedSince)", "API key"],
  ["GET /v1/pages/{route}", "One page with resolved blocks, assets and forms", "API key"],
  ["GET /v1/preview/pages/{route}", "Latest draft of a page", "Author token"],
  ["GET /v1/models", "All content models", "API key"],
  ["GET /v1/models/{id}", "JSON Schema of one model", "API key"],
  ["GET /v1/content/{model}", "Items of a model (paged)", "API key"],
  ["GET /v1/assets/{id}/{rendition}", "Binary asset rendition (original, hero, card)", "Public"],
  ["POST /v1/webhooks", "Subscribe to page.published, asset.replaced, form.submitted", "Admin token"],
];

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="btn btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }}>{ok ? "Copied" : label}</button>;
}
const UrlLine = ({ url, tryHref }: { url: string; tryHref: string }) => <div className="flex items-center gap-2.5 bg-surface-2 border border-line rounded-lg px-3 py-2 mb-3 font-mono text-[13px] min-w-0"><span className="bg-good-soft text-good font-bold text-[11px] px-1.5 py-0.5 rounded">GET</span><span className="truncate flex-1">{url}</span><CopyBtn text={url} label="Copy URL" /><a className="btn btn-sm btn-primary" href={tryHref} target="_blank" rel="noreferrer">Try it ↗</a></div>;

const EpBtn = ({ href, on, text }: { href: string; on: boolean; text: string }) => <Link href={href} aria-current={on ? "page" : undefined} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[12.5px] font-mono min-w-0 ${on ? "bg-brand-soft text-brand-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`}><span className={`text-[10.5px] font-bold px-1 rounded ${on ? "bg-white/70" : "bg-good-soft text-good"}`}>GET</span><span className="truncate">{text}</span></Link>;

export function ApiExplorer(p: Props) {
  const [q, setQ] = useState("");
  const route = (path: string) => path.replace(p.marketRoot, "") || "/";
  const tabLink = (t: ApiTab) => `${p.base}/api?tab=${t}`;
  const published = p.page?.status === "published";
  const pageUrl = p.page ? `https://${p.domain}/v1/${published ? "" : "preview/"}pages${route(p.page.path)}` : "";
  const pageTry = p.page ? `/api/delivery/v1/${published ? "" : "preview/"}pages${route(p.page.path)}?market=${p.marketId}` : "";
  const modelUrl = `https://${p.domain}/v1/models/${p.modelId}`; const model = p.models.find((m) => m.id === p.modelId);
  const blocks = (p.pageJson as { blocks?: unknown[] } | undefined)?.blocks?.length ?? 0;
  const rows = p.pages.filter((x) => !q || (x.title + " " + route(x.path)).toLowerCase().includes(q.toLowerCase()));
  const mrows = p.models.filter((x) => !q || (x.name + " " + x.id).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="p-4 md:p-7">
      <div className="mb-5"><h1 className="text-2xl font-semibold">API &amp; delivery</h1><p className="text-ink-3 text-[13px] mt-1">Every saved page and model is available as JSON. Pick one to see its endpoint and payload.</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">{STATS.map(([v, l, c]) => <div key={l} className="bg-surface border border-line rounded-lg p-4"><div className={`text-[26px] font-semibold leading-none ${c ?? ""}`}>{v}</div><div className="text-[12.5px] text-ink-3 mt-1.5">{l}</div></div>)}</div>
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 items-start">
        <aside className="bg-surface border border-line rounded-lg p-2.5">
          <div className="flex gap-1 border-b border-line mb-2 px-1">{(["pages", "models", "endpoints"] as ApiTab[]).map((t) => <Link key={t} href={tabLink(t)} className={`px-2.5 py-2 text-[13px] -mb-px border-b-2 ${p.tab === t ? "border-brand text-ink font-semibold" : "border-transparent text-ink-3 hover:text-ink"}`}>{t === "pages" ? "Pages" : t === "models" ? "Models" : "All endpoints"}</Link>)}</div>
          {p.tab !== "endpoints" && <label className="flex items-center gap-2 border border-line-2 rounded-md px-2.5 py-1.5 mb-2"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13px] bg-transparent" placeholder={p.tab === "pages" ? "Find a page" : "Find a model"} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find an endpoint" /></label>}
          {p.tab === "pages" && <div className="grid gap-0.5 max-h-[60vh] overflow-auto">{rows.map((x) => <EpBtn key={x.path} href={`${p.base}/api?tab=pages&page=${encodeURIComponent(x.path)}`} on={x.path === p.page?.path} text={`/v1/pages${route(x.path)}`} />)}{!rows.length && <div className="text-[12.5px] text-ink-4 px-2 py-1">No match</div>}</div>}
          {p.tab === "models" && <div className="grid gap-0.5 max-h-[60vh] overflow-auto">{mrows.map((x) => <EpBtn key={x.id} href={`${p.base}/api?tab=models&model=${x.id}`} on={x.id === p.modelId} text={`/v1/models/${x.id}`} />)}{!mrows.length && <div className="text-[12.5px] text-ink-4 px-2 py-1">No match</div>}</div>}
          {p.tab === "endpoints" && <div className="text-[12.5px] text-ink-3 px-1.5 py-1">API v1.3 · backwards compatible with v1.0 · served under <span className="font-mono">/api/delivery/v1</span> on this instance · <a className="underline" href={`/api/delivery/v1/markets`} target="_blank" rel="noreferrer">/v1/markets ↗</a></div>}
        </aside>
        <section className="bg-surface border border-line rounded-lg p-5 min-w-0">
          {p.tab === "pages" && (p.page ? <>
            <UrlLine url={pageUrl} tryHref={pageTry} />
            <div className="flex items-center gap-2.5 mb-3 flex-wrap"><Pill status={p.page.status} label={published ? "Served from production" : "Available on preview API only"} /><span className="text-[12.5px] text-ink-3">{blocks} block{blocks === 1 ? "" : "s"} · generated from the current saved version</span><div className="ml-auto flex gap-2"><CopyBtn text={JSON.stringify(p.pageJson, null, 2)} label="Copy JSON" /><Link className="btn btn-sm" href={`${p.base}/page${route(p.page.path)}`}>Open in builder</Link></div></div>
            <Json value={p.pageJson ?? {}} maxHeight={620} label="page JSON" />
          </> : <div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">No pages in this market yet.</div>)}
          {p.tab === "models" && (model ? <>
            <UrlLine url={modelUrl} tryHref={`/api/delivery/v1/models/${model.id}`} />
            <div className="flex items-center gap-2.5 mb-3"><span className="text-[12.5px] text-ink-3">JSON Schema · {model.fields} field{model.fields === 1 ? "" : "s"} · v{model.version} · {model.group}</span><div className="ml-auto flex gap-2"><CopyBtn text={JSON.stringify(p.modelSchema, null, 2)} label="Copy JSON" /><Link className="btn btn-sm" href={`${p.base}/models?model=${model.id}`}>Edit model</Link></div></div>
            <Json value={p.modelSchema ?? {}} maxHeight={620} label="schema" />
          </> : <div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">No models.</div>)}
          {p.tab === "endpoints" && <>
            <div className="overflow-auto"><table className="w-full text-[13.5px] border border-line"><thead><tr className="text-left text-[11.5px] uppercase tracking-[.06em] text-ink-3"><th className="p-3 border-b border-line-2">Endpoint</th><th className="p-3 border-b border-line-2">Returns</th><th className="p-3 border-b border-line-2">Auth</th></tr></thead>
              <tbody>{ENDPOINTS.map(([e, r, a]) => <tr key={e}><td className="p-3 border-b border-line font-mono text-[12.5px]">{e}</td><td className="p-3 border-b border-line text-ink-2">{r}</td><td className="p-3 border-b border-line text-ink-3">{a}</td></tr>)}</tbody></table></div>
            <p className="text-[12.5px] text-ink-3 mt-3">On this instance every endpoint is served under <span className="font-mono">/api/delivery/v1</span> with <span className="font-mono">?market=&lt;id&gt;</span>, e.g. <a className="underline font-mono" href={`/api/delivery/v1/pages?market=${p.marketId}`} target="_blank" rel="noreferrer">/api/delivery/v1/pages?market={p.marketId}</a> or <a className="underline font-mono" href="/api/delivery/v1/markets" target="_blank" rel="noreferrer">/api/delivery/v1/markets</a>. <span className="font-mono">/v1/content</span> and <span className="font-mono">/v1/webhooks</span> are documented for the target platform and not yet served here.</p>
          </>}
        </section>
      </div>
    </div>
  );
}
