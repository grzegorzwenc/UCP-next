"use client";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";

export type PageAuthor = { id: string; name: string; at: string };
type Action = "join" | "leave" | "add" | "remove";

/**
 * Build the page: the people assigned to build it together. Anyone with Edit can join ("Assign me") or leave;
 * site admins also add and remove other people. Several authors at once is fine — nobody takes the page away from another.
 */
export function AuthorsChip({ authors, meId, admin, canEdit, people, onAction }: { authors: PageAuthor[]; meId: string; admin: boolean; canEdit: boolean; people: Record<string, string>; onAction: (a: Action, id?: string) => Promise<void> }) {
  const [at, setAt] = useState<{ top: number; right: number } | null>(null); const btn = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(""); const [adding, setAdding] = useState("");
  const mine = authors.some((a) => a.id === meId);
  const run = async (a: Action, id?: string) => { setBusy(a + (id ?? "")); try { await onAction(a, id); } finally { setBusy(""); } };
  const toggle = () => { if (at) { setAt(null); return; } const r = btn.current?.getBoundingClientRect(); if (r) setAt({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) }); };
  const shown = authors.slice(0, 3); const more = authors.length - shown.length;
  const others = Object.entries(people).filter(([id]) => !authors.some((a) => a.id === id)).sort((a, b) => a[1].localeCompare(b[1]));
  return <>
    <span className="inline-flex items-center gap-1.5">
      <button ref={btn} type="button" onClick={toggle} aria-expanded={!!at} title="Who is building this page"
        className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap border border-line-2 rounded-full pl-2.5 pr-1.5 py-0.5 hover:bg-surface-2">
        <span className="text-ink-3 hidden xl:inline">{authors.length === 1 ? "Author" : "Authors"}</span>
        {authors.length ? <span className="flex -space-x-1.5">{shown.map((a) => <span key={a.id} className="rounded-full ring-2 ring-surface" title={a.name}><Avatar name={a.name} size={20} /></span>)}</span> : <span className="text-ink-3">Nobody yet</span>}
        {authors.length === 1 && <b className="font-medium truncate max-w-[120px]">{authors[0].id === meId ? "You" : authors[0].name}</b>}
        {authors.length > 1 && <b className="font-medium">{mine ? `You + ${authors.length - 1}` : `${authors.length} people`}</b>}
        {more > 0 && <span className="text-ink-3">+{more}</span>}
        <span aria-hidden className="text-ink-3 text-xs">▾</span>
      </button>
      {canEdit && !mine && <button type="button" className="btn btn-sm btn-secondary" disabled={!!busy} onClick={() => void run("join")} title="Add yourself as an author · the others stay assigned">{busy === "join" ? "Assigning…" : "Assign me"}</button>}
    </span>
    {at && <div className="fixed inset-0 z-[60]" onClick={() => setAt(null)}>
      <div role="dialog" aria-label="Authors of this page" className="absolute w-[300px] bg-surface border border-line rounded-xl shadow-2xl text-sm overflow-hidden" style={{ top: at.top, right: at.right }} onClick={(e) => e.stopPropagation()}>
        <div className="px-3.5 pt-3 pb-2"><b className="block">Authors · Build the page</b><small className="block text-ink-3 leading-snug">Several people can build it together. Everyone assigned sees it in their tasks.</small></div>
        <ul className="border-t border-line divide-y divide-line max-h-[240px] overflow-auto">{authors.map((a) => <li key={a.id} className="flex items-center gap-2.5 px-3.5 py-2">
          <Avatar name={a.name} size={26} /><span className="min-w-0 flex-1"><b className="block font-medium truncate">{a.name}{a.id === meId ? " (you)" : ""}</b><small className="block text-xs text-ink-3">since {new Date(a.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small></span>
          {a.id === meId ? <button type="button" className="text-xs text-ink-2 underline underline-offset-2 hover:text-ink" disabled={!!busy} onClick={() => void run("leave")}>Leave</button>
            : admin && <button type="button" className="w-7 h-7 rounded text-ink-3 hover:bg-surface-3 hover:text-crit" disabled={!!busy} onClick={() => void run("remove", a.id)} aria-label={`Remove ${a.name}`} title={`Remove ${a.name}`}>✕</button>}
        </li>)}{!authors.length && <li className="px-3.5 py-3 text-ink-3">Nobody is assigned yet.</li>}</ul>
        {((canEdit && !mine) || admin) && <div className="border-t border-line p-3 grid gap-2">
          {canEdit && !mine && <button type="button" className="btn btn-sm btn-primary justify-center" disabled={!!busy} onClick={() => void run("join")}>Assign me too</button>}
          {admin && <div className="flex gap-1.5"><select aria-label="Add an author" className="flex-1 min-w-0 border border-line-2 rounded-md px-2 py-1 text-xs bg-surface" value={adding} onChange={(e) => setAdding(e.target.value)}><option value="">Add a person…</option>{others.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
            <button type="button" className="btn btn-sm btn-secondary" disabled={!adding || !!busy} onClick={() => { void run("add", adding).then(() => setAdding("")); }}>Add</button></div>}
        </div>}
      </div>
    </div>}
  </>;
}
