/**
 * Small inline icons used wherever pages and folders are listed, so the two are told apart at a
 * glance. These are illustrative rather than monochrome glyphs — an amber folder, a white page
 * with a grey outline and red rule lines — so they are not candidates for `currentColor`, which
 * would flatten them to a single colour. Every value is a token instead, so they follow the
 * theme (and dark mode) without losing the two-tone design.
 */
const OUTLINE = "var(--ink-4)";        /* #909090 — BDL grey-light */
const PAPER = "var(--surface)";        /* #ffffff */
const FOLD = "var(--surface-3)";       /* #e6e6e6 — BDL grey-disabled */
const FOLDER = "var(--color-bdl-rag-amber)";
const FOLDER_LIP = "color-mix(in srgb, var(--color-bdl-rag-amber) 72%, white)";

export function FolderIcon({ className = "size-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} flex-none`} aria-hidden>
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2H19.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" fill={FOLDER} />
      <path d="M3 9.5h18v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" fill={FOLDER_LIP} />
    </svg>
  );
}
export function PageIcon({ className = "size-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} flex-none`} aria-hidden>
      <path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill={PAPER} stroke={OUTLINE} strokeWidth="1.4" />
      <path d="M14 3v5h5" fill={FOLD} stroke={OUTLINE} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 12h8M8 15h8M8 18h5" stroke="var(--brand)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
export function SiteIcon({ className = "size-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} flex-none`} aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="1.5" fill={PAPER} stroke={OUTLINE} strokeWidth="1.4" />
      <path d="M3 8.5h18" stroke={OUTLINE} strokeWidth="1.4" />
      <path d="M6 6.3h1M8.5 6.3h1" stroke="var(--brand)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
