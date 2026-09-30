"use client";
import { useEffect, useRef, useState } from "react";
import type { Block } from "@/lib/api/types";
import type { ResolvedEntities } from "@/lib/ucp/tokens";
import { RenderBlock, SiteChrome, AssetsContext, EntitiesContext } from "@/lib/blocks/Render";
import { ucpApi, repoApi, type PageComment } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { relativeTime } from "@/components/builder/VersionHistory";

type Props = {
  missing?: boolean; token?: string; open?: boolean; stage?: "review" | "bizreview"; stageLabel?: string; path?: string; title?: string; status?: string;
  market?: { name: string; flag: string; domain: string; route: string }; blocks?: Block[]; entities?: ResolvedEntities; assets?: Record<string, { data?: string; alt?: string; decorative?: boolean }>;
  comments?: PageComment[]; user?: { name: string } | null; mayApprove?: boolean;
};
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const stored = (): { name?: string; email?: string } => { if (typeof window === "undefined") return {}; try { return JSON.parse(localStorage.getItem("ucp-reviewer") ?? "{}"); } catch { return {}; } };

/** The 1:1 page, scaled down to the width available (like the builder canvas). */
function Preview({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null); const site = useRef<HTMLDivElement>(null); const [w, setW] = useState(0); const [h, setH] = useState(0);
  useEffect(() => { const b = box.current, s = site.current; if (!b || !s) return; const ro = new ResizeObserver(() => { setW(b.clientWidth); setH(s.offsetHeight); }); ro.observe(b); ro.observe(s); return () => ro.disconnect(); }, []);
  const fit = w ? Math.min(1, w / 1200) : 1;
  return <div ref={box} className="w-full"><div style={{ height: h ? h * fit : undefined }}><div ref={site} className="preview" style={{ width: 1200, transform: `scale(${fit})`, transformOrigin: "top left" }}>{children}</div></div></div>;
}

