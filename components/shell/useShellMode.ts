"use client";
import { useSyncExternalStore } from "react";

/**
 * Viewport mode for the screens that lay themselves out differently on small widths
 * (the page builder and the template editor). It used to live in SideNav and also drove
 * the nav's collapse and phone drawer; the shadcn Sidebar owns both of those now
 * (`useSidebar()` for state, a cookie for the preference, a Sheet for mobile), so what
 * is left here is only the media queries other screens ask about.
 */
const TABLET = "(max-width: 1099px)";
const PHONE = "(max-width: 767px)";

const subscribe = (cb: () => void) => {
  const mqs = [window.matchMedia(TABLET), window.matchMedia(PHONE)];
  mqs.forEach((mq) => mq.addEventListener("change", cb));
  return () => mqs.forEach((mq) => mq.removeEventListener("change", cb));
};
const readTablet = () => window.matchMedia(TABLET).matches;
const readPhone = () => window.matchMedia(PHONE).matches;

export function useShellMode() {
  const tablet = useSyncExternalStore(subscribe, readTablet, () => false);
  const phone = useSyncExternalStore(subscribe, readPhone, () => false);
  return { tablet, phone };
}
