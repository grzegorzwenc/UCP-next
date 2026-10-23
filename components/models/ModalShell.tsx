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
      <DialogContent
        className="max-h-[92vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-none"
        style={{ maxWidth: `min(${width}px, calc(100% - 2rem))` }}
        aria-labelledby={labelledBy}
      >
        <DialogHeader className="pe-8">
          <DialogTitle className="text-lg leading-tight font-medium">{title}</DialogTitle>
          {subtitle && <DialogDescription className="text-xs text-ink-3">{subtitle}</DialogDescription>}
        </DialogHeader>
        {/* negative margin so the scrollbar sits at the panel edge while the content keeps its gutter */}
        <div className="-mx-6 min-h-0 overflow-auto px-6">{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
export const Err = ({ err }: { err: string | null }) => (err ? <div role="alert" className="text-crit text-xs bg-crit-soft px-3 py-2 rounded mt-3">{err}</div> : null);
export const inputCls = "mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-sm text-ink bg-surface";
