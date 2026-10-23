import Link from "next/link";
import { AUDIENCES } from "@/lib/ucp/benefits";

export const metadata = { title: "Why UCP" };

const ICON: Record<string, string> = {
  developers: "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16",
  authors: "M4 20h4l11-11-4-4L4 16zM13.5 6.5l4 4",
  customers: "M9 8a3.5 3.5 0 1 0 0-.1M2.5 20a6.5 6.5 0 0 1 13 0M16 4a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3",
};

/** Why UCP: the benefits for developers, content authors and customers, one column each (or one audience via ?for=). */
export default async function Page({ params, searchParams }: PageProps<"/[market]/[env]/benefits">) {
  const { market: mid, env: eid } = await params; const sp = await searchParams;
  const only = AUDIENCES.find((a) => a.id === sp.for); const list = only ? [only] : AUDIENCES;
  const href = (id?: string) => `/${mid}/${eid}/benefits${id ? `?for=${id}` : ""}`;
  const tab = (on: boolean) => `px-3 py-1.5 rounded-full text-sm font-medium border ${on ? "bg-ink text-white border-ink" : "border-line-2 text-ink-2 hover:border-ink-4 hover:text-ink"}`;
  return <div className="p-4 md:p-8 overflow-auto h-full">
    <div className="max-w-[1280px] mx-auto">
      <p className="text-xs font-medium uppercase tracking-[.1em] text-brand">HSBC Unified Content Platform</p>
      <h1 className="text-3xl md:text-3xl font-medium leading-tight mt-1">Why UCP</h1>
      <p className="text-base text-ink-2 mt-2 max-w-[720px]">One platform where every HSBC market builds, reviews, approves and publishes web content with the same components, the same four-eyes workflow and a full audit trail. Here is what that means for each group of people.</p>
      <nav aria-label="Audience" className="flex flex-wrap gap-2 mt-5">
        <Link href={href()} className={tab(!only)} aria-current={!only ? "page" : undefined}>Everyone</Link>
        {AUDIENCES.map((a) => <Link key={a.id} href={href(a.id)} className={tab(only?.id === a.id)} aria-current={only?.id === a.id ? "page" : undefined}>{a.name}</Link>)}
      </nav>
      <div className={`grid gap-5 mt-6 ${only ? "" : "lg:grid-cols-3"}`}>
        {list.map((a) => <section key={a.id} aria-labelledby={`b-${a.id}`} className="bg-surface border border-line rounded-xl overflow-hidden flex flex-col">
          <header className="px-5 py-4 border-b border-line bg-surface-2 flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg bg-brand text-white grid place-items-center flex-none" aria-hidden><svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={ICON[a.id]} /></svg></span>
            <span className="min-w-0"><h2 id={`b-${a.id}`} className="text-base font-medium leading-tight">For {a.name.toLowerCase()}</h2><span className="block text-xs text-ink-3">{a.tagline}</span></span>
          </header>
          <ol className={`divide-y divide-line ${only ? "md:grid md:grid-cols-2 md:divide-y-0 md:gap-x-8 md:px-5" : ""}`}>
            {a.benefits.map((b, i) => <li key={b.title} className={`flex gap-3 px-5 py-3.5 ${only ? "md:px-0 md:border-b md:border-line" : ""}`}>
              <span className={`w-6 h-6 rounded-full grid place-items-center text-xs font-bold flex-none mt-0.5 ${b.planned ? "border border-dashed border-line-2 text-ink-3" : "bg-surface-3 text-ink-2"}`}>{i + 1}</span>
              <span className="min-w-0"><b className="block text-sm leading-snug">{b.title}{b.planned && <span className="ml-2 align-middle text-xs font-medium uppercase tracking-[.06em] text-ink-3 border border-line-2 rounded px-1.5 py-px">Planned</span>}</b>
                <span className="block text-sm text-ink-2 leading-relaxed mt-0.5">{b.text}</span></span>
            </li>)}
          </ol>
        </section>)}
      </div>
      <p className="text-xs text-ink-3 mt-6">Written from what the platform does today. Items marked Planned are on the <a className="underline underline-offset-2" href="https://github.com/grzegorzwenc/UCP-next/blob/main/docs/spec/ROADMAP.md" target="_blank" rel="noopener noreferrer">roadmap</a>.</p>
    </div>
  </div>;
}
