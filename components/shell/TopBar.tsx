"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Bell as BellIcon, Search as SearchIcon } from "lucide-react";
import { market } from "@/lib/markets";
import { SidebarTrigger } from "@/components/shadcn/sidebar";
import { Separator } from "@/components/shadcn/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/shadcn/breadcrumb";
import { crumbsFor } from "@/lib/nav";
import { ucpApi } from "@/lib/api";
import type { Notification } from "@/lib/ucp/types";

const READ_KEY = "ucp-notif-read";
const notifId = (n: Notification) => `${n.text}|${n.when}`;
const readIds = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); } catch { return new Set(); } };
/** Close a dropdown on Escape / click outside. */
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); }; const c = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); }; window.addEventListener("keydown", k); window.addEventListener("mousedown", c); return () => { window.removeEventListener("keydown", k); window.removeEventListener("mousedown", c); }; }, [open, close, ref]);
}
const VERBS = ["asked you to review", "reported a failed publish of", "is waiting on", "approved"];
/** Notification.text is "<who> <action> <page>"; bold who and page. Log lines ("<who> <did something>") bold the name only. */
function RichText({ text }: { text: string }) {
  for (const v of VERBS) { const i = text.indexOf(` ${v} `); if (i > 0) return <><b>{text.slice(0, i)}</b> {v} <b>{text.slice(i + v.length + 2)}</b></>; }
  const w = text.split(" "); const n = w.length > 1 && /^[A-Z]/.test(w[1]) && !/^(AI|System)$/.test(w[0]) ? 2 : 1;
  return <><b>{w.slice(0, n).join(" ")}</b> {w.slice(n).join(" ")}</>;
}

function Bell({ marketId, base, root }: { marketId: string; base: string; root: string }) {
  const router = useRouter(); const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false); const [items, setItems] = useState<Notification[]>([]); const [read, setRead] = useState<Set<string>>(() => (typeof window === "undefined" ? new Set() : readIds())); const [toast, setToast] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []); useDismiss(open, close, ref);
  useEffect(() => { let on = true; const load = () => ucpApi.notifications(marketId).then((n) => { if (on) setItems(n); }).catch(() => {}); load(); const t = setInterval(load, 60000); return () => { on = false; clearInterval(t); }; }, [marketId]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);
  const unread = items.filter((n) => !read.has(notifId(n))).length;
  const markAll = () => { const s = new Set(items.map(notifId)); setRead(s); try { localStorage.setItem(READ_KEY, JSON.stringify([...s])); } catch {} setOpen(false); setToast("All notifications marked as read"); };
  const go = (n: Notification) => { setOpen(false); router.push(n.target && n.target.startsWith(root + "/") ? `${base}/page${n.target.replace(root, "")}` : `${base}/tasks`); };
  return (
    <div ref={ref} className="relative">
      <button aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} onClick={() => setOpen(!open)} className="relative w-8 h-8 rounded-md grid place-items-center hover:bg-muted cursor-pointer">
        <BellIcon className="size-4" />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[10px] font-semibold grid place-items-center">{unread}</span>}
      </button>
      {open && <div role="dialog" aria-label="Notifications" className="absolute right-0 top-[40px] w-[380px] bg-surface text-ink border border-line rounded-xl shadow-2xl z-50 overflow-hidden">
        <div className="flex items-center px-4 py-3 border-b border-line"><b className="text-[14px]">Notifications</b><button className="btn btn-quiet btn-sm ml-auto" onClick={markAll}>Mark all as read</button></div>
        <div className="max-h-[380px] overflow-auto">{items.length ? items.map((n) => { const r = read.has(notifId(n)); return (
          <button key={notifId(n)} onClick={() => go(n)} className={`w-full text-left flex gap-3 px-4 py-3 border-b border-line hover:bg-surface-2 ${r ? "opacity-70" : ""}`}>
            <span className={`mt-1.5 w-2 h-2 rounded-full flex-none ${n.level === "crit" ? "bg-crit" : n.level === "warn" ? "bg-warn" : "bg-ink-4"}`} />
            <span className="text-[13px] leading-snug"><RichText text={n.text} /><small className="block text-ink-3 text-[11.5px] mt-0.5">{n.when}</small></span>
          </button>); }) : <div className="p-6 text-center text-ink-3 text-[13px]">Nothing new.</div>}</div>
        <div className="flex gap-2 px-3 py-2 bg-surface-2"><Link href={`${base}/tasks`} onClick={close} className="btn btn-quiet btn-sm">See all tasks</Link><Link href={`${base}/audit`} onClick={close} className="btn btn-quiet btn-sm">Audit log</Link></div>
      </div>}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-2.5 rounded-lg text-[13px] shadow-xl z-50">{toast}</div>}
    </div>
  );
}

/**
 * Verbatim port of hsbc-ucpmock's app header (`src/routes/(app)/+layout.svelte`): h-16 that
 * shrinks to h-12 when the sidebar is in icon mode, a px-4 group holding the trigger, a vertical
 * rule and the breadcrumb, then a search control that looks like a field and opens the ⌘K palette.
 * The breadcrumb carries no weight or colour classes on purpose — the shadcn defaults are what
 * give it the lighter look.
 *
 * Two deliberate differences: the notifications bell has no equivalent there (it lives in that
 * project's sidebar user block), so it sits after the search here; and the market, environment
 * and account controls are in the sidebar, as agreed.
 */
export function TopBar({ marketId, envId }: { marketId: string; envId: string }) {
  const pathname = usePathname();
  const m = market(marketId); const base = `/${marketId}/${envId}`;
  const crumbs = crumbsFor(pathname, marketId, envId);
  const openPalette = () => window.dispatchEvent(new Event("ucp:palette"));
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ms-1" />
        <Separator orientation="vertical" className="me-2 self-center! h-4!" />
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((c, i) => (
              <Fragment key={`${c.label}-${i}`}>
                {i > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                <BreadcrumbItem className={i < crumbs.length - 1 ? "hidden md:block" : ""}>
                  {i < crumbs.length - 1 && c.href
                    ? <BreadcrumbLink href={c.href}>{c.label}</BreadcrumbLink>
                    : <BreadcrumbPage>{c.label}</BreadcrumbPage>}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <button
        type="button"
        className="ms-auto me-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-72"
        onClick={openPalette}
        aria-label="Search"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="hidden flex-1 text-start sm:inline">Search pages or go to…</span>
        <kbd className="hidden shrink-0 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>
      <div className="me-4 flex items-center"><Bell marketId={marketId} base={base} root={m.root} /></div>
    </header>
  );
}
