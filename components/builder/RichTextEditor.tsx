"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeRich, sanitizeInline, sanitizeRich, safeHref, toInlineHtml, toRichHtml } from "@/lib/blocks/richtext";

/*
 * Formatting for long text fields: bold, italic, underline, link, bullet list, numbered list, clear formatting.
 * One toolbar, used in two places: floating over the text being edited on the page, and above the field in Configure.
 * The browser's editing commands do the work; whatever they produce is cleaned by sanitizeRich() before it is saved.
 */
type Cmd = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList";
export type FormatState = Record<Cmd, boolean> & { link: boolean };
const EMPTY: FormatState = { bold: false, italic: false, underline: false, insertUnorderedList: false, insertOrderedList: false, link: false };

const inside = (root: HTMLElement | null) => { const s = window.getSelection(); return !!(root && s && s.rangeCount && root.contains(s.getRangeAt(0).commonAncestorContainer)); };
const linkAt = (root: HTMLElement | null): HTMLAnchorElement | null => { const s = window.getSelection(); if (!root || !s?.rangeCount) return null; let n: Node | null = s.getRangeAt(0).startContainer; while (n && n !== root) { if (n instanceof HTMLAnchorElement) return n; n = n.parentNode; } return null; };
/* execCommand is deprecated but it is still what every browser uses for contenteditable; there is no replacement API yet */
const exec = (cmd: string, value?: string) => { try { document.execCommand(cmd, false, value); } catch { /* unsupported command: ignore */ } };
/** The list (ul/ol) the caret is in, inside `root`. */
const listAt = (root: HTMLElement | null): HTMLElement | null => { const s = window.getSelection(); if (!root || !s?.rangeCount) return null; let n: Node | null = s.getRangeAt(0).startContainer; while (n && n !== root) { if (n instanceof HTMLElement && (n.tagName === "UL" || n.tagName === "OL")) return n; n = n.parentNode; } return null; };
/** Top-level block of `root` that holds `n`. */
const blockOf = (root: HTMLElement, n: Node | null): ChildNode | null => { if (n === root) return null; while (n && n.parentNode !== root) n = n.parentNode; return n as ChildNode | null; };
/**
 * Bullet / numbered list on the selected paragraphs, or back to paragraphs when they already are that list.
 * Done by hand (moving the existing text nodes) because execCommand nests lists inside paragraphs and loses the caret.
 */
function toggleList(root: HTMLElement, kind: "ul" | "ol") {
  const s = window.getSelection(); if (!s?.rangeCount) return; const r = s.getRangeAt(0);
  const a = { n: r.startContainer, o: r.startOffset }, z = { n: r.endContainer, o: r.endOffset };
  if (!root.firstChild) { const p = document.createElement("p"); p.appendChild(document.createElement("br")); root.appendChild(p); }
  const pick = (c: Node, o: number) => (c === root ? root.childNodes[Math.min(o, root.childNodes.length - 1)] ?? null : blockOf(root, c));
  const first = pick(r.startContainer, r.startOffset), last = pick(r.endContainer, r.endOffset) ?? first; if (!first) return;
  const isList = (n: ChildNode | null): n is HTMLElement => n instanceof HTMLElement && (n.tagName === "UL" || n.tagName === "OL");
  const moveInto = (from: Node, to: Node) => { while (from.firstChild) to.appendChild(from.firstChild); };
  if (isList(first) && first === last) {
    if (first.tagName.toLowerCase() === kind) first.replaceWith(...[...first.children].map((li) => { const p = document.createElement("p"); moveInto(li, p); return p; }));
    else { const nl = document.createElement(kind); moveInto(first, nl); first.replaceWith(nl); }
  } else {
    const blocks: ChildNode[] = []; for (let n: ChildNode | null = first; n; n = n.nextSibling) { blocks.push(n); if (n === last) break; }
    const list = document.createElement(kind); first.before(list);
    for (const b of blocks) { if (isList(b)) { moveInto(b, list); b.remove(); continue; } const li = document.createElement("li"); if (b.nodeType === Node.TEXT_NODE) li.appendChild(b); else { moveInto(b, li); b.remove(); } list.appendChild(li); }
  }
  const nr = document.createRange(); try { nr.setStart(a.n, a.o); nr.setEnd(z.n, z.o); } catch { nr.selectNodeContents(root); nr.collapse(false); } s.removeAllRanges(); s.addRange(nr);
}
/** Paragraphs as <p> (not <div>) when Enter is pressed in an editable element. */
export const prepareEditable = () => exec("defaultParagraphSeparator", "p");

