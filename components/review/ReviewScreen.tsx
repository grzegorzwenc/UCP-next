"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Block } from "@/lib/api/types";
import type { ResolvedEntities } from "@/lib/ucp/tokens";
import { RenderBlock, SiteChrome, AssetsContext, EntitiesContext } from "@/lib/blocks/Render";
import { ucpApi, repoApi, type PageComment } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Pill";
import { relativeTime } from "@/components/builder/VersionHistory";
import { BlockChip } from "@/components/builder/PageComments";
import { FloatingPanel } from "./FloatingPanel";
import { BLOCK_BY_TYPE } from "@/lib/blocks/registry";
import { pickAt, flash, markTarget, type PickTarget } from "@/lib/review/pick";

type Props = {
  missing?: boolean; token?: string; open?: boolean; stage?: "review" | "bizreview"; stageLabel?: string; path?: string; title?: string; status?: string;
  market?: { name: string; flag: string; domain: string; route: string }; blocks?: Block[]; entities?: ResolvedEntities; assets?: Record<string, { data?: string; alt?: string; decorative?: boolean }>;
  comments?: PageComment[]; user?: { name: string } | null; mayApprove?: boolean;
};
const subWide = (cb: () => void) => { const m = window.matchMedia("(min-width: 1024px)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
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
  /* click a component on the page → the next comment is about it; the comments float over the page */
  const [target, setTarget] = useState<PickTarget | null>(null); const wide = useSyncExternalStore(subWide, () => window.matchMedia("(min-width: 1024px)").matches, () => true); const [openPref, setOpen] = useState<boolean | null>(null); const open = openPref ?? wide; // phones: folded until opened
  const pageRef = useRef<HTMLDivElement>(null); const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { markTarget(pageRef.current, target); }, [target]); // outline the picked text or image

  if (p.missing) return <main className="min-h-dvh grid place-items-center bg-bg p-6"><div className="max-w-md text-center"><img src="/hsbc-logo.svg" alt="HSBC" className="h-7 mx-auto mb-6" /><h1 className="text-xl font-semibold">This review link does not work</h1><p className="text-ink-3 text-[14px] mt-2">It may be mistyped or the page may have been deleted. Ask the person who sent it for a new link.</p></div></main>;

  const blockName = (id: string) => { const b = (p.blocks ?? []).find((x) => x.id === id); return (b && BLOCK_BY_TYPE[b.type]?.name) || "Component"; };
  /* like Build the page, nothing editable: a click picks the text, the image or the component the next comment is about */
  const pick = (e: React.MouseEvent) => { if (!p.open) return; const t = pickAt(e.target as HTMLElement, blockName); if (!t) return; e.preventDefault(); setTarget(t); setOpen(true); setTimeout(() => box.current?.focus(), 0); };
  const show = (r: { id: string; field?: string }) => { flash(pageRef.current, r); };
  const counts: Record<string, number> = {}; for (const c of list) if (c.block) counts[c.block.id] = (counts[c.block.id] ?? 0) + 1;
  const guest = !p.user; const canPost = p.open && text.trim() && (!guest || (name.trim() && MAIL.test(email.trim())));
  const post = async () => {
    if (!canPost || busy) return; setBusy(true); setErr(null);
    try { setList(await ucpApi.reviewComment(p.token!, { text, name, email, block: target ?? undefined })); setText(""); setTarget(null); if (guest) try { localStorage.setItem("ucp-reviewer", JSON.stringify({ name, email })); } catch { /* ignore */ } }
    catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const approve = async () => {
    setBusy(true); setErr(null);
    try { await repoApi.updateContent(p.path!, { status: "approved" }); setDone("Signed off · the page is ready to publish"); }
    catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  /* author's review done: on to the business review, or back to the author (Reauthor) */
  const decide = async (to: "bizreview" | "draft") => {
    setBusy(true); setErr(null);
    try {
      if (to === "bizreview") { if (p.status !== "reviewed") await repoApi.updateContent(p.path!, { status: "reviewed" }); await repoApi.updateContent(p.path!, { status: "bizreview" }); setDone("Sent to business review · it waits for a business reviewer"); }
      else { if (p.status === "review") await repoApi.updateContent(p.path!, { status: "inreview" }); await repoApi.updateContent(p.path!, { status: "draft" }); setDone("Sent back to the author · the page is at Build the page again"); }
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const sorted = [...list].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.time.localeCompare(a.time));

  return <main className="min-h-dvh bg-bg">
    <header className="bg-[#0F1013] text-white px-4 md:px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <img src="/hsbc-logo-white.svg" alt="HSBC" className="h-6" />
      <div className="min-w-0 flex-1"><div className="text-[11px] uppercase tracking-[.1em] text-white/60">Review · {p.stageLabel}</div><b className="block truncate text-[15px]">{p.title}</b></div>
      <span className="text-[12.5px] text-white/70">{p.market!.flag} {p.market!.domain}{p.market!.route}</span>
      <Pill status={p.status!} />
    </header>
    <section className="p-3 md:p-6 lg:pr-[412px] min-w-0" aria-label="Page preview">
      {!p.open && <p className="mb-3 text-[13px] bg-warn-soft text-warn rounded-md px-3 py-2">This {p.stageLabel?.toLowerCase()} is finished. You can still read the page and the comments.</p>}
      <div ref={pageRef} onClick={pick} className={`bg-white shadow-sm rounded-md overflow-hidden ${p.open ? "review-pick" : ""}`}><Preview><AssetsContext.Provider value={p.assets ?? {}}><EntitiesContext.Provider value={p.entities ?? {}}>
        <SiteChrome marketName={p.market!.name} crumbs={[p.title!]} device="desktop">{(p.blocks ?? []).filter((b) => !b.props.hidden).map((b) => <div key={b.id} data-id={b.id} className={`cblk ${target?.id === b.id && !target.field ? "cmt-target" : ""}`}>
          {p.open && <span className="cmt-pick" aria-hidden>{target?.id === b.id ? "Commenting here" : "Click a text or image to comment"}</span>}
          {!!counts[b.id] && <span className="cmt-badge" title={`${counts[b.id]} comment${counts[b.id] === 1 ? "" : "s"}`}>{counts[b.id]}</span>}
          <RenderBlock b={b} /></div>)}</SiteChrome>
      </EntitiesContext.Provider></AssetsContext.Provider></Preview></div>
    </section>
    <FloatingPanel title="Comments" count={list.length} open={open} onToggle={setOpen} top={76} hint={p.open && !target ? "Click a text, an image or a component on the page to comment on it." : undefined}>
      <div className="flex flex-col gap-3 min-w-0">
        {p.mayApprove && !done && <div className="rounded-lg border border-line bg-surface-2 p-3"><b className="block text-[13px]">Everything right?</b><p className="text-[12.5px] text-ink-3 mt-0.5">{p.stage === "review" ? "Send it on to the business review, or back to the author if something needs changing." : "Signing off makes the page ready to publish."}</p>
          {p.stage === "review" ? <div className="flex flex-wrap gap-2 mt-2"><button className="btn btn-next btn-sm" disabled={busy} onClick={() => void decide("bizreview")}>Send to business review</button><button className="btn btn-sm" disabled={busy} onClick={() => void decide("draft")}>Reauthor</button></div>
            : <button className="btn btn-next btn-sm mt-2" disabled={busy} onClick={approve}>Sign off</button>}</div>}
        {done && <p role="status" className="text-[13px] bg-good-soft text-good rounded-md px-3 py-2">✓ {done}</p>}
        {p.open ? <div className="border border-line-2 rounded-lg bg-surface focus-within:border-ink-3">
          {target && <div className="flex items-center gap-2 px-2.5 pt-2 text-[11.5px]"><span className="text-ink-3 flex-none">About</span><BlockChip block={target} onShow={show} /><button type="button" className="text-ink-3 hover:text-ink flex-none" onClick={() => setTarget(null)} aria-label="Not about a component">✕</button></div>}
          {guest && <div className="grid grid-cols-2 gap-2 p-2 pb-0"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" aria-label="Your name" suppressHydrationWarning className="border border-line-2 rounded-md px-2 py-1.5 text-[13px]" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your e-mail" aria-label="Your e-mail" suppressHydrationWarning className="border border-line-2 rounded-md px-2 py-1.5 text-[13px]" /></div>}
          <textarea ref={box} rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder={target ? `What should change in ${target.label}?` : "Click a component on the page, or write a general comment…"} aria-label="Your comment" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void post(); } }} className="block w-full resize-y bg-transparent px-2.5 py-2 text-[13.5px] outline-none" />
          <div className="flex items-center gap-2 px-2 pb-2"><span className="text-[11px] text-ink-4">{p.user ? `Commenting as ${p.user.name}` : "Your name is shown with the comment"}</span><button className="btn btn-sm btn-primary ml-auto" disabled={!canPost || busy} onClick={post}>{busy ? "Posting…" : "Post comment"}</button></div>
        </div> : null}
        {err && <p className="text-crit text-[12.5px] bg-crit-soft px-3 py-2 rounded">{err}</p>}
        {!sorted.length ? <p className="text-[13px] text-ink-3">No comments yet.</p> : <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">{sorted.map((c) => <li key={c.id} className={`min-w-0 rounded-lg border px-2.5 py-2 ${c.pinned ? "border-warn/40 bg-warn-soft/60" : "border-line"}`}>
          <div className="flex items-start gap-2"><Avatar name={c.whoName} size={24} /><div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 text-[12px]"><b className="font-semibold">{c.whoName}</b>{c.guest && <span className="text-[10.5px] rounded-full bg-surface-3 px-1.5 text-ink-3">guest</span>}<time className="text-ink-3" dateTime={c.time} suppressHydrationWarning>{relativeTime(c.time)}</time>{c.pinned && <span className="text-[10.5px] font-semibold uppercase tracking-[.06em] text-warn">Pinned</span>}</div>
            {c.block && <div className="mt-1"><BlockChip block={c.block} onShow={show} /></div>}
            {c.stage && <div className="text-[11px] text-info mt-0.5">During the {c.stage === "review" ? "author's review" : "business review"}</div>}
            <p className="mt-0.5 text-[13px] whitespace-pre-wrap break-words">{c.text}</p></div></div></li>)}</ul>}
      </div>
    </FloatingPanel>
  </main>;
}
