/**
 * Review comments on one piece of the page, picked like in Build the page (but nothing is editable):
 * a text (the same `.ie` spans the builder edits in place), an asset (masthead photo, card image, icon), or else the whole component.
 */
export type PickTarget = { id: string; label: string; field?: string };

/** Visual assets inside a component, in document order (their index is the field: "asset:2"). */
export const ASSET_SEL = ".s-mast, .cardv, .s-icons svg, img";
const ASSET_KIND = (el: Element) => (el.matches(".s-mast") ? "Background image" : el.matches(".cardv") ? "Card image" : el.matches("svg") ? "Icon" : "Image");
const snip = (s: string) => { const t = s.replace(/\s+/g, " ").trim(); return t.length > 34 ? t.slice(0, 33) + "…" : t; };

/** What was clicked: a text, an asset or the component. `name` gives the component's name. */
export function pickAt(el: HTMLElement, name: (blockId: string) => string): PickTarget | null {
  const blk = el.closest<HTMLElement>(".cblk"); const id = blk?.dataset.id; if (!blk || !id) return null;
  const ie = el.closest<HTMLElement>(".ie"); if (ie && blk.contains(ie) && ie.dataset.inline) return { id, field: ie.dataset.inline, label: `“${snip(ie.innerText) || "Text"}” · ${name(id)}` };
  const asset = el.closest(ASSET_SEL); if (asset && blk.contains(asset)) { const all = [...blk.querySelectorAll(ASSET_SEL)]; return { id, field: `asset:${all.indexOf(asset)}`, label: `${ASSET_KIND(asset)} · ${name(id)}` }; }
  return { id, label: name(id) };
}

/** The element a comment is about (falls back to the component). */
export function findTarget(root: HTMLElement | null, t: { id: string; field?: string }): HTMLElement | null {
  const blk = root?.querySelector<HTMLElement>(`.cblk[data-id="${CSS.escape(t.id)}"]`); if (!blk) return null;
  if (t.field?.startsWith("asset:")) return (blk.querySelectorAll<HTMLElement>(ASSET_SEL)[Number(t.field.slice(6))] ?? blk);
  if (t.field) return blk.querySelector<HTMLElement>(`[data-inline="${CSS.escape(t.field)}"]`) ?? blk;
  return blk;
}

/** Scroll to what a comment is about and flash it. */
export function flash(root: HTMLElement | null, t: { id: string; field?: string }): boolean {
  const el = findTarget(root, t); if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.remove("cmt-flash"); void el.offsetWidth; el.classList.add("cmt-flash"); return true;
}

/** Keep the "commenting on this" outline on the picked element (DOM class, the page itself is not re-rendered for it). */
export function markTarget(root: HTMLElement | null, t: { id: string; field?: string } | null) {
  root?.querySelectorAll(".cmt-el").forEach((e) => e.classList.remove("cmt-el"));
  if (t?.field) findTarget(root, t)?.classList.add("cmt-el");
}
