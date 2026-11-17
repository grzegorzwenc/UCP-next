"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/dialog";

const EXIT_MS = 120;

/**
 * Modal chrome shared by the content-model, task, builder and pages dialogs.
 *
 * Built on shadcn's Dialog rather than the hand-rolled overlay it used to be. That version had a
 * `bg-black/45` backdrop with no blur and no transition, and hand-rolled Escape; the Dialog brings
 * the darker blurred backdrop and the fade-and-zoom the source project uses
 * (`src/lib/components/ui/dialog/*`), plus a focus trap, a portal and Escape for free.
 *
 * The public shape is unchanged, so all ten call sites keep working: title, optional subtitle, a
 * max width in pixels, a scrolling body and an optional footer.
 */
export function ModalShell({ title, subtitle, width = 720, onClose, children, footer, labelledBy }: { title: React.ReactNode; subtitle?: React.ReactNode; width?: number; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; labelledBy?: string }) {
  /* Call sites mount this behind their own condition, so telling them straight away would rip the
     popup out before it could animate. Closing flips this flag first — Base UI then plays the
     fade-and-zoom out — and the caller is told once that has finished. */
  const [open, setOpen] = useState(true);
  const close = () => { setOpen(false); window.setTimeout(onClose, EXIT_MS); };
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      {/* Banded, after the mock's dialogs (`tree/new-folder-dialog.svelte`): the panel itself has no
          padding, and a ruled header and footer hold the title and the buttons while the body
          scrolls between them. The flat version — one 24px box with everything loose inside it —
          gave a dialog no shape, so a short confirm and a full form looked like the same thing. */}
      <DialogContent
        className="max-h-[92vh] gap-0 p-0 grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-none"
        style={{ maxWidth: `min(${width}px, calc(100% - 2rem))` }}
        aria-labelledby={labelledBy}
      >
        <DialogHeader className="gap-1 border-b border-line px-6 py-4 pe-12">
          <DialogTitle className="text-base leading-tight font-medium">{title}</DialogTitle>
          {subtitle && <DialogDescription className="text-xs text-ink-3">{subtitle}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 overflow-auto px-6 py-5">{children}</div>
        {footer && <DialogFooter className="gap-2 border-t border-line px-6 py-3">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
export const Err = ({ err }: { err: string | null }) => (err ? <div role="alert" className="text-crit text-xs bg-crit-soft px-3 py-2 rounded mt-3">{err}</div> : null);
/* `.bdl-field` is the app's one input definition (globals.css) — the same box the Pages search and
   every builder panel field use. This used to restate it with a `rounded-md` corner and its own
   padding, so dialog inputs were a second, slightly different control. */
export const inputCls = "bdl-field mt-1";

/**
 * A labelled field in a dialog, as the mock writes them: the label in the body's own text size and
 * weight rather than a faint caption, a red asterisk when it is required, and room under the
 * control for a line that says what the value will do.
 */
export function Field({ label, htmlFor, required, hint, className = "", children }: { label: React.ReactNode; htmlFor?: string; required?: boolean; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-sm font-medium text-ink" htmlFor={htmlFor}>{label}{required && <span className="text-brand" aria-hidden> *</span>}</label>
    {children}
    {hint && <p className="text-xs text-ink-3">{hint}</p>}
  </div>;
}
