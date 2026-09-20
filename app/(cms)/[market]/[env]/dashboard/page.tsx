import Link from "next/link";
import { market, env } from "@/lib/markets";
import { allPages, backend } from "@/lib/server/pages";
import { Pill } from "@/components/ui/Pill";

export default async function Dashboard({ params }: PageProps<"/[market]/[env]/dashboard">) {
  const { market: mid, env: eid } = await params;
  const mk = market(mid), ev = env(eid);
  const all = (await allPages(mk.root)).filter((p) => !p.isFolder);
  const c = (s: string) => all.filter((p) => p.status === s).length;
  const base = `/${mid}/${eid}`;
  const tiles = [
    { l: `Pages on ${mk.name}`, v: all.length, sub: `${c("published")} published · ${c("draft") + c("failed")} in draft`, href: `${base}/pages`, go: "View pages", color: "var(--accent)" },
    { l: "Waiting for review", v: c("review"), sub: c("review") ? "Oldest waiting 2 days" : "Nothing waiting", href: `${base}/tasks`, go: "Open reviews", color: "var(--review)" },
    { l: "Published", v: c("published"), sub: `${all.length ? Math.round((c("published") / all.length) * 100) : 0}% of the site is live`, href: `${base}/pages`, go: "See published pages", color: "var(--good)" },
    { l: `Delivery · ${ev.name}`, v: c("failed") ? `${c("failed")} failed` : "99.98%", sub: c("failed") ? "A publish failed and needs action" : "Uptime · 84 ms typical response", href: `${base}/api`, go: "Delivery details", color: c("failed") ? "var(--crit)" : "var(--info)" },
  ];
  const recent = all.slice().sort((a, b) => (b.lastModified ?? "").localeCompare(a.lastModified ?? "")).slice(0, 6);
  return (
    <div className="p-7 pb-14">
      <div className="flex items-center gap-4 mb-6 p-5 bg-surface border border-line border-l-[5px] border-l-accent">
        <div className="text-[40px] leading-none" aria-hidden>{mk.flag}</div>
        <div><div className="text-2xl font-semibold leading-tight">{mk.name}</div><div className="text-[13px] text-ink-3 mt-1 flex gap-1.5 items-center"><span className="font-mono">{mk.domain}</span> · {mk.locales.join(", ")} · <Pill status={mk.status === "Live on UCP" ? "published" : mk.status === "On AEM" ? "draft" : "scheduled"} label={mk.status} /></div></div>
        <div className="ml-auto text-right text-sm font-semibold"><span><i className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: ev.color }} />{ev.name}</span><small className="block font-normal text-xs text-ink-3">{ev.id === "prod" ? "Publishing here goes live for customers." : "Nothing in this environment reaches customers."}</small><small className="block font-normal text-xs text-ink-3">Backend: {backend()}</small></div>
      </div>
      <h2 className="text-[15px] font-semibold text-ink-2 mb-2.5">What do you want to do?</h2>
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        {[["Create a page", "Pick a folder and a template.", `${base}/pages?new=1`, true], ["Edit a page", `Browse ${mk.name} or search by title or URL.`, `${base}/pages`, false], ["Review and approve", `${c("review")} waiting for review, ${c("approved")} ready to publish.`, `${base}/tasks`, false], ["Upload images or files", "Drag and drop, then use them on any page.", `${base}/assets`, false]].map(([t, d, href, primary]) => (
          <Link key={String(t)} href={String(href)} className={`grid grid-cols-[44px_1fr] gap-x-3.5 items-center p-5 min-h-[104px] border ${primary ? "bg-accent border-accent text-white" : "bg-surface border-line text-ink hover:border-ink-3 hover:shadow-md"}`}>
            <span className={`row-span-2 w-11 h-11 grid place-items-center ${primary ? "bg-white/20" : "bg-surface-3"}`}>＋</span><b className="text-base font-semibold">{t}</b><span className={`text-[12.5px] ${primary ? "text-white/85" : "text-ink-3"}`}>{d}</span>
          </Link>))}
      </div>
      <div className="grid grid-cols-4 gap-3.5 mb-5">
        {tiles.map((t) => <Link key={t.l} href={t.href} className="bg-surface border border-line p-6 min-h-[150px] flex flex-col gap-1.5 hover:border-ink-3 hover:shadow-md" style={{ borderTop: `4px solid ${t.color}` }}><span className="text-[13px] text-ink-2">{t.l}</span><span className="text-[44px] font-light leading-none tabular-nums" style={{ color: t.color === "var(--crit)" ? t.color : undefined }}>{t.v}</span><span className="text-[13px] text-ink-3">{t.sub}</span><span className="text-[13px] font-medium mt-auto">{t.go} <span className="text-accent font-bold">›</span></span></Link>)}
      </div>
      <div className="bg-surface border border-line p-5"><h3 className="text-[13px] font-semibold text-ink-2 mb-3 flex justify-between">Recently edited on {mk.name} <Link href={`${base}/pages`} className="text-info font-medium text-[12.5px]">All pages</Link></h3>
        <ul>{recent.map((p) => <li key={p.path} className="flex items-center gap-2.5 py-2 border-b border-line last:border-0 text-[13.5px]"><Pill status={p.status ?? "draft"} /><Link href={`${base}/page${p.path.replace(mk.root, "")}`} className="font-medium hover:underline">{p.title}</Link><span className="font-mono text-xs text-ink-3">{p.path.replace(mk.root, "")}</span><span className="ml-auto text-xs text-ink-3">{p.lastModified?.slice(0, 10)}</span></li>)}</ul></div>
    </div>
  );
}
