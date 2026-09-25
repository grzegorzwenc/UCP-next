"use client";
import { useEffect } from "react";

/** Modal chrome shared by the content-model dialogs (same look as the Pages modals). Escape closes it. */
export function ModalShell({ title, subtitle, width = 720, onClose, children, footer, labelledBy }: { title: React.ReactNode; subtitle?: React.ReactNode; width?: number; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; labelledBy?: string }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);
  return <div className="fixed inset-0 bg-black/45 grid place-items-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} aria-labelledby={labelledBy} className="bg-surface rounded-xl shadow-2xl max-h-[92vh] grid grid-rows-[auto_1fr_auto] w-full" style={{ maxWidth: width }}>
      <header className="px-6 pt-5 pb-3 flex items-start gap-3"><div className="min-w-0"><h2 className="text-lg font-semibold leading-tight">{title}</h2>{subtitle && <p className="text-[12.5px] text-ink-3 mt-0.5">{subtitle}</p>}</div><button type="button" className="ml-auto w-8 h-8 rounded text-ink-3 hover:bg-surface-3 flex-none" onClick={onClose} aria-label="Close">×</button></header>
      <div className="px-6 pb-2 overflow-auto min-h-0">{children}</div>
      {footer && <footer className="px-6 pb-5 pt-3 flex justify-end gap-2 border-t border-line mt-2">{footer}</footer>}
    </div></div>;
}
export const Err = ({ err }: { err: string | null }) => (err ? <div role="alert" className="text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded mt-3">{err}</div> : null);
export const inputCls = "mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13.5px] text-ink bg-surface";