/** Which formats apply at the caret (to highlight the buttons). */
export function useFormatState(getRoot: () => HTMLElement | null, on = true): FormatState {
  const [st, setSt] = useState<FormatState>(EMPTY);
  useEffect(() => {
    if (!on) return;
    const h = () => { const root = getRoot(); if (!inside(root)) return; const q = (c: string) => { try { return document.queryCommandState(c); } catch { return false; } };
      const list = listAt(root)?.tagName; setSt({ bold: q("bold"), italic: q("italic"), underline: q("underline"), insertUnorderedList: list === "UL", insertOrderedList: list === "OL", link: !!linkAt(root) }); };
    document.addEventListener("selectionchange", h); return () => document.removeEventListener("selectionchange", h);
  }, [getRoot, on]);
  return st;
}

const ICON: Record<Cmd | "link" | "clear", React.ReactNode> = {
  bold: <b className="text-sm font-bold">B</b>,
  italic: <i className="text-sm font-medium">I</i>,
  underline: <u className="text-sm font-medium">U</u>,
  insertUnorderedList: <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></svg>,
  insertOrderedList: <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v4M3.5 11.5c.5-1 2.5-1 2.5.3 0 1-2.5 1.7-2.5 3h2.6M3.5 17h2.3l-1.2 1.3c1 0 1.5.5 1.5 1.1 0 1.2-2 1.3-2.6.4" /></svg>,
  link: <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>,
  clear: <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M6 5h12M12 5l-3 14M4 20l16-16" /></svg>,
};
const LABEL: Record<Cmd | "link" | "clear", string> = { bold: "Bold (⌘B)", italic: "Italic (⌘I)", underline: "Underline (⌘U)", insertUnorderedList: "Bullet list", insertOrderedList: "Numbered list", link: "Link", clear: "Clear formatting" };

/**
 * The toolbar. `getRoot` is the editable element it works on; buttons never take the focus away from it (mousedown is prevented),
 * except the link field, which remembers the selection and puts it back before the link is made.
 */
export function FormatBar({ getRoot, state, dark = false, lists = true, onChange }: { getRoot: () => HTMLElement | null; state: FormatState; dark?: boolean; lists?: boolean; onChange?: () => void }) {
  const [linking, setLinking] = useState<string | null>(null); const saved = useRef<Range | null>(null);
  const run = (cmd: Cmd | "clear") => { const root = getRoot(); if (!root) return; if (!inside(root)) root.focus();
    if (cmd === "clear") { exec("removeFormat"); exec("unlink"); const l = listAt(root); if (l) toggleList(root, l.tagName === "OL" ? "ol" : "ul"); }
    else if (cmd === "insertUnorderedList" || cmd === "insertOrderedList") toggleList(root, cmd === "insertOrderedList" ? "ol" : "ul");
    else exec(cmd);
    onChange?.(); document.dispatchEvent(new Event("selectionchange")); };
  const startLink = () => { const root = getRoot(); const a = linkAt(root); if (a) { const r = document.createRange(); r.selectNodeContents(a); const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); exec("unlink"); onChange?.(); return; }
    const s = window.getSelection(); saved.current = s && s.rangeCount && inside(root) ? s.getRangeAt(0).cloneRange() : null; setLinking(""); };
  const applyLink = () => { const root = getRoot(); const url = safeHref(linking ?? ""); setLinking(null); if (!root || url === "#") { root?.focus(); return; }
    root.focus(); const s = window.getSelection(); if (saved.current) { s?.removeAllRanges(); s?.addRange(saved.current); }
    if (s && s.rangeCount && !s.getRangeAt(0).collapsed) exec("createLink", url); else exec("insertHTML", `<a href="${url.replace(/"/g, "&quot;")}">${url.replace(/[<>&]/g, "")}</a>`);
    onChange?.(); };
  const btn = (on: boolean) => `w-7 h-7 rounded grid place-items-center ${dark ? (on ? "bg-white text-ink" : "text-white hover:bg-white/15") : on ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-3"}`;
  const sep = <span aria-hidden className={`w-px h-5 mx-0.5 ${dark ? "bg-white/20" : "bg-line"}`} />;
  if (linking !== null) return <div role="toolbar" aria-label="Add a link" className="flex items-center gap-1" onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault(); }}>
    <input autoFocus value={linking} onChange={(e) => setLinking(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); applyLink(); } if (e.key === "Escape") { e.preventDefault(); setLinking(null); getRoot()?.focus(); } }}
      placeholder="https://www.hsbc.co.uk/…" aria-label="Link address" className={`h-7 w-[220px] rounded px-2 text-xs outline-none ${dark ? "bg-white/10 text-white placeholder:text-white/50" : "border border-line-2 bg-surface"}`} />
    <button type="button" className={`${btn(false)} w-auto px-2 text-xs font-medium`} onClick={applyLink}>Add</button>
    <button type="button" className={`${btn(false)} w-auto px-2 text-xs`} onClick={() => { setLinking(null); getRoot()?.focus(); }}>Cancel</button>
  </div>;
  return <div role="toolbar" aria-label="Text formatting" className="flex items-center gap-0.5" onMouseDown={(e) => e.preventDefault()}>
    {(["bold", "italic", "underline"] as const).map((c) => <button key={c} type="button" className={btn(state[c])} aria-pressed={state[c]} title={LABEL[c]} aria-label={LABEL[c]} onClick={() => run(c)}>{ICON[c]}</button>)}
    <button type="button" className={btn(state.link)} aria-pressed={state.link} title={state.link ? "Remove link" : LABEL.link} aria-label={state.link ? "Remove link" : LABEL.link} onClick={startLink}>{ICON.link}</button>
    {lists && sep}
    {lists && (["insertUnorderedList", "insertOrderedList"] as const).map((c) => <button key={c} type="button" className={btn(state[c])} aria-pressed={state[c]} title={LABEL[c]} aria-label={LABEL[c]} onClick={() => run(c)}>{ICON[c]}</button>)}
    {sep}
    <button type="button" className={btn(false)} title={LABEL.clear} aria-label={LABEL.clear} onClick={() => run("clear")}>{ICON.clear}</button>
  </div>;
}

