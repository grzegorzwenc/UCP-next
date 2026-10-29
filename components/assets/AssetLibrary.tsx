"use client";
import { SideTree } from "@/components/ui/SideTree";
import { ViewToggle } from "@/components/explorer/PagesViews";
import { MultiFilter } from "@/components/explorer/PagesFilters";
import { FolderList } from "@/components/ui/FolderList";
import { NewFolderButton } from "@/components/ui/NewFolderButton";
import { Lock, Search, TriangleAlert, Upload, X } from "lucide-react";

/** The file types the library holds, as their assets dropdown lists its own. */
const TYPE_OPTIONS = [{ value: "image", label: "Images" }, { value: "pdf", label: "PDFs" }, { value: "svg", label: "SVGs" }];
const VIEW_MODES = ["compact", "grid", "list"] as const;
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Asset, AssetA11y } from "@/lib/ucp/types";
import { a11yGaps } from "@/lib/ucp/schema";
import { A11yPanel } from "./A11yPanel";
import { repoApi, ucpApi, ApiError } from "@/lib/api";
import { errorText as errText } from "@/lib/api/errors";
import { useSession } from "@/components/shell/Session";
import { Pill } from "@/components/ui/Pill";
import { Dialog, DialogContent, DialogTitle } from "@/components/shadcn/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { FileTypeBadge } from "@/components/ui/FileTypeBadge";
import { useConfirm } from "@/components/ui/Confirm";

type Usage = Record<string, { path: string; title: string; status: string }[]>;
type Props = { marketId: string; envId: string; marketName: string; root: string; assets: Asset[]; folders: string[]; usage: Usage; locales: string[]; folder: string; view: "" | "unused" | "noalt" };

const TYPE_LABEL: Record<string, string> = { image: "IMAGE", pdf: "PDF", svg: "SVG", file: "FILE" };
const PAGE = 60;
const who = (id?: string) => (!id ? "" : id === "system" ? "System" : id.split(".").map((s) => (s[0]?.toUpperCase() ?? "") + s.slice(1)).join(" "));
const when = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return iso; const diff = Math.round((Date.now() - d.getTime()) / 60000); return diff < 2 ? "just now" : diff < 60 ? `${diff} min ago` : diff < 1440 ? `${Math.round(diff / 60)} h ago` : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };

/* grid/list preference, kept in localStorage and read after hydration (server always renders the grid) */
const VIEW_KEY = "ucp-assets-view"; const viewSubs = new Set<() => void>();
const subscribeView = (cb: () => void) => { viewSubs.add(cb); return () => { viewSubs.delete(cb); }; };
type Mode = "compact" | "grid" | "list";
const readView = (): Mode => { try { const v = localStorage.getItem(VIEW_KEY); return v === "list" || v === "compact" ? v : "grid"; } catch { return "grid"; } };
const setView = (v: Mode) => { try { localStorage.setItem(VIEW_KEY, v); } catch { /* private mode: keep the default */ } viewSubs.forEach((cb) => cb()); };

/** Thumbnail: the real picture when the repository holds it, otherwise a calm grey tile with the file type. */
/**
 * Stock photos for the seeded library, cloned from hsbc-ucpmock's `static/images/assets`. Their
 * `photoSrc` picks one by index; ours derives the index from the asset id, so a given file always
 * shows the same photo without the seed having to carry one.
 *
 * Only raster images get a photo, as their `hasPhoto` decides — an SVG or a PDF keeps its tile,
 * because a photograph would misrepresent what the file is.
 */
const PHOTO_COUNT = 24;
const photoFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return `/images/assets/photo-${Math.abs(h) % PHOTO_COUNT}.jpg`;
};


const srcOf = (a: Asset) => a.data ?? (a.type === "image" && !a.name.toLowerCase().endsWith(".svg") ? photoFor(a.id) : undefined);

