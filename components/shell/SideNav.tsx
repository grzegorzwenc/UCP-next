"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { market, env } from "@/lib/markets";

const ITEMS: ([string] | [string, string, string])[] = [
  ["Content"], ["dashboard", "Dashboard", "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"], ["pages", "Pages", "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"], ["assets", "Assets", "M3 4h18v16H3zM9 10a2 2 0 1 0 0-.1M21 16l-5-5-8 8"], ["models", "Content models", "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"], ["templates", "Templates", "M6 3h8l5 5v13H6zM14 3v5h5"],
  ["Work"], ["tasks", "My tasks", "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"],
  ["Platform"], ["api", "API & delivery", "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"], ["users", "Users & roles", "M9 8a3.5 3.5 0 1 0 0-.1M2.5 20a6.5 6.5 0 0 1 13 0M16 4a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3"], ["audit", "Audit log", "M12 3l8 4v6c0 4.5-3.5 7.5-8 8-4.5-.5-8-3.5-8-8V7zM9 12l2 2 4-4"], ["repo", "Repository (JCR)", "M4 6a8 3 0 0 1 16 0v12a8 3 0 0 1-16 0zM4 6a8 3 0 0 0 16 0M4 12a8 3 0 0 0 16 0"],
];

/* Collapse preference lives in localStorage; below the tablet breakpoint the rail always collapses (the toggle stays for wider screens). */
const NAV_KEY = "ucp-navmini"; const TABLET = "(max-width: 1099px)";
const subscribeNav = (cb: () => void) => { const mq = window.matchMedia(TABLET); mq.addEventListener("change", cb); window.addEventListener("storage", cb); window.addEventListener("ucp:navmini", cb); return () => { mq.removeEventListener("change", cb); window.removeEventListener("storage", cb); window.removeEventListener("ucp:navmini", cb); }; };
const readPref = () => { try { return !!localStorage.getItem(NAV_KEY); } catch { return false; } };
const readNarrow = () => window.matchMedia(TABLET).matches;
const setPref = (v: boolean) => { try { localStorage.setItem(NAV_KEY, v ? "1" : ""); } catch {} window.dispatchEvent(new Event("ucp:navmini")); };

export function SideNav({ marketId, envId, forcedMini }: { marketId: string; envId: string; forcedMini?: boolean }) {
  const pathname = usePathname();
  const pref = useSyncExternalStore(subscribeNav, readPref, () => false);
  const narrow = useSyncExternalStore(subscribeNav, readNarrow, () => false);
  const m = forcedMini || narrow || pref; const seg = pathname.split("/")[3] || "dashboard"; const active = seg === "page" ? "pages" : seg;
  const mk = market(marketId), e = env(envId);
  return (
    <nav aria-label="Main" className={`relative bg-surface border-r border-line flex flex-col overflow-auto ${m ? "w-16 px-2 py-3" : "w-[264px] px-3.5 pt-4 pb-6"}`}>
      {!forcedMini && !narrow && <button type="button" aria-label={m ? "Expand menu" : "Collapse menu"} aria-expanded={!m} aria-controls="ucp-sidenav-items" onClick={() => setPref(!m)} className={`absolute top-2.5 w-7 h-7 border border-line bg-surface rounded-md grid place-items-center text-ink-3 ${m ? "left-1/2 -translate-x-1/2" : "right-2"}`}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2" aria-hidden><path d={m ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} /></svg></button>}
      <div id="ucp-sidenav-items" className="contents">
      {ITEMS.map((it, i) => it.length === 1
        ? <h6 key={i} className={`text-[11px] tracking-[.1em] uppercase text-ink-3 font-semibold ${m ? "h-px bg-line my-2 text-[0]" : `mx-3 mb-2 ${i === 0 ? "mt-8" : "mt-4"}`}`}>{it[0]}</h6>
        : <Link key={it[0]} href={`/${marketId}/${envId}/${it[0]}`} aria-current={active === it[0] ? "page" : undefined} title={it[1]}
            className={`flex items-center gap-3 rounded-none text-[15px] border-l-[3px] ${m ? "justify-center py-2.5 px-0" : "px-3 py-2.5"} ${active === it[0] ? "bg-accent-soft text-accent-hover font-semibold border-accent" : "text-ink-2 border-transparent hover:bg-surface-3 hover:text-ink"}`}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-none stroke-current fill-none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={it[2]} /></svg>{!m && <span>{it[1]}</span>}
          </Link>)}
      </div>
      {!m && <div className="mt-auto border-t border-line pt-3 text-[12.5px] text-ink-3"><b className="block text-ink font-semibold text-[13px]">{mk.flag} {mk.name}</b>{e.name} · {mk.locales.join(", ")}</div>}
    </nav>
  );
}
