"use client";
import { Lock, Pencil } from "lucide-react";

/**
 * A panel the page's state does not allow right now (in review, approved, live, or no Edit permission): the panel still opens
 * so people can see what is there, but its content is blurred and inert, with the reason and a way back to editing on top.
 */
export function LockedVeil({ on, reason, onEdit, children }: { on: boolean; reason: string; onEdit?: () => void; children: React.ReactNode }) {
  if (!on) return <>{children}</>;
  return <div className="relative flex-1 min-h-0 flex flex-col">
    <div aria-hidden inert className="flex-1 min-h-0 flex flex-col blur-[2px] opacity-45 pointer-events-none select-none">{children}</div>
    <div className="absolute inset-0 grid place-items-center p-5">
      <div role="status" className="bg-surface border border-line rounded-xl shadow-lg px-5 py-4 max-w-[280px] text-center">
        <Lock className="mx-auto mb-1.5 size-5 text-ink-3" strokeWidth={1.5} aria-hidden />
        <b className="block text-sm">Not editable right now</b>
        <p className="text-xs text-ink-3 mt-1 leading-relaxed">{reason}</p>
        {onEdit && <button type="button" className="btn btn-sm btn-primary mt-3" onClick={onEdit}><Pencil className="size-3.5" strokeWidth={1.5} aria-hidden />Edit the page</button>}
      </div>
    </div>
  </div>;
}
