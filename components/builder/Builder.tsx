"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Block, PageView, PageStatus } from "@/lib/api/types";
import { repoApi, ucpApi, ApiError } from "@/lib/api";
import { blocksToComponents, componentsToBlocks } from "@/lib/repo/mapping";
import { BLOCKS, BLOCK_BY_TYPE, GROUPS, makeBlock, lines, joinLines, missingRequired, TEMPLATES } from "@/lib/blocks/registry";
import { RenderBlock, SiteChrome, AssetsContext } from "@/lib/blocks/Render";
import { AssetPicker } from "./AssetPicker";
import { Pill } from "@/components/ui/Pill";
import { proposeAi, AI_SUGGESTIONS, type AiProposal } from "@/lib/ai/mock";
import { planFor, revertOp, AI_PAGE_SUGGESTIONS, type Plan, type Change } from "@/lib/ai/planner";
import { useSession } from "@/components/shell/Session";
import { InsightsPanel, VersionHistory, TranslateModal } from "@/components/builder";
import { useRouter } from "next/navigation";
import { permForStatus } from "@/lib/ucp/perms";

type Props = { marketId: string; envId: string; marketName: string; flag: string; domain: string; locale: string; envName: string; root: string; page: PageView };
type PageField = "description" | "title";
/** One page-level AI task: prompt → plan → run → review. `results` keeps the snapshot around each op so it can be undone alone. */
type AiResult = { before: Block[]; after: Block[]; changes: Change[]; undone: boolean; pageBefore?: string };
type AiTask = { id: number; prompt: string; plan: Plan; stage: "understanding" | "plan" | "executing" | "done"; on: Record<string, boolean>; done: string[]; results: Record<string, AiResult> };
const READ_ONLY = "Read-only: you don't have Edit on this folder. Ask a site admin to grant it.";
const STEPS = [["Add blocks", "Click: open Components"], ["Fill in content", "Click: jump to next empty field"], ["Preview", "Click: toggle visitor view"], ["Send for review", "Click: send to a reviewer"], ["In review", "Click: approve (reviewers)"], ["Publish", "Click: put it live"], ["Published", "Live for customers"]];

/**
 * Interaction model (three levels):
 *   hover        → subtle outline + component name
 *   click        → select; contextual toolbar appears at the block: ✎ Edit · ⚙ Configure · ✨ AI · ⋯ More
 *   double-click → straight into inline edit
 * Edit never opens the right panel; Configure does (with Cancel / Save).
 */
