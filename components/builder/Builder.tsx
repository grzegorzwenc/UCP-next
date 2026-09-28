"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Block, PageView, PageStatus } from "@/lib/api/types";
import { repoApi, ucpApi, ApiError } from "@/lib/api";
import { blocksToComponents, componentsToBlocks } from "@/lib/repo/mapping";
import { BLOCK_BY_TYPE, makeBlock, lines, joinLines, missingRequired, TEMPLATES } from "@/lib/blocks/registry";
import { RenderBlock, SiteChrome, AssetsContext, EntitiesContext, InlineEditContext } from "@/lib/blocks/Render";
import { bindingsOf, hasTokens, type ResolvedEntities } from "@/lib/ucp/tokens";
import type { Bindings } from "@/lib/ucp/types";
import { ContentPicker, ContentIcon, type ContentChoice } from "./ContentPicker";
import { EntitiesPanel, uniqueAlias, type ContentModelInfo } from "./LinkedContent";
import { PublishDialog } from "@/components/pages/PublishDialog";
import { ModalShell } from "@/components/models/ModalShell";
import { SendForReviewModal, AssigneeChip, type ReviewBody } from "./SendForReview";
import { AssetPicker } from "./AssetPicker";
import { Pill } from "@/components/ui/Pill";
import { proposeAi, AI_SUGGESTIONS, type AiProposal } from "@/lib/ai/mock";
import { planFor, revertOp, type Plan, type Change } from "@/lib/ai/planner";
import { useSession } from "@/components/shell/Session";
import { useShellMode } from "@/components/shell/SideNav";
import { InsightsPanel, VersionHistory, TranslateModal, pageInsights } from "@/components/builder";
import { LeftPanel } from "./LeftPanel";
import { LockedVeil } from "./LockedVeil";
import { FormatBar, RichField, useFormatState, prepareEditable } from "./RichTextEditor";
import { normalizeRich, cellSafe, toPlain } from "@/lib/blocks/richtext";
import { useRouter } from "next/navigation";
import { permForStatus } from "@/lib/ucp/perms";

