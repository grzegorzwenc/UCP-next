"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Template } from "@/lib/ucp/types";
import { TEMPLATE_FOLDERS } from "@/lib/ucp/seed";
import { PATHS } from "@/lib/ucp/paths";
import { repoApi, ApiError } from "@/lib/api";
import { TemplatePreview } from "./TemplatePreview";

type Props = { marketId: string; envId: string; marketName: string; flag: string; templates: Template[]; used: Record<string, number>; folder: string; view: "grid" | "list"; q: string };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const errText = (e: unknown) => (e instanceof ApiError ? `${e.problem.title} · request ${e.requestId ?? "n/a"}` : String(e));
/** Folder list: fixed set ∪ market name ∪ folders that exist on templates ∪ folders added in this session. */
export const tplFolders = (templates: Template[], marketName: string, extra: string[] = []) => { const out = [TEMPLATE_FOLDERS[0], marketName, ...TEMPLATE_FOLDERS.slice(1), ...extra]; for (const t of templates) if (t.folder && !out.includes(t.folder)) out.push(t.folder); return [...new Set(out)]; };
export const tplFolderOf = (t: Template) => t.folder || (t.id === "campaign" ? "Campaigns" : "Global (all markets)");

export function TemplateLibrary({ marketId, envId, marketName, flag, templates, used, folder, view, q: q0 }: Props) {
  const router = useRouter();
  const base = `/${marketId}/${envId}`;
  const [q, setQ] = useState(q0);
  const [extraFolders, setExtraFolders] = useState<string[]>([]);
  const [modal, setModal] = useState<null | { kind: "folder" } | { kind: "template"; folder: string }>(null);
  const [name, setName] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [toast, setToast] = useState<string | null>(null);
  const folders = useMemo(() => tplFolders(templates, marketName, extraFolders), [templates, marketName, extraFolders]);
  const list = templates.filter((t) => (!folder || tplFolderOf(t) === folder) && (!q || (t.name + " " + t.desc).toLowerCase().includes(q.toLowerCase())));
  const href = (f: string, v = view) => `${base}/templates?folder=${encodeURIComponent(f)}&view=${v}`;
  const say = (s: string) => { setToast(s); setTimeout(() => setToast(null), 2500); };

  function openTemplateModal(f: string) { setName(""); setErr(null); setModal({ kind: "template", folder: f }); }
  async function createTemplate() {
    const m = modal; if (!m || m.kind !== "template") return; const id = slugify(name); if (!id) return;
    if (templates.some((t) => t.id === id)) { setErr("A template with that name already exists."); return; }
    setBusy(true); setErr(null);
    try { await repoApi.createNode(`${PATHS.templates}/${id}`, "cq:Template", { "jcr:title": name.trim(), "jcr:description": "", "ucp:blocks": "", "ucp:folder": m.folder }, { text: `created template ${name.trim()}`, target: "templates" }); setModal(null); router.push(`${base}/templates/${id}`); router.refresh(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }
  async function duplicate(t: Template) {
    let id = `${t.id}-copy`; let n = 2; while (templates.some((x) => x.id === id)) id = `${t.id}-copy-${n++}`;
    try { await repoApi.createNode(`${PATHS.templates}/${id}`, "cq:Template", { "jcr:title": `${t.name} (copy)`, "jcr:description": t.desc, "ucp:blocks": t.blocks.join(","), "ucp:folder": tplFolderOf(t) }, { text: `duplicated template ${t.name}`, target: "templates" }); say(`Duplicated “${t.name}”`); router.refresh(); }
    catch (e) { say(errText(e)); }
  }

  return (
    <div className="grid grid-cols-[260px_1fr] h-full min-h-0">
      <aside className="bg-surface border-r border-line p-3 overflow-auto">
        <h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold mx-2 mb-2">{flag} Template library</h6>
        <Link href={href("")} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[13.5px] ${!folder ? "bg-accent-soft text-accent-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`}><span>▦</span><span className="flex-1">All templates</span><span className="text-[11px] text-ink-3 font-mono">{templates.length}</span></Link>
        {folders.map((f) => <Link key={f} href={href(f)} className={`flex items-center gap-1.5 pl-5 pr-2 py-1 rounded text-[13.5px] ${folder === f ? "bg-accent-soft text-accent-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`}><span className="text-warn">▪</span><span className="flex-1 truncate">{f}</span><span className="text-[11px] text-ink-3 font-mono">{templates.filter((t) => tplFolderOf(t) === f).length}</span></Link>)}
        <button className="btn btn-quiet btn-sm mt-2.5 mx-1" onClick={() => { setName(""); setErr(null); setModal({ kind: "folder" }); }}>＋ New folder</button>
      </aside>
      <div className="p-6 overflow-auto min-w-0">
        <div className="text-[13px] text-ink-3 mb-2 flex gap-1.5"><Link href={href("")} className="hover:text-ink">Template library</Link>{folder && <><span className="text-ink-4">/</span><b className="text-ink">{folder}</b></>}</div>
        <div className="flex items-end gap-4 mb-5"><div><h1 className="text-2xl font-semibold">{folder || "All templates"}</h1><p className="text-[13px] text-ink-3 mt-1">{list.length} template{list.length === 1 ? "" : "s"} · a template is the starting layout for a new page; authors can still change every block afterwards</p></div>
          <div className="ml-auto flex gap-2"><button className="btn" onClick={() => { setName(""); setErr(null); setModal({ kind: "folder" }); }}>＋ New folder</button><button className="btn btn-primary" onClick={() => openTemplateModal(folder || "Global (all markets)")}>＋ New template here</button></div></div>
        <div className="flex gap-2 mb-4 items-center"><label className="flex items-center gap-2 bg-surface border border-line-2 rounded-lg px-2.5 py-1.5 min-w-[280px]"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13.5px]" placeholder="Find a template" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <Link href={href(folder, "grid")} className={`btn btn-sm ${view === "grid" ? "on" : ""}`}>Grid</Link><Link href={href(folder, "list")} className={`btn btn-sm ${view === "list" ? "on" : ""}`}>List</Link></div>
        {!list.length ? <div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">No templates here. <button className="underline" onClick={() => openTemplateModal(folder || "Global (all markets)")}>Create the first one</button>.</div>
          : view === "list" ? <table className="w-full text-[13.5px] bg-surface border border-line"><thead><tr className="text-left text-[11.5px] uppercase tracking-[.06em] text-ink-3"><th className="p-3 border-b border-line-2">Template</th><th className="p-3 border-b border-line-2">Blocks</th><th className="p-3 border-b border-line-2">Folder</th><th className="p-3 border-b border-line-2">Used by</th><th className="border-b border-line-2" /></tr></thead>
            <tbody>{list.map((t) => <tr key={t.id} className="hover:bg-surface-2"><td className="p-3 border-b border-line"><Link href={`${base}/templates/${t.id}`} className="font-medium">▫ {t.name}</Link><div className="text-xs text-ink-3">{t.desc}</div></td><td className="p-3 border-b border-line">{t.blocks.length}</td><td className="p-3 border-b border-line text-ink-3">{tplFolderOf(t)}</td><td className="p-3 border-b border-line text-ink-3">{used[t.id] ?? 0} pages</td><td className="p-3 border-b border-line whitespace-nowrap"><Link className="btn btn-sm btn-primary mr-1.5" href={`${base}/pages?new=1&template=${t.id}`}>Use</Link><Link className="btn btn-sm mr-1.5" href={`${base}/templates/${t.id}`}>Edit</Link>{t.id !== "blank" && <button className="btn btn-sm btn-quiet" onClick={() => duplicate(t)}>Duplicate</button>}</td></tr>)}</tbody></table>
          : <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>{list.map((t) => { const u = used[t.id] ?? 0; return <div key={t.id} className="bg-surface border border-line flex flex-col hover:border-ink-3 hover:shadow-lg transition-shadow">
            <Link href={`${base}/templates/${t.id}`} aria-label={`Edit template ${t.name}`}><TemplatePreview blocks={t.blocks} scale={0.3} height={200} /></Link>
            <div className="p-3.5 flex flex-col gap-1.5 flex-1"><div className="flex items-center gap-2"><b className="text-[15px]">{t.name}</b><span className="ml-auto text-[11.5px] text-ink-3 font-mono">{t.blocks.length} block{t.blocks.length === 1 ? "" : "s"}</span></div>
              <small className="text-ink-3 text-[12.5px] leading-snug">{t.desc}</small>
              <div className="text-[12px] text-ink-3 mt-auto pt-1">{tplFolderOf(t)} · used by {u} page{u === 1 ? "" : "s"}</div>
              <div className="flex gap-1.5 flex-wrap mt-1"><Link className="btn btn-sm btn-primary" href={`${base}/pages?new=1&template=${t.id}`}>Use template</Link><Link className="btn btn-sm" href={`${base}/templates/${t.id}`}>Edit</Link>{t.id !== "blank" && <button className="btn btn-sm btn-quiet" onClick={() => duplicate(t)}>Duplicate</button>}</div></div>
          </div>; })}</div>}
      </div>
      {modal && <div className="fixed inset-0 bg-black/45 grid place-items-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
        <div role="dialog" aria-labelledby="tm" className="bg-surface rounded-xl w-[min(460px,94vw)] shadow-2xl">
          <header className="px-6 pt-5 pb-3 flex items-center"><h2 id="tm" className="text-lg font-semibold">{modal.kind === "folder" ? "New folder" : "New template"}</h2><button className="ml-auto w-8 h-8 rounded text-ink-3 hover:bg-surface-3" onClick={() => setModal(null)} aria-label="Close">×</button></header>
          <div className="px-6 pb-2 grid gap-3">
            <label className="text-xs text-ink-3">{modal.kind === "folder" ? "Folder name" : "Template name"}<input autoFocus className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink" value={name} onChange={(e) => setName(e.target.value)} placeholder={modal.kind === "folder" ? "e.g. Insurance" : "e.g. Savings product"} onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) (modal.kind === "folder" ? addFolder() : createTemplate()); }} /></label>
            {modal.kind === "template" ? <div className="text-xs text-ink-3 font-mono">id: {slugify(name) || "…"} · in {modal.folder}</div> : <div className="text-xs text-ink-3">The folder appears in the library once it has a template in it.</div>}
            {err && <div className="text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded">{err}</div>}
          </div>
          <footer className="px-6 pb-5 pt-3 flex justify-end gap-2"><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={!name.trim() || busy} onClick={() => (modal.kind === "folder" ? addFolder() : createTemplate())}>{modal.kind === "folder" ? "Create folder" : busy ? "Creating…" : "Create and edit"}</button></footer>
        </div></div>}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] z-50">{toast}</div>}
    </div>
  );
  function addFolder() { const f = name.trim(); if (!f) return; if (!folders.includes(f)) setExtraFolders((x) => [...x, f]); setModal(null); router.push(href(f)); openTemplateModal(f); }
}
