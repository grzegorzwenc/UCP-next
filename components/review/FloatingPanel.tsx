"use client";

export const CommentIcon = ({ size = 16 }: { size?: number }) => <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12.5h5" /></svg>;

/**
 * Comments floating over the page (full screen in the builder, and the review link for people without UCP):
 * a card on the right that can be folded into a small button, so the whole page stays visible.
 */
export function FloatingPanel({ title, count, open, onToggle, actions, hint, top = 16, children }: { title: string; count?: number; open: boolean; onToggle: (open: boolean) => void; actions?: React.ReactNode; hint?: React.ReactNode; /** px from the top (below a header) */ top?: number; children: React.ReactNode }) {
  if (!open) return <button type="button" data-ui onClick={() => onToggle(true)} className="fixed z-[70] right-4 bottom-4 inline-flex items-center gap-2 bg-[#0F1013] text-white rounded-full pl-3.5 pr-4 py-2.5 shadow-2xl hover:bg-black text-[13px] font-semibold" aria-label={`Open ${title.toLowerCase()}`}>
    <CommentIcon />{title}{count ? <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-white grid place-items-center text-[11px]">{count}</span> : null}</button>;
  return <aside data-ui aria-label={title} style={{ top }} className="fixed z-[70] right-4 bottom-4 w-[380px] max-w-[calc(100vw-32px)] bg-surface border border-line rounded-xl shadow-[0_18px_48px_rgba(0,0,0,.28)] flex flex-col overflow-hidden text-[13px]">
    <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-surface">
      <span className="text-accent"><CommentIcon /></span><b className="text-[13.5px]">{title}</b>{count ? <span className="text-[12px] text-ink-3">{count}</span> : null}
      <span className="ml-auto flex items-center gap-1">{actions}
        <button type="button" onClick={() => onToggle(false)} className="w-7 h-7 rounded grid place-items-center text-ink-3 hover:bg-surface-3" title="Fold away" aria-label="Fold the comments away"><svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg></button></span>
    </div>
    {hint && <div className="px-3.5 py-2 text-[12px] text-ink-2 bg-accent-soft/40 border-b border-line">{hint}</div>}
    <div className="flex-1 overflow-auto p-3.5">{children}</div>
  </aside>;
}
