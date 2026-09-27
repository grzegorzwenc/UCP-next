"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { AuditEvent, AuditType } from "@/lib/ucp/types";
import { Avatar } from "@/components/ui/Avatar";
import { dayOf, resolveTarget, timeOf, type TargetLink } from "@/lib/ucp/auditView";

type Props = { /** Set to the viewer's name when they only see their own actions (not an admin). */ own?: string; log: AuditEvent[]; names: Record<string, string>; pageTitles: Record<string, string>; base: string; root: string; marketName: string; envName: string; initial: { type: string; q: string; who: string; period: string } };
type Period = "all" | "today" | "2d";
const PAGE = 100;
const TABS: [string, string][] = [["all", "All"], ["content", "Content"], ["publishing", "Publishing"], ["permissions", "Permissions"], ["system", "System"]];
const LEVEL_DOT: Record<string, string> = { crit: "bg-crit", publishing: "bg-good", permissions: "bg-review", content: "bg-ink-2", system: "bg-ink-4" };
const PageIcon = () => <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none text-ink-3" strokeWidth={1.8}><path d="M6 3h8l5 5v13H6zM14 3v5h5" /></svg>;
const UserIcon = () => <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none text-ink-3" strokeWidth={1.8}><path d="M12 11a3.5 3.5 0 1 0 0-.1M5 20a7 7 0 0 1 14 0" /></svg>;
const SearchIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none text-ink-3 flex-none" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;

function Kpi({ label, value, tone }: { label: string; value: number; tone: "grey" | "green" | "blue" | "crit" }) {
  const top = { grey: "border-t-neutral", green: "border-t-good", blue: "border-t-info", crit: "border-t-crit" }[tone];
  return <div className={`bg-surface border border-line rounded-[10px] border-t-[3px] px-[18px] py-3.5 grid gap-1 ${top}`}><span className="text-[12.5px] text-ink-2 font-medium">{label}</span><span className={`text-[28px] font-semibold tracking-[-.02em] leading-[1.1] tabular-nums ${tone === "crit" ? "text-crit" : ""}`}>{value}</span></div>;
}
function TargetChip({ t }: { t: TargetLink }) {
  if (t.kind === "none") return null;
  return <span className="inline-flex items-center gap-1.5 text-[11.5px] border border-line rounded-full px-2 py-0.5 bg-surface-2 text-ink-2 max-w-full">{t.kind === "page" && <PageIcon />}{t.kind === "user" && <UserIcon />}<span className={t.kind === "path" ? "font-mono" : ""}>{t.label}</span>{t.sub && <span className="font-mono text-ink-3">{t.sub}</span>}</span>;
}

