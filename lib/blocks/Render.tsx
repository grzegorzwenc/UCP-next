import type { Block } from "@/lib/api/types";
import { BLOCK_BY_TYPE, lines } from "./registry";
import { useContext } from "react";
import { smsSegments } from "./sms";
import { stockPhoto } from "./photo";
import { AssetsContext, EntitiesContext, InlineEditContext, MastSurface, RichInline, RichText } from "./AssetsContext";
export { AssetsContext, EntitiesContext, InlineEditContext };

const ICONS: Record<string, string> = {
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z",
  wallet: "M3 6h18v13H3zM3 10h18M16 14h2",
  bag: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2",
  shield: "M12 3l8 3v6c0 4.5-3.5 7.5-8 9-4.5-1.5-8-4.5-8-9V6zM9 12l2 2 4-4",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  phone: "M7 2h10v20H7zM11 18h2",
};

/** Text span that the builder can make editable in place. `f` = prop key, optional row/col for list cells. {{alias.field}} tokens resolve via EntitiesContext. */
/** Every text is formattable: one line (bold, italic, underline, link) by default, `block` adds paragraphs and lists. */
function T({ id, f, r, c, block, children }: { id: string; f: string; r?: number | string; c?: number; block?: boolean; children: React.ReactNode }) {
  const key = [id, f, r, c].filter((x) => x !== undefined).join("|");
  return <RichInline k={key} value={typeof children === "string" || typeof children === "number" ? String(children) : ""} block={block} />;
}

