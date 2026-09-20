"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Template } from "@/lib/ucp/types";
import { PATHS } from "@/lib/ucp/paths";
import { BLOCKS, GROUPS, BLOCK_BY_TYPE } from "@/lib/blocks/registry";
import { repoApi, ApiError } from "@/lib/api";
import { TemplatePreview } from "./TemplatePreview";
import { tplFolders, tplFolderOf } from "./TemplateLibrary";

type Props = { marketId: string; envId: string; marketName: string; template: Template; templates: Template[]; used: number };
const errText = (e: unknown) => (e instanceof ApiError ? `${e.problem.title} · request ${e.requestId ?? "n/a"}` : String(e));

export function TemplateEditor({ marketId, envId, marketName, template: t, templates, used }: Props) {
  const router = useRouter();
  const base = `/${marketId}/${envId}`;
  const [name, setName] = useState(t.name); const [desc, setDesc] = useState(t.desc); const [blocks, setBlocks] = useState<string[]>(t.blocks); const [folder, setFolder] = useState(tplFolderOf(t));
  const [add, setAdd] = useState(BLOCKS[0].type); const [toast, setToast] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const folders = useMemo(() => tplFolders(templates, marketName, [folder]), [templates, marketName, folder]);
  const say = (s: string) => { setToast(s); setTimeout(() => setToast(null), 2200); };

  async function persist(next: { name?: string; desc?: string; blocks?: string[]; folder?: string }) {
    const v = { name, desc, blocks, folder, ...next }; setSaving(true);
    try { await repoApi.setProps(`${PATHS.templates}/${t.id}`, { "jcr:title": v.name.trim() || t.id, "jcr:description": v.desc, "ucp:blocks": v.blocks.join(","), "ucp:folder": v.folder }, { text: `updated template ${v.name.trim() || t.id}`, target: "templates" }); router.refresh(); }
    catch (e) { say(errText(e)); } finally { setSaving(false); }
  }
  const setBl = (b: string[]) => { setBlocks(b); persist({ blocks: b }); };
  const move = (i: number, d: number) => { const b = [...blocks]; const j = i + d; if (j < 0 || j >= b.length) return; [b[i], b[j]] = [b[j], b[i]]; setBl(b); };
  async function del() {
    if (!confirm(`Delete template “${name}”? Pages already created with it are not affected.`)) return;
    try { await repoApi.deleteNode(`${PATHS.templates}/${t.id}`, { text: `deleted template ${name}`, target: "templates" }); router.push(`${base}/templates`); router.refresh(); } catch (e) { say(errText(e)); }
  }

  return (
    <div className="p-7">
      <div className="text-[13px] text-ink-3 mb-2 flex gap-1.5"><Link href={`${base}/templates`} className="hover:text-ink">Template library</Link><span className="text-ink-4">/</span><Link href={`${base}/templates?folder=${encodeURIComponent(folder)}`} className="hover:text-ink">{folder}</Link><span className="text-ink-4">/</span><b className="text-ink">{name}</b></div>
      <div className="flex items-end gap-4 mb-5 flex-wrap"><div className="min-w-0"><h1 className="text-2xl font-semibold"><input aria-label="Template name" className="text-2xl font-semibold bg-transparent border-b border-transparent hover:border-line-2 focus:border-accent outline-none w-[min(520px,100%)]" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== t.name && persist({ name })} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} /></h1><p className="text-[13px] text-ink-3 mt-1">Used by {used} page{used === 1 ? "" : "s"} · changes affect new pages only{saving && <span className="ml-2 text-ink-4">· saving…</span>}</p></div>
        <div className="ml-auto flex gap-2 flex-wrap"><label className="btn gap-1.5">Folder <select className="bg-transparent outline-none text-[13.5px]" value={folder} onChange={(e) => { setFolder(e.target.value); persist({ folder: e.target.value }); }}>{folders.map((f) => <option key={f}>{f}</option>)}</select></label>
          <Link className="btn" href={`${base}/templates?folder=${encodeURIComponent(folder)}`}>Done</Link><Link className="btn btn-primary" href={`${base}/pages?new=1&template=${t.id}`}>Create a page with it</Link>{t.id !== "blank" && <button className="btn btn-quiet" onClick={del}>Delete</button>}</div></div>
      <div className="grid gap-[18px] items-start" style={{ gridTemplateColumns: "minmax(0,1fr) 380px" }}>
        <div className="bg-surface border border-line p-3.5"><h3 className="text-[14px] font-semibold mb-2.5">Layout preview <span className="font-normal text-ink-3">default content</span></h3><TemplatePreview blocks={blocks} scale={0.62} height={Math.max(420, blocks.length * 170)} /></div>
        <div className="bg-surface border border-line p-4"><h3 className="text-[14px] font-semibold mb-2.5">Blocks, top to bottom</h3>
          {blocks.length ? blocks.map((b, i) => <div key={`${b}-${i}`} className="flex items-center gap-2.5 border border-line rounded-md px-2.5 py-2 mb-1.5"><span className="text-ink-4 cursor-grab">⋮⋮</span><div className="flex-1 min-w-0"><b className="text-[13px]">{i + 1}. {BLOCK_BY_TYPE[b]?.name ?? b}</b><div className="text-[11.5px] text-ink-3 truncate">{BLOCK_BY_TYPE[b]?.desc}</div></div><div className="whitespace-nowrap"><button className="btn btn-quiet btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button><button className="btn btn-quiet btn-sm" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button><button className="btn btn-quiet btn-sm" onClick={() => setBl(blocks.filter((_, k) => k !== i))} aria-label="Remove">✕</button></div></div>)
            : <div className="p-6 text-center text-ink-3 border border-dashed border-line-2 rounded-lg text-[13px]">No blocks yet. Add the first one below.</div>}
          <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: "1fr auto" }}><label className="text-xs text-ink-3">Add a block<select className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink" value={add} onChange={(e) => setAdd(e.target.value)}>{GROUPS.map((g) => <optgroup key={g} label={g}>{BLOCKS.filter((b) => b.group === g).map((b) => <option key={b.type} value={b.type}>{b.name}</option>)}</optgroup>)}</select></label><button className="btn btn-primary btn-sm self-end" onClick={() => setBl([...blocks, add])}>＋ Add</button></div>
          <h6 className="mt-4 mb-1.5 text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold">Description</h6>
          <input aria-label="Template description" className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink" value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={() => desc !== t.desc && persist({ desc })} placeholder="What is this template for?" />
        </div>
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] z-50">{toast}</div>}
    </div>
  );
}
