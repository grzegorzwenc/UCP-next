"use client";
import Link from "next/link";
import { PublishDialog } from "@/components/pages/PublishDialog";
import { CompareView } from "@/components/pages/CompareView";
import { env } from "@/lib/markets";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/Confirm";
import { Steps } from "@/components/ui/Steps";
import { ModalShell as Dialog } from "@/components/models/ModalShell";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { PageSummary } from "@/lib/api/types";
import { repoApi, ucpApi } from "@/lib/api";
import { errorText as errText } from "@/lib/api/errors";
import { ukDateTime } from "@/lib/dates";
import { Archive, ChevronRight, Copy, EllipsisVertical, ExternalLink, FolderInput, Link as LinkIcon, Lock, Pencil, Plus, Search, Trash2, Type, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/shadcn/dropdown-menu";
import { FolderTiles, PageCard, ViewToggle, type View } from "@/components/explorer/PagesViews";
import { LocationSelect, type FolderOption } from "@/components/explorer/LocationSelect";
import { FilterChips, MultiFilter, QuickChips, RangeFilter, SortHeader } from "@/components/explorer/PagesFilters";
import { PageThumb } from "@/components/explorer/PageThumb";
import { NewFolderButton } from "@/components/ui/NewFolderButton";
import { inRange, rangeActive, sortRows, type Range, type Sort } from "@/lib/pages-filter";
import { STATUS_LABEL } from "@/components/ui/Pill";
import { Dialog as UIDialog, DialogContent as UIDialogContent, DialogFooter as UIDialogFooter, DialogHeader as UIDialogHeader, DialogTitle as UIDialogTitle } from "@/components/shadcn/dialog";
import { useSession } from "@/components/shell/Session";
import type { Template } from "@/lib/ucp/types";
import { MARKETS, market as marketOf } from "@/lib/markets";
import { makeBlock } from "@/lib/blocks/registry";
import { blocksToComponents } from "@/lib/repo/mapping";
import { Pill } from "@/components/ui/Pill";
import { FolderTree } from "@/components/explorer/FolderTree";
import { FolderIcon, PageIcon } from "@/components/ui/Icons";

type Folder = { path: string; title: string };
type Props = { marketId: string; envId: string; root: string; marketName: string; folder: Folder; items: PageSummary[]; tree: Folder[]; allPages: PageSummary[]; names: Record<string, string>; templates: Template[]; openNew?: boolean; newTemplate?: string; archived?: Archived[] };
type Archived = PageSummary & { archive: { by: string; name: string; at: string; from?: string } };
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
  archive: ["M3.5 4.5h17v4h-17z", "M5 8.5V19.5h14V8.5", "M10 12.5h4"],
  delete: ["M5 7h14", "M10 11v6", "M14 11v6", "M6.5 7l1 13h9l1-13", "M9 7V4h6v3"],
};
const BarIcon = ({ n }: { n: keyof typeof BAR_ICONS }) => <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{BAR_ICONS[n].map((d) => <path key={d} d={d} />)}</svg>;
type LockInfo = { by: string; name: string; at: string };
const lockOf = (p: PageSummary): LockInfo | null => { const raw = p.meta?.["ucp:pageLock"]; if (typeof raw !== "string" || !raw) return null; try { return JSON.parse(raw) as LockInfo; } catch { return null; } };

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
/**
 * shadcn's Dialog rather than the hand-rolled overlay this used to be. The div version had a
 * `bg-black/45` backdrop, no blur and no transition; the Dialog brings the darker blurred
 * backdrop and the fade-and-zoom the source project uses, and with it a focus trap, Escape and a
 * portal — none of which the div had.
 */
