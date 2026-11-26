"use client";
import { Check } from "lucide-react";
import { PanelSection } from "./PanelSection";
import { CHANNEL_LABEL, TEMPLATES, type Channel } from "@/lib/blocks/registry";
import { smsSegments } from "@/lib/blocks/sms";

type B = { id: string; type: string; props: Record<string, unknown> };
const S = ({ t, open = true, children }: { t: string; open?: boolean; children: React.ReactNode }) => <PanelSection id={`ms-${t.toLowerCase().replace(/\W+/g, "-")}`} title={t} defaultOpen={open} card><div className="flex flex-col gap-3">{children}</div></PanelSection>;
const plain = (v: unknown) => String(v ?? "").replace(/<[^>]+>/g, "").trim();

/** Channel checks a reviewer would otherwise send back (stories 9.1.3–9.1.5, 2.3.7). */
export function messageChecks(channel: Channel, blocks: B[]): string[] {
  const out: string[] = []; const one = (t: string) => blocks.find((b) => b.type === t)?.props ?? {};
  if (channel === "email") {
    const subj = plain(one("envelope").subject); if (!subj) out.push("Add a subject line"); if (subj.length > 90) out.push("Shorten the subject to 90 characters");
    if (!blocks.some((b) => b.type === "emailfooter")) out.push("Keep the legal footer (it carries the unsubscribe link)");
    if (blocks.some((b) => b.type === "emailhero" && !plain(b.props.alt))) out.push("Add alt text to every hero image");
    if (blocks.some((b) => b.type === "emailbutton" && !/^https:\/\//.test(String(b.props.link ?? "")))) out.push("Every button needs a full https:// link");
  }
  if (channel === "sms") { const p = one("sms"); const text = `${plain(p.text)}${String(p.optout ?? "").startsWith("Add") ? " Reply STOP to opt out" : ""}`; if (!plain(p.text)) out.push("Write the SMS text"); if (smsSegments(text).segments > 3) out.push("Keep the SMS within 3 segments"); if (!/^[A-Za-z0-9 ]{1,11}$/.test(String(p.sender ?? ""))) out.push("Sender ID: up to 11 letters or digits"); }
  if (channel === "push") { const p = one("push"); if (plain(p.title).length > 50) out.push("Shorten the title to 50 characters"); if (plain(p.body).length > 178) out.push("Shorten the text to 178 characters"); if (!plain(p.title) || !plain(p.body)) out.push("Add a title and text"); }
  if (channel === "inapp") { const p = one("inapp"); if (!plain(p.heading) || !plain(p.body)) out.push("Add a heading and text"); if (p.placement !== "Top banner" && !plain(p.cta)) out.push("Add the button label"); }
  return out;
}

/** The builder's right-hand settings panel for a message (in place of Page settings). */
export function MessageSettings({ channel, template, title, onTitle, blocks, status, marketId, id, path, editable, onContract }: {
  channel: Channel; template?: string; title: string; onTitle: (v: string) => void; blocks: B[]; status: string; marketId: string; id: string; path: string; editable: boolean; onContract: () => void;
}) {
  const checks = messageChecks(channel, blocks); const live = status === "published";
  return <div className="flex flex-col">
    <S t="Basics">
      <label className="text-xs text-ink-2 font-medium">Message name<input className="bdl-field mt-1" value={title} disabled={!editable} onChange={(e) => onTitle(e.target.value)} /><small className="block text-ink-3 font-normal mt-1">Internal name. Customers never see it.</small></label>
      <div className="grid grid-cols-2 gap-2 text-xs"><div><div className="text-ink-2 font-medium">Type</div><div className="bdl-field mt-1 !bg-surface-2">{CHANNEL_LABEL[channel]}</div></div><div><div className="text-ink-2 font-medium">Template</div><div className="bdl-field mt-1 !bg-surface-2 truncate">{TEMPLATES.find((t) => t.id === template)?.name ?? template}</div></div></div>
    </S>
    <S t="Checks before review">
      {checks.length ? <ul className="grid gap-1 text-xs">{checks.map((c) => <li key={c} className="text-crit">● {c}</li>)}</ul> : <p className="text-xs text-good flex items-center gap-1"><Check className="size-3.5" aria-hidden />Nothing to fix</p>}
      <p className="text-xs text-ink-3">Personalisation such as {"{{firstName}}"} is filled in by MDP for each customer.</p>
    </S>
    <S t="Delivery to MDP">
      <div className="text-xs"><span className={`inline-flex items-center gap-1.5 ${live ? "text-good" : "text-ink-3"}`}><span className={`size-1.5 rounded-full ${live ? "bg-good" : "bg-ink-4"}`} aria-hidden />{live ? "Published · MDP can fetch it" : "Not available to MDP until published"}</span></div>
      <code className="text-[11px] break-all bg-surface-2 border border-line px-2 py-1.5">GET /api/delivery/v1/messages/{id}?market={marketId}</code>
      <button type="button" className="btn btn-sm btn-secondary justify-center" disabled={!live} title={live ? undefined : "Available once the message is published"} onClick={onContract}>Show API contract</button>
      <p className="text-xs text-ink-3">MDP owns audiences, scheduling and sending. UCP hands over the approved content.</p>
    </S>
    <S t="Technical" open={false}><div className="text-xs text-ink-2 font-medium">Repository path (JCR)<div className="bdl-field mt-1 !bg-surface-2 break-all font-normal">{path}/jcr:content</div></div></S>
  </div>;
}
