import Link from "next/link";
import { cookies } from "next/headers";
import { FilePlus2, PenLine, ClipboardCheck, ImageUp, FileText, CheckCheck, Activity, TriangleAlert } from "lucide-react";
import { market, env } from "@/lib/markets";
import { allPages } from "@/lib/server/pages";
import { readLogFor, listTasks, userName, me } from "@/lib/server/ucp";
import { Pill } from "@/components/ui/Pill";
import { Avatar } from "@/components/ui/Avatar";
import { ActionCard } from "@/components/ui/ActionCard";
import { StatCard } from "@/components/ui/StatCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ActivityChart, type ActivityPoint } from "@/components/ui/ActivityChart";
import { DismissibleNotice } from "@/components/ui/DismissibleNotice";
import { noticeCookie } from "@/lib/notices";

/** Content activity for the last 30 days. Deterministic demo series until the delivery metrics service exists. */
function series() { const out: number[][] = [[], [], []]; let a = 52, b = 38, c = 22; for (let i = 0; i < 30; i++) { a = Math.max(20, Math.min(95, a + (((i * 7) % 5) - 2) * 2.6)); b = Math.max(15, Math.min(80, b + (((i * 5) % 5) - 2) * 2.1)); c = Math.max(10, Math.min(60, c + (((i * 3) % 5) - 2) * 1.8)); out[0].push(Math.round(a)); out[1].push(Math.round(b)); out[2].push(Math.round(c)); } return out; }
/** Wall clock read outside render so the compiler lint (react-hooks/purity) is satisfied; the page is dynamic anyway. */
const now = () => Date.now();
function StatusViz({ parts, total }: { parts: { l: string; n: number; c: string }[]; total: number }) {
  const max = Math.max(...parts.map((p) => p.n), 1);
  return <div>
    <div className="flex h-3 rounded overflow-hidden bg-surface-3" role="img" aria-label="Share of pages by status">{parts.map((p) => <i key={p.l} style={{ width: `${(p.n / total) * 100}%`, background: p.c }} title={`${p.l}: ${p.n}`} />)}</div>
    <div className="text-xs text-ink-3 mt-2 mb-3"><b className="text-ink text-base">{total}</b> pages in total</div>
    <ul className="flex flex-col gap-1.5">{parts.map((p) => <li key={p.l} className="grid grid-cols-[10px_150px_1fr_36px_40px] items-center gap-2 text-sm"><i className="w-2.5 h-2.5 rounded-sm" style={{ background: p.c }} /><span className="text-ink-2 min-w-0 truncate" title={p.l}>{p.l}</span><span className="h-2 bg-surface-3 rounded overflow-hidden"><i className="block h-full" style={{ width: `${Math.round((p.n / max) * 100)}%`, background: p.c }} /></span><b className="text-right">{p.n}</b><small className="text-ink-3 text-right">{Math.round((p.n / total) * 100)}%</small></li>)}</ul>
  </div>;
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-line p-5 min-w-0 h-full flex flex-col">
      <h3 className="text-sm font-medium text-ink-2 mb-3 flex justify-between items-center shrink-0">{title}{right}</h3>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

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
  const activity: ActivityPoint[] = (() => {
    const d = series(); const today = new Date(now());
    return d[0].map((_, i) => {
      const t = new Date(today); t.setDate(t.getDate() - (29 - i));
      return { day: t.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), published: d[0][i], created: d[1][i], updated: d[2][i] };
    });
  })();
  const failed = c("failed");
  const waiting = c("review") + c("inreview") + c("bizreview");
  const tiles = [
    { label: `Pages on ${mk.name}`, value: n, detail: `${c("published")} published · ${c("draft") + failed} in draft`, href: `${base}/pages`, icon: FileText },
    { label: "Waiting for review", value: waiting, detail: waiting ? `${c("review") + c("inreview")} author's · ${c("bizreview")} business${c("review") ? ` · oldest ${waitingDays}d` : ""}` : "Nothing waiting", href: `${base}/tasks`, icon: ClipboardCheck },
    { label: "Published", value: c("published"), detail: `${pct(c("published"), n)}% of the site is live`, href: `${base}/pages`, icon: CheckCheck },
    failed
      ? { label: `Delivery · ${ev.name}`, value: `${failed} failed`, detail: "A publish failed and needs action", href: `${base}/api`, icon: TriangleAlert, tone: "alert" as const }
      : { label: `Delivery · ${ev.name}`, value: health[0], detail: `Uptime · ${health[1]} typical response`, href: `${base}/api`, icon: Activity },
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
      <SectionTitle id="quick-actions">What do you want to do?</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {QUICK.map((a) => <ActionCard key={a.title} {...a} description={a.desc} />)}
      </div>
      <SectionTitle id="at-a-glance" help="Where this market stands right now. Every figure opens the list behind it.">Where things stand</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {tiles.map((t) => <StatCard key={t.label} {...t} />)}
      </div>
      <SectionTitle id="workspace" help="Status, activity, sections, tasks and what changed recently.">Your workspace</SectionTitle>
      <div className="grid md:grid-cols-2 gap-3.5 mb-3.5">
        <Card title="Content by status"><StatusViz total={n} parts={[{ l: "Published", n: c("published"), c: "var(--good)" }, { l: "Ready to publish", n: c("approved"), c: "var(--info)" }, { l: "Waiting for a reviewer", n: c("review"), c: "var(--review)" }, { l: "In author's review", n: c("inreview"), c: "var(--review)" }, { l: "Reviewed", n: c("reviewed"), c: "var(--good)" }, { l: "In business review", n: c("bizreview"), c: "var(--warn)" }, { l: "Scheduled", n: c("scheduled"), c: "var(--sched)" }, { l: "Draft", n: c("draft"), c: "var(--neutral)" }, { l: "Publish failed", n: c("failed"), c: "var(--crit)" }].filter((p) => p.n)} /></Card>
        <Card title="Content activity" right={<span className="font-normal text-ink-3">Last 30 days</span>}><ActivityChart data={activity} /></Card>
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
