"use client";
import { useEffect, useState } from "react";
import { Json } from "@/components/ui/Json";

/** "Show API contract" for a published form: the definition the Forms solution reads, and where submissions go. */
export function FormContract({ marketId, id, name, onClose }: { marketId: string; id: string; name: string; onClose: () => void }) {
  const path = `/api/delivery/v1/forms/${id}?market=${marketId}`;
  const [body, setBody] = useState<unknown>(null); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { let off = false; fetch(path).then(async (r) => { const j = await r.json(); if (!off) { if (r.ok) setBody(j); else setErr(j.detail ?? j.title); } }).catch((e) => { if (!off) setErr(String(e)); }); return () => { off = true; }; }, [path]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return <div className="fixed inset-0 bg-black/45 grid place-items-center z-[60] p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="fct" className="bg-surface rounded-xl w-[min(860px,96vw)] max-h-[92vh] flex flex-col shadow-2xl">
      <header className="px-6 pt-5 pb-3 flex items-start border-b border-line"><div><h2 id="fct" className="text-lg font-medium">API contract · {name}</h2><p className="text-sm text-ink-3">Form definition for the Forms solution · AEM Forms core components</p></div><button className="ml-auto w-8 h-8 rounded text-ink-3 hover:bg-surface-3" onClick={onClose} aria-label="Close">×</button></header>
      <div className="p-6 overflow-auto grid gap-4 text-sm">
        <div className="border border-line rounded-lg overflow-hidden"><table className="w-full text-xs"><tbody className="[&_td]:p-2.5 [&_tr+tr_td]:border-t [&_tr+tr_td]:border-line [&_code]:break-all">
          <tr><td><b>GET</b></td><td><code>{path}</code></td><td>The published definition below</td></tr>
          <tr><td><b>GET</b></td><td><code>/api/delivery/v1/forms?market={marketId}</code></td><td>All published forms of the market</td></tr>
          <tr><td><b>POST</b></td><td><code>{"{formsSolution}"}/api/v1/forms/{id}/submissions</code></td><td>Customer answers, sent by the browser to the Forms solution (not to UCP)</td></tr>
        </tbody></table></div>
        {err ? <div className="text-crit bg-crit-soft px-3 py-2 rounded">{err}</div> : body ? <Json value={body} maxHeight={480} label="form definition" /> : <p className="text-ink-3">Loading…</p>}
      </div></div></div>;
}
