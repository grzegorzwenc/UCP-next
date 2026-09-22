"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PageSummary } from "@/lib/api/types";
import { repoApi, ucpApi } from "@/lib/api";
import { errorText as errText } from "@/lib/api/errors";
import { useSession } from "@/components/shell/Session";
import type { Template } from "@/lib/ucp/types";
import { MARKETS, market as marketOf } from "@/lib/markets";
import { makeBlock } from "@/lib/blocks/registry";
import { blocksToComponents } from "@/lib/repo/mapping";
import { Pill } from "@/components/ui/Pill";

type Folder = { path: string; title: string };
type Props = { marketId: string; envId: string; root: string; marketName: string; flag: string; folder: Folder; items: PageSummary[]; tree: Folder[]; allPages: PageSummary[]; templates: Template[]; openNew?: boolean; newTemplate?: string };
type Modal =
  | { kind: "new" } | { kind: "folder" }
  | { kind: "rename"; page: PageSummary } | { kind: "move"; pages: PageSummary[] }
  | { kind: "translate"; pages: PageSummary[] };
const isFolder = (p: PageSummary) => p.isFolder;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const PAGE = 50;
const parentOf = (p: string) => p.replace(/\/[^/]+$/, "");
/** Default components for a template (same as the builder would create). */
const componentsFor = (t: Template | undefined, title: string) => blocksToComponents((t?.blocks ?? []).map((b) => makeBlock(b, b === "mast" ? { heading: title } : {})));

/* ---------------- modal chrome (hoisted so inputs keep focus) ---------------- */
function ModalShell({ title, width = 720, onClose, children, footer }: { title: string; width?: number; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return <div className="fixed inset-0 bg-black/45 grid place-items-center z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-label={title} className="bg-surface rounded-xl shadow-2xl" style={{ width: `min(${width}px, 94vw)` }}>
      <header className="px-6 pt-5 pb-3 flex items-center"><h2 className="text-lg font-semibold">{title}</h2><button className="ml-auto w-8 h-8 rounded text-ink-3 hover:bg-surface-3" onClick={onClose} aria-label="Close">×</button></header>
      <div className="px-6 pb-2">{children}</div>
      <footer className="px-6 pb-5 pt-3 flex justify-end gap-2">{footer}</footer>
    </div></div>;
}
const Err = ({ err }: { err: string | null }) => (err ? <div className="text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded mt-3">{err}</div> : null);
const inputCls = "mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink";

function FolderSelect({ value, onChange, root, marketName, tree, rel, exclude = [] }: { value: string; onChange: (v: string) => void; root: string; marketName: string; tree: Folder[]; rel: (p: string) => string; exclude?: string[] }) {
  return <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}><option value={root}>{marketName} (root)</option>{tree.filter((f) => !exclude.some((x) => f.path === x || f.path.startsWith(x + "/"))).map((f) => <option key={f.path} value={f.path}>{rel(f.path)}</option>)}</select>;
}

