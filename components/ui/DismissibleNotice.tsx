"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { noticeCookie } from "@/lib/notices";

const EXIT_MS = 220;

/**
 * A quiet, dismissible notice built on BDL's `.alert` component layer (app/bdl/alerts.css).
 * BDL ships info / success / warning / error variants, all of which carry a coloured border and
 * a tinted background; this one is deliberately neutral — BDL greys only — so an explanatory
 * note does not read as a warning.
 *
 * Dismissal is stored in a cookie rather than localStorage so the server can read it and skip
 * rendering entirely on the next load; otherwise the notice would paint and then vanish.
 *
 * Exit collapses rather than disappearing, so the content below rises instead of jumping. CSS
 * cannot transition `height: auto`, so the outer element is a grid whose single row goes
 * `1fr → 0fr` — that animates, and the inner wrapper clips with `overflow-hidden`. The bottom
 * margin lives on the alert itself, inside the collapsing area, so the gap closes with it.
 */
export function DismissibleNotice({ id, children }: { id: string; children: React.ReactNode }) {
  const [state, setState] = useState<"open" | "closing" | "closed">("open");
  if (state === "closed") return null;
  const closing = state === "closing";

  function dismiss() {
    try {
      document.cookie = `${noticeCookie(id)}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch { /* cookies unavailable */ }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setState("closed"); return; }
    setState("closing");
    window.setTimeout(() => setState("closed"), EXIT_MS);
  }

  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] ease-out ${closing ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}
      style={{ transitionDuration: `${EXIT_MS}ms` }}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="alert bg-surface-2 border-line text-ink-2 text-sm! p-4! mb-5! items-start">
          <div className="alert-content leading-relaxed">{children}</div>
          <button type="button" onClick={dismiss} aria-label="Dismiss" className="alert-close ml-2! cursor-pointer">
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