export function RenderBlock({ b }: { b: Block }) {
  const p = b.props as Record<string, string>;
  const id = b.id;
  switch (b.type) {
    case "mast":
      return <MastSurface image={p.image}><div className="box"><h1><T id={id} f="heading">{p.heading}</T></h1>{p.intro && <p><T id={id} f="intro">{p.intro}</T></p>}{p.cta && <span className="s-cta"><T id={id} f="cta">{p.cta}</T></span>}</div></MastSurface>;
    case "contentmaster":
      return <div><h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2><RichText k={`${id}|body`} value={p.body} className="s-p" /></div>;
    case "icontiles":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-icons">{lines(p.items).map(([ic, t, d], i) => <div key={i}><svg viewBox="0 0 24 24"><path d={ICONS[ic] || ICONS.star} /></svg><h3><T id={id} f="items" r={i} c={1}>{t}</T></h3><T id={id} f="items" r={i} c={2} block>{d}</T></div>)}</div></div>;
    case "mastertiles":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-tiles">{lines(p.items).map(([st, nm, tx, pr, apr, btn], i) => <div className="s-tile" key={i}><div className="tv"><div className={`cardv ${st || "red"}`}><svg className="lg" viewBox="0 0 40 20"><polygon points="0,0 20,10 0,20" fill="#DB0011" /><polygon points="40,0 20,10 40,20" fill="#DB0011" /></svg><span className="chip" /><span className="nm">HSBC</span></div></div><div className="tb"><h3><span className="hs-lnk"><T id={id} f="items" r={i} c={1}>{nm}</T></span></h3><T id={id} f="items" r={i} c={2} block>{tx}</T><div className="rep"><b>Representative example</b>Purchase rate: <T id={id} f="items" r={i} c={3}>{pr}</T><br />Representative: <T id={id} f="items" r={i} c={4}>{apr}</T></div><span className="s-cta"><T id={id} f="items" r={i} c={5}>{btn || "Apply now"}</T></span></div></div>)}</div>{p.note && <p className="s-disc" style={{ marginTop: 12 }}><T id={id} f="note">{p.note}</T></p>}</div>;
    case "linktiles":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-ltiles">{lines(p.items).map(([t, d], i) => <div className="lt" key={i}><h3><span className="hs-lnk"><T id={id} f="items" r={i} c={0}>{t}</T></span></h3><T id={id} f="items" r={i} c={1} block>{d}</T></div>)}</div></div>;
    case "footnotes":
      return <div className="s-foot"><h3><T id={id} f="heading">{p.heading || "Additional information"}</T></h3><ol>{lines(p.items).map((r, i) => <li key={i}><T id={id} f="items" r={i} c={0}>{r.join(" | ")}</T></li>)}</ol></div>;
    case "banner":
      return <div className={`s-banner ${p.style === "light" ? "light" : ""}`}><div><h3><T id={id} f="heading">{p.heading}</T></h3><p><T id={id} f="text">{p.text}</T></p></div>{p.cta && <span className="s-cta"><T id={id} f="cta">{p.cta}</T></span>}</div>;
    case "text":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<RichText k={`${id}|body`} value={p.body} className="s-p" /></div>;
    case "facts":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-facts">{lines(p.items).map(([l, v], i) => <div key={i}><b><T id={id} f="items" r={i} c={0}>{l}</T></b><span><T id={id} f="items" r={i} c={1}>{v}</T></span></div>)}</div></div>;
    case "faq":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-faq">{lines(p.items).map(([q, a], i) => <details key={i} open={i === 0}><summary><T id={id} f="items" r={i} c={0}>{q}</T></summary><T id={id} f="items" r={i} c={1} block>{a}</T></details>)}</div></div>;
    case "rates":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<table className="s-table"><thead><tr><th>Term</th><th>AER</th><th>Gross</th></tr></thead><tbody>{lines(p.rows).map((r, i) => <tr key={i}>{r.map((c, ci) => <td key={ci}><T id={id} f="rows" r={i} c={ci}>{c}</T></td>)}</tr>)}</tbody></table>{p.note && <p className="s-disc" style={{ marginTop: 8 }}><T id={id} f="note">{p.note}</T></p>}</div>;
    case "form":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-form"><div><label>First name</label><i /></div><div><label>Last name</label><i /></div><div><label>Email</label><i /></div><div><label>Phone</label><i /></div><div className="full"><span className="s-cta">Continue</span></div><div className="full s-disc" style={{ fontFamily: "var(--font-sans)" }}>Forms service · {p.form}</div></div></div>;
    case "disclaimer":
      return <RichText k={`${id}|text`} value={p.text} className="s-disc" />;
    /* ---- e-mail components: table-free markup with the inline look of the HSBC e-mail template ---- */
    case "envelope":
      return <div className="m-env"><div><span>From</span><b><T id={id} f="fromName">{p.fromName}</T></b></div><div><span>Subject</span><b><T id={id} f="subject">{p.subject}</T></b><i>{String(p.subject ?? "").length}/90</i></div><div><span>Preview</span><T id={id} f="preheader">{p.preheader || ""}</T></div></div>;
    case "emailheader":
      return <div className="m-head"><img src="/hsbc-logo.svg" alt="HSBC" />{p.tagline && <div><T id={id} f="tagline">{p.tagline}</T></div>}</div>;
    case "emailhero":
      return <AssetImg id={p.image} alt={p.alt} className="m-hero" />;
    case "emailheading":
      return <h1 className="m-h1"><T id={id} f="heading">{p.heading}</T></h1>;
    case "emailtext":
      return <div className="m-p"><T id={id} f="body" block>{p.body}</T></div>;
    case "emailbutton":
      return <div className="m-pad"><span className="m-btn s-cta"><T id={id} f="cta">{p.cta}</T></span></div>;
    case "emailproduct":
      return <div className="m-pad"><div className="m-prod"><div className="n"><T id={id} f="name">{p.name}</T></div>{p.rate && <div className="r"><T id={id} f="rate">{p.rate}</T></div>}{p.detail && <div className="d"><T id={id} f="detail">{p.detail}</T></div>}{p.link && <span className="l">View product ›</span>}</div></div>;
    case "emaildivider":
      return <div className="m-pad"><hr className="m-hr" /></div>;
    case "emailfooter":
      return <div className="m-foot"><T id={id} f="legal" block>{p.legal}</T><span className="u"><T id={id} f="unsubscribe">{p.unsubscribe}</T></span></div>;
    /* ---- simple channels: shown on a phone ---- */
    case "sms": { const final = `${p.text ?? ""}${String(p.optout ?? "").startsWith("Add") ? " Reply STOP to opt out" : ""}`; const seg = smsSegments(final);
      return <Phone><div className="m-sms-top"><span className="av" aria-hidden><img src="/hsbc-hexagon.svg" alt="" /></span><b><T id={id} f="sender">{p.sender}</T></b></div><div className="m-sms"><i>Today 09:41</i><div className="m-bubble"><T id={id} f="text" block>{p.text}</T>{String(p.optout ?? "").startsWith("Add") && <> Reply STOP to opt out</>}</div></div><div className="m-count">{seg.length} characters · {seg.encoding} · {seg.segments} segment{seg.segments === 1 ? "" : "s"}</div></Phone>; }
    case "push":
      if (p.shown === "Over the open app") return <Phone><div className="m-app" aria-hidden><img src="/hsbc-logo.svg" alt="" /><span /><span /><span /></div><div className="m-notif over"><div className="a"><span className="ic"><img src="/hsbc-hexagon.svg" alt="" /></span>HSBC UK<i>now</i></div><div className="c"><div><b><T id={id} f="title">{p.title}</T></b><div><T id={id} f="body" block>{p.body}</T></div></div>{p.image && <AssetImg id={p.image} alt="" className="th" />}</div>{pushActions(p.actions)}</div></Phone>;
      return <Phone dark><div className="m-lock"><div>Tuesday 12 December</div><b>9:41</b></div><div className="m-notif"><div className="a"><span className="ic"><img src="/hsbc-hexagon.svg" alt="" /></span>HSBC UK<i>now</i></div><div className="c"><div><b><T id={id} f="title">{p.title}</T></b><div><T id={id} f="body" block>{p.body}</T></div></div>{p.image && <AssetImg id={p.image} alt="" className="th" />}</div>{pushActions(p.actions)}</div>{p.link && <div className="m-tap">Tap opens {p.link}</div>}</Phone>;
    case "inapp": { const fmt = String(p.placement ?? "Bottom sheet"); const inner = <>{p.image && <AssetImg id={p.image} alt="" className="im" />}<div className="in"><b><T id={id} f="heading">{p.heading}</T></b><div className="t"><T id={id} f="body" block>{p.body}</T></div>{p.cta && <span className="m-btn s-cta"><T id={id} f="cta">{p.cta}</T></span>}{p.dismiss && <span className="x"><T id={id} f="dismiss">{p.dismiss}</T></span>}<em>{fmt} · shown: {p.trigger}</em></div></>;
      if (fmt === "Top banner") return <Phone><div className="m-app" aria-hidden><img src="/hsbc-logo.svg" alt="" /><span /><span /><span /></div><div className="m-banner">{inner}</div></Phone>;
      if (fmt === "Card in the feed") return <Phone><div className="m-app"><img src="/hsbc-logo.svg" alt="" /><span aria-hidden /><div className="m-pop m-card">{inner}</div><span aria-hidden /></div></Phone>;
      return <Phone><div className="m-app" aria-hidden><img src="/hsbc-logo.svg" alt="" /><span /><span /><span /></div><div className={`m-overlay ${fmt === "Modal" ? "c" : "b"}`}><div className="m-pop">{inner}</div></div></Phone>; }
    /* ---- form components: how the Forms solution renders them for customers ---- */
    case "formstep":
      return <div className="f-step"><span className="bar" /><h2><T id={id} f="title">{p.title}</T></h2></div>;
    case "ftext": case "femail": case "fphone": case "fnumber": case "fdate":
      return <FField p={p} id={id}>{p.lines === "Several lines" ? <div className="f-in tall">{p.placeholder}</div> : <div className="f-in">{b.type === "fdate" ? "dd / mm / yyyy" : p.placeholder}</div>}</FField>;
    case "fchoice": { const opts = lines(p.options).map((r) => r[0]);
      return <FField p={p} id={id}>{p.style === "Drop-down" ? <div className="f-in f-sel">Please select</div> : <div className="f-opts">{opts.map((o, i) => <span key={i}><i className={p.style === "Checkboxes" ? "box" : "dot"} />{o}</span>)}</div>}</FField>; }
    case "ffile":
      return <FField p={p} id={id}><div className="f-file">Choose a file<small>{p.types} · up to {p.size}</small></div></FField>;
    case "fconsent":
      return <div className="f-field"><div className="f-consent"><i className="box" /><span>{CONSENT_TEXT[p.consent] ?? p.consent}<small>{p.consent} · {CONSENT_VER[p.consent] ?? "v1"}{p.required === "Optional" ? " · optional" : ""}</small></span></div></div>;
    case "finfo":
      return <div className="f-info"><T id={id} f="text" block>{p.text}</T></div>;
    case "fsuccess":
      return <div className="f-result ok"><em>Success page · shown after submit</em><b><T id={id} f="heading">{p.heading}</T></b><div><T id={id} f="text" block>{p.text}</T></div>{p.reference?.startsWith("Show") && <div className="ref">Your reference: <b>UCP-7Q2K9D</b></div>}{p.cta && <span className="s-cta"><T id={id} f="cta">{p.cta}</T></span>}</div>;
    case "ffailure":
      return <div className="f-result bad"><em>Failure page · shown when the form can’t be sent</em><b><T id={id} f="heading">{p.heading}</T></b><div><T id={id} f="text" block>{p.text}</T></div>{p.cta && <span className="s-cta"><T id={id} f="cta">{p.cta}</T></span>}</div>;
    default:
      return <div className="s-disc">Unknown block: {b.type}</div>;
  }
}

