"use client";
import { useEffect, useRef } from "react";
import { normalizeRich } from "@/lib/blocks/richtext";

/**
 * The editable preview on ContentLIBRE: the backend's own render in edit mode (`authoring=edit`), read through the
 * markers the backend writes - `<!--libre:component {...}-->` … `<!--/libre:component {...}-->` around every
 * component, and `data-libre-field="<name>"` on every element that shows exactly one field. Nothing about the page's
 * structure is guessed from its markup: what has no marker cannot be selected or edited here.
 *
 *   hover        → outline + component name
 *   click        → select it (the inspector opens on the right); links and forms do nothing
 *   double-click → edit that text where it is; Enter (one-line fields) or leaving the field saves, Esc cancels
 *
 * The frame is sandboxed without scripts: the site's own JavaScript does not run while editing, so it cannot reach
 * this app. Every listener in the frame is the builder's own, attached from here.
 */

/** How a field can be edited in place: rich text keeps its markup, plain text is text. */
export type InlineField = { label: string; rich: boolean; multiline: boolean };

type Props = {
  src: string;
  title: string;
  editable: boolean;
  selected: string | null;
  labelOf: (type: string) => string;
  onSelect: (path: string | null) => void;
  /** The field `name` of the component at `node`, when it may be edited in place; null sends the author to the panel. */
  describe: (node: string, name: string) => Promise<InlineField | null>;
  /** Saves one field; resolves false when the backend refused it (and has said why). */
  onInlineSave: (node: string, name: string, value: string) => Promise<boolean>;
  onNote: (text: string) => void;
};

type Entry = { path: string; type: string; depth: number; range: Range };
type Frame = { doc: Document; entries: Entry[]; hover: HTMLElement; sel: HTMLElement; editing: boolean };

const OUTLINE = "#0b63ce";
const STYLE = `
[data-ucp-overlay]{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483647}
[data-ucp-box]{position:absolute;box-sizing:border-box;display:none;border-radius:2px}
[data-ucp-box=hover]{border:1px dashed ${OUTLINE}}
[data-ucp-box=sel]{border:2px solid ${OUTLINE};box-shadow:0 0 0 9999px rgba(15,16,19,.04)}
[data-ucp-box] span{position:absolute;left:-2px;top:-22px;font:600 11px/20px system-ui,sans-serif;color:#fff;background:${OUTLINE};padding:0 6px;border-radius:3px 3px 0 0;white-space:nowrap}
[data-libre-field]{cursor:text}
[data-libre-field]:hover{outline:1px dotted ${OUTLINE};outline-offset:2px}
[data-ucp-editing]{outline:2px solid ${OUTLINE}!important;outline-offset:3px;background:rgba(11,99,206,.06);cursor:text}
a,button,summary,label{cursor:default}
`;
const MARKER = /^(\/?)libre:(component|slot) (\{.*\})$/;

/** Every component the page marks, with its content range and nesting depth. The page itself (depth 0) is not a block. */
function indexOf(doc: Document): Entry[] {
  const walker = doc.createTreeWalker(doc, 128 /* NodeFilter.SHOW_COMMENT */);
  const open: { path: string; type: string; kind: string; start: Node }[] = [];
  const out: Entry[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const m = MARKER.exec((n.nodeValue ?? "").trim());
    if (!m) continue;
    let data: { path?: string; type?: string };
    try { data = JSON.parse(m[3]) as { path?: string; type?: string }; } catch { continue; }
    if (!data.path) continue;
    if (!m[1]) { open.push({ path: data.path, type: data.type ?? "", kind: m[2], start: n }); continue; }
    // An end marker repeats its path, so a mis-nested pair is dropped rather than guessed at.
    const at = open.map((o) => o.path).lastIndexOf(data.path);
    if (at < 0) continue;
    const begun = open[at]; open.length = at;
    if (begun.kind !== "component") continue;
    const range = doc.createRange(); range.setStartAfter(begun.start); range.setEndBefore(n);
    out.push({ path: begun.path, type: begun.type, depth: open.filter((o) => o.kind === "component").length, range });
  }
  return out.filter((e) => e.depth > 0);
}

/** The innermost component that contains `node`. */
function entryAt(entries: Entry[], node: Node): Entry | null {
  let best: Entry | null = null;
  for (const e of entries) {
    let inside = false;
    try { inside = e.range.isPointInRange(node, 0); } catch { inside = false; }
    if (inside && (!best || e.depth > best.depth)) best = e;
  }
  return best;
}

function place(box: HTMLElement, doc: Document, entry: Entry | null, label: string) {
  const rect = entry?.range.getBoundingClientRect();
  if (!entry || !rect || (rect.width === 0 && rect.height === 0)) { box.style.display = "none"; return; }
  const win = doc.defaultView;
  box.style.display = "block";
  box.style.left = `${rect.left + (win?.scrollX ?? 0) - 2}px`; box.style.top = `${rect.top + (win?.scrollY ?? 0) - 2}px`;
  box.style.width = `${rect.width + 4}px`; box.style.height = `${rect.height + 4}px`;
  (box.firstChild as HTMLElement).textContent = label;
}