/* ---------------- row actions menu ---------------- */
function RowMenu({ page, canEdit, onAction }: { page: PageSummary; canEdit: boolean; onAction: (a: "open" | "rename" | "move" | "duplicate" | "delete", p: PageSummary) => void }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [open]);
  const item = (a: "open" | "rename" | "move" | "duplicate" | "delete", label: string, cls = "") => <button key={a} className={`block w-full text-left px-3 py-1.5 text-[13px] hover:bg-surface-2 ${cls}`} onClick={() => { setOpen(false); onAction(a, page); }}>{label}</button>;
  return <div ref={ref} className="relative inline-block"><button className="btn btn-sm btn-icon" aria-label={`Actions for ${page.title}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>⋯</button>
    {open && <div role="menu" className="absolute right-0 top-full mt-1 bg-surface border border-line rounded-lg shadow-xl py-1 min-w-[160px] z-30">{item("open", page.isFolder ? "Open folder" : "Open in builder")}{canEdit ? <>{item("rename", "Rename")}{item("move", "Move to…")}{!page.isFolder && item("duplicate", "Duplicate")}<div className="border-t border-line my-1" />{item("delete", "Delete", "text-crit")}</> : <div className="px-3 py-1.5 text-[12px] text-ink-3">Read-only for you</div>}</div>}</div>;
}

/* ---------------- translate modal (port of the prototype's translate flow) ---------------- */
function TranslateModal({ pages, marketId, base, root, marketName, tree, rel, folderPath, onClose, onDone }: { pages: PageSummary[]; marketId: string; base: string; root: string; marketName: string; tree: Folder[]; rel: (p: string) => string; folderPath: string; onClose: () => void; onDone: () => void }) {
  const mk = marketOf(marketId);
  const allLangs = useMemo(() => [...new Set([...mk.locales, ...MARKETS.flatMap((m) => m.locales)])].filter((l) => l !== mk.locales[0]), [mk]);
  const flagOf = (l: string) => MARKETS.find((m) => m.locales.includes(l))?.flag ?? "";
  const [langs, setLangs] = useState<string[]>([mk.locales[1] ?? "cy-GB"]);
  const [mode, setMode] = useState<"ai" | "vendor">("ai"); const [review, setReview] = useState(true);
  const [dest, setDest] = useState<"same" | "folder">("same"); const [destFolder, setDestFolder] = useState(folderPath);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [created, setCreated] = useState<string[] | null>(null);
  const total = langs.length * pages.length;
  async function go() {
    setBusy(true); setErr(null);
    try { const r = await ucpApi.translate(marketId, { pages: pages.map((p) => p.path), langs, review, dest: dest === "folder" ? destFolder : undefined, mode }); setCreated(r.created); onDone(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }
  const steps = [`Read ${pages.length} source page${pages.length === 1 ? "" : "s"}`, "Apply HSBC glossary and product names", `Translate copy to ${langs.join(", ")} ${mode === "ai" ? "(AI draft)" : "(sent to translation vendor)"}`, "Keep rates, links and regulatory text unchanged", `Create ${total} draft${total === 1 ? "" : "s"} in ${dest === "same" ? "the same folders" : "the chosen folder"}`, review ? "Send drafts for review" : "Leave as drafts"];
  if (created) return <ModalShell title="✓ Translations created" width={560} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Close</button>{created[0] && <Link className="btn btn-primary" href={`${base}/page${rel(created[0].replace(/ \(exists\)$/, ""))}`}>Open the first draft</Link>}</>}>
    <ul className="text-[13px] text-ink-2 grid gap-1">{steps.map((s) => <li key={s} className="flex gap-2"><span className="text-good">✓</span>{s}</li>)}</ul>
    <div className="mt-4 text-[12.5px] text-ink-3">Created {created.length} page{created.length === 1 ? "" : "s"}. Each draft links back to its source page.</div>
    <ul className="mt-2 grid gap-1 max-h-[220px] overflow-auto">{created.map((c) => { const p = c.replace(/ \(exists\)$/, ""); return <li key={c} className="flex items-center gap-2 text-[13px]"><Link href={`${base}/page${rel(p)}`} className="font-mono text-[12px] text-info hover:underline">{rel(p)}</Link>{c.endsWith("(exists)") && <span className="text-[11px] text-ink-3">already existed · skipped</span>}</li>; })}</ul>
  </ModalShell>;
  return <ModalShell title={`🌐 Translate ${pages.length} page${pages.length === 1 ? "" : "s"}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!langs.length || busy} onClick={go}>{busy ? "Translating…" : `Translate ${pages.length} page${pages.length === 1 ? "" : "s"}`}</button></>}>
    <div className="grid grid-cols-2 gap-x-5 gap-y-3">
      <div className="grid gap-3">
        <div className="text-xs text-ink-3">Pages<ul className="mt-1 border border-line rounded-md max-h-[150px] overflow-auto">{pages.map((p) => <li key={p.path} className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-line last:border-0 text-[13px] text-ink"><span className="truncate">{p.title}</span><span className="font-mono text-[11px] text-ink-3">{rel(p.path)}</span></li>)}</ul></div>
        <div className="text-xs text-ink-3">Target languages <span className="text-ink-4">pick one or more</span><div className="mt-1 flex flex-wrap gap-1.5">{allLangs.map((l) => { const on = langs.includes(l); return <button type="button" key={l} className={`btn btn-sm ${on ? "on" : ""}`} onClick={() => setLangs(on ? langs.filter((x) => x !== l) : [...langs, l])}>{on ? "✓ " : ""}{flagOf(l)} {l}</button>; })}</div><div className="mt-1.5 text-[12px]">{langs.length} language{langs.length === 1 ? "" : "s"} × {pages.length} page{pages.length === 1 ? "" : "s"} = <b className="text-ink">{total}</b> translation{total === 1 ? "" : "s"}</div></div>
        <div className="text-xs text-ink-3">How<div className="mt-1 flex gap-1.5"><button type="button" className={`btn btn-sm ${mode === "ai" ? "on" : ""}`} onClick={() => setMode("ai")}>✨ AI draft now</button><button type="button" className={`btn btn-sm ${mode === "vendor" ? "on" : ""}`} onClick={() => setMode("vendor")}>Send to translation vendor</button></div></div>
      </div>
      <div className="grid gap-3 content-start">
        <div className="text-xs text-ink-3">Where should the translations live?<div className="mt-1 flex gap-1.5 mb-2"><button type="button" className={`btn btn-sm ${dest === "same" ? "on" : ""}`} onClick={() => setDest("same")}>Same folder as the source</button><button type="button" className={`btn btn-sm ${dest === "folder" ? "on" : ""}`} onClick={() => setDest("folder")}>Pick a folder</button></div>
          {dest === "folder" ? <FolderSelect value={destFolder} onChange={setDestFolder} root={root} marketName={marketName} tree={tree} rel={rel} /> : <div className="text-[12px] leading-relaxed">Each translation is created next to its source page as a variant per language, e.g. <span className="font-mono">{rel(pages[0].path)}</span> → {langs.map((l) => <span key={l} className="font-mono">…/{l.split("-")[0]}-{pages[0].name} </span>)}</div>}</div>
        <label className="flex items-center gap-2 text-[13px] text-ink"><input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} />Send translated pages straight to review</label>
        <div className="text-[12px] text-ink-3">Rates, product names, links and regulatory wording are kept as-is and flagged for a native reviewer.</div>
      </div>
    </div>
    <Err err={err} />
  </ModalShell>;
}

