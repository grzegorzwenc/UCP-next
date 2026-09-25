"use client";
import { useEffect } from "react";

/** Warns before the tab is closed or reloaded while there are unsaved changes. In-app links go through `guardedNavigate` instead. */
export function useUnsaved(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
}