const DIALOG_EXIT_MS = 120;
function ModalShell({ title, width = 720, onClose, children, footer }: { title: string; width?: number; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  /* Each modal is mounted by a parent condition, so telling the parent straight away would rip the
     popup out before it could animate. Closing flips this local flag first — Base UI then plays the
     fade-and-zoom out — and the parent is told once it has finished. */
  const [open, setOpen] = useState(true);
  const close = () => { setOpen(false); window.setTimeout(onClose, DIALOG_EXIT_MS); };
  return (
    <UIDialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <UIDialogContent className="sm:max-w-none" style={{ width: `min(${width}px, 94vw)` }}>
        <UIDialogHeader><UIDialogTitle className="text-lg font-medium">{title}</UIDialogTitle></UIDialogHeader>
        {children}
        <UIDialogFooter>{footer}</UIDialogFooter>
      </UIDialogContent>
    </UIDialog>
  );
}
const Err = ({ err }: { err: string | null }) => (err ? <div className="text-crit text-xs bg-crit-soft px-3 py-2 rounded mt-3">{err}</div> : null);
const inputCls = "mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-sm text-ink";

function FolderSelect({ value, onChange, root, marketName, tree, rel, exclude = [] }: { value: string; onChange: (v: string) => void; root: string; marketName: string; tree: Folder[]; rel: (p: string) => string; exclude?: string[] }) {
  const options: FolderOption[] = [
    { path: root, name: marketName, depth: 0 },
    ...tree
      .filter((f) => !exclude.some((x) => f.path === x || f.path.startsWith(x + "/")))
      .slice().sort((a, b) => a.path.localeCompare(b.path))
      .map((f) => ({ path: f.path, name: f.title, depth: rel(f.path).split("/").filter(Boolean).length })),
  ];
  return <LocationSelect value={value} onChange={onChange} options={options} rootPath={root} label="Location" />;
}

/* ---------------- row actions menu ---------------- */
type RowAction = "open" | "preview" | "copyurl" | "rename" | "move" | "duplicate" | "archive" | "delete";
/**
 * One corner menu per page, ported from their `pages/page-menu.svelte`: the three everyday
 * actions first, then the structural ones, then Delete on its own — each with its icon, which the
 * hand-rolled menu this replaces had none of. On shadcn's DropdownMenu, so it also gets keyboard
 * navigation, typeahead and click-away for free.
 */
function RowMenu({ page, canEdit, onAction }: { page: PageSummary; canEdit: boolean; onAction: (a: RowAction, p: PageSummary) => void }) {
  const go = (a: RowAction) => () => onAction(a, page);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button type="button" className="btn btn-icon btn-square cursor-pointer" aria-label={`Actions for ${page.title}`} />}
      >
        <EllipsisVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={go("open")}><Pencil />Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={go("preview")}><ExternalLink />Preview</DropdownMenuItem>
        <DropdownMenuItem onClick={go("copyurl")}><LinkIcon />Copy URL</DropdownMenuItem>
        {canEdit ? <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={go("rename")}><Type />Rename</DropdownMenuItem>
          <DropdownMenuItem onClick={go("duplicate")}><Copy />Duplicate</DropdownMenuItem>
          <DropdownMenuItem onClick={go("move")}><FolderInput />Move to…</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={go("archive")}><Archive />Archive</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={go("delete")}><Trash2 />Delete</DropdownMenuItem>
        </> : <>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Read-only for you</DropdownMenuItem>
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------- translate modal (port of the prototype's translate flow) ---------------- */
/** The tick in the corner of a choice card (language, how, where). */
const Check = ({ on }: { on: boolean }) => <span aria-hidden className={`absolute top-2 right-2 w-5 h-5 rounded-full grid place-items-center text-xs font-bold ${on ? "bg-brand text-white" : "border border-line-2 bg-surface"}`}>{on ? "✓" : ""}</span>;
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
  const card = (on: boolean) => `relative text-left rounded-lg border px-3 py-2.5 transition-colors ${on ? "border-brand bg-brand-soft shadow-[0_0_0_1px_var(--brand)]" : "border-line bg-surface hover:border-ink-4 hover:bg-surface-2"}`;
  const lang = (l: string) => { const on = langs.includes(l); const d = doneFor(l); const all = d === pages.length;
    return <button type="button" key={l} disabled={all} aria-pressed={on} onClick={() => setLangs(on ? langs.filter((x) => x !== l) : [...langs, l])} className={`${card(on)} disabled:opacity-50 disabled:cursor-not-allowed`}>
      <Check on={on} /><span className="flex items-center gap-2 pr-6"><span className="text-lg leading-none">{flagOf(l)}</span><b className="text-sm">{nameOf(l)}</b></span>
      <span className="block text-xs text-ink-3 mt-0.5">{l}{whereOf(l) ? ` · ${whereOf(l)}` : ""}{all ? " · already translated" : d ? ` · ${d} of ${pages.length} done` : ""}</span></button>; };

  if (created) { const made = created.filter((c) => !c.endsWith("(exists)")); return <Dialog title="Translations created" subtitle={`${made.length} new page${made.length === 1 ? "" : "s"} · waiting in the review Backlog`} width={560} onClose={onClose}
    footer={<><button className="btn btn-sm btn-secondary" onClick={onClose}>Close</button>{made[0] && <Link className="btn btn-sm btn-primary" href={`${base}/page${rel(made[0])}`}>Open the first one</Link>}</>}>
    <ul className="grid gap-1.5">{created.map((c) => { const p = c.replace(/ \(exists\)$/, ""); const skip = c.endsWith("(exists)"); return <li key={c} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${skip ? "border-line bg-surface-2 text-ink-3" : "border-line"}`}>
      <span className={`w-5 h-5 rounded-full grid place-items-center text-xs font-bold ${skip ? "bg-surface-3 text-ink-3" : "bg-good text-white"}`}>{skip ? "–" : "✓"}</span>
      <Link href={`${base}/page${rel(p)}`} className="text-xs hover:underline truncate flex-1">{rel(p)}</Link>{skip ? <span className="text-xs">already existed</span> : <span className="text-xs text-ink-3">In the Backlog</span>}</li>; })}</ul>
  </Dialog>; }

  const labels = ["Languages", "How", "Where", "Check"];
  const next = <button className="btn btn-sm btn-primary" disabled={(step === 0 && !langs.length) || (step === 3 && (!toCreate || busy))} onClick={() => (step < 3 ? setStep(step + 1) : void go())}>
    {step === 0 ? "Next: how to translate" : step === 1 ? "Next: where to put them" : step === 2 ? "Next: check" : busy ? "Creating…" : `Create ${toCreate} translation${toCreate === 1 ? "" : "s"}`}</button>;
  return <Dialog title={pages.length === 1 ? `Translate “${pages[0].title}”` : `Translate ${pages.length} pages`} subtitle={`From ${nameOf(mk.locales[0])} (${mk.locales[0]}) · ${marketName}`} width={600} onClose={onClose}
    footer={<>{step > 0 ? <button className="btn btn-sm btn-secondary mr-auto" onClick={() => setStep(step - 1)}>Back</button> : null}<button className="btn btn-sm btn-secondary" onClick={onClose}>Cancel</button>{next}</>}>
    <Steps labels={labels} current={step} onGo={setStep} />
    {step === 0 && <div>
      {own.length > 0 && <><b className="block text-xs uppercase tracking-[.06em] text-ink-3 mb-1.5">Languages of {marketName}</b><div className="grid grid-cols-2 gap-2 mb-4">{own.map(lang)}</div></>}
      <b className="block text-xs uppercase tracking-[.06em] text-ink-3 mb-1.5">Other markets</b><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{others.map(lang)}</div>
      <p className="mt-3 text-xs text-ink-2">{langs.length ? <>{langs.length} language{langs.length === 1 ? "" : "s"} × {pages.length} page{pages.length === 1 ? "" : "s"} = <b>{langs.length * pages.length}</b> translation{langs.length * pages.length === 1 ? "" : "s"}</> : "Pick at least one language."}</p>
    </div>}
    {step === 1 && <div role="radiogroup" aria-label="How to translate" className="grid gap-2">
      {([["ai", "AI draft now", "A first draft appears straight away. Rates, product names, links and regulatory wording stay as they are."], ["vendor", "Send to the translation vendor", "Professional translators work on it; the pages are created now and filled in when they deliver."]] as const).map(([k, t, d]) =>
        <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)} className={card(mode === k)}><Check on={mode === k} /><b className="block text-sm pr-6">{t}</b><span className="block text-xs text-ink-3 mt-0.5">{d}</span></button>)}
    </div>}
    {step === 2 && <div role="radiogroup" aria-label="Where to put them" className="grid gap-2">
      <button type="button" role="radio" aria-checked={dest === "same"} onClick={() => setDest("same")} className={card(dest === "same")}><Check on={dest === "same"} /><b className="block text-sm pr-6">Next to each source page</b><span className="block text-xs text-ink-3 mt-0.5">{rel(pages[0].path)} → …/{(langs[0] ?? "xx").split("-")[0]}-{pages[0].name}</span></button>
      <div className={card(dest === "folder")}><button type="button" role="radio" aria-checked={dest === "folder"} onClick={() => setDest("folder")} className="text-left w-full"><Check on={dest === "folder"} /><b className="block text-sm pr-6">In one folder</b><span className="block text-xs text-ink-3 mt-0.5">All translations together, e.g. a language section.</span></button>
        {dest === "folder" && <div className="mt-2"><FolderSelect value={destFolder} onChange={setDestFolder} root={root} marketName={marketName} tree={tree} rel={rel} /></div>}</div>
    </div>}
    {step === 3 && <div>
      <ul className="grid gap-1.5 max-h-[260px] overflow-auto">{plan.map((x) => <li key={x.path} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${x.exists ? "border-line bg-surface-2 text-ink-3" : "border-line"}`}>
        <span className="text-base leading-none">{flagOf(x.l)}</span><span className="min-w-0 flex-1"><b className="block font-medium truncate">{x.p.title}</b><span className="block text-xs text-ink-3 truncate">{rel(x.path)}</span></span>
        {x.exists ? <span className="text-xs">already exists · skipped</span> : <span className="text-xs rounded-full bg-brand-soft text-brand font-medium px-2 py-0.5">{nameOf(x.l)}</span>}</li>)}</ul>
      <p className="mt-3 flex items-start gap-2 text-xs text-ink-2 bg-surface-2 rounded-md px-3 py-2"><span aria-hidden>ⓘ</span><span>{mode === "ai" ? "AI drafts" : "Pages for the vendor"} go to the review <b>Backlog</b>. Like any page, they need the author&apos;s review and the business review before they can be published.</span></p>
    </div>}
    <Err err={err} />
  </Dialog>;
}

/**
 * Which of the three views is showing. Remembered per browser so returning to Pages does not
 * reset to the grid; read in an effect rather than during render so the server and the first
 * client paint agree.
 */
const VIEW_KEY = "ucp-pages-view";
const VIEW_EVT = "ucp-pages-view";
const subscribeView = (cb: () => void) => { window.addEventListener("storage", cb); window.addEventListener(VIEW_EVT, cb); return () => { window.removeEventListener("storage", cb); window.removeEventListener(VIEW_EVT, cb); }; };
const readView = (): View => { try { const v = localStorage.getItem(VIEW_KEY); return v === "grid" || v === "compact" ? v : "list"; } catch { return "list"; } };
function useView(): [View, (v: View) => void] {
  const view = useSyncExternalStore(subscribeView, readView, () => "list" as View);
  const set = (v: View) => { try { localStorage.setItem(VIEW_KEY, v); } catch { /* private window */ } window.dispatchEvent(new Event(VIEW_EVT)); };
  return [view, set];
}

/* ---------------- explorer ---------------- */
export function Explorer({ marketId, envId, root, marketName, folder, items, tree, allPages, names, templates, openNew, newTemplate, archived = [] }: Props) {
  const router = useRouter(); const ask = useConfirm(); const [showArchive, setShowArchive] = useState(false);
  const { can } = useSession();
  const base = `/${marketId}/${envId}`;
  const rel = (p: string) => p.replace(root, "") || "/";
  const [q, setQ] = useState("");
  /* Compact / grid / list, as the source project offers. It keeps the choice in the URL; this
     keeps it in local storage so switching view costs no server round trip, the same idiom the
     folder tree already uses for which folders are open. */
  const [view, setView] = useView();
  /* Pages beneath each folder, for the tree and the folder tiles — descendants included, so a
     folder of folders does not read as empty. */
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of [{ path: root }, ...tree]) out[f.path] = allPages.filter((p) => p.path.startsWith(f.path + "/")).length;
    return out;
  }, [root, tree, allPages]);
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
  const crumbs = useMemo(() => { const segs = folder.path.replace(root, "").split("/").filter(Boolean); return segs.map((s, i) => ({ name: s, path: root + "/" + segs.slice(0, i + 1).join("/") })); }, [folder.path, root]);
  /* Sorting and filtering, as their table has. Default newest-first on Updated on, like theirs. */
  const [sort, setSort] = useState<Sort>({ id: "updatedAt", desc: true });
  const [statusF, setStatusF] = useState<string[]>([]);
  const [langF, setLangF] = useState<string[]>([]);
  const [range, setRange] = useState<Range>({});
  const filtersOn = statusF.length > 0 || langF.length > 0 || rangeActive(range);
  const tplName = (id?: string) => templates.find((t) => t.id === id)?.name ?? id ?? "";
  const localeOf = (p: PageSummary) => p.locale ?? "en-GB";

  const matching = q ? allPages.filter((p) => (p.title ?? "").toLowerCase().includes(q.toLowerCase()) || rel(p.path).includes(q.toLowerCase())) : items;
  const rows = useMemo(() => {
    /* A folder has no status, language or edit date, so any of those filters is a request for
       pages — folders drop out rather than lingering as rows nothing could match. */
    const kept = matching.filter((p) => isFolder(p)
      ? !filtersOn
      : (!statusF.length || statusF.includes(p.status))
        && (!langF.length || langF.includes(p.locale ?? "en-GB"))
        && inRange(p.lastModified, range));
    const key = (p: PageSummary) => {
      switch (sort.id) {
        case "title": return (p.title ?? "").toLowerCase();
        case "language": return p.locale ?? "en-GB";
        case "status": return p.status ?? "";
        case "template": return (templates.find((t) => t.id === p.template)?.name ?? p.template ?? "").toLowerCase();
        case "updatedBy": return (p.lastModifiedBy ? names[p.lastModifiedBy] ?? p.lastModifiedBy : "").toLowerCase();
        default: return p.lastModified ?? "";
      }
    };
    return sortRows(kept, isFolder, key, sort.desc);
  }, [matching, filtersOn, statusF, langF, range, sort, names, templates]);
  const shown = rows.slice(0, limit);
  const shownPages = shown.filter((n) => !isFolder(n));
  /* The card views have no breadcrumb of their own, so the folder tiles carry the way back up. */
  const upParent = folder.path === root ? null : parentOf(folder.path);
  const upHref = upParent === null ? undefined : upParent === root ? `${base}/pages` : `${base}/pages${rel(upParent)}`;
  /* Name where you are going rather than the direction: "Up to Borrowing" beats "Up one level",
     and at the top it is the market, which is what the tree calls the root too. */
  const upName = upParent === null ? undefined : upParent === root ? marketName : tree.find((f) => f.path === upParent)?.title ?? upParent.split("/").pop();

  /* The options are the market's declared locales, not just the ones present — as theirs takes
     them from its language list and counts rows against it. Otherwise a market whose pages are all
     one locale shows no filter at all, which is what happened here. */
  const langs = useMemo(() => {
    const pages = items.filter((x) => !isFolder(x));
    return marketOf(marketId).locales.map((value) => ({ value, label: value, count: pages.filter((p) => (p.locale ?? "en-GB") === value).length }));
  }, [items, marketId]);
  const statusOptions = useMemo(() => {
    const present = new Set(items.filter((x) => !isFolder(x)).map((p) => p.status));
    return Object.entries(STATUS_LABEL).filter(([v]) => present.has(v as PageSummary["status"])).map(([value, label]) => ({ value, label }));
  }, [items]);
  const chips = [
    ...statusF.map((v) => ({ key: "s:" + v, label: `Status: ${STATUS_LABEL[v] ?? v}`, remove: () => setStatusF(statusF.filter((x) => x !== v)) })),
    ...langF.map((v) => ({ key: "l:" + v, label: `Language: ${v}`, remove: () => setLangF(langF.filter((x) => x !== v)) })),
    ...(rangeActive(range) ? [{ key: "r", label: `Updated ${range.from ?? "…"} to ${range.to ?? "…"}`, remove: () => setRange({}) }] : []),
  ];
  const clearFilters = () => { setStatusF([]); setLangF([]); setRange({}); };
  const selected = rows.filter((r) => sel.includes(r.path));
  const canEditSelected = selected.length > 0 && selected.every((r) => can("edit", r.path));
  /* Folders are not rows in the list view — theirs has none either; the tree and the folder
     tiles are where folders live. Select-all therefore covers the pages actually on screen. */
  const allChecked = shownPages.length > 0 && shownPages.every((r) => sel.includes(r.path));
  const say = (s: string) => { setToast(s); setTimeout(() => setToast(null), 2600); };
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
    try { let n = 0; for (const p of modal.pages) { if (parentOf(p.path) === parent) continue; const to = `${parent}/${p.name}`; await repoApi.movePage(p.path, to); n++; const linkers = [...new Set((moveRefs ?? []).filter((r) => r.path === p.path || r.path.startsWith(p.path + "/")).flatMap((r) => r.linkedFrom.map((x) => x.path)))]; if (relink && linkers.length) await ucpApi.relinkPages(marketId, p.path, to, linkers).catch(() => {}); } setModal(null); setSel([]); say(n ? `Moved ${n} item${n === 1 ? "" : "s"} to ${rel(parent)}` : "Nothing to move"); router.refresh(); }
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
  /** Archive: out of every list and offline, but restorable from the Archive section (delete is for good). */
  async function archive(pages: PageSummary[], confirmed = false) {
    const live = pages.filter((p) => p.status === "published" || p.status === "scheduled").length; const one = pages.length === 1 ? pages[0] : null;
    if (!confirmed && !(await ask({ title: one ? `Archive “${one.title}”?` : `Archive ${pages.length} items?`, confirmLabel: "Archive",
      body: <ul className="list-disc pl-5 grid gap-1"><li>{one ? "It leaves" : "They leave"} the page list, tasks and search{pages.some((p) => p.isFolder) ? ", with everything inside the folders" : ""}.</li>{live > 0 && <li><b className="text-crit">{live} live page{live === 1 ? " goes" : "s go"} offline</b> for customers.</li>}<li>Nothing is lost: <b>Restore</b> from the Archive at the bottom of the list brings {one ? "it" : "them"} back as a draft.</li></ul>,
      items: pages.map((p) => ({ label: p.title, note: p.isFolder ? "folder" : p.status === "published" ? "live" : rel(p.path), warn: p.status === "published" })) }))) return;
    try { const r = await ucpApi.archivePages(marketId, pages.map((p) => p.path), true); setSel([]); say(`Archived ${r.count} item${r.count === 1 ? "" : "s"}${r.offline ? ` · ${r.offline} taken offline` : ""} · restore from Archive`); router.refresh(); }
    catch (e) { say(errText(e)); }
  }
  async function unarchive(pages: PageSummary[]) {
    try { await ucpApi.archivePages(marketId, pages.map((p) => p.path), false); say(`Restored ${pages.length === 1 ? `“${pages[0].title}”` : `${pages.length} items`} · back in the list as a draft`); router.refresh(); }
    catch (e) { say(errText(e)); }
  }
  /** Delete always offers Archive first: an archived page can come back, a deleted one cannot. */
  async function remove(pages: PageSummary[], fromArchive = false) {
    if (!fromArchive) {
      const one = pages.length === 1 ? pages[0] : null;
      const r = await ask({ title: one ? `Archive “${one.title}” instead of deleting?` : `Archive ${pages.length} items instead of deleting?`, confirmLabel: "Archive",
        body: <>Deleting cannot be undone. Archiving takes {one ? "it" : "them"} out of the list and offline too, but anyone with Edit can <b>restore</b> {one ? "it" : "them"} later.</>,
        alt: { label: "No, delete permanently…", danger: true } });
      if (r === true) { await archive(pages, true); return; }
      if (r !== "alt") return;
    }
    /* what goes with each item: pages inside folders, and which of them are live for customers */
    const inside = (p: PageSummary) => allPages.filter((x) => x.path.startsWith(`${p.path}/`) && !x.isFolder);
    const info = pages.map((p) => { const kids = inside(p); const live = [...(p.isFolder ? [] : [p]), ...kids].filter((x) => x.status === "published").length; return { p, kids: kids.length, live }; });
    const live = info.reduce((n, x) => n + x.live, 0); const kids = info.reduce((n, x) => n + x.kids, 0);
    const one = pages.length === 1 ? pages[0] : null;
    const refs = await ucpApi.pageReferences(marketId, pages.map((p) => p.path)).catch(() => []); // folders: every page inside is checked
    const linked = [...new Map(refs.flatMap((r) => r.linkedFrom).map((x) => [x.path, x])).values()];
    const lonely = [...new Map(refs.flatMap((r) => r.files.filter((f) => f.onlyHere && f.path)).map((f) => [f.id, f])).values()];
    let dropFiles: string[] = [];
    const ok = await ask({
      also: [
        { title: `${linked.length} page${linked.length === 1 ? " links" : "s link"} here`, hint: "Their links will stop working. Update them after deleting.", list: linked.map((x) => ({ label: x.title, note: rel(x.path) })) },
        { title: "Linked content", hint: "Content entities shown on these pages. They are not deleted.", list: [...new Map(refs.flatMap((r) => r.entities).map((e) => [e.path, e])).values()].map((e) => ({ label: e.title, note: e.usedElsewhere ? `also on ${e.usedElsewhere} other page${e.usedElsewhere === 1 ? "" : "s"}` : "not used anywhere else" })) },
      ],
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
  /* The page's public address, as the delivery tier would serve it. */
  async function copyUrl(p: PageSummary) {
    const url = `https://${marketOf(marketId).domain}${rel(p.path)}`;
    try { await navigator.clipboard.writeText(url); say(`Copied ${url}`); }
    catch { say("Copy did not work · open the page and copy the address by hand"); }
  }
  function onAction(a: RowAction, p: PageSummary) {
    if (a === "open") router.push(p.isFolder ? `${base}/pages${rel(p.path)}` : `${base}/page${rel(p.path)}`);
    else if (a === "preview") window.open(`${base}/page${rel(p.path)}?preview=1`, "_blank", "noopener");
    else if (a === "copyurl") void copyUrl(p);
    else if (a === "rename") { openModal({ kind: "rename", page: p }); setTitle(p.title); }
    else if (a === "move") { openModal({ kind: "move", pages: [p] }); setParent(parentOf(p.path)); }
    else if (a === "duplicate") duplicate(p);
    else if (a === "archive") void archive([p]);
    else remove([p]);
  }
  const cell = "px-4 py-2 border-b border-line";
  const scopeName = q ? `Search results for “${q}”` : folder.title;
  const empty = <div className="border border-dashed border-line-2 p-10 text-center text-ink-3">{q ? "No pages match." : canEditHere ? <>This folder is empty. <button className="cursor-pointer underline" onClick={() => { setParent(folder.path); openModal({ kind: "new" }); }}>New page</button>.</> : "This folder is empty."}</div>;
  const barBtn = "btn btn-sm gap-1.5 hover:brightness-125"; const barStyle = { background: "transparent", borderColor: "rgba(255,255,255,.3)", color: "#fff" } as const;

  /* Sized like their page root (page-builder/+page.svelte): the viewport minus the top bar,
     tracking it shrinking to h-12 in icon mode, and pt-0 so the cards start flush under it rather
     than relying on the parent grid to hand a height down. */
  return (
    <div className="flex h-[calc(100svh-4rem)] min-h-0 flex-col overflow-hidden p-4 pt-0 group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100svh-3rem)]">
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)]">
        <div className="flex max-h-96 min-h-0 flex-col overflow-hidden border border-line bg-surface lg:row-span-2 lg:max-h-none" role="navigation" aria-label="Folders">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-3">
            <h2 className="text-sm font-medium text-ink-2">Folders</h2>
            {canEditHere && <NewFolderButton onClick={() => { setParent(folder.path); openModal({ kind: "folder" }); }} />}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1"><FolderTree root={root} marketName={marketName} base={base} current={folder.path} folders={tree} counts={counts} /></div>
        </div>

        <div className="flex min-w-0 shrink-0 items-center justify-end">
          {canEditHere
            ? <button type="button" className="btn btn-primary inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 px-4 text-sm" onClick={() => { setParent(folder.path); openModal({ kind: "new" }); }}><Plus className="size-4" />New page</button>
            : <span className="inline-flex shrink-0 items-center gap-1.5 border border-line bg-surface-3 px-3 py-1.5 text-xs text-ink-3" title="You don't have Edit on this folder. Ask a site admin."><Lock className="size-3.5" />Read-only in this folder</span>}
        </div>

        {/* @container: the columns must respond to this pane, which is the viewport minus the app
            sidebar and the folder tree — viewport breakpoints kept every column on at xl and
            squeezed Name down to its icon. Their toolbar uses the same idiom. */}
        <div className="@container flex min-h-0 flex-col overflow-hidden border border-line bg-surface">
          <div className="flex shrink-0 items-center gap-4 border-b border-line px-4 py-3">
            <div className="min-w-28 flex-1">
              <h2 className="truncate text-base font-medium" title={scopeName}>{scopeName}</h2>
              {!q && crumbs.length > 0 && (
                <nav aria-label="Folder path" className="hidden truncate text-xs text-ink-3 xl:block">
                  <Link href={`${base}/pages`} className="cursor-pointer no-underline hover:text-ink hover:underline">{marketName}</Link>
                  {crumbs.map((c, i) => <span key={c.path}><ChevronRight className="mx-0.5 inline size-3 align-[-2px]" />{i === crumbs.length - 1 ? <span>{c.name}</span> : <Link href={`${base}/pages${rel(c.path)}`} className="cursor-pointer no-underline hover:text-ink hover:underline">{c.name}</Link>}</span>)}
                </nav>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
                <input className="h-9 w-48 border border-line-2 bg-surface ps-8 pe-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring xl:w-60" placeholder="Find a page by title or URL" aria-label="Find a page by title or URL" value={q} onChange={(e) => setQ(e.target.value)} />
                {q && <button type="button" className="absolute end-1.5 top-1/2 inline-flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center text-ink-3 transition-colors hover:text-ink" aria-label="Clear search" onClick={() => setQ("")}><X className="size-4" /></button>}
              </div>
              {statusOptions.length > 1 && <MultiFilter label="Status" noun="pages" options={statusOptions} value={statusF} onChange={setStatusF} />}
              <RangeFilter value={range} onChange={setRange} />
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>

          <QuickChips label="Language" all={items.filter((p) => !isFolder(p)).length} options={langs} value={langF} onChange={setLangF} />
          <FilterChips shown={rows.length} total={matching.length} noun="pages" chips={chips} onClear={clearFilters} />

          <div className="relative min-h-0 flex-1 overflow-auto">
            {view !== "list" ? (
              <div className="flex flex-col gap-4 p-4">
                {!q && <FolderTiles folders={items.filter(isFolder)} base={base} rel={rel} counts={counts} scopeName={scopeName} upHref={upHref} upName={upName} />}
                {shownPages.length ? (
                  <section aria-label={`Pages in ${scopeName}`}>
                    {!q && items.some(isFolder) && <h3 className="mb-2 text-xs font-medium text-ink-3">Pages</h3>}
                    <div className={`grid ${view === "compact" ? "gap-2 [grid-template-columns:repeat(auto-fill,minmax(9rem,1fr))]" : "gap-3 [grid-template-columns:repeat(auto-fill,minmax(13.5rem,1fr))]"}`}>
                      {shownPages.map((n) => <PageCard key={n.path} page={n} href={`${base}/page${rel(n.path)}`} compact={view === "compact"} rel={rel} onCopyUrl={() => void copyUrl(n)} menu={<RowMenu page={n} canEdit={can("edit", n.path)} onAction={onAction} />} />)}
                    </div>
                  </section>
                ) : empty}
              </div>
            ) : shownPages.length ? (
              <table className="w-full table-fixed text-sm">
                <thead className="sticky top-0 z-10 bg-surface-2">
                  <tr className="text-left text-xs text-ink-3">
                    <th className="h-11 w-11 border-b border-line-2 px-4"><input type="checkbox" className="bdl-checkbox bdl-checkbox-sm" aria-label="Select all" checked={allChecked} onChange={(e) => setSel(e.target.checked ? shownPages.map((r) => r.path) : [])} /></th>
                    <th className="h-11 border-b border-line-2 px-4"><SortHeader id="title" label="Name" sort={sort} onSort={setSort} /></th>
                    <th className="hidden h-11 w-24 border-b border-line-2 px-4 @3xl:table-cell"><SortHeader id="language" label="Language" sort={sort} onSort={setSort} /></th>
                    <th className="h-11 w-32 border-b border-line-2 px-4"><SortHeader id="status" label="Status" sort={sort} onSort={setSort} /></th>
                    <th className="hidden h-11 w-32 border-b border-line-2 px-4 @5xl:table-cell"><SortHeader id="template" label="Template" sort={sort} onSort={setSort} /></th>
                    <th className="hidden h-11 w-36 border-b border-line-2 px-4 @4xl:table-cell"><SortHeader id="updatedBy" label="Updated by" sort={sort} onSort={setSort} /></th>
                    <th className="hidden h-11 w-40 border-b border-line-2 px-4 whitespace-nowrap @2xl:table-cell"><SortHeader id="updatedAt" label="Updated on" sort={sort} onSort={setSort} /></th>
                    <th className="h-11 w-12 border-b border-line-2" />
                  </tr>
                </thead>
                <tbody>{shownPages.map((n) => { const on = sel.includes(n.path); const editable = can("edit", n.path); const src = n.meta?.["ucp:sourcePath"] as string | undefined; const who = n.lastModifiedBy ? names[n.lastModifiedBy] ?? n.lastModifiedBy : ""; return <tr key={n.path} className={on ? "bg-brand-soft/40" : "hover:bg-surface-2"}>
                  <td className={cell}><input type="checkbox" className="bdl-checkbox bdl-checkbox-sm" aria-label={`Select ${n.title}`} checked={on} onChange={(e) => setSel(e.target.checked ? [...sel, n.path] : sel.filter((x) => x !== n.path))} /></td>
                  <td className={cell}>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Link href={`${base}/page${rel(n.path)}`} aria-label={`Edit ${n.title}`} className="shrink-0 border border-line focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                        <PageThumb template={n.template} className="h-9 w-12" />
                      </Link>
                      <div className="min-w-0">
                        <Link href={`${base}/page${rel(n.path)}`} className="flex min-w-0 items-center gap-1.5 font-medium no-underline hover:underline">
                          <span className="truncate">{n.title}</span>
                          {lockOf(n) && <span className="inline-flex shrink-0 items-center text-ink-3" title={`Locked by ${lockOf(n)!.name}`} aria-label={`Locked by ${lockOf(n)!.name}`}><BarIcon n="lock" /></span>}
                        </Link>
                        <span className="block truncate text-xs text-ink-3">{rel(n.path)}</span>
                        {src && <span className="block truncate text-xs text-ink-3">Source: <Link href={`${base}/page${rel(src)}`} className="hover:underline">{rel(src)}</Link></span>}
                      </div>
                    </div>
                  </td>
                  <td className={`${cell} hidden text-ink-3 @3xl:table-cell`}>{localeOf(n)}</td>
                  <td className={cell}><Pill status={n.status} /></td>
                  <td className={`${cell} hidden truncate text-ink-3 @5xl:table-cell`}>{tplName(n.template) || "—"}</td>
                  <td className={`${cell} hidden truncate text-ink-3 @4xl:table-cell`}>{who || "—"}</td>
                  <td className={`${cell} hidden whitespace-nowrap text-ink-3 @2xl:table-cell`}>{ukDateTime(n.lastModified) || "—"}</td>
                  <td className={`${cell} text-right whitespace-nowrap`}><RowMenu page={n} canEdit={editable} onAction={onAction} /></td>
                </tr>; })}</tbody>
              </table>
            ) : empty}
            {rows.length > shown.length && <div className="flex items-center justify-center gap-3 py-4 text-xs text-ink-3">Showing {shown.length} of {rows.length}<button className="btn btn-sm btn-secondary" onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, rows.length - shown.length)} more</button></div>}
            <div className="px-4">
        {(() => { const here = archived.filter((a) => a.path.startsWith(`${folder.path}/`) && !archived.some((b) => b !== a && a.path.startsWith(`${b.path}/`))); if (!here.length || q) return null;
          return <details className="mt-6 border border-line rounded-lg bg-surface" open={showArchive} onToggle={(e) => setShowArchive((e.target as HTMLDetailsElement).open)}>
            <summary className="flex items-center gap-2 px-4 py-2.5 cursor-pointer text-sm font-medium text-ink-2 select-none"><BarIcon n="archive" />Archive · {here.length}<span className="ml-auto font-normal text-xs text-ink-3">Archived items can be restored</span></summary>
            <ul className="border-t border-line divide-y divide-line">{here.map((a) => { const d = new Date(a.archive.at); return <li key={a.path} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="text-ink-3">{a.isFolder ? <FolderIcon /> : <PageIcon />}</span>
              <span className="min-w-0 flex-1"><b className="block font-medium text-ink-2 truncate">{a.title}</b><span className="block text-xs text-ink-3"><span>{rel(a.path)}</span> · archived by {a.archive.name} · {d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}{a.archive.from === "published" ? " · was live" : ""}</span></span>
              {can("edit", a.path) ? <><button className="btn btn-sm btn-secondary" onClick={() => void unarchive([a])}><BarIcon n="restore" />Restore</button><button className="btn btn-sm btn-secondary text-crit" onClick={() => void remove([a], true)}>Delete permanently</button></> : <span className="text-xs text-ink-3">Needs Edit to restore</span>}
            </li>; })}</ul></details>; })()}
        {selected.length > 0 && <div className="sticky bottom-4 mt-4 flex flex-wrap items-center justify-center gap-2 bg-foreground text-background px-4 py-2.5 rounded-lg text-sm shadow-xl w-fit max-w-full mx-auto z-20"><b className="whitespace-nowrap">{selected.length} selected</b><span className="text-white/40">·</span>
          <button className={barBtn} style={barStyle} disabled={!selected.some((p) => !p.isFolder)} onClick={() => setModal({ kind: "translate", pages: selected.filter((p) => !p.isFolder) })}><BarIcon n="translate" />Translate</button>
          <button className={barBtn} style={barStyle} disabled={!selected.some((p) => !p.isFolder)} onClick={() => setModal({ kind: "publish", pages: selected.filter((p) => !p.isFolder) })}><BarIcon n="publish" />Publish</button>
          {canEditSelected ? <>{(() => { const pagesSel = selected.filter((p) => !p.isFolder); const allLocked = pagesSel.length > 0 && pagesSel.every((p) => lockOf(p)); return <button className={barBtn} style={barStyle} disabled={!pagesSel.length} onClick={() => void setLock(pagesSel, !allLocked)} title={allLocked ? "Let people change these pages again" : "Nobody else can change, move or delete them until they are unlocked"}><BarIcon n={allLocked ? "unlock" : "lock"} />{allLocked ? "Unlock" : "Lock"}</button>; })()}
          <button className={barBtn} style={barStyle} disabled={!selected.some((p) => !p.isFolder)} onClick={() => { openModal({ kind: "copy", pages: selected.filter((p) => !p.isFolder) }); setParent(folder.path); }} title="Copy the pages to a folder"><BarIcon n="copy" />Copy</button>
          <button className={barBtn} style={barStyle} disabled={!selected.some((p) => !p.isFolder)} onClick={() => void restoreLast(selected)} title="Go back to the last saved version"><BarIcon n="restore" />Restore</button>
          {(() => { const one = selected.length === 1 && !selected[0].isFolder ? selected[0] : null; const live = !!one && (one.status === "published" || typeof one.meta?.["ucp:liveComponents"] === "string" || typeof one.meta?.["ucp:publishedAt"] === "string");
            return <button className={barBtn} style={barStyle} disabled={!live} onClick={() => one && setComparing(one.path)} title={!one ? "Pick one page to compare" : live ? "Compare an authoring version with the live page" : "Not published yet · nothing to compare"}><BarIcon n="compare" />Compare</button>; })()}
          <span className="w-px h-5 bg-white/20" aria-hidden />
          <button className={barBtn} style={barStyle} onClick={() => { openModal({ kind: "move", pages: selected }); setParent(folder.path === root ? root : parentOf(folder.path)); }}><BarIcon n="move" />Move</button>
          <button className={barBtn} style={barStyle} onClick={() => void archive(selected)} title="Take them out of the list and offline · can be restored"><BarIcon n="archive" />Archive</button>
          <button className={barBtn} style={barStyle} onClick={() => remove(selected)}><BarIcon n="delete" />Delete</button></> : <span className="text-white/60 text-xs">Lock, copy, restore, move, archive and delete need Edit on every selected item</span>}
          <button className={barBtn} style={{ ...barStyle, borderColor: "transparent", opacity: .75 }} onClick={() => setSel([])}>Clear</button></div>}
            </div>
          </div>
        </div>
      </div>

      {modal?.kind === "new" && <ModalShell title="New page" onClose={() => setModal(null)} footer={<><button className="btn btn-sm btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-sm btn-primary" disabled={!title.trim() || busy} onClick={create}>{busy ? "Creating…" : "Create and open"}</button></>}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <label className="col-span-2 text-xs text-ink-3">Page title<input autoFocus className={inputCls} value={title} onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }} placeholder="e.g. Regular saver" /></label>
          <label className="text-xs text-ink-3">Where should it live?<FolderSelect value={parent} onChange={setParent} root={root} marketName={marketName} tree={tree} rel={rel} /></label>
          <label className="text-xs text-ink-3">URL name<input className={`${inputCls} `} value={slug} onChange={(e) => setSlug(slugify(e.target.value))} /><span className="block mt-1 text-xs">{rel(parent)}/{slug || "…"}</span></label>
          <div className="col-span-2 text-xs text-ink-3">Template<div className="mt-1 grid grid-cols-5 gap-2">{templates.map((t) => <button type="button" key={t.id} onClick={() => setTpl(t.id)} className={`text-left border rounded-lg p-2.5 ${tpl === t.id ? "border-brand bg-brand-soft" : "border-line hover:border-ink-4"}`}><b className="block text-xs text-ink">{t.name}</b><small className="text-ink-3">{t.blocks.length} blocks</small></button>)}</div></div>
        </div><Err err={err} /></ModalShell>}

      {modal?.kind === "folder" && <ModalShell title="New folder" width={460} onClose={() => setModal(null)} footer={<><button className="btn btn-sm btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-sm btn-primary" disabled={!title.trim() || busy} onClick={createFolder}>{busy ? "Creating…" : "Create folder"}</button></>}>
        <label className="text-xs text-ink-3">Folder name<input autoFocus className={inputCls} value={title} onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }} placeholder="e.g. Insurance" onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) createFolder(); }} /></label>
        <label className="block mt-3 text-xs text-ink-3">Where<FolderSelect value={parent} onChange={setParent} root={root} marketName={marketName} tree={tree} rel={rel} /></label>
        <div className="mt-2 text-xs text-ink-3">{rel(parent)}/{slug || "…"}</div><Err err={err} /></ModalShell>}

      {modal?.kind === "rename" && <ModalShell title={`Rename “${modal.page.title}”`} width={460} onClose={() => setModal(null)} footer={<><button className="btn btn-sm btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-sm btn-primary" disabled={!title.trim() || busy} onClick={rename}>{busy ? "Saving…" : "Rename"}</button></>}>
        <label className="text-xs text-ink-3">New title<input autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) rename(); }} /></label>
        <div className="mt-2 text-xs text-ink-3">The URL <span>{rel(modal.page.path)}</span> stays the same.</div><Err err={err} /></ModalShell>}

      {comparing && <CompareView marketId={marketId} marketName={marketName} path={comparing} onClose={() => setComparing(null)} />}
      {modal?.kind === "copy" && <ModalShell title={modal.pages.length === 1 ? `Copy “${modal.pages[0].title}”` : `Copy ${modal.pages.length} pages`} width={460} onClose={() => setModal(null)} footer={<><button className="btn btn-sm btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-sm btn-primary" disabled={busy} onClick={copyTo}>{busy ? "Copying…" : "Copy here"}</button></>}>
        <label className="text-xs text-ink-3">Copy to folder<FolderSelect value={parent} onChange={setParent} root={root} marketName={marketName} tree={tree} rel={rel} exclude={[]} /></label>
        <p className="mt-2 text-xs text-ink-3">The copies start as drafts with the same components. In the same folder they are named “… (copy)”.</p>
        <ul className="mt-2 text-xs text-ink-2 grid gap-1 max-h-[160px] overflow-auto">{modal.pages.map((p) => <li key={p.path} className="text-xs">{rel(p.path)} → {rel(parent)}/{p.name}{parentOf(p.path) === parent ? "-copy" : ""}</li>)}</ul><Err err={err} /></ModalShell>}
      {modal?.kind === "move" && <ModalShell title={modal.pages.length === 1 ? `Move “${modal.pages[0].title}”` : `Move ${modal.pages.length} items`} width={460} onClose={() => setModal(null)} footer={<><button className="btn btn-sm btn-secondary" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-sm btn-primary" disabled={busy} onClick={move}>{busy ? "Moving…" : "Move here"}</button></>}>
        <label className="text-xs text-ink-3">Destination folder<FolderSelect value={parent} onChange={setParent} root={root} marketName={marketName} tree={tree} rel={rel} exclude={modal.pages.filter((p) => p.isFolder).map((p) => p.path)} /></label>
        <ul className="mt-3 text-xs text-ink-2 grid gap-1 max-h-[160px] overflow-auto">{modal.pages.map((p) => <li key={p.path} className="text-xs">{rel(p.path)} → {rel(parent)}/{p.name}</li>)}</ul>
        {moveLinked.length > 0 && <div className="mt-3 rounded-lg border border-warn/30 bg-warn-soft/40 p-3"><b className="block text-sm">{moveLinked.length} page{moveLinked.length === 1 ? " links" : "s link"} here</b>
          <ul className="mt-1 grid gap-0.5 text-xs max-h-[110px] overflow-auto">{moveLinked.map((x) => <li key={x.path} className="flex gap-2"><span className="truncate flex-1">{x.title}</span><span className="text-xs text-ink-3">{rel(x.path)}</span></li>)}</ul>
          <label className="mt-2 flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" className="accent-[var(--brand)]" checked={relink} onChange={(e) => setRelink(e.target.checked)} />Update their links to the new address</label></div>}
        <Err err={err} /></ModalShell>}

      {modal?.kind === "publish" && <PublishDialog marketId={marketId} envName={env(envId).name} pages={modal.pages.map((p) => ({ path: p.path, title: p.title, status: p.status, publishAt: typeof p.meta?.["ucp:publishAt"] === "string" ? String(p.meta["ucp:publishAt"]) : undefined }))} mayPublish={(path) => can("publish", path)} onClose={() => setModal(null)}
        onDone={(r, m) => { const n = r.filter((x) => x.ok).length; say(n ? `${m === "schedule" ? "Scheduled" : m === "cancel" ? "Unscheduled" : "Published"} ${n} page${n === 1 ? "" : "s"}${n < modal.pages.length ? ` · ${modal.pages.length - n} skipped` : ""}` : "Nothing was published"); if (r.length && r.every((x) => x.ok) && n === modal.pages.length) setModal(null); setSel([]); router.refresh(); }} />}
      {modal?.kind === "translate" && <TranslateModal pages={modal.pages} marketId={marketId} base={base} root={root} marketName={marketName} tree={tree} rel={rel} folderPath={folder.path} existing={allPages.map((p) => p.path)} onClose={() => setModal(null)} onDone={() => { setSel([]); router.refresh(); }} />}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2.5 rounded-lg text-sm z-50">{toast}</div>}
    </div>
  );
}