/* ---------------- explorer ---------------- */
export function Explorer({ marketId, envId, root, marketName, flag, folder, items, tree, allPages, templates, openNew, newTemplate }: Props) {
  const router = useRouter();
  const { can } = useSession();
  const base = `/${marketId}/${envId}`;
  const rel = (p: string) => p.replace(root, "") || "/";
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE); const [seenKey, setSeenKey] = useState(q + "|" + folder.path); if (seenKey !== q + "|" + folder.path) { setSeenKey(q + "|" + folder.path); setLimit(PAGE); }
  const canEditHere = can("edit", folder.path);
  const [modal, setModal] = useState<Modal | null>(openNew ? { kind: "new" } : null);
  const [title, setTitle] = useState(""); const [slug, setSlug] = useState(""); const [tpl, setTpl] = useState(newTemplate && templates.some((t) => t.id === newTemplate) ? newTemplate : templates.some((t) => t.id === "product") ? "product" : templates[0]?.id ?? "blank"); const [parent, setParent] = useState(folder.path); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<string[]>([]); const [toast, setToast] = useState<string | null>(null);
  const crumbs = useMemo(() => { const segs = rel(folder.path).split("/").filter(Boolean); return segs.map((s, i) => ({ name: s, path: root + "/" + segs.slice(0, i + 1).join("/") })); }, [folder.path, root]);
  const rows = q ? allPages.filter((p) => (p.title ?? "").toLowerCase().includes(q.toLowerCase()) || rel(p.path).includes(q.toLowerCase())) : items;
  const shown = rows.slice(0, limit);
  const selected = rows.filter((r) => sel.includes(r.path));
  const canEditSelected = selected.length > 0 && selected.every((r) => can("edit", r.path));
  const allChecked = shown.length > 0 && shown.every((r) => sel.includes(r.path));
  const say = (s: string) => { setToast(s); setTimeout(() => setToast(null), 2600); };
  const tplName = (id?: string) => templates.find((t) => t.id === id)?.name ?? id;
  const openModal = (m: Modal) => { setErr(null); setTitle(""); setSlug(""); setModal(m); };

  async function create() {
    setBusy(true); setErr(null);
    try { const t = templates.find((x) => x.id === tpl); const page = await repoApi.createPage({ parentPath: parent, name: slug || slugify(title), template: tpl, title, components: componentsFor(t, title) }); setModal(null); router.push(`${base}/page${rel(page.path)}`); router.refresh(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }
  async function createFolder() {
    setBusy(true); setErr(null);
    try { const name = slug || slugify(title); const page = await repoApi.createPage({ parentPath: parent, name, template: "folder", title }); await repoApi.setProps(`${page.path}/jcr:content`, { "sling:resourceType": "hsbc/components/folder" }); setModal(null); say(`Folder “${title}” created`); router.refresh(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }
  async function rename() {
    if (modal?.kind !== "rename") return; setBusy(true); setErr(null);
    try { await repoApi.updateContent(modal.page.path, { title }); setModal(null); say(`Renamed to “${title}”`); router.refresh(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }
  async function move() {
    if (modal?.kind !== "move") return; setBusy(true); setErr(null);
    try { let n = 0; for (const p of modal.pages) { if (parentOf(p.path) === parent) continue; await repoApi.movePage(p.path, `${parent}/${p.name}`); n++; } setModal(null); setSel([]); say(n ? `Moved ${n} item${n === 1 ? "" : "s"} to ${rel(parent)}` : "Nothing to move"); router.refresh(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }
  async function duplicate(p: PageSummary) {
    try { const full = await repoApi.getPage(p.path); const siblings = (await repoApi.children(parentOf(p.path), 0, 200)).items.map((x) => x.name); let name = `${p.name}-copy`; let i = 2; while (siblings.includes(name)) name = `${p.name}-copy-${i++}`;
      await repoApi.createPage({ parentPath: parentOf(p.path), name, template: p.template ?? "blank", title: `${p.title} (copy)`, components: full?.components ?? [] }); say(`Duplicated “${p.title}”`); router.refresh(); }
    catch (e) { say(errText(e)); }
  }
  async function remove(pages: PageSummary[]) {
    const msg = pages.length === 1 ? `Delete ${pages[0].isFolder ? "folder" : "page"} “${pages[0].title}”${pages[0].isFolder ? " and everything in it" : ""}? This cannot be undone.` : `Delete ${pages.length} items? Folders are deleted with everything in them. This cannot be undone.`;
    if (!confirm(msg)) return;
    try { for (const p of pages) await repoApi.deletePage(p.path, true); setSel([]); say(`Deleted ${pages.length} item${pages.length === 1 ? "" : "s"}`); router.refresh(); }
    catch (e) { say(errText(e)); }
  }
  function onAction(a: "open" | "rename" | "move" | "duplicate" | "delete", p: PageSummary) {
    if (a === "open") router.push(p.isFolder ? `${base}/pages${rel(p.path)}` : `${base}/page${rel(p.path)}`);
    else if (a === "rename") { openModal({ kind: "rename", page: p }); setTitle(p.title); }
    else if (a === "move") { openModal({ kind: "move", pages: [p] }); setParent(parentOf(p.path)); }
    else if (a === "duplicate") duplicate(p);
    else remove([p]);
  }
  const cell = "py-2.5 px-3 border-b border-line";
  const barBtn = "btn btn-sm hover:brightness-125"; const barStyle = { background: "transparent", borderColor: "rgba(255,255,255,.3)", color: "#fff" } as const;

  return (
    <div className="grid grid-cols-[260px_1fr] h-full min-h-0">
      <aside className="bg-surface border-r border-line p-3 overflow-auto">
        <h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold mx-2 mb-2">{flag} {marketName}</h6>
        <Link href={`${base}/pages`} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[13.5px] ${folder.path === root ? "bg-accent-soft text-accent-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`}>▸ {marketName}</Link>
        {tree.map((f) => { const depth = rel(f.path).split("/").filter(Boolean).length; return <Link key={f.path} href={`${base}/pages${rel(f.path)}`} style={{ paddingLeft: 8 + depth * 14 }} className={`flex items-center gap-1.5 py-1 pr-2 rounded text-[13.5px] ${folder.path === f.path ? "bg-accent-soft text-accent-hover font-semibold" : "text-ink-2 hover:bg-surface-3"}`}><span className="text-warn">▪</span>{f.title}</Link>; })}
      </aside>
      <div className="p-6 overflow-auto min-w-0 relative">
        <div className="text-[13px] text-ink-3 mb-2 flex gap-1.5 flex-wrap"><Link href={`${base}/pages`} className="hover:text-ink">{marketName}</Link>{crumbs.map((c, i) => <span key={c.path}><span className="text-ink-4"> / </span>{i === crumbs.length - 1 ? <b className="text-ink">{c.name}</b> : <Link href={`${base}/pages${rel(c.path)}`} className="hover:text-ink">{c.name}</Link>}</span>)}</div>
        <div className="flex items-end gap-4 mb-5"><div><h1 className="text-2xl font-semibold">{q ? `Search results for “${q}”` : folder.title}</h1><p className="text-[13px] text-ink-3 mt-1 font-mono">{q ? `${rows.length} pages match` : `${rel(folder.path)} · ${items.filter(isFolder).length} folders · ${items.filter((i) => !isFolder(i)).length} pages`}</p></div>
          <div className="ml-auto flex gap-2 items-center">{canEditHere ? <><button className="btn" onClick={() => { setParent(folder.path); openModal({ kind: "folder" }); }}>＋ New folder</button><button className="btn btn-primary" onClick={() => { setParent(folder.path); openModal({ kind: "new" }); }}>＋ New page here</button></> : <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 bg-surface-3 border border-line rounded-full px-3 py-1.5" title="You don't have Edit on this folder. Ask a site admin."><span aria-hidden="true">🔒</span>Read-only in this folder</span>}</div></div>
        <div className="flex gap-2 mb-3.5"><label className="flex items-center gap-2 bg-surface border border-line-2 rounded-lg px-2.5 py-1.5 min-w-[280px]"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13.5px]" placeholder="Find a page by title or URL" value={q} onChange={(e) => setQ(e.target.value)} /></label></div>
        {rows.length ? <table className="w-full text-[13.5px]"><thead><tr className="text-left text-[11.5px] uppercase tracking-[.06em] text-ink-3"><th className="py-2.5 px-3 border-b border-line-2 w-8"><input type="checkbox" aria-label="Select all" checked={allChecked} onChange={(e) => setSel(e.target.checked ? shown.map((r) => r.path) : [])} /></th><th className="py-2.5 px-3 border-b border-line-2 w-[36%]">Name</th><th className="py-2.5 px-3 border-b border-line-2">Status</th><th className="py-2.5 px-3 border-b border-line-2">URL</th><th className="py-2.5 px-3 border-b border-line-2">Template</th><th className="py-2.5 px-3 border-b border-line-2">Updated</th><th className="border-b border-line-2" /></tr></thead>
          <tbody>{shown.map((n) => { const on = sel.includes(n.path); const editable = can("edit", n.path); const src = n.meta?.["ucp:sourcePath"] as string | undefined; return <tr key={n.path} className={`${on ? "bg-accent-soft/40" : "hover:bg-surface-2"}`}>
            <td className={cell}><input type="checkbox" aria-label={`Select ${n.title}`} checked={on} onChange={(e) => setSel(e.target.checked ? [...sel, n.path] : sel.filter((x) => x !== n.path))} /></td>
            {isFolder(n) ? <>
              <td className={cell}><Link href={`${base}/pages${rel(n.path)}`} className="font-medium flex items-center gap-2"><span className="text-warn">▪</span>{n.title}</Link></td><td className={`${cell} text-ink-3`}>folder</td><td className={`${cell} font-mono text-xs text-ink-2`}>{rel(n.path)}</td><td className={`${cell} text-ink-3`}>—</td><td className={`${cell} text-ink-3`}>—</td>
              <td className={`${cell} whitespace-nowrap text-right`}><Link className="btn btn-sm mr-1.5" href={`${base}/pages${rel(n.path)}`}>Open folder</Link><RowMenu page={n} canEdit={editable} onAction={onAction} /></td></>
            : <>
              <td className={cell}><Link href={`${base}/page${rel(n.path)}`} className="font-medium flex items-center gap-2"><span className="text-ink-3">▫</span>{n.title}{n.locale && n.locale !== "en-GB" && <span className="font-mono text-[11px] bg-surface-3 px-1.5 rounded">{n.locale}</span>}</Link>{src && <div className="text-[11.5px] text-ink-3 pl-5 mt-0.5">Source: <Link href={`${base}/page${rel(src)}`} className="font-mono hover:underline">{rel(src)}</Link></div>}</td><td className={cell}><Pill status={n.status} /></td><td className={`${cell} font-mono text-xs text-ink-2`}>{rel(n.path)}</td><td className={`${cell} text-ink-3`}>{tplName(n.template)}</td><td className={`${cell} text-ink-3`}>{n.lastModified?.slice(0, 10)}</td>
              <td className={`${cell} whitespace-nowrap text-right`}><Link className="btn btn-sm mr-1.5" href={`${base}/page${rel(n.path)}`}>Edit page</Link><RowMenu page={n} canEdit={editable} onAction={onAction} /></td></>}
          </tr>; })}</tbody></table>
          : <div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">{q ? "No pages match." : canEditHere ? <>This folder is empty. <button className="underline" onClick={() => { setParent(folder.path); openModal({ kind: "new" }); }}>Create the first page</button>.</> : "This folder is empty."}</div>}
        {rows.length > shown.length && <div className="flex items-center justify-center gap-3 py-4 text-[12.5px] text-ink-3">Showing {shown.length} of {rows.length}<button className="btn btn-sm" onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, rows.length - shown.length)} more</button></div>}
        {selected.length > 0 && <div className="sticky bottom-4 mt-4 flex items-center gap-2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] shadow-xl w-fit mx-auto z-20"><b>{selected.length} selected</b><span className="text-white/40">·</span>
          <button className={barBtn} style={barStyle} disabled={!selected.some((p) => !p.isFolder)} onClick={() => setModal({ kind: "translate", pages: selected.filter((p) => !p.isFolder) })}>🌐 Translate</button>
          {canEditSelected ? <><button className={barBtn} style={barStyle} onClick={() => { openModal({ kind: "move", pages: selected }); setParent(folder.path === root ? root : parentOf(folder.path)); }}>Move</button>
          <button className={barBtn} style={barStyle} onClick={() => remove(selected)}>Delete</button></> : <span className="text-white/60 text-[12px]">Move and delete need Edit on every selected item</span>}
          <button className={barBtn} style={{ ...barStyle, borderColor: "transparent", opacity: .75 }} onClick={() => setSel([])}>Clear</button></div>}
      </div>

      {modal?.kind === "new" && <ModalShell title="New page" onClose={() => setModal(null)} footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={!title.trim() || busy} onClick={create}>{busy ? "Creating…" : "Create and open"}</button></>}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <label className="col-span-2 text-xs text-ink-3">Page title<input autoFocus className={inputCls} value={title} onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }} placeholder="e.g. Regular saver" /></label>
          <label className="text-xs text-ink-3">Where should it live?<FolderSelect value={parent} onChange={setParent} root={root} marketName={marketName} tree={tree} rel={rel} /></label>
          <label className="text-xs text-ink-3">URL name<input className={`${inputCls} font-mono`} value={slug} onChange={(e) => setSlug(slugify(e.target.value))} /><span className="block mt-1 font-mono text-[11px]">{rel(parent)}/{slug || "…"}</span></label>
          <div className="col-span-2 text-xs text-ink-3">Template<div className="mt-1 grid grid-cols-5 gap-2">{templates.map((t) => <button type="button" key={t.id} onClick={() => setTpl(t.id)} className={`text-left border rounded-lg p-2.5 ${tpl === t.id ? "border-accent bg-accent-soft" : "border-line hover:border-ink-4"}`}><b className="block text-[12.5px] text-ink">{t.name}</b><small className="text-ink-3">{t.blocks.length} blocks</small></button>)}</div></div>
        </div><Err err={err} /></ModalShell>}

      {modal?.kind === "folder" && <ModalShell title="New folder" width={460} onClose={() => setModal(null)} footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={!title.trim() || busy} onClick={createFolder}>{busy ? "Creating…" : "Create folder"}</button></>}>
        <label className="text-xs text-ink-3">Folder name<input autoFocus className={inputCls} value={title} onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }} placeholder="e.g. Insurance" onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) createFolder(); }} /></label>
        <label className="block mt-3 text-xs text-ink-3">Where<FolderSelect value={parent} onChange={setParent} root={root} marketName={marketName} tree={tree} rel={rel} /></label>
        <div className="mt-2 font-mono text-[11px] text-ink-3">{rel(parent)}/{slug || "…"}</div><Err err={err} /></ModalShell>}

      {modal?.kind === "rename" && <ModalShell title={`Rename “${modal.page.title}”`} width={460} onClose={() => setModal(null)} footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={!title.trim() || busy} onClick={rename}>{busy ? "Saving…" : "Rename"}</button></>}>
        <label className="text-xs text-ink-3">New title<input autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) rename(); }} /></label>
        <div className="mt-2 text-[12px] text-ink-3">The URL <span className="font-mono">{rel(modal.page.path)}</span> stays the same.</div><Err err={err} /></ModalShell>}

      {modal?.kind === "move" && <ModalShell title={modal.pages.length === 1 ? `Move “${modal.pages[0].title}”` : `Move ${modal.pages.length} items`} width={460} onClose={() => setModal(null)} footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={move}>{busy ? "Moving…" : "Move here"}</button></>}>
        <label className="text-xs text-ink-3">Destination folder<FolderSelect value={parent} onChange={setParent} root={root} marketName={marketName} tree={tree} rel={rel} exclude={modal.pages.filter((p) => p.isFolder).map((p) => p.path)} /></label>
        <ul className="mt-3 text-[12.5px] text-ink-2 grid gap-1 max-h-[160px] overflow-auto">{modal.pages.map((p) => <li key={p.path} className="font-mono text-[12px]">{rel(p.path)} → {rel(parent)}/{p.name}</li>)}</ul><Err err={err} /></ModalShell>}

      {modal?.kind === "translate" && <TranslateModal pages={modal.pages} marketId={marketId} base={base} root={root} marketName={marketName} tree={tree} rel={rel} folderPath={folder.path} onClose={() => setModal(null)} onDone={() => { setSel([]); router.refresh(); }} />}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] z-50">{toast}</div>}
    </div>
  );
}