function Thumb({ a, className = "", badge = true }: { a: Asset; className?: string; badge?: boolean }) {
  const src = srcOf(a);
  if (src) return <div className={`bg-surface-3 bg-cover bg-center ${className}`} style={{ backgroundImage: `url(${src})` }} role="img" aria-label={a.name} />;
  return a.data
    ? <div className={`bg-surface-3 bg-cover bg-center rounded-md ${className}`} style={{ backgroundImage: `url(${a.data})` }} role="img" aria-label={a.name} />
    : <div className={`relative rounded-md grid place-items-center overflow-hidden ${a.type === "image" ? "bg-[linear-gradient(135deg,var(--line-2),var(--ink-4))]" : a.type === "pdf" ? "bg-brand-soft" : "bg-surface-3"} ${className}`} role="img" aria-label={`${a.name} (${TYPE_LABEL[a.type] ?? "FILE"})`}>
        {a.type === "image" ? <svg viewBox="0 0 24 24" className="w-[38%] h-[38%] max-w-8 max-h-8 fill-none stroke-white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>
        : a.type === "pdf" ? <svg viewBox="0 0 24 24" className="w-[38%] h-[38%] max-w-8 max-h-8 fill-none stroke-brand" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M8 13h8M8 17h5" /></svg>
        : <svg viewBox="0 0 24 24" className="w-[38%] h-[38%] max-w-8 max-h-8 fill-none stroke-ink-3" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" /></svg>}
        {a.status === "draft" && <span className="absolute top-1 left-1 text-xs font-bold uppercase tracking-[.04em] bg-warn text-white px-1.5 py-px rounded" title="Not published · pages that use it cannot go live until it is">Draft</span>}
        {badge && <span className="absolute bottom-1 right-1 text-xs font-medium tracking-[.08em] px-1 rounded bg-black/55 text-white">{TYPE_LABEL[a.type] ?? "FILE"}</span>}
      </div>;
}

const STATUS_WORD: Record<string, string> = { published: "live", review: "waiting for a reviewer", inreview: "in author's review", reviewed: "reviewed", bizreview: "in business review", approved: "ready to publish", draft: "draft", scheduled: "scheduled", failed: "failed" };
const FIRST = 5;
/** "Used on N pages": folded to one line with a status summary; opens to the first few pages, then all. */
function UsedOnPages({ used, hrefOf }: { used: { path: string; title: string; status: string }[]; hrefOf: (path: string) => string }) {
  const [open, setOpen] = useState(false); const [all, setAll] = useState(false);
  if (!used.length) return <p className="text-sm text-ink-3 mt-4 pt-3 border-t border-line"><b className="text-ink font-medium">Used on</b> · not used on any page yet</p>;
  const counts = Object.entries(used.reduce<Record<string, number>>((m, p) => ((m[p.status] = (m[p.status] ?? 0) + 1), m), {})).sort((x, y) => y[1] - x[1]);
  const shown = all ? used : used.slice(0, FIRST);
  return <section className="mt-4 border-t border-line pt-1">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 py-2 text-left rounded hover:bg-surface-2 -mx-1 px-1">
      <span className="min-w-0 flex-1"><b className="block text-sm font-medium">Used on {used.length} page{used.length === 1 ? "" : "s"}</b>
        <small className="block text-xs text-ink-3 truncate">{counts.map(([st, n]) => `${n} ${STATUS_WORD[st] ?? st}`).join(" · ")}</small></span>
      <span className="text-xs font-medium text-ink-2 whitespace-nowrap">{open ? "Hide" : "Show"}</span><span aria-hidden className={`text-ink-3 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
    </button>
    {open && <><ul className="text-sm mt-1">{shown.map((p) => <li key={p.path}><Link href={hrefOf(p.path)} className="flex items-center gap-2 py-1.5 border-b border-line last:border-0 hover:bg-surface-2"><Pill status={p.status} /><span className="truncate">{p.title}</span><span className="ml-auto text-ink-3">›</span></Link></li>)}</ul>
      {used.length > FIRST && <button type="button" className="btn-ghost mt-1.5" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${used.length}`}</button>}</>}
  </section>;
}

