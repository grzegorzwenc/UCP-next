"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Json } from "@/components/ui/Json";
import { CHANNEL_LABEL } from "@/lib/blocks/registry";
import { CONTRACT_VERSION, messageSchema, publishEvent, type Channel } from "@/lib/messaging/model";

type Tab = "overview" | "payload" | "schema" | "event";
const noop = () => () => {};

/**
 * "API contract" for a published message: how the messaging delivery platform (MDP/MDX) gets it.
 * The Payload tab calls the real delivery endpoint on this instance, so it shows exactly what MDP receives.
 */
export function MessageContract({ marketId, id, name, channel, onClose }: { marketId: string; id: string; name: string; channel: Channel; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("overview"); const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const [payload, setPayload] = useState<{ variables?: string[] } | null>(null); const [err, setErr] = useState<string | null>(null);
  const path = `/api/delivery/v1/messages/${id}?market=${marketId}`;
  useEffect(() => { let off = false; fetch(path).then(async (r) => { const j = await r.json(); if (!off) { if (r.ok) setPayload(j); else setErr(j.detail ?? j.title); } }).catch((e) => { if (!off) setErr(String(e)); }); return () => { off = true; }; }, [path]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  const label = CHANNEL_LABEL[channel];
  const tabs: [Tab, string][] = [["overview", "Overview"], ["payload", "Payload"], ["schema", "JSON Schema"], ["event", "Publish event"]];
  return <div className="fixed inset-0 bg-black/45 grid place-items-center z-[60] p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="mct" className="bg-surface rounded-xl w-[min(860px,96vw)] max-h-[92vh] flex flex-col shadow-2xl">
      <header className="px-6 pt-5 pb-3 flex items-start border-b border-line"><div className="min-w-0"><h2 id="mct" className="text-lg font-medium">API contract · {name}</h2><p className="text-sm text-ink-3">{label} · contract v{CONTRACT_VERSION} · served while the message is published</p></div><button className="ml-auto w-8 h-8 rounded text-ink-3 hover:bg-surface-3" onClick={onClose} aria-label="Close">×</button></header>
      <div className="px-6 pt-3 flex gap-1 border-b border-line" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab === k ? "border-brand text-ink font-medium" : "border-transparent text-ink-3 hover:text-ink"}`}>{l}</button>)}</div>
      <div className="p-6 overflow-auto">
        {tab === "overview" && <div className="grid gap-5 text-sm">
          <ol className="grid gap-3">{[["Publish in UCP", "The message went through the same workflow as a page: build, review, business review, ready to publish."], ["UCP notifies MDP", "UCP sends a message.published event to the MDP webhook with the message id and channel (see Publish event)."], ["MDP fetches the message", "MDP reads the approved content from the delivery API below. Only published messages are served."], ["MDP personalises and sends", `MDP fills the variables per recipient${payload?.variables?.length ? ` (${payload.variables.map((v) => `{{${v}}}`).join(", ")})` : ""}, applies consent and frequency rules, and sends the ${label.toLowerCase()}.`]].map(([t, d], i) =>
            <li key={t} className="flex gap-3"><span className="w-6 h-6 rounded-full bg-surface-3 text-ink-2 grid place-items-center text-xs font-bold flex-none">{i + 1}</span><span><b className="block">{t}</b><span className="text-ink-3">{d}</span></span></li>)}</ol>
          <div className="border border-line rounded-lg overflow-hidden"><table className="w-full text-xs"><thead className="bg-surface-2 text-left text-ink-3 uppercase tracking-[.06em]"><tr><th className="p-2.5">Method</th><th className="p-2.5">Endpoint</th><th className="p-2.5">Returns</th></tr></thead>
            <tbody className="[&_td]:p-2.5 [&_td]:border-t [&_td]:border-line [&_code]:break-all">
              <tr><td><b>GET</b></td><td><code>{path}</code></td><td>This message</td></tr>
              <tr><td><b>GET</b></td><td><code>/api/delivery/v1/messages?market={marketId}&amp;channel={channel}</code></td><td>All published {label} messages</td></tr>
              <tr><td><b>GET</b></td><td><code>/api/delivery/v1/schemas/messages/{channel}</code></td><td>JSON Schema of the contract</td></tr>
              <tr><td><b>POST</b></td><td><code>{"<MDP webhook>"}/ucp/events</code></td><td>Sent by UCP on publish and unpublish</td></tr>
            </tbody></table></div>
          <div><div className="text-xs font-medium text-ink-2 mb-1.5">Try it</div><Json value={`curl -s "${origin}${path}" \\\n  -H "Accept: application/json"`} maxHeight={120} label="curl command" /></div>
        </div>}
        {tab === "payload" && (err ? <div className="text-crit text-sm bg-crit-soft px-3 py-2 rounded">{err}</div> : payload ? <><p className="text-xs text-ink-3 mb-2">Live response from <code>GET {path}</code></p><Json value={payload} maxHeight={560} label="payload" /></> : <p className="text-sm text-ink-3">Loading…</p>)}
        {tab === "schema" && <Json value={messageSchema(channel)} maxHeight={560} label="schema" />}
        {tab === "event" && <><p className="text-xs text-ink-3 mb-2">UCP posts this to MDP when the message is published; on unpublish the type is <code>message.unpublished</code>.</p><Json value={publishEvent({ id, channel }, marketId)} maxHeight={560} label="event" /></>}
      </div>
    </div></div>;
}