export function Builder({ marketId, envId, marketName, flag, domain, locale, envName, root, page }: Props) {
  const { can } = useSession();
  const canEdit = can("edit", page.path); const mayStatus = (s: PageStatus) => can(permForStatus[s], page.path);
  const [blocks, setBlocks] = useState<Block[]>(() => componentsToBlocks(page.components));
  const [status, setStatus] = useState<PageStatus>(page.status);
  const [title, setTitle] = useState(page.title);
  const [sel, setSel] = useState<string | null>(null);
  const [mode, setMode] = useState<"select" | "edit">("select");
  const [pop, setPop] = useState<"ai" | "more" | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [preview, setPreviewRaw] = useState(!canEdit); const setPreview = (v: boolean | ((p: boolean) => boolean)) => { if (!canEdit) return; setPreviewRaw(v); };
  const [left, setLeft] = useState(true); const [right, setRight] = useState(false);
  const [rightTab, setRightTab] = useState<"block" | "page" | "ai" | "insights" | "history">("page");
  const [translating, setTranslating] = useState(false); const router = useRouter();
  const [description, setDescription] = useState(page.description ?? "");
  const [aiTasks, setAiTasks] = useState<AiTask[]>([]); const [aiBar, setAiBar] = useState(false); const [aiDraft, setAiDraft] = useState("");
  const [focus, setFocus] = useState(false);
  const [cfgSnapshot, setCfgSnapshot] = useState<Record<string, unknown> | null>(null);
  const [clipboard, setClipboard] = useState<Block | null>(null);
  const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState<string>("Saved");
  const [toast, setToast] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const rel = page.path.replace(root, "");
  const selected = blocks.find((b) => b.id === sel);
  const missing = useMemo(() => blocks.reduce((n, b) => n + missingRequired(b).length, 0), [blocks]);
  const cur = status === "published" ? 6 : status === "approved" || status === "scheduled" ? 5 : status === "review" ? 4 : blocks.length && !missing ? 2 : blocks.length ? 1 : 0;
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const mutate = useCallback((fn: (b: Block[]) => Block[]) => { setBlocks((b) => fn(b)); setDirty(true); setSaving("Unsaved"); }, []);
  const setProp = (id: string, k: string, v: unknown) => mutate((b) => b.map((x) => (x.id === id ? { ...x, props: { ...x.props, [k]: v } } : x)));
  const select = (id: string | null) => { setSel(id); setMode("select"); setPop(null); if (id && right && rightTab === "block") setCfgSnapshot(blocks.find((b) => b.id === id)?.props ?? null); };
  const add = (type: string) => { const nb = makeBlock(type); mutate((b) => { const i = sel ? b.findIndex((x) => x.id === sel) + 1 : b.length; const c = b.slice(); c.splice(i, 0, nb); return c; }); select(nb.id); say(`${BLOCK_BY_TYPE[type].name} added · click ✎ Edit to fill it in`); };
  const move = (id: string, d: number) => mutate((b) => { const i = b.findIndex((x) => x.id === id); const j = i + d; if (j < 0 || j >= b.length) return b; const c = b.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; });
  const remove = (id: string) => { mutate((b) => b.filter((x) => x.id !== id)); select(null); };
  const duplicate = (b: Block) => mutate((bl) => { const i = bl.findIndex((x) => x.id === b.id); const c = bl.slice(); c.splice(i + 1, 0, { ...b, id: makeBlock(b.type).id, props: { ...b.props } }); return c; });
  const configure = (id: string) => { setSel(id); setMode("select"); setPop(null); setRightTab("block"); setRight(true); setCfgSnapshot(blocks.find((b) => b.id === id)?.props ?? null); };
  const closeConfigure = (keep: boolean) => { if (!keep && sel && cfgSnapshot) mutate((b) => b.map((x) => (x.id === sel ? { ...x, props: cfgSnapshot } : x))); setCfgSnapshot(null); setRight(false); };
  /* Latest values for timers and async work (the AI run applies ops 300 ms apart and must see its own previous result). */
  const blocksRef = useRef(blocks); const titleRef = useRef(title); const descRef = useRef(description); const taskSeq = useRef(0);
  useEffect(() => { blocksRef.current = blocks; titleRef.current = title; descRef.current = description; });
  const setPageField = (k: PageField, v: string) => { if (k === "title") setTitle(v); else setDescription(v); setDirty(true); setSaving("Unsaved"); };

  /* ---- Agentic AI (page level): Understanding → Plan → Executing → Review → Done. Ops come from lib/ai/planner (deterministic, offline). ---- */
  const patchTask = (id: number, fn: (t: AiTask) => AiTask) => setAiTasks((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));
  function startAiTask(prompt: string) {
    const p = prompt.trim(); if (!p) return;
    if (!canEdit) { say(READ_ONLY); return; }
    const plan = planFor(p, blocksRef.current, { title: titleRef.current, template: page.template, status, locale, description: descRef.current });
    const id = ++taskSeq.current;
    setAiTasks((ts) => [...ts, { id, prompt: p, plan, stage: "understanding", on: Object.fromEntries(plan.ops.map((o) => [o.id, true])), done: [], results: {} }]);
    setAiBar(false); setAiDraft(""); setSel(null); setPop(null); setPreviewRaw(false); setRightTab("ai"); setRight(true);
    setTimeout(() => patchTask(id, (t) => (t.stage === "understanding" ? { ...t, stage: "plan" } : t)), 700);
  }
  function runAiTask(task: AiTask) {
    const ops = task.plan.ops.filter((o) => task.on[o.id]);
    patchTask(task.id, (t) => ({ ...t, stage: ops.length ? "executing" : "done", done: [], results: {} }));
    ops.forEach((op, i) => setTimeout(() => {
      const before = blocksRef.current; const after = op.apply(before); blocksRef.current = after; let pageBefore: string | undefined;
      if (op.page) { pageBefore = op.page.key === "title" ? titleRef.current : descRef.current; setPageField(op.page.key, op.page.value); }
      if (after !== before) mutate(() => after);
      patchTask(task.id, (t) => ({ ...t, done: [...t.done, op.id], results: { ...t.results, [op.id]: { before, after, changes: op.describe(before, after), undone: false, pageBefore } } }));
      if (i === ops.length - 1) { patchTask(task.id, (t) => ({ ...t, stage: "done" })); say("Done. Review the changes on the right, then Save."); ucpApi.logEvent(marketId, { type: "content", text: `AI: ${task.plan.title} (${ops.length} change${ops.length === 1 ? "" : "s"}) on ${titleRef.current}`, target: page.path }).catch(() => {}); }
    }, 300 * (i + 1)));
  }
  function undoAiOp(task: AiTask, opId: string) {
    const r = task.results[opId]; const op = task.plan.ops.find((o) => o.id === opId); if (!r || !op || r.undone) return;
    if (op.page) setPageField(op.page.key, r.pageBefore ?? "");
    if (r.after !== r.before) mutate((b) => revertOp(b, r.before, r.after));
    patchTask(task.id, (t) => ({ ...t, results: { ...t.results, [opId]: { ...t.results[opId], undone: true } } }));
  }
  function redoAiOp(task: AiTask, opId: string) {
    const r = task.results[opId]; const op = task.plan.ops.find((o) => o.id === opId); if (!r || !op || !r.undone) return;
    const before = blocksRef.current; const after = op.apply(before); let pageBefore: string | undefined;
    if (op.page) { pageBefore = op.page.key === "title" ? titleRef.current : descRef.current; setPageField(op.page.key, op.page.value); }
    if (after !== before) mutate(() => after);
    patchTask(task.id, (t) => ({ ...t, results: { ...t.results, [opId]: { before, after, changes: op.describe(before, after), undone: false, pageBefore } } }));
  }
  const undoAllAi = (task: AiTask) => { task.done.slice().reverse().forEach((id) => undoAiOp(task, id)); say("Changes undone"); };

  /* ---- Focus mode (⌘⇧F): body.focus hides the top bar and side nav (CSS in globals.css); other parts of the shell can listen to ucp:focus. ---- */
  const setFocusMode = (on: boolean) => { setFocus(on); document.body.classList.toggle("focus", on); window.dispatchEvent(new CustomEvent("ucp:focus", { detail: { on } })); };
  useEffect(() => () => { document.body.classList.remove("focus"); }, []);

  async function save(extra: { status?: PageStatus } = {}) {
    setSaving("Saving…");
    try { await repoApi.saveComponents(page.path, blocksToComponents(blocksRef.current)); await repoApi.updateContent(page.path, { title: titleRef.current, description: descRef.current, status, ...extra }); setDirty(false); setSaving("Saved just now"); }
    catch (e) { setSaving("Save failed"); say(e instanceof ApiError ? `${e.problem.title} · request ${e.requestId ?? "n/a"}` : String(e)); throw e; }
  }
  async function transition(next: PageStatus, msg: string) {
    if (!mayStatus(next)) { say(`You don't have ${permForStatus[next] === "publish" ? "Publish" : permForStatus[next] === "review" ? "Review & approve" : "Edit"} on this folder`); return; }
    if (next === "review" && missing) { say(`Fill in ${missing} required field${missing === 1 ? "" : "s"} first`); const b = blocks.find((x) => missingRequired(x).length); if (b) configure(b.id); return; }
    setStatus(next); try { await save({ status: next }); say(msg); } catch { setStatus(status); }
  }
  const [aiSeed, setAiSeed] = useState("");
  /* Pictures for the canvas: asset id → data URL. Re-read when a block points at an asset we do not know yet (e.g. just uploaded from the picker). */
  const [assetMap, setAssetMap] = useState<Record<string, { data?: string }>>({});
  const imageKey = blocks.map((b) => b.props.image).filter((x) => typeof x === "string" && x && !(x in assetMap)).join(",");
  useEffect(() => { let on = true; ucpApi.assets(marketId).then((as) => { if (on) setAssetMap(Object.fromEntries(as.map((a) => [a.id, { data: a.data }]))); }).catch(() => {}); return () => { on = false; }; }, [marketId, imageKey]);

  /* ---- inline editing (only in Edit mode): click a text, Enter/✓ saves, Esc/✕ cancels ---- */
  const [editing, setEditing] = useState<{ key: string; original: string } | null>(null); const editingEl = useRef<HTMLElement | null>(null); // the live element stays out of state (mutated in place)
  const [ctaPop, setCtaPop] = useState<{ id: string; labelKey: string; linkKey?: string } | null>(null);
  const scrollGuard = useRef<(() => void) | null>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save().catch(() => {}); return; }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") { e.preventDefault(); setFocusMode(!focus); return; }
      if (e.key === "Escape") { if (aiBar) setAiBar(false); else if (focus && !editing && !pop && !ctaPop) setFocusMode(false); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });
  /* Command palette (⌘K) talks to the builder through window events. ucp:ai is block-scoped while a block is selected, page-level otherwise. */
  useEffect(() => {
    const onAdd = (e: Event) => { const t = (e as CustomEvent<{ type: string }>).detail?.type; if (t && BLOCK_BY_TYPE[t]) add(t); };
    const onAi = (e: Event) => { const prompt = (e as CustomEvent<{ prompt: string }>).detail?.prompt ?? ""; if (!canEdit) { say(READ_ONLY); return; } if (!sel) { if (prompt.trim()) startAiTask(prompt); else setAiBar(true); return; } setMode("select"); setPop("ai"); setAiSeed(prompt); };
    window.addEventListener("ucp:add-block", onAdd); window.addEventListener("ucp:ai", onAi);
    return () => { window.removeEventListener("ucp:add-block", onAdd); window.removeEventListener("ucp:ai", onAi); };
  });
  function startInline(ie: HTMLElement) {
    ie.contentEditable = "true"; ie.classList.add("editing"); ie.focus({ preventScroll: true }); editingEl.current = ie; setEditing({ key: ie.dataset.inline!, original: ie.innerText });
    // the caret must never drag the 1:1 canvas sideways while typing
    const c = canvasRef.current; if (c) { const left = c.scrollLeft; const h = () => { if (c.scrollLeft !== left) c.scrollLeft = left; }; c.addEventListener("scroll", h); scrollGuard.current = () => c.removeEventListener("scroll", h); }
  }
  function commitInline(save: boolean) {
    const el = editingEl.current; if (!editing || !el) return; const { key, original } = editing; editingEl.current = null; el.contentEditable = "false"; el.classList.remove("editing"); scrollGuard.current?.(); scrollGuard.current = null;
    if (!save) { el.innerText = original; setEditing(null); return; }
    const [id, f, r, c] = key.split("|"); const v = el.innerText.replace(/\n+$/, "").replace(/\|/g, "/");
    const b = blocks.find((x) => x.id === id); if (!b) { setEditing(null); return; }
    if (r === undefined) setProp(id, f, v);
    else if (r === "p") { const paras = String(b.props[f] ?? "").split(/\n\s*\n/); paras[Number(c)] = v; setProp(id, f, paras.join("\n\n")); }
    else { const rows = lines(b.props[f]); if (rows[Number(r)]) { rows[Number(r)][Number(c)] = v; setProp(id, f, joinLines(rows)); } }
    setEditing(null);
  }
  function enterEdit(id: string, target?: HTMLElement) {
    const b = blocks.find((x) => x.id === id); if (!b || b.props.locked) { say("This block is locked. Unlock it from ⋯ More."); return; }
    setSel(id); setMode("edit"); setPop(null);
    const ie = target?.closest<HTMLElement>(".ie") ?? canvasRef.current?.querySelector<HTMLElement>(`.cblk[data-id="${id}"] .ie`) ?? undefined;
    if (ie) setTimeout(() => startInline(ie), 0);
  }
  function onCanvasClick(e: React.MouseEvent) {
    if (preview) return;
    const t = e.target as HTMLElement; if (t.closest("[data-ui]")) return;
    const blk = t.closest<HTMLElement>(".cblk"); if (!blk) { if (editing) commitInline(true); select(null); return; }
    const id = blk.dataset.id!; const ie = t.closest<HTMLElement>(".ie");
    if (t.closest("a, summary, .s-cta")) e.preventDefault();
    if (id !== sel) { if (editing) commitInline(true); select(id); return; }
    if (mode !== "edit") return;
    if (ie && !editing) { e.preventDefault(); const cta = t.closest(".s-cta"); const b = blocks.find((x) => x.id === id)!; const hasLink = BLOCK_BY_TYPE[b.type].fields.some((f) => f.k === "link");
      if (cta && hasLink && !ie.dataset.inline!.includes("|")) { setCtaPop({ id, labelKey: ie.dataset.inline!.split("|")[1], linkKey: "link" }); return; }
      startInline(ie); return; }
    if (editing && !ie) commitInline(true);
  }
  function onCanvasDouble(e: React.MouseEvent) { if (preview) return; const t = e.target as HTMLElement; if (t.closest("[data-ui]")) return; const blk = t.closest<HTMLElement>(".cblk"); if (!blk) return; if (editing) commitInline(true); enterEdit(blk.dataset.id!, t); }
  function onCanvasKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); if (editing) commitInline(false); else if (ctaPop || pop) { setCtaPop(null); setPop(null); } else if (mode === "edit") setMode("select"); else select(null); return; }
    if (!editing) return;
    if (e.key === "Enter" && !e.shiftKey && !editing.key.includes("|p|")) { e.preventDefault(); commitInline(true); say("Saved"); }
  }

  const nextTxt = cur === 0 ? "Add your first block from Components" : cur === 1 ? `Fill in ${missing} required field${missing === 1 ? "" : "s"}` : cur === 2 ? "Check the preview, then send for review" : cur === 4 ? "Waiting for a reviewer" : cur === 5 ? "Approved. Publish when ready" : `Live on ${domain}`;
  const flowClick = (i: number) => {
    if (i <= 2 && cur >= 4) { if (confirm("Reopen this page as a draft?")) transition("draft", "Back to draft"); return; }
    if (i === 0) { setPreview(false); setLeft(true); return; }
    if (i === 1) { setPreview(false); const b = blocks.find((x) => missingRequired(x).length) || blocks[0]; if (b) enterEdit(b.id); return; }
    if (i === 2) { setPreview((p) => !p); select(null); return; }
    if (i === 3) { if (status === "draft" || status === "failed") transition("review", "Sent for review"); return; }
    if (i === 4) { if (status === "review") transition("approved", "Approved"); return; }
    if (i === 5) { if (status === "approved" || status === "scheduled") transition("published", `Published to ${envName}`); return; }
  };
  const filtered = BLOCKS.filter((b) => !q || b.name.toLowerCase().includes(q.toLowerCase()));
  const padL = left && !preview ? 344 : 24, padR = right && !preview ? 364 : 24;
  const hint = !canEdit ? "Read-only: you don't have Edit on this folder. Ask a site admin to grant it." : preview ? "Preview: exactly what visitors will see" : mode === "edit" ? "Edit mode: click any highlighted text to change it. Enter saves, Esc cancels." : sel ? "Use the toolbar on the block: ✎ Edit text in place · ⚙ Configure everything · ✨ AI · ⋯ More" : "Hover to see block names. Click a block to select it, double-click to edit its text.";

  return (
    <div className="h-full grid grid-rows-[54px_48px_1fr] min-w-0 overflow-hidden">
      {/* Toolbar (docked) */}
      <div className="flex items-center gap-3 px-2.5 bg-surface border-b border-line overflow-hidden">
        <Link href={`/${marketId}/${envId}/pages${rel.replace(/\/[^/]+$/, "")}`} className="btn btn-quiet btn-sm">‹ Pages</Link>
        <div className="min-w-0 flex-1"><b className="block text-[14.5px] truncate">{title}</b><span className="block text-[11.5px] text-ink-3 truncate font-mono">{flag} {locale} · {domain}{rel}</span></div>
        <Pill status={status} />
        <div className="inline-flex border border-line-2 rounded-lg overflow-hidden">{(["desktop", "tablet", "mobile"] as const).map((d) => <button key={d} onClick={() => setDevice(d)} className={`px-2.5 h-8 text-[13px] ${device === d ? "bg-ink text-white" : "text-ink-3"}`} title={d}>{d === "desktop" ? "🖥" : d === "tablet" ? "▭" : "📱"}</button>)}</div>
        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-xs text-ink-3 bg-surface-2 rounded-full px-2.5 py-1">{saving}</span>
          <div className="flex gap-1 pl-2.5 border-l border-line"><button className={`btn btn-icon btn-sm ${left ? "on" : ""}`} onClick={() => setLeft(!left)} title="Components panel" aria-pressed={left}>▤</button><button className={`btn btn-icon btn-sm ${right ? "on" : ""}`} onClick={() => { if (right) closeConfigure(true); else { setRightTab(sel ? "block" : "page"); setRight(true); } }} title="Page settings panel" aria-pressed={right}>▥</button><button className={`btn btn-sm ${focus ? "on" : ""}`} onClick={() => setFocusMode(!focus)} title="Focus mode: hide the navigation (⌘⇧F)" aria-pressed={focus}>Focus</button></div>
          <div className="flex gap-1 pl-2.5 border-l border-line">{canEdit ? <button className="btn btn-sm" onClick={() => { setPreview(!preview); select(null); }}>{preview ? "Edit" : "Preview"}</button> : <span className="text-xs text-ink-3 px-2" title="Ask a site admin for Edit on this folder">🔒 Read-only</span>}<button className="btn btn-sm" onClick={() => save().then(() => say("Saved")).catch(() => {})} disabled={!dirty || !canEdit}>Save</button>
            {(status === "draft" || status === "failed") && mayStatus("review") && <button className="btn btn-sm btn-primary" onClick={() => transition("review", "Sent for review")}>Send for review</button>}
            {status === "review" && (mayStatus("approved") ? <button className="btn btn-sm btn-primary" onClick={() => transition("approved", "Approved")}>Approve</button> : <span className="text-xs text-ink-3">Waiting for a reviewer</span>)}
            {(status === "approved" || status === "scheduled") && (mayStatus("published") ? <button className="btn btn-sm btn-primary" onClick={() => transition("published", `Published to ${envName}`)}>Publish</button> : <span className="text-xs text-ink-3">Waiting for a publisher</span>)}
            {status === "published" && mayStatus("draft") && <button className="btn btn-sm" onClick={() => transition("draft", "New draft")}>New draft</button>}</div>
        </div>
      </div>
      {/* Flow stepper */}
      <div className="flex items-center px-4 bg-surface border-b border-line overflow-hidden" role="list" aria-label="Page progress">
        <div className="flex-1 min-w-0 flex items-center overflow-x-auto h-12">
          {STEPS.map((s, i) => { const done = i < cur || (cur === 6 && i === 6); const on = i === cur && cur !== 6; return <div key={s[0]} role="listitem" className="flex items-center flex-none">
            <button onClick={() => flowClick(i)} className={`flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-3 text-[12.5px] ${on ? "text-ink font-semibold" : "text-ink-3"}`} title={s[1]}><i className={`w-6 h-6 rounded-full border-2 grid place-items-center not-italic text-[11px] font-bold ${done ? "bg-good border-good text-white" : on ? "bg-accent border-accent text-white shadow-[0_0_0_3px_var(--accent-soft)]" : "border-line-2"}`}>{done ? "✓" : i + 1}</i><span className="leading-tight">{s[0]}{on && <small className="block text-[10.5px] text-ink-3 font-normal">{s[1]}</small>}</span></button>
            {i < STEPS.length - 1 && <span className={`w-7 h-0.5 mx-1 ${i < cur ? "bg-good" : "bg-line"}`} />}</div>; })}
        </div>
        <div className="flex-none max-w-[38%] flex items-center gap-2 pl-3.5 border-l border-line text-[12.5px] text-ink-3 whitespace-nowrap overflow-hidden"><span className="text-[10.5px] tracking-[.08em] uppercase text-accent font-bold">Next</span><b className="text-ink truncate">{nextTxt}</b></div>
      </div>
      {/* Body */}
      <div className="relative min-h-0 overflow-hidden bg-bg">
        <div className={`absolute inset-0 flex flex-col ${preview ? "preview" : ""}`}>
          <div className="flex items-center gap-3 px-6 py-2 text-[12.5px] text-ink-3 border-b border-line bg-surface-2" style={{ paddingLeft: padL, paddingRight: padR }}><span className="mr-auto">{hint}</span><span className="border border-line-2 rounded px-2 py-0.5 bg-surface">1:1 · {device === "desktop" ? 1200 : device === "tablet" ? 768 : 390} px</span></div>
          <div ref={canvasRef} className="flex-1 overflow-auto p-6 pb-24" style={{ paddingLeft: padL, paddingRight: padR }} onClick={onCanvasClick} onDoubleClick={onCanvasDouble} onKeyDown={onCanvasKey}>
            <AssetsContext.Provider value={assetMap}><SiteChrome marketName={marketName} crumbs={[...rel.split("/").filter(Boolean).slice(0, -1), title]} device={device}>
              {blocks.length ? blocks.map((b, i) => { const isSel = sel === b.id; const def = BLOCK_BY_TYPE[b.type]; return <div key={b.id} data-id={b.id} className={`cblk ${isSel ? "sel" : ""} ${isSel && mode === "edit" ? "editmode" : ""} ${b.props.hidden ? "hidden-blk" : ""} ${b.props.locked ? "locked" : ""}`} tabIndex={0}>
                <span className="tag">{def.name}{b.props.locked ? " · 🔒 locked" : ""}{b.props.hidden ? " · hidden" : ""}</span>
                {isSel && !preview && <ContextBar block={b} index={i} count={blocks.length} mode={mode} pop={pop} setPop={setPop} clipboard={clipboard} aiSeed={aiSeed}
                  onEdit={() => (mode === "edit" ? (commitInline(true), setMode("select")) : enterEdit(b.id))} onConfigure={() => configure(b.id)}
                  onMore={(a) => { setPop(null); if (a === "duplicate") duplicate(b); else if (a === "copy") { setClipboard(b); say("Copied"); } else if (a === "paste" && clipboard) { mutate((bl) => { const c = bl.slice(); c.splice(i + 1, 0, { ...clipboard, id: makeBlock(clipboard.type).id, props: { ...clipboard.props } }); return c; }); } else if (a === "up") move(b.id, -1); else if (a === "down") move(b.id, 1); else if (a === "hide") setProp(b.id, "hidden", !b.props.hidden); else if (a === "lock") { setProp(b.id, "locked", !b.props.locked); if (!b.props.locked) setMode("select"); } else if (a === "delete") remove(b.id); else if (a === "usage") say(`Used on 1 page: ${title}`); else if (a === "history") say("Version history comes from JCR (jcr:versionHistory) once the Sling backend is connected"); }}
                  onAi={(p) => { mutate((bl) => bl.map((x) => (x.id === b.id ? { ...x, props: { ...x.props, ...p.props } } : x))); say("AI changes applied"); }} />}
                <RenderBlock b={b} /></div>; })
              : <div className="m-7 p-11 border-2 border-dashed border-line-2 rounded-xl text-center text-ink-2 text-[15px]">How do you want to start this page?<small className="block text-[13px] text-ink-3 mt-1.5">Pick a layout, or add components one by one from the left.</small><div className="grid grid-cols-3 gap-3 mt-4 text-left">{TEMPLATES.filter((t) => t.blocks.length).slice(0, 3).map((t) => <button key={t.id} className="border border-line-2 bg-surface p-3.5 text-left hover:border-ink" onClick={() => mutate(() => t.blocks.map((x) => makeBlock(x, x === "mast" ? { heading: title } : {})))}><b className="block text-[13.5px]">{t.name}</b><small className="text-ink-3">{t.desc}</small></button>)}</div></div>}
            </SiteChrome></AssetsContext.Provider>
          </div>
          {editing && <div data-ui className="absolute left-1/2 -translate-x-1/2 bottom-6 flex gap-1 bg-[#0F1013] rounded-lg p-1 shadow-xl z-20 text-white text-xs" onMouseDown={(e) => e.preventDefault()}><span className="px-2 py-1.5 text-white/70">Editing text</span><button className="px-3 py-1.5 rounded bg-good font-semibold" onClick={() => { commitInline(true); say("Saved"); }}>✓ Save</button><button className="px-3 py-1.5 rounded hover:bg-white/15" onClick={() => commitInline(false)}>✕ Cancel</button></div>}
          {ctaPop && selected && <div data-ui className="absolute left-1/2 -translate-x-1/2 bottom-6 w-[420px] bg-surface border border-line rounded-xl shadow-2xl z-20 p-3.5 text-[13px]" onMouseDown={(e) => { e.stopPropagation(); if (!(e.target as HTMLElement).closest("input, textarea")) e.preventDefault(); }}>
            <div className="flex items-center mb-2.5"><b>Button</b><button className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={() => setCtaPop(null)} aria-label="Close">✕</button></div>
            <label className="block text-xs text-ink-2 font-medium">Label<input autoFocus className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink font-normal" value={String(selected.props[ctaPop.labelKey] ?? "")} onChange={(e) => setProp(selected.id, ctaPop.labelKey, e.target.value)} /></label>
            {ctaPop.linkKey && <label className="block text-xs text-ink-2 font-medium mt-2.5">URL<input className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink font-mono font-normal" value={String(selected.props[ctaPop.linkKey] ?? "")} onChange={(e) => setProp(selected.id, ctaPop.linkKey!, e.target.value)} placeholder="/borrowing/credit-cards/apply" /></label>}
            <div className="flex justify-end mt-3"><button className="btn btn-sm btn-primary" onClick={() => setCtaPop(null)}>Done</button></div>
          </div>}
          {/* ✨ Ask AI: floating button → full-width bar at the bottom of the canvas. Read-only users get the hint instead. */}
          {(!preview || !canEdit) && !aiBar && <button data-ui className="absolute right-6 bottom-6 z-[6] h-11 px-4 rounded-full bg-[#0F1013] text-white shadow-xl flex items-center gap-2 text-[13px] font-semibold hover:bg-black" onClick={() => (canEdit ? setAiBar(true) : say(READ_ONLY))} title="Ask AI to change this page (⌘K)" aria-expanded={aiBar}><span aria-hidden>✨</span>Ask AI</button>}
          {aiBar && canEdit && <AiBar draft={aiDraft} setDraft={setAiDraft} onAsk={startAiTask} onSide={() => { setAiBar(false); setRightTab("ai"); setRight(true); }} onClose={() => setAiBar(false)} />}
        </div>
        {focus && <button data-ui className="fixed top-3 right-3 z-[60] bg-[#0F1013] text-white text-[12px] font-medium px-3 py-1.5 rounded-full shadow-xl hover:bg-black" onClick={() => setFocusMode(false)}>Exit focus (Esc)</button>}
        {/* Left panel */}
        {left && !preview && <aside data-ui className="absolute left-0 top-0 bottom-0 w-[320px] bg-surface border-r border-line flex flex-col z-[5]">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line"><b className="text-[13.5px]">Components</b><button className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={() => setLeft(false)} aria-label="Close">✕</button></div>
          <div className="p-3 border-b border-line"><input className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px]" placeholder="Find a component" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="flex-1 overflow-auto p-3">{GROUPS.map((g) => { const items = filtered.filter((b) => b.group === g); if (!items.length) return null; return <div key={g}><h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold mt-3 mb-1.5 first:mt-0">{g}</h6>{items.map((b) => <div key={b.type} className="border border-line rounded-xl p-2.5 mb-2.5 bg-surface hover:border-ink-3 hover:shadow-md"><div className="flex justify-between items-center mb-1"><b className="text-[13.5px]">{b.name}</b><span className="text-[10.5px] uppercase tracking-[.06em] text-ink-3 font-semibold">{b.group}</span></div><small className="block text-ink-3 text-xs mb-2">{b.desc}</small><button className="btn btn-sm w-full justify-center hover:bg-accent hover:text-white hover:border-accent" onClick={() => add(b.type)}>＋ Add to page</button></div>)}</div>; })}</div>
        </aside>}
        {/* Right panel: Configure (contextual) or Page settings */}
        {right && !preview && <aside data-ui className="absolute right-0 top-0 bottom-0 w-[340px] bg-surface border-l border-line flex flex-col z-[5]">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line"><b className="text-[13.5px]">{rightTab === "block" ? "Configure" : rightTab === "page" ? "Page settings" : rightTab === "ai" ? "✨ AI" : rightTab === "insights" ? "Page insights" : "Version history"}</b><button className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={() => closeConfigure(true)} aria-label="Close">✕</button></div>
          <div className="flex border-b border-line">{(["block", "page", "ai", "insights", "history"] as const).map((t) => <button key={t} onClick={() => setRightTab(t)} className={`flex-1 py-2.5 text-[12px] font-medium border-b-2 -mb-px whitespace-nowrap ${rightTab === t ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>{t === "block" ? "Component" : t === "page" ? "Page" : t === "ai" ? "AI" : t === "insights" ? "Insights" : "History"}</button>)}</div>
          {rightTab === "insights" ? <div className="flex-1 overflow-auto p-3.5 text-[13px]"><InsightsPanel blocks={blocks} page={{ title, description, template: page.template, status, locale }} onFix={(apply, label) => { if (!canEdit) { say("Read-only: ask a site admin for Edit"); return; } mutate(apply); say(`Fixed: ${label}`); }} onSelectBlock={(id) => { select(id); const el = canvasRef.current?.querySelector<HTMLElement>(`.cblk[data-id="${id}"]`); el?.scrollIntoView({ block: "center", behavior: "smooth" }); }} /></div>
          : rightTab === "history" ? <div className="flex-1 overflow-auto p-3.5 text-[13px]"><VersionHistory marketId={marketId} path={page.path} currentBlocks={blocks.length} onRestored={() => { router.refresh(); say("Version restored · reloading"); setTimeout(() => window.location.reload(), 400); }} /></div>
          : rightTab === "ai" ? <AiPanel tasks={aiTasks} draft={aiDraft} setDraft={setAiDraft} dirty={dirty} onAsk={startAiTask} onToggle={(t, id) => patchTask(t.id, (x) => ({ ...x, on: { ...x.on, [id]: !x.on[id] } }))} onRun={runAiTask} onUndo={undoAiOp} onRedo={redoAiOp} onUndoAll={undoAllAi} onSave={() => save().then(() => say("Saved")).catch(() => {})} /> : <div className="flex-1 overflow-auto p-3.5 text-[13px]">
            {rightTab === "page" ? <div className="flex flex-col gap-3">
              <label className="text-xs text-ink-2 font-medium">Page title<input className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] font-normal text-ink" value={title} onChange={(e) => setPageField("title", e.target.value)} /></label>
              <label className="text-xs text-ink-2 font-medium">Meta description<textarea rows={3} className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] font-normal text-ink" value={description} onChange={(e) => setPageField("description", e.target.value)} placeholder="One or two sentences shown in search results" /><small className={`font-normal ${description.length > 155 ? "text-crit" : "text-ink-3"}`}>{description.length}/155 characters</small></label>
              <div className="text-xs text-ink-2 font-medium">URL<div className="mt-1 font-mono text-xs bg-surface-2 border border-line rounded-md px-2.5 py-1.5 text-ink-2 break-all">{domain}{rel}</div></div>
              <div className="text-xs text-ink-2 font-medium">Template<div className="mt-1 bg-surface-2 border border-line rounded-md px-2.5 py-1.5 font-normal text-ink-2">{TEMPLATES.find((t) => t.id === page.template)?.name ?? page.template}</div><small className="text-ink-3 font-normal">Fixed after creation</small></div>
              <div className="text-xs text-ink-2 font-medium">Repository path (JCR)<div className="mt-1 font-mono text-[11.5px] bg-surface-2 border border-line rounded-md px-2.5 py-1.5 text-ink-2 break-all">{page.path}/jcr:content</div><small className="text-ink-3 font-normal">Components are stored under jcr:content/root as nodes with sling:resourceType</small></div>
              <div className="text-xs text-ink-3">Created {page.created?.slice(0, 10)} · Last modified {page.lastModified?.slice(0, 16).replace("T", " ")}</div>
              <div className="border-t border-line pt-3 flex flex-col gap-2"><b className="text-xs text-ink-2">Languages</b><span className="text-[12px] text-ink-3">This page is {locale}. Create a translated copy in another locale.</span><button className="btn btn-sm justify-center" onClick={() => setTranslating(true)}>🌐 Translate this page…</button></div>
            </div>
            : !selected ? <div className="text-ink-3 p-2"><b className="block text-sm text-ink mb-1.5">Nothing selected</b>Click a block on the page, then ⚙ Configure.<div className="mt-3.5 flex flex-col gap-1.5">{blocks.slice(0, 8).map((k, ix) => <button key={k.id} className="btn btn-sm justify-start" onClick={() => configure(k.id)}>{ix + 1}. {BLOCK_BY_TYPE[k.type].name}</button>)}</div></div>
            : <ConfigForm block={selected} index={blocks.indexOf(selected)} count={blocks.length} marketId={marketId} setProp={(k, v) => setProp(selected.id, k, v)} />}
          </div>}
          {rightTab === "block" && selected && <div className="flex justify-end gap-2 px-3.5 py-2.5 border-t border-line bg-surface"><button className="btn btn-sm" onClick={() => closeConfigure(false)}>Cancel</button><button className="btn btn-sm btn-primary" onClick={() => { closeConfigure(true); say("Component updated · Save the page when you're done"); }}>Save</button></div>}
        </aside>}
        {translating && <TranslateModal marketId={marketId} path={page.path} title={title} onClose={() => setTranslating(false)} onDone={(created) => { say(`Created ${created.length} translation${created.length === 1 ? "" : "s"}`); router.refresh(); }} />}
        {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] shadow-xl z-50">{toast}</div>}
      </div>
    </div>
  );
}

/* ---- contextual toolbar at the selected block: ✎ Edit · ⚙ Configure · ✨ AI · ⋯ More ---- */
function Btn({ children, on, onClick, disabled, title }: { children: React.ReactNode; on?: boolean; onClick: () => void; disabled?: boolean; title: string }) { return <button title={title} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onClick(); }} className={`px-2.5 py-1.5 rounded-md text-[12.5px] font-medium whitespace-nowrap disabled:opacity-40 ${on ? "bg-accent text-white" : "hover:bg-white/15"}`}>{children}</button>; }
type MoreAction = "duplicate" | "copy" | "paste" | "up" | "down" | "hide" | "lock" | "delete" | "usage" | "history";
function ContextBar({ block: b, index, count, mode, pop, setPop, clipboard, aiSeed, onEdit, onConfigure, onMore, onAi }: { block: Block; index: number; count: number; mode: "select" | "edit"; pop: "ai" | "more" | null; setPop: (p: "ai" | "more" | null) => void; clipboard: Block | null; aiSeed?: string; onEdit: () => void; onConfigure: () => void; onMore: (a: MoreAction) => void; onAi: (p: AiProposal) => void }) {
  const locked = !!b.props.locked; const editing = mode === "edit";
  const [prompt, setPrompt] = useState(""); const [proposal, setProposal] = useState<AiProposal | null>(null);
  const ask = (p: string) => { setPrompt(p); setProposal(proposeAi(p, b)); };
  // A prompt from the palette (aiSeed) pre-fills and runs the popover once per seed: state adjusted during render, no effect needed.
  const [seenSeed, setSeenSeed] = useState(""); if (pop === "ai" && aiSeed && aiSeed !== seenSeed) { setSeenSeed(aiSeed); setPrompt(aiSeed); setProposal(proposeAi(aiSeed, b)); }
  const items: [MoreAction, string, boolean?][] = [["duplicate", "Duplicate"], ["copy", "Copy"], ["paste", "Paste after", !clipboard], ["up", "Move up", index === 0], ["down", "Move down", index === count - 1], ["hide", b.props.hidden ? "Show" : "Hide"], ["lock", locked ? "Unlock" : "Lock"], ["usage", "View usage"], ["history", "Version history"], ["delete", "Delete"]];
  return <div data-ui className="absolute -top-5 left-3 z-[4]" onMouseDown={(e) => { e.stopPropagation(); if (!(e.target as HTMLElement).closest("input, textarea")) e.preventDefault(); }} onDoubleClick={(e) => e.stopPropagation()}>
    <div role="toolbar" aria-label={`${BLOCK_BY_TYPE[b.type].name} actions`} className="flex items-center gap-0.5 bg-[#0F1013] text-white rounded-lg p-1 shadow-xl">
      <b className="px-2 text-[12px] text-white/70 border-r border-white/15 mr-0.5">{BLOCK_BY_TYPE[b.type].name}{locked ? " 🔒" : ""}{b.props.hidden ? " · hidden" : ""}</b>
      <Btn title={editing ? "Finish editing text" : "Edit text, images and buttons in place"} on={editing} onClick={onEdit} disabled={locked}>{editing ? "✓ Done" : "✎ Edit"}</Btn>
      <Btn title="All properties, layout and behaviour" onClick={onConfigure}>⚙ Configure</Btn>
      <Btn title="Ask AI to change this block" on={pop === "ai"} onClick={() => { setPop(pop === "ai" ? null : "ai"); setProposal(null); }} disabled={locked}>✨ AI</Btn>
      <Btn title="More actions" on={pop === "more"} onClick={() => setPop(pop === "more" ? null : "more")}>⋯</Btn>
    </div>
    {pop === "more" && <div role="menu" className="absolute left-0 top-full mt-1 w-44 bg-surface border border-line rounded-lg shadow-2xl py-1 text-[13px] text-ink">{items.map(([a, l, dis]) => <button key={a} role="menuitem" disabled={dis} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onMore(a); }} className={`w-full text-left px-3 py-1.5 hover:bg-surface-3 disabled:opacity-40 ${a === "delete" ? "text-accent border-t border-line mt-1" : ""}`}>{l}</button>)}</div>}
    {pop === "ai" && <div className="absolute left-0 top-full mt-1 w-[440px] bg-surface border border-line rounded-xl shadow-2xl p-3.5 text-[13px] text-ink">
      <div className="flex items-center mb-2"><b>✨ What would you like to change?</b><span className="ml-auto text-[11px] text-ink-3">{BLOCK_BY_TYPE[b.type].name} only</span></div>
      {!proposal && <div className="flex flex-col gap-1 mb-2.5">{AI_SUGGESTIONS.map((s) => <button key={s} onMouseDown={(e) => e.preventDefault()} className="text-left px-2.5 py-1.5 rounded-md border border-line hover:border-ink hover:bg-surface-2" onClick={(e) => { e.stopPropagation(); ask(s); }}>“{s}”</button>)}</div>}
      {proposal && <div className="mb-2.5">
        <div className="text-[11.5px] text-ink-3 mb-1.5">{proposal.note}</div>
        {Object.entries(proposal.props).length > 0 && <div className="border border-line rounded-md divide-y divide-line max-h-60 overflow-auto">{Object.entries(proposal.props).map(([k, v]) => <div key={k} className="p-2"><div className="text-[10.5px] uppercase tracking-[.06em] text-ink-3 font-semibold">{k}</div><div className="line-through text-ink-3 text-[12px] break-words">{String(b.props[k] ?? "")}</div><div className="text-[12.5px] break-words">{String(v)}</div></div>)}</div>}
        <div className="flex justify-end gap-2 mt-2.5"><button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setProposal(null); }}>Discard</button>{Object.keys(proposal.props).length > 0 && <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); onAi(proposal); setProposal(null); setPop(null); }}>Apply</button>}</div>
      </div>}
      <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); if (prompt.trim()) ask(prompt.trim()); }}><input className="flex-1 border border-line-2 rounded-md px-2.5 py-1.5 text-[13px]" placeholder="Ask AI…" value={prompt} onChange={(e) => setPrompt(e.target.value)} /><button className="btn btn-sm btn-primary">Ask</button></form>
    </div>}
  </div>;
}

/* ---- Configure panel: Content / Layout / Behaviour / Metadata ---- */
type PropCtl = { P: Record<string, unknown>; setProp: (k: string, v: unknown) => void };
function Seg({ P, setProp, k, opts }: PropCtl & { k: string; opts: string[] }) { return <div className="flex gap-1">{opts.map((o) => <button key={o} className={`btn btn-sm capitalize ${(P[k] ?? opts[0]) === o ? "on" : ""}`} onClick={() => setProp(k, o)}>{o}</button>)}</div>; }
function Tog({ P, setProp, k, l }: PropCtl & { k: string; l: string }) { return <label className="flex items-center justify-between text-xs text-ink-2 font-medium">{l}<button className={`w-9 h-5 rounded-full relative ${P[k] ? "bg-good" : "bg-line-2"}`} aria-pressed={!!P[k]} onClick={() => setProp(k, !P[k])}><i className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${P[k] ? "left-4" : "left-0.5"}`} /></button></label>; }
function Section({ t, children }: { t: string; children: React.ReactNode }) { return <div className="border-t border-line pt-3 mt-1"><h6 className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold mb-2.5">{t}</h6><div className="flex flex-col gap-3">{children}</div></div>; }
function ConfigForm({ block: selected, index, count, marketId, setProp }: { block: Block; index: number; count: number; marketId: string; setProp: (k: string, v: unknown) => void }) {
  const def = BLOCK_BY_TYPE[selected.type]; const P = selected.props;
  return <div className="flex flex-col gap-3">
    <div><b className="text-sm">{def.name}</b><div className="text-[11px] text-ink-3">Block {index + 1} of {count} · {def.desc}</div></div>
    <Section t="Content">{def.fields.map((f) => { const v = selected.props[f.k]; const invalid = f.req && !v; return <div key={f.k}><label className="flex justify-between text-xs text-ink-2 font-medium mb-1">{f.l}{f.req && <small className="font-mono text-[10.5px] text-ink-4">required</small>}</label>
      {f.t === "text" ? <input className={`w-full border rounded-md px-2.5 py-1.5 text-[13px] ${f.mono ? "font-mono" : ""} ${invalid ? "border-crit" : "border-line-2"}`} value={String(v ?? "")} onChange={(e) => setProp(f.k, e.target.value)} />
      : f.t === "textarea" ? <textarea rows={4} className={`w-full border rounded-md px-2.5 py-1.5 text-[13px] ${invalid ? "border-crit" : "border-line-2"}`} value={String(v ?? "")} onChange={(e) => setProp(f.k, e.target.value)} />
      : f.t === "lines" ? <ListEditor rows={lines(v)} hint={f.hint} onChange={(rows) => setProp(f.k, joinLines(rows))} />
      : f.t === "select" ? <div className="flex gap-1">{f.o!.map((o) => <button key={o} className={`btn btn-sm capitalize ${v === o ? "on" : ""}`} onClick={() => setProp(f.k, o)}>{o}</button>)}</div>
      : f.t === "bool" ? <button className={`w-9 h-5 rounded-full relative ${v ? "bg-good" : "bg-line-2"}`} aria-pressed={!!v} onClick={() => setProp(f.k, !v)}><i className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${v ? "left-4" : "left-0.5"}`} /></button>
      : f.t === "asset" ? <AssetPicker marketId={marketId} value={String(v ?? "")} invalid={invalid} onChange={(id) => setProp(f.k, id)} />
      : <input className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] font-mono" value={String(v ?? "")} onChange={(e) => setProp(f.k, e.target.value)} />}
      {invalid ? <div className="text-[11.5px] text-crit mt-1">Required before the page can be sent for review.</div> : f.hint && f.t !== "lines" ? <div className="text-[11.5px] text-ink-3 mt-1">{f.hint}</div> : null}</div>; })}</Section>
    <Section t="Layout"><div><label className="block text-xs text-ink-2 font-medium mb-1">Width</label><Seg P={P} setProp={setProp} k="layout" opts={["full", "contained", "narrow"]} /></div><div><label className="block text-xs text-ink-2 font-medium mb-1">Spacing</label><Seg P={P} setProp={setProp} k="spacing" opts={["default", "compact", "roomy"]} /></div></Section>
    <Section t="Behaviour"><Tog P={P} setProp={setProp} k="hidden" l="Hidden (not rendered on the live site)" /><Tog P={P} setProp={setProp} k="hideMobile" l="Hide on mobile" /><Tog P={P} setProp={setProp} k="locked" l="Locked (no edits until unlocked)" /><Tog P={P} setProp={setProp} k="personalise" l="Targeting enabled (Adobe Target segment)" /></Section>
    <Section t="Metadata"><div className="text-xs text-ink-2 font-medium">Node<div className="mt-1 font-mono text-[11.5px] bg-surface-2 border border-line rounded-md px-2.5 py-1.5 text-ink-2 break-all">jcr:content/root/{selected.id}</div></div><div className="text-xs text-ink-2 font-medium">sling:resourceType<div className="mt-1 font-mono text-[11.5px] bg-surface-2 border border-line rounded-md px-2.5 py-1.5 text-ink-2">hsbc/components/{selected.type}</div></div></Section>
  </div>;
}

function ListEditor({ rows, hint, onChange }: { rows: string[][]; hint?: string; onChange: (rows: string[][]) => void }) {
  const cols = (hint ?? "Value").split("|").map((c) => c.trim());
  const set = (r: number, c: number, v: string) => { const n = rows.map((x) => x.slice()); while (n[r].length <= c) n[r].push(""); n[r][c] = v.replace(/\|/g, "/"); onChange(n); };
  return <div className="flex flex-col gap-2">{rows.map((r, ri) => <div key={ri} className="border border-line bg-surface-2 p-2.5 rounded-md"><div className="flex justify-between items-center mb-1"><b className="text-[12.5px]">Item {ri + 1}</b><span className="flex gap-0.5"><button className="btn btn-quiet btn-sm" disabled={ri === 0} onClick={() => { const n = rows.slice(); [n[ri - 1], n[ri]] = [n[ri], n[ri - 1]]; onChange(n); }} aria-label="Move up">↑</button><button className="btn btn-quiet btn-sm" disabled={ri === rows.length - 1} onClick={() => { const n = rows.slice(); [n[ri + 1], n[ri]] = [n[ri], n[ri + 1]]; onChange(n); }} aria-label="Move down">↓</button><button className="btn btn-quiet btn-sm" onClick={() => onChange(rows.filter((_, i) => i !== ri))} aria-label="Remove">✕</button></span></div>
    {cols.map((c, ci) => <label key={ci} className="block mt-1.5 text-[11.5px] text-ink-3">{c}{c.toLowerCase().includes("text") || c.toLowerCase().includes("answer") ? <textarea rows={2} className="mt-0.5 w-full border border-line-2 rounded px-2 py-1 text-[13px] text-ink" value={r[ci] ?? ""} onChange={(e) => set(ri, ci, e.target.value)} /> : <input className="mt-0.5 w-full border border-line-2 rounded px-2 py-1 text-[13px] text-ink" value={r[ci] ?? ""} onChange={(e) => set(ri, ci, e.target.value)} />}</label>)}</div>)}
    <button className="btn btn-sm justify-center" onClick={() => onChange([...rows, cols.map(() => "")])}>＋ Add item</button></div>;
}

/* ---- ✨ Ask AI bar: full-width prompt at the bottom of the canvas (page level). Enter asks, Esc closes. ---- */
function AiBar({ draft, setDraft, onAsk, onSide, onClose }: { draft: string; setDraft: (v: string) => void; onAsk: (p: string) => void; onSide: () => void; onClose: () => void }) {
  return <div data-ui role="dialog" aria-label="Ask AI" className="absolute left-0 right-0 bottom-0 z-[6] bg-surface border-t border-line shadow-[0_-8px_30px_rgba(0,0,0,.12)] px-6 py-4" onMouseDown={(e) => e.stopPropagation()}>
    <div className="max-w-[960px] mx-auto">
      <div className="flex items-center gap-2 mb-2"><b className="text-[14px]">✨ Ask AI</b><span className="text-[12px] text-ink-3">Changes are planned first, then applied only when you run the plan. Nothing is saved until you Save the page.</span><button className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={onClose} aria-label="Close (Esc)">✕</button></div>
      <form className="flex gap-2 items-start" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) onAsk(draft); }}>
        <textarea autoFocus rows={2} className="flex-1 border border-line-2 rounded-lg px-3 py-2 text-[14px] resize-none" placeholder="What would you like to do with this page?" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onClose(); } else if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (draft.trim()) onAsk(draft); } }} />
        <div className="flex flex-col gap-1.5"><button type="submit" className="btn btn-primary" disabled={!draft.trim()}>Ask</button><button type="button" className="btn btn-sm" onClick={onSide} title="Open the AI panel on the right and keep typing there">Continue in side panel →</button></div>
      </form>
      <div className="flex flex-wrap gap-1.5 mt-2.5">{AI_PAGE_SUGGESTIONS.map((s) => <button key={s} type="button" className="text-[12.5px] px-2.5 py-1 rounded-full border border-line-2 bg-surface hover:border-ink hover:bg-surface-2" onClick={() => onAsk(s)}>{s}</button>)}</div>
    </div>
  </div>;
}

/* ---- AI side panel: history + thread of tasks (Understanding → Plan → Executing → Review → Done) + follow-up ---- */
const STAGES = ["Understanding", "Plan", "Executing", "Review", "Done"] as const;
type AiPanelProps = { tasks: AiTask[]; draft: string; setDraft: (v: string) => void; dirty: boolean; onAsk: (p: string) => void; onToggle: (t: AiTask, opId: string) => void; onRun: (t: AiTask) => void; onUndo: (t: AiTask, opId: string) => void; onRedo: (t: AiTask, opId: string) => void; onUndoAll: (t: AiTask) => void; onSave: () => void };
const applied = (t: AiTask) => t.done.filter((id) => !t.results[id]?.undone).length;
function Stage({ label, state, children }: { label: string; state: "done" | "on" | "todo"; children?: React.ReactNode }) {
  return <div className={`flex gap-2.5 ${state === "todo" ? "opacity-40" : ""}`}>
    <i className={`mt-0.5 w-5 h-5 flex-none rounded-full grid place-items-center not-italic text-[10px] font-bold ${state === "done" ? "bg-good text-white" : state === "on" ? "bg-accent text-white animate-pulse" : "border border-line-2 text-ink-3"}`}>{state === "done" ? "✓" : STAGES.indexOf(label as typeof STAGES[number]) + 1}</i>
    <div className="min-w-0 flex-1"><div className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold">{label}</div>{children}</div>
  </div>;
}
function AiPanel({ tasks, draft, setDraft, dirty, onAsk, onToggle, onRun, onUndo, onRedo, onUndoAll, onSave }: AiPanelProps) {
  const ref = useRef<HTMLDivElement>(null); const key = tasks.map((t) => `${t.id}:${t.stage}:${t.done.length}`).join("|");
  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight; }, [key]);
  const history = tasks.slice(0, -1);
  return <>
    <div ref={ref} className="flex-1 overflow-auto p-3.5 text-[13px] flex flex-col gap-4">
      {history.length > 0 && <div className="border border-line rounded-lg bg-surface-2 p-2.5"><div className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold mb-1">Earlier in this session</div>{history.map((t) => <div key={t.id} className="flex gap-2 text-[12px] py-0.5"><span className="truncate text-ink-2">{t.prompt}</span><span className="ml-auto flex-none text-ink-3">{applied(t)}/{t.plan.ops.length} applied</span></div>)}</div>}
      {!tasks.length && <div className="p-6 text-center text-ink-3 border border-dashed border-line-2 rounded-lg">Ask for a change to the whole page, e.g. “Improve this page”. You will see a plan before anything changes.</div>}
      {tasks.map((t, ti) => { const last = ti === tasks.length - 1; const ops = t.plan.ops; const enabled = ops.filter((o) => t.on[o.id]); const n = applied(t); const st = (s: typeof STAGES[number]): "done" | "on" | "todo" => { const order = { understanding: 0, plan: 1, executing: 2, done: 4 }[t.stage]; const i = STAGES.indexOf(s); return i < order || t.stage === "done" ? "done" : i === order ? "on" : "todo"; };
        return <div key={t.id} className={`flex flex-col gap-3 ${last ? "" : "opacity-80"}`}>
          <div className="self-end max-w-[85%] bg-ink text-white rounded-xl rounded-br-sm px-3 py-2 text-[13px]"><span className="block text-[10px] uppercase tracking-[.08em] text-white/60">You</span>{t.prompt}</div>
          <div className="border border-line rounded-xl p-3 flex flex-col gap-3 bg-surface">
            <b className="text-[13.5px]">✨ {t.plan.title}</b>
            <Stage label="Understanding" state={st("Understanding")}><p className="text-ink-2 mt-0.5">{t.plan.understanding}</p></Stage>
            {t.stage !== "understanding" && <Stage label="Plan" state={st("Plan")}>
              {t.plan.note && <p className="text-[12px] text-ink-3 mt-0.5 mb-1.5">{t.plan.note}</p>}
              {ops.length ? <ul className="flex flex-col gap-1 mt-1">{ops.map((o) => <li key={o.id}><label className={`flex gap-2 items-start ${t.stage === "plan" ? "cursor-pointer" : ""}`}><input type="checkbox" className="mt-1 accent-[#DB0011]" checked={!!t.on[o.id]} disabled={t.stage !== "plan"} onChange={() => onToggle(t, o.id)} /><span className={t.on[o.id] ? "" : "line-through text-ink-3"}>{o.label}</span></label></li>)}</ul> : <p className="text-ink-3 mt-1">Nothing to change.</p>}
              {t.stage === "plan" && <div className="flex gap-2 mt-2.5"><button className="btn btn-sm btn-primary" onClick={() => onRun(t)} disabled={!enabled.length && ops.length > 0}>{enabled.length ? `Run plan · ${enabled.length} change${enabled.length === 1 ? "" : "s"}` : "Nothing selected"}</button></div>}
            </Stage>}
            {(t.stage === "executing" || t.stage === "done") && <Stage label="Executing" state={st("Executing")}><ul className="flex flex-col gap-0.5 mt-1">{enabled.map((o) => { const d = t.done.includes(o.id); return <li key={o.id} className={`flex gap-2 ${d ? "text-ink" : "text-ink-3"}`}><span className={`w-4 flex-none ${d ? "text-good" : ""}`}>{d ? "✓" : "…"}</span><span>{o.label}</span></li>; })}</ul></Stage>}
            {t.stage === "done" && <Stage label="Review" state="done">
              <div className="flex flex-col gap-2 mt-1">{t.done.map((id) => { const o = ops.find((x) => x.id === id)!; const r = t.results[id]; if (!r) return null; return <div key={id} className={`border border-line rounded-md p-2 ${r.undone ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-2"><b className={`text-[12.5px] ${r.undone ? "line-through" : ""}`}>{o.label}</b>{r.undone ? <button className="btn btn-quiet btn-sm ml-auto flex-none" onClick={() => onRedo(t, id)}>Redo</button> : r.changes.length > 0 && <button className="btn btn-quiet btn-sm ml-auto flex-none" onClick={() => onUndo(t, id)}>Undo</button>}</div>
                {r.changes.length > 0 && <div className="mt-1 divide-y divide-line max-h-48 overflow-auto">{r.changes.map((c, i) => <div key={i} className="py-1 text-[12px]"><span className="font-semibold">{c.block}</span>{c.field && <span className="text-ink-3"> · {c.field}</span>}{c.before !== undefined && c.after !== undefined ? <div className="break-words"><span className="line-through text-ink-3">{c.before || "(empty)"}</span> → <span>{c.after || "(empty)"}</span></div> : <div className={c.after ? "text-good" : "text-ink-3"}>{c.after ?? c.before}</div>}</div>)}</div>}
              </div>; })}</div>
              {n > 0 && <button className="btn btn-sm mt-2" onClick={() => onUndoAll(t)}>Undo all</button>}
            </Stage>}
            {t.stage === "done" && <Stage label="Done" state="done"><p className="mt-0.5">Applied {n} of {enabled.length} change{enabled.length === 1 ? "" : "s"}{n > 0 ? " · Save the page to keep them" : "."}</p>{n > 0 && <button className="btn btn-sm btn-primary mt-2" onClick={onSave} disabled={!dirty}>{dirty ? "Save page" : "Saved"}</button>}</Stage>}
          </div>
        </div>; })}
    </div>
    <form className="flex gap-1.5 px-3.5 py-2.5 border-t border-line bg-surface" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) onAsk(draft); }}>
      <input className="flex-1 border border-line-2 rounded-md px-2.5 py-1.5 text-[13px]" placeholder={tasks.length ? "Ask a follow-up… e.g. make the banner light" : "What would you like to do with this page?"} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Ask AI" />
      <button className="btn btn-sm btn-primary" disabled={!draft.trim()}>Ask</button>
    </form>
  </>;
}
