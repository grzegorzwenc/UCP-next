"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ENVS, INSTANCES, market, env, marketsIn, type InstanceId } from "@/lib/markets";
import { openDrawer, useShellMode } from "@/components/shell/SideNav";
import { ucpApi } from "@/lib/api";
import type { PageSummary } from "@/lib/api/types";
import type { Notification, User, Asset, Template, Model } from "@/lib/ucp/types";
import { Pill } from "@/components/ui/Pill";
import { useSession } from "@/components/shell/Session";
import { ROLES } from "@/lib/ucp/seed";

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
      <button aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} onClick={() => setOpen(!open)} className="relative w-8 h-8 rounded-md grid place-items-center hover:bg-white/10">
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] stroke-current fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] font-semibold grid place-items-center">{unread}</span>}
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
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] shadow-xl z-50">{toast}</div>}
    </div>
  );
}

type Results = { pages: PageSummary[]; assets: Asset[]; users: User[]; templates: Template[]; models: Model[] };
type Hit = { key: string; href: string; node: React.ReactNode };
function Search({ marketId, base, root }: { marketId: string; base: string; root: string }) {
  const router = useRouter(); const ref = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState(""); const [res, setRes] = useState<Results | null>(null); const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []); useDismiss(open, close, ref);
  useEffect(() => { const s = q.trim(); if (!s) return; const t = setTimeout(() => ucpApi.search(marketId, s).then((r) => { setRes(r); setOpen(true); }).catch(() => {}), 200); return () => clearTimeout(t); }, [q, marketId]);
  const groups: { title: string; hits: Hit[] }[] = res ? [
    { title: "Pages", hits: res.pages.map((p) => ({ key: p.path, href: `${base}/page${p.path.replace(root, "")}`, node: <><Pill status={p.status} /><span className="font-medium">{p.title}</span><span className="font-mono text-[11px] text-ink-3 ml-auto">{p.path.replace(root, "") || "/"}</span></> })) },
    { title: "Assets", hits: res.assets.map((a) => ({ key: a.path, href: `${base}/assets?folder=${encodeURIComponent(a.folder)}`, node: <><span className="text-ink-3">▣</span><span className="font-medium">{a.name}</span><span className="text-[11.5px] text-ink-3 ml-auto">{a.folder} · {a.size}</span></> })) },
    { title: "People", hits: res.users.map((u) => ({ key: u.id, href: `${base}/users?user=${encodeURIComponent(u.id)}`, node: <><span className="text-ink-3">◉</span><span className="font-medium">{u.name}</span><span className="text-[11.5px] text-ink-3 ml-auto">{u.role} · {u.team}</span></> })) },
    { title: "Templates", hits: res.templates.map((t) => ({ key: t.id, href: `${base}/templates/${encodeURIComponent(t.id)}`, node: <><span className="text-ink-3">▤</span><span className="font-medium">{t.name}</span><span className="text-[11.5px] text-ink-3 ml-auto">{t.folder}</span></> })) },
    { title: "Models", hits: res.models.map((m) => ({ key: m.id, href: `${base}/models?model=${encodeURIComponent(m.id)}`, node: <><span className="text-ink-3">▦</span><span className="font-medium">{m.name}</span><span className="text-[11.5px] text-ink-3 ml-auto">{m.group} · v{m.version}</span></> })) },
  ].filter((g) => g.hits.length) : [];
  const first = groups[0]?.hits[0];
  const go = (href: string) => { setOpen(false); setQ(""); router.push(href); };
  const openPalette = () => window.dispatchEvent(new CustomEvent("ucp:palette"));
  return (
    <div ref={ref} className="relative flex-1 max-w-[460px]">
      <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-md px-3 py-1.5 text-[13px] text-white/60 focus-within:border-white/40"><span>⌕</span>
        <input aria-label="Search" className="flex-1 bg-transparent outline-none text-white placeholder:text-white/50" placeholder="Search pages, assets, people…" value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value.trim()) { setRes(null); setOpen(false); } }} onFocus={() => { if (res) setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter" && first) { e.preventDefault(); go(first.href); } else if (e.key === "Escape") { setOpen(false); (e.target as HTMLInputElement).blur(); } }} />
        <button type="button" aria-label="Open command palette" onClick={openPalette} className="font-mono text-[10.5px] border border-white/25 rounded px-1 hover:bg-white/10">⌘K</button></div>
      {open && res && <div role="listbox" aria-label="Search results" className="absolute left-0 right-0 top-[40px] bg-surface text-ink border border-line rounded-xl shadow-2xl z-50 max-h-[70vh] overflow-auto py-1">
        {groups.length ? groups.map((g) => <div key={g.title}><h6 className="px-3 pt-2 pb-1 text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold">{g.title}</h6>{g.hits.map((h) => <button key={h.key} role="option" aria-selected={false} onClick={() => go(h.href)} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left hover:bg-surface-2">{h.node}</button>)}</div>)
          : <div className="p-5 text-center text-ink-3 text-[13px]">No results for “{q}”.</div>}
        <div className="px-3 py-2 mt-1 border-t border-line text-[11.5px] text-ink-3">↵ opens the first result · <button className="underline" onClick={openPalette}>⌘K for commands</button></div>
      </div>}
    </div>
  );
}

const AVATAR = ["#00847F", "#376798", "#4D6474", "#DB0011", "#1B1C1F", "#83000A", "#5C5C5C"];
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";
const colorOf = (n: string) => AVATAR[n.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
function Account() {
  const router = useRouter(); const { user: me } = useSession();
  const ref = useRef<HTMLDivElement>(null); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [toast, setToast] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []); useDismiss(open, close, ref);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t); }, [toast]);
  const name = me.name;
  async function signOut() { setBusy(true); try { await ucpApi.logout(); setOpen(false); router.push("/login"); router.refresh(); } catch { setToast("Could not sign out. Try again."); setBusy(false); } }
  return (
    <div ref={ref} className="relative">
      <button aria-label={`Account: ${name}`} aria-expanded={open} onClick={() => setOpen(!open)} className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-semibold text-white" style={{ background: colorOf(name) }}>{initials(name)}</button>
      {open && <div role="menu" className="absolute right-0 top-[38px] w-[260px] bg-surface text-ink border border-line rounded-xl shadow-2xl z-50 overflow-hidden">
        <div className="px-4 py-3 border-b border-line"><b className="block text-[14px]">{name}</b><span className="block text-[12.5px] text-ink-3">{me.email || `${me.id}@hsbc.com`}</span><span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-3 text-ink-2">{ROLES[me.role]?.name ?? me.role}{me.team ? ` · ${me.team}` : ""}</span></div>
        <div className="px-4 py-2.5 text-[12px] text-ink-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-good" />Signed in with company SSO</div>
        <div className="px-3 pb-3"><button role="menuitem" className="btn btn-sm w-full justify-center" disabled={busy} onClick={() => void signOut()}>{busy ? "Signing out…" : "Sign out"}</button></div>
      </div>}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] shadow-xl z-50">{toast}</div>}
    </div>
  );
}