export function AssetLibrary({ marketId, envId, marketName, root, assets, folders, usage, locales, folder, view }: Props) {
  const ask = useConfirm();
  const router = useRouter(); const { can, marketRoot, user } = useSession();
  /** Assets that still miss accessibility info (alt text, or title/language/tagged for documents). */
  const noAlt = useMemo(() => assets.filter((x) => a11yGaps(x, locales[0]).length).map((x) => x.id), [assets, locales]);
  const canEdit = can("edit", marketRoot); const canPublish = can("publish", marketRoot);
  const base = `/${marketId}/${envId}`;
  const [q, setQ] = useState(""); const [types, setTypes] = useState<string[]>([]); const mode = useSyncExternalStore(subscribeView, readView, () => "grid" as Mode);
  const compact = mode === "compact";
  /* Multi-select for the bulk actions, as their card does: the box appears on hover and stays
     once it is ticked. A file used on a page is not deletable, so it is not selectable either. */
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const pick = (id: string, on: boolean) => setPicked((p) => { const n = new Set(p); if (on) n.add(id); else n.delete(id); return n; });
  const [limit, setLimit] = useState(PAGE); const listKey = `${folder}|${view}|${q}|${types.join(",")}`; const [seenKey, setSeenKey] = useState(listKey); if (seenKey !== listKey) { setSeenKey(listKey); setLimit(PAGE); }
  const [sel, setSel] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState(false); const [folderName, setFolderName] = useState("");
  const [drag, setDrag] = useState(false);
  const uplRef = useRef<HTMLInputElement>(null); const replRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
  const say = (m: string) => { setErr(null); setToast(m); };

  const usedOn = (id: string) => usage[id] ?? [];
  const list = useMemo(() => assets.filter((a) => (!folder || a.folder === folder) && (view !== "unused" || !usedOn(a.id).length) && (view !== "noalt" || noAlt.includes(a.id)) && (!q || a.name.toLowerCase().includes(q.toLowerCase())) && (!types.length || types.includes(a.type))), [assets, folder, view, q, types, noAlt, usage]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = list.slice(0, limit);
  /* Only ever the explicitly selected file. The old sidebar fell back to list[0] so it always had
     something to show; as a modal that fallback meant it opened on load and reopened on close. */
  const a = assets.find((x) => x.id === sel) ?? null;
  const used = a ? usedOn(a.id) : [];
  const unusedCount = assets.filter((x) => !usedOn(x.id).length).length;
  const title = view === "unused" ? "Not used on any page" : view === "noalt" ? "Missing accessibility info" : folder || "All assets";
  const go = (qs: string) => router.push(`${base}/assets${qs}`);

  async function run(label: string, fn: () => Promise<void>) { setBusy(label); setErr(null); try { await fn(); router.refresh(); } catch (e) { setErr(errText(e)); } finally { setBusy(null); } }
  const upload = (files: File[], into: string) => { if (!files.length || !canEdit) return; run("upload", async () => { const out = await ucpApi.upload(marketId, into, files); if (out[0]) setSel(out[0].id); say(files.length === 1 ? `Uploaded ${files[0].name}` : `Uploaded ${files.length} files`); }); };
  const replace = (file: File) => { if (!a) return; const old = a; run("replace", async () => { const [n] = await ucpApi.upload(marketId, old.folder, [file]); if (!n) throw new Error("Upload returned nothing"); await repoApi.deleteNode(old.path, { text: `replaced ${old.name} with ${n.name}`, target: "assets" }); await repoApi.setProps(n.path, old.a11y ? { "ucp:id": old.id, "ucp:a11y": JSON.stringify(old.a11y) } : { "ucp:id": old.id }); /* keep the id so pages that use it keep working */ setSel(old.id); say(`Replaced ${old.name}`); }); };
  const move = (to: string) => { if (!a || to === a.folder) return; const x = a; run("move", async () => { const folderPath = `/content/dam/${marketId}/${to}`; await repoApi.createNode(folderPath, "sling:Folder", { "jcr:title": to }).catch((e) => { if (!(e instanceof ApiError && e.problem.status === 409)) throw e; }); const n = await repoApi.moveNode(x.path, `${folderPath}/${x.name}`, `moved ${x.name} to ${to}`); await repoApi.setProps(n.path, { "dam:folder": to }); say(`Moved ${x.name} to ${to}`); }); };
  /* Bulk delete over the ticked files. Same guard as the single delete: a file used on a page is
     never selectable, so nothing here can be in use. Colours come from the theme rather than a
     hardcoded white, which is what made the Pages bulk bar vanish in dark mode. */
  const delPicked = async () => {
    const files = assets.filter((x) => picked.has(x.id));
    if (!files.length) return;
    if (!(await ask({ title: `Delete ${files.length} file${files.length === 1 ? "" : "s"}? This cannot be undone.`, danger: true, confirmLabel: `Delete ${files.length} file${files.length === 1 ? "" : "s"}`, items: files.map((x) => ({ label: x.name, note: x.folder })) }))) return;
    run("delete", async () => {
      for (const x of files) await repoApi.deleteNode(x.path, { text: `deleted ${x.name}`, target: "assets" });
      setPicked(new Set()); setSel(null); say(`Deleted ${files.length} file${files.length === 1 ? "" : "s"}`);
    });
  };
  const del = async () => { if (!a || used.length) return; const x = a; if (!(await ask({ title: `Delete ${x.name}? This cannot be undone.`, danger: true, confirmLabel: "Delete asset" }))) return; run("delete", async () => { await repoApi.deleteNode(x.path, { text: `deleted ${x.name}`, target: "assets" }); setSel(null); say(`Deleted ${x.name}`); }); };
  const saveA11y = (v: AssetA11y) => { if (!a) return; const x = a; run("a11y", async () => { await repoApi.setProps(x.path, { "ucp:a11y": JSON.stringify({ ...v, checkedBy: user.name, checkedAt: new Date().toISOString() }) }, { text: `updated accessibility of ${x.name}`, target: "assets" }); say(`Saved accessibility for ${x.name}`); }); };
  const copyId = async () => { if (!a) return; try { await navigator.clipboard.writeText(a.id); say(`Copied ${a.id}`); } catch { setErr("Clipboard is not available in this browser"); } };
  const createFolder = () => { const name = folderName.trim(); if (!name) return; run("folder", async () => { await repoApi.createNode(`/content/dam/${marketId}/${name}`, "sling:Folder", { "jcr:title": name }, { text: `created asset folder ${name}`, target: "assets" }); setNewFolder(false); setFolderName(""); say(`Created folder ${name}`); go(`?folder=${encodeURIComponent(name)}`); }); };

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDrag(false); const files = Array.from(e.dataTransfer.files ?? []); if (files.length) upload(files, folder || "Uploads"); };

  return (
    <div className="grid h-[calc(100svh-4rem)] min-h-0 grid-cols-1 gap-4 overflow-hidden p-4 pt-0 lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-[auto_minmax(0,1fr)] group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100svh-3rem)]">
      <SideTree label="Folders" className="lg:row-span-2" action={canEdit ? <NewFolderButton onClick={() => setNewFolder(true)} /> : undefined}>
        <FolderList root={{ label: "All assets", count: assets.length, active: !folder && !view, onClick: () => go("") }} items={folders.map((f) => ({ key: f, label: f, count: assets.filter((x) => x.folder === f).length, active: folder === f, onClick: () => go(`?folder=${encodeURIComponent(f)}`) }))} />
        <h3 className="mt-3 mb-1 px-4 text-xs font-medium text-ink-3">Smart views</h3>
        <FolderList root={{ label: "Needs attention", count: unusedCount + noAlt.length }} items={[{ key: "unused", label: "Not used on any page", count: unusedCount, active: view === "unused", onClick: () => go("?view=unused"), icon: "page" }, { key: "noalt", label: "Missing accessibility info", count: noAlt.length, active: view === "noalt", onClick: () => go("?view=noalt"), icon: "page" }]} />
      </SideTree>

      <div className="flex min-w-0 shrink-0 items-center justify-end">
        {canEdit
          ? <button type="button" className="btn btn-primary inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 px-4 text-sm" disabled={busy === "upload"} onClick={() => uplRef.current?.click()}><Upload className="size-4" />{busy === "upload" ? "Uploading…" : "Upload files"}</button>
          : <span className="inline-flex shrink-0 items-center gap-1.5 border border-line bg-surface-3 px-3 py-1.5 text-xs text-ink-3" title="You don't have Edit on this site. Ask a site admin."><Lock className="size-3.5" />Read-only library</span>}
      </div>
      <div className={`flex min-h-0 flex-col overflow-hidden border border-line bg-surface ${drag ? "outline outline-2 outline-dashed outline-brand -outline-offset-8" : ""}`} onDragOver={(e) => { if (canEdit && e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDrag(true); } }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }} onDrop={onDrop}>
        <input ref={uplRef} type="file" multiple accept="image/*,.pdf,.svg" className="hidden" onChange={(e) => { upload(Array.from(e.target.files ?? []), folder || "Uploads"); e.target.value = ""; }} />
        <input ref={replRef} type="file" accept="image/*,.pdf,.svg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) replace(f); e.target.value = ""; }} />
        <div className="flex shrink-0 items-center gap-4 border-b border-line px-4 py-3">
          <div className="min-w-28 flex-1">
            <h2 className="truncate text-base font-medium" title={title}>{title}</h2>
            <p className="truncate text-xs text-ink-3">{list.length} file{list.length === 1 ? "" : "s"}{folder ? " in this folder" : view ? " in this view" : ` in the ${marketName} library`}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
              <input className="h-9 w-44 border border-input bg-surface ps-8 pe-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring xl:w-56" placeholder="Find a file" aria-label="Find a file by name" value={q} onChange={(e) => setQ(e.target.value)} />
              {q && <button type="button" className="absolute end-1.5 top-1/2 inline-flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center text-ink-3 transition-colors hover:text-ink" aria-label="Clear search" onClick={() => setQ("")}><X className="size-4" /></button>}
            </div>
            <MultiFilter label="Type" noun="files" options={TYPE_OPTIONS} value={types} onChange={setTypes} />
            <ViewToggle view={mode} onChange={setView} modes={VIEW_MODES} />
          </div>
        </div>
        <div className="relative min-h-0 flex-1 overflow-auto p-4">
        {err && <div className="text-crit text-xs bg-crit-soft px-3 py-2 rounded mb-4 flex items-center">{err}<button className="ml-auto underline" onClick={() => setErr(null)}>Dismiss</button></div>}

        <div className="min-w-0">
          {mode === "list"
            ? <div className="min-w-0"><div className="bg-surface border border-line rounded-xl overflow-hidden"><table className="w-full text-sm [&_tr>*:nth-child(2)]:hidden 2xl:[&_tr>*:nth-child(2)]:table-cell [&_tr>*:nth-child(3)]:hidden 2xl:[&_tr>*:nth-child(3)]:table-cell">
              <thead className="bg-surface-2"><tr className="text-left text-xs uppercase tracking-[.08em] text-ink-3"><th className="px-4 py-2.5 border-b border-line font-medium">Name</th><th className="px-4 py-2.5 border-b border-line font-medium w-[1%] whitespace-nowrap">Used on</th><th className="px-4 py-2.5 border-b border-line font-medium w-[1%] whitespace-nowrap">Accessibility</th></tr></thead>
              <tbody>{list.length ? shown.map((x) => { const on = x.id === a?.id; const n = usedOn(x.id).length; const gaps = noAlt.includes(x.id) ? a11yGaps(x, locales[0]) : [];
                const a11y = gaps.length ? <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft text-warn px-2 py-0.5 text-xs font-medium whitespace-nowrap" title={`Missing: ${gaps.join(", ")}`}><i aria-hidden className="w-1.5 h-1.5 rounded-full bg-warn" />{gaps.length > 1 ? `${gaps.length} things missing` : `No ${gaps[0].toLowerCase()}`}</span> : <span className="inline-flex items-center gap-1 rounded-full bg-good-soft text-good px-2 py-0.5 text-xs font-medium whitespace-nowrap">✓ Complete</span>;
                return <tr key={x.id} onClick={() => setSel(x.id)} aria-selected={on} className={`cursor-pointer border-b border-line last:border-0 ${on ? "bg-brand-soft shadow-[inset_3px_0_0_var(--brand)]" : "hover:bg-surface-2"}`}>
                  <td className="px-4 py-2.5 max-w-0 w-full"><div className="flex items-center gap-3 min-w-0"><Thumb a={x} badge={false} className="w-12 h-9 shrink-0" />
                    <div className="min-w-0"><b className="block truncate font-medium" title={x.name}>{x.name}</b>
                      <div className="flex items-center gap-1.5 text-xs text-ink-3 truncate"><FileTypeBadge name={x.name} /><span className="tabular-nums">{x.size}</span>{!folder && <> · {x.folder}</>}<span className="2xl:hidden"> · {n ? `${n} page${n === 1 ? "" : "s"}` : "not used"}</span></div>
                      <div className="2xl:hidden mt-1">{a11y}</div></div></div></td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{n ? <span className="text-ink-2">{n} page{n === 1 ? "" : "s"}</span> : <span className="text-ink-4">Not used</span>}</td>
                  <td className="px-4 py-2.5">{a11y}</td>
                </tr>; })
                : <tr><td colSpan={3} className="p-10 text-center text-ink-3">No files here yet.{canEdit && " Upload some or drag them in."}</td></tr>}</tbody></table></div>
            {list.length > shown.length && <div className="flex items-center justify-center gap-3 py-4 text-xs text-ink-3">Showing {shown.length} of {list.length}<button className="btn btn-sm btn-secondary" onClick={() => setLimit(limit + PAGE)}>Show more</button></div>}</div>
            : <div className={`grid gap-3 ${compact ? "[grid-template-columns:repeat(auto-fill,minmax(9rem,1fr))]" : "[grid-template-columns:repeat(auto-fill,minmax(13.5rem,1fr))]"}`}>{list.length ? shown.map((x) => { const gaps = a11yGaps(x, locales[0]); const uses = usedOn(x.id).length; const selectable = canEdit && !uses; return (
              <div
                key={x.id}
                data-selected={a?.id === x.id}
                className="group relative flex flex-col border border-line bg-surface transition-[box-shadow,border-color] duration-160 ease-out hover:shadow-sm data-[selected=true]:border-brand data-[selected=true]:shadow-[inset_0_0_0_1px_var(--brand)]"
              >
                <div className="relative">
                  <button type="button" onClick={() => setSel(x.id)} aria-label={`Open ${x.name}`} className="block w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none">
                    <Thumb a={x} className="aspect-[16/10] w-full border-b border-line" />
                  </button>
                  {selectable ? (
                    <label className="absolute top-2 start-2 flex size-7 cursor-pointer items-center justify-center bg-background/90 opacity-0 shadow-xs transition-opacity duration-160 ease-out group-hover:opacity-100 focus-within:opacity-100 has-[:checked]:opacity-100">
                      <input type="checkbox" className="bdl-checkbox bdl-checkbox-sm" aria-label={`Select ${x.name}`} checked={picked.has(x.id)} onChange={(e) => pick(x.id, e.target.checked)} />
                    </label>
                  ) : canEdit && uses > 0 ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={<span className="absolute top-2 start-2 flex size-7 cursor-help items-center justify-center bg-background/90 text-ink-3 shadow-xs" aria-label={`Used on ${uses} page${uses === 1 ? "" : "s"}, so it cannot be selected for deletion`} />}
                      >
                        <Lock className="size-3.5" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-56">Used on {uses} page{uses === 1 ? "" : "s"} · remove it from {uses === 1 ? "that page" : "those pages"} before it can be deleted.</TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
                <div className={`flex flex-col ${compact ? "gap-1 p-2" : "gap-1.5 p-3"}`}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill status={x.status} />
                    <FileTypeBadge name={x.name} />
                    {!compact && noAlt.includes(x.id) && <span className="bdl-badge-warning ms-auto shrink-0 border px-1.5 text-xs" title={`Missing: ${gaps.join(", ")}`}>Needs alt</span>}
                    {compact && noAlt.includes(x.id) && <TriangleAlert className="ms-auto size-3.5 shrink-0 text-warn" aria-label={`Missing: ${gaps.join(", ")}`} />}
                  </div>
                  <button type="button" onClick={() => setSel(x.id)} title={x.name} className={`block w-full cursor-pointer truncate text-start font-medium hover:underline focus-visible:underline focus-visible:outline-none ${compact ? "text-xs" : "text-sm"}`}>{x.name}</button>
                  <p className="truncate text-xs text-ink-3" title={`${x.name} · ${x.size} · ${x.folder}`}>
                    <span className="tabular-nums">{x.size}</span>{!compact && !folder ? ` · ${x.folder}` : ""}
                  </p>
                </div>
              </div>
            ); })
              : <div className="col-span-full p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">No files here yet.{canEdit && " Upload some or drag them in."}</div>}
              {list.length > shown.length && <div className="col-span-full flex items-center justify-center gap-3 py-4 text-xs text-ink-3">Showing {shown.length} of {list.length}<button className="btn btn-sm btn-secondary" onClick={() => setLimit(limit + PAGE)}>Show more</button></div>}</div>}

        </div>
        {picked.size > 0 && (
          <div className="sticky bottom-2 z-20 mx-auto mt-4 flex w-fit max-w-full flex-wrap items-center justify-center gap-2 bg-foreground px-4 py-2.5 text-sm text-background shadow-xl">
            <b className="whitespace-nowrap">{picked.size} selected</b>
            <button type="button" className="btn btn-sm cursor-pointer border border-background/30 bg-transparent text-background hover:bg-background/10" disabled={!!busy} onClick={() => void delPicked()}>Delete</button>
            <button type="button" className="btn btn-sm cursor-pointer border border-transparent bg-transparent text-background/75 hover:text-background" onClick={() => setPicked(new Set())}>Clear</button>
          </div>
        )}
        </div>
      </div>

      {a && (
        <Dialog open onOpenChange={(open) => { if (!open) setSel(null); }}>
          <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-5xl">
            <DialogTitle className="sr-only">{a.name}</DialogTitle>
            <div className="grid max-h-[85svh] lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="relative flex min-h-[18rem] items-center justify-center bg-neutral-950 lg:min-h-[28rem]">
                {srcOf(a)
                  ? <img src={srcOf(a)} alt={a.name} className="max-h-[85svh] w-full object-contain lg:max-h-[70svh]" />
                  : <Thumb a={a} badge={false} className="size-40" />}
              </div>
              <div className="min-h-0 overflow-y-auto border-line p-4 lg:border-s">
            <Thumb a={a} className="w-full h-[180px]" />
            <b className="block mt-3 mb-0.5 break-all text-sm">{a.name}</b>
            <div className="text-xs text-ink-3 tabular-nums">{a.width && a.height ? `${a.width}×${a.height} · ` : ""}{a.size} · {a.folder}</div>
            {(a.uploadedBy || a.uploaded) && <div className="text-xs text-ink-3 mt-0.5">Uploaded{a.uploadedBy ? ` by ${who(a.uploadedBy)}` : ""}{a.uploaded ? ` ${when(a.uploaded)}` : ""}</div>}
            <div className="mt-2 flex items-center gap-2 text-xs">{a.status === "published"
              ? <span className="inline-flex items-center gap-1.5 text-good font-medium"><i className="w-2 h-2 rounded-full bg-good" />Published{a.publishedAt ? <span className="font-normal text-ink-3"> {when(a.publishedAt)}{a.publishedBy ? ` by ${who(a.publishedBy)}` : ""}</span> : null}</span>
              : <><span className="inline-flex items-center gap-1.5 text-warn font-medium"><i className="w-2 h-2 rounded-full bg-warn" />Not published</span>{canPublish && <button className="btn btn-sm btn-primary ml-auto" disabled={!!busy} onClick={() => { const x = a; run("publish", async () => { await ucpApi.publishAssets(marketId, [x.id]); say(`Published ${x.name}`); }); }}>{busy === "publish" ? "Publishing…" : "Publish"}</button>}</>}</div>
            <A11yPanel key={`${a.id}:${JSON.stringify(a.a11y ?? {})}`} asset={a} locales={locales} canEdit={canEdit} busy={busy === "a11y"} onSave={saveA11y} />
            <UsedOnPages key={a.id} used={used} hrefOf={(p) => `${base}/page${p.replace(root, "")}`} />
            <div className="flex flex-wrap gap-1.5 mt-4">
              {canEdit && <><button className="btn btn-sm btn-secondary" disabled={!!busy} onClick={() => replRef.current?.click()}>{busy === "replace" ? "Replacing…" : "Replace"}</button>
              <label className="btn btn-sm btn-secondary gap-1.5">Move to <select className="bg-transparent border-0 text-[inherit]" value={a.folder} disabled={!!busy} onChange={(e) => move(e.target.value)} aria-label="Move to folder">{folders.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
              <button className="btn btn-sm btn-secondary" disabled={!!busy || !!used.length} title={used.length ? "Remove it from pages first" : undefined} onClick={del}>{busy === "delete" ? "Deleting…" : "Delete"}</button></>}
              <button className="btn btn-sm btn-secondary" onClick={copyId} title={a.id}>Copy id</button>
            </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {newFolder && canEdit && <div className="fixed inset-0 bg-black/45 grid place-items-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setNewFolder(false); }}>
        <div role="dialog" aria-labelledby="nf" className="bg-surface rounded-xl w-[min(480px,94vw)] shadow-2xl">
          <header className="px-6 pt-5 pb-3 flex items-center"><h2 id="nf" className="text-lg font-medium">New folder</h2><button className="ml-auto w-8 h-8 rounded text-ink-3 hover:bg-surface-3" onClick={() => setNewFolder(false)} aria-label="Close">×</button></header>
          <div className="px-6 pb-2"><label className="text-xs text-ink-3">Folder name<input autoFocus className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-sm text-ink" value={folderName} onChange={(e) => setFolderName(e.target.value.replace(/[\/\\]/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") createFolder(); }} placeholder="e.g. Spring campaign" /></label><div className="mt-1 text-xs text-ink-3">/content/dam/{marketId}/{folderName.trim() || "…"}</div></div>
          <footer className="px-6 pb-5 pt-3 flex justify-end gap-2"><button className="btn btn-sm btn-secondary" onClick={() => setNewFolder(false)}>Cancel</button><button className="btn btn-sm btn-primary" disabled={!folderName.trim() || busy === "folder"} onClick={createFolder}>{busy === "folder" ? "Creating…" : "Create folder"}</button></footer>
        </div></div>}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2.5 rounded-lg text-sm z-50">{toast}</div>}
    </div>
  );
}