export function ReviewScreen(p: Props) {
  const [list, setList] = useState<PageComment[]>(p.comments ?? []); const [text, setText] = useState("");
  // a guest's name and e-mail are remembered in this browser for the next comment
  const [name, setName] = useState(() => stored().name ?? ""); const [email, setEmail] = useState(() => stored().email ?? ""); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState<string | null>(null);

  if (p.missing) return <main className="min-h-dvh grid place-items-center bg-bg p-6"><div className="max-w-md text-center"><img src="/hsbc-logo.svg" alt="HSBC" className="h-7 mx-auto mb-6" /><h1 className="text-xl font-semibold">This review link does not work</h1><p className="text-ink-3 text-[14px] mt-2">It may be mistyped or the page may have been deleted. Ask the person who sent it for a new link.</p></div></main>;

  const guest = !p.user; const canPost = p.open && text.trim() && (!guest || (name.trim() && MAIL.test(email.trim())));
  const post = async () => {
    if (!canPost || busy) return; setBusy(true); setErr(null);
    try { setList(await ucpApi.reviewComment(p.token!, { text, name, email })); setText(""); if (guest) try { localStorage.setItem("ucp-reviewer", JSON.stringify({ name, email })); } catch { /* ignore */ } }
    catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const approve = async () => {
    setBusy(true); setErr(null);
    try { await repoApi.updateContent(p.path!, { status: p.stage === "review" ? "reviewed" : "approved" }); setDone(p.stage === "review" ? "Marked as reviewed · the author sends it to the business review" : "Signed off · the page is ready to publish"); }
    catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const sorted = [...list].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.time.localeCompare(a.time));

  return <main className="min-h-dvh bg-bg grid grid-rows-[auto_1fr]">
    <header className="bg-[#0F1013] text-white px-4 md:px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <img src="/hsbc-logo-white.svg" alt="HSBC" className="h-6" />
      <div className="min-w-0 flex-1"><div className="text-[11px] uppercase tracking-[.1em] text-white/60">Review · {p.stageLabel}</div><b className="block truncate text-[15px]">{p.title}</b></div>
      <span className="text-[12.5px] text-white/70">{p.market!.flag} {p.market!.domain}{p.market!.route}</span>
      <Pill status={p.status!} />
    </header>
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] min-h-0">
      <section className="p-4 md:p-6 min-w-0" aria-label="Page preview">
        {!p.open && <p className="mb-3 text-[13px] bg-warn-soft text-warn rounded-md px-3 py-2">This {p.stageLabel?.toLowerCase()} is finished. You can still read the page and the comments.</p>}
        <div className="bg-white shadow-sm rounded-md overflow-hidden"><Preview><AssetsContext.Provider value={p.assets ?? {}}><EntitiesContext.Provider value={p.entities ?? {}}>
          <SiteChrome marketName={p.market!.name} crumbs={[p.title!]} device="desktop">{(p.blocks ?? []).filter((b) => !b.props.hidden).map((b) => <div key={b.id} className="cblk"><RenderBlock b={b} /></div>)}</SiteChrome>
        </EntitiesContext.Provider></AssetsContext.Provider></Preview></div>
      </section>
      <aside className="bg-surface border-t lg:border-t-0 lg:border-l border-line p-4 md:p-5 flex flex-col gap-3 lg:sticky lg:top-0 lg:h-[calc(100dvh-60px)] lg:overflow-auto" aria-label="Comments">
        {p.mayApprove && !done && <div className="rounded-lg border border-line bg-surface-2 p-3"><b className="block text-[13px]">Everything right?</b><p className="text-[12.5px] text-ink-3 mt-0.5">{p.stage === "review" ? "Marking it reviewed hands the page back to the author, who sends it to the business review." : "Signing off makes the page ready to publish."}</p>
          <button className="btn btn-primary btn-sm mt-2" disabled={busy} onClick={approve}>{p.stage === "review" ? "Reviewed" : "Sign off"}</button></div>}
        {done && <p role="status" className="text-[13px] bg-good-soft text-good rounded-md px-3 py-2">✓ {done}</p>}
        <h2 className="text-[15px] font-semibold">Comments <span className="text-ink-3 font-normal text-[13px]">{list.length || ""}</span></h2>
        {p.open ? <div className="border border-line-2 rounded-lg bg-surface focus-within:border-ink-3">
          {guest && <div className="grid grid-cols-2 gap-2 p-2 pb-0"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" suppressHydrationWarning className="border border-line-2 rounded-md px-2 py-1.5 text-[13px]" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your e-mail" aria-label="Your e-mail" suppressHydrationWarning className="border border-line-2 rounded-md px-2 py-1.5 text-[13px]" /></div>}
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="What should change on this page?" aria-label="Your comment" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void post(); } }} className="block w-full resize-y bg-transparent px-2.5 py-2 text-[13.5px] outline-none" />
          <div className="flex items-center gap-2 px-2 pb-2"><span className="text-[11px] text-ink-4">{p.user ? `Commenting as ${p.user.name}` : "Your name is shown with the comment"}</span><button className="btn btn-sm btn-primary ml-auto" disabled={!canPost || busy} onClick={post}>{busy ? "Posting…" : "Post comment"}</button></div>
        </div> : null}
        {err && <p className="text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded">{err}</p>}
        {!sorted.length ? <p className="text-[13px] text-ink-3">No comments yet.</p> : <ul className="grid gap-1.5">{sorted.map((c) => <li key={c.id} className={`rounded-lg border px-2.5 py-2 ${c.pinned ? "border-warn/40 bg-warn-soft/60" : "border-line"}`}>
          <div className="flex items-start gap-2"><Avatar name={c.whoName} size={24} /><div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 text-[12px]"><b className="font-semibold">{c.whoName}</b>{c.guest && <span className="text-[10.5px] rounded-full bg-surface-3 px-1.5 text-ink-3">guest</span>}<time className="text-ink-3" dateTime={c.time} suppressHydrationWarning>{relativeTime(c.time)}</time>{c.pinned && <span className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-warn">Pinned</span>}</div>
            {c.stage && <div className="text-[11px] text-info mt-0.5">During the {c.stage === "review" ? "author's review" : "business review"}</div>}
            <p className="mt-0.5 text-[13px] whitespace-pre-wrap break-words">{c.text}</p></div></div></li>)}</ul>}
      </aside>
    </div>
  </main>;
}
