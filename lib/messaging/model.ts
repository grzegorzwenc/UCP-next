/**
 * Messaging: e-mail, SMS, push and pop-up messages for the messaging delivery platform (MDP/MDX).
 *
 * A message is a page under <market>/messaging, built in the same page builder from message templates and
 * message components, and taken through the same workflow (build → review → business review → ready →
 * published). This file turns a published message into the contract MDP consumes
 * (/api/delivery/v1/messages/<id>), and describes that contract as JSON Schema. Client-safe.
 */
import type { Channel } from "@/lib/blocks/registry";
import { CHANNEL_LABEL } from "@/lib/blocks/registry";
import { smsSegments } from "@/lib/blocks/sms";

export type { Channel };
export const CONTRACT_VERSION = "1.0";
type Comp = { resourceType: string; props: Record<string, unknown> };
const typeOf = (c: Comp) => c.resourceType.split("/").pop() ?? "";
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Rich text in components is stored as safe HTML; MDP gets plain text where a channel has no markup. */
const plain = (v: unknown) => str(v).replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();

export const variablesIn = (x: unknown) => [...new Set([...JSON.stringify(x).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];

/** E-mail HTML built from the e-mail components (the same look as the builder canvas). */
export function emailHtml(comps: Comp[], img: (id: string) => string) {
  const env = comps.find((c) => typeOf(c) === "envelope")?.props ?? {};
  const row = (inner: string, pad = "14px 32px") => `<tr><td style="padding:${pad}">${inner}</td></tr>`;
  const text: string[] = [];
  const body = comps.map((c) => { const p = c.props; switch (typeOf(c)) {
    case "emailheader": return `<tr><td style="padding:18px 32px;border-top:6px solid #db0011;border-bottom:1px solid #e5e5e5"><img src="${img("hsbc-logo")}" alt="HSBC" height="28">${p.tagline ? `<div style="font-size:12px;color:#575757;margin-top:6px">${esc(plain(p.tagline))}</div>` : ""}</td></tr>`;
    case "emailhero": return `<tr><td><img src="${esc(img(str(p.image)))}" alt="${esc(plain(p.alt))}" width="600" style="display:block;width:100%;height:auto"></td></tr>`;
    case "emailheading": text.push(plain(p.heading)); return row(`<h1 style="margin:0;font-size:26px;font-weight:400;color:#000">${esc(plain(p.heading))}</h1>`, "28px 32px 6px");
    case "emailtext": text.push(plain(p.body)); return row(`<p style="margin:0;font-size:15px;line-height:1.6;color:#333">${esc(plain(p.body)).replace(/\n/g, "<br>")}</p>`, "12px 32px");
    case "emailbutton": text.push(`${plain(p.cta)}: ${str(p.link)}`); return row(`<a href="${esc(str(p.link))}" style="display:inline-block;background:#db0011;color:#fff;text-decoration:none;font-size:15px;padding:12px 22px">${esc(plain(p.cta))}</a>`);
    case "emailproduct": text.push(`${plain(p.name)} – ${plain(p.rate)}\n${plain(p.detail)}`); return row(`<table role="presentation" width="100%" style="border:1px solid #d7d8d6"><tr><td style="padding:18px 20px"><div style="font-size:13px;color:#575757">${esc(plain(p.name))}</div><div style="font-size:30px;margin:4px 0">${esc(plain(p.rate))}</div><div style="font-size:14px;color:#333">${esc(plain(p.detail))}</div>${p.link ? `<a href="${esc(str(p.link))}" style="color:#000;font-size:14px">View product ›</a>` : ""}</td></tr></table>`);
    case "emaildivider": return row(`<hr style="border:0;border-top:1px solid #e5e5e5;margin:0">`);
    case "emailfooter": text.push(`${plain(p.legal)}\n${plain(p.unsubscribe)}: {{unsubscribeUrl}}`); return `<tr><td style="padding:24px 32px;background:#f3f3f3;font-size:11px;line-height:1.6;color:#575757">${esc(plain(p.legal))}<br><br><a href="{{unsubscribeUrl}}" style="color:#575757">${esc(plain(p.unsubscribe))}</a></td></tr>`;
    default: return ""; } }).join("");
  const subject = plain(env.subject), preheader = plain(env.preheader);
  return { subject, preheader, fromName: plain(env.fromName),
    html: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light dark"><title>${esc(subject)}</title></head><body style="margin:0;background:#f3f3f3;font-family:Arial,Helvetica,sans-serif"><span style="display:none">${esc(preheader)}</span><table role="presentation" width="100%"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" style="max-width:600px;width:100%;background:#fff">${body}</table></td></tr></table></body></html>`,
    text: text.filter(Boolean).join("\n\n") };
}

export type MessageMeta = { id: string; name: string; channel: Channel; status: string; locale: string; market: string; updatedAt?: string; updatedBy?: string };

/** What MDP receives for one published message. */
export function messagePayload(m: MessageMeta, comps: Comp[], img: (id: string) => string) {
  let content: Record<string, unknown> = {};
  const one = (t: string) => comps.find((c) => typeOf(c) === t)?.props ?? {};
  if (m.channel === "email") { const e = emailHtml(comps, img); content = { ...e, blocks: comps.map((c) => ({ type: typeOf(c), ...Object.fromEntries(Object.entries(c.props).filter(([k]) => k !== "locked")) })) }; }
  if (m.channel === "sms") { const p = one("sms"); const optOut = str(p.optout).startsWith("Add"); const text = `${plain(p.text)}${optOut ? " Reply STOP to opt out" : ""}`; const sg = smsSegments(text); content = { sender: plain(p.sender), text, encoding: sg.encoding, segments: sg.segments, optOut }; }
  if (m.channel === "push") { const p = one("push"); content = { title: plain(p.title), body: plain(p.body), deepLink: str(p.link) || null, image: p.image ? img(str(p.image)) : null, presentation: str(p.shown) === "Over the open app" ? "foreground" : "lock-screen" }; }
  if (m.channel === "inapp") { const p = one("inapp"); content = { title: plain(p.heading), body: plain(p.body), primaryAction: { label: plain(p.cta), link: str(p.link) }, dismissLabel: plain(p.dismiss), image: p.image ? img(str(p.image)) : null, format: ({ Modal: "modal", "Bottom sheet": "bottom-sheet", "Top banner": "top-banner", "Card in the feed": "card" } as Record<string, string>)[str(p.placement)] ?? "bottom-sheet", trigger: ({ "App open": "app-open", "After login": "login", "Screen view": "screen-view" } as Record<string, string>)[str(p.trigger)] ?? "app-open" }; }
  return {
    contractVersion: CONTRACT_VERSION, id: m.id, channel: m.channel, market: m.market, locale: m.locale, name: m.name, status: m.status,
    publishedAt: m.updatedAt ?? null, publishedBy: m.updatedBy ?? null,
    variables: [...variablesIn(content), ...(m.channel === "email" ? ["unsubscribeUrl"] : [])].filter((v, i, a) => a.indexOf(v) === i),
    content,
    _links: { self: `/v1/messages/${m.id}?market=${m.market}`, schema: `/v1/schemas/messages/${m.channel}` },
  };
}

const s = (description: string, extra: Record<string, unknown> = {}) => ({ type: "string", description, ...extra });
export function messageSchema(channel: Channel): Record<string, unknown> {
  const content: Record<Channel, Record<string, unknown>> = {
    email: { type: "object", required: ["subject", "html", "text"], properties: { subject: s("Subject line, may contain {{variables}}", { maxLength: 90 }), preheader: s("Inbox preview text"), fromName: s("Sender display name"), html: s("Rendered HTML body; images use absolute URLs"), text: s("Plain-text alternative"), blocks: { type: "array", description: "The components the e-mail was built from" } } },
    sms: { type: "object", required: ["sender", "text"], properties: { sender: s("Alphanumeric sender ID", { maxLength: 11 }), text: s("Final text including the opt-out line"), encoding: { enum: ["GSM-7", "UCS-2"] }, segments: { type: "integer", minimum: 1 }, optOut: { type: "boolean" } } },
    push: { type: "object", required: ["title", "body"], properties: { title: s("Title", { maxLength: 50 }), body: s("Text", { maxLength: 178 }), deepLink: { type: ["string", "null"] }, image: { type: ["string", "null"], format: "uri" }, presentation: { enum: ["lock-screen", "foreground"] } } },
    inapp: { type: "object", required: ["title", "body"], properties: { title: s("Heading"), body: s("Text"), primaryAction: { type: "object", properties: { label: s("Button label"), link: s("App link or URL") } }, dismissLabel: s("Close label"), image: { type: ["string", "null"], format: "uri" }, format: { enum: ["modal", "bottom-sheet", "top-banner", "card"] }, trigger: { enum: ["app-open", "login", "screen-view"] } } },
  };
  return { $schema: "https://json-schema.org/draft/2020-12/schema", $id: `ucp/messages/${channel}/${CONTRACT_VERSION}`, title: `UCP ${CHANNEL_LABEL[channel]} message`, type: "object",
    required: ["contractVersion", "id", "channel", "market", "locale", "status", "content"],
    properties: { contractVersion: { const: CONTRACT_VERSION }, id: s("Message id: its path under Messaging"), channel: { const: channel }, market: s("Market id"), locale: s("BCP 47 locale"), name: s("Message title"), status: { const: "published" }, publishedAt: { type: ["string", "null"], format: "date-time" }, publishedBy: { type: ["string", "null"] }, variables: { type: "array", items: { type: "string" }, description: "Placeholders MDP fills per recipient, written {{name}}" }, content: content[channel] } };
}

export function publishEvent(m: { id: string; channel: Channel }, market: string) {
  return { type: "message.published", occurredAt: new Date().toISOString(), source: "ucp-cms", data: { id: m.id, channel: m.channel, market, href: `/api/delivery/v1/messages/${m.id}?market=${market}` } };
}
