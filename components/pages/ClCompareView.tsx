"use client";
import { useEffect, useRef, useState } from "react";

type Draft = { id: string; label?: string; createdBy?: string; modified?: string };

/**
 * Compare with live on ContentLIBRE: the published page and the open draft, each as the backend renders it, side by side,
 * scrolling together. The mock compares its blocks; a ContentLIBRE page has no blocks here - its components are the
 * backend's - so what is compared is what a visitor would see, before and after.
 */
export function ClCompareView({ path, onClose }: { path: string; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const left = useRef<HTMLIFrameElement>(null); const right = useRef<HTMLIFrameElement>(null); const syncing = useRef(false);
  useEffect(() => {
    let on = true;
    fetch(`/api/cl/drafts?path=${encodeURIComponent(path)}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { open: Draft[] }) => { if (on) setDraft(d.open[0] ?? null); }, (e: Error) => { if (on) setErr(e.message); });
    return () => { on = false; };
  }, [path]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  /* the two pages scroll together, by proportion (they need not be the same height) */
  const link = () => {
    const pair = [left.current?.contentWindow, right.current?.contentWindow];
    pair.forEach((w, i) => w?.addEventListener("scroll", () => {
      const other = pair[1 - i]; if (!w || !other) return;
      if (syncing.current) { syncing.current = false; return; }
      const from = w.document.documentElement, to = other.document.documentElement;
      syncing.current = true; other.scrollTo(0, (w.scrollY / Math.max(1, from.scrollHeight - w.innerHeight)) * (to.scrollHeight - other.innerHeight));
    }));
  };
  const base = `/api/cl/preview?path=${encodeURIComponent(path)}`;
  const loaded = useRef(0);
  const both = () => { loaded.current += 1; if (loaded.current === 2) link(); };

  return <div className="fixed inset-0 z-[80] bg-black/45 flex p-3 md:p-6" role="dialog" aria-modal="true" aria-label="Compare with live">
    <div className="bg-surface rounded-xl shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
        <b>Compare with live</b><span className="font-mono text-[12px] text-ink-3 truncate">{path}</span>
        <button type="button" className="btn btn-sm ml-auto" onClick={onClose}>Close</button>
      </div>
      {err ? <p className="p-6 text-crit">{err}</p>
        : draft === undefined ? <p className="p-6 text-ink-3">Loading…</p>
        : draft === null ? <p className="p-6 text-ink-3">There is no draft: the live page is the only version. Edit the page to start one.</p>
        : <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 divide-x divide-line">
            <section className="flex flex-col min-h-0 min-w-0">
              <header className="px-3 py-2 border-b border-line bg-surface-2 text-[12.5px]"><b className="text-ink">Live</b> <span className="text-ink-3">what visitors see now</span></header>
              <iframe ref={left} src={base} title={`Live · ${path}`} sandbox="allow-same-origin" onLoad={both} className="flex-1 w-full bg-white" />
            </section>
            <section className="flex flex-col min-h-0 min-w-0">
              <header className="px-3 py-2 border-b border-line bg-surface-2 text-[12.5px]"><b className="text-ink">Draft</b> <span className="text-ink-3">{draft.label ? `“${draft.label}” ` : ""}by {draft.createdBy ?? "?"}</span></header>
              <iframe ref={right} src={`${base}&draft=${encodeURIComponent(draft.id)}`} title={`Draft · ${path}`} sandbox="allow-same-origin" onLoad={both} className="flex-1 w-full bg-white" />
            </section>
          </div>}
    </div>
  </div>;
}
