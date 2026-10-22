"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReviewerOption, Task } from "@/lib/ucp/types";
import { ModalShell, Err } from "@/components/models/ModalShell";
import { Avatar } from "@/components/ui/Avatar";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";

/**
 * Site admins: pick who should do a task, change the person, or take them off it. Only people with the right permission
 * on that page are listed (Review & approve for reviews, Publish for the rest), with how many open tasks each already has.
 */
export function AssignDialog({ marketId, task, pageHref, onClose, onDone }: { marketId: string; task: Task; pageHref: string; onClose: () => void; onDone: (name: string | null) => void }) {
  const [people, setPeople] = useState<ReviewerOption[] | null>(null); const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { let live = true; ucpApi.taskPeople(marketId, task.page.path, task.kind).then((p) => live && setPeople(p), (e) => live && setErr(errorText(e))); return () => { live = false; }; }, [marketId, task]);
  const list = useMemo(() => { const s = q.toLowerCase().trim(); return (people ?? []).filter((p) => !s || `${p.name} ${p.team}`.toLowerCase().includes(s)); }, [people, q]);
  const perm = task.kind === "Review" ? "Review & approve" : "Publish";
  async function pick(id: string | null) { setBusy(true); setErr(null); try { const r = await ucpApi.assignTask(marketId, task.page.path, task.kind, id); onDone(r.assigneeName); } catch (e) { setErr(errorText(e)); setBusy(false); } }

  return <ModalShell title={task.assigneeName ? "Change who does this" : "Assign this task"} width={480} onClose={onClose}
    subtitle={<>{task.what} · <b className="text-ink-2">{task.page.title}</b></>}
    footer={<><Link href={pageHref} className="btn mr-auto">Open page</Link>{task.assigneeName && <button className="btn text-crit" disabled={busy} onClick={() => pick(null)}>Remove {task.assigneeName.split(" ")[0]}</button>}<button className="btn" onClick={onClose}>Cancel</button></>}>
    <label className="flex items-center gap-2 border border-line-2 rounded-md px-2.5 py-2 bg-surface"><span className="text-ink-3" aria-hidden>⌕</span>
      <input autoFocus className="flex-1 outline-none text-sm bg-transparent" placeholder="Type a name or team" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a person" /></label>
    <p className="text-xs text-ink-3 mt-2 mb-1.5">People with {perm} on this page</p>
    {!people && !err ? <p className="text-sm text-ink-3 py-4">Loading…</p> : list.length ? <ul className="grid gap-1 max-h-[46vh] overflow-auto" role="listbox" aria-label="People">
      {list.map((p) => { const cur = p.id === task.assignee; return <li key={p.id}><button type="button" role="option" aria-selected={cur} disabled={busy || cur} onClick={() => pick(p.id)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left ${cur ? "border-brand bg-brand-soft" : "border-line hover:bg-surface-2"}`}>
        <Avatar name={p.name} size={28} /><span className="min-w-0 flex-1"><b className="block text-sm font-medium truncate">{p.name}</b><small className="block text-xs text-ink-3 truncate">{p.team}</small></span>
        <span className="text-xs text-ink-3 whitespace-nowrap">{cur ? "Assigned now" : p.activeReviews ? `${p.activeReviews} open` : "Free"}</span></button></li>; })}
    </ul> : <p className="text-sm text-ink-3 py-4">{q ? "Nobody matches that name." : `Nobody has ${perm} on this page yet. Grant it in Users & roles.`}</p>}
    <Err err={err} />
  </ModalShell>;
}