/** Rich field for the Configure panel: toolbar + editable box showing the text as it will look. */
/** `inline`: one line (bold, italic, underline, link; Enter does nothing). `compact`: smaller box, toolbar only while focused (list cells). */
export function RichField({ value, onChange, onFocus, invalid, disabled, label, inline = false, compact = false }: { value: unknown; onChange: (html: string) => void; onFocus?: () => void; invalid?: boolean; disabled?: boolean; label: string; inline?: boolean; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null); const last = useRef<string | null>(null);
  const getRoot = useCallback(() => ref.current, []);
  const [focused, setFocused] = useState(false); const state = useFormatState(getRoot, focused);
  // Show changes made elsewhere (inline edit on the page, AI, version restore). What this box emitted itself comes back equal, so typing is never reset.
  useEffect(() => { const el = ref.current; if (!el) return; const html = inline ? toInlineHtml(value) : toRichHtml(value); if (html !== last.current) { el.innerHTML = html; last.current = html; } }, [value, inline]);
  const emit = () => { const el = ref.current; if (!el) return; const v = normalizeRich(el.innerHTML, !inline); last.current = inline ? toInlineHtml(v) : toRichHtml(v); onChange(v); };
  const showBar = !disabled && (!compact || focused);
  return <div className={`rounded-md border bg-surface ${invalid ? "border-crit" : focused ? "border-ink-3" : "border-line-2"}`}>
    {showBar && <div className="flex items-center px-1 py-0.5 border-b border-line bg-surface-2 rounded-t-md"><FormatBar getRoot={getRoot} state={state} lists={!inline} onChange={emit} /></div>}
    <div ref={ref} role="textbox" aria-multiline="true" aria-label={label} contentEditable={!disabled} suppressContentEditableWarning
      className={`${inline ? "rti rte-line" : "rt rte"} ${inline ? "min-h-[32px] px-2.5 py-1.5" : compact ? "min-h-[56px] max-h-[220px] px-2 py-1.5" : "min-h-[96px] max-h-[320px] px-2.5 py-2"} overflow-auto text-sm text-ink outline-none`}
      onFocus={() => { onFocus?.(); prepareEditable(); setFocused(true); }} onBlur={() => { setFocused(false); emit(); }} onInput={emit}
      onKeyDown={(e) => { if (inline && e.key === "Enter") e.preventDefault(); }}
      onPaste={(e) => { e.preventDefault(); const html = e.clipboardData.getData("text/html"); const text = e.clipboardData.getData("text/plain"); exec("insertHTML", inline ? (html ? sanitizeInline(html) : toInlineHtml(text.replace(/\s*\n\s*/g, " "))) : html ? sanitizeRich(html) : toRichHtml(text)); emit(); }} />
  </div>;
}
