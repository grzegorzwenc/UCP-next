"use client";
import { useCallback, useEffect, useState } from "react";
import { ucpApi, ApiError } from "@/lib/api";
import { SEED_USERS } from "@/lib/ucp/seed";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { PageComments } from "./PageComments";

type Version = { id: string; time: string; who: string; note: string; title: string; status: string; blocks: number };
type Props = { marketId: string; path: string; currentBlocks: number; onRestored: () => void; review?: Pick<React.ComponentProps<typeof PageComments>, "target" | "onClearTarget" | "onShowBlock" | "onList">; /** comments live in their own panel: "Comment" on a version goes there */ onCommentVersion?: (v: { id: string; label: string }) => void };

const errText = (e: unknown) => (e instanceof ApiError ? `${e.problem.title}${e.problem.detail ? ": " + e.problem.detail : ""} · request ${e.requestId ?? "n/a"}` : String(e));
const whoName = (id: string) => SEED_USERS.find((u) => u.id === id)?.name ?? id.replace(/\./g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fullTime = (iso: string) => { const d = new Date(iso); return isNaN(+d) ? iso : d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
export const relativeTime = (iso: string, now = Date.now()) => {
  const d = new Date(iso); if (isNaN(+d)) return iso;
  const s = Math.max(0, Math.round((now - +d) / 1000));
  if (s < 45) return "just now"; if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) { const h = Math.round(s / 3600); return `${h} hour${h === 1 ? "" : "s"} ago`; }
  const dd = Math.round(s / 86400); if (dd < 30) return `${dd} day${dd === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

function Row({ v, isLatest, comparing, currentBlocks, onRestore, onComment, busy }: { v: Version; isLatest: boolean; comparing: boolean; currentBlocks: number; onRestore: (v: Version) => void; onComment: (v: Version) => void; busy: boolean }) {
  const delta = v.blocks - currentBlocks;
  return <li className="flex items-start gap-2.5 py-2.5 border-b border-line last:border-0">
    <Avatar name={whoName(v.who)} size={26} />
    <div className="min-w-0 flex-1">
      <div className="text-[13px] text-ink leading-snug"><span className="font-medium">{whoName(v.who)}</span> <span className="text-ink-3">{v.note || "saved"}</span></div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[12px] text-ink-3">
        <time dateTime={v.time} title={fullTime(v.time)}>{relativeTime(v.time)}</time>
        <Pill status={v.status} />
        <span>{v.blocks} block{v.blocks === 1 ? "" : "s"}</span>
        {comparing && <span className={`font-mono ${delta === 0 ? "text-ink-4" : delta > 0 ? "text-info" : "text-warn"}`}>{delta === 0 ? "same count as now" : `${delta > 0 ? "+" : ""}${delta} vs now`}</span>}
      </div>
    </div>
    <div className="flex flex-none flex-col items-end gap-1">
      {isLatest ? <span className="text-[11px] font-semibold text-ink-3 bg-surface-2 rounded-full px-2 py-0.5 mt-0.5">Latest</span> : <button type="button" className="btn btn-sm" disabled={busy} onClick={() => onRestore(v)}>Restore</button>}
      <button type="button" className="text-[11.5px] text-ink-3 hover:text-ink underline underline-offset-2" onClick={() => onComment(v)} aria-label={`Comment on the version from ${fullTime(v.time)}`}>Comment</button>
    </div>
  </li>;
}

export function VersionHistory({ marketId, path, currentBlocks, onRestored, review, onCommentVersion }: Props) {
  const [list, setList] = useState<Version[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Version | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [about, setAbout] = useState<{ id: string; label: string } | null>(null); const [focusKey, setFocusKey] = useState(0); // comment about one version
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  const load = useCallback(async () => {
    try { const v = await ucpApi.versions(path); setList(v); setErr(null); } catch (e) { setErr(errText(e)); setList([]); }
  }, [path]);
  useEffect(() => { let alive = true; ucpApi.versions(path).then((v) => { if (alive) { setList(v); setErr(null); } }, (e) => { if (alive) { setErr(errText(e)); setList([]); } }); return () => { alive = false; }; }, [path]);

  async function restore(v: Version) {
    setBusy(true); setErr(null);
    try { await ucpApi.restoreVersion(marketId, path, v.id); setConfirm(null); say(`Restored the version from ${fullTime(v.time)}`); await load(); onRestored(); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }

  return <div className="grid gap-3 text-ink">
    {!onCommentVersion && <><PageComments marketId={marketId} path={path} about={about} onClearAbout={() => setAbout(null)} focusKey={focusKey} {...review} />
    <div className="border-t border-line" /></>}
    {/* the panel header already says "Version history" */}
    <header className="grid gap-2">
      <h3 className="text-[13px] font-semibold">Versions</h3>
      <p className="text-[12px] text-ink-3 leading-relaxed -mt-1">Every save and status change creates a version. Restoring keeps a copy of the current page first.</p>
      {!!list?.length && <label className="inline-flex items-center gap-2 text-[12.5px] text-ink-2 cursor-pointer justify-self-start"><input type="checkbox" className="accent-[var(--accent)]" checked={compare} onChange={() => setCompare(!compare)} />Compare block count with the current page</label>}
    </header>
    {compare && <div className="text-[12px] text-ink-3 bg-surface-2 rounded-md px-3 py-2">The page now has <b className="text-ink">{currentBlocks} block{currentBlocks === 1 ? "" : "s"}</b>. Each version shows how its block count differs.</div>}
    {err && <div className="text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded">{err}</div>}
    {list === null && <div className="text-[13px] text-ink-3 p-4">Loading versions…</div>}
    {list !== null && !list.length && <div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg text-[13px]">No versions yet — every save and status change creates one.</div>}
    {!!list?.length && <ul className="border border-line rounded-lg bg-surface px-3 min-w-0">{list.map((v, i) => <Row key={v.id} v={v} isLatest={i === 0} comparing={compare} currentBlocks={currentBlocks} onRestore={setConfirm} onComment={(x) => { const a = { id: x.id, label: `${fullTime(x.time)} · ${whoName(x.who)}` }; if (onCommentVersion) { onCommentVersion(a); return; } setAbout(a); setFocusKey((k) => k + 1); }} busy={busy} />)}</ul>}

    {confirm && <div className="fixed inset-0 bg-black/45 grid place-items-center z-50" onClick={(e) => { if (e.target === e.currentTarget && !busy) setConfirm(null); }}>
      <div role="dialog" aria-label="Restore this version?" className="bg-surface rounded-xl w-[min(480px,94vw)] shadow-2xl">
        <header className="px-6 pt-5 pb-3"><h2 className="text-lg font-semibold">Restore this version?</h2></header>
        <div className="px-6 pb-2 text-[13.5px] text-ink-2 leading-relaxed">
          <p>The page will go back to how it was on <b className="text-ink">{fullTime(confirm.time)}</b> ({whoName(confirm.who)}, {confirm.note || "saved"}, {confirm.blocks} block{confirm.blocks === 1 ? "" : "s"}).</p>
          <p className="mt-2 text-ink-3 text-[12.5px]">Unsaved edits in the builder are replaced. A copy of the current page is kept as a new version, so you can come back.</p>
          {err && <div className="text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded mt-3">{err}</div>}
        </div>
        <footer className="px-6 pb-5 pt-3 flex justify-end gap-2"><button type="button" className="btn" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button type="button" className="btn btn-primary" disabled={busy} onClick={() => restore(confirm)}>{busy ? "Restoring…" : "Restore"}</button></footer>
      </div></div>}
    {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] shadow-xl z-50">{toast}</div>}
  </div>;
}