export function AuditLog({ own, log, names, pageTitles, base, root, marketName, envName, initial }: Props) {
  const router = useRouter();
  const [type, setType] = useState(initial.type || "all"); const [q, setQ] = useState(initial.q); const [who, setWho] = useState(initial.who); const [period, setPeriod] = useState<Period>((["today", "2d"].includes(initial.period) ? initial.period : "all") as Period);
  const sync = (p: { type?: string; q?: string; who?: string; period?: string }) => { const u = new URLSearchParams(); const v = { type, q, who, period, ...p }; if (v.type && v.type !== "all") u.set("type", v.type); if (v.q) u.set("q", v.q); if (v.who) u.set("who", v.who); if (v.period && v.period !== "all") u.set("period", v.period); const s = u.toString(); window.history.replaceState(null, "", `${base}/audit${s ? "?" + s : ""}`); };
  const actors = useMemo(() => [...new Set(log.map((e) => e.who))].sort((a, b) => (names[a] ?? a).localeCompare(names[b] ?? b)), [log, names]);
  const nameOf = (id: string) => names[id] ?? (id === "system" ? "System" : id);
  const days = useMemo(() => Object.fromEntries(log.map((e) => [e.id, dayOf(e.time)])), [log]);
  const inPeriod = (e: AuditEvent) => period === "all" || (period === "today" && days[e.id] === "Today") || (period === "2d" && ["Today", "Yesterday"].includes(days[e.id]));
  const rows = useMemo(() => { const s = q.trim().toLowerCase(); return log.filter((e) => (type === "all" || e.type === type) && inPeriod(e) && (!who || e.who === who) && (!s || `${nameOf(e.who)} ${e.text} ${e.target ?? ""} ${e.target ? pageTitles[e.target] ?? "" : ""} ${e.requestId ?? ""}`.toLowerCase().includes(s))); }, [log, type, q, who, period, days]); // eslint-disable-line react-hooks/exhaustive-deps
  const filterKey = `${type}|${q}|${who}|${period}`; const [limit, setLimit] = useState(PAGE); const [seenKey, setSeenKey] = useState(filterKey); if (seenKey !== filterKey) { setSeenKey(filterKey); setLimit(PAGE); }
  const shown = useMemo(() => rows.slice(0, limit), [rows, limit]);
  const groups = useMemo(() => { const g: { d: string; items: AuditEvent[] }[] = []; shown.forEach((e) => { const d = days[e.id]; let x = g.find((y) => y.d === d); if (!x) { x = { d, items: [] }; g.push(x); } x.items.push(e); }); return g; }, [shown, days]);
  const today = log.filter((e) => days[e.id] === "Today"); const cntType = (t: AuditType) => today.filter((e) => e.type === t).length; const failures = today.filter((e) => e.level === "crit").length;
  const count = (t: string) => log.filter((e) => e.type === t).length;
  const clear = () => { setType("all"); setQ(""); setWho(""); setPeriod("all"); sync({ type: "all", q: "", who: "", period: "all" }); };
  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [["time", "type", "who", "text", "target", "requestId"].join(","), ...rows.map((e) => [e.time, e.level === "crit" ? `${e.type} (failed)` : e.type, nameOf(e.who), e.text, e.target ?? "", e.requestId ?? ""].map(esc).join(","))].join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `audit-${marketName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const inputCls = "border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] bg-surface";

  return (<div className="p-4 md:p-7">
    <div className="flex flex-wrap items-start gap-x-4 gap-y-3 mb-5"><div><h1 className="text-2xl font-semibold">{own ? "My activity" : "Audit log"}</h1><p className="text-ink-3 text-[13px] mt-1">{own && <><b className="text-ink-2">Only your own actions, {own}.</b> Site admins see everyone&rsquo;s. </>}Every change to content, publishing and permissions on {marketName} · {envName}. Immutable, kept for 7 years, exported nightly to the security team.</p></div>
      <div className="ml-auto flex gap-2"><button className="btn" onClick={exportCsv} disabled={rows.length === 0}>Export CSV</button></div></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5 mb-4"><Kpi label="Events today" value={today.length} tone="grey" /><Kpi label="Publishes today" value={cntType("publishing")} tone="green" /><Kpi label="Permission changes today" value={cntType("permissions")} tone="blue" /><Kpi label="Failures today" value={failures} tone={failures > 0 ? "crit" : "grey"} /></div>
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <label className={`flex items-center gap-2 ${inputCls} min-w-[280px]`}><SearchIcon /><input aria-label="Search" className="flex-1 outline-none bg-transparent" placeholder="Search people, pages, actions" value={q} onChange={(e) => { setQ(e.target.value); sync({ q: e.target.value }); }} /></label>
      <select aria-label="Person" className={inputCls} value={who} onChange={(e) => { setWho(e.target.value); sync({ who: e.target.value }); }}><option value="">Anyone</option>{actors.map((a) => <option key={a} value={a}>{nameOf(a)}</option>)}</select>
      <select aria-label="Period" className={inputCls} value={period} onChange={(e) => { setPeriod(e.target.value as Period); sync({ period: e.target.value }); }}><option value="all">All time</option><option value="today">Today</option><option value="2d">Last 2 days</option></select>
      <span className="ml-auto text-[12.5px] text-ink-3">{rows.length} of {log.length} events</span></div>
    <div className="flex gap-1.5 mb-3 flex-wrap">{TABS.map(([k, l]) => <button key={k} className={`btn btn-sm ${type === k ? "on" : ""}`} onClick={() => { setType(k); sync({ type: k }); }}>{l}{k !== "all" && <span className={`font-mono text-[11px] ${type === k ? "text-white/70" : "text-ink-3"}`}>{count(k)}</span>}</button>)}</div>
    {groups.length === 0 ? <div className="p-10 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">Nothing logged for this filter. <button className="underline" onClick={clear}>Clear filters</button></div>
      : groups.map((g) => <section key={g.d}><h4 className="mt-1.5 mb-2 text-[12px] tracking-[.08em] uppercase text-ink-3 font-semibold">{g.d}</h4>
        <div className="bg-surface border border-line rounded-lg px-5 py-1 mb-3.5"><ul>{g.items.map((e) => { const t = resolveTarget(e.target, { base, root, pages: pageTitles, names }); const system = e.who === "system";
          return <li key={e.id} onClick={t.href ? () => router.push(t.href!) : undefined} className={`grid grid-cols-[52px_30px_1fr_auto] items-start gap-3 py-2.5 border-b border-line last:border-0 ${t.href ? "cursor-pointer hover:bg-surface-2 -mx-2 px-2 rounded" : ""}`}>
            <span className="font-mono text-[12px] text-ink-3 pt-0.5">{timeOf(e.time)}</span>
            <span className="grid place-items-center h-[26px]">{system ? <span className={`w-2 h-2 rounded-full ${LEVEL_DOT[e.level === "crit" ? "crit" : e.type] ?? "bg-ink-4"}`} /> : <Avatar name={nameOf(e.who)} size={26} />}</span>
            <span className="min-w-0 text-[13.5px]"><b className="font-semibold">{nameOf(e.who)}</b> {e.text}<span className="flex items-center gap-2 mt-1 flex-wrap">{t.href ? <Link href={t.href} onClick={(ev) => ev.stopPropagation()} className="hover:underline"><TargetChip t={t} /></Link> : <TargetChip t={t} />}{e.requestId && <span className="font-mono text-[11px] text-ink-4">req {e.requestId.slice(0, 8)}</span>}</span></span>
            <span className={`text-[11px] tracking-[.06em] uppercase font-semibold pt-1 ${e.level === "crit" ? "text-crit" : "text-ink-3"}`}>{e.level === "crit" ? "failed" : e.type}</span></li>; })}</ul></div></section>)}
    {rows.length > shown.length && <div className="flex items-center justify-center gap-3 py-3 text-[12.5px] text-ink-3">Showing the latest {shown.length} of {rows.length}<button className="btn btn-sm" onClick={() => setLimit(limit + PAGE)}>Load older events</button></div>}
  </div>);
}