type Props = { marketId: string; envId: string; marketName: string; flag: string; domain: string; locale: string; envName: string; root: string; page: PageView; names?: Record<string, string>; models?: ContentModelInfo[]; entities?: ResolvedEntities };
type RightTab = "block" | "page" | "content" | "ai" | "insights" | "history";
type PageField = "description" | "title";
/** One page-level AI task: prompt → plan → run → review. `results` keeps the snapshot around each op so it can be undone alone. */
type AiResult = { before: Block[]; after: Block[]; changes: Change[]; undone: boolean; pageBefore?: string };
type AiTask = { id: number; prompt: string; plan: Plan; stage: "understanding" | "plan" | "executing" | "done"; on: Record<string, boolean>; done: string[]; results: Record<string, AiResult> };
const READ_ONLY = "Read-only: you don't have Edit on this folder. Ask a site admin to grant it.";
const AI_EXAMPLES: { title: string; items: [string, string, string][] }[] = [
  { title: "Improve what is here", items: [["Improve this page", "Improve this page", "Tighter copy, clearer buttons, missing sections added"], ["Make it read better on a phone", "Create mobile version", "Shorter headings, heavy blocks hidden on mobile"]] },
  { title: "Create something new", items: [["Add a promotional section", "Create a promotional section for the new Premier Banking offer", "Banner + text block with the offer you name"], ["Design a landing page", "Design a landing page for Premier Banking", "A full campaign layout when the page is empty"]] },
  { title: "Check and fix", items: [["Check accessibility", "Check accessibility", "Alt text, heading order, descriptive link labels"], ["Optimise for search", "Optimise SEO", "Meta description, H1, FAQ suggestions"], ["Translate to Welsh", "Translate this page", "Draft copy in cy-GB for a translator to review"]] },
];
const LEFT_RAIL: ["add", string, string][] = [["add", "Add a component", "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 8.5v7M8.5 12h7"]];
const RAIL: [RightTab, string, string][] = [["block", "Component settings", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"], ["page", "Page settings", "M6 3h8l5 5v13H6zM14 3v5h5M9 13h6M9 17h6"], ["content", "Entities", "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"], ["ai", "AI assistant", "M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 15l.6 1.6L7.2 17l-1.6.6L5 19.2l-.6-1.6L2.8 17l1.6-.4z"], ["insights", "Page insights", "M12 3a9 9 0 1 0 9 9M12 3v9l6.4-6.4M12 12l4 4"], ["history", "Version history", "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2"]];
/** Short step names used when the stepper is narrow (same order as STEPS). */
const STEP_SHORT = ["Blocks", "Content", "Preview", "Send", "In review", "Ready", "Live"];
const STEPS = [["Add blocks", "Click: build the page structure"], ["Fill in content", "Click: write the copy in each block"], ["Preview", "Click: see it exactly as visitors will"], ["Send for review", "Click: hand it to a reviewer"], ["In review", "Click: approve (reviewers)"], ["Ready to publish", "Review done · click: put it live"], ["Published", "Live for customers"]];

/**
 * Interaction model (three levels):
 *   hover        → subtle outline + component name
 *   click        → select; Configure opens on the right; contextual toolbar at the block: ✎ Edit · ✨ AI · ⋯ More (⚙ Configure on phones)
 *   double-click → straight into inline edit
 * Edit never opens the right panel; Configure does (with Cancel / Save).
 */
const EMPTY_NAMES: Record<string, string> = {}; const EMPTY_MODELS: ContentModelInfo[] = []; const EMPTY_ENTS: ResolvedEntities = {};
/** Line icon in the rail style (1.7 stroke, round joins) for the top bar buttons. */
function Ico({ d }: { d: string }) { return <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none flex-none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>; }

export function Builder({ marketId, envId, marketName, flag, domain, locale, envName, root, page, names = EMPTY_NAMES, models = EMPTY_MODELS, entities: initialEntities = EMPTY_ENTS }: Props) {
  const { can, user } = useSession(); const isAdmin = user.role === "admin" || !!user.perms.root?.manage;
  const canEdit = can("edit", page.path); const mayStatus = (s: PageStatus) => can(permForStatus[s], page.path);
  const [blocks, setBlocks] = useState<Block[]>(() => componentsToBlocks(page.components));
  const [status, setStatus] = useState<PageStatus>(page.status);
  const [title, setTitle] = useState(page.title);
  const [sel, setSel] = useState<string | null>(null);
  const [mode, setMode] = useState<"select" | "edit">("select");
  const [pop, setPop] = useState<"ai" | "more" | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [preview, setPreviewRaw] = useState(!canEdit); // read-only users always see the preview
  const { phone, tablet } = useShellMode(); const narrow = phone || tablet;
  const [left, setLeftRaw] = useState(true); const [right, setRight] = useState(false);
  // Panel widths are draggable (min 260, max 560) and remembered per browser.
  const [leftW, setLeftW] = useState(320); const [rightW, setRightW] = useState(340);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from localStorage after hydration (not available during SSR)
  useEffect(() => { try { const l = Number(localStorage.getItem("ucp-leftw")); const r = Number(localStorage.getItem("ucp-rightw")); if (l >= 260 && l <= 560) setLeftW(l); if (r >= 260 && r <= 560) setRightW(r); } catch {} }, []);
  const startResize = (side: "left" | "right") => (e: React.MouseEvent) => {
    e.preventDefault(); const x0 = e.clientX; const w0 = side === "left" ? leftW : rightW; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    const mv = (ev: MouseEvent) => { const w = Math.min(560, Math.max(260, w0 + (side === "left" ? ev.clientX - x0 : x0 - ev.clientX))); if (side === "left") setLeftW(w); else setRightW(w); };
    const up = (ev: MouseEvent) => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); document.body.style.cursor = ""; document.body.style.userSelect = ""; const w = Math.min(560, Math.max(260, w0 + (side === "left" ? ev.clientX - x0 : x0 - ev.clientX))); try { localStorage.setItem(side === "left" ? "ucp-leftw" : "ucp-rightw", String(w)); } catch {} };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
  };
  const setLeft = (v: boolean) => setLeftRaw(v);
  // On a phone or tablet start with the matching rendition so the 1:1 page fits the screen; desktop stays 1200 px.
  const [shellSeen, setShellSeen] = useState({ phone: false, tablet: false }); // adjusted during render when the shell mode changes (no effect needed)
  if (shellSeen.phone !== phone || shellSeen.tablet !== tablet) { setShellSeen({ phone, tablet }); if (phone) { setLeftRaw(false); setDevice("mobile"); } else if (tablet) setDevice("tablet"); }
  const [rightTab, setRightTab] = useState<RightTab>("page");
  const [translating, setTranslating] = useState(false); const router = useRouter();
  const [description, setDescription] = useState(page.description ?? "");
  const [aiTasks, setAiTasks] = useState<AiTask[]>([]); const [aiDraft, setAiDraft] = useState("");
  const [focus, setFocus] = useState(false); const [previewCheck, setPreviewCheck] = useState(false); // after leaving Preview: "does it look right?"
  const [cfgSnapshot, setCfgSnapshot] = useState<Record<string, unknown> | null>(null);
  const [clipboard, setClipboard] = useState<Block | null>(null);
  const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState<string>("Saved");
  const [toast, setToast] = useState<string | null>(null);
  /* Linked content: page bindings (alias → entity path) and their resolved values for {{alias.field}} tokens. Re-resolved whenever bindings change. */
  const [bindings, setBindings] = useState<Bindings>(() => bindingsOf(page.meta));
  const [entities, setEntities] = useState<ResolvedEntities>(initialEntities);
  const bindKey = JSON.stringify(bindings);
  useEffect(() => { let on = true; ucpApi.resolveBindings(marketId, JSON.parse(bindKey) as Bindings).then((r) => { if (on) setEntities(r); }).catch(() => {}); return () => { on = false; }; }, [marketId, bindKey]);
  /* Review assignment */
  const [assignee, setAssignee] = useState(() => { const a = page.meta?.["ucp:assignee"]; return typeof a === "string" ? a : ""; });
  const assigneeName = assignee ? names[assignee] ?? assignee : "";
  const [sending, setSending] = useState(false);
  const [remind, setRemind] = useState(0); const [reminding, setReminding] = useState(false); // in review: "remind the reviewer you're waiting?"
  const [remindedAt, setRemindedAt] = useState(() => { const v = page.meta?.["ucp:remindedAt"]; return typeof v === "string" ? v : ""; });
  const [backToReview, setBackToReview] = useState(false); // confirm: the review is done, send it back anyway?
  const [publishing, setPublishing] = useState(false); const [publishAt, setPublishAt] = useState<string | undefined>(() => (typeof page.meta?.["ucp:publishAt"] === "string" ? String(page.meta["ucp:publishAt"]) : undefined));

  const canvasRef = useRef<HTMLDivElement>(null);
  const rel = page.path.replace(root, "");
  const selected = blocks.find((b) => b.id === sel);
  const missing = useMemo(() => blocks.reduce((n, b) => n + missingRequired(b).length, 0), [blocks]);
  /* Page lifecycle. Draft pages move between "blocks" (structure), "content" (fill in) and "preview" (visitor view) by clicking the steps;
     review / approved / published are read-only stages set by the workflow status. "Edit" always brings you back to editing the same page. */
  const [stage, setStage] = useState<"blocks" | "content">(() => (page.components.length ? "content" : "blocks"));
  const locked = status === "review" || status === "approved" || status === "scheduled" || status === "published";
  const cur = status === "published" ? 6 : status === "approved" || status === "scheduled" ? 5 : status === "review" ? 4 : focus || previewCheck ? 2 : stage === "content" ? 1 : 0;
  const [lockedSeen, setLockedSeen] = useState(false); // locked stages are read-only: switch to preview and drop the selection when the status changes
  if (lockedSeen !== locked) { setLockedSeen(locked); if (locked) { setPreviewRaw(true); setSel(null); setMode("select"); setPop(null); } else if (canEdit) setPreviewRaw(false); }
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  /** In review only the assigned reviewer (or a site admin) approves; unassigned legacy reviews fall back to the Review permission. */
  const mayApprove = mayStatus("approved") && (!assignee || assignee === user.id); // site admins reassign, they do not approve for someone else
  const waitingFor = assigneeName ? `Waiting for ${assigneeName}` : "Waiting for a reviewer";

  const mutate = useCallback((fn: (b: Block[]) => Block[]) => { setBlocks((b) => fn(b)); setDirty(true); setSaving("Unsaved"); }, []);
  const setProp = (id: string, k: string, v: unknown) => mutate((b) => b.map((x) => (x.id === id ? { ...x, props: { ...x.props, [k]: v } } : x)));
  const select = (id: string | null) => { setSel(id); setMode("select"); setPop(null); if (id && right && rightTab === "block") setCfgSnapshot(blocks.find((b) => b.id === id)?.props ?? null); };
  const add = (type: string) => { const nb = makeBlock(type); mutate((b) => { const i = sel ? b.findIndex((x) => x.id === sel) + 1 : b.length; const c = b.slice(); c.splice(i, 0, nb); return c; }); select(nb.id); say(`${BLOCK_BY_TYPE[type].name} added · click ✎ Edit to fill it in`); };
  const move = (id: string, d: number) => mutate((b) => { const i = b.findIndex((x) => x.id === id); const j = i + d; if (j < 0 || j >= b.length) return b; const c = b.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; });
  const remove = (id: string) => { mutate((b) => b.filter((x) => x.id !== id)); select(null); };
  const duplicate = (b: Block) => mutate((bl) => { const i = bl.findIndex((x) => x.id === b.id); const c = bl.slice(); c.splice(i + 1, 0, { ...b, id: makeBlock(b.type).id, props: { ...b.props } }); return c; });
  const configure = (id: string) => { setSel(id); setMode("select"); setPop(null); setRightTab("block"); setRight(true); setCfgSnapshot(blocks.find((b) => b.id === id)?.props ?? null); };
  /** Clicking a component opens Configure with its fields right away (not on phones, where the panel would cover the page). */
  const openCfgPanel = (id: string) => { if (phone || !canEdit || locked) return; setRightTab("block"); setRight(true); setCfgSnapshot(blocksRef.current.find((b) => b.id === id)?.props ?? null); };
  const closeConfigure = (keep: boolean) => { if (!keep && sel && cfgSnapshot) mutate((b) => b.map((x) => (x.id === sel ? { ...x, props: cfgSnapshot } : x))); setCfgSnapshot(null); setRight(false); };
  /* Latest values for timers and async work (the AI run applies ops 300 ms apart and must see its own previous result). */
  const blocksRef = useRef(blocks); const titleRef = useRef(title); const descRef = useRef(description); const taskSeq = useRef(0);
  useEffect(() => { blocksRef.current = blocks; titleRef.current = title; descRef.current = description; });
  const setPageField = (k: PageField, v: string) => { if (k === "title") setTitle(v); else setDescription(v); setDirty(true); setSaving("Unsaved"); };

  /* ---- Agentic AI (page level): Understanding → Plan → Executing → Review → Done. Ops come from lib/ai/planner (deterministic, offline). ---- */
  const patchTask = (id: number, fn: (t: AiTask) => AiTask) => setAiTasks((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));
  function startAiTask(prompt: string) {
    setRightTab("ai"); setRight(true);
    const p = prompt.trim(); if (!p) return;
    if (!canEdit) { say(READ_ONLY); return; }
    const plan = planFor(p, blocksRef.current, { title: titleRef.current, template: page.template, status, locale, description: descRef.current });
    const id = ++taskSeq.current;
    setAiTasks((ts) => [...ts, { id, prompt: p, plan, stage: "understanding", on: Object.fromEntries(plan.ops.map((o) => [o.id, true])), done: [], results: {} }]);
    setAiDraft(""); setSel(null); setPop(null); setPreviewRaw(false); setRightTab("ai"); setRight(true);
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

  /* ---- inline editing (only in Edit mode): click a text, Enter/✓ saves, Esc/✕ cancels ---- */
  const [editing, setEditing] = useState<{ key: string; original: string } | null>(null); const [inlineGen, setInlineGen] = useState(0);
  const editingKey = editing?.key ?? null; const inlineCtx = useMemo(() => ({ editing: editingKey, gen: inlineGen, raw: !preview && !focus }), [editingKey, inlineGen, preview, focus]); const editingEl = useRef<HTMLElement | null>(null); // the live element stays out of state (mutated in place)
  const [ctaPop, setCtaPop] = useState<{ id: string; labelKey: string; linkKey?: string } | null>(null);
  const scrollGuard = useRef<(() => void) | null>(null);
  function startInline(ie: HTMLElement) {
    const rich = ie.dataset.rich !== undefined; if (rich) prepareEditable();
    ie.contentEditable = "true"; ie.classList.add("editing"); ie.focus({ preventScroll: true }); editingEl.current = ie; setEditing({ key: ie.dataset.inline!, original: rich ? ie.innerHTML : ie.dataset.raw ?? ie.innerText });
    // Text with {{tokens}} switches to its raw form on the next render; put the caret at the end once it is there.
    if (ie.dataset.raw !== undefined) setTimeout(() => { if (editingEl.current !== ie) return; const r = document.createRange(); r.selectNodeContents(ie); r.collapse(false); const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); }, 0);
    // the caret must never drag the 1:1 canvas sideways while typing
    const c = canvasRef.current; if (c) { const left = c.scrollLeft; const h = () => { if (c.scrollLeft !== left) c.scrollLeft = left; }; c.addEventListener("scroll", h); scrollGuard.current = () => c.removeEventListener("scroll", h); }
  }
  function commitInline(save: boolean) {
    const el = editingEl.current; if (!editing || !el) return; const { key, original } = editing; editingEl.current = null; setTokTyped(false); el.contentEditable = "false"; el.classList.remove("editing"); scrollGuard.current?.(); scrollGuard.current = null;
    // formatted text: save the cleaned markup; cancelling remounts it from the stored value
    if (el.dataset.rich !== undefined) { setInlineGen((g) => g + 1);
      if (save) { const [id, f, r, c] = key.split("|"); const v = normalizeRich(el.innerHTML, el.dataset.rich !== "inline"); const b = blocks.find((x) => x.id === id);
        if (r === undefined) setProp(id, f, v); else if (b) { const rows = lines(b.props[f]); if (rows[Number(r)]) { rows[Number(r)][Number(c)] = cellSafe(v); setProp(id, f, joinLines(rows)); } } }
      setEditing(null); return; }
    if (el.dataset.raw !== undefined || hasTokens(el.innerText)) setInlineGen((g) => g + 1); // token spans change shape (raw ↔ resolved): remount them instead of patching the DOM the browser edited
    if (!save) { el.innerText = original; setEditing(null); return; }
    const [id, f, r, c] = key.split("|"); const v = el.innerText.replace(/\n+$/, "").replace(/\|/g, "/");
    const b = blocks.find((x) => x.id === id); if (!b) { setEditing(null); return; }
    if (r === undefined) setProp(id, f, v);
    else if (r === "p") { const paras = String(b.props[f] ?? "").split(/\n\s*\n/); paras[Number(c)] = v; setProp(id, f, paras.join("\n\n")); }
    else { const rows = lines(b.props[f]); if (rows[Number(r)]) { rows[Number(r)][Number(c)] = v; setProp(id, f, joinLines(rows)); } }
    setEditing(null);
  }
  /* ---- insert a value from an entity while editing text: toolbar button or typing "{{" ---- */
  const [contentPick, setContentPick] = useState<null | { target: "inline"; label: string } | { target: "field"; blockId: string; k: string; l: string }>(null); const [tokTyped, setTokTyped] = useState(false); /* typed "{{" opened the picker: those two characters get replaced by the token */ const caret = useRef<Range | null>(null);
  useEffect(() => { if (!editing) return; const h = () => { const el = editingEl.current; const sel = window.getSelection(); if (el && sel && sel.rangeCount && el.contains(sel.getRangeAt(0).startContainer)) caret.current = sel.getRangeAt(0).cloneRange(); }; document.addEventListener("selectionchange", h); return () => document.removeEventListener("selectionchange", h); }, [editing]);
  const onInlineInput = () => { const el = editingEl.current; const sel = window.getSelection(); if (!el || !sel?.rangeCount) return; const r = sel.getRangeAt(0); const n = r.startContainer; if (n.nodeType === 3 && el.contains(n) && (n.textContent ?? "").slice(0, r.startOffset).endsWith("{{")) { setTokTyped(true); setContentPick({ target: "inline", label: "this text" }); } };
  /* Icon floating next to the text being edited: opens Choose content. Follows the text when the canvas scrolls. */
  const [inlinePos, setInlinePos] = useState<{ top: number; left: number; barTop: number; barLeft: number; rich: boolean; lists: boolean } | null>(null);
  const getEditingEl = useCallback(() => editingEl.current, []); const fmt = useFormatState(getEditingEl, !!editing);
  useEffect(() => { if (!editing) return; const place = () => { const el = editingEl.current; if (!el) { setInlinePos(null); return; } const r = el.getBoundingClientRect(); setInlinePos({ top: r.top + r.height / 2 - 14, left: Math.min(window.innerWidth - 40, r.right + 8), barTop: r.bottom + 52 < window.innerHeight - 70 ? r.bottom + 8 : Math.max(8, r.top - 44), /* under the text (the block toolbar sits above it), above when there is no room */ barLeft: Math.max(8, Math.min(window.innerWidth - 300, r.left)), rich: el.dataset.rich !== undefined, lists: el.dataset.rich === "block" }); };
    const raf = requestAnimationFrame(place); const c = canvasRef.current; c?.addEventListener("scroll", place); window.addEventListener("resize", place); document.addEventListener("input", place);
    return () => { cancelAnimationFrame(raf); c?.removeEventListener("scroll", place); window.removeEventListener("resize", place); document.removeEventListener("input", place); setInlinePos(null); }; }, [editing]);
  /** Use a field of an entity here: the entity is added to the page (if needed) and the text inherits the field as a {{alias.field}} token. */
  async function applyContent(c: ContentChoice) {
    const target = contentPick; setContentPick(null); if (!target) return;
    let alias = Object.entries(bindings).find(([, p]) => p === c.entity.path)?.[0];
    if (!alias) { alias = uniqueAlias(c.entity.model, bindings); try { const next = { ...bindings, [alias]: c.entity.path }; const saved = await ucpApi.saveBindings(marketId, page.path, next); setBindings(saved ?? next); } catch (e) { say(e instanceof ApiError ? e.problem.title : String(e)); return; } }
    const token = `{{${alias}.${c.field.k}}}`;
    if (target.target === "field") { setProp(target.blockId, target.k, token); say(`${target.l} now shows ${c.entity.title} · ${c.field.l}`); return; }
    const el = editingEl.current; if (!el) return; el.focus({ preventScroll: true }); const sel = window.getSelection();
    if (tokTyped) { const r = caret.current && el.contains(caret.current.startContainer) ? caret.current : null; if (r && r.startContainer.nodeType === 3 && r.startOffset >= 2 && (r.startContainer.textContent ?? "").slice(r.startOffset - 2, r.startOffset) === "{{") { r.setStart(r.startContainer, r.startOffset - 2); r.deleteContents(); const t = document.createTextNode(token); r.insertNode(t); r.setStartAfter(t); r.collapse(true); sel?.removeAllRanges(); sel?.addRange(r); setTokTyped(false); say(`Inserted ${c.entity.title} · ${c.field.l}. Press ✓ Save.`); return; } }
    if (el.dataset.rich !== undefined) { const r0 = caret.current && el.contains(caret.current.startContainer) ? caret.current : null; if (r0) { sel?.removeAllRanges(); sel?.addRange(r0); } document.execCommand("insertText", false, token); setTokTyped(false); say(`Inserted ${c.entity.title} · ${c.field.l}. Click outside or ✓ Save.`); return; }
    setTokTyped(false); el.innerText = token; const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); sel?.removeAllRanges(); sel?.addRange(r);
    say(`This text now shows ${c.entity.title} · ${c.field.l}. Press ✓ Save.`);
  }
  /** Leaving Preview on a draft asks whether the page is right: yes → Send for review, no → back to the content. */
  const leavePreview = () => { setFocusMode(false); if (canEdit && (status === "draft" || status === "failed")) setPreviewCheck(true); };
  /* ---- Focus mode (⌘⇧F): body.focus hides the top bar and side nav (CSS in globals.css); other parts of the shell can listen to ucp:focus. ---- */
  const panelsBeforeFocus = useRef<{ left: boolean; right: boolean; preview: boolean } | null>(null);
  const [fsHint, setFsHint] = useState(false);
  const leaveFocusState = () => { setFocus(false); document.body.classList.remove("focus"); window.dispatchEvent(new CustomEvent("ucp:focus", { detail: { on: false } })); const b = panelsBeforeFocus.current; if (b) { setLeftRaw(b.left); setRight(b.right); setPreviewRaw(b.preview); panelsBeforeFocus.current = null; } };
  const setFocusMode = (on: boolean) => {
    // Preview = the page exactly as visitors see it, inside the browser tab: no toolbar, no block outlines, no panels. Esc brings the authoring layout back.
    if (on) { panelsBeforeFocus.current = { left, right, preview }; setLeftRaw(false); setRight(false); setPop(null); if (editing) commitInline(true); select(null); setPreviewRaw(true); setFocus(true); document.body.classList.add("focus"); window.dispatchEvent(new CustomEvent("ucp:focus", { detail: { on: true } })); setFsHint(true); setTimeout(() => setFsHint(false), 3500); }
    else leaveFocusState();

  };
  useEffect(() => () => { document.body.classList.remove("focus"); }, []);

  async function save(extra: { status?: PageStatus } = {}) {
    setSaving("Saving…");
    try { await repoApi.saveComponents(page.path, blocksToComponents(blocksRef.current)); await repoApi.updateContent(page.path, { title: titleRef.current, description: descRef.current, status, ...extra }); setDirty(false); setSaving("Saved just now"); }
    catch (e) { setSaving("Save failed"); say(e instanceof ApiError ? `${e.problem.title} · request ${e.requestId ?? "n/a"}` : String(e)); throw e; }
  }
  /* Autosave: 1.2 s after the last change the draft is saved. There is no Save button any more. */
  const saveRef = useRef(save); useEffect(() => { saveRef.current = save; });
  useEffect(() => { if (!dirty || !canEdit || locked || editing) return; const id = setTimeout(() => { saveRef.current().catch(() => {}); }, 1200); return () => clearTimeout(id); }, [dirty, blocks, title, description, canEdit, locked, editing]);
  /** Why the page cannot move to `next` (permission, or required fields before review); says it and returns true when blocked. */
  function blocked(next: PageStatus) {
    if (!mayStatus(next)) { say(`You don't have ${permForStatus[next] === "publish" ? "Publish" : permForStatus[next] === "review" ? "Review & approve" : "Edit"} on this folder`); return true; }
    if (next === "review" && missing) { say(`Fill in ${missing} required field${missing === 1 ? "" : "s"} first`); const b = blocks.find((x) => missingRequired(x).length); if (b) configure(b.id); return true; }
    return false;
  }
  async function transition(next: PageStatus, msg: string) {
    if (blocked(next)) return;
    setStatus(next); try { await save({ status: next }); say(msg); } catch { setStatus(status); }
  }
  /* Send for review goes through the modal (reviewer choice + note); the same checks as a plain transition apply first. */
  const openSend = () => { if (status !== "draft" && status !== "failed") { say(status === "review" ? "Already in review" : "Already past review"); return; } if (blocked("review")) return; setPop(null); setSending(true); };
  async function sendForReview(body: ReviewBody) {
    if (dirty) await save();
    const r = await ucpApi.sendForReview(marketId, page.path, body);
    setSending(false); setAssignee(r.assignee); setStatus("review"); say(`Sent to ${r.assigneeName} for review`); router.refresh();
  }
  /* Token chips: while a block is being configured, insert into the last focused Configure field at its caret; otherwise copy. */
  const lastField = useRef<{ blockId: string; k: string; l: string; start: number; end: number } | null>(null);


  const [aiSeed, setAiSeed] = useState("");
  /* Pictures for the canvas: asset id → data URL. Re-read when a block points at an asset we do not know yet (e.g. just uploaded from the picker). */
  const [assetMap, setAssetMap] = useState<Record<string, { data?: string; alt?: string; decorative?: boolean }>>({});
  const imageKey = blocks.map((b) => b.props.image).filter((x) => typeof x === "string" && x && !(x in assetMap)).join(",");
  useEffect(() => { let on = true; ucpApi.assets(marketId).then((as) => { if (on) setAssetMap(Object.fromEntries(as.map((a) => [a.id, { data: a.data, alt: a.a11y?.alt?.[locale] || Object.values(a.a11y?.alt ?? {}).find(Boolean), decorative: a.a11y?.decorative }]))); }).catch(() => {}); return () => { on = false; }; }, [marketId, imageKey, locale]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); save().catch(() => {}); return; }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") { e.preventDefault(); setFocusMode(!focus); return; }
      if (e.key === "Escape") { if (focus && !editing && !pop && !ctaPop) leavePreview(); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });
  /* Command palette (⌘K) talks to the builder through window events. ucp:ai is block-scoped while a block is selected, page-level otherwise. */
  useEffect(() => {
    const onAdd = (e: Event) => { const t = (e as CustomEvent<{ type: string }>).detail?.type; if (t && BLOCK_BY_TYPE[t]) add(t); };
    const onAi = (e: Event) => { const prompt = (e as CustomEvent<{ prompt: string }>).detail?.prompt ?? ""; if (!canEdit) { say(READ_ONLY); return; } if (!sel) { setRightTab("ai"); setRight(true); if (prompt.trim()) startAiTask(prompt); return; } setMode("select"); setPop("ai"); setAiSeed(prompt); };
    window.addEventListener("ucp:add-block", onAdd); window.addEventListener("ucp:ai", onAi);
    return () => { window.removeEventListener("ucp:add-block", onAdd); window.removeEventListener("ucp:ai", onAi); };
  });
  function enterEdit(id: string, target?: HTMLElement, at?: { x: number; y: number }) {
    const b = blocks.find((x) => x.id === id); if (!b || b.props.locked) { say("This block is locked. Unlock it from ⋯ More."); return; }
    setSel(id); setMode("edit"); setPop(null);
    const ie = target?.closest<HTMLElement>(".ie") ?? canvasRef.current?.querySelector<HTMLElement>(`.cblk[data-id="${id}"] .ie`) ?? undefined;
    // A token span may have been remounted by the commit that just happened: look it up again by its key.
    if (ie) { const k = ie.dataset.inline ?? ""; setTimeout(() => { const el = ie.isConnected ? ie : canvasRef.current?.querySelector<HTMLElement>(`.ie[data-inline="${CSS.escape(k)}"]`); if (!el) return; startInline(el);
      /* put the caret where the person clicked (plain text only; text with tokens switches to its raw form first) */
      if (at && el.dataset.raw === undefined) { const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null; caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
        let r: Range | null = doc.caretRangeFromPoint?.(at.x, at.y) ?? null; if (!r && doc.caretPositionFromPoint) { const p = doc.caretPositionFromPoint(at.x, at.y); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); r.collapse(true); } }
        if (r && el.contains(r.startContainer)) { const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r); } } }, 0); }
  }
  function onCanvasClick(e: React.MouseEvent) {
    if (preview) return;
    const t = e.target as HTMLElement; if (t.closest("[data-ui]")) return;
    const blk = t.closest<HTMLElement>(".cblk"); if (!blk) { if (editing) commitInline(true); select(null); return; }
    const id = blk.dataset.id!; const ie = t.closest<HTMLElement>(".ie");
    if (t.closest("a, summary, .s-cta")) e.preventDefault();
    /* One click on a text edits it straight away (caret where you clicked); a click elsewhere in the block selects the block. */
    if (ie && editing && editingEl.current === ie) return; // moving the caret inside the text being edited
    if (ie && canEdit && !locked) {
      const b = blocks.find((x) => x.id === id)!; if (b.props.locked) { if (id !== sel) select(id); say("This block is locked. Unlock it from ⋯ More."); return; }
      e.preventDefault(); if (editing) commitInline(true);
      const cta = t.closest(".s-cta"); const hasLink = BLOCK_BY_TYPE[b.type].fields.some((f) => f.k === "link");
      if (cta && hasLink && !ie.dataset.inline!.includes("|")) { setSel(id); setMode("edit"); setCtaPop({ id, labelKey: ie.dataset.inline!.split("|")[1], linkKey: "link" }); return; }
      enterEdit(id, t, { x: e.clientX, y: e.clientY }); openCfgPanel(id); return;
    }
    if (id !== sel) { if (editing) commitInline(true); select(id); openCfgPanel(id); return; }
    if (editing && !ie) commitInline(true);
    if (!(right && rightTab === "block")) openCfgPanel(id);
  }
  function onCanvasDouble(e: React.MouseEvent) { if (preview) return; const t = e.target as HTMLElement; if (t.closest("[data-ui]")) return; const blk = t.closest<HTMLElement>(".cblk"); if (!blk) return; if (editing && editingEl.current?.contains(t)) return; /* double-click inside the text being edited selects a word */ if (editing) commitInline(true); enterEdit(blk.dataset.id!, t); }
  function onCanvasKey(e: React.KeyboardEvent) {
    if (contentPick || previewCheck) return; // a dialog is open: it handles its own keys
    if (e.key === "Escape") { e.preventDefault(); if (editing) commitInline(false); else if (ctaPop || pop) { setCtaPop(null); setPop(null); } else if (mode === "edit") setMode("select"); else select(null); return; }
    if (!editing) return;
    const rich = editingEl.current?.dataset.rich === "block"; // one-line texts save on Enter; paragraphs and lists need ⌘/Ctrl+Enter
    if (e.key === "Enter" && ((rich && (e.metaKey || e.ctrlKey)) || (!rich && !e.shiftKey && !editing.key.includes("|p|")))) { e.preventDefault(); commitInline(true); say("Saved"); }
  }

  const nextTxt = cur === 0 ? (blocks.length ? "Structure is ready · click Fill in content" : "Add your first block") : cur === 1 ? (missing ? `Fill in ${missing} required field${missing === 1 ? "" : "s"}` : "Content is complete · click Preview") : cur === 2 ? "Happy with it? Click Send for review" : cur === 4 ? (mayApprove ? "Approve it, or click Edit to change it" : waitingFor) : cur === 5 ? (mayStatus("published") ? "Approved · click Publish" : "Waiting for a publisher") : `Live on ${domain}`;
  /** Go back to editing: from preview → content; from a locked stage → reopen as a draft (same page, same data). */
  const goEdit = async (to: "blocks" | "content" = "content") => {
    if (!canEdit) { say(READ_ONLY); return; }
    if (focus) leaveFocusState();
    // published: just start editing (the live version stays online until the next publish); in review / approved: confirm, it leaves the queue
    if (locked) { if (status !== "published" && !confirm("Reopen this page for editing? It will leave the review queue.")) return; await transition("draft", status === "published" ? "Editing · the live version stays online until you publish again" : "Reopened for editing"); }
    setPreviewRaw(false); setStage(to);
    if (to === "blocks") { setLeftRaw(true); setRight(false); select(null); setMode("select"); }
    else { setLeftRaw(false); const b = blocks.find((x) => missingRequired(x).length) || blocks[0]; if (b) enterEdit(b.id); }
  };
  const flowClick = (i: number) => {
    if (i === 0) { void goEdit("blocks"); return; }
    if (i === 1) { void goEdit("content"); return; }
    if (i === 2) { if (locked) { setFocusMode(true); return; } setStage("content"); setFocusMode(true); return; }
    if ((i === 3 || i === 4) && (status === "approved" || status === "scheduled")) { if (!canEdit) { say("Review is done"); return; } setBackToReview(true); return; }
    if (i === 3) { openSend(); return; }
    if (i === 4) { if (status === "review") { if (mayApprove) transition("approved", "Approved · ready to publish"); else if (canEdit) setRemind(new Date().getTime()); else say(`${waitingFor} to approve`); } else say(status === "draft" || status === "failed" ? "Send the page for review first" : "Review is done"); return; }
    if (i === 5) { if (status === "approved" || status === "scheduled") { if (mayStatus("published")) { if (dirty) save().catch(() => {}); setPublishing(true); } else say("Waiting for a publisher"); } else say(status === "published" ? "Already published" : "The page must be approved first"); return; }
    if (i === 6) { say(status === "published" ? `Live on ${domain}${rel}` : "Not published yet"); }
  };
  /** Why the page cannot be changed right now (Add, Configure and AI are veiled; insights, settings, entities and history stay open); "" when it can. */
  const lockReason = !canEdit ? "You don't have Edit on this folder. Ask a site admin to grant it." : status === "review" ? `The page is in review${assigneeName ? ` with ${assigneeName}` : ""}. Editing takes it out of the review queue.` : status === "approved" || status === "scheduled" ? "The page passed review and is ready to publish. Editing sends it back through review." : status === "published" ? "The page is live. Click Edit to change it; the live version stays online until you publish again." : "";
  const veilEdit = canEdit ? () => void goEdit("blocks") : undefined;
  const insightMeta = useMemo(() => ({ title, description, template: page.template, status, locale, assets: assetMap, entities }), [title, description, page.template, status, locale, assetMap, entities]);
  const insightBadge = useMemo(() => pageInsights(blocks, insightMeta).groups.flatMap((g) => g.items).filter((i) => i.level === "crit").length, [blocks, insightMeta]);
  // On phones and tablets the panels float over the canvas instead of reserving space, so the 1:1 page keeps its width.
  const siteW = device === "desktop" ? 1200 : device === "tablet" ? 768 : 390;
  const [avail, setAvail] = useState(0);
  /* The page is drawn at its real width (1200 / 768 / 390 px) and scaled down to fit the canvas, so the canvas never scrolls sideways. */
  const siteRef = useRef<HTMLDivElement>(null); const [siteH, setSiteH] = useState(0);
  useEffect(() => { const w = watched.current; const c = canvasRef.current, el = siteRef.current; if (c === w.canvas && el === w.site) return;
    w.ro.forEach((r) => r.disconnect()); w.ro = []; w.canvas = c; w.site = el;
    if (c) { const r = new ResizeObserver(() => setAvail(c.clientWidth)); r.observe(c); w.ro.push(r); }
    if (el) { const r = new ResizeObserver(() => setSiteH(el.offsetHeight)); r.observe(el); w.ro.push(r); } });
  useEffect(() => () => { const w = watched.current; w.ro.forEach((r) => r.disconnect()); w.ro = []; w.canvas = null; w.site = null; /* forget them so a remount (React strict mode) re-attaches */ }, []);
  /* Watch the canvas and the page for size changes. They can mount after the first render, so re-attach whenever the element changes. */
  const watched = useRef<{ canvas: HTMLElement | null; site: HTMLElement | null; ro: ResizeObserver[] }>({ canvas: null, site: null, ro: [] });
  const railsOn = !preview || !!lockReason; // a locked page keeps the rails (panels open read-only or veiled); a plain preview hides them
  const padL = focus ? 0 : !railsOn ? 24 : left && !narrow ? leftW + 76 : phone ? 12 : narrow ? 64 : 76, padR = focus ? 0 : !railsOn ? 24 : right && !narrow ? rightW + 76 : phone ? 12 : narrow ? 64 : 76;
  const hint = !canEdit ? "Read-only: you don't have Edit on this folder. Ask a site admin to grant it." : locked ? (status === "review" ? "In review · read-only until a reviewer approves or you click Edit to reopen it" : status === "published" ? `Published · live on ${domain}${rel} · click Edit to change it` : "Approved · read-only until it is published · click Edit to reopen it") : preview ? "Preview: exactly what visitors will see" : mode === "edit" ? "Edit mode: click any highlighted text to change it. Enter saves, Esc cancels." : sel ? "Use the toolbar on the block: ✎ Edit text in place · ⚙ Configure everything · ✨ AI · ⋯ More" : "Hover to see block names. Click a block to select it, double-click to edit its text.";

  return (
    <div className={`h-full grid ${focus ? "grid-rows-[1fr]" : "grid-rows-[54px_48px_1fr]"} min-w-0 overflow-hidden`}>
      {/* Toolbar (docked; gone in preview) */}
      {!focus && <div className="flex items-center gap-3 px-2.5 bg-surface border-b border-line overflow-x-auto overflow-y-hidden">
        {!focus && <Link href={`/${marketId}/${envId}/pages${rel.replace(/\/[^/]+$/, "")}`} className="btn btn-quiet btn-sm">‹ Pages</Link>}
        <div className="min-w-0 flex-1"><b className="block text-[14.5px] truncate">{title}</b><span className="hidden sm:block text-[11.5px] text-ink-3 truncate font-mono">{flag} {locale} · {domain}{rel}</span></div>
        {/* status, who has it, and what it is waiting for, in one group (the waiting line sits under the chips) */}
        <div className="flex flex-col items-start gap-0.5 flex-none">
          <div className="flex items-center gap-2">
            {status === "review" && !mayApprove && canEdit ? <button type="button" onClick={() => flowClick(4)} title="Remind the reviewer" className="rounded-full hover:ring-2 hover:ring-info/30"><Pill status={status} /></button> : <Pill status={status} />}
            {status === "review" && assignee && <AssigneeChip name={assigneeName} admin={isAdmin} marketId={marketId} pagePath={page.path} meId={user.id} onReassigned={(r) => { setAssignee(r.assignee); say(`Reassigned to ${r.assigneeName}`); router.refresh(); }} />}
          </div>
          {status === "review" && !mayApprove && <span className="hidden sm:inline text-[11px] text-ink-3 whitespace-nowrap pl-1">{assigneeName ? `Waiting for ${assigneeName.split(" ")[0]} to approve` : "Waiting for a reviewer"}{canEdit && <> · <button type="button" className="underline underline-offset-2 hover:text-ink" onClick={() => flowClick(4)}>Remind</button></>}</span>}
          {(status === "approved" || status === "scheduled") && !mayStatus("published") && <span className="hidden sm:inline text-[11px] text-ink-3 whitespace-nowrap pl-1">Waiting for a publisher</span>}
        </div>
        <div className="hidden sm:inline-flex border border-line-2 rounded-lg overflow-hidden">{(["desktop", "tablet", "mobile"] as const).map((d) => <button key={d} onClick={() => setDevice(d)} className={`px-2.5 h-8 grid place-items-center ${device === d ? "bg-ink text-white" : "text-ink-3 hover:text-ink"}`} title={d} aria-label={`${d} view`} aria-pressed={device === d}><Ico d={d === "desktop" ? "M3 4.5h18v11.5H3zM8.5 20h7M12 16v4" : d === "tablet" ? "M5.5 3h13v18h-13zM11 18h2" : "M8 2.5h8v19H8zM11 18.5h2"} /></button>)}</div>
        <div className="ml-auto flex items-center gap-2.5">
          {saving === "Save failed" ? <button className="hidden sm:inline text-xs text-crit bg-crit-soft rounded-full px-2.5 py-1 hover:underline" onClick={() => save().then(() => say("Saved")).catch(() => {})} title="Your last changes were not saved">Not saved · Retry</button>
            : <span className="hidden sm:inline text-xs text-ink-3 bg-surface-2 rounded-full px-2.5 py-1" aria-live="polite" title="Changes are saved automatically">{saving === "Unsaved" ? "Saving…" : saving === "Saved just now" || saving === "Saved" ? "✓ Saved" : saving}</span>}
          <div className="hidden md:flex gap-1 pl-2.5 border-l border-line"><button className={`btn btn-icon btn-sm ${left ? "on" : ""}`} onClick={() => setLeft(!left)} title="Components panel" aria-label="Components panel" aria-pressed={left}><Ico d="M3.5 4h17v16h-17zM9 4v16" /></button><button className={`btn btn-icon btn-sm ${right ? "on" : ""}`} onClick={() => { if (right) closeConfigure(true); else { setRightTab(sel ? "block" : "page"); setRight(true); } }} title="Page settings panel" aria-label="Page settings panel" aria-pressed={right}><Ico d="M3.5 4h17v16h-17zM15 4v16" /></button><button className={`btn btn-sm ${focus ? "on" : ""}`} onClick={() => (focus ? leavePreview() : setFocusMode(true))} title="Preview the page as visitors see it (⌘⇧F)" aria-pressed={focus}>{focus ? <><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>Exit preview</> : <><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>Preview</>}</button></div>
          <div className="flex gap-1 pl-2.5 border-l border-line">{!canEdit ? <span className="text-xs text-ink-3 px-2 self-center" title="Ask a site admin for Edit on this folder">🔒 Read-only</span> : locked ? <button className="btn btn-sm" onClick={() => void goEdit("blocks")} title={status === "published" ? "Change the page; the live version stays online until you publish again" : "Take the page back to editing"}><Ico d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />Edit</button> : null}
            {(status === "draft" || status === "failed") && mayStatus("review") && <button className="btn btn-sm btn-primary" onClick={openSend}>Send for review</button>}
            {status === "review" && mayApprove && <button className="btn btn-sm btn-primary" onClick={() => transition("approved", "Approved · ready to publish")}>Approve</button>}
            {(status === "approved" || status === "scheduled") && (mayStatus("published") ? <button className="btn btn-sm btn-primary" onClick={() => { if (dirty) save().catch(() => {}); setPublishing(true); }}>{status === "scheduled" ? "Publish / reschedule" : "Publish"}</button> : null)}
            </div>
        </div>
      </div>}
      {/* Flow stepper (hidden in preview) */}
      {!focus && <div className="flex items-center px-4 bg-surface border-b border-line overflow-hidden" role="list" aria-label="Page progress">
        <div className="flex-1 min-w-0 flex items-center overflow-hidden h-12">
          {STEPS.map((s, i) => { const done = i < cur || (cur === 6 && i === 6); const on = i === cur && cur !== 6; return <div key={s[0]} role="listitem" className={`flex items-center ${i < STEPS.length - 1 ? "flex-auto" : "flex-none"}`}>
            <button onClick={() => flowClick(i)} className={`flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-surface-3 text-[12.5px] flex-none ${on ? "text-ink font-semibold" : "text-ink-3"}`} title={`${s[0]} · ${s[1]}`}><i className={`flex-none w-6 h-6 rounded-full border-2 grid place-items-center not-italic text-[11px] font-bold ${done ? "bg-good border-good text-white" : on ? "bg-accent border-accent text-white shadow-[0_0_0_3px_var(--accent-soft)]" : "border-line-2"}`}>{done ? "✓" : i + 1}</i><span className={`leading-tight whitespace-nowrap ${on ? "" : "hidden sm:inline"}`}><span className="2xl:hidden">{STEP_SHORT[i]}</span><span className="hidden 2xl:inline">{s[0]}</span>{on && <small className="hidden 2xl:block text-[10.5px] text-ink-3 font-normal">{s[1]}</small>}</span></button>
            {i < STEPS.length - 1 && <span className={`flex-1 min-w-2 max-w-10 h-0.5 mx-1 ${i < cur ? "bg-good" : "bg-line"}`} />}</div>; })}
        </div>
        <div className="hidden xl:flex flex-none max-w-[30%] items-center gap-2 pl-3.5 border-l border-line text-[12.5px] text-ink-3 whitespace-nowrap overflow-hidden"><span className="text-[10.5px] tracking-[.08em] uppercase text-accent font-bold">Next</span><b className="text-ink truncate">{nextTxt}</b></div>
      </div>}
      {/* Body */}
      <div className="relative min-h-0 overflow-hidden bg-bg">
        <div className={`absolute inset-0 flex flex-col ${preview ? "preview" : ""}`}>
          {!focus && <div className="flex items-center gap-3 px-6 py-2 text-[12.5px] text-ink-3 border-b border-line bg-surface-2" style={{ paddingLeft: padL, paddingRight: padR }}><span className="mr-auto truncate" title={hint}>{hint}</span><span className="border border-line-2 rounded px-2 py-0.5 bg-surface whitespace-nowrap">1:1 · {device === "desktop" ? 1200 : device === "tablet" ? 768 : 390} px</span></div>}
          <div ref={canvasRef} className={`${focus ? "flex-1 overflow-auto p-0 bg-white" : "flex-1 overflow-auto p-6 pb-24"} ${canEdit && !locked && !preview && !focus ? "can-edit" : ""}`} style={{ paddingLeft: padL, paddingRight: padR }} onClick={onCanvasClick} onDoubleClick={onCanvasDouble} onKeyDown={onCanvasKey} onInput={onInlineInput}>
            {(() => { const fit = avail ? Math.max(0.3, Math.min(1, (avail - padL - padR - 2) / siteW)) : 1; return <div style={fit < 1 ? { width: siteW * fit, height: siteH ? siteH * fit : undefined, margin: "0 auto" } : undefined}><div ref={siteRef} style={fit < 1 ? { transform: "scale(" + fit + ")", transformOrigin: "top left", width: siteW } : undefined}>
            <AssetsContext.Provider value={assetMap}><EntitiesContext.Provider value={entities}><InlineEditContext.Provider value={inlineCtx}><SiteChrome marketName={marketName} crumbs={[...rel.split("/").filter(Boolean).slice(0, -1), title]} device={device}>
              {blocks.length ? blocks.map((b, i) => { const isSel = sel === b.id; const def = BLOCK_BY_TYPE[b.type]; return <div key={b.id} data-id={b.id} className={`cblk ${isSel ? "sel" : ""} ${isSel && mode === "edit" ? "editmode" : ""} ${b.props.hidden ? "hidden-blk" : ""} ${b.props.locked ? "locked" : ""}`} tabIndex={0}>
                <span className="tag">{def.name}{b.props.locked ? " · 🔒 locked" : ""}{b.props.hidden ? " · hidden" : ""}</span>
                {isSel && !preview && <ContextBar block={b} index={i} count={blocks.length} mode={mode} pop={pop} setPop={setPop} clipboard={clipboard} aiSeed={aiSeed}
                  onEdit={() => (mode === "edit" ? (commitInline(true), setMode("select")) : enterEdit(b.id))} onConfigure={phone ? () => configure(b.id) : undefined /* desktop: clicking the block already opens Configure */}
                  onMore={(a) => { setPop(null); if (a === "duplicate") duplicate(b); else if (a === "copy") { setClipboard(b); say("Copied"); } else if (a === "paste" && clipboard) { mutate((bl) => { const c = bl.slice(); c.splice(i + 1, 0, { ...clipboard, id: makeBlock(clipboard.type).id, props: { ...clipboard.props } }); return c; }); } else if (a === "up") move(b.id, -1); else if (a === "down") move(b.id, 1); else if (a === "hide") setProp(b.id, "hidden", !b.props.hidden); else if (a === "lock") { setProp(b.id, "locked", !b.props.locked); if (!b.props.locked) setMode("select"); } else if (a === "delete") remove(b.id); else if (a === "history") { if (phone) setLeftRaw(false); setRightTab("history"); setRight(true); } }}
                  onAi={(p) => { mutate((bl) => bl.map((x) => (x.id === b.id ? { ...x, props: { ...x.props, ...p.props } } : x))); say("AI changes applied"); }} />}
                <RenderBlock b={b} /></div>; })
              : <div className="m-7 p-11 border-2 border-dashed border-line-2 rounded-xl text-center text-ink-2 text-[15px]">How do you want to start this page?<small className="block text-[13px] text-ink-3 mt-1.5">Pick a layout, or add components one by one from the left.</small><div className="grid grid-cols-3 gap-3 mt-4 text-left">{TEMPLATES.filter((t) => t.blocks.length).slice(0, 3).map((t) => <button key={t.id} className="border border-line-2 bg-surface p-3.5 text-left hover:border-ink" onClick={() => mutate(() => t.blocks.map((x) => makeBlock(x, x === "mast" ? { heading: title } : {})))}><b className="block text-[13.5px]">{t.name}</b><small className="text-ink-3">{t.desc}</small></button>)}</div></div>}
            </SiteChrome></InlineEditContext.Provider></EntitiesContext.Provider></AssetsContext.Provider></div></div>; })()}
          </div>
          {editing && <div data-ui className="absolute left-1/2 -translate-x-1/2 bottom-6 flex gap-1 bg-[#0F1013] rounded-lg p-1 shadow-xl z-20 text-white text-xs" onMouseDown={(e) => e.preventDefault()}><span className="px-2 py-1.5 text-white/70">Editing text</span><button className="px-2.5 py-1.5 rounded hover:bg-white/15 inline-flex items-center" title="Choose content from an entity (or type {{ to insert at the cursor)" aria-label="Choose content from an entity" onClick={() => { setTokTyped(false); setContentPick({ target: "inline", label: "this text" }); }}><ContentIcon /></button><button className="px-3 py-1.5 rounded bg-good font-semibold" onClick={() => { commitInline(true); say("Saved"); }}>✓ Save</button><button className="px-3 py-1.5 rounded hover:bg-white/15" onClick={() => commitInline(false)}>✕ Cancel</button></div>}
          {ctaPop && selected && <div data-ui className="absolute left-1/2 -translate-x-1/2 bottom-6 w-[min(420px,calc(100vw-24px))] bg-surface border border-line rounded-xl shadow-2xl z-20 p-3.5 text-[13px]" onMouseDown={(e) => { e.stopPropagation(); if (!(e.target as HTMLElement).closest("input, textarea")) e.preventDefault(); }}>
            <div className="flex items-center mb-2.5"><b>Button</b><button className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={() => setCtaPop(null)} aria-label="Close">✕</button></div>
            <label className="block text-xs text-ink-2 font-medium">Label<input autoFocus className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink font-normal" value={String(selected.props[ctaPop.labelKey] ?? "")} onChange={(e) => setProp(selected.id, ctaPop.labelKey, e.target.value)} /></label>
            {ctaPop.linkKey && <label className="block text-xs text-ink-2 font-medium mt-2.5">URL<input className="mt-1 w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink font-mono font-normal" value={String(selected.props[ctaPop.linkKey] ?? "")} onChange={(e) => setProp(selected.id, ctaPop.linkKey!, e.target.value)} placeholder="/borrowing/credit-cards/apply" /></label>}
            <div className="flex justify-end mt-3"><button className="btn btn-sm btn-primary" onClick={() => setCtaPop(null)}>Done</button></div>
          </div>}
          {/* ✨ Ask AI: floating button → full-width bar at the bottom of the canvas. Read-only users get the hint instead. */}
        </div>
        {/* Left panel: Add / Outline */}
        {railsOn && !focus && !phone && <nav data-ui aria-label="Left panels" title={left ? "Click to collapse the panel" : "Click to open the panel"} onClick={(e) => { if (e.target === e.currentTarget) setLeftRaw(!left); /* empty rail area toggles the panel (last tab) */ }} className="absolute left-0 top-0 bottom-0 w-[52px] bg-surface border-r border-line flex flex-col items-center py-2 gap-1.5 z-[6] cursor-pointer">
          {LEFT_RAIL.map(([t, label, path]) => { const on = left; return <button key={t} type="button" title={label} aria-label={label} aria-pressed={on} onClick={() => setLeftRaw(!on)} className={`relative w-11 h-11 rounded-lg grid place-items-center ${on ? "bg-accent text-white" : "text-ink-2 hover:bg-surface-3"}`}><svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current fill-none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={path} /></svg></button>; })}
        </nav>}
        {left && railsOn && <LeftPanel phone={phone} width={leftW} onResizeStart={startResize("left")} canEdit={canEdit} onAdd={add} onClose={() => setLeft(false)} lockedReason={lockReason || undefined} onEdit={veilEdit} />}
        {/* Right panel: Configure (contextual) or Page settings */}
        {railsOn && !focus && <nav data-ui aria-label="Panels" title={phone ? undefined : right ? "Click to collapse the panel" : "Click to open the panel"} onClick={(e) => { if (phone || e.target !== e.currentTarget) return; if (right) closeConfigure(true); else { if (rightTab === "block" && sel) configure(sel); else setRight(true); } }} className={phone ? "absolute left-0 right-0 bottom-0 h-12 bg-surface border-t border-line flex flex-row items-center justify-around px-2 z-[6]" : "absolute right-0 top-0 bottom-0 w-[52px] bg-surface border-l border-line flex flex-col items-center py-2 gap-1.5 z-[6] cursor-pointer"}>
          {phone && LEFT_RAIL.map(([t, label, path]) => { const on = left; return <button key={t} type="button" title={label} aria-label={label} aria-pressed={on} onClick={() => { setLeftRaw(!on); if (!on) setRight(false); }} className={`w-11 h-11 rounded-lg grid place-items-center ${on ? "bg-accent text-white" : "text-ink-2 hover:bg-surface-3"}`}><svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current fill-none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={path} /></svg></button>; })}
          {phone && <span className="w-px h-6 bg-line" aria-hidden />}
          {RAIL.map(([t, label, path]) => { const on = right && rightTab === t; const badge = t === "insights" ? insightBadge : t === "content" ? Object.keys(bindings).length : t === "ai" ? aiTasks.filter((x) => x.stage !== "done").length : 0;
            return <button key={t} type="button" title={label} aria-label={label} aria-pressed={on} onClick={() => { if (on) { closeConfigure(true); return; } if (phone) setLeftRaw(false); if (t === "block" && sel) configure(sel); else { setRightTab(t); setRight(true); } }} className={`relative w-11 h-11 rounded-lg grid place-items-center ${on ? "bg-accent text-white" : "text-ink-2 hover:bg-surface-3"}`}>
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current fill-none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={path} /></svg>
              {badge > 0 && <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold grid place-items-center ${on ? "bg-white text-accent" : "bg-accent text-white"}`}>{badge}</span>}
            </button>; })}
        </nav>}
        {right && railsOn && <aside data-ui style={phone ? undefined : { width: rightW }} className={phone ? "absolute inset-x-0 top-0 bottom-12 bg-surface flex flex-col z-[5]" : "absolute right-[52px] top-0 bottom-0 max-w-[calc(100%-52px)] bg-surface border-l border-line flex flex-col z-[5] shadow-xl md:shadow-none"}>
          {!phone && <div role="separator" aria-orientation="vertical" aria-label="Resize panel" title="Drag to resize" onMouseDown={startResize("right")} className="absolute -left-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-accent/30 active:bg-accent/40 z-10" />}
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line"><b className="text-[13.5px]">{rightTab === "block" ? (selected ? `Configure · ${BLOCK_BY_TYPE[selected.type].name}` : "Configure") : rightTab === "page" ? "Page settings" : rightTab === "content" ? "Entities" : rightTab === "ai" ? "✨ AI assistant" : rightTab === "insights" ? "Page insights" : "Version history"}</b><button className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={() => closeConfigure(true)} aria-label="Close">✕</button></div>
          <LockedVeil on={!!lockReason && (rightTab === "block" || rightTab === "ai")} reason={lockReason} onEdit={veilEdit}>
          {rightTab === "insights" ? <div className="flex-1 overflow-auto p-3.5 text-[13px]"><InsightsPanel blocks={blocks} page={insightMeta} onFix={(apply, label) => { if (!canEdit) { say("Read-only: ask a site admin for Edit"); return; } mutate(apply); say(`Fixed: ${label}`); }} onSelectBlock={(id) => { select(id); const el = canvasRef.current?.querySelector<HTMLElement>(`.cblk[data-id="${id}"]`); el?.scrollIntoView({ block: "center", behavior: "smooth" }); }} /></div>
          : rightTab === "history" ? <div className="flex-1 overflow-auto p-3.5 text-[13px]"><VersionHistory marketId={marketId} path={page.path} currentBlocks={blocks.length} onRestored={() => { router.refresh(); say("Version restored · reloading"); setTimeout(() => window.location.reload(), 400); }} /></div>
          : rightTab === "content" ? <div className="flex-1 overflow-auto p-3.5 text-[13px]"><EntitiesPanel marketId={marketId} base={`/${marketId}/${envId}`} pagePath={page.path} bindings={bindings} entities={entities} models={models} blocks={blocks} canEdit={canEdit && !locked} onChange={setBindings} say={say} /></div>
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
            : !selected ? <div className="text-ink-3 p-2"><b className="block text-sm text-ink mb-1.5">Nothing selected</b>Click a block on the page to see its settings here.<div className="mt-3.5 flex flex-col gap-1.5">{blocks.slice(0, 8).map((k, ix) => <button key={k.id} className="btn btn-sm justify-start" onClick={() => configure(k.id)}>{ix + 1}. {BLOCK_BY_TYPE[k.type].name}</button>)}</div></div>
            : <ConfigForm block={selected} index={blocks.indexOf(selected)} count={blocks.length} marketId={marketId} setProp={(k, v) => setProp(selected.id, k, v)} entities={entities} canEdit={canEdit && !locked} onFieldFocus={(k, l, start, end) => { if (editing) commitInline(true); lastField.current = { blockId: selected.id, k, l, start, end }; }} onChoose={(k, l) => setContentPick({ target: "field", blockId: selected.id, k, l })} />}
          </div>}
          </LockedVeil>
          {rightTab === "block" && selected && !lockReason && <div className="flex justify-end gap-2 px-3.5 py-2.5 border-t border-line bg-surface"><button className="btn btn-sm" onClick={() => closeConfigure(false)}>Cancel</button><button className="btn btn-sm btn-primary" onClick={() => { closeConfigure(true); say("Component updated · Save the page when you're done"); }}>Save</button></div>}
        </aside>}
        {focus && <div aria-live="polite" className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-[#0F1013]/85 text-white text-[12px] px-3 py-1.5 rounded-full transition-opacity duration-700 ${fsHint ? "opacity-100" : "opacity-0 pointer-events-none"}`}>Preview · this is what visitors see · press Esc to go back to editing</div>}
        {/* formatting bar over the text being edited (long text fields only) */}
        {editing && inlinePos?.rich && !contentPick && <div data-ui className="fixed z-30 bg-[#0F1013] rounded-lg p-1 shadow-xl" style={{ top: inlinePos.barTop, left: inlinePos.barLeft }}><FormatBar getRoot={getEditingEl} state={fmt} dark lists={inlinePos.lists} /></div>}
        {editing && inlinePos && !contentPick && <button type="button" data-ui className="fixed z-30 w-7 h-7 rounded-full grid place-items-center bg-info text-white shadow-lg hover:scale-105 transition-transform" style={{ top: inlinePos.top, left: inlinePos.left }} onMouseDown={(e) => e.preventDefault()} onClick={() => { setTokTyped(false); setContentPick({ target: "inline", label: "this text" }); }} title="Choose content from an entity" aria-label="Choose content from an entity"><ContentIcon className="w-3.5 h-3.5" /></button>}
        {previewCheck && <ModalShell title="Does everything look right?" width={480} onClose={() => setPreviewCheck(false)}
          footer={<><button className="btn" onClick={() => { setPreviewCheck(false); void goEdit("content"); }}>No, keep editing</button><button className="btn btn-primary" onClick={() => { setPreviewCheck(false); openSend(); }}>Yes, send for review</button></>}>
          <p className="text-[13.5px]">You have just seen <b>{title}</b> the way customers will.</p>
          <ul className="text-[13px] text-ink-2 mt-2 grid gap-1 list-disc pl-5"><li>Texts, prices and rates are correct</li><li>Images and buttons are in the right place</li><li>Nothing is missing on phone and tablet</li></ul>
          {insightBadge > 0 && <p className="text-[12.5px] bg-warn-soft rounded-md px-3 py-2 mt-3">Page insights found {insightBadge} thing{insightBadge === 1 ? "" : "s"} to fix. You can still send it, but the reviewer will see them.</p>}
        </ModalShell>}
        {contentPick && <ContentPicker marketId={marketId} marketName={marketName} flag={flag} locale={locale} models={models} current={contentPick.target === "field" ? contentPick.l : undefined} onClose={() => { setContentPick(null); setTokTyped(false); editingEl.current?.focus({ preventScroll: true }); }} onPick={(c) => void applyContent(c)} />}
        {remind > 0 && (() => { const sent = typeof page.meta?.["ucp:sentAt"] === "string" ? String(page.meta["ucp:sentAt"]) : ""; const recent = !!remindedAt && remind - Date.parse(remindedAt) < 15 * 60_000; const who = assigneeName || "the reviewers";
          const sendIt = async () => { setReminding(true); try { const r = await ucpApi.remindReviewer(marketId, page.path); setRemindedAt(r.remindedAt); setRemind(0); say(`Reminder sent to ${r.reviewer}`); } catch (e) { say(e instanceof ApiError ? e.message : "Could not send the reminder"); } finally { setReminding(false); } };
          return <ModalShell title={`Remind ${assigneeName ? assigneeName.split(" ")[0] : "the reviewers"}?`} width={480} onClose={() => setRemind(0)}
            footer={<><button className="btn" onClick={() => setRemind(0)}>Cancel</button><button className="btn btn-primary" disabled={reminding || recent} onClick={sendIt}>{reminding ? "Sending…" : "Yes, send a reminder"}</button></>}>
            <p className="text-[13.5px]"><b>{title}</b> is waiting for {assigneeName ? <b>{assigneeName}</b> : "a reviewer"} to review it{sent ? <> since <span suppressHydrationWarning>{new Date(sent).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}</span></> : null}.</p>
            <p className="text-[13.5px] mt-2">Send {who} a reminder that you are waiting? It shows up in their notifications and at the top of their tasks.</p>
            {remindedAt && <p className={`text-[12.5px] rounded-md px-3 py-2 mt-3 ${recent ? "bg-warn-soft" : "bg-surface-2 text-ink-2"}`} suppressHydrationWarning>{recent ? "You sent a reminder a few minutes ago. Give them a moment before sending another." : `Last reminder: ${new Date(remindedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}`}</p>}
          </ModalShell>; })()}
        {backToReview && <ModalShell title="Review is already done" width={500} onClose={() => setBackToReview(false)}
          footer={<><button className="btn" onClick={() => setBackToReview(false)}>Keep approval</button><button className="btn btn-primary" onClick={async () => { const wasScheduled = status === "scheduled"; setBackToReview(false); await transition("review", `Back in review${assigneeName ? ` with ${assigneeName}` : ""}`); if (wasScheduled) { await repoApi.setProps(`${page.path}/jcr:content`, { "ucp:publishAt": null }).catch(() => {}); setPublishAt(undefined); } router.refresh(); }}>Send back to review</button></>}>
          <p className="text-[13.5px]">This page is <b>approved</b> and ready to publish.</p>
          <p className="text-[13.5px] mt-2">Sending it back removes the approval. {assigneeName ? `The reviewer, ${assigneeName}, has` : "A reviewer has"} to approve it again before it can go live.</p>
          {status === "scheduled" && publishAt && <p className="text-[13px] bg-warn-soft rounded-md px-3 py-2 mt-3">The scheduled publish on <b>{new Date(publishAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</b> is cancelled.</p>}
        </ModalShell>}
        {publishing && <PublishDialog marketId={marketId} envName={envName} pages={[{ path: page.path, title, status, publishAt }]} mayPublish={() => mayStatus("published")} onClose={() => setPublishing(false)}
          onDone={(r, m) => { const x = r[0]; setPublishing(false); if (!x?.ok) { say(x?.reason ?? "Nothing was published"); return; } setStatus(x.status as PageStatus); setPublishAt(undefined); say(m === "cancel" ? "Schedule cancelled · back to Approved" : m === "schedule" ? "Scheduled for publishing" : `Published to ${envName}`); router.refresh(); }} />}
        {sending && <SendForReviewModal marketId={marketId} pagePath={page.path} meId={user.id} onClose={() => setSending(false)} onSend={sendForReview} />}
        {translating && <TranslateModal marketId={marketId} path={page.path} title={title} onClose={() => setTranslating(false)} onDone={(created) => { say(`Created ${created.length} translation${created.length === 1 ? "" : "s"}`); router.refresh(); }} />}
        {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0F1013] text-white px-4 py-2.5 rounded-lg text-[13px] shadow-xl z-50">{toast}</div>}
      </div>
    </div>
  );
}

/* ---- contextual toolbar at the selected block: ✎ Edit · ✨ AI · ⋯ More (+ ⚙ Configure on phones, where clicking only selects) ---- */
function Btn({ children, on, onClick, disabled, title }: { children: React.ReactNode; on?: boolean; onClick: () => void; disabled?: boolean; title: string }) { return <button title={title} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onClick(); }} className={`px-2.5 py-1.5 rounded-md text-[12.5px] font-medium whitespace-nowrap disabled:opacity-40 ${on ? "bg-accent text-white" : "hover:bg-white/15"}`}>{children}</button>; }
type MoreAction = "duplicate" | "copy" | "paste" | "up" | "down" | "hide" | "lock" | "delete" | "history";
function ContextBar({ block: b, index, count, mode, pop, setPop, clipboard, aiSeed, onEdit, onConfigure, onMore, onAi }: { block: Block; index: number; count: number; mode: "select" | "edit"; pop: "ai" | "more" | null; setPop: (p: "ai" | "more" | null) => void; clipboard: Block | null; aiSeed?: string; onEdit: () => void; onConfigure?: () => void; onMore: (a: MoreAction) => void; onAi: (p: AiProposal) => void }) {
  const locked = !!b.props.locked; const editing = mode === "edit";
  const [prompt, setPrompt] = useState(""); const [proposal, setProposal] = useState<AiProposal | null>(null);
  const ask = (p: string) => { setPrompt(p); setProposal(proposeAi(p, b)); };
  // A prompt from the palette (aiSeed) pre-fills and runs the popover once per seed: state adjusted during render, no effect needed.
  const [seenSeed, setSeenSeed] = useState(""); if (pop === "ai" && aiSeed && aiSeed !== seenSeed) { setSeenSeed(aiSeed); setPrompt(aiSeed); setProposal(proposeAi(aiSeed, b)); }
  const items: [MoreAction, string, boolean?][] = [["duplicate", "Duplicate"], ["copy", "Copy"], ["paste", "Paste after", !clipboard], ["hide", b.props.hidden ? "Show" : "Hide"], ["lock", locked ? "Unlock" : "Lock"], ["history", "Version history"], ["delete", "Delete"]];
  return <div data-ui className="absolute -top-5 left-3 z-[4]" onMouseDown={(e) => { e.stopPropagation(); if (!(e.target as HTMLElement).closest("input, textarea")) e.preventDefault(); }} onDoubleClick={(e) => e.stopPropagation()}>
    <div role="toolbar" aria-label={`${BLOCK_BY_TYPE[b.type].name} actions`} className="flex items-center gap-0.5 bg-[#0F1013] text-white rounded-lg p-1 shadow-xl">
      <b className="px-2 text-[12px] text-white/70 border-r border-white/15 mr-0.5">{BLOCK_BY_TYPE[b.type].name}{locked ? " 🔒" : ""}{b.props.hidden ? " · hidden" : ""}</b>
      <Btn title={editing ? "Finish editing text" : "Edit text, images and buttons in place"} on={editing} onClick={onEdit} disabled={locked}>{editing ? "✓ Done" : "✎ Edit"}</Btn>
      {onConfigure && <Btn title="All properties, layout and behaviour" onClick={onConfigure}>⚙ Configure</Btn>}
      <Btn title="Ask AI to change this block" on={pop === "ai"} onClick={() => { setPop(pop === "ai" ? null : "ai"); setProposal(null); }} disabled={locked}>✨ AI</Btn>
      <span className="w-px h-5 bg-white/20 mx-0.5" aria-hidden />
      <Btn title="Move up" onClick={() => onMore("up")} disabled={index === 0 || locked}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" /></svg></Btn>
      <Btn title="Move down" onClick={() => onMore("down")} disabled={index === count - 1 || locked}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 5v14M5 12l7 7 7-7" /></svg></Btn>
      <Btn title="Delete block" onClick={() => onMore("delete")} disabled={locked}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></Btn>
      <Btn title="More actions" on={pop === "more"} onClick={() => setPop(pop === "more" ? null : "more")}>⋯</Btn>
    </div>
    {pop === "more" && <div role="menu" className="absolute left-0 top-full mt-1 w-44 bg-surface border border-line rounded-lg shadow-2xl py-1 text-[13px] text-ink">{items.map(([a, l, dis]) => <button key={a} role="menuitem" disabled={dis} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onMore(a); }} className={`w-full text-left px-3 py-1.5 hover:bg-surface-3 disabled:opacity-40 ${a === "delete" ? "text-accent border-t border-line mt-1" : ""}`}>{l}</button>)}</div>}
    {pop === "ai" && <div className="absolute left-0 top-full mt-1 w-[min(440px,calc(100vw-24px))] bg-surface border border-line rounded-xl shadow-2xl p-3.5 text-[13px] text-ink">
      <div className="flex items-center mb-2"><b>✨ What would you like to change?</b><span className="ml-auto text-[11px] text-ink-3">{BLOCK_BY_TYPE[b.type].name} only</span></div>
      {!proposal && <div className="flex flex-col gap-1 mb-2.5">{AI_SUGGESTIONS.map((s) => <button key={s} onMouseDown={(e) => e.preventDefault()} className="text-left px-2.5 py-1.5 rounded-md border border-line hover:border-ink hover:bg-surface-2" onClick={(e) => { e.stopPropagation(); ask(s); }}>“{s}”</button>)}</div>}
      {proposal && <div className="mb-2.5">
        <div className="text-[11.5px] text-ink-3 mb-1.5">{proposal.note}</div>
        {Object.entries(proposal.props).length > 0 && <div className="border border-line rounded-md divide-y divide-line max-h-60 overflow-auto">{Object.entries(proposal.props).map(([k, v]) => <div key={k} className="p-2"><div className="text-[10.5px] uppercase tracking-[.06em] text-ink-3 font-semibold">{k}</div><div className="line-through text-ink-3 text-[12px] break-words">{toPlain(b.props[k])}</div><div className="text-[12.5px] break-words">{toPlain(v)}</div></div>)}</div>}
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
type FieldFocus = (k: string, l: string, start: number, end: number) => void;
/** Remembers the caret of the last focused text field so token chips insert where the author was typing. */
const track = (k: string, l: string, fn: FieldFocus) => (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => { const t = e.currentTarget; fn(k, l, t.selectionStart ?? t.value.length, t.selectionEnd ?? t.value.length); };
/** "{ } Insert content" next to a text field: popover with the page's {{alias.field}} chips. */
/** Under a text field that inherits content: where it comes from, with a way to stop inheriting. */
function Inherited({ value, entities, onStop }: { value: string; entities: ResolvedEntities; onStop: (text: string) => void }) {
  const m = value.trim().match(/^\{\{\s*([a-zA-Z][\w-]*)\.([\w-]+)\s*\}\}$/); if (!m) return null; const e = entities[m[1]]; const v = e ? (m[2] === "title" ? e.values?.title ?? e.title : e.values?.[m[2]]) : undefined; const text = typeof v === "string" ? v : v === undefined ? "" : String(v);
  return <div className={`mt-1 flex items-center gap-2 text-[11.5px] rounded-md px-2 py-1 ${e ? "bg-info-soft text-info" : "bg-crit-soft text-crit"}`}><span className="min-w-0 truncate">{e ? <>⤓ From <b>{e.title}</b> · {m[2]}{text ? <> · “{text.replace(/<[^>]+>/g, " ").slice(0, 40)}”</> : null}</> : "Not linked to an entity on this page"}</span>{e && <button type="button" className="ml-auto flex-none underline" onClick={() => onStop(text)}>Stop inheriting</button>}</div>;
}
function ConfigForm({ block: selected, index, count, marketId, setProp, entities, canEdit, onFieldFocus, onChoose }: { block: Block; index: number; count: number; marketId: string; setProp: (k: string, v: unknown) => void; entities: ResolvedEntities; canEdit: boolean; onFieldFocus: FieldFocus; onChoose: (k: string, l: string) => void }) {
  const def = BLOCK_BY_TYPE[selected.type]; const P = selected.props;
  return <div className="flex flex-col gap-3">
    <div><b className="text-sm">{def.name}</b><div className="text-[11px] text-ink-3">Block {index + 1} of {count} · {def.desc}</div></div>
    <Section t="Content">{def.fields.map((f) => { const v = selected.props[f.k]; const invalid = f.req && !toPlain(v).trim(); return <div key={f.k}><label className="flex items-center text-xs text-ink-2 font-medium mb-1">{f.l}{(f.t === "text" || f.t === "textarea") && canEdit ? <button type="button" className="ml-auto mr-2 w-6 h-6 rounded grid place-items-center text-info hover:bg-info-soft" onMouseDown={(e) => e.preventDefault()} onClick={() => onChoose(f.k, f.l)} title="Choose content from an entity" aria-label={`Choose content from an entity for ${f.l}`}><ContentIcon /></button> : <span className="ml-auto" />}{f.req && <small className="font-mono text-[10.5px] text-ink-4">required</small>}</label>
      {f.t === "text" && !f.mono ? <RichField inline value={v} label={f.l} invalid={invalid} disabled={!canEdit} onChange={(html) => setProp(f.k, html)} onFocus={() => onFieldFocus(f.k, f.l, 0, 0)} />
      : f.t === "text" ? <input className={`w-full border rounded-md px-2.5 py-1.5 text-[13px] ${f.mono ? "font-mono" : ""} ${invalid ? "border-crit" : "border-line-2"}`} value={String(v ?? "")} onChange={(e) => setProp(f.k, e.target.value)} onFocus={track(f.k, f.l, onFieldFocus)} onSelect={track(f.k, f.l, onFieldFocus)} />
      : f.t === "textarea" && f.rich ? <RichField value={v} label={f.l} invalid={invalid} disabled={!canEdit} onChange={(html) => setProp(f.k, html)} onFocus={() => onFieldFocus(f.k, f.l, 0, 0)} />
      : f.t === "textarea" ? <textarea rows={4} className={`w-full border rounded-md px-2.5 py-1.5 text-[13px] ${invalid ? "border-crit" : "border-line-2"}`} value={String(v ?? "")} onChange={(e) => setProp(f.k, e.target.value)} onFocus={track(f.k, f.l, onFieldFocus)} onSelect={track(f.k, f.l, onFieldFocus)} />
      : f.t === "lines" ? <ListEditor rows={lines(v)} hint={f.hint} onChange={(rows) => setProp(f.k, joinLines(rows))} />
      : f.t === "select" ? <div className="flex gap-1">{f.o!.map((o) => <button key={o} className={`btn btn-sm capitalize ${v === o ? "on" : ""}`} onClick={() => setProp(f.k, o)}>{o}</button>)}</div>
      : f.t === "bool" ? <button className={`w-9 h-5 rounded-full relative ${v ? "bg-good" : "bg-line-2"}`} aria-pressed={!!v} onClick={() => setProp(f.k, !v)}><i className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${v ? "left-4" : "left-0.5"}`} /></button>
      : f.t === "asset" ? <AssetPicker marketId={marketId} value={String(v ?? "")} invalid={invalid} onChange={(id) => setProp(f.k, id)} />
      : <input className="w-full border border-line-2 rounded-md px-2.5 py-1.5 text-[13px] font-mono" value={String(v ?? "")} onChange={(e) => setProp(f.k, e.target.value)} />}
      {(f.t === "text" || f.t === "textarea") && <Inherited value={String(v ?? "")} entities={entities} onStop={(text) => setProp(f.k, text)} />}
      {invalid ? <div className="text-[11.5px] text-crit mt-1">Required before the page can be sent for review.</div> : f.hint && f.t !== "lines" ? <div className="text-[11.5px] text-ink-3 mt-1">{f.hint}</div> : null}</div>; })}</Section>
    <Section t="Layout"><div><label className="block text-xs text-ink-2 font-medium mb-1">Width</label><Seg P={P} setProp={setProp} k="layout" opts={["full", "contained", "narrow"]} /></div><div><label className="block text-xs text-ink-2 font-medium mb-1">Spacing</label><Seg P={P} setProp={setProp} k="spacing" opts={["default", "compact", "roomy"]} /></div></Section>
    <Section t="Behaviour"><Tog P={P} setProp={setProp} k="hidden" l="Hidden (not rendered on the live site)" /><Tog P={P} setProp={setProp} k="hideMobile" l="Hide on mobile" /><Tog P={P} setProp={setProp} k="locked" l="Locked (no edits until unlocked)" /><Tog P={P} setProp={setProp} k="personalise" l="Targeting enabled (Adobe Target segment)" /></Section>
    <Section t="Metadata"><div className="text-xs text-ink-2 font-medium">Node<div className="mt-1 font-mono text-[11.5px] bg-surface-2 border border-line rounded-md px-2.5 py-1.5 text-ink-2 break-all">jcr:content/root/{selected.id}</div></div><div className="text-xs text-ink-2 font-medium">sling:resourceType<div className="mt-1 font-mono text-[11.5px] bg-surface-2 border border-line rounded-md px-2.5 py-1.5 text-ink-2">hsbc/components/{selected.type}</div></div></Section>
  </div>;
}

function ListEditor({ rows, hint, onChange }: { rows: string[][]; hint?: string; onChange: (rows: string[][]) => void }) {
  const cols = (hint ?? "Value").split("|").map((c) => c.trim());
  const set = (r: number, c: number, v: string) => { const n = rows.map((x) => x.slice()); while (n[r].length <= c) n[r].push(""); n[r][c] = cellSafe(v); onChange(n); };
  return <div className="flex flex-col gap-2">{rows.map((r, ri) => <div key={ri} className="border border-line bg-surface-2 p-2.5 rounded-md"><div className="flex justify-between items-center mb-1"><b className="text-[12.5px]">Item {ri + 1}</b><span className="flex gap-0.5"><button className="btn btn-quiet btn-sm" disabled={ri === 0} onClick={() => { const n = rows.slice(); [n[ri - 1], n[ri]] = [n[ri], n[ri - 1]]; onChange(n); }} aria-label="Move up">↑</button><button className="btn btn-quiet btn-sm" disabled={ri === rows.length - 1} onClick={() => { const n = rows.slice(); [n[ri + 1], n[ri]] = [n[ri], n[ri + 1]]; onChange(n); }} aria-label="Move down">↓</button><button className="btn btn-quiet btn-sm" onClick={() => onChange(rows.filter((_, i) => i !== ri))} aria-label="Remove">✕</button></span></div>
    {cols.map((c, ci) => { const n = c.toLowerCase(); const plain = /icon|style|link|url/.test(n); const block = n.includes("text") || n.includes("answer");
      return <div key={ci} className="mt-1.5 text-[11.5px] text-ink-3">{plain ? <label className="block">{c}<input className="mt-0.5 w-full border border-line-2 rounded px-2 py-1 text-[13px] text-ink" value={r[ci] ?? ""} onChange={(e) => set(ri, ci, e.target.value)} /></label>
        : <><span className="block mb-0.5">{c}</span><RichField inline={!block} compact value={r[ci] ?? ""} label={`${c}, item ${ri + 1}`} onChange={(html) => set(ri, ci, html)} /></>}</div>; })}</div>)}
    <button className="btn btn-sm justify-center" onClick={() => onChange([...rows, cols.map(() => "")])}>＋ Add item</button></div>;
}

/* ---- ✨ Ask AI bar: full-width prompt at the bottom of the canvas (page level). Enter asks, Esc closes. ---- */
function Stage({ label, state, children }: { label: string; state: "done" | "on" | "todo"; children?: React.ReactNode }) {
  return <div className={`flex gap-2.5 ${state === "todo" ? "opacity-40" : ""}`}>
    <i className={`mt-0.5 w-5 h-5 flex-none rounded-full grid place-items-center not-italic text-[10px] font-bold ${state === "done" ? "bg-good text-white" : state === "on" ? "bg-accent text-white animate-pulse" : "border border-line-2 text-ink-3"}`}>{state === "done" ? "✓" : STAGES.indexOf(label as typeof STAGES[number]) + 1}</i>
    <div className="min-w-0 flex-1"><div className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold">{label}</div>{children}</div>
  </div>;
}
/* ---- AI side panel: history + thread of tasks (Understanding → Plan → Executing → Review → Done) + follow-up ---- */
const STAGES = ["Understanding", "Plan", "Executing", "Review", "Done"] as const;
type AiPanelProps = { tasks: AiTask[]; draft: string; setDraft: (v: string) => void; dirty: boolean; onAsk: (p: string) => void; onToggle: (t: AiTask, opId: string) => void; onRun: (t: AiTask) => void; onUndo: (t: AiTask, opId: string) => void; onRedo: (t: AiTask, opId: string) => void; onUndoAll: (t: AiTask) => void; onSave: () => void };
const applied = (t: AiTask) => t.done.filter((id) => !t.results[id]?.undone).length;
function AiPanel({ tasks, draft, setDraft, dirty, onAsk, onToggle, onRun, onUndo, onRedo, onUndoAll, onSave }: AiPanelProps) {
  const ref = useRef<HTMLDivElement>(null); const key = tasks.map((t) => `${t.id}:${t.stage}:${t.done.length}`).join("|");
  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight; }, [key]);
  const history = tasks.slice(0, -1);
  return <>
    <div ref={ref} className="flex-1 overflow-auto p-3.5 text-[13px] flex flex-col gap-4 min-h-0">
      {history.length > 0 && <div className="border border-line rounded-lg bg-surface-2 p-2.5"><div className="text-[10.5px] tracking-[.1em] uppercase text-ink-3 font-semibold mb-1">Earlier in this session</div>{history.map((t) => <div key={t.id} className="flex gap-2 text-[12px] py-0.5"><span className="truncate text-ink-2">{t.prompt}</span><span className="ml-auto flex-none text-ink-3">{applied(t)}/{t.plan.ops.length} applied</span></div>)}</div>}
      {!tasks.length && <div className="flex-1 flex flex-col justify-center items-center text-center px-2 py-6 gap-4">
        <div className="w-11 h-11 rounded-full bg-[#0F1013] text-white grid place-items-center text-xl" aria-hidden>✨</div>
        <div><b className="block text-[15px]">What would you like to do with this page?</b><p className="text-[12.5px] text-ink-3 mt-1 max-w-[280px]">You will see a plan first. Nothing changes until you run it, and every change can be undone.</p></div>
        <div className="flex flex-wrap justify-center gap-1.5 max-w-[320px]">{AI_EXAMPLES.flatMap((g) => g.items).map(([label, prompt, hint]) => <button key={label} type="button" title={hint} onClick={() => onAsk(prompt)} className="text-[12.5px] px-3 py-1.5 rounded-full border border-line-2 bg-surface text-ink-2 hover:border-ink hover:text-ink hover:bg-surface-2">{label}</button>)}</div>
        <p className="text-[11px] text-ink-4">With a block selected, the ✨ button on the block changes only that block.</p>
      </div>}
      {tasks.map((t, ti) => { const last = ti === tasks.length - 1; const ops = t.plan.ops; const enabled = ops.filter((o) => t.on[o.id]); const n = applied(t); const st = (s: typeof STAGES[number]): "done" | "on" | "todo" => { const order = { understanding: 0, plan: 1, executing: 2, done: 4 }[t.stage]; const i = STAGES.indexOf(s); return i < order || t.stage === "done" ? "done" : i === order ? "on" : "todo"; };
        return <div key={t.id} className={`flex flex-col gap-3 ${last ? "" : "opacity-80"}`}>
          <div className="self-end max-w-[85%] bg-ink text-white rounded-xl rounded-br-sm px-3 py-2 text-[13px]"><span className="block text-[10px] uppercase tracking-[.08em] text-white/60">You</span>{t.prompt}</div>
          <div className="border border-line rounded-xl p-3 flex flex-col gap-3 bg-surface">
            <b className="text-[13.5px]">✨ {t.plan.title}</b>
            <Stage label="Understanding" state={st("Understanding")}><p className="text-ink-2 mt-0.5">{t.plan.understanding}</p>{t.stage === "understanding" && <p className="text-[11.5px] text-ink-3 mt-1">Reading the page and working out what could be better…</p>}</Stage>
            {t.stage !== "understanding" && <Stage label="Plan" state={st("Plan")}>
              {t.plan.note && <p className="text-[12px] text-ink-3 mt-0.5 mb-1.5">{t.plan.note}</p>}
              {ops.length ? <ul className="flex flex-col gap-1 mt-1">{ops.map((o) => <li key={o.id}><label className={`flex gap-2 items-start ${t.stage === "plan" ? "cursor-pointer" : ""}`}><input type="checkbox" className="mt-1 accent-[#DB0011]" checked={!!t.on[o.id]} disabled={t.stage !== "plan"} onChange={() => onToggle(t, o.id)} /><span className={t.on[o.id] ? "" : "line-through text-ink-3"}>{o.label}</span></label></li>)}</ul> : <p className="text-ink-3 mt-1">Nothing to change.</p>}
              {t.stage === "plan" && <div className="mt-2.5"><p className="text-[11.5px] text-ink-3 mb-2">Untick anything you don’t want. Nothing changes until you run the plan.</p><div className="flex gap-2"><button className="btn btn-sm btn-primary" onClick={() => onRun(t)} disabled={!enabled.length && ops.length > 0}>{enabled.length ? `Run plan · ${enabled.length} change${enabled.length === 1 ? "" : "s"}` : "Nothing selected"}</button></div></div>}
            </Stage>}
            {(t.stage === "executing" || t.stage === "done") && <Stage label="Executing" state={st("Executing")}><ul className="flex flex-col gap-0.5 mt-1">{enabled.map((o) => { const d = t.done.includes(o.id); return <li key={o.id} className={`flex gap-2 ${d ? "text-ink" : "text-ink-3"}`}><span className={`w-4 flex-none ${d ? "text-good" : ""}`}>{d ? "✓" : "…"}</span><span>{o.label}</span></li>; })}</ul></Stage>}
            {t.stage === "done" && <Stage label="Review" state="done">
              <div className="flex flex-col gap-2 mt-1">{t.done.map((id) => { const o = ops.find((x) => x.id === id)!; const r = t.results[id]; if (!r) return null; return <div key={id} className={`border border-line rounded-md p-2 ${r.undone ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-2"><b className={`text-[12.5px] ${r.undone ? "line-through" : ""}`}>{o.label}</b>{r.undone ? <button className="btn btn-quiet btn-sm ml-auto flex-none" onClick={() => onRedo(t, id)}>Redo</button> : r.changes.length > 0 && <button className="btn btn-quiet btn-sm ml-auto flex-none" onClick={() => onUndo(t, id)}>Undo</button>}</div>
                {r.changes.length > 0 && <div className="mt-1 divide-y divide-line max-h-48 overflow-auto">{r.changes.map((c, i) => <div key={i} className="py-1 text-[12px]"><span className="font-semibold">{c.block}</span>{c.field && <span className="text-ink-3"> · {c.field}</span>}{c.before !== undefined && c.after !== undefined ? <div className="break-words"><span className="line-through text-ink-3">{c.before || "(empty)"}</span> → <span>{c.after || "(empty)"}</span></div> : <div className={c.after ? "text-good" : "text-ink-3"}>{c.after ?? c.before}</div>}</div>)}</div>}
              </div>; })}</div>
              {n > 0 && <button className="btn btn-sm mt-2" onClick={() => onUndoAll(t)}>Undo all</button>}
            </Stage>}
            {t.stage === "done" && <Stage label="Done" state="done"><p className="mt-0.5">Applied {n} of {enabled.length} change{enabled.length === 1 ? "" : "s"}{n > 0 ? " · Save the page to keep them" : "."}</p>{n > 0 && <p className="text-[11.5px] text-ink-3 mt-1">Changed something you didn’t mean to? Use Undo next to that change, or Undo all.</p>}{n > 0 && <button className="btn btn-sm btn-primary mt-2" onClick={onSave} disabled={!dirty}>{dirty ? "Save page" : "Saved"}</button>}</Stage>}
          </div>
        </div>; })}
    </div>
    <form className="px-3.5 py-3 border-t border-line bg-surface" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) onAsk(draft); }}>
      <div className="border border-line-2 rounded-xl bg-surface focus-within:border-ink focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
        <textarea rows={3} className="w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-[14px] leading-snug outline-none" placeholder={tasks.length ? "Ask a follow-up… e.g. “make the banner light” or “add an FAQ about fees”" : "What would you like to do with this page?\ne.g. “Make the intro shorter and add a call to action”"} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (draft.trim()) onAsk(draft); } }} aria-label="Ask AI" />
        <div className="flex items-center gap-2 px-2 pb-2"><span className="text-[11px] text-ink-3">Enter to ask · Shift+Enter for a new line</span><button className="btn btn-sm btn-primary ml-auto" disabled={!draft.trim()}>✨ Ask</button></div>
      </div>
    </form>
  </>;
}
