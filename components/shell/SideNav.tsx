"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const ITEMS: ([string] | [string, string, string])[] = [
  ["dashboard", "Dashboard", "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"],
  ["Content"], ["pages", "Pages", "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"], ["assets", "Assets", "M3 4h18v16H3zM9 10a2 2 0 1 0 0-.1M21 16l-5-5-8 8"], ["entities", "Content entities", "M8 3h12a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM4 7v12a1 1 0 0 0 1 1h12M10 7.5h8M10 11h5"],
  ["Structure"], ["models", "Content models", "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"], ["templates", "Templates", "M6 3h8l5 5v13H6zM14 3v5h5"],
  ["Work"], ["tasks", "My tasks", "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"],
  ["Platform"], ["api", "API & delivery", "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"], ["users", "Users & roles", "M9 8a3.5 3.5 0 1 0 0-.1M2.5 20a6.5 6.5 0 0 1 13 0M16 4a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3"], ["audit", "Audit log", "M12 3l8 4v6c0 4.5-3.5 7.5-8 8-4.5-.5-8-3.5-8-8V7zM9 12l2 2 4-4"], ["benefits", "Why UCP", "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"],
];

/*
 * Three shell modes, decided by viewport width:
 *   desktop (≥1100px)  full menu, user may collapse it to the icon rail (preference in localStorage)
 *   tablet  (768–1099) icon rail, always
 *   phone   (<768)     hidden; the ☰ button in the top bar opens it as a drawer over the content
 */
const NAV_KEY = "ucp-navmini"; const TABLET = "(max-width: 1099px)"; const PHONE = "(max-width: 767px)";
let drawerOpen = false; const listeners = new Set<() => void>(); const emit = () => listeners.forEach((l) => l());
export const openDrawer = (v: boolean) => { drawerOpen = v; emit(); };
const subscribe = (cb: () => void) => { listeners.add(cb); const mqs = [window.matchMedia(TABLET), window.matchMedia(PHONE)]; mqs.forEach((mq) => mq.addEventListener("change", cb)); window.addEventListener("storage", cb); return () => { listeners.delete(cb); mqs.forEach((mq) => mq.removeEventListener("change", cb)); window.removeEventListener("storage", cb); }; };
const readPref = () => { try { return !!localStorage.getItem(NAV_KEY); } catch { return false; } };
const readTablet = () => window.matchMedia(TABLET).matches; const readPhone = () => window.matchMedia(PHONE).matches; const readDrawer = () => drawerOpen;
const setPref = (v: boolean) => { try { localStorage.setItem(NAV_KEY, v ? "1" : ""); } catch {} emit(); };
export function useShellMode() {
  const pref = useSyncExternalStore(subscribe, readPref, () => false);
  const tablet = useSyncExternalStore(subscribe, readTablet, () => false);
  const phone = useSyncExternalStore(subscribe, readPhone, () => false);
  const drawer = useSyncExternalStore(subscribe, readDrawer, () => false);
  return { pref, tablet, phone, drawer };
}

export function SideNav({ marketId, envId, forcedMini }: { marketId: string; envId: string; forcedMini?: boolean }) {
  const pathname = usePathname(); const { pref, tablet, phone, drawer } = useShellMode();
  const seg = pathname.split("/")[3] || "dashboard"; const inEditor = seg === "page"; // the page builder needs the room: the menu shrinks to icons there
  const mini = !phone && (forcedMini || inEditor || tablet || pref); const active = seg === "page" ? "pages" : seg;
  if (phone && !drawer) return null;
  const nav = (
    <nav aria-label="Main" className={`relative bg-surface border-r border-line flex flex-col overflow-auto h-full ${mini ? "w-[60px] px-2 py-3" : "w-[264px] px-3.5 pt-4 pb-6"}`}>
      {!forcedMini && !inEditor && !tablet && !phone && <button type="button" aria-label={mini ? "Expand menu" : "Collapse menu"} aria-expanded={!mini} aria-controls="ucp-sidenav-items" onClick={() => setPref(!mini)} className={`absolute top-2.5 w-7 h-7 border border-line bg-surface rounded-md grid place-items-center text-ink-3 ${mini ? "left-1/2 -translate-x-1/2" : "right-2"}`}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2" aria-hidden><path d={mini ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} /></svg></button>}
      {phone && <button type="button" aria-label="Close menu" onClick={() => openDrawer(false)} className="absolute top-2.5 right-2 w-8 h-8 rounded-md grid place-items-center text-ink-3 hover:bg-surface-3">✕</button>}
      <div id="ucp-sidenav-items" className="contents">
      {ITEMS[0].length !== 1 && <span aria-hidden className={`block flex-none ${mini ? "h-9" : "h-8"}`} /> /* room for the collapse button above the first link */}
      {ITEMS.map((it, i) => it.length === 1
        ? (mini ? <span key={i} aria-hidden className={`block h-px bg-line ${i === 0 ? "mt-9 mb-2" : "my-2"}`} /> : <h6 key={i} className={`text-[11px] tracking-[.1em] uppercase text-ink-3 font-semibold mx-3 mb-2 ${i === 0 ? "mt-8" : "mt-4"}`}>{it[0]}</h6>)
        : <Link key={it[0]} href={`/${marketId}/${envId}/${it[0]}`} aria-current={active === it[0] ? "page" : undefined} title={it[1]} onClick={() => phone && openDrawer(false)}
            className={mini ? `mx-auto my-1 w-11 h-11 rounded-lg grid place-items-center ${active === it[0] ? "bg-accent text-white" : "text-ink-2 hover:bg-surface-3 hover:text-ink"}` : `flex items-center gap-3 rounded-none text-[15px] border-l-[3px] px-3 py-2.5 ${active === it[0] ? "bg-accent-soft text-accent-hover font-semibold border-accent" : "text-ink-2 border-transparent hover:bg-surface-3 hover:text-ink"}`}>
            <svg viewBox="0 0 24 24" className={`${mini ? "w-6 h-6" : "w-5 h-5"} flex-none stroke-current fill-none`} strokeWidth={mini ? 1.7 : 1.8} strokeLinecap="round" strokeLinejoin="round"><path d={it[2]} /></svg>{!mini && <span>{it[1]}</span>}
          </Link>)}
      </div>
    </nav>
  );
  if (phone) return <div className="fixed inset-0 z-[70] flex" onClick={(ev) => { if (ev.target === ev.currentTarget) openDrawer(false); }}><div className="absolute inset-0 bg-black/45" aria-hidden onClick={() => openDrawer(false)} /><div className="relative h-full shadow-2xl">{nav}</div></div>;
  return nav;
}
