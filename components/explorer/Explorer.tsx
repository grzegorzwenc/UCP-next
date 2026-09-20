"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ContentV1Page } from "@/lib/api/types";
import { contentV1, ApiError } from "@/lib/api";
import { TEMPLATES } from "@/lib/blocks/registry";
import { Pill } from "@/components/ui/Pill";

type Props = { marketId: string; envId: string; root: string; marketName: string; flag: string; folder: ContentV1Page; items: ContentV1Page[]; tree: { path: string; title: string }[]; allPages: ContentV1Page[]; openNew?: boolean };
const isFolder = (p: ContentV1Page) => p.template === "folder" || p.template === "site";
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function Explorer({ marketId, envId, root, marketName, flag, folder, items, tree, allPages, openNew }: Props) {
  const router = useRouter();
  const base = `/${marketId}/${envId}`;
  const rel = (p: string) => p.replace(root, "") || "/";
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(!!openNew);
  const [title, setTitle] = useState(""); const [slug, setSlug] = useState(""); const [tpl, setTpl] = useState("product"); const [parent, setParent] = useState(folder.path); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const crumbs = useMemo(() => { const segs = rel(folder.path).split("/").filter(Boolean); return segs.map((s, i) => ({ name: s, path: root + "/" + segs.slice(0, i + 1).join("/") })); }, [folder.path, root]);
  const rows = q ? allPages.filter((p) => (p.title ?? "").toLowerCase().includes(q.toLowerCase()) || rel(p.path).includes(q.toLowerCase())) : items;

  async function create() {
    setBusy(true); setErr(null);
    try { const page = await contentV1.createPage({ parentPath: parent, name: slug || slugify(title), template: tpl, title }); setModal(false); router.push(`${base}/page${rel(page.path)}`); router.refresh(); }
    catch (e) { setErr(e instanceof ApiError ? `${e.problem.title}${e.problem.detail ? ": " + e.problem.detail : ""} (request ${e.requestId ?? "n/a"})` : String(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid grid-cols-[260px_1fr] h-full min-h-0">
      <aside className="bg-surface border-r border-line p-3 overflow-auto">
        <h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold mx-2 mb-2">{flag} {marketName}</h6>
        <Link href={`${base}/pages`} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[13.5px] ${folder.path === root ? "bg-accent-soft text-accent-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`}>▸ {marketName}</Link>
        {tree.map((f) => { const depth = rel(f.path).split("/").filter(Boolean).length; return <Link key={f.path} href={`${base}/pages${rel(f.path)}`} style={{ paddingLeft: 8 + depth * 14 }} className={`flex items-center gap-1.5 py-1 pr-2 rounded text-[13.5px] ${folder.path === f.path ? "bg-accent-soft text-accent-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`}><span className="text-warn">▪</span>{f.title}</Link>; })}
      </aside>
      <div className="p-6 overflow-auto min-w-0">
        <div className="text-[13px] text-ink-3 mb-2 flex gap-1.5 flex-wrap"><Link href={`${base}/pages`} className="hover:text-ink">{marketName}</Link>{crumbs.map((c, i) => <span key={c.path}><span className="text-ink-4"> / </span>{i === crumbs.length - 1 ? <b className="text-ink">{c.name}</b> : <Link href={`${base}/pages${rel(c.path)}`} className="hover:text-ink">{c.name}</Link>}</span>)}</div>
        <div className="flex items-end gap-4 mb-5"><div><h1 className="text-2xl font-semibold">{q ? `Search results for “${q}”` : folder.title ?? folder.name}</h1><p className="text-[13px] text-ink-3 mt-1 font-mono">{q ? `${rows.length} pages match` : `${rel(folder.path)} · ${items.filter(isFolder).length} folders · ${items.filter((i) => !isFolder(i)).length} pages`}</p></div>
          <div className="ml-auto flex gap-2"><button className="btn btn-primary" onClick={() => { setParent(folder.path); setModal(true); }}>＋ New page here</button></div></div>
        <div className="flex gap-2 mb-3.5"><label className="flex items-center gap-2 bg-surface border border-line-2 rounded-lg px-2.5 py-1.5 min-w-[280px]"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13.5px]" placeholder="Find a page by title or URL" value={q} onChange={(e) => setQ(e.target.value)} /></label></div>
        {rows.length ? <table className="w-full text-[13.5px]"><thead><tr className="text-left text-[11.5px] uppercase tracking-[.06em] text-ink-3"><th className="py-2.5 px-3 border-b border-line-2 w-[38%]">Name</th><th className="py-2.5 px-3 border-b border-line-2">Status</th><th className="py-2.5 px-3 border-b border-line-2">URL</th><th className="py-2.5 px-3 border-b border-line-2">Template</th><th className="py-2.5 px-3 border-b border-line-2">Updated</th><th className="border-b border-line-2" /></tr></thead>
          <tbody>{rows.map((n) => isFolder(n)
            ? <tr key={n.path} className="hover:bg-surface-2"><td className="py-2.5 px-3 border-b border-line"><Link href={`${base}/pages${rel(n.path)}`} className="font-medium flex items-center gap-2"><span className="text-warn">▪</span>{n.title ?? n.name}</Link></td><td className="py-2.5 px-3 border-b border-line text-ink-3">folder</td><td className="py-2.5 px-3 border-b border-line font-mono text-xs text-ink-2">{rel(n.path)}</td><td className="py-2.5 px-3 border-b border-line text-ink-3">—</td><td className="py-2.5 px-3 border-b border-line text-ink-3">—</td><td className="py-2.5 px-3 border-b border-line"><Link className="btn btn-sm" href={`${base}/pages${rel(n.path)}`}>Open folder</Link></td></tr>
            : <tr key={n.path} className="hover:bg-surface-2"><td className="py-2.5 px-3 border-b border-line"><Link href={`${base}/page${rel(n.path)}`} className="font-medium flex items-center gap-2"><span className="text-ink-3">▫</span>{n.title ?? n.name}{n.locale && n.locale !== "en-GB" && <span className="font-mono text-[11px] bg-surface-3 px-1.5 rounded">{n.locale}</span>}</Link></td><td className="py-2.5 px-3 border-b border-line"><Pill status={n.status ?? "draft"} /></td><td className="py-2.5 px-3 border-b border-line font-mono text-xs text-ink-2">{rel(n.path)}</td><td className="py-2.5 px-3 border-b border-line text-ink-3">{TEMPLATES.find((t) => t.id === n.template)?.name ?? n.template}</td><td className="py-2.5 px-3 border-b border-line text-ink-3">{n.lastModified?.slice(0, 10)}</td><td className="py-2.5 px-3 border-b border-line"><Link className="btn btn-sm" href={`${base}/page${rel(n.path)}`}>Edit page</Link></td></tr>)}</tbody></table>
          : <div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">This folder is empty. <button className="underline" onClick={() => setModal(true)}>Create the first page</button>.</div>}
      </div>
      {modal && <div className="fixed inset-0 bg-black/45 grid place-items-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
        <div role="dialog" aria-labelledby="np" className="bg-surface rounded-xl w-[min(720px,94vw)] shadow-2xl">
          <header className="px-6 pt-5 pb-3 flex items-center"><h2 id="np" className="text-lg font-semibold">New page</h2><button className="ml-auto w-8 h-8 rounded text-ink-3 hover:bg-surface-3" onClick={() => setModal(false)} aria-label="Close">×</button></header>
          <div className="px-6 pb-2 grid grid-cols-2 gap-x-4 gap-y-3">
            <label className="col-span-2 text-xs text-ink-3">Page title<input autoFocus className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink" value={title} onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }} placeholder="e.g. Regular saver" /></label>
            <label className="text-xs text-ink-3">Where should it live?<select className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink" value={parent} onChange={(e) => setParent(e.target.value)}><option value={root}>{marketName} (root)</option>{tree.map((f) => <option key={f.path} value={f.path}>{rel(f.path)}</option>)}</select></label>
            <label className="text-xs text-ink-3">URL name<input className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink font-mono" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} /><span className="block mt-1 font-mono text-[11px]">{rel(parent)}/{slug || "…"}</span></label>
            <div className="col-span-2 text-xs text-ink-3">Template<div className="mt-1 grid grid-cols-5 gap-2">{TEMPLATES.map((t) => <button type="button" key={t.id} onClick={() => setTpl(t.id)} className={`text-left border rounded-lg p-2.5 ${tpl === t.id ? "border-accent bg-accent-soft" : "border-line hover:border-ink-4"}`}><b className="block text-[12.5px] text-ink">{t.name}</b><small className="text-ink-3">{t.blocks.length} blocks</small></button>)}</div></div>
            {err && <div className="col-span-2 text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded">{err}</div>}
          </div>
          <footer className="px-6 pb-5 pt-3 flex justify-end gap-2"><button className="btn" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" disabled={!title.trim() || busy} onClick={create}>{busy ? "Creating…" : "Create and open"}</button></footer>
        </div></div>}
    </div>
  );
}
