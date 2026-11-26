"use client";

export const CommentIcon = ({ size = 16 }: { size?: number }) => <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12.5h5" /></svg>;

/**
 * Comments floating over the page (full screen in the builder, and the review link for people without UCP):
 * a card on the right that can be folded into a small button, so the whole page stays visible.
 */
export function FloatingPanel({ title, count, open, onToggle, actions, hint, top = 16, bottom = 16, width = 380, icon, children, footer, fold = true, header = true }: { /** header icon (comments by default) */ icon?: React.ReactNode;
  /** Drop the fold-away control when the panel's own footer is the only way on (a confirmation, say). */ fold?: boolean;
  /** Drop the title bar entirely. The card still carries `aria-label`, so the region keeps its name. */ header?: boolean;
  /** Pinned under the scrolling body, always on screen. */ footer?: React.ReactNode;
  /** Panel width; 320 matches the editor's right rail. */ width?: number; title: string; count?: number; open: boolean; onToggle: (open: boolean) => void; actions?: React.ReactNode; hint?: React.ReactNode; /** px from the top (below a header) */ top?: number; /** px from the bottom — raise it to clear a status bar */ bottom?: number; children: React.ReactNode }) {
  if (!open) return <button type="button" data-ui style={{ bottom }} onClick={() => onToggle(true)} className="fixed z-[70] right-4 inline-flex items-center gap-2 bg-foreground text-background rounded-full pl-3.5 pr-4 py-2.5 shadow-2xl hover:bg-black text-sm font-medium" aria-label={`Open ${title.toLowerCase()}`}>
    {icon ?? <CommentIcon />}{title}{count ? <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-brand text-white grid place-items-center text-xs">{count}</span> : null}</button>;
  return <aside data-ui aria-label={title} style={{ top, bottom, width }} className="fixed z-[70] right-4 max-w-[calc(100vw-32px)] bg-surface border border-line rounded-xl shadow-[0_18px_48px_rgba(0,0,0,.28)] flex flex-col overflow-hidden text-sm">
    {header && <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-surface">
      <span className="text-brand">{icon ?? <CommentIcon />}</span><b className="text-sm">{title}</b>{count ? <span className="text-xs text-ink-3">{count}</span> : null}
      <span className="ml-auto flex items-center gap-1">{actions}
        {fold && <button type="button" onClick={() => onToggle(false)} className="w-7 h-7 rounded grid place-items-center text-ink-3 hover:bg-surface-3" title="Fold away" aria-label="Fold the comments away"><svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg></button>}</span>
    </div>}
    {hint && <div className="px-3.5 py-2 text-xs text-ink-2 bg-brand-soft/40 border-b border-line">{hint}</div>}
    <div className="flex-1 overflow-auto p-3.5">{children}</div>
    {footer && <div className="shrink-0 border-t border-line p-3.5">{footer}</div>}
  </aside>;
}
