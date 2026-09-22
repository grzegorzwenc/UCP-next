"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RepoNode } from "@/lib/repo/types";
import { Menu } from "@/components/ui/Menu";

const isPage = (n: RepoNode) => n.primaryType === "cq:Page";
const isFolder = (n: RepoNode) => isPage(n) && String(n.children?.find((c) => c.name === "jcr:content")?.properties["sling:resourceType"] ?? "").endsWith("/folder");

function Node({ n, depth, base, root, openPath, onCopy }: { n: RepoNode; depth: number; base: string; root: string; openPath: string; onCopy: (path: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(depth < 2 || n.name === "jcr:content" || n.name === "root");
  const [showProps, setShowProps] = useState(false);
  const kids = n.children ?? []; const props = Object.entries(n.properties).filter(([k]) => k !== "jcr:primaryType");
  const icon = n.name === "jcr:content" ? "📄" : n.name === "root" ? "▦" : isFolder(n) ? "📁" : isPage(n) ? "🗎" : "▫";
  return (<li>
    <div className="flex items-center gap-2 py-1 hover:bg-surface-3 -mx-2 px-2 rounded" style={{ paddingLeft: depth * 18 }}>
      <button type="button" aria-label={open ? "Collapse" : "Expand"} aria-expanded={kids.length ? open : undefined} onClick={() => setOpen(!open)} className={`w-4 text-ink-3 text-[11px] ${kids.length ? "" : "invisible"}`}>{open ? "▾" : "▸"}</button>
      <span className="w-5 text-center">{icon}</span>
      <span className="font-mono text-[13px]">{n.name}</span>
      <span className="text-[11px] text-ink-3 font-mono">{n.primaryType}</span>
      {typeof n.properties["sling:resourceType"] === "string" && <span className="text-[11px] font-mono px-1.5 py-0.5 bg-surface-3 border border-line rounded">{String(n.properties["sling:resourceType"])}</span>}
      {typeof n.properties["jcr:title"] === "string" && <span className="text-[12.5px] text-ink-2">“{String(n.properties["jcr:title"])}”</span>}
      <span className="ml-auto flex gap-1">
        {props.length > 0 && <button type="button" className="btn btn-sm" aria-expanded={showProps} onClick={() => setShowProps(!showProps)}>{props.length} props</button>}
        {isPage(n) && !isFolder(n) && <Link className="btn btn-sm" href={`${base}/page${n.path.replace(root, "")}`}>Edit page</Link>}
        {isPage(n) && !kids.length && <Link className="btn btn-sm" href={`${openPath}?path=${encodeURIComponent(n.path)}`}>Open</Link>}
        <Menu label={<span aria-hidden>⋯</span>} ariaLabel={`More actions for ${n.name}`} buttonClassName="btn btn-sm" items={[
          { id: "copy", label: "Copy path", onSelect: () => onCopy(n.path) },
          { id: "builder", label: "Open in builder", disabled: !(isPage(n) && !isFolder(n)), onSelect: () => router.push(`${base}/page${n.path.replace(root, "")}`) },
        ]} />
      </span>
    </div>
    {showProps && <table className="text-[12px] font-mono bg-surface border border-line my-1 mb-2" style={{ marginLeft: depth * 18 + 44 }}><tbody>{props.map(([k, v]) => <tr key={k}><td className="px-2 py-1 border-b border-line text-ink-3 align-top whitespace-nowrap">{k}</td><td className="px-2 py-1 border-b border-line break-all max-w-[720px]">{typeof v === "string" ? v : JSON.stringify(v)}</td></tr>)}</tbody></table>}
    {open && kids.length > 0 && <ul>{kids.map((c) => <Node key={c.path} n={c} depth={depth + 1} base={base} root={root} openPath={openPath} onCopy={onCopy} />)}</ul>}
  </li>);
}

export function RepoTree({ root, base, marketRoot }: { root: RepoNode; base: string; marketRoot: string }) {
  const [toast, setToast] = useState<string | null>(null);
  const copy = (path: string) => { navigator.clipboard?.writeText(path).catch(() => {}); setToast(`Copied ${path}`); setTimeout(() => setToast(null), 2000); };
  return (<div className="bg-surface border border-line p-3 overflow-auto"><div className="text-[12px] text-ink-3 font-mono mb-2">{root.path}</div><ul className="min-w-[640px]"><Node n={root} depth={0} base={base} root={marketRoot} openPath={`${base}/repo`} onCopy={copy} /></ul>
    {toast && <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] z-50">{toast}</div>}</div>);
}