export function ClCanvas(props: Props) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const frame = useRef<Frame | null>(null);
  // Scroll survives a reload of the preview, which follows every save.
  const scroll = useRef(0);
  const latest = useRef(props);
  useEffect(() => { latest.current = props; });

  const redraw = (reveal = false) => {
    const f = frame.current; if (!f) return;
    const entry = f.entries.find((e) => e.path === latest.current.selected) ?? null;
    place(f.sel, f.doc, entry, entry ? latest.current.labelOf(entry.type) : "");
    if (reveal && entry) {
      const rect = entry.range.getBoundingClientRect(); const win = f.doc.defaultView;
      if (win && (rect.top < 0 || rect.top > win.innerHeight - 40)) win.scrollTo({ top: rect.top + win.scrollY - 80, behavior: "smooth" });
    }
  };

  useEffect(() => { redraw(true); }, [props.selected]);

  function attach() {
    const doc = iframe.current?.contentDocument;
    if (!doc?.documentElement) return;
    const style = doc.createElement("style"); style.textContent = STYLE; (doc.head ?? doc.documentElement).appendChild(style);
    const overlay = doc.createElement("div"); overlay.setAttribute("data-ucp-overlay", "");
    const box = (kind: string) => { const b = doc.createElement("div"); b.setAttribute("data-ucp-box", kind); b.appendChild(doc.createElement("span")); overlay.appendChild(b); return b; };
    const f: Frame = { doc, entries: indexOf(doc), hover: box("hover"), sel: box("sel"), editing: false };
    doc.documentElement.appendChild(overlay);
    frame.current = f;
    const win = doc.defaultView;
    if (win && scroll.current) win.scrollTo(0, scroll.current);
    redraw();

    win?.addEventListener("scroll", () => { scroll.current = win.scrollY; });
    win?.addEventListener("resize", () => redraw());
    // Images and fonts move things after load; the selection follows.
    doc.addEventListener("load", () => redraw(), true);
    doc.addEventListener("mousemove", (ev) => {
      if (f.editing) { f.hover.style.display = "none"; return; }
      const e = entryAt(f.entries, ev.target as Node);
      place(f.hover, doc, e && e.path !== latest.current.selected ? e : null, e ? latest.current.labelOf(e.type) : "");
    }, true);
    doc.addEventListener("mouseleave", () => { f.hover.style.display = "none"; });
    doc.addEventListener("submit", (ev) => ev.preventDefault(), true);
    doc.addEventListener("click", (ev) => {
      const target = ev.target as Element;
      if (f.editing && target.closest?.("[data-ucp-editing]")) return;
      // A summary may still open its details (nothing leaves the page); everything else only selects.
      if (!target.closest?.("summary")) ev.preventDefault();
      ev.stopPropagation();
      latest.current.onSelect(entryAt(f.entries, target)?.path ?? null);
    }, true);
    doc.addEventListener("dblclick", (ev) => {
      const el = (ev.target as Element).closest?.("[data-libre-field]") as HTMLElement | null;
      if (!el || f.editing) return;
      ev.preventDefault();
      const entry = entryAt(f.entries, el);
      if (!entry) return;
      latest.current.onSelect(entry.path);
      if (!latest.current.editable) { latest.current.onNote("This is the live page. Choose Edit to change it in a draft."); return; }
      const name = el.getAttribute("data-libre-field") ?? "";
      void latest.current.describe(entry.path, name).then((field) => {
        if (!field) { latest.current.onNote("This text is changed in the panel on the right."); return; }
        edit(f, el, entry.path, name, field);
      });
    }, true);
  }

  function edit(f: Frame, el: HTMLElement, node: string, name: string, field: InlineField) {
    const read = () => (field.rich ? el.innerHTML : el.innerText);
    const before = read();
    f.editing = true; f.hover.style.display = "none";
    if (field.rich) f.doc.execCommand("defaultParagraphSeparator", false, "p");
    el.setAttribute("contenteditable", field.rich ? "true" : "plaintext-only");
    el.setAttribute("data-ucp-editing", "");
    el.setAttribute("aria-label", `${field.label} (editing)`);
    el.focus();
    const selection = f.doc.getSelection(); const all = f.doc.createRange(); all.selectNodeContents(el);
    selection?.removeAllRanges(); selection?.addRange(all);
    let done = false;
    const finish = async (save: boolean) => {
      if (done) return; done = true;
      el.removeEventListener("keydown", onKey, true); el.removeEventListener("blur", onBlur);
      el.removeAttribute("contenteditable"); el.removeAttribute("data-ucp-editing"); el.removeAttribute("aria-label");
      f.editing = false;
      const after = read();
      const restore = () => { if (field.rich) el.innerHTML = before; else el.innerText = before; };
      if (!save) { restore(); return; }
      // Nothing typed: nothing saved. This also keeps a fallback (the hero's page title) from being written as a value.
      if (after === before) return;
      const value = field.rich ? normalizeRich(after, true) : (field.multiline ? after : after.replace(/\s*\n\s*/g, " ")).trim();
      if (!(await latest.current.onInlineSave(node, name, value))) restore();
    };
    const onKey = (k: KeyboardEvent) => {
      k.stopPropagation();
      if (k.key === "Escape") { k.preventDefault(); void finish(false); }
      else if (k.key === "Enter" && (k.ctrlKey || k.metaKey || (!field.multiline && !field.rich))) { k.preventDefault(); void finish(true); }
    };
    const onBlur = () => { void finish(true); };
    el.addEventListener("keydown", onKey, true); el.addEventListener("blur", onBlur);
  }

  return <iframe ref={iframe} key={props.src} src={props.src} title={props.title} sandbox="allow-same-origin" onLoad={() => { try { attach(); } catch (e) { console.error("ClCanvas attach failed", e); } }}
    className="w-full h-[70vh] lg:h-full bg-white border border-line rounded" />;
}
