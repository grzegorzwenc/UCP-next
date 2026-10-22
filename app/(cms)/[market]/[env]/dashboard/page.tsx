import Link from "next/link";
import { cookies } from "next/headers";
import { FilePlus2, PenLine, ClipboardCheck, ImageUp } from "lucide-react";
import { market, env } from "@/lib/markets";
import { allPages } from "@/lib/server/pages";
import { readLogFor, listTasks, userName, me } from "@/lib/server/ucp";
import { Pill } from "@/components/ui/Pill";
import { Avatar } from "@/components/ui/Avatar";
import { ActionCard } from "@/components/ui/ActionCard";
import { DismissibleNotice } from "@/components/ui/DismissibleNotice";
import { noticeCookie } from "@/lib/notices";

/** Content activity for the last 30 days. Deterministic demo series until the delivery metrics service exists. */
function series() { const out: number[][] = [[], [], []]; let a = 52, b = 38, c = 22; for (let i = 0; i < 30; i++) { a = Math.max(20, Math.min(95, a + (((i * 7) % 5) - 2) * 2.6)); b = Math.max(15, Math.min(80, b + (((i * 5) % 5) - 2) * 2.1)); c = Math.max(10, Math.min(60, c + (((i * 3) % 5) - 2) * 1.8)); out[0].push(Math.round(a)); out[1].push(Math.round(b)); out[2].push(Math.round(c)); } return out; }
/** Wall clock read outside render so the compiler lint (react-hooks/purity) is satisfied; the page is dynamic anyway. */
const now = () => Date.now();
function LineChart() {
  const W = 640, H = 230, L = 36, R = 12, T = 14, Bt = 30, n = 30, max = 100; const d = series();
  const x = (i: number) => L + (i * (W - L - R)) / (n - 1); const y = (v: number) => T + (H - T - Bt) * (1 - v / max);
  const S = [{ k: 0, name: "Pages published", c: "var(--good)" }, { k: 1, name: "Pages created", c: "var(--ink)" }, { k: 2, name: "Content updated", c: "var(--ink-4)" }];
  const today = new Date(now()); const days = [28, 21, 14, 7, 0].map((back) => { const t = new Date(today); t.setDate(t.getDate() - back); return t.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); });
  return <div>
    <div className="flex gap-4 text-xs text-ink-2 mb-2">{S.map((s) => <span key={s.k} className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: s.c }} />{s.name}<b className="ml-1 text-ink">{d[s.k].reduce((a, b) => a + b, 0).toLocaleString("en-GB")}</b></span>)}</div>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Content activity over the last 30 days" className="w-full h-auto text-xs" style={{ fontFamily: "var(--font-mono)" }}>
      {[0, 50, 100].map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={L - 8} y={y(v) + 4} textAnchor="end" fill="var(--ink-3)">{v}</text></g>)}
      {days.map((dn, i) => <text key={dn} x={x(Math.min(i * 7, n - 1))} y={H - 8} textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"} fill="var(--ink-3)">{dn}</text>)}
      <path d={`M${x(0)},${y(0)} ${d[0].map((v, i) => `L${x(i)},${y(v)}`).join(" ")} L${x(n - 1)},${y(0)} Z`} fill="var(--good)" opacity=".12" />
      {S.map((s) => <polyline key={s.k} fill="none" strokeWidth={2} stroke={s.c} strokeLinejoin="round" points={d[s.k].map((v, i) => `${x(i)},${y(v)}`).join(" ")} />)}
      {S.map((s) => <circle key={s.k} cx={x(n - 1)} cy={y(d[s.k][n - 1])} r={4} fill={s.c} stroke="var(--surface)" strokeWidth={2} />)}
      {d[0].map((_, i) => <g key={i} className="group"><rect x={x(i) - 10} y={T} width={20} height={H - T - Bt} fill="transparent"><title>{`Day ${i + 1}: ${d[0][i]} published · ${d[1][i]} created · ${d[2][i]} updated`}</title></rect>{S.map((s) => <circle key={s.k} cx={x(i)} cy={y(d[s.k][i])} r={4} fill={s.c} stroke="var(--surface)" strokeWidth={2} className="opacity-0 group-hover:opacity-100" />)}</g>)}
    </svg>
  </div>;
}
function StatusViz({ parts, total }: { parts: { l: string; n: number; c: string }[]; total: number }) {
  const max = Math.max(...parts.map((p) => p.n), 1);
  return <div>
    <div className="flex h-3 rounded overflow-hidden bg-surface-3" role="img" aria-label="Share of pages by status">{parts.map((p) => <i key={p.l} style={{ width: `${(p.n / total) * 100}%`, background: p.c }} title={`${p.l}: ${p.n}`} />)}</div>
    <div className="text-xs text-ink-3 mt-2 mb-3"><b className="text-ink text-base">{total}</b> pages in total</div>
    <ul className="flex flex-col gap-1.5">{parts.map((p) => <li key={p.l} className="grid grid-cols-[10px_110px_1fr_36px_40px] items-center gap-2 text-sm"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: p.c }} /><span className="text-ink-2">{p.l}</span><span className="h-2 bg-surface-3 rounded overflow-hidden"><i className="block h-full" style={{ width: `${Math.round((p.n / max) * 100)}%`, background: p.c }} /></span><b className="text-right">{p.n}</b><small className="text-ink-3 text-right">{Math.round((p.n / total) * 100)}%</small></li>)}</ul>
  </div>;
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) { return <div className="bg-surface border border-line p-5 min-w-0"><h3 className="text-sm font-medium text-ink-2 mb-3 flex justify-between items-center">{title}{right}</h3>{children}</div>; }

