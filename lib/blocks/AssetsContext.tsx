"use client";
import { createContext, useContext } from "react";
import { TOKEN_RE, hasTokens, resolveTokens, type ResolvedEntities } from "@/lib/ucp/tokens";

/** Asset id → stored picture (data URL) so the canvas can show real uploaded photos. Empty outside the builder. */
export const AssetsContext = createContext<Record<string, { data?: string }>>({});

/** Content entities bound to the page (alias → entity), used to resolve {{alias.field}} tokens. Empty outside the builder. */
export const EntitiesContext = createContext<ResolvedEntities>({});

/** Inline editing state from the builder: the span being edited shows its raw text (tokens), `gen` remounts spans after an edit. */
export const InlineEditContext = createContext<{ editing: string | null; gen: number }>({ editing: null, gen: 0 });

/** Mast surface: real photo as background when the `image` prop points at an asset we hold data for (also via a {{alias.field}} token), HSBC grey gradient otherwise. */
export function MastSurface({ image, children }: { image?: string; children: React.ReactNode }) {
  const assets = useContext(AssetsContext); const ents = useContext(EntitiesContext);
  const id = image && hasTokens(image) ? resolveTokens(image, ents).trim() : image;
  const data = id ? assets[id]?.data : undefined;
  return <div className="s-mast" style={data ? { backgroundImage: `url(${data})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>{children}</div>;
}

/** Split into plain text and tokens. Own regex instance: tokenParts() in lib/ucp/tokens shares the global TOKEN_RE with resolveTokens(), whose replace() resets lastIndex and loops forever. */
function parts(s: string, ents: ResolvedEntities): { text: string; token?: string; ok?: boolean; alias?: string }[] {
  const re = new RegExp(TOKEN_RE.source, "g"); const out: { text: string; token?: string; ok?: boolean; alias?: string }[] = []; let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(s))) { if (m.index > last) out.push({ text: s.slice(last, m.index) }); const r = resolveTokens(m[0], ents); out.push({ text: r, token: m[0], ok: r !== m[0], alias: m[1] }); last = m.index + m[0].length; }
  if (last < s.length) out.push({ text: s.slice(last) }); return out;
}
/** Text with tokens: resolved values get a subtle highlight in the builder (neutralised by `.preview`), unknown tokens stay visible with a red underline. */
export function TokenText({ text }: { text: string }) {
  const ents = useContext(EntitiesContext);
  return <>{parts(text, ents).map((p, i) => !p.token ? p.text
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
