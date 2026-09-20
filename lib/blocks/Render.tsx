import type { Block } from "@/lib/api/types";
import { BLOCK_BY_TYPE, lines } from "./registry";
import { AssetsContext, MastSurface } from "./AssetsContext";
export { AssetsContext };

const ICONS: Record<string, string> = {
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z",
  wallet: "M3 6h18v13H3zM3 10h18M16 14h2",
  bag: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2",
  shield: "M12 3l8 3v6c0 4.5-3.5 7.5-8 9-4.5-1.5-8-4.5-8-9V6zM9 12l2 2 4-4",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  phone: "M7 2h10v20H7zM11 18h2",
};

/** Text span that the builder can make editable in place. `f` = prop key, optional row/col for list cells. */
function T({ id, f, r, c, children }: { id: string; f: string; r?: number | string; c?: number; children: React.ReactNode }) {
  const key = [id, f, r, c].filter((x) => x !== undefined).join("|");
  return <span className="ie" data-inline={key}>{children}</span>;
}

export function RenderBlock({ b }: { b: Block }) {
  const p = b.props as Record<string, string>;
  const id = b.id;
  switch (b.type) {
    case "mast":
      return <MastSurface image={p.image}><div className="box"><h1><T id={id} f="heading">{p.heading}</T></h1>{p.intro && <p><T id={id} f="intro">{p.intro}</T></p>}{p.cta && <span className="s-cta"><T id={id} f="cta">{p.cta}</T></span>}</div></MastSurface>;
    case "contentmaster":
      return <div><h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2><p className="s-p"><T id={id} f="body">{p.body}</T></p></div>;
    case "icontiles":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-icons">{lines(p.items).map(([ic, t, d], i) => <div key={i}><svg viewBox="0 0 24 24"><path d={ICONS[ic] || ICONS.star} /></svg><h3><T id={id} f="items" r={i} c={1}>{t}</T></h3><p><T id={id} f="items" r={i} c={2}>{d}</T></p></div>)}</div></div>;
    case "mastertiles":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-tiles">{lines(p.items).map(([st, nm, tx, pr, apr, btn], i) => <div className="s-tile" key={i}><div className="tv"><div className={`cardv ${st || "red"}`}><svg className="lg" viewBox="0 0 40 20"><polygon points="0,0 20,10 0,20" fill="#DB0011" /><polygon points="40,0 20,10 40,20" fill="#DB0011" /></svg><span className="chip" /><span className="nm">HSBC</span></div></div><div className="tb"><h3><span className="hs-lnk"><T id={id} f="items" r={i} c={1}>{nm}</T></span></h3><p><T id={id} f="items" r={i} c={2}>{tx}</T></p><div className="rep"><b>Representative example</b>Purchase rate: <T id={id} f="items" r={i} c={3}>{pr}</T><br />Representative: <T id={id} f="items" r={i} c={4}>{apr}</T></div><span className="s-cta"><T id={id} f="items" r={i} c={5}>{btn || "Apply now"}</T></span></div></div>)}</div>{p.note && <p className="s-disc" style={{ marginTop: 12 }}><T id={id} f="note">{p.note}</T></p>}</div>;
    case "linktiles":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-ltiles">{lines(p.items).map(([t, d], i) => <div className="lt" key={i}><h3><span className="hs-lnk"><T id={id} f="items" r={i} c={0}>{t}</T></span></h3><p><T id={id} f="items" r={i} c={1}>{d}</T></p></div>)}</div></div>;
    case "footnotes":
      return <div className="s-foot"><h3><T id={id} f="heading">{p.heading || "Additional information"}</T></h3><ol>{lines(p.items).map((r, i) => <li key={i}><T id={id} f="items" r={i} c={0}>{r.join(" | ")}</T></li>)}</ol></div>;
    case "banner":
      return <div className={`s-banner ${p.style === "light" ? "light" : ""}`}><div><h3><T id={id} f="heading">{p.heading}</T></h3><p><T id={id} f="text">{p.text}</T></p></div>{p.cta && <span className="s-cta"><T id={id} f="cta">{p.cta}</T></span>}</div>;
    case "text":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-p">{String(p.body || "").split(/\n\s*\n/).map((para, i) => <p key={i}><T id={id} f="body" r="p" c={i}>{para}</T></p>)}</div></div>;
    case "facts":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-facts">{lines(p.items).map(([l, v], i) => <div key={i}><b><T id={id} f="items" r={i} c={0}>{l}</T></b><span><T id={id} f="items" r={i} c={1}>{v}</T></span></div>)}</div></div>;
    case "faq":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-faq">{lines(p.items).map(([q, a], i) => <details key={i} open={i === 0}><summary><T id={id} f="items" r={i} c={0}>{q}</T></summary><p><T id={id} f="items" r={i} c={1}>{a}</T></p></details>)}</div></div>;
    case "rates":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<table className="s-table"><thead><tr><th>Term</th><th>AER</th><th>Gross</th></tr></thead><tbody>{lines(p.rows).map((r, i) => <tr key={i}>{r.map((c, ci) => <td key={ci}><T id={id} f="rows" r={i} c={ci}>{c}</T></td>)}</tr>)}</tbody></table>{p.note && <p className="s-disc" style={{ marginTop: 8 }}><T id={id} f="note">{p.note}</T></p>}</div>;
    case "form":
      return <div>{p.heading && <h2 className="s-h2"><T id={id} f="heading">{p.heading}</T></h2>}<div className="s-form"><div><label>First name</label><i /></div><div><label>Last name</label><i /></div><div><label>Email</label><i /></div><div><label>Phone</label><i /></div><div className="full"><span className="s-cta">Continue</span></div><div className="full s-disc" style={{ fontFamily: "var(--font-mono)" }}>Forms service · {p.form}</div></div></div>;
    case "disclaimer":
      return <div className="s-disc"><T id={id} f="text">{p.text}</T></div>;
    default:
      return <div className="s-disc">Unknown block: {b.type}</div>;
  }
}

export function SiteChrome({ marketName, crumbs, children, device }: { marketName: string; crumbs: string[]; children: React.ReactNode; device: string }) {
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