export function TopBar({ marketId, envId }: { marketId: string; envId: string }) {
  const router = useRouter(); const pathname = usePathname();
  const rest = pathname.split("/").slice(3).join("/") || "dashboard";
  const m = market(marketId), e = env(envId); const base = `/${marketId}/${envId}`;
  const { phone, tablet } = useShellMode(); const compact = phone || tablet; // no room for a separate instance switcher: one grouped market list
  return (
    <header className="h-[52px] flex items-center gap-2 md:gap-3 px-3 md:px-4 bg-[#0F1013] text-white">
      {phone && <button type="button" aria-label="Open menu" onClick={() => openDrawer(true)} className="w-9 h-9 grid place-items-center rounded-md hover:bg-white/10 -ml-1"><svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-2" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>}
      <a href={`/${marketId}/${envId}/dashboard`} className="flex items-center gap-2 font-semibold text-sm pr-2 rounded hover:bg-white/10 px-1.5 py-1 whitespace-nowrap"><img src="/hsbc-logo-white.svg" alt="" className="h-6" /><span className="hidden lg:inline w-px h-4 bg-white/25 mx-1" /><span className="hidden lg:inline">Unified Content Platform</span></a>
      {/* instance (EMEA / APAC / NA) → only that instance's markets; phones get one list grouped by instance */}
      {!compact && <label className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-md px-2.5 py-1 text-[13px]" title={INSTANCES.find((i) => i.id === m.instance)?.full}>
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none opacity-70" strokeWidth={1.8} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></svg>
        <select aria-label="Instance" className="bg-transparent font-semibold outline-none" value={m.instance} onChange={(ev) => { const first = marketsIn(ev.target.value as InstanceId)[0]; if (first) router.push(`/${first.id}/${envId}/${rest}`); }}>{INSTANCES.map((x) => <option key={x.id} value={x.id} className="text-black">{x.name}</option>)}</select>
      </label>}
      <label className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-md px-2.5 py-1 text-[13px] max-w-[46vw] md:max-w-none">
        <select aria-label="Market" className="bg-transparent font-semibold outline-none" value={m.id} onChange={(ev) => router.push(`/${ev.target.value}/${envId}/${rest}`)}>
          {compact ? INSTANCES.map((i) => <optgroup key={i.id} label={i.name} className="text-black">{marketsIn(i.id).map((x) => <option key={x.id} value={x.id} className="text-black">{x.flag} {x.name}</option>)}</optgroup>)
            : marketsIn(m.instance).map((x) => <option key={x.id} value={x.id} className="text-black">{x.flag} {x.name}</option>)}
        </select>
      </label>
      <label className="hidden sm:flex items-center gap-1.5 bg-white/10 border rounded-md px-2.5 py-1 text-[13px]" style={{ borderColor: e.color, color: e.color }}>
        <i className="inline-block w-2 h-2 rounded-full" style={{ background: e.color }} />
        <select aria-label="Environment" className="bg-transparent font-semibold outline-none" value={e.id} onChange={(ev) => router.push(`/${marketId}/${ev.target.value}/${rest}`)}>{ENVS.map((x) => <option key={x.id} value={x.id} className="text-black">{x.name}</option>)}</select>
      </label>
      {!phone && <Search marketId={marketId} base={base} root={m.root} />}
      <div className="ml-auto flex items-center gap-2 md:gap-3">{phone && <button type="button" aria-label="Search" onClick={() => window.dispatchEvent(new Event("ucp:palette"))} className="w-9 h-9 grid place-items-center rounded-md hover:bg-white/10 text-lg">⌕</button>}<Bell marketId={marketId} base={base} root={m.root} /><Account /></div>
    </header>
  );
}
