"use client";
import { createContext, useContext } from "react";
import { TOKEN_RE, hasTokens, resolveTokens, type ResolvedEntities } from "@/lib/ucp/tokens";
import { toRichHtml, toInlineHtml, toPlain } from "./richtext";

/** Asset id → stored picture (data URL) so the canvas can show real uploaded photos. Empty outside the builder. */
export const AssetsContext = createContext<Record<string, { data?: string; alt?: string; decorative?: boolean }>>({});

/** Content entities bound to the page (alias → entity), used to resolve {{alias.field}} tokens. Empty outside the builder. */
export const EntitiesContext = createContext<ResolvedEntities>({});

/** Inline editing state from the builder: the span being edited shows its raw text (tokens), `gen` remounts spans after an edit. */
/** `raw`: show {{alias.field}} tokens as written (builder edit view); otherwise show the entity values (preview, live). */
export const InlineEditContext = createContext<{ editing: string | null; gen: number; raw?: boolean }>({ editing: null, gen: 0 });

/** Mast surface: real photo as background when the `image` prop points at an asset we hold data for (also via a {{alias.field}} token), HSBC grey gradient otherwise. */
export function MastSurface({ image, children }: { image?: string; children: React.ReactNode }) {
  const assets = useContext(AssetsContext); const ents = useContext(EntitiesContext);
  const id = image && hasTokens(image) ? resolveTokens(image, ents).trim() : image;
  const a = id ? assets[id] : undefined; const data = a?.data;
  /* The photo is a CSS background, so its alt text (from the asset's accessibility data) goes on a labelled img role; decorative photos stay silent. */
  return <div className="s-mast" style={data ? { backgroundImage: `url(${data})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>{a?.alt && !a.decorative && <span role="img" aria-label={a.alt} className="sr-only" />}{children}</div>;
}

/** Split into plain text and tokens. Own regex instance: tokenParts() in lib/ucp/tokens shares the global TOKEN_RE with resolveTokens(), whose replace() resets lastIndex and loops forever. */
function parts(s: string, ents: ResolvedEntities): { text: string; token?: string; ok?: boolean; alias?: string }[] {
  const re = new RegExp(TOKEN_RE.source, "g"); const out: { text: string; token?: string; ok?: boolean; alias?: string }[] = []; let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(s))) { if (m.index > last) out.push({ text: s.slice(last, m.index) }); const r = resolveTokens(m[0], ents); out.push({ text: r, token: m[0], ok: r !== m[0], alias: m[1] }); last = m.index + m[0].length; }
  if (last < s.length) out.push({ text: s.slice(last) }); return out;
}
/** Text with tokens: resolved values get a subtle highlight in the builder (neutralised by `.preview`), unknown tokens stay visible with a red underline. */
export function TokenText({ text }: { text: string }) {
  const ents = useContext(EntitiesContext); const { raw } = useContext(InlineEditContext);
  return <>{parts(text, ents).map((p, i) => !p.token ? p.text
    : raw ? <span key={i} className={p.ok ? "tok tok-raw" : "tok-bad tok-raw"} data-token={p.token} title={p.ok ? `Shows “${p.text}” from ${ents[p.alias!]?.title ?? "an entity"} in Preview` : "Not linked to an entity on this page"}>{p.token}</span>
    : p.ok ? <span key={i} className="tok" data-token={p.token} title={`From ${ents[p.alias!]?.title ?? "linked content"} · ${p.token}`}>{p.text}</span>
    : <span key={i} className="tok-bad" data-token={p.token} title="Unknown content reference">{p.token}</span>)}</>;
}

/** Inline-editable span. Strings with tokens render resolved; while the builder edits this span it shows the raw token text instead. */
export function InlineText({ k, children }: { k: string; children: React.ReactNode }) {
  const { editing, gen } = useContext(InlineEditContext);
  if (typeof children === "string" && hasTokens(children)) {
    return <span key={`g${gen}`} className="ie" data-inline={k} data-raw={children}>{editing === k ? children : <TokenText text={children} />}</span>;
  }
  return <span key={`g${gen}`} className="ie" data-inline={k}>{children}</span>;
}

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Tokens inside rich HTML → the same chips as TokenText (raw token in the builder, entity value in preview). The token text stays inside the chip, so editing keeps it. */
function tokensHtml(html: string, ents: ResolvedEntities, raw: boolean): string {
  return html.replace(new RegExp(TOKEN_RE.source, "g"), (tok, alias: string) => { const r = resolveTokens(tok, ents); const ok = r !== tok; const title = escHtml(ok ? `From ${ents[alias]?.title ?? "linked content"} · ${tok}` : "Not linked to an entity on this page");
    return raw ? `<span class="${ok ? "tok tok-raw" : "tok-bad tok-raw"}" data-token="${escHtml(tok)}" title="${title}">${escHtml(tok)}</span>` : ok ? `<span class="tok" data-token="${escHtml(tok)}" title="${title}">${escHtml(toPlain(r))}</span>` : `<span class="tok-bad" title="${title}">${escHtml(tok)}</span>`; });
}
/**
 * Formatted text the builder can edit in place. `block`: paragraphs and lists (long text, FAQ answers, tile texts); otherwise one line
 * with bold, italic, underline and links (headings, buttons, cells). Rendered from sanitised HTML only. While the builder edits it the
 * markup is left alone (no re-render), so the caret and the browser's edits are kept.
 */
export function RichInline({ k, value, block = false, className = "" }: { k: string; value: unknown; block?: boolean; className?: string }) {
  const { gen, raw } = useContext(InlineEditContext); const ents = useContext(EntitiesContext);
  const html = tokensHtml(block ? toRichHtml(value) : toInlineHtml(value), ents, !!raw);
  return block ? <div key={`g${gen}`} className={`ie rt ${className}`} data-inline={k} data-rich="block" dangerouslySetInnerHTML={{ __html: html }} />
    : <span key={`g${gen}`} className={`ie rti ${className}`} data-inline={k} data-rich="inline" dangerouslySetInnerHTML={{ __html: html }} />;
}
/** Long text field (paragraphs and lists). */
export const RichText = ({ k, value, className = "" }: { k: string; value: unknown; className?: string }) => <RichInline k={k} value={value} block className={className} />;