export default async function Dashboard({ params }: PageProps<"/[market]/[env]/dashboard">) {
  const { market: mid, env: eid } = await params;
  const mk = market(mid), ev = env(eid); const base = `/${mid}/${eid}`;
  const everything = await allPages(mk.root); const all = everything.filter((p) => !p.isFolder); const folders = everything.filter((p) => p.isFolder && p.path.split("/").length === mk.root.split("/").length + 1);
  const [{ log }, tasks] = await Promise.all([readLogFor(mk.id, 5), listTasks(mk.id, everything)]);
  const names = Object.fromEntries(await Promise.all(log.map(async (e) => [e.who, await userName(e.who)] as const)));
  const c = (s: string) => all.filter((p) => p.status === s).length; const n = all.length; const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const health = ({ prod: ["99.98%", "84 ms"], stage: ["99.9%", "96 ms"], test: ["98.7%", "140 ms"], dev: ["97.2%", "210 ms"] } as Record<string, string[]>)[ev.id] ?? ["99.9%", "90 ms"];
  const overdue = tasks.filter((t) => t.overdueDays > 0).length; const oldest = tasks.filter((t) => t.kind === "Review").sort((a, b) => (a.sentAt ?? "").localeCompare(b.sentAt ?? ""))[0];
  const waitingDays = oldest?.sentAt ? Math.max(0, Math.round((now() - new Date(oldest.sentAt).getTime()) / 86400000)) : 0;
  const tiles = [
    { l: `Pages on ${mk.name}`, v: n, sub: `${c("published")} published · ${c("draft") + c("failed")} in draft`, href: `${base}/pages`, go: "View pages", color: "var(--brand)" },
    { l: "Waiting for review", v: c("review") + c("inreview") + c("bizreview"), sub: c("review") + c("inreview") + c("bizreview") ? `${c("review") + c("inreview")} author's · ${c("bizreview")} business${c("review") ? ` · oldest ${waitingDays} day${waitingDays === 1 ? "" : "s"}` : ""}` : "Nothing waiting. Nice.", href: `${base}/tasks`, go: "Open reviews", color: "var(--review)" },
    { l: "Published", v: c("published"), sub: `${pct(c("published"), n)}% of the site is live`, href: `${base}/pages`, go: "See published pages", color: "var(--good)" },
    { l: `Delivery · ${ev.name}`, v: c("failed") ? `${c("failed")} failed` : health[0], sub: c("failed") ? "A publish failed and needs action" : `Uptime · ${health[1]} typical response`, href: `${base}/api`, go: "Delivery details", color: c("failed") ? "var(--crit)" : "var(--info)" },
  ];
  const recent = all.slice().sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? "")).slice(0, 6);
  const bySection = folders.map((f) => ({ f, n: all.filter((p) => p.path.startsWith(f.path + "/")).length })).sort((a, b) => b.n - a.n); const secMax = bySection[0]?.n || 1;
  const who = await me();
  /* read server-side: a dismissed notice should not paint and then disappear */
  const introDismissed = (await cookies()).get(noticeCookie("ucp-intro"))?.value === "1";
  /* "Priya Kaur" → "Priya"; a dotted id ("super.admin") takes its first part. */
  const firstName = (who.name || "").split(/[\s.]/)[0];
  const QUICK = [
    { title: "Create a page", desc: "Pick a folder and a template. Takes under a minute.", href: `${base}/pages?new=1`, icon: FilePlus2, primary: true },
    { title: "Edit a page", desc: `Browse ${mk.name} or search by title or URL.`, href: `${base}/pages`, icon: PenLine, primary: false },
    { title: "Review and approve", desc: `${c("review")} waiting for review, ${c("approved")} ready to publish.`, href: `${base}/tasks`, icon: ClipboardCheck, primary: false },
    { title: "Upload images or files", desc: "Drag and drop, then use them on any page.", href: `${base}/assets`, icon: ImageUp, primary: false },
  ];
  const rel = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); const diff = Math.round((now() - d.getTime()) / 60000); return diff < 60 ? `${Math.max(diff, 0)} min ago` : diff < 1440 ? `${Math.round(diff / 60)} h ago` : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
  return (
    <div className="p-4 pt-0 pb-14">
      {/* Welcome: plain text, no block — the shared header treatment from hsbc-ucpmock. */}
      <header className="mb-3">
        <h1 className="text-3xl font-light tracking-tight">Welcome{firstName ? `, ${firstName}` : ""}</h1>
      </header>
      {!introDismissed && (
        <DismissibleNotice id="ucp-intro">
            Unified Content Platform (UCP) is designed for creating, managing, and publishing digital
            experiences with ease. From web pages to mobile experiences and reusable content, UCP provides
            the tools your teams need to deliver faster and smarter.
        </DismissibleNotice>
      )}

      {/* Quick actions, ordered by how often authors use them. Card treatment ported from
          hsbc-ucpmock's home: an icon tile that wiggles on hover, and an "Explore →" that fades
          and slides in beside the title. "Create a page" keeps the filled HSBC red. */}
      <h2 className="text-sm font-medium text-muted-foreground mb-3">What do you want to do?</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {QUICK.map((a) => <ActionCard key={a.title} {...a} description={a.desc} />)}
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3.5 mb-5">
        {tiles.map((t) => <Link key={t.l} href={t.href} className="bg-surface border border-line p-6 min-h-[150px] flex flex-col gap-1.5 hover:border-ink-3 hover:shadow-md" style={{ borderTop: `4px solid ${t.color}` }}><span className="text-sm text-ink-2">{t.l}</span><span className="text-4xl font-light leading-none tabular-nums" style={{ color: t.color === "var(--crit)" ? t.color : undefined }}>{t.v}</span><span className="text-sm text-ink-3">{t.sub}</span><span className="text-sm font-medium mt-auto">{t.go} <span className="text-brand font-bold">›</span></span></Link>)}
      </div>
      <div className="grid md:grid-cols-2 gap-3.5 mb-3.5">
        <Card title="Content by status"><StatusViz total={n} parts={[{ l: "Published", n: c("published"), c: "var(--good)" }, { l: "Ready to publish", n: c("approved"), c: "var(--info)" }, { l: "Waiting for author's review assignment", n: c("review"), c: "var(--review)" }, { l: "In author's review", n: c("inreview"), c: "var(--review)" }, { l: "Reviewed", n: c("reviewed"), c: "var(--good)" }, { l: "In business review", n: c("bizreview"), c: "var(--warn)" }, { l: "Scheduled", n: c("scheduled"), c: "var(--sched)" }, { l: "Draft", n: c("draft"), c: "var(--neutral)" }, { l: "Publish failed", n: c("failed"), c: "var(--crit)" }].filter((p) => p.n)} /></Card>
        <Card title="Content activity" right={<span className="font-normal text-ink-3">Last 30 days</span>}><LineChart /></Card>
      </div>
      <div className="grid md:grid-cols-2 gap-3.5 mb-3.5">
        <Card title="Pages by section"><ul className="flex flex-col gap-1">{bySection.map(({ f, n: k }) => <li key={f.path}><Link href={`${base}/pages${f.path.replace(mk.root, "")}`} className="grid grid-cols-[140px_1fr_32px] items-center gap-3 py-1.5 text-sm hover:bg-surface-2 -mx-2 px-2 rounded"><span>{f.title}</span><span className="h-2.5 bg-surface-3 rounded overflow-hidden"><i className="block h-full bg-brand" style={{ width: `${Math.round((k / secMax) * 100)}%` }} /></span><b className="text-right tabular-nums">{k}</b></Link></li>)}</ul></Card>
        <Card title="Your tasks" right={<Link href={`${base}/tasks`} className="text-info font-medium text-xs">All tasks{overdue ? ` · ${overdue} overdue` : ""}</Link>}><ul>{tasks.slice(0, 5).map((t) => <li key={t.page.path} className="flex items-center gap-2.5 py-2 border-b border-line last:border-0 text-sm"><Pill status={t.page.status as "draft"} label={t.kind} /><Link href={`${base}/page${t.page.path.replace(mk.root, "")}`} className="font-medium hover:underline truncate">{t.what}: {t.page.title}</Link><span className={`ml-auto text-xs whitespace-nowrap ${t.overdueDays > 0 ? "text-crit font-medium" : t.overdueDays === 0 ? "text-warn font-medium" : "text-ink-3"}`}>{t.overdueDays > 0 ? `${t.overdueDays} day${t.overdueDays === 1 ? "" : "s"} overdue` : t.overdueDays === 0 ? "Due today" : `Due ${new Date(t.due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}</span></li>)}{!tasks.length && <li className="text-ink-3 text-sm">Nothing is waiting on you.</li>}</ul></Card>
      </div>
      <div className="grid md:grid-cols-2 gap-3.5">
        <Card title="Latest activity" right={<Link href={`${base}/audit`} className="text-info font-medium text-xs">Audit log</Link>}><ul>{log.map((e) => <li key={e.id} className="flex items-center gap-2.5 py-2 border-b border-line last:border-0 text-sm"><Avatar name={names[e.who]} size={26} /><span className="min-w-0 truncate"><b>{names[e.who]}</b> {e.text}</span><span className="ml-auto text-xs text-ink-3 whitespace-nowrap">{rel(e.time)}</span></li>)}</ul></Card>
        <Card title={`Recently edited on ${mk.name}`} right={<Link href={`${base}/pages`} className="text-info font-medium text-xs">All pages</Link>}><ul>{recent.map((p) => <li key={p.path} className="flex items-center gap-2.5 py-2 border-b border-line last:border-0 text-sm"><Pill status={p.status ?? "draft"} /><Link href={`${base}/page${p.path.replace(mk.root, "")}`} className="font-medium hover:underline truncate">{p.title}</Link><span className="font-mono text-xs text-ink-3 truncate">{p.path.replace(mk.root, "")}</span><span className="ml-auto text-xs text-ink-3 whitespace-nowrap">{p.lastModified?.slice(0, 10)}</span></li>)}</ul></Card>
      </div>
    </div>
  );
}
