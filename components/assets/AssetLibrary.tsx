"use client";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { FolderList } from "@/components/ui/FolderList";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset, AssetA11y } from "@/lib/ucp/types";
import { a11yGaps } from "@/lib/ucp/schema";
import { A11yPanel } from "./A11yPanel";
import { repoApi, ucpApi, ApiError } from "@/lib/api";
import { errorText as errText } from "@/lib/api/errors";
import { useSession } from "@/components/shell/Session";
import { Pill } from "@/components/ui/Pill";

type Usage = Record<string, { path: string; title: string; status: string }[]>;
type Props = { marketId: string; envId: string; marketName: string; flag: string; root: string; assets: Asset[]; folders: string[]; usage: Usage; locales: string[]; folder: string; view: "" | "unused" | "noalt" };

const TYPE_LABEL: Record<string, string> = { image: "IMAGE", pdf: "PDF", svg: "SVG", file: "FILE" };
const PAGE = 60;
const who = (id?: string) => (!id ? "" : id === "system" ? "System" : id.split(".").map((s) => (s[0]?.toUpperCase() ?? "") + s.slice(1)).join(" "));
const when = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return iso; const diff = Math.round((Date.now() - d.getTime()) / 60000); return diff < 2 ? "just now" : diff < 60 ? `${diff} min ago` : diff < 1440 ? `${Math.round(diff / 60)} h ago` : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };

