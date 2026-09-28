/**
 * Rich text for long text fields (paragraphs, bold, italic, underline, links, bullet and numbered lists).
 * Stored as a small, safe HTML subset. Old values are plain text and keep working: blank lines are paragraphs.
 * Everything that reaches the page goes through sanitizeRich(), so pasted or typed markup cannot inject scripts or styles.
 */
const ALLOWED = new Set(["p", "br", "strong", "em", "u", "a", "ul", "ol", "li"]);
const RENAME: Record<string, string> = { b: "strong", i: "em", div: "p", h1: "p", h2: "p", h3: "p", h4: "p", h5: "p", h6: "p" };
const RICH_RE = /<\/?(p|br|strong|b|em|i|u|a|ul|ol|li|div)\b[^>]*>/i;

export const isRich = (s: unknown): boolean => typeof s === "string" && RICH_RE.test(s);

const escText = (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => s.replace(/&(?!amp;|lt;|gt;|quot;|#39;)/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Links may only go to web pages, e-mail, phone or paths on the site. */
export const safeHref = (h: string) => { const v = h.trim(); return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(v) ? v : v && !/^[a-z][a-z0-9+.-]*:/i.test(v) && /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(v) ? `https://${v}` : "#"; };

/** Keep only the allowed tags (no attributes except a safe href on links); drop scripts, styles and comments with their content. */
export function sanitizeRich(html: string): string {
  const src = String(html ?? "").replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style|iframe|object|embed|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi, "").replace(/<(script|style|iframe|object|embed)\b[^>]*>/gi, "");
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g; let out = ""; let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out += escText(src.slice(last, m.index)); last = re.lastIndex;
    const close = !!m[1]; const tag = RENAME[m[2].toLowerCase()] ?? m[2].toLowerCase();
    if (!ALLOWED.has(tag)) continue; // unknown tag: drop it, keep its text
    if (tag === "br") { if (!close) out += "<br>"; continue; }
    if (close) { out += `</${tag}>`; continue; }
    if (tag === "a") { const h = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[3]); out += `<a href="${escAttr(safeHref(h?.[1] ?? h?.[2] ?? h?.[3] ?? ""))}">`; continue; }
    out += `<${tag}>`;
  }
  out += escText(src.slice(last));
  // browsers nest lists in paragraphs and leave empty items behind: unwrap and drop them
  return out.replace(/<p>\s*(<(ul|ol)>)/g, "$1").replace(/(<\/(ul|ol)>)\s*<\/p>/g, "$1").replace(/<li>(\s|&nbsp;|<br>)*<\/li>/g, "").replace(/<(ul|ol)>\s*<\/\1>/g, "")
    .replace(/<p>(\s|&nbsp;|<br>)*<\/p>/g, "").replace(/(<br>\s*)+(<\/(p|li)>)/g, "$2").replace(/<(strong|em|u)><\/\1>/g, "").trim();
}

const escPlain = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Any stored value → safe HTML: plain text becomes paragraphs (blank line) and line breaks. */
export function toRichHtml(v: unknown): string {
  const s = String(v ?? "");
  if (isRich(s)) return sanitizeRich(s);
  const paras = s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paras.map((p) => `<p>${escPlain(p).replace(/\n/g, "<br>")}</p>`).join("");
}

const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
/** Rich value → plain text (for checks, word counts, search results, AI and meta descriptions). Plain values pass through. */
export function toPlain(v: unknown): string {
  const s = String(v ?? ""); if (!isRich(s)) return s;
  return decode(s.replace(/<li\b[^>]*>/gi, "• ").replace(/<\/(p|div)>/gi, "\n\n").replace(/<br\s*\/?>|<\/li>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** One-line fields (headings, buttons, tile and table cells): bold, italic, underline and links only; paragraphs and lists fold into the line. */
export function sanitizeInline(html: string): string {
  return sanitizeRich(html).replace(/<\/p>\s*<p>|<\/li>\s*<li>/g, " ").replace(/<\/?(p|ul|ol|li)>/g, "").replace(/<br>/g, " ").replace(/\s{2,}/g, " ").trim();
}
/** One-line value → safe inline HTML (plain text is escaped). */
export function toInlineHtml(v: unknown): string { const s = String(v ?? ""); return isRich(s) ? sanitizeInline(s) : escPlain(s); }
/**
 * What the editor produced → what is stored. Text without any formatting is stored as plain text (as before), so headings,
 * labels and table values stay clean for search, the API and translation; formatted text is stored as sanitised HTML.
 */
export function normalizeRich(html: string, block: boolean): string {
  const s = block ? sanitizeRich(html) : sanitizeInline(html);
  return isRich(s) ? s : decode(s.replace(/<[^>]+>/g, "")).replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
}
/** A list cell ("A | B" rows) must not contain the separators: pipes become an entity, line breaks go. */
export const cellSafe = (v: string) => (isRich(v) ? v.replace(/\|/g, "&#124;") : v.replace(/\|/g, "/")).replace(/\n+/g, " ");