function AssetImg({ id, alt, className }: { id?: string; alt?: string; className?: string }) {
  const a = useContext(AssetsContext)[id ?? ""];
  const src = a?.data ?? (id ? stockPhoto(id) : ""); return src ? <img src={src} alt={alt ?? a?.alt ?? ""} className={className} /> : <div className={`${className ?? ""} m-noimg`}>No image</div>;
}
function Phone({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <div className="m-phone"><div className={`m-screen ${dark ? "dark" : ""}`}><span className="m-notch" />{children}</div></div>;
}

/** A push's action buttons, as the expanded notification shows them (iOS and Android show up to three). */
const pushActions = (v: unknown) => { const label = (x?: string) => (x ?? "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  const rows = lines(v).filter((r) => label(r[0])).slice(0, 3);
  return rows.length ? <div className="m-acts">{rows.map((r, i) => <span key={i} title={r[1] ? `Opens ${r[1]}` : "Opens the app"}>{label(r[0])}</span>)}</div> : null; };

/** The frame a message is built in: an e-mail on the inbox background, SMS / push / pop-up on a phone. Replaces the website chrome for pages under Messaging. */
export function MessageChrome({ channel, children }: { channel: string; children: React.ReactNode }) {
  return <div className={`msg-chrome ${channel}`}>{channel === "email" ? <div className="m-mail">{children}</div> : children}</div>;
}

const CONSENT_TEXT: Record<string, string> = { "Privacy notice": "I have read the HSBC UK Privacy Notice, which explains how my information is used.", "Marketing preferences": "I'd like to hear about HSBC products and offers by e-mail, phone and post. I can change this at any time.", "Credit search": "I agree that HSBC can carry out a credit search, which will leave a footprint on my credit file." };
const CONSENT_VER: Record<string, string> = { "Privacy notice": "v4", "Marketing preferences": "v2", "Credit search": "v3" };
function FField({ p, id, children }: { p: Record<string, string>; id: string; children: React.ReactNode }) {
  return <div className="f-field"><label><T id={id} f="label">{p.label}</T>{p.required === "Optional" && <span className="opt"> (Optional)</span>}</label>{p.help && <div className="f-help"><T id={id} f="help">{p.help}</T></div>}{children}<code className="f-name" data-ui>{p.name}</code></div>;
}
/** A form is always built on the page that hosts it: the canvas shows that page's chrome and title, with the form where the Form component sits. */
export function FormChrome({ marketName, crumbs, hostTitle, device, children }: { marketName: string; crumbs: string[]; hostTitle: string; device: string; children: React.ReactNode }) {
  return <SiteChrome marketName={marketName} crumbs={crumbs} device={device}><div className="f-host"><div className="f-host-t">{hostTitle}</div><div className="f-wrap">{children}</div></div></SiteChrome>;
}

export function SiteChrome({ marketName, crumbs, children, device }: { marketName: string; crumbs: string[]; children: React.ReactNode; device: string }) {
  // No width here: the page fills the frame, and the frame carries the device width (from
  // DEVICE_W) and animates it. Setting a width here made the page snap ahead of the frame.
  return (
    <div className={`site ${device}`}>
      <div className="hs-util"><b>Personal</b><span>Private</span><span>Business</span><span>Corporate</span><div className="r"><span>English</span><span>Register ›</span><span className="logon">Log on</span></div></div>
      <div className="hs-head"><img src="/hsbc-logo.svg" alt={marketName} /><nav><span>Banking</span><span>Borrowing</span><span>Investing</span><span>Insurance</span><span>Wellbeing</span><span>Help</span></nav></div>
      <div className="hs-crumb">{marketName}{crumbs.map((c, i) => <span key={i}><i>›</i> {i === crumbs.length - 1 ? <b>{c}</b> : c}</span>)}</div>
      {children}
      <div className="hs-foot"><div className="cols"><div><b>Banking</b><span>Current accounts</span><span>Savings</span><span>Credit cards</span></div><div><b>Borrowing</b><span>Loans</span><span>Mortgages</span><span>Overdrafts</span></div><div><b>Help</b><span>Contact us</span><span>Branch finder</span><span>Security</span></div><div><b>About HSBC UK</b><span>Careers</span><span>Newsroom</span><span>Accessibility</span></div></div><div className="legal"><img src="/hsbc-logo.svg" alt="HSBC" /><span>© HSBC UK Bank plc 2027. Demo content for prototype use only.</span></div></div>
    </div>
  );
}
export { BLOCK_BY_TYPE };