/** Thumbnail: the real picture when the repository holds it, otherwise a calm grey tile with the file type. */
function Thumb({ a, className = "" }: { a: Asset; className?: string }) {
  return a.data
    ? <div className={`bg-surface-3 bg-cover bg-center rounded-md ${className}`} style={{ backgroundImage: `url(${a.data})` }} role="img" aria-label={a.name} />
    : <div className={`relative rounded-md grid place-items-center overflow-hidden ${a.type === "image" ? "bg-[linear-gradient(135deg,#dfe3ea,#b8bfcc)]" : a.type === "pdf" ? "bg-[#FDECEE]" : "bg-surface-3"} ${className}`} role="img" aria-label={`${a.name} (${TYPE_LABEL[a.type] ?? "FILE"})`}>
        {a.type === "image" ? <svg viewBox="0 0 24 24" className="w-[38%] h-[38%] max-w-8 max-h-8 fill-none stroke-white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>
        : a.type === "pdf" ? <svg viewBox="0 0 24 24" className="w-[38%] h-[38%] max-w-8 max-h-8 fill-none stroke-accent" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M8 13h8M8 17h5" /></svg>
        : <svg viewBox="0 0 24 24" className="w-[38%] h-[38%] max-w-8 max-h-8 fill-none stroke-ink-3" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" /></svg>}
        <span className="absolute bottom-1 right-1 text-[9.5px] font-semibold tracking-[.08em] px-1 rounded bg-black/55 text-white">{TYPE_LABEL[a.type] ?? "FILE"}</span>
      </div>;
}

export function AssetLibrary({ marketId, envId, marketName, flag, root, assets, folders, usage, locales, folder, view }: Props) {
  const router = useRouter(); const { can, marketRoot, user } = useSession();
  /** Assets that still miss accessibility info (alt text, or title/language/tagged for documents). */
  const noAlt = useMemo(() => assets.filter((x) => a11yGaps(x, locales[0]).length).map((x) => x.id), [assets, locales]);
  const canEdit = can("edit", marketRoot);
  const base = `/${marketId}/${envId}`;
  const [q, setQ] = useState(""); const [type, setType] = useState(""); const [mode, setMode] = useState<"grid" | "list">(() => { try { return (typeof window !== "undefined" && localStorage.getItem("ucp-assets-view") === "list") ? "list" : "grid"; } catch { return "grid"; } });
  const [limit, setLimit] = useState(PAGE); const listKey = `${folder}|${view}|${q}|${type}`; const [seenKey, setSeenKey] = useState(listKey); if (seenKey !== listKey) { setSeenKey(listKey); setLimit(PAGE); }
  const [sel, setSel] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState(false); const [folderName, setFolderName] = useState("");
  const [drag, setDrag] = useState(false);
  const uplRef = useRef<HTMLInputElement>(null); const replRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
  const say = (m: string) => { setErr(null); setToast(m); };

  const usedOn = (id: string) => usage[id] ?? [];
  const list = useMemo(() => assets.filter((a) => (!folder || a.folder === folder) && (view !== "unused" || !usedOn(a.id).length) && (view !== "noalt" || noAlt.includes(a.id)) && (!q || a.name.toLowerCase().includes(q.toLowerCase())) && (!type || a.type === type)), [assets, folder, view, q, type, noAlt, usage]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = list.slice(0, limit);
  const a = assets.find((x) => x.id === sel) ?? list[0];
  const used = a ? usedOn(a.id) : [];
  const unusedCount = assets.filter((x) => !usedOn(x.id).length).length;
  const title = view === "unused" ? "Not used on any page" : view === "noalt" ? "Missing accessibility info" : folder || "All assets";
  const go = (qs: string) => router.push(`${base}/assets${qs}`);

  async function run(label: string, fn: () => Promise<void>) { setBusy(label); setErr(null); try { await fn(); router.refresh(); } catch (e) { setErr(errText(e)); } finally { setBusy(null); } }
  const upload = (files: File[], into: string) => { if (!files.length || !canEdit) return; run("upload", async () => { const out = await ucpApi.upload(marketId, into, files); if (out[0]) setSel(out[0].id); say(files.length === 1 ? `Uploaded ${files[0].name}` : `Uploaded ${files.length} files`); }); };
  const replace = (file: File) => { if (!a) return; const old = a; run("replace", async () => { const [n] = await ucpApi.upload(marketId, old.folder, [file]); if (!n) throw new Error("Upload returned nothing"); await repoApi.deleteNode(old.path, { text: `replaced ${old.name} with ${n.name}`, target: "assets" }); await repoApi.setProps(n.path, old.a11y ? { "ucp:id": old.id, "ucp:a11y": JSON.stringify(old.a11y) } : { "ucp:id": old.id }); /* keep the id so pages that use it keep working */ setSel(old.id); say(`Replaced ${old.name}`); }); };
  const move = (to: string) => { if (!a || to === a.folder) return; const x = a; run("move", async () => { const folderPath = `/content/dam/${marketId}/${to}`; await repoApi.createNode(folderPath, "sling:Folder", { "jcr:title": to }).catch((e) => { if (!(e instanceof ApiError && e.problem.status === 409)) throw e; }); const n = await repoApi.moveNode(x.path, `${folderPath}/${x.name}`, `moved ${x.name} to ${to}`); await repoApi.setProps(n.path, { "dam:folder": to }); say(`Moved ${x.name} to ${to}`); }); };
  const del = () => { if (!a || used.length) return; const x = a; if (!confirm(`Delete ${x.name}? This cannot be undone.`)) return; run("delete", async () => { await repoApi.deleteNode(x.path, { text: `deleted ${x.name}`, target: "assets" }); setSel(null); say(`Deleted ${x.name}`); }); };
  const saveA11y = (v: AssetA11y) => { if (!a) return; const x = a; run("a11y", async () => { await repoApi.setProps(x.path, { "ucp:a11y": JSON.stringify({ ...v, checkedBy: user.name, checkedAt: new Date().toISOString() }) }, { text: `updated accessibility of ${x.name}`, target: "assets" }); say(`Saved accessibility for ${x.name}`); }); };
  const copyId = async () => { if (!a) return; try { await navigator.clipboard.writeText(a.id); say(`Copied ${a.id}`); } catch { setErr("Clipboard is not available in this browser"); } };
  const createFolder = () => { const name = folderName.trim(); if (!name) return; run("folder", async () => { await repoApi.createNode(`/content/dam/${marketId}/${name}`, "sling:Folder", { "jcr:title": name }, { text: `created asset folder ${name}`, target: "assets" }); setNewFolder(false); setFolderName(""); say(`Created folder ${name}`); go(`?folder=${encodeURIComponent(name)}`); }); };

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDrag(false); const files = Array.from(e.dataTransfer.files ?? []); if (files.length) upload(files, folder || "Uploads"); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] grid-rows-[auto_1fr] md:grid-rows-1 h-full min-h-0">
      <aside className="bg-surface border-r border-line p-3 overflow-auto">
        <h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold px-2 mb-2">Asset library</h6>
        <FolderList root={{ label: `${flag} All assets`, count: assets.length, active: !folder && !view, onClick: () => go("") }} items={folders.map((f) => ({ key: f, label: f, count: assets.filter((x) => x.folder === f).length, active: folder === f, onClick: () => go(`?folder=${encodeURIComponent(f)}`) }))} />
        {canEdit && <button className="btn btn-quiet btn-sm mt-2.5 ml-1" onClick={() => setNewFolder(true)}>＋ New folder</button>}
        <h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold px-2 mt-5 mb-2">Smart views</h6>
        <FolderList root={{ label: "Needs attention", count: unusedCount + noAlt.length }} items={[{ key: "unused", label: "Not used on any page", count: unusedCount, active: view === "unused", onClick: () => go("?view=unused"), icon: "page" }, { key: "noalt", label: "Missing accessibility info", count: noAlt.length, active: view === "noalt", onClick: () => go("?view=noalt"), icon: "page" }]} />
      </aside>

      <div className={`p-7 overflow-auto min-h-0 relative ${drag ? "outline outline-2 outline-dashed outline-accent -outline-offset-8" : ""}`} onDragOver={(e) => { if (canEdit && e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDrag(true); } }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }} onDrop={onDrop}>
        <input ref={uplRef} type="file" multiple accept="image/*,.pdf,.svg" className="hidden" onChange={(e) => { upload(Array.from(e.target.files ?? []), folder || "Uploads"); e.target.value = ""; }} />
        <input ref={replRef} type="file" accept="image/*,.pdf,.svg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) replace(f); e.target.value = ""; }} />
        <div className="text-[12.5px] text-ink-3 mb-2 flex items-center gap-1.5"><button className="hover:underline" onClick={() => go("")}>Asset library</button>{(folder || view) && <><span>/</span><b className="text-ink">{title}</b></>}</div>
        <div className="flex items-end gap-4 mb-5"><div><h1 className="text-2xl font-semibold">{title}</h1><p className="text-ink-3 text-[13px] mt-1">{list.length} file{list.length === 1 ? "" : "s"}{folder ? " in this folder" : view ? " in this view" : ` in the ${marketName} library`}{canEdit && " · drag files anywhere here to upload"}</p></div>
          <div className="ml-auto flex gap-2 items-center">{canEdit ? <><button className="btn" onClick={() => setNewFolder(true)}>＋ New folder</button><button className="btn btn-primary" disabled={busy === "upload"} onClick={() => uplRef.current?.click()}>{busy === "upload" ? "Uploading…" : "↑ Upload files"}</button></> : <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 bg-surface-3 border border-line rounded-full px-3 py-1.5" title="You don't have Edit on this site. Ask a site admin."><span aria-hidden="true">🔒</span>Read-only library</span>}</div></div>
        <div className="flex items-center gap-2 mb-4">
          <input className="border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] w-[280px]" placeholder="Find a file by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a file by name" />
          <select className="border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] bg-surface" value={type} onChange={(e) => setType(e.target.value)} aria-label="File type"><option value="">Any type</option><option value="image">Images</option><option value="pdf">Documents</option><option value="svg">Icons</option></select>
          <ViewToggle value={mode} onChange={(v) => { setMode(v); try { localStorage.setItem("ucp-assets-view", v); } catch {} }} className="ml-auto" />
        </div>
        {err && <div className="text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded mb-4 flex items-center">{err}<button className="ml-auto underline" onClick={() => setErr(null)}>Dismiss</button></div>}

        <div className="grid grid-cols-[1fr_320px] gap-5 items-start">
          {mode === "list"
            ? <div><div className="overflow-auto"><table className="w-full text-[13.5px] bg-surface border border-line min-w-[640px]"><thead><tr className="text-left text-[11.5px] uppercase tracking-[.06em] text-ink-3"><th className="p-3 border-b border-line-2">Name</th><th className="p-3 border-b border-line-2">Type</th><th className="p-3 border-b border-line-2">Size</th><th className="p-3 border-b border-line-2">Folder</th><th className="p-3 border-b border-line-2">Used on</th><th className="p-3 border-b border-line-2">Accessibility</th></tr></thead>
              <tbody>{list.length ? shown.map((x) => <tr key={x.id} onClick={() => setSel(x.id)} className={`cursor-pointer hover:bg-surface-2 ${a && x.id === a.id ? "bg-accent-soft" : ""}`}><td className="p-3 border-b border-line font-medium flex items-center gap-2.5"><Thumb a={x} className="w-9 h-7 shrink-0" />{x.name}</td><td className="p-3 border-b border-line text-ink-3">{x.type}</td><td className="p-3 border-b border-line font-mono text-xs">{x.size}</td><td className="p-3 border-b border-line text-ink-3">{x.folder}</td><td className="p-3 border-b border-line text-ink-3">{usedOn(x.id).length} pages</td><td className="p-3 border-b border-line">{noAlt.includes(x.id) ? <span className="text-[11.5px] font-semibold text-warn">Missing {a11yGaps(x, locales[0]).join(", ").toLowerCase()}</span> : <span className="text-[11.5px] font-semibold text-good">Complete</span>}</td></tr>)
                : <tr><td colSpan={6} className="p-10 text-center text-ink-3">No files here yet.{canEdit && " Upload some or drag them in."}</td></tr>}</tbody></table></div>
            {list.length > shown.length && <div className="flex items-center justify-center gap-3 py-4 text-[12.5px] text-ink-3">Showing {shown.length} of {list.length}<button className="btn btn-sm" onClick={() => setLimit(limit + PAGE)}>Show more</button></div>}</div>
            : <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">{list.length ? shown.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={`text-left bg-surface border rounded-lg p-2 hover:border-ink-4 ${a && x.id === a.id ? "border-accent ring-2 ring-accent-soft" : "border-line"}`}><Thumb a={x} className="w-full h-[96px]" /><b className="block text-[12.5px] mt-2 truncate" title={x.name}>{x.name}</b><small className="text-ink-3 text-[11.5px] flex items-center gap-1.5">{x.size}{noAlt.includes(x.id) && <span className="ml-auto text-[10.5px] font-semibold px-1.5 rounded bg-warn-soft text-warn" title={`Missing: ${a11yGaps(x, locales[0]).join(", ")}`}>A11y</span>}</small></button>)
              : <div className="col-span-full p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">No files here yet.{canEdit && " Upload some or drag them in."}</div>}
              {list.length > shown.length && <div className="col-span-full flex items-center justify-center gap-3 py-4 text-[12.5px] text-ink-3">Showing {shown.length} of {list.length}<button className="btn btn-sm" onClick={() => setLimit(limit + PAGE)}>Show more</button></div>}</div>}

          {a && <div className="bg-surface border border-line rounded-lg p-4 sticky top-0">
            <Thumb a={a} className="w-full h-[180px]" />
            <b className="block mt-3 mb-0.5 break-all text-[14px]">{a.name}</b>
            <div className="font-mono text-[12px] text-ink-3">{a.width && a.height ? `${a.width}×${a.height} · ` : ""}{a.size} · {a.folder}</div>
            {(a.uploadedBy || a.uploaded) && <div className="text-[12px] text-ink-3 mt-0.5">Uploaded{a.uploadedBy ? ` by ${who(a.uploadedBy)}` : ""}{a.uploaded ? ` ${when(a.uploaded)}` : ""}</div>}
            <A11yPanel key={`${a.id}:${JSON.stringify(a.a11y ?? {})}`} asset={a} locales={locales} canEdit={canEdit} busy={busy === "a11y"} onSave={saveA11y} />
            <h3 className="text-[13px] font-semibold mt-4 mb-1.5">Used on {used.length} page{used.length === 1 ? "" : "s"}</h3>
            <ul className="text-[13px]">{used.length ? used.map((p) => <li key={p.path}><Link href={`${base}/page${p.path.replace(root, "")}`} className="flex items-center gap-2 py-1.5 border-b border-line hover:bg-surface-2"><Pill status={p.status} /><span className="truncate">{p.title}</span><span className="ml-auto text-ink-3">›</span></Link></li>) : <li className="text-ink-3">Not used on any page yet.</li>}</ul>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {canEdit && <><button className="btn btn-sm" disabled={!!busy} onClick={() => replRef.current?.click()}>{busy === "replace" ? "Replacing…" : "Replace"}</button>
              <label className="btn btn-sm gap-1.5">Move to <select className="bg-transparent border-0 text-[inherit]" value={a.folder} disabled={!!busy} onChange={(e) => move(e.target.value)} aria-label="Move to folder">{folders.map((f) => <option key={f} value={f}>{f}</option>)}</select></label>
              <button className="btn btn-sm" disabled={!!busy || !!used.length} title={used.length ? "Remove it from pages first" : undefined} onClick={del}>{busy === "delete" ? "Deleting…" : "Delete"}</button></>}
              <button className="btn btn-sm" onClick={copyId} title={a.id}>Copy id</button>
            </div>
          </div>}
        </div>
      </div>

      {newFolder && canEdit && <div className="fixed inset-0 bg-black/45 grid place-items-center z-50" onClick={(e) => { if (e.target === e.currentTarget) setNewFolder(false); }}>
        <div role="dialog" aria-labelledby="nf" className="bg-surface rounded-xl w-[min(480px,94vw)] shadow-2xl">
          <header className="px-6 pt-5 pb-3 flex items-center"><h2 id="nf" className="text-lg font-semibold">New folder</h2><button className="ml-auto w-8 h-8 rounded text-ink-3 hover:bg-surface-3" onClick={() => setNewFolder(false)} aria-label="Close">×</button></header>
          <div className="px-6 pb-2"><label className="text-xs text-ink-3">Folder name<input autoFocus className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink" value={folderName} onChange={(e) => setFolderName(e.target.value.replace(/[\/\\]/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") createFolder(); }} placeholder="e.g. Spring campaign" /></label><div className="mt-1 font-mono text-[11px] text-ink-3">/content/dam/{marketId}/{folderName.trim() || "…"}</div></div>
          <footer className="px-6 pb-5 pt-3 flex justify-end gap-2"><button className="btn" onClick={() => setNewFolder(false)}>Cancel</button><button className="btn btn-primary" disabled={!folderName.trim() || busy === "folder"} onClick={createFolder}>{busy === "folder" ? "Creating…" : "Create folder"}</button></footer>
        </div></div>}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] z-50">{toast}</div>}
    </div>
  );
}
