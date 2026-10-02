"use client";
import Link from "next/link";
import { PublishDialog } from "@/components/pages/PublishDialog";
import { CompareView } from "@/components/pages/CompareView";
import { env } from "@/lib/markets";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/Confirm";
import { Steps } from "@/components/ui/Steps";
import { ModalShell as Dialog } from "@/components/models/ModalShell";
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
import { FolderTree } from "@/components/explorer/FolderTree";
import { FolderIcon, PageIcon } from "@/components/ui/Icons";

type Folder = { path: string; title: string };
type Props = { marketId: string; envId: string; root: string; marketName: string; flag: string; folder: Folder; items: PageSummary[]; tree: Folder[]; allPages: PageSummary[]; templates: Template[]; openNew?: boolean; newTemplate?: string };
/** Line icons for the selection bar (HSBC style: 1.8 stroke, round caps). */
const BAR_ICONS: Record<string, string[]> = {
  translate: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M3 12h18", "M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"],
  publish: ["M12 15V4", "M7.5 8.5 12 4l4.5 4.5", "M5 15v4h14v-4"],
  lock: ["M6 11h12v9H6z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3", "M12 15v2"],
  unlock: ["M6 11h12v9H6z", "M8.5 11V8a3.5 3.5 0 0 1 6.8-1.2", "M12 15v2"],
  copy: ["M9 9h11v11H9z", "M15 9V4H4v11h5"],
  compare: ["M4 5h7v14H4z", "M13 5h7v14h-7z", "M7 9h1M7 12h1M16 9h1M16 12h1"],
  restore: ["M4 12a8 8 0 1 0 2.4-5.7", "M4 4v4.5h4.5", "M12 8v4l2.5 2"],
  move: ["M3 6h6l2 2h10v11H3z", "M11 13.5h6", "M14.5 11l2.5 2.5-2.5 2.5"],
  delete: ["M5 7h14", "M10 11v6", "M14 11v6", "M6.5 7l1 13h9l1-13", "M9 7V4h6v3"],
};
const BarIcon = ({ n }: { n: keyof typeof BAR_ICONS }) => <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{BAR_ICONS[n].map((d) => <path key={d} d={d} />)}</svg>;
type LockInfo = { by: string; name: string; at: string };
const lockOf = (p: PageSummary): LockInfo | null => { const raw = p.meta?.["ucp:pageLock"]; if (typeof raw !== "string" || !raw) return null; try { return JSON.parse(raw) as LockInfo; } catch { return null; } };

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
type Modal =
  | { kind: "new" } | { kind: "folder" }
  | { kind: "rename"; page: PageSummary } | { kind: "move"; pages: PageSummary[] } | { kind: "copy"; pages: PageSummary[] }
  | { kind: "translate"; pages: PageSummary[] }
  | { kind: "publish"; pages: PageSummary[] };
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
/** The tick in the corner of a choice card (language, how, where). */
const Check = ({ on }: { on: boolean }) => <span aria-hidden className={`absolute top-2 right-2 w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold ${on ? "bg-accent text-white" : "border border-line-2 bg-surface"}`}>{on ? "✓" : ""}</span>;
function TranslateModal({ pages, marketId, base, root, marketName, tree, rel, folderPath, existing, onClose, onDone }: { pages: PageSummary[]; marketId: string; base: string; root: string; marketName: string; tree: Folder[]; rel: (p: string) => string; folderPath: string; existing: string[]; onClose: () => void; onDone: () => void }) {
  const mk = marketOf(marketId);
  const own = mk.locales.slice(1); const others = [...new Set(MARKETS.flatMap((m) => m.locales))].filter((l) => !mk.locales.includes(l));
  const flagOf = (l: string) => MARKETS.find((m) => m.locales.includes(l))?.flag ?? "";
  const nameOf = (l: string) => { try { return new Intl.DisplayNames(["en"], { type: "language" }).of(l.split("-")[0]) ?? l; } catch { return l; } };
  const whereOf = (l: string) => MARKETS.find((m) => m.locales.includes(l))?.name.replace(/^HSBC /, "") ?? "";
  const [step, setStep] = useState(0); // 0 languages · 1 how · 2 where · 3 check
  const [langs, setLangs] = useState<string[]>(own[0] ? [own[0]] : []);
  const [mode, setMode] = useState<"ai" | "vendor">("ai");
  const [dest, setDest] = useState<"same" | "folder">("same"); const [destFolder, setDestFolder] = useState(folderPath);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [created, setCreated] = useState<string[] | null>(null);
  /* what each choice creates (a page that already has that translation is skipped) */
  const plan = langs.flatMap((l) => pages.map((p) => { const parent = dest === "folder" ? destFolder : p.path.replace(/\/[^/]+$/, ""); const path = `${parent}/${l.split("-")[0]}-${p.name}`; return { l, p, path, exists: existing.includes(path) }; }));
  const doneFor = (l: string) => pages.filter((p) => existing.includes(`${p.path.replace(/\/[^/]+$/, "")}/${l.split("-")[0]}-${p.name}`)).length;
  const toCreate = plan.filter((x) => !x.exists).length;
  async function go() {
    setBusy(true); setErr(null);
    try { const r = await ucpApi.translate(marketId, { pages: pages.map((p) => p.path), langs, review: true, dest: dest === "folder" ? destFolder : undefined, mode }); setCreated(r.created); onDone(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }
  const card = (on: boolean) => `relative text-left rounded-lg border px-3 py-2.5 transition-colors ${on ? "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent)]" : "border-line bg-surface hover:border-ink-4 hover:bg-surface-2"}`;
  const lang = (l: string) => { const on = langs.includes(l); const d = doneFor(l); const all = d === pages.length;
    return <button type="button" key={l} disabled={all} aria-pressed={on} onClick={() => setLangs(on ? langs.filter((x) => x !== l) : [...langs, l])} className={`${card(on)} disabled:opacity-50 disabled:cursor-not-allowed`}>
      <Check on={on} /><span className="flex items-center gap-2 pr-6"><span className="text-[18px] leading-none">{flagOf(l)}</span><b className="text-[13.5px]">{nameOf(l)}</b></span>
      <span className="block text-[11.5px] text-ink-3 mt-0.5">{l}{whereOf(l) ? ` · ${whereOf(l)}` : ""}{all ? " · already translated" : d ? ` · ${d} of ${pages.length} done` : ""}</span></button>; };

  if (created) { const made = created.filter((c) => !c.endsWith("(exists)")); return <Dialog title="Translations created" subtitle={`${made.length} new page${made.length === 1 ? "" : "s"} · waiting in the review Backlog`} width={560} onClose={onClose}
    footer={<><button className="btn" onClick={onClose}>Close</button>{made[0] && <Link className="btn btn-primary" href={`${base}/page${rel(made[0])}`}>Open the first one</Link>}</>}>
    <ul className="grid gap-1.5">{created.map((c) => { const p = c.replace(/ \(exists\)$/, ""); const skip = c.endsWith("(exists)"); return <li key={c} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] ${skip ? "border-line bg-surface-2 text-ink-3" : "border-line"}`}>
      <span className={`w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold ${skip ? "bg-surface-3 text-ink-3" : "bg-good text-white"}`}>{skip ? "–" : "✓"}</span>
      <Link href={`${base}/page${rel(p)}`} className="font-mono text-[12px] hover:underline truncate flex-1">{rel(p)}</Link>{skip ? <span className="text-[11.5px]">already existed</span> : <span className="text-[11.5px] text-ink-3">In the Backlog</span>}</li>; })}</ul>
  </Dialog>; }

  const labels = ["Languages", "How", "Where", "Check"];
  const next = <button className="btn btn-primary" disabled={(step === 0 && !langs.length) || (step === 3 && (!toCreate || busy))} onClick={() => (step < 3 ? setStep(step + 1) : void go())}>
    {step === 0 ? "Next: how to translate" : step === 1 ? "Next: where to put them" : step === 2 ? "Next: check" : busy ? "Creating…" : `Create ${toCreate} translation${toCreate === 1 ? "" : "s"}`}</button>;
  return <Dialog title={pages.length === 1 ? `Translate “${pages[0].title}”` : `Translate ${pages.length} pages`} subtitle={`From ${nameOf(mk.locales[0])} (${mk.locales[0]}) · ${marketName}`} width={600} onClose={onClose}
    footer={<>{step > 0 ? <button className="btn mr-auto" onClick={() => setStep(step - 1)}>Back</button> : null}<button className="btn" onClick={onClose}>Cancel</button>{next}</>}>
    <Steps labels={labels} current={step} onGo={setStep} />
    {step === 0 && <div>
      {own.length > 0 && <><b className="block text-[11px] uppercase tracking-[.06em] text-ink-3 mb-1.5">Languages of {marketName}</b><div className="grid grid-cols-2 gap-2 mb-4">{own.map(lang)}</div></>}
      <b className="block text-[11px] uppercase tracking-[.06em] text-ink-3 mb-1.5">Other markets</b><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{others.map(lang)}</div>
      <p className="mt-3 text-[12.5px] text-ink-2">{langs.length ? <>{langs.length} language{langs.length === 1 ? "" : "s"} × {pages.length} page{pages.length === 1 ? "" : "s"} = <b>{langs.length * pages.length}</b> translation{langs.length * pages.length === 1 ? "" : "s"}</> : "Pick at least one language."}</p>
    </div>}
    {step === 1 && <div role="radiogroup" aria-label="How to translate" className="grid gap-2">
      {([["ai", "AI draft now", "A first draft appears straight away. Rates, product names, links and regulatory wording stay as they are."], ["vendor", "Send to the translation vendor", "Professional translators work on it; the pages are created now and filled in when they deliver."]] as const).map(([k, t, d]) =>
        <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)} className={card(mode === k)}><Check on={mode === k} /><b className="block text-[13.5px] pr-6">{t}</b><span className="block text-[12.5px] text-ink-3 mt-0.5">{d}</span></button>)}
    </div>}
    {step === 2 && <div role="radiogroup" aria-label="Where to put them" className="grid gap-2">
      <button type="button" role="radio" aria-checked={dest === "same"} onClick={() => setDest("same")} className={card(dest === "same")}><Check on={dest === "same"} /><b className="block text-[13.5px] pr-6">Next to each source page</b><span className="block text-[12.5px] text-ink-3 mt-0.5 font-mono">{rel(pages[0].path)} → …/{(langs[0] ?? "xx").split("-")[0]}-{pages[0].name}</span></button>
      <div className={card(dest === "folder")}><button type="button" role="radio" aria-checked={dest === "folder"} onClick={() => setDest("folder")} className="text-left w-full"><Check on={dest === "folder"} /><b className="block text-[13.5px] pr-6">In one folder</b><span className="block text-[12.5px] text-ink-3 mt-0.5">All translations together, e.g. a language section.</span></button>
        {dest === "folder" && <div className="mt-2"><FolderSelect value={destFolder} onChange={setDestFolder} root={root} marketName={marketName} tree={tree} rel={rel} /></div>}</div>
    </div>}
    {step === 3 && <div>
      <ul className="grid gap-1.5 max-h-[260px] overflow-auto">{plan.map((x) => <li key={x.path} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] ${x.exists ? "border-line bg-surface-2 text-ink-3" : "border-line"}`}>
        <span className="text-[16px] leading-none">{flagOf(x.l)}</span><span className="min-w-0 flex-1"><b className="block font-semibold truncate">{x.p.title}</b><span className="block font-mono text-[11.5px] text-ink-3 truncate">{rel(x.path)}</span></span>
        {x.exists ? <span className="text-[11.5px]">already exists · skipped</span> : <span className="text-[11.5px] rounded-full bg-accent-soft text-accent font-semibold px-2 py-0.5">{nameOf(x.l)}</span>}</li>)}</ul>
      <p className="mt-3 flex items-start gap-2 text-[12.5px] text-ink-2 bg-surface-2 rounded-md px-3 py-2"><span aria-hidden>ⓘ</span><span>{mode === "ai" ? "AI drafts" : "Pages for the vendor"} go to the review <b>Backlog</b>. Like any page, they need the author&apos;s review and the business review before they can be published.</span></p>
    </div>}
    <Err err={err} />
  </Dialog>;
}

/* ---------------- explorer ---------------- */
export function Explorer({ marketId, envId, root, marketName, flag, folder, items, tree, allPages, templates, openNew, newTemplate }: Props) {
  const router = useRouter(); const ask = useConfirm();
  const { can } = useSession();
  const base = `/${marketId}/${envId}`;
  const rel = (p: string) => p.replace(root, "") || "/";
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE); const [seenKey, setSeenKey] = useState(q + "|" + folder.path); if (seenKey !== q + "|" + folder.path) { setSeenKey(q + "|" + folder.path); setLimit(PAGE); }
  const canEditHere = can("edit", folder.path);
  const [modal, setModal] = useState<Modal | null>(openNew ? { kind: "new" } : null);
  const [comparing, setComparing] = useState<string | null>(null); // page path shown in Compare with live
  /* Move: pages that link to what is moving, and whether their links follow it */
  const [moveRefs, setMoveRefs] = useState<{ path: string; linkedFrom: { path: string; title: string }[] }[] | null>(null); const [relink, setRelink] = useState(true);
  const movingKey = modal?.kind === "move" ? modal.pages.map((p) => p.path).join("|") : "";
  useEffect(() => { if (!movingKey) return; let on = true; ucpApi.pageReferences(marketId, movingKey.split("|")).then((r) => on && setMoveRefs(r), () => on && setMoveRefs([])); return () => { on = false; setMoveRefs(null); }; }, [movingKey, marketId]);
  const moveLinked = [...new Map((moveRefs ?? []).flatMap((r) => r.linkedFrom).map((x) => [x.path, x])).values()];
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
    if (modal?.kind !== "move") return;
    const moving = modal.pages.filter((p) => parentOf(p.path) !== parent); if (!moving.length) { setModal(null); say("They are already in that folder"); return; }
    const live = moving.filter((p) => p.status === "published" || allPages.some((x) => x.path.startsWith(p.path + "/") && x.status === "published"));
    if (!(await ask({ title: moving.length === 1 ? `Move “${moving[0].title}” to ${rel(parent)}?` : `Move ${moving.length} items to ${rel(parent)}?`, confirmLabel: "Move",
      body: <ul className="list-disc pl-5 grid gap-1">
        <li>{moving.length === 1 ? "Its address changes" : "Their addresses change"} (see below){moving.some((p) => p.isFolder) ? ", and so do the addresses of every page inside" : ""}.</li>
        {live.length > 0 && <li className="text-crit"><b>{live.length} live {live.length === 1 ? "page gets" : "pages get"} a new address</b> for customers · old bookmarks and search results stop working.</li>}
        {moveLinked.length > 0 && <li>{relink ? `Links on ${moveLinked.length} page${moveLinked.length === 1 ? " are" : "s are"} updated to the new address.` : <span className="text-warn">Links on {moveLinked.length} page{moveLinked.length === 1 ? "" : "s"} will stop working (you chose not to update them).</span>}</li>}
        <li>Content, status and history stay as they are.</li></ul>,
      items: moving.map((p) => ({ label: p.title, note: `${rel(p.path)} → ${rel(parent)}/${p.name}`, warn: live.includes(p) })) }))) return;
    setBusy(true); setErr(null);
    try { let n = 0; for (const p of modal.pages) { if (parentOf(p.path) === parent) continue; const to = `${parent}/${p.name}`; await repoApi.movePage(p.path, to); n++; const from = moveRefs?.find((r) => r.path === p.path); if (relink && from?.linkedFrom.length) await ucpApi.relinkPages(marketId, p.path, to, from.linkedFrom.map((x) => x.path)).catch(() => {}); } setModal(null); setSel([]); say(n ? `Moved ${n} item${n === 1 ? "" : "s"} to ${rel(parent)}` : "Nothing to move"); router.refresh(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }
  /** Copy to another folder (or the same one, as “… (copy)”). */
  async function copyTo() {
    if (modal?.kind !== "copy") return;
    const copying = modal.pages.filter((x) => !isFolder(x));
    if (!(await ask({ title: copying.length === 1 ? `Copy “${copying[0].title}” to ${rel(parent)}?` : `Copy ${copying.length} pages to ${rel(parent)}?`, confirmLabel: "Copy",
      body: <ul className="list-disc pl-5 grid gap-1"><li>New pages are created with the same blocks and texts.</li><li>The copies start as <b>drafts</b>: they need review before they can go live.</li><li>The originals do not change.</li></ul>,
      items: copying.map((p) => ({ label: p.title, note: `→ ${rel(parent)}/${parentOf(p.path) === parent ? p.name + "-copy" : p.name}` })) }))) return;
    setBusy(true); setErr(null);
    try {
      let n = 0; const names = (await repoApi.children(parent, 0, 500)).items.map((x) => x.name);
      for (const p of modal.pages.filter((x) => !isFolder(x))) {
        const full = await repoApi.getPage(p.path); const same = parentOf(p.path) === parent; let name = same ? `${p.name}-copy` : p.name; let i = 2; while (names.includes(name)) name = `${same ? `${p.name}-copy` : p.name}-${i++}`; names.push(name);
        await repoApi.createPage({ parentPath: parent, name, template: p.template ?? "blank", title: same ? `${p.title} (copy)` : p.title, components: full?.components ?? [] }); n++;
      }
      setModal(null); setSel([]); say(n ? `Copied ${n} page${n === 1 ? "" : "s"} to ${rel(parent)}` : "Folders are not copied · pick pages"); router.refresh();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }
  /** Lock (nobody else can change, move or delete it) or unlock the selected pages. */
  async function setLock(pages: PageSummary[], locked: boolean) {
    const list = pages.filter((p) => !isFolder(p));
    if (!(await ask({ title: `${locked ? "Lock" : "Unlock"} ${list.length === 1 ? `“${list[0].title}”` : `${list.length} pages`}?`, confirmLabel: locked ? "Lock" : "Unlock",
      body: locked ? <ul className="list-disc pl-5 grid gap-1"><li>Only you and site admins can change, move or delete {list.length === 1 ? "it" : "them"}.</li><li>Others can still open {list.length === 1 ? "it" : "them"}; reviews and publishing go on.</li><li>Unlock any time from here.</li></ul>
        : <ul className="list-disc pl-5 grid gap-1"><li>Everyone with Edit can change, move and delete {list.length === 1 ? "it" : "them"} again.</li></ul>,
      items: list.map((p) => ({ label: p.title, note: rel(p.path) })) }))) return;
    try { const r = await ucpApi.lockPages(marketId, pages.filter((p) => !isFolder(p)).map((p) => p.path), locked); say(`${locked ? "Locked" : "Unlocked"} ${r.changed} page${r.changed === 1 ? "" : "s"}`); setSel([]); router.refresh(); }
    catch (e) { say(errText(e)); }
  }
  /** Restore each selected page to its last saved version (the current state is kept as a version first). */
  async function restoreLast(pages: PageSummary[]) {
    const list = pages.filter((p) => !isFolder(p)); const found: { p: PageSummary; v: { id: string; time: string; note: string } }[] = [];
    for (const p of list) { const vs = await ucpApi.versions(p.path).catch(() => []); const v = [...vs].sort((a, b) => b.time.localeCompare(a.time))[0]; if (v) found.push({ p, v }); }
    if (!found.length) { say("No saved versions to go back to"); return; }
    const when = (t: string) => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    if (!(await ask({ title: found.length === 1 ? `Restore “${found[0].p.title}”?` : `Restore ${found.length} pages?`, confirmLabel: "Restore",
      body: <>Each page goes back to its last saved version. What is there now is kept in Version history, so you can undo this.{found.length < list.length ? <> {list.length - found.length} page{list.length - found.length === 1 ? " has" : "s have"} no saved version and stay{list.length - found.length === 1 ? "s" : ""} as {list.length - found.length === 1 ? "it is" : "they are"}.</> : null}</>,
      items: found.map(({ p, v }) => ({ label: p.title, note: `version from ${when(v.time)}${v.note ? ` · ${v.note}` : ""}` })) }))) return;
    try { for (const { p, v } of found) await ucpApi.restoreVersion(marketId, p.path, v.id); say(`Restored ${found.length} page${found.length === 1 ? "" : "s"}`); setSel([]); router.refresh(); }
    catch (e) { say(errText(e)); }
  }
  async function duplicate(p: PageSummary) {
    if (!(await ask({ title: `Duplicate “${p.title}”?`, confirmLabel: "Duplicate", body: <ul className="list-disc pl-5 grid gap-1"><li>A copy called <b>“{p.title} (copy)”</b> appears in the same folder.</li><li>It starts as a draft; the original does not change.</li></ul> }))) return;
    try { const full = await repoApi.getPage(p.path); const siblings = (await repoApi.children(parentOf(p.path), 0, 200)).items.map((x) => x.name); let name = `${p.name}-copy`; let i = 2; while (siblings.includes(name)) name = `${p.name}-copy-${i++}`;
      await repoApi.createPage({ parentPath: parentOf(p.path), name, template: p.template ?? "blank", title: `${p.title} (copy)`, components: full?.components ?? [] }); say(`Duplicated “${p.title}”`); router.refresh(); }
    catch (e) { say(errText(e)); }
  }
  async function remove(pages: PageSummary[]) {
    /* what goes with each item: pages inside folders, and which of them are live for customers */
    const inside = (p: PageSummary) => allPages.filter((x) => x.path.startsWith(`${p.path}/`) && !x.isFolder);
    const info = pages.map((p) => { const kids = inside(p); const live = [...(p.isFolder ? [] : [p]), ...kids].filter((x) => x.status === "published").length; return { p, kids: kids.length, live }; });
    const live = info.reduce((n, x) => n + x.live, 0); const kids = info.reduce((n, x) => n + x.kids, 0);
    const one = pages.length === 1 ? pages[0] : null;
    const refs = await ucpApi.pageReferences(marketId, pages.filter((p) => !p.isFolder).map((p) => p.path)).catch(() => []);
    const linked = [...new Map(refs.flatMap((r) => r.linkedFrom).map((x) => [x.path, x])).values()];
    const lonely = [...new Map(refs.flatMap((r) => r.files.filter((f) => f.onlyHere && f.path)).map((f) => [f.id, f])).values()];
    let dropFiles: string[] = [];
    const ok = await ask({
      also: linked.length ? { title: `${linked.length} page${linked.length === 1 ? " links" : "s link"} here`, hint: "Their links will stop working. Update them after deleting.", list: linked.map((x) => ({ label: x.title, note: rel(x.path) })) } : undefined,
      choices: lonely.length ? { title: "Files used only here", hint: "Tick the ones to delete too. Unticked files stay in Assets.", list: lonely.map((f) => ({ id: f.path!, label: f.name, note: f.status === "published" ? "published" : "not published" })) } : undefined,
      onChoose: (ids) => { dropFiles = ids; },
      title: one ? `Delete ${one.isFolder ? "folder" : "page"} “${one.title}”?` : `Delete ${pages.length} items?`, danger: true, confirmLabel: one ? `Delete ${one.isFolder ? "folder" : "page"}` : `Delete ${pages.length} items`,
      body: <>{kids > 0 ? <>Everything inside {one ? "this folder" : "the selected folders"} is deleted too: <b>{kids} page{kids === 1 ? "" : "s"}</b>. </> : null}{live > 0 ? <><b className="text-crit">{live} live page{live === 1 ? " goes" : "s go"} offline</b> for customers. </> : null}This cannot be undone.</>,
      items: info.map(({ p, kids: k, live: l }) => ({ label: p.title, note: [p.isFolder ? `folder · ${k} page${k === 1 ? "" : "s"}` : rel(p.path), l ? `${l} live` : ""].filter(Boolean).join(" · "), warn: l > 0 })),
      typeToConfirm: live > 0 || kids > 0 ? "delete" : undefined,
    });
    if (!ok) return;
    try { for (const p of pages) await repoApi.deletePage(p.path, true); for (const f of dropFiles) await repoApi.deleteNode(f, { text: `deleted ${f.split("/").pop()} (with the page)`, target: "assets" }).catch(() => {}); setSel([]); say(`Deleted ${pages.length} item${pages.length === 1 ? "" : "s"}${dropFiles.length ? ` and ${dropFiles.length} file${dropFiles.length === 1 ? "" : "s"}` : ""}`); router.refresh(); }
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
  const barBtn = "btn btn-sm gap-1.5 hover:brightness-125"; const barStyle = { background: "transparent", borderColor: "rgba(255,255,255,.3)", color: "#fff" } as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] grid-rows-[auto_1fr] md:grid-rows-1 h-full min-h-0">
      <aside className="bg-surface border-b md:border-b-0 md:border-r border-line p-3 md:overflow-auto">
        <details className="md:hidden" open={false}><summary className="text-[13px] font-semibold text-ink-2 cursor-pointer py-1">📁 Folders</summary><div className="mt-2"><FolderTree root={root} marketName={marketName} flag={flag} base={base} current={folder.path} folders={tree} /></div></details>
        <div className="hidden md:block"><h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold mx-2 mb-2">Folders</h6><FolderTree root={root} marketName={marketName} flag={flag} base={base} current={folder.path} folders={tree} /></div>
      </aside>
      <div className="p-4 md:p-6 overflow-auto min-w-0 relative">
        <div className="text-[13px] text-ink-3 mb-2 flex gap-1.5 flex-wrap"><Link href={`${base}/pages`} className="hover:text-ink">{marketName}</Link>{crumbs.map((c, i) => <span key={c.path}><span className="text-ink-4"> / </span>{i === crumbs.length - 1 ? <b className="text-ink">{c.name}</b> : <Link href={`${base}/pages${rel(c.path)}`} className="hover:text-ink">{c.name}</Link>}</span>)}</div>
        <div className="flex flex-wrap items-end gap-3 md:gap-4 mb-5"><div><h1 className="text-2xl font-semibold">{q ? `Search results for “${q}”` : folder.title}</h1><p className="text-[13px] text-ink-3 mt-1 font-mono">{q ? `${plural(rows.length, "page")} match` : `${rel(folder.path)} · ${plural(items.filter(isFolder).length, "folder")} · ${plural(items.filter((i) => !isFolder(i)).length, "page")}`}</p></div>
          <div className="ml-auto flex flex-wrap gap-2 items-center">{canEditHere ? <><button className="btn" onClick={() => { setParent(folder.path); openModal({ kind: "folder" }); }}>＋ New folder</button><button className="btn btn-primary" onClick={() => { setParent(folder.path); openModal({ kind: "new" }); }}>＋ New page</button></> : <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 bg-surface-3 border border-line rounded-full px-3 py-1.5" title="You don't have Edit on this folder. Ask a site admin."><span aria-hidden="true">🔒</span>Read-only in this folder</span>}</div></div>
        <div className="flex gap-2 mb-3.5"><label className="flex items-center gap-2 bg-surface border border-line-2 rounded-lg px-2.5 py-1.5 min-w-[280px]"><span className="text-ink-3">⌕</span><input className="flex-1 outline-none text-[13.5px]" placeholder="Find a page by title or URL" value={q} onChange={(e) => setQ(e.target.value)} /></label></div>
        {rows.length ? <div className="overflow-auto -mx-4 md:mx-0 px-4 md:px-0"><table className="w-full text-[13.5px] [&_tr>*:nth-child(4)]:hidden md:[&_tr>*:nth-child(4)]:table-cell [&_tr>*:nth-child(5)]:hidden xl:[&_tr>*:nth-child(5)]:table-cell [&_tr>*:nth-child(6)]:hidden xl:[&_tr>*:nth-child(6)]:table-cell"><thead><tr className="text-left text-[11.5px] uppercase tracking-[.06em] text-ink-3"><th className="py-2.5 px-3 border-b border-line-2 w-8"><input type="checkbox" aria-label="Select all" checked={allChecked} onChange={(e) => setSel(e.target.checked ? shown.map((r) => r.path) : [])} /></th><th className="py-2.5 px-3 border-b border-line-2 md:w-[36%]">Name</th><th className="py-2.5 px-3 border-b border-line-2">Status</th><th className="py-2.5 px-3 border-b border-line-2">URL</th><th className="py-2.5 px-3 border-b border-line-2">Template</th><th className="py-2.5 px-3 border-b border-line-2">Updated</th><th className="border-b border-line-2" /></tr></thead>
          <tbody>{shown.map((n) => { const on = sel.includes(n.path); const editable = can("edit", n.path); const src = n.meta?.["ucp:sourcePath"] as string | undefined; return <tr key={n.path} className={`${on ? "bg-accent-soft/40" : "hover:bg-surface-2"}`}>
            <td className={cell}><input type="checkbox" aria-label={`Select ${n.title}`} checked={on} onChange={(e) => setSel(e.target.checked ? [...sel, n.path] : sel.filter((x) => x !== n.path))} /></td>
            {isFolder(n) ? <>
              <td className={cell}><Link href={`${base}/pages${rel(n.path)}`} className="font-medium flex items-center gap-2"><FolderIcon />{n.title}</Link></td><td className={`${cell} text-ink-3`}>folder</td><td className={`${cell} font-mono text-xs text-ink-2`}>{rel(n.path)}</td><td className={`${cell} text-ink-3`}>—</td><td className={`${cell} text-ink-3`}>—</td>
              <td className={`${cell} whitespace-nowrap text-right`}><Link className="btn btn-sm mr-1.5" href={`${base}/pages${rel(n.path)}`}><span className="hidden sm:inline">Open folder</span><span className="sm:hidden">Open</span></Link><RowMenu page={n} canEdit={editable} onAction={onAction} /></td></>
            : <>
              <td className={cell}><Link href={`${base}/page${rel(n.path)}`} className="font-medium flex items-center gap-2"><PageIcon />{n.title}{lockOf(n) && <span className="inline-flex items-center text-ink-3" title={`Locked by ${lockOf(n)!.name}`} aria-label={`Locked by ${lockOf(n)!.name}`}><BarIcon n="lock" /></span>}{n.locale && n.locale !== "en-GB" && <span className="font-mono text-[11px] bg-surface-3 px-1.5 rounded">{n.locale}</span>}</Link>{src && <div className="text-[11.5px] text-ink-3 pl-5 mt-0.5">Source: <Link href={`${base}/page${rel(src)}`} className="font-mono hover:underline">{rel(src)}</Link></div>}</td><td className={cell}><Pill status={n.status} /></td><td className={`${cell} font-mono text-xs text-ink-2`}>{rel(n.path)}</td><td className={`${cell} text-ink-3`}>{tplName(n.template)}</td><td className={`${cell} text-ink-3`}>{n.lastModified?.slice(0, 10)}</td>
              <td className={`${cell} whitespace-nowrap text-right`}><Link className="btn btn-sm mr-1.5" href={`${base}/page${rel(n.path)}`}><span className="hidden sm:inline">Edit page</span><span className="sm:hidden">Edit</span></Link><RowMenu page={n} canEdit={editable} onAction={onAction} /></td></>}
          </tr>; })}</tbody></table></div>
          : <div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">{q ? "No pages match." : canEditHere ? <>This folder is empty. <button className="underline" onClick={() => { setParent(folder.path); openModal({ kind: "new" }); }}>New page</button>.</> : "This folder is empty."}</div>}
        {rows.length > shown.length && <div className="flex items-center justify-center gap-3 py-4 text-[12.5px] text-ink-3">Showing {shown.length} of {rows.length}<button className="btn btn-sm" onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, rows.length - shown.length)} more</button></div>}
        {selected.length > 0 && <div className="sticky bottom-4 mt-4 flex flex-wrap items-center justify-center gap-2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] shadow-xl w-fit max-w-full mx-auto z-20"><b className="whitespace-nowrap">{selected.length} selected</b><span className="text-white/40">·</span>
          <button className={barBtn} style={barStyle} disabled={!selected.some((p) => !p.isFolder)} onClick={() => setModal({ kind: "translate", pages: selected.filter((p) => !p.isFolder) })}><BarIcon n="translate" />Translate</button>
          <button className={barBtn} style={barStyle} disabled={!selected.some((p) => !p.isFolder)} onClick={() => setModal({ kind: "publish", pages: selected.filter((p) => !p.isFolder) })}><BarIcon n="publish" />Publish</button>
          {canEditSelected ? <>{(() => { const pagesSel = selected.filter((p) => !p.isFolder); const allLocked = pagesSel.length > 0 && pagesSel.every((p) => lockOf(p)); return <button className={barBtn} style={barStyle} disabled={!pagesSel.length} onClick={() => void setLock(pagesSel, !allLocked)} title={allLocked ? "Let people change these pages again" : "Nobody else can change, move or delete them until they are unlocked"}><BarIcon n={allLocked ? "unlock" : "lock"} />{allLocked ? "Unlock" : "Lock"}</button>; })()}
          <button className={barBtn} style={barStyle} disabled={!selected.some((p) => !p.isFolder)} onClick={() => { openModal({ kind: "copy", pages: selected.filter((p) => !p.isFolder) }); setParent(folder.path); }} title="Copy the pages to a folder"><BarIcon n="copy" />Copy</button>
          <button className={barBtn} style={barStyle} disabled={!selected.some((p) => !p.isFolder)} onClick={() => void restoreLast(selected)} title="Go back to the last saved version"><BarIcon n="restore" />Restore</button>
          {(() => { const one = selected.length === 1 && !selected[0].isFolder ? selected[0] : null; const live = !!one && (one.status === "published" || typeof one.meta?.["ucp:liveComponents"] === "string" || typeof one.meta?.["ucp:publishedAt"] === "string");
            return <button className={barBtn} style={barStyle} disabled={!live} onClick={() => one && setComparing(one.path)} title={!one ? "Pick one page to compare" : live ? "Compare an authoring version with the live page" : "Not published yet · nothing to compare"}><BarIcon n="compare" />Compare</button>; })()}
          <span className="w-px h-5 bg-white/20" aria-hidden />
          <button className={barBtn} style={barStyle} onClick={() => { openModal({ kind: "move", pages: selected }); setParent(folder.path === root ? root : parentOf(folder.path)); }}><BarIcon n="move" />Move</button>
          <button className={barBtn} style={barStyle} onClick={() => remove(selected)}><BarIcon n="delete" />Delete</button></> : <span className="text-white/60 text-[12px]">Lock, copy, restore, move and delete need Edit on every selected item</span>}
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

      {comparing && <CompareView marketId={marketId} marketName={marketName} path={comparing} onClose={() => setComparing(null)} />}
      {modal?.kind === "copy" && <ModalShell title={modal.pages.length === 1 ? `Copy “${modal.pages[0].title}”` : `Copy ${modal.pages.length} pages`} width={460} onClose={() => setModal(null)} footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={copyTo}>{busy ? "Copying…" : "Copy here"}</button></>}>
        <label className="text-xs text-ink-3">Copy to folder<FolderSelect value={parent} onChange={setParent} root={root} marketName={marketName} tree={tree} rel={rel} exclude={[]} /></label>
        <p className="mt-2 text-[12px] text-ink-3">The copies start as drafts with the same components. In the same folder they are named “… (copy)”.</p>
        <ul className="mt-2 text-[12.5px] text-ink-2 grid gap-1 max-h-[160px] overflow-auto">{modal.pages.map((p) => <li key={p.path} className="font-mono text-[12px]">{rel(p.path)} → {rel(parent)}/{p.name}{parentOf(p.path) === parent ? "-copy" : ""}</li>)}</ul><Err err={err} /></ModalShell>}
      {modal?.kind === "move" && <ModalShell title={modal.pages.length === 1 ? `Move “${modal.pages[0].title}”` : `Move ${modal.pages.length} items`} width={460} onClose={() => setModal(null)} footer={<><button className="btn" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={move}>{busy ? "Moving…" : "Move here"}</button></>}>
        <label className="text-xs text-ink-3">Destination folder<FolderSelect value={parent} onChange={setParent} root={root} marketName={marketName} tree={tree} rel={rel} exclude={modal.pages.filter((p) => p.isFolder).map((p) => p.path)} /></label>
        <ul className="mt-3 text-[12.5px] text-ink-2 grid gap-1 max-h-[160px] overflow-auto">{modal.pages.map((p) => <li key={p.path} className="font-mono text-[12px]">{rel(p.path)} → {rel(parent)}/{p.name}</li>)}</ul>
        {moveLinked.length > 0 && <div className="mt-3 rounded-lg border border-warn/30 bg-warn-soft/40 p-3"><b className="block text-[13px]">{moveLinked.length} page{moveLinked.length === 1 ? " links" : "s link"} here</b>
          <ul className="mt-1 grid gap-0.5 text-[12.5px] max-h-[110px] overflow-auto">{moveLinked.map((x) => <li key={x.path} className="flex gap-2"><span className="truncate flex-1">{x.title}</span><span className="font-mono text-[11.5px] text-ink-3">{rel(x.path)}</span></li>)}</ul>
          <label className="mt-2 flex items-center gap-2 text-[12.5px] cursor-pointer"><input type="checkbox" className="accent-[var(--accent)]" checked={relink} onChange={(e) => setRelink(e.target.checked)} />Update their links to the new address</label></div>}
        <Err err={err} /></ModalShell>}

      {modal?.kind === "publish" && <PublishDialog marketId={marketId} envName={env(envId).name} pages={modal.pages.map((p) => ({ path: p.path, title: p.title, status: p.status, publishAt: typeof p.meta?.["ucp:publishAt"] === "string" ? String(p.meta["ucp:publishAt"]) : undefined }))} mayPublish={(path) => can("publish", path)} onClose={() => setModal(null)}
        onDone={(r, m) => { const n = r.filter((x) => x.ok).length; say(n ? `${m === "schedule" ? "Scheduled" : m === "cancel" ? "Unscheduled" : "Published"} ${n} page${n === 1 ? "" : "s"}${n < modal.pages.length ? ` · ${modal.pages.length - n} skipped` : ""}` : "Nothing was published"); if (r.length && r.every((x) => x.ok) && n === modal.pages.length) setModal(null); setSel([]); router.refresh(); }} />}
      {modal?.kind === "translate" && <TranslateModal pages={modal.pages} marketId={marketId} base={base} root={root} marketName={marketName} tree={tree} rel={rel} folderPath={folder.path} existing={allPages.map((p) => p.path)} onClose={() => setModal(null)} onDone={() => { setSel([]); router.refresh(); }} />}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] z-50">{toast}</div>}
    </div>
  );
}
