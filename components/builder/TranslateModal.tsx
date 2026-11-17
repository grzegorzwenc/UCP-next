"use client";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ucpApi, ApiError } from "@/lib/api";
import { MARKETS, market as marketOf } from "@/lib/markets";
import { ModalShell, inputCls } from "@/components/models/ModalShell";

type Props = { marketId: string; path: string; title: string; onClose: () => void; onDone: (created: string[]) => void };

const errText = (e: unknown) => (e instanceof ApiError ? `${e.problem.title}${e.problem.detail ? ": " + e.problem.detail : ""} · request ${e.requestId ?? "n/a"}` : String(e));
const flagOf = (l: string) => MARKETS.find((m) => m.locales.includes(l))?.flag ?? "";
/* The shared dialog (components/models/ModalShell) rather than a local copy: that one is built on
   the shadcn Dialog, so this gets BDL's square panel, the blurred backdrop, a focus trap, a portal
   and Escape, instead of a bare `bg-black/45` div with its own close button. */

/** Translate one page into other languages. Same flow as the explorer's bulk translate, for a single page. */
export function TranslateModal({ marketId, path, title, onClose, onDone }: Props) {
  const params = useParams<{ env?: string }>();
  const mk = marketOf(marketId);
  const base = `/${mk.id}/${params?.env ?? "prod"}`;
  const rel = (p: string) => p.replace(mk.root, "");
  const name = path.split("/").pop() ?? "";
  const folder = path.replace(/\/[^/]+$/, "");
  const allLangs = [...new Set([...mk.locales, ...MARKETS.flatMap((m) => m.locales)])].filter((l) => l !== mk.locales[0]);
  const [langs, setLangs] = useState<string[]>(() => (mk.locales[1] ? [mk.locales[1]] : []));
  const [mode, setMode] = useState<"ai" | "vendor">("ai"); const [review, setReview] = useState(true);
  const [dest, setDest] = useState<"same" | "folder">("same"); const [destFolder, setDestFolder] = useState(folder);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [created, setCreated] = useState<string[] | null>(null);

  async function go() {
    setBusy(true); setErr(null);
    try { const r = await ucpApi.translate(marketId, { pages: [path], langs, review, dest: dest === "folder" ? destFolder : undefined, mode }); setCreated(r.created); onDone(r.created); }
    catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  }
  const steps = ["Read the source page", "Apply HSBC glossary and product names", `Translate copy to ${langs.join(", ") || "…"} ${mode === "ai" ? "(AI draft)" : "(sent to translation vendor)"}`, "Keep rates, links and regulatory text unchanged", `Create ${langs.length} draft${langs.length === 1 ? "" : "s"} in ${dest === "same" ? "the same folder" : "the chosen folder"}`, review ? "Send drafts for review" : "Leave as drafts"];

  if (created) return <ModalShell title="Translations created" width={560} onClose={onClose} footer={<><button className="btn btn-sm btn-secondary" onClick={onClose}>Close</button>{created[0] && <Link className="btn btn-sm btn-primary" href={`${base}/page${rel(created[0].replace(/ \(exists\)$/, ""))}`}>Open the first draft</Link>}</>}>
    <ul className="text-sm text-ink-2 grid gap-1">{steps.map((s) => <li key={s} className="flex gap-2"><Check className="size-3.5 shrink-0 text-good" strokeWidth={2} aria-hidden />{s}</li>)}</ul>
    <div className="mt-4 text-xs text-ink-3">Created {created.length} page{created.length === 1 ? "" : "s"}. Each draft links back to “{title}”.</div>
    <ul className="mt-2 grid gap-1 max-h-[220px] overflow-auto">{created.map((c) => { const p = c.replace(/ \(exists\)$/, ""); return <li key={c} className="flex items-center gap-2 text-sm"><Link href={`${base}/page${rel(p)}`} className="text-xs text-info hover:underline">{rel(p)}</Link>{c.endsWith("(exists)") && <span className="text-xs text-ink-3">already existed · skipped</span>}</li>; })}</ul>
  </ModalShell>;

  return <ModalShell title="Translate this page" onClose={onClose} footer={<><button className="btn btn-sm btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-sm btn-primary" disabled={!langs.length || busy} onClick={go}>{busy ? "Translating…" : `Translate into ${langs.length || "…"} language${langs.length === 1 ? "" : "s"}`}</button></>}>
    <div className="grid grid-cols-2 gap-x-5 gap-y-3">
      <div className="grid gap-3">
        <div className="text-xs text-ink-3">Page<div className="mt-1 border border-line rounded-md px-2.5 py-1.5 flex items-center justify-between gap-2 text-sm text-ink"><span className="truncate">{title}</span><span className="text-xs text-ink-3">{rel(path)}</span></div><div className="mt-1 text-xs text-ink-4">Source language {flagOf(mk.locales[0])} {mk.locales[0]}</div></div>
        <div className="text-xs text-ink-3">Target languages <span className="text-ink-4">pick one or more</span>
          <div className="mt-1 flex flex-wrap gap-1.5">{allLangs.map((l) => { const on = langs.includes(l); const home = mk.locales.includes(l); return <button type="button" key={l} className={`bdl-chip ${on ? "bdl-chip-active" : ""}`} aria-pressed={on} title={home ? `${mk.name} locale` : "Other HSBC market"} onClick={() => setLangs(on ? langs.filter((x) => x !== l) : [...langs, l])}>{on ? <Check className="size-3.5" strokeWidth={2} aria-hidden /> : null}{flagOf(l)} {l}</button>; })}</div>
          <div className="mt-1.5 text-xs">{langs.length} language{langs.length === 1 ? "" : "s"} × 1 page = <b className="text-ink">{langs.length}</b> translation{langs.length === 1 ? "" : "s"}</div></div>
        <div className="text-xs text-ink-3">How<div className="mt-1 flex gap-1.5"><button type="button" className={`bdl-chip ${mode === "ai" ? "bdl-chip-active" : ""}`} aria-pressed={mode === "ai"} onClick={() => setMode("ai")}><Sparkles className="size-3.5" strokeWidth={1.5} aria-hidden />AI draft now</button><button type="button" className={`bdl-chip ${mode === "vendor" ? "bdl-chip-active" : ""}`} aria-pressed={mode === "vendor"} onClick={() => setMode("vendor")}>Send to translation vendor</button></div></div>
      </div>
      <div className="grid gap-3 content-start">
        <div className="text-xs text-ink-3">Where should the translations live?<div className="mt-1 flex gap-1.5 mb-2"><button type="button" className={`bdl-chip ${dest === "same" ? "bdl-chip-active" : ""}`} aria-pressed={dest === "same"} onClick={() => setDest("same")}>Same folder as this page</button><button type="button" className={`bdl-chip ${dest === "folder" ? "bdl-chip-active" : ""}`} aria-pressed={dest === "folder"} onClick={() => setDest("folder")}>Pick a folder</button></div>
          {dest === "folder"
            ? <label className="block">Folder path<input className={inputCls} value={destFolder} onChange={(e) => setDestFolder(e.target.value)} placeholder={`${mk.root}/…`} spellCheck={false} /><span className="block mt-1 text-xs text-ink-4">Full repository path, e.g. <span>{mk.root}/borrowing</span>.</span></label>
            : <div className="text-xs leading-relaxed">Each translation is created next to this page as a variant per language, e.g. <span>{rel(path)}</span> → {langs.map((l) => <span key={l}>…/{l.split("-")[0]}-{name} </span>)}</div>}</div>
        <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} />Send translated pages straight to review</label>
        <div className="text-xs text-ink-3">Rates, product names, links and regulatory wording are kept as-is and flagged for a native reviewer.</div>
      </div>
    </div>
    <div className="mt-4 rounded-md bg-surface-2 px-3 py-2 text-xs text-ink-2"><b className="text-ink">What will happen</b><ul className="mt-1 grid gap-0.5 list-disc pl-4">{steps.map((s) => <li key={s}>{s}</li>)}</ul></div>
    {err && <div className="text-crit text-xs bg-crit-soft px-3 py-2 rounded mt-3">{err}</div>}
  </ModalShell>;
}
