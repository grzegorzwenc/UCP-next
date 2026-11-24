"use client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startEditorTour, tourSeen } from "@/lib/editor/tour";
import { DEVICE_W, DEVICES, type Device } from "@/lib/ucp/devices";
import { Check, Lock, Languages, Sparkles, MoreHorizontal, ChevronLeft, ChevronDown, Users, Undo2, Redo2, GripVertical, Maximize2, Minimize2, Eye, Send, Settings, History, Copy, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut } from "@/components/shadcn/dropdown-menu";
import type { Block, PageView, PageStatus } from "@/lib/api/types";
import { repoApi, ucpApi, ApiError } from "@/lib/api";
import { blocksToComponents, componentsToBlocks } from "@/lib/repo/mapping";
import { BLOCK_BY_TYPE, makeBlock, lines, joinLines, missingRequired, TEMPLATES, channelOf, groupsFor, isMessagingPath, emailRegion, arrangeEmail, MESSAGING_FOLDER, isFormTemplate, isFormsPath, FORMS_FOLDER } from "@/lib/blocks/registry";
import { FormSettings } from "./panels/FormSettings";
import { FormFlowPanel, FormNav, FormPageSwitch, FormProgress, RuleChips, SubmitPageView, hiddenOnView, viewOfBlock } from "./panels/FormFlow";
import { RuleList, useFormFlow, type FormView } from "@/components/forms/rules";
import { FIELD_TYPES as FORM_FIELD_TYPES } from "@/lib/forms/model";
import { MessageSettings } from "./panels/MessageSettings";
import { FormContract } from "@/components/forms/FormContract";
import { MessageContract } from "@/components/messaging/MessageContract";
import { RenderBlock, SiteChrome, MessageChrome, FormChrome, AssetsContext, EntitiesContext, InlineEditContext } from "@/lib/blocks/Render";
import { bindingsOf, hasTokens, type ResolvedEntities } from "@/lib/ucp/tokens";
import type { Bindings } from "@/lib/ucp/types";
import { ContentPicker, ContentIcon, type ContentChoice } from "./ContentPicker";
import { EntitiesPanel, uniqueAlias, type ContentModelInfo } from "./LinkedContent";
import { PublishDialog } from "@/components/pages/PublishDialog";
import { ModalShell } from "@/components/models/ModalShell";
import { SendForReviewModal, AssigneeChip, type ReviewBody } from "./SendForReview";
import { AssetPicker } from "./AssetPicker";
import { proposeAi, AI_SUGGESTIONS, type AiProposal } from "@/lib/ai/mock";
import { planFor, revertOp, type Plan, type Change } from "@/lib/ai/planner";
import { useSession } from "@/components/shell/Session";
import { useShellMode } from "@/components/shell/useShellMode";
import { InsightsPanel, VersionHistory, TranslateModal, pageInsights } from "@/components/builder";
import { LeftPanel, type LeftTab } from "./LeftPanel";
import { AuthorsChip, type PageAuthor } from "./Authors";
import { JiraChip } from "@/components/ui/JiraChip";
import { SavePatternDialog, PatternMarketsDialog } from "./PatternDialog";
import { toParts, fromPattern, type DesignPattern } from "@/lib/blocks/patterns";
import { LockedVeil } from "./LockedVeil";
import { PanelSection } from "./panels/PanelSection";
import { PanelRightOpen } from "lucide-react";
import { GripStrip, panelClass, PanelBody, CollapsedRail, IconTabs, CollapseButton, RAIL_W } from "./panels/PanelFrame";
import { useFloat } from "./panels/useFloat";
import { EditorVeil } from "./EditorSkeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/shadcn/sheet";
import { JiraPanel } from "./JiraPanel";
import { jiraLabel } from "@/lib/ucp/jira";
import { ShareReviewDialog } from "@/components/tasks/ShareReviewDialog";
import { useConfirm } from "@/components/ui/Confirm";
import { ReviewedChoice } from "@/components/tasks/ReviewedChoice";
import { FloatingPanel, CommentIcon } from "@/components/review/FloatingPanel";
import { DecisionOverlay } from "@/components/review/DecisionOverlay";
import { pickAt, flash, markTarget, findTarget, type PickTarget } from "@/lib/review/pick";
import { QualityChecklist, type QcTarget } from "./QualityChecklist";
import { PageComments } from "@/components/builder/PageComments";
import { FormatBar, RichField, useFormatState, prepareEditable } from "./RichTextEditor";
import { normalizeRich, cellSafe, toPlain } from "@/lib/blocks/richtext";
import { useRouter } from "next/navigation";
import { permForStatus } from "@/lib/ucp/perms";

type Props = { marketId: string; envId: string; marketName: string; flag: string; domain: string; locale: string; envName: string; root: string; page: PageView; /** Open straight into the visitor preview (?preview=1). */ startInPreview?: boolean; names?: Record<string, string>; models?: ContentModelInfo[]; entities?: ResolvedEntities; /** forms only: the page the form is shown on */ host?: { path: string; title: string } };
type RightTab = "block" | "page" | "content" | "ai" | "insights" | "comments" | "jira" | "history";
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
const PATTERN_ICON = "M4 4h7v7H4zM13 4h7v7h-7zM4 13h16v7H4z"; // three components joined into one
/* Phones only. On desktop the left panel's own tabs do this job, so there is no left rail. */
const FLOW_ICON = "M5 4h6v6H5zM13 14h6v6h-6zM8 10v4h8M16 14v-2";
const LEFT_RAIL: [LeftTab, string, string][] = [["components", "Add a component", "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 8.5v7M8.5 12h7"], ["patterns", "Design patterns", PATTERN_ICON], ["outline", "Outline", "M4 6h2M4 12h2M4 18h2M9 6h11M9 12h11M9 18h11"]];
const FORM_LEFT_RAIL: [LeftTab, string, string][] = [["flow", "Steps & pages", FLOW_ICON], ...LEFT_RAIL];
/* Page settings first: it is what the panel opens on, so it leads the rail. */
/* Version history is not here: it opens from the Save-draft menu, with the other page-level
   actions. Page settings stays, and leads, because it is what the panel opens on. */
const RAIL: [RightTab, string, string][] = [["page", "Page settings", "M6 3h8l5 5v13H6zM14 3v5h5M9 13h6M9 17h6"], ["block", "Component settings", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"], ["content", "Entities", "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"], ["ai", "AI assistant", "M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 15l.6 1.6L7.2 17l-1.6.6L5 19.2l-.6-1.6L2.8 17l1.6-.4z"], ["insights", "Page insights", "M12 3a9 9 0 1 0 9 9M12 3v9l6.4-6.4M12 12l4 4"], ["comments", "Comments", "M4 5h16v11H9l-5 4zM8 9h8M8 12.5h5"], ["jira", "Jira", "M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM15 7v2.5M15 12v0M15 14.5V17"]];


/** false: the new eleven-step stepper in the top bar. true: our charcoal status bar along the bottom. */
const BOTTOM_BAR = false;
/** false: the Jira tab is hidden. The panel, its API and its server side all stay — this only takes
 *  it out of the right rail, so turning it back on is this one line. */
const JIRA_TAB = false;
/** The right rail as shown: the Jira tab is held back for now. */
const RAIL_SHOWN = () => RAIL.filter(([t]) => JIRA_TAB || t !== "jira");
/** Short step names used when the stepper is narrow (same order as STEPS). */
const STEP_SHORT = ["Build", "Preview", "Share", "Waiting", "Assigned", "In review", "Biz waiting", "Business", "Ready", "Live"];
/* Build it, check it yourself, optionally show the business, then the two reviews and publish.
   "Build the draft" and "Build the page" used to be separate steps either side of the business
   share; they are the same activity, so they are one step and sharing moved after Preview — you
   look at it before anyone else does. Share and the business review are both optional. */
const STEPS = [["Build the page", "Add blocks and fill in the content"], ["Preview", "See it exactly as visitors will"], ["Share with the business", "Optional · the business sees the draft by link and comments"], ["Waiting for a reviewer", "Sent · no reviewer has taken it yet"], ["Assigned to reviewer", "A reviewer has taken it · not started yet"], ["In author's review", "The reviewer is checking it"], ["Waiting for business review assignment", "Optional · no business reviewer has taken it yet"], ["In business review", "Business sign-off"], ["Ready to publish", "Reviewed · click Publish"], ["Published", "Live for customers"]];
/** Steps a page can skip: sharing the draft, and the business review. */
const OPTIONAL = new Set([2, 6, 7]);
/** Page progress cells: one look for all of them, the accent colour says what the cell is. */
type FlowTone = "prev" | "cur" | "act" | "next" | "todo";
const FLOW_TONE: Record<FlowTone, { bar: string; cap: string; bg: string }> = {
  prev: { bar: "bg-good", cap: "text-good", bg: "" },
  cur: { bar: "bg-brand", cap: "text-brand", bg: "bg-brand-soft/60" },
  act: { bar: "bg-ink-3", cap: "text-ink-3", bg: "bg-surface-2" },
  next: { bar: "bg-info", cap: "text-info", bg: "" },
  todo: { bar: "bg-line-2", cap: "text-ink-4", bg: "" },
};
function FlowCell({ tone, caption, className = "", current, group, title, children }: { tone: FlowTone; caption: string; className?: string; current?: boolean; group?: boolean; title?: string; children: React.ReactNode }) {
  const t = FLOW_TONE[tone];
  return <div role={group ? "group" : "listitem"} aria-label={group ? caption : undefined} aria-current={current ? "step" : undefined} title={title} className={`relative flex flex-col items-center justify-start gap-1 min-w-0 px-3 pt-2 text-center text-sm text-ink cursor-default select-none ${t.bg} ${className}`}>
    <span aria-hidden className={`absolute inset-x-0 top-0 h-[3px] ${t.bar}`} />
    <span className={`text-xs leading-none uppercase tracking-[.08em] font-semibold whitespace-nowrap ${t.cap}`}>{caption}</span>
    <span className="flex items-center justify-center h-7 min-w-0 max-w-full">{children}</span>
  </div>;
}
function StepDot({ n, done, tone }: { n: number; done: boolean; tone: FlowTone }) {
  return <i className={`flex-none w-5 h-5 rounded-full grid place-items-center not-italic text-xs font-bold ${done ? "bg-good text-white" : tone === "cur" ? "bg-brand text-white" : tone === "next" ? "border border-info text-info" : "border border-line-2 text-ink-3"}`}>{done ? "✓" : n}</i>;
}
/** Phones show one action: the first step after Build the draft that has one, else Build the draft. */
const MOBILE_ORDER = [...STEPS.keys()].slice(1, -1).concat(0);


/**
 * Interaction model (three levels):
 *   hover        → subtle outline + component name
 *   click        → select; Configure opens on the right; contextual toolbar at the block: Edit · AI · More (Configure on phones)
 *   double-click → straight into inline edit
 * Edit never opens the right panel; Configure does (with Cancel / Save).
 */
const EMPTY_NAMES: Record<string, string> = {}; const EMPTY_MODELS: ContentModelInfo[] = []; const EMPTY_ENTS: ResolvedEntities = {};
/** Line icon in the rail style (1.7 stroke, round joins) for the top bar buttons. */
function Ico({ d }: { d: string }) { return <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none flex-none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>; }

export function Builder({ marketId, envId, marketName, flag, domain, locale, envName, root, page, startInPreview = false, names = EMPTY_NAMES, models = EMPTY_MODELS, entities: initialEntities = EMPTY_ENTS, host }: Props) {
  const { can, user } = useSession(); const isAdmin = user.role === "admin" || !!user.perms.root?.manage;
  /* Pages → Lock: nobody else changes a locked page (whoever locked it and site admins still can) */
  const pageLock = (() => { const raw = page.meta?.["ucp:pageLock"]; if (typeof raw !== "string" || !raw) return null; try { return JSON.parse(raw) as { by: string; name: string; at: string }; } catch { return null; } })();
  const lockedByOther = !!pageLock && pageLock.by !== user.id && !isAdmin;
  const canEdit = can("edit", page.path) && !lockedByOther; const mayStatus = (s: PageStatus) => can(permForStatus[s], page.path);
  const [blocks, setBlocks] = useState<Block[]>(() => componentsToBlocks(page.components));
  const [status, setStatus] = useState<PageStatus>(page.status);
  const [flowOpen, setFlowOpenRaw] = useState(false);
  const [backTo, setBackTo] = useState<number | null>(null); const backToRef = useRef<number | null>(null); backToRef.current = backTo; // "Go back to this step?" shown inside the list (no dialog on top of the dropdown)
  const setFlowOpen = (v: boolean) => { setFlowOpenRaw(v); setBackTo(null); };
  /* Her dropdown closed itself on an outside mousedown via `flowRef`. The list is a Sheet now,
     which brings its own outside-click and Escape handling — and `flowRef` is attached to
     nothing, so `flowRef.current` was null and the handler closed the drawer on every click,
     including the Share button inside it. */
  const [shareIn, setShareIn] = useState<"bar" | "drawer">("bar"); // where "Share draft" was pressed
  const [shareClosing, setShareClosing] = useState(false); // playing the fold-away before it unmounts
  const closeDrawerShare = () => { setShareClosing(true); window.setTimeout(() => { setShareClosing(false); setShare(false); }, 180); };
  const [draftPhase, setDraftPhase] = useState<"draft" | "shared" | "build">(() => { const v = page.meta?.["ucp:draftPhase"]; return v === "shared" || v === "build" ? v : "draft"; });
  const [title, setTitle] = useState(page.title);
  const [sel, setSel] = useState<string | null>(null);
  const [mode, setMode] = useState<"select" | "edit">("select");
  const [pop, setPop] = useState<"ai" | "more" | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [preview, setPreviewRaw] = useState(!canEdit || startInPreview); // read-only users always see the preview; ?preview=1 opens straight into it
  const { phone, tablet } = useShellMode();
  const [left, setLeftRaw] = useState(true); const [right, setRight] = useState(true); // the right panel opens on Page settings, as in the mock
  // Panel widths are draggable (min 260, max 560) and remembered per browser.
  /* Both panels are a fixed width. They used to be drag-resizable and remembered per browser;
     that went with the mock-parity pass — one-line rows need no more room, and a width the
     author has to manage on every page is a setting pretending to be a feature. */
  const leftW = 280;  // the mock's 14.5rem, plus room between the tabs and the dock/collapse pair
  const rightW = 320; // settings fields and their labels, without the form feeling boxed in
  /* Focus mode: both panels go to nothing — not even their slim bars — and the canvas takes the
     width, while the toolbar stays and the page stays editable. Distinct from `focus`, which in
     this editor is the full visitor preview. Opening either panel leaves it, so there is never a
     panel on screen that focus mode claims to have hidden. */
  const [zen, setZen] = useState(false);
  const setLeft = (v: boolean) => { setLeftRaw(v); if (v) setZen(false); };
  // On a phone or tablet start with the matching rendition so the 1:1 page fits the screen; desktop stays at its full width.
  const [shellSeen, setShellSeen] = useState({ phone: false, tablet: false }); // adjusted during render when the shell mode changes (no effect needed)
  if (shellSeen.phone !== phone || shellSeen.tablet !== tablet) { setShellSeen({ phone, tablet }); if (phone) { setLeftRaw(false); setDevice("mobile"); } else if (tablet) { setLeftRaw(false); setDevice("tablet"); } } // tablet: both panels plus a page do not fit, so the palette starts collapsed
  const [rightTab, setRightTab] = useState<RightTab>("page");
  /* A detached panel floats over the canvas instead of reserving a column, so the padding below
     treats it as closed and the page gets the width back. */
  const [leftFloating, setLeftFloating] = useState(false);
  /* Authors moved out of the top bar and into the page-actions menu; the panel opens under the
     split button, which is the control that now owns it. */
  const actionsRef = useRef<HTMLDivElement>(null);
  const [authorsSignal, setAuthorsSignal] = useState(0);
  const rightFloat = useFloat(); // Configure / Page settings can be detached and dragged over the canvas
  const [translating, setTranslating] = useState(false); const router = useRouter();
  const [description, setDescription] = useState(page.description ?? "");
  const [aiTasks, setAiTasks] = useState<AiTask[]>([]); const [aiDraft, setAiDraft] = useState("");
  const [focus, setFocus] = useState(false);
  const [cfgSnapshot, setCfgSnapshot] = useState<Record<string, unknown> | null>(null);
  /** Set when Component settings was opened by a quick fix, so closing it goes back to the
   *  findings list rather than shutting the rail and losing your place in it. */
  const backToInsights = useRef(false);
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
  /* Messages (pages under Messaging) use this same builder and workflow; only the frame, the palette and the way back differ. */
  const channel = channelOf(page.template); const isMsg = isMessagingPath(page.path, root);
  /* Forms too: built on the page that hosts them, with the Form settings panel for rules, flow and submission. */
  const isForm = isFormTemplate(page.template) && isFormsPath(page.path, root); const kindLabel = isForm ? "Form" : isMsg ? "Message" : "Page";
  /* A form is a set of pages (each step, the Submit page, Success, Failure); the canvas shows one at a time. */
  const flow = useFormFlow(page.meta, page.path, page.title, (m) => say(m));
  const [formView, setFormViewRaw] = useState<FormView>({ page: "step", step: 0 });
  const [contractOpen, setContractOpen] = useState(false);
  const selected = blocks.find((b) => b.id === sel);
  const missing = useMemo(() => blocks.reduce((n, b) => n + missingRequired(b).length, 0), [blocks]);
  /* Page lifecycle. Draft pages move between "blocks" (structure), "content" (fill in) and "preview" (visitor view) by clicking the steps;
     review / approved / published are read-only stages set by the workflow status. "Edit" always brings you back to editing the same page. */
  const [, setStage] = useState<"blocks" | "content">(() => (page.components.length ? "content" : "blocks"));
  const locked = status === "review" || status === "inreview" || status === "reviewed" || status === "bizreview" || status === "approved" || status === "scheduled" || status === "published";
  /* one step at a time: a draft is on Build until it has been previewed, then on Preview (changing the content sends it back to Build) */
  /* "The author has looked at it" is a step in the workflow, so it lives on the page, not in this
     component. It used to be plain component state: a reload put the page back to Build, and a
     reviewer opening it saw a different step from the author. Editing clears it — a page changed
     since it was last previewed has not really been previewed. */
  const [previewed, setPreviewedRaw] = useState(() => page.meta?.["ucp:previewed"] === "true");
  const previewedRef = useRef(previewed);
  const setPreviewed = useCallback((v: boolean) => {
    if (previewedRef.current === v) return;
    previewedRef.current = v; setPreviewedRaw(v);
    void repoApi.setProps(`${page.path}/jcr:content`, { "ucp:previewed": v ? "true" : null }).catch(() => {});
  }, [page.path]);
  const inAuthor = status === "review" || status === "inreview"; // waiting for / in the author's review
  const [lockedSeen, setLockedSeen] = useState(false); // locked stages are read-only: switch to preview and drop the selection when the status changes
  if (lockedSeen !== locked) { setLockedSeen(locked); if (locked) { setPreviewRaw(true); setSel(null); setMode("select"); setPop(null); } else if (canEdit) setPreviewRaw(false); }
  /* Review stages (author's review, business review): click a component to comment on it; Version history (with the comments) opens by itself */
  const reviewMode = status === "inreview" || status === "bizreview";
  const [reviewSeen, setReviewSeen] = useState(false);
  const [commentTarget, setCommentTarget] = useState<PickTarget | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({}); const [commentTotal, setCommentTotal] = useState(0);
  const [commentAbout, setCommentAbout] = useState<{ id: string; label: string } | null>(null); const [commentFocus, setCommentFocus] = useState(0); // "Comment" on a version
  const [floatOpen, setFloatOpen] = useState(true); // full screen: the floating comments card
  /* Author's preview (Build the page → Preview): a quality checklist that follows the pointer; a click pins what it shows */
  const [qcTarget, setQcTarget] = useState<QcTarget | null>(null); const [qcPinned, setQcPinned] = useState(false); const [qcOpen, setQcOpen] = useState(true);
  const qcMode = focus && canEdit && (status === "draft" || status === "failed");
  useEffect(() => { markTarget(canvasRef.current, commentTarget); }, [commentTarget, focus, blocks]); // outline the picked text or asset
  useEffect(() => { const root = canvasRef.current; root?.querySelectorAll(".qc-on").forEach((e) => e.classList.remove("qc-on")); if (qcMode && qcTarget) findTarget(root, qcTarget)?.classList.add("qc-on"); }, [qcMode, qcTarget, blocks]); // outline what the checklist shows
  if (reviewSeen !== reviewMode) { setReviewSeen(reviewMode); if (reviewMode && !phone) { setRightTab("comments"); setRight(true); } if (!reviewMode) setCommentTarget(null); }
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  /** In review only the assigned reviewer (or a site admin) approves; unassigned legacy reviews fall back to the Review permission. */
  const iWrote = !isAdmin && String(page.meta?.["ucp:requestedBy"] || page.meta?.["ucp:sentBy"] || "") === user.id; // the author never takes their own page from the Backlog (site admins may, to walk the whole flow)
  const mayApproveSelf = mayStatus("reviewed") && (assignee ? assignee === user.id : !iWrote);
  const mayClaim = !assignee && !iWrote && mayStatus("reviewed"); // a reviewer (not the author) takes it from the Backlog
  const mayApprove = mayApproveSelf || isAdmin; const onBehalf = !mayApproveSelf && isAdmin; // site admins may approve for the reviewer // author's review: the assigned reviewer only; site admins reassign, they do not approve for someone else
  /* business review: anyone with Review (or the person a site admin assigned in Tasks), never the one who did the author's review */
  const [authorReviewer, setAuthorReviewer] = useState(() => { const v = page.meta?.["ucp:authorReviewedBy"]; return typeof v === "string" ? v : ""; }); // four eyes: who did the author's review
  const [bizTaken, setBizTaken] = useState(() => (page.meta?.["ucp:taskKind"] === "BizReview" && typeof page.meta?.["ucp:taskAssignee"] === "string" ? String(page.meta["ucp:taskAssignee"]) : ""));
  const bizAssignee = status === "bizreview" ? bizTaken : "";
  /* a business review is "in" once a person took it or a group got access; until then it waits for assignment */
  const [bizGroups, setBizGroups] = useState<string[]>(() => { try { return JSON.parse(String(page.meta?.["ucp:reviewGroups"] ?? "[]")) as string[]; } catch { return []; } });
  const bizAssigned = status === "bizreview" && (!!bizAssignee || bizGroups.length > 0);
  const [decide, setDecide] = useState(false); // "Reviewed": send to business review or reauthor
  const early = status === "draft" || status === "failed"; // still the author's: build, preview, share
  /* Build (0) → Preview (1) → Share (2), then the review chain from 3. `draftPhase` only
     distinguishes "the business has the link" from the rest; previewing moves 0 → 1. */
  const cur = early
    ? (draftPhase === "shared" ? 2 : focus || previewed ? 1 : 0)
    : 3 + (status === "published" ? 6 : status === "approved" || status === "scheduled" ? 5 : status === "bizreview" ? (bizAssigned ? 4 : 3) : status === "reviewed" || status === "inreview" ? 2 : status === "review" ? (assignee ? 1 : 0) : 0);
  const LAST = STEPS.length - 1;
  const bizName = bizAssignee ? names[bizAssignee] ?? bizAssignee : "";
  const mayBizSelf = mayStatus("approved") && (bizAssignee ? bizAssignee === user.id : authorReviewer !== user.id);
  const mayBizApprove = mayBizSelf || isAdmin;
  const bizOnBehalf = !mayBizSelf && isAdmin;
  const maySendBiz = canEdit && mayStatus("bizreview"); // after the author's review, the author (anyone with Edit) sends it to the business review
  const [commentCount, setCommentCount] = useState(0); // comments on the page (review links included), shown on the Version history rail button
  useEffect(() => { let live = true; ucpApi.comments(marketId, page.path).then((l) => live && setCommentCount(l.filter((c) => !c.resolved).length), () => {}); return () => { live = false; }; }, [marketId, page.path, rightTab, right]);
  const [share, setShare] = useState(false); // "Share for review" dialog: link + e-mail invite (opens after sending, and when the business review starts)

  /* ---- Undo / redo ----
     Every change to the page goes through `mutate`, so history only has to wrap that one
     function: snapshot the blocks before the change, drop the redo branch, apply. The stacks
     are refs (they must be read synchronously inside handlers) with a counter to re-render the
     buttons' disabled state. Capped at 50 steps so a long session cannot grow without bound. */
  const HISTORY_MAX = 50;
  const past = useRef<Block[][]>([]); const future = useRef<Block[][]>([]);
  const [histTick, setHistTick] = useState(0);
  const touched = () => { setDirty(true); setSaving("Unsaved"); setPreviewed(false); setHistTick((k) => k + 1); };
  const mutate = useCallback((fn: (b: Block[]) => Block[]) => {
    past.current = [...past.current.slice(-(HISTORY_MAX - 1)), blocksRef.current];
    future.current = [];
    /* e-mails: the header and footer stay put (edit only); everything else lives in the body between them */
    setBlocks((b) => (channel === "email" ? arrangeEmail(fn(b), b) : fn(b)));
    setDirty(true); setSaving("Unsaved"); setPreviewed(false); setHistTick((k) => k + 1);
  }, [setPreviewed, channel]);
  const canUndo = past.current.length > 0, canRedo = future.current.length > 0;
  void histTick; // the counter exists to re-render the buttons when the stacks change
  const undo = () => {
    const prev = past.current.pop(); if (!prev) return;
    future.current = [blocksRef.current, ...future.current];
    setBlocks(prev); select(null); touched();
  };
  const redo = () => {
    const next = future.current.shift(); if (!next) return;
    past.current = [...past.current, blocksRef.current];
    setBlocks(next); select(null); touched();
  };
  const setProp = (id: string, k: string, v: unknown) => mutate((b) => b.map((x) => (x.id === id ? { ...x, props: { ...x.props, [k]: v } } : x)));
  const blockName = (id: string) => { const b = blocksRef.current.find((x) => x.id === id); return b ? BLOCK_BY_TYPE[b.type].name : "Component"; };
  /** Review: pick a text, an asset or a component to comment on (like Build the page, but nothing is edited). */
  const pickForComment = (el: HTMLElement) => { const t = pickAt(el, blockName); if (!t) return; setCommentTarget(t); if (focus) setFloatOpen(true); else { setRightTab("comments"); setRight(true); } };
  /** A comment's chip: scroll to the text, asset or component it is about and flash it. */
  const showBlock = (r: { id: string; field?: string }) => { if (!flash(canvasRef.current, r)) say("That part is not on the page any more"); };
  const onCommentList = (l: { block?: { id: string }; resolved?: unknown }[]) => { const open = l.filter((x) => !x.resolved); const c: Record<string, number> = {}; for (const x of open) if (x.block) c[x.block.id] = (c[x.block.id] ?? 0) + 1; setCommentCounts(c); setCommentTotal(open.length); setCommentCount(open.length); }; // resolved comments stay in the list but leave the page
  const reviewProps = reviewMode ? { target: commentTarget, onClearTarget: () => setCommentTarget(null), onShowBlock: showBlock, onList: onCommentList } : { onShowBlock: showBlock, onList: onCommentList };
  const select = (id: string | null) => { if (id && isForm) { const v = viewOfBlock(blocks, id); if (v) setFormViewRaw(v); } setSel(id); setMode("select"); setPop(null); setMulti([]); if (id) setZen(false); if (id && right && rightTab === "block") setCfgSnapshot(blocks.find((b) => b.id === id)?.props ?? null); };
  /** Scroll a block into view once React has painted it. */
  const [qcFlash, setQcFlash] = useState(""); // the block the quality checklist just pointed at
  const revealBlock = (id: string) => requestAnimationFrame(() => requestAnimationFrame(() => {
    canvasRef.current?.querySelector<HTMLElement>(`.cblk[data-id="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }));
  /* `at` is where a drag dropped it; without one the block goes after the selection, or at the
     end when nothing is selected — which is off-screen on a long page, so we scroll to it. */
  const add = (type: string, at?: number) => { if (channel === "email" && emailRegion(type) !== "body") { const ex = blocksRef.current.find((x) => x.type === type); if (ex) { select(ex.id); revealBlock(ex.id); openCfgPanel(ex.id); say(`${BLOCK_BY_TYPE[type].name} is part of the fixed ${emailRegion(type)}: edit it here`); return; } }
    const nb = makeBlock(type); mutate((b) => { const i = at ?? (sel ? b.findIndex((x) => x.id === sel) + 1 : b.length); const c = b.slice(); c.splice(i, 0, nb); return c; }); select(nb.id); revealBlock(nb.id); say(`${BLOCK_BY_TYPE[type].name} added · click Edit to fill it in`); };

  /* ---- Drag a component from the palette onto the page ----
     Native HTML5 drag: the palette rows are the source, the canvas is the target, and a line
     shows where it would land. No drag library — one list and one insertion point does not
     need one, and `dropAt` is the only state it takes. */
  const DRAG_TYPE = "application/x-ucp-block";
  const PATTERN_TYPE = "application/x-ucp-pattern";
  const MOVE_TYPE = "application/x-ucp-move"; // a block already on the page, being reordered
  const [movingId, setMovingId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const canDrop = canEdit && !locked && !preview && !focus;
  /** Index the pointer is closest to: above a block's middle means before it, below means after. */
  const dropIndexAt = (y: number) => {
    const els = [...(canvasRef.current?.querySelectorAll<HTMLElement>(".cblk") ?? [])];
    if (!els.length) return 0;
    for (let i = 0; i < els.length; i++) { const r = els[i].getBoundingClientRect(); if (y < r.top + r.height / 2) return i; }
    return els.length;
  };
  const onCanvasDragOver = (e: React.DragEvent) => {
    const dt = e.dataTransfer;
    const moving = dt.types.includes(MOVE_TYPE);
    if (!canDrop || !(dt.types.includes(DRAG_TYPE) || dt.types.includes(PATTERN_TYPE) || moving)) return;
    e.preventDefault(); dt.dropEffect = moving ? "move" : "copy";
    const i = dropIndexAt(e.clientY); if (i !== dropAt) setDropAt(i);
  };
  const onCanvasDrop = (e: React.DragEvent) => {
    if (!canDrop) return;
    const type = e.dataTransfer.getData(DRAG_TYPE);
    const patternId = type ? "" : e.dataTransfer.getData(PATTERN_TYPE);
    const moveId = type || patternId ? "" : e.dataTransfer.getData(MOVE_TYPE);
    if (!type && !patternId && !moveId) return;
    e.preventDefault();
    const at = dropAt ?? dropIndexAt(e.clientY); setDropAt(null);
    if (moveId) { setMovingId(null); moveBlockTo(moveId, at); return; }
    if (type) { add(type, at); return; }
    const pat = (patterns ?? []).find((x) => x.id === patternId);
    if (pat) addPattern(pat, at);
  };
  /** Move a block to an index in the page order. `to` is the gap it was dropped into. */
  const moveBlockTo = (id: string, to: number) => {
    mutate((bl) => {
      const from = bl.findIndex((x) => x.id === id);
      if (from < 0) return bl;
      const c = bl.slice(); const [b] = c.splice(from, 1);
      c.splice(to > from ? to - 1 : to, 0, b); // removing it first shifts every later gap down one
      return c;
    });
    select(id); revealBlock(id);
  };
  const move = (id: string, d: number) => fixedPart(blocksRef.current.find((x) => x.id === id)?.type ?? "") ? say("The e-mail header and footer stay in place") : mutate((b) => { const i = b.findIndex((x) => x.id === id); const j = i + d; if (j < 0 || j >= b.length) return b; const c = b.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; });
  const fixedPart = (type: string) => channel === "email" && emailRegion(type) !== "body";
  const remove = (id: string) => { const t = blocksRef.current.find((x) => x.id === id)?.type ?? ""; if (fixedPart(t)) { say(`The e-mail ${emailRegion(t)} is fixed: you can edit it, not remove it`); return; } mutate((b) => b.filter((x) => x.id !== id)); select(null); };
  const duplicate = (b: Block) => fixedPart(b.type) ? say(`The e-mail ${emailRegion(b.type)} is fixed: you can edit it, not copy it`) : mutate((bl) => { const i = bl.findIndex((x) => x.id === b.id); const c = bl.slice(); c.splice(i + 1, 0, { ...b, id: makeBlock(b.type).id, props: { ...b.props } }); return c; });
  const configure = (id: string) => { setSel(id); setMode("select"); setPop(null); setZen(false); setRightTab("block"); setRight(true); setCfgSnapshot(blocks.find((b) => b.id === id)?.props ?? null); };
  /** Clicking a component opens Configure with its fields right away (not on phones, where the panel would cover the page). */
  const openCfgPanel = (id: string) => { if (phone || !canEdit || locked) return; setRightTab("block"); setRight(true); setCfgSnapshot(blocksRef.current.find((b) => b.id === id)?.props ?? null); };
  const closeConfigure = (keep: boolean) => { if (!keep && sel && cfgSnapshot) mutate((b) => b.map((x) => (x.id === sel ? { ...x, props: cfgSnapshot } : x))); setCfgSnapshot(null); if (backToInsights.current) { backToInsights.current = false; setRightTab("insights"); setRight(true); } else setRight(false); };
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

  /* ---- inline editing (only in Edit mode): click a text, Enter saves, Esc cancels ---- */
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
    if (tokTyped) { const r = caret.current && el.contains(caret.current.startContainer) ? caret.current : null; if (r && r.startContainer.nodeType === 3 && r.startOffset >= 2 && (r.startContainer.textContent ?? "").slice(r.startOffset - 2, r.startOffset) === "{{") { r.setStart(r.startContainer, r.startOffset - 2); r.deleteContents(); const t = document.createTextNode(token); r.insertNode(t); r.setStartAfter(t); r.collapse(true); sel?.removeAllRanges(); sel?.addRange(r); setTokTyped(false); say(`Inserted ${c.entity.title} · ${c.field.l}. Press Save.`); return; } }
    if (el.dataset.rich !== undefined) { const r0 = caret.current && el.contains(caret.current.startContainer) ? caret.current : null; if (r0) { sel?.removeAllRanges(); sel?.addRange(r0); } document.execCommand("insertText", false, token); setTokTyped(false); say(`Inserted ${c.entity.title} · ${c.field.l}. Click outside or Save.`); return; }
    setTokTyped(false); el.innerText = token; const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); sel?.removeAllRanges(); sel?.addRange(r);
    say(`This text now shows ${c.entity.title} · ${c.field.l}. Press Save.`);
  }
  /** Leaving Preview on a draft asks whether the page is right: yes → Send for review, no → back to the content. */
  const leavePreview = () => { setFocusMode(false); if (canEdit && (status === "draft" || status === "failed")) setPreviewed(true); };
  /* ---- Focus mode (⌘⇧F): hides the editor's own toolbar, stepper and panels (the `focus` branches
     in the grid below). The app sidebar and top bar no longer need hiding — the editor is in its own
     `(editor)` route group and never renders them. `body.focus` and the `ucp:focus` event stay so
     other parts of the shell can still react. ---- */
  const panelsBeforeFocus = useRef<{ left: boolean; right: boolean; preview: boolean } | null>(null);
  const [fsHint, setFsHint] = useState(false);
  const leaveFocusState = () => { setFocus(false); document.body.classList.remove("focus"); window.dispatchEvent(new CustomEvent("ucp:focus", { detail: { on: false } })); const b = panelsBeforeFocus.current; if (b) { setLeftRaw(b.left); setRight(b.right); setPreviewRaw(b.preview); panelsBeforeFocus.current = null; } };
  const setFocusMode = (on: boolean) => {
    // Preview = the page exactly as visitors see it, inside the browser tab: no toolbar, no block outlines, no panels. Esc brings the authoring layout back.
    if (on) { panelsBeforeFocus.current = { left, right, preview }; setFlowOpen(false); setLeftRaw(false); setRight(false); setPop(null); if (editing) commitInline(true); select(null); setPreviewRaw(true); setFocus(true); document.body.classList.add("focus"); window.dispatchEvent(new CustomEvent("ucp:focus", { detail: { on: true } })); setFsHint(true); setTimeout(() => setFsHint(false), 3500); }
    else leaveFocusState();

  };
  useEffect(() => () => { document.body.classList.remove("focus"); }, []);

  async function save(extra: { status?: PageStatus } = {}) {
    setSaving("Saving…");
    try {
      if (!canEdit) { if (extra.status) await repoApi.updateContent(page.path, { status: extra.status }); setSaving("Saved just now"); return; } // reviewers without Edit only move the status (sign off, reauthor)
      await repoApi.saveComponents(page.path, blocksToComponents(blocksRef.current)); await repoApi.updateContent(page.path, { title: titleRef.current, description: descRef.current, status, ...extra }); setDirty(false); setSaving("Saved just now");
    }
    catch (e) { setSaving("Save failed"); say(e instanceof ApiError ? `${e.problem.title} · request ${e.requestId ?? "n/a"}` : String(e)); throw e; }
  }
  /* Autosave: 1.2 s after the last change the draft is saved. There is no Save button any more. */
  const saveRef = useRef(save); useEffect(() => { saveRef.current = save; });
  /* ---- Close the editor (the X in the toolbar) ----
     The editor is its own shell now, so leaving it is a navigation, not a panel toggle.
     Autosave means there is nothing to ask about: a pending edit is flushed first and the
     veil says so, because `save()` is a real round trip and a dead button would read as a
     hang. A failed save keeps the author in the editor — `save()` has already said why. */
  const [closing, setClosing] = useState<string | null>(null);
  const libraryHref = isForm ? `/${marketId}/${envId}/forms${rel.slice(FORMS_FOLDER.length + 1).replace(/\/[^/]+$/, "")}` : isMsg ? `/${marketId}/${envId}/messaging${rel.slice(MESSAGING_FOLDER.length + 1).replace(/\/[^/]+$/, "")}` : `/${marketId}/${envId}/pages${rel.replace(/\/[^/]+$/, "")}`;
  async function closeEditor() {
    if (closing) return;
    if (editing) commitInline(true);
    if (dirty && canEdit && !locked) {
      setClosing("Saving changes…");
      try { await saveRef.current(); }
      catch { setClosing(null); return; }
    }
    setClosing("Closing editor");
    router.push(libraryHref);
  }
  useEffect(() => { if (!dirty || !canEdit || locked || editing) return; const id = setTimeout(() => { saveRef.current().catch(() => {}); }, 1200); return () => clearTimeout(id); }, [dirty, blocks, title, description, canEdit, locked, editing]);
  /** Why the page cannot move to `next` (permission, or required fields before review); says it and returns true when blocked. */
  const critRef = useRef(0); // kept current below, so `blocked` can see the insight count
  function blocked(next: PageStatus) {
    /* A page with unfixed critical insights cannot go to review. Every one of them is the author's
       to fix and the reviewer cannot: an empty required field, a broken content link, an image with
       no alt text, a missing page title, an empty page. Sending anyway only moved the work to
       somebody who would have to send it straight back. */
    if (next === "review" && critRef.current > 0) {
      say(`Fix ${critRef.current} issue${critRef.current === 1 ? "" : "s"} before sending it for review`);
      openRight("insights");
      return true;
    }
    if (!mayStatus(next)) { say(`You don't have ${permForStatus[next] === "publish" ? "Publish" : permForStatus[next] === "review" ? "Review & approve" : "Edit"} on this folder`); return true; }
    if (next === "review" && missing) { say(`Fill in ${missing} required field${missing === 1 ? "" : "s"} first`); const b = blocks.find((x) => missingRequired(x).length); if (b) configure(b.id); return true; }
    return false;
  }
  /** Business review → back to the author (Reviewers can do it without Edit): the page returns to Build the page. */
  const ask = useConfirm();
  /* ---- Design patterns: Shift-click components to group them, save the group, add it to any page in one click ---- */
  const [multi, setMulti] = useState<string[]>([]); const [savingPattern, setSavingPattern] = useState(false);
  /* ---- Authors (Build the page): several people can be assigned to build the page together ---- */
  const [authors, setAuthors] = useState<PageAuthor[]>(() => { try { const v = JSON.parse(String(page.meta?.["ucp:authors"] ?? "[]")) as PageAuthor[]; return Array.isArray(v) ? v : []; } catch { return []; } });
  const firstStage = status === "draft" || status === "failed";
  async function authorAction(a: "join" | "leave" | "add" | "remove", id?: string) {
    try { const r = await ucpApi.pageAuthors(marketId, page.path, a, id); setAuthors(r.authors); say(a === "join" ? `You are an author of this page${r.authors.length > 1 ? ` with ${r.authors.filter((x) => x.id !== user.id).map((x) => x.name.split(" ")[0]).join(", ")}` : ""}` : a === "leave" ? "You are no longer an author of this page" : a === "add" ? `${names[id ?? ""] ?? "They"} can now build this page too` : "Removed from the authors"); }
    catch (e) { say(e instanceof ApiError ? e.problem.title : "Could not change the authors"); }
  }
  /* Jira ticket for this page (Page settings), shown as a chip next to the title */
  const [jira, setJira] = useState(() => (typeof page.meta?.["ucp:jira"] === "string" ? String(page.meta["ucp:jira"]) : "")); const [jiraDraft, setJiraDraft] = useState(jira); const [jiraErr, setJiraErr] = useState("");
  async function saveJira(v: string) { setJiraErr(""); try { const r = await ucpApi.pageJira(marketId, page.path, v); setJira(r.jira); setJiraDraft(r.jira); say(r.jira ? "Jira ticket linked" : "Jira link removed"); } catch (e) { setJiraErr(e instanceof ApiError ? e.problem.title : "Could not save the link"); } }
  /* Jira panel (from main): the same link as Page settings keeps, but it returns the error text
     instead of setting `jiraErr`, because the panel shows its own. Keeping one `jira` state means
     linking in either place updates both. `jiraOn` is the integration switch — with it on, every
     page comment copies to the ticket — and `commentsRev` makes the Comments tab reload when the
     panel has added one. */
  async function linkJira(v: string): Promise<string> { try { const r = await ucpApi.pageJira(marketId, page.path, v); setJira(r.jira); setJiraDraft(r.jira); say(r.jira ? "Jira ticket linked" : "Jira link removed"); return ""; } catch (e) { return e instanceof ApiError ? e.problem.title : "Could not save the link"; } }
  const [jiraOn, setJiraOn] = useState(() => page.meta?.["ucp:jiraIntegrate"] === "true");
  const [commentsRev, setCommentsRev] = useState(0);
  const [patternMode, setPatternMode] = useState(false); // "Create a design pattern": a plain click picks components instead of editing them
  const startPattern = (first?: string) => { if (editing) commitInline(true); setSel(null); setMode("select"); setPop(null); setMulti(first ? [first] : []); setPatternMode(true); };
  const stopPattern = () => { setPatternMode(false); setMulti([]); };
  const [leftTab, setLeftTab] = useState<LeftTab>(isForm ? "flow" : "components");
  const goForm = (v: FormView) => { setFormViewRaw(v); setSel(null); setPop(null); };
  const addFormStep = () => { const n = blocks.filter((b) => b.type === "formstep").length; mutate((bl) => { const c = bl.slice(); const at = c.findIndex((b) => b.type === "fsuccess"); c.splice(at < 0 ? c.length : at, 0, makeBlock("formstep", { title: `Step ${n + 1}` })); return c; }); setFormViewRaw({ page: "step", step: n }); say(`Step ${n + 1} added · add fields to it from Components`); }; const [patterns, setPatterns] = useState<DesignPattern[] | null>(null); const [patMarkets, setPatMarkets] = useState<DesignPattern | null>(null);
  const loadPatterns = useCallback(() => ucpApi.patterns(marketId).then(setPatterns, () => setPatterns([])), [marketId]);
  useEffect(() => { loadPatterns(); }, [loadPatterns]);
  const multiBlocks = blocks.filter((b) => multi.includes(b.id)); // in page order
  const toggleMulti = (id: string) => setMulti((m) => { const base = m.length || patternMode ? m : sel && sel !== id ? [sel] : []; return base.includes(id) ? base.filter((x) => x !== id) : [...base, id]; });
  const addPattern = (p: DesignPattern, at?: number) => { const nb = fromPattern(p); if (!nb.length) return; mutate((b) => { const i = at ?? (sel ? b.findIndex((x) => x.id === sel) + 1 : b.length); const c = b.slice(); c.splice(i, 0, ...nb); return c; }); select(nb[nb.length - 1].id); say(`${p.name} added · ${nb.length} components`); revealBlock(nb[0].id); };
  const mayManagePattern = (p: DesignPattern) => isAdmin || (!p.builtIn && p.by === user.id); // design-system ones: site admins only
  async function savePattern(v: { name: string; desc: string; markets: string[] }): Promise<string | null> {
    try { const p = await ucpApi.savePattern(marketId, { ...v, parts: toParts(multiBlocks) }); setSavingPattern(false); stopPattern(); await loadPatterns(); setLeftTab("patterns"); setLeft(true); say(`Saved · ${p.name} is in Design patterns${v.markets.length && !v.markets.includes(marketId) ? " (not shown in this market)" : ""}`); return null; }
    catch (e) { return e instanceof ApiError ? e.problem.title : "Could not save the pattern"; }
  }
  /** Duplicate this page beside itself, with the blocks as they are now, and open the copy. */
  async function duplicatePage() {
    const parent = page.path.replace(/\/[^/]+$/, "");
    const base = page.path.split("/").pop() ?? "page";
    try {
      const copy = await repoApi.createPage({ parentPath: parent, name: `${base}-copy`, title: `${title} (copy)`, template: page.template ?? "", components: blocksToComponents(blocksRef.current) });
      say(`Duplicated as ${copy.title}`);
      router.push(`/${marketId}/${envId}/page${copy.path.replace(root, "")}`);
    } catch (e) { say(e instanceof ApiError ? e.problem.title : "Could not duplicate the page"); }
  }
  /** Delete the page for good, after asking. Goes back to the library afterwards. */
  async function deletePage() {
    const r = await ask({ title: `Delete “${title}”?`, body: <>This removes the page and everything on it. It cannot be undone.{status === "published" ? <><br /><br />This page is <b>live</b>. Deleting it here does not take it off {domain} until the next publish.</> : null}</>, confirmLabel: "Delete", danger: true });
    if (r !== true) return;
    try { await repoApi.deletePage(page.path, true); say(`${title} deleted`); router.push(libraryHref); }
    catch (e) { say(e instanceof ApiError ? e.problem.title : "Could not delete the page"); }
  }
  /** Remove: archiving is the default (it can be restored); deleting for good is the second choice. */
  async function removePattern(p: DesignPattern) {
    const r = await ask({ title: `Archive “${p.name}”?`, body: <>Archived patterns leave the library but are kept, so anyone who manages them can <b>restore</b> them later. Pages that already use it keep their components.<br /><br />Deleting removes it for good and cannot be undone.</>, confirmLabel: "Archive", alt: { label: "No, delete permanently…", danger: true } });
    if (r === true) { await ucpApi.archivePattern(marketId, p.id, true).then(loadPatterns, () => say("Could not archive")); say(`${p.name} archived · restore it from Archived at the bottom`); }
    else if (r === "alt") await deletePatternForGood(p, true);
  }
  async function deletePatternForGood(p: DesignPattern, fromRemove = false) {
    if (!(await ask({ title: `Delete “${p.name}” permanently?`, body: <>It cannot be restored afterwards.{fromRemove ? <> If you might need it again, Cancel and choose <b>Archive</b>.</> : null} Pages that already use it keep their components.</>, confirmLabel: "Delete permanently", danger: true, typeToConfirm: "delete" }))) return;
    try { if (!p.archived) await ucpApi.archivePattern(marketId, p.id, true); await ucpApi.deletePattern(marketId, p.id); say(`${p.name} deleted`); } catch { say("Could not delete the pattern"); } loadPatterns();
  }
  async function reauthor(confirmed = false) {
    if (!confirmed && !(await ask({ title: "Send it back to the author?", body: <><b>{title}</b> goes back to the first step, Build the page. The author changes it and sends it for review again · both reviews start over.</>, confirmLabel: "Reauthor" }))) return;
    setStatus("draft"); try { await save({ status: "draft" }); setAssignee(""); setAuthorReviewer(""); setBizTaken(""); setBizGroups([]); setPreviewed(false); say("Sent back to the author · the page is at Build the page again"); router.refresh(); } catch { setStatus(status); }
  }
  /** Reviewed → on to the business review (it then waits for a business reviewer to take it). */
  async function sendToBiz() {
    const was = status; try {
      if (was === "inreview") { setStatus("reviewed"); await save({ status: "reviewed" }); setAuthorReviewer(user.id); }
      setStatus("bizreview"); await save({ status: "bizreview" }); setBizTaken(""); setBizGroups([]);
      say(onBehalf && was === "inreview" ? `Reviewed on behalf of ${assigneeName || "the reviewer"} · waiting for a business reviewer` : "Sent to business review · now share it with the business"); setShare(true); router.refresh(); // next step: share it (a person, a group or a link)
    } catch { setStatus(was); }
  }
  /** Full screen, business review: sign off or send back straight from the floating comments, then a full-screen confirmation. */
  const [decidedB, setDecidedB] = useState<{ decision: "signoff" | "reauthor"; at: string } | null>(null); const [askingB, setAskingB] = useState<"signoff" | "reauthor" | null>(null);
  async function decideFS(decision: "signoff" | "reauthor") {
    const was = status; const next: PageStatus = decision === "signoff" ? "approved" : "draft"; setStatus(next); setAskingB(null);
    try { await save({ status: next }); if (decision === "reauthor") { setAssignee(""); setAuthorReviewer(""); setBizTaken(""); setBizGroups([]); } setDecidedB({ decision, at: new Date().toISOString() }); router.refresh(); }
    catch { setStatus(was); }
  }
  async function claimBiz() {
    try { const r = await ucpApi.claimBizReview(marketId, page.path); setBizTaken(r.assignee); say("The business review is yours · sign it off or reauthor"); router.refresh(); }
    catch (e) { say(e instanceof ApiError ? e.message : "Could not take the business review"); }
  }
  async function transition(next: PageStatus, msg: string) {
    if (blocked(next)) return;
    setStatus(next); if (next === "reviewed") setAuthorReviewer(user.id); try { await save({ status: next }); say(msg); if (next === "bizreview" && isAdmin) setShare(true); } catch { setStatus(status); }
  }
  /* Send for review goes through the modal (to the Backlog, open to all reviewers + note); the same checks as a plain transition apply first. */
  const openSend = () => { if (status !== "draft" && status !== "failed") { say(inAuthor ? "Already in review" : "Already past review"); return; } if (blocked("review")) return; setPop(null); setSending(true); };
  /** Take the review from the Backlog (assigned to me, not started yet → the Assigned step). */
  async function claim() {
    try { const r = await ucpApi.claimReview(marketId, page.path); setAssignee(r.assignee); say("Assigned to you · start the review when you are ready"); router.refresh(); }
    catch (e) { say(e instanceof ApiError ? e.message : "Could not take the review"); }
  }
  async function sendForReview(body: ReviewBody) {
    if (dirty) await save();
    const r = await ucpApi.sendForReview(marketId, page.path, body);
    setSending(false); setAssignee(r.assignee); setStatus("review"); say("Sent for review · it is in the Backlog, any reviewer can take it"); router.refresh(); // sharing by link / e-mail is for the business review only
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
      if ((e.metaKey || e.ctrlKey) && e.key === ".") { e.preventDefault(); setZen((v) => !v); return; } // focus mode: hide both panels
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        const t = e.target as HTMLElement | null;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return; // let the field undo its own text
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "s") { e.preventDefault(); if (canEdit && !locked && dirty) { if (editing) commitInline(true); void saveRef.current().then(() => say("Saved"), () => {}); } return; } // ⌘S / Ctrl+S saves now
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
    const b = blocks.find((x) => x.id === id); if (!b || b.props.locked) { say("This block is locked. Unlock it from the More menu."); return; }
    setSel(id); setMode("edit"); setPop(null);
    const ie = target?.closest<HTMLElement>(".ie") ?? canvasRef.current?.querySelector<HTMLElement>(`.cblk[data-id="${id}"] .ie`) ?? undefined;
    // A token span may have been remounted by the commit that just happened: look it up again by its key.
    if (ie) { const k = ie.dataset.inline ?? ""; setTimeout(() => { const el = ie.isConnected ? ie : canvasRef.current?.querySelector<HTMLElement>(`.ie[data-inline="${CSS.escape(k)}"]`); if (!el) return; startInline(el);
      /* put the caret where the person clicked (plain text only; text with tokens switches to its raw form first) */
      if (at && el.dataset.raw === undefined) { const doc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null; caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
        let r: Range | null = doc.caretRangeFromPoint?.(at.x, at.y) ?? null; if (!r && doc.caretPositionFromPoint) { const p = doc.caretPositionFromPoint(at.x, at.y); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); r.collapse(true); } }
        if (r && el.contains(r.startContainer)) { const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r); } } }, 0); }
  }
  const qcAt = (el: HTMLElement): QcTarget | null => { const t = pickAt(el, blockName); if (!t) return null; const kind = t.field?.startsWith("asset:") ? "image" : t.field ? "text" : "block"; const node = findTarget(canvasRef.current, t); return { id: t.id, field: t.field, kind, text: kind === "text" ? node?.innerText.trim().slice(0, 300) : undefined }; };
  function onCanvasMove(e: React.MouseEvent) { if (!qcMode || qcPinned) return; const t = qcAt(e.target as HTMLElement); if ((t?.id ?? "") + (t?.field ?? "") !== (qcTarget?.id ?? "") + (qcTarget?.field ?? "")) setQcTarget(t); }
  function onCanvasClick(e: React.MouseEvent) {
    if (qcMode) { const t = qcAt(e.target as HTMLElement); e.preventDefault(); if (qcPinned && (!t || (t.id === qcTarget?.id && t.field === qcTarget?.field))) { setQcPinned(false); } else if (t) { setQcTarget(t); setQcPinned(true); setQcOpen(true); } return; }
    if (reviewMode) { const t = e.target as HTMLElement; if (t.closest("[data-ui]")) return; if (t.closest(".cblk")) { e.preventDefault(); pickForComment(t); } return; }
    if (preview) return;
    const t = e.target as HTMLElement; if (t.closest("[data-ui]")) return;
    if (patternMode) { const pb = t.closest<HTMLElement>(".cblk"); e.preventDefault(); if (pb) toggleMulti(pb.dataset.id!); return; }
    const blk = t.closest<HTMLElement>(".cblk"); if (!blk) { if (editing) commitInline(true); select(null); return; }
    const id = blk.dataset.id!; const ie = t.closest<HTMLElement>(".ie");
    if ((e.shiftKey || e.metaKey || e.ctrlKey) && canEdit && !locked) { e.preventDefault(); if (editing) commitInline(true); setMode("select"); setPop(null); toggleMulti(id); return; } // Shift / ⌘-click: group components for a design pattern
    if (t.closest("a, summary, .s-cta")) e.preventDefault();
    /* One click on a text edits it straight away (caret where you clicked); a click elsewhere in the block selects the block. */
    if (ie && editing && editingEl.current === ie) return; // moving the caret inside the text being edited
    if (ie && canEdit && !locked) {
      const b = blocks.find((x) => x.id === id)!; if (b.props.locked) { if (id !== sel) select(id); say("This block is locked. Unlock it from the More menu."); return; }
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
    if (contentPick) return; // a dialog is open: it handles its own keys
    if (e.key === "Escape") { e.preventDefault(); if (editing) commitInline(false); else if (ctaPop || pop) { setCtaPop(null); setPop(null); } else if (mode === "edit") setMode("select"); else select(null); return; }
    if (!editing) return;
    const rich = editingEl.current?.dataset.rich === "block"; // one-line texts save on Enter; paragraphs and lists need ⌘/Ctrl+Enter
    if (e.key === "Enter" && ((rich && (e.metaKey || e.ctrlKey)) || (!rich && !e.shiftKey && !editing.key.includes("|p|")))) { e.preventDefault(); commitInline(true); say("Saved"); }
  }

  /** Go back to editing: from preview → content; from a locked stage → reopen as a draft (same page, same data). */
  const goEdit = async (to: "blocks" | "content" = "content") => {
    if (!canEdit) { say(READ_ONLY); return; }
    if (focus) leaveFocusState();
    // published: just start editing (the live version stays online until the next publish); in review / approved: confirm, it leaves the queue
    /* Reopening a page that is in review puts it back to Build the page, which means whoever is
       holding it loses it and will be asked again when it is re-sent. That is worth saying plainly,
       with their names — and it was a browser `confirm()`, the one dialog in the editor that was
       not the app's own. The hand-over state is cleared too: a draft that still records a reviewer
       would leave the bar showing a step the page is no longer on. */
    if (locked) {
      if (status !== "published") {
        const who = [assigneeName && `${assigneeName} (author's review)`, bizName && `${bizName} (business review)`, ...bizGroups].filter(Boolean) as string[];
        const ok = await ask({
          title: "Reopen this page for editing?",
          body: <>It leaves the review queue and goes back to <b>Build the page</b>.{who.length ? <><br /><br />{who.length === 1 ? "This person is" : "These people are"} reviewing it now and will be asked again when you send it: <b>{who.join(", ")}</b>.</> : null}</>,
          confirmLabel: "Reopen for editing",
        });
        if (!ok) return;
      }
      await transition("draft", status === "published" ? "Editing · the live version stays online until the next publish" : "Reopened for editing · back at Build the page");
      setAssignee(""); setAuthorReviewer(""); setBizTaken(""); setBizGroups([]); setPreviewed(false); void setPhase("draft");
    }
    setPreviewRaw(false); setStage(to);
    if (to === "blocks") { setLeftRaw(true); setRight(false); select(null); setMode("select"); }
    else { setLeftRaw(false); const b = blocks.find((x) => missingRequired(x).length) || blocks[0]; if (b) enterEdit(b.id); }
  };
  /** Build and Preview (the steps themselves are labels; actions are the buttons between them). */
  const flowClick = (i: number) => {
    if (i === 0) { setPreviewed(false); void goEdit(blocks.length ? "content" : "blocks"); return; } // build: blocks and content in one step
    if (i === 1) { if (locked) { setFocusMode(true); return; } setStage("content"); setFocusMode(true); }
  };
  /* Next-step buttons on the stepper line right after the step they finish:
     Build → Go to preview → Preview → Send to author's review → Waiting for assignment → Assign to me → Assigned → Remind · Start review → In author's review
     → Remind · Reviewed → Reviewed → Send to business review → Waiting for business review → Remind · Sign off → Ready to publish → Publish */
  const notYet = status === "draft" || status === "failed";
  const seen = previewed;
  const remindBtn = (who: string) => <button className="btn btn-sm btn-secondary" onClick={() => setRemind(new Date().getTime())} title={`Remind ${who} that you are waiting`} aria-label={`Remind ${who}`}><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 19a2 2 0 0 0 4 0" /></svg><span className="hidden lg:inline">Remind</span></button>;
  const mayBizClaim = status === "bizreview" && !bizAssigned && mayStatus("approved") && (isAdmin || authorReviewer !== user.id);
  /* The nine-step run as it was, kept under these names: the eleven-step `hasAct`/`stepAct`
     below are thin wrappers that add Build the draft and Share with the business in front of
     it and hand everything from Build the page onward to these with a -2 offset. */
  const hasAct0 = (i: number) => (i === 0 && notYet && canEdit && !seen) || (i === 1 && notYet && mayStatus("review") && seen)
    || (i === 2 && status === "review" && !assignee && mayClaim) || (i === 3 && status === "review" && !!assignee && (assignee === user.id || canEdit))
    || (i === 4 && ((status === "inreview" && (mayApprove || canEdit)) || (status === "reviewed" && (maySendBiz || mayStatus("review")))))
    || (i === 5 && status === "bizreview" && !bizAssigned && mayBizClaim) || (i === 6 && bizAssigned && (mayBizApprove || canEdit)) || (i === 7 && (status === "approved" || status === "scheduled") && mayStatus("published"));
  /* The one action the status bar offers: whatever moves the page on from where it is now. The
     step the page is on owns its action; if that step has none to give (somebody else's turn, or
     no permission) the first step that does is used, so the bar is never silently empty. */
  /** Author's review and business review: the page full screen, click a text or image and leave feedback in the floating comments. */
  const stepAct0 = (i: number): React.ReactNode =>
    i === 0 ? <button className="btn btn-sm btn-primary btn-next" onClick={() => flowClick(1)} title="See the page exactly as visitors will">Go to preview</button>
    /* Page insights already warned about unfixed problems, but only once the Send dialog was open —
       by which point sending is the obvious thing to do. The bar says so before that, and offers
       both ways out: go and fix them, or send regardless. Sending is still allowed; the reviewer
       sees the same list. */
    : i === 1 ? (insightBadge > 0
      ? <button className="btn btn-sm btn-primary btn-next" onClick={() => openRight("insights")} title="Open Page insights and work through the list">Fix the issues</button>
      : <button className="btn btn-sm btn-primary btn-next" onClick={openSend} aria-label="Send to author's review"><span className="lg:hidden">Send for review</span><span className="hidden lg:inline">Send to author&apos;s review</span></button>)
    : i === 2 ? <button className="btn btn-sm btn-primary btn-next" onClick={() => void claim()} title="Take this review from the Backlog">Assign to me</button>
    : i === 3 ? (assignee === user.id ? <button className="btn btn-sm btn-primary btn-next" onClick={() => transition("inreview", "Review started")} title="Start the review: the author sees that you are on it">Start review</button> : remindBtn(assigneeName || "the reviewer"))
    : i === 4 ? (status === "reviewed" ? <button className="btn btn-sm btn-primary btn-next" onClick={() => setDecide(true)} title="Send it to the business review, or back to the author">Next step</button>
      : <>{canEdit && !mayApproveSelf && remindBtn(assigneeName || "the reviewer")}{mayApprove && <button className="btn btn-sm btn-primary btn-next" onClick={() => setDecide(true)} title={onBehalf ? `Site admin: on behalf of ${assigneeName || "the reviewer"}` : "Done: send it on to the business review, or back to the author"}>Reviewed{onBehalf && assigneeName ? <span className="hidden xl:inline">for {assigneeName.split(" ")[0]}</span> : null}</button>}</>)
    : i === 5 ? <>{mayBizClaim && <button className="btn btn-sm btn-primary btn-next" onClick={() => void claimBiz()} title="Take this business review">Assign to me</button>}</>
    : i === 6 ? <>{(mayBizApprove || canEdit) && <button className="btn btn-sm btn-secondary" onClick={() => void reauthor()} title="Send it back to the author: the page returns to Build the page">Reauthor</button>}{mayBizApprove && <button className="btn btn-sm btn-primary btn-next" onClick={() => transition("approved", bizOnBehalf ? "Signed off as site admin · ready to publish" : "Business review done · ready to publish")} title={bizOnBehalf ? "Site admin: sign off on behalf of the business reviewer" : undefined}>Sign off{bizOnBehalf && bizName ? <span className="hidden xl:inline">for {bizName.split(" ")[0]}</span> : null}</button>}</>
    : i === 7 ? <button className="btn btn-sm btn-primary btn-next" onClick={() => { if (dirty) save().catch(() => {}); setPublishing(true); }}>{status === "scheduled" ? "Publish / reschedule" : "Publish"}</button> : null;
  const setPhase = async (p: "draft" | "shared" | "build", msg?: string) => {
    const was = draftPhase; setDraftPhase(p);
    try { await ucpApi.draftPhase(marketId, page.path, p); if (msg) say(msg); } catch (e) { setDraftPhase(was); say(e instanceof ApiError ? e.problem.title : "Could not change the step"); }
  };
  /** "← Back" sits right before the current step: Share with the business → Build the draft, Build the page → Share with the business. */
  const backOf = (i: number): (() => void) | null => !canEdit || !notYet ? null
    : i === 2 && draftPhase === "shared" ? () => void setPhase("draft", "Back at Preview · the business link keeps working") : null;
  /* Build, Preview and Share are the author's; everything from 3 is the old review chain, shifted
     by one because the two build steps became one. */
  const hasAct = (i: number) =>
    i === 0 ? notYet && canEdit && !seen
    : i === 1 ? notYet && canEdit && seen && draftPhase !== "shared"
    : i === 2 ? notYet && canEdit && draftPhase === "shared"
    : !notYet && hasAct0(i - 1);
  const stepAct = (i: number): React.ReactNode =>
    i === 0 ? stepAct0(0)
    /* Preview: show the business first, or go straight to review — sharing is optional. */
    : i === 1 ? <><button className="btn btn-sm whitespace-nowrap" onClick={() => { if (dirty) save().catch(() => {}); void setPhase("shared", "The business can see the draft"); }} title="Let the business see the draft and comment before it goes for review">Share with the business</button>{stepAct0(1)}</>
    : i === 2 ? <><button className="btn btn-sm whitespace-nowrap" onClick={() => { if (dirty) save().catch(() => {}); setShare(true); }} title="Copy the link again, or send it to more people">Share link</button>{stepAct0(1)}</>
    : stepAct0(i - 1);
  /* Workflow list → "Go back" to an earlier step. Author steps (0–3) reopen the page for editing; review steps undo one hand-over. */
  const backPlan = (j: number): { why: string; run: () => Promise<void> } | null => {
    if (j >= cur) return null; const reopen = status !== "draft" && status !== "failed"; const mine = isAdmin || assignee === user.id;
    if (j <= 3) { if (!canEdit) return null; const phase = j === 0 ? "draft" : j === 1 ? "shared" : "build";
      return { why: reopen ? "The page leaves the review queue and goes back to editing. Both reviews start again when you send it." : j === 1 ? "The business link keeps working." : "Nothing you built is lost.",
        run: async () => { if (reopen) await transition("draft", "Back to editing"); setPreviewed(false); await setPhase(phase, `Back at ${STEPS[j][0]}`); if (j === 3) setFocusMode(true); } }; }
    if (j === 4 && status === "review" && assignee && mine) return { why: `${assigneeName || "The reviewer"} is no longer assigned; the page waits in the Backlog for any reviewer.`, run: async () => { try { await ucpApi.releaseReview(marketId, page.path); setAssignee(""); say("Back in the Backlog"); } catch (e) { say(e instanceof ApiError ? e.problem.title : "Could not go back"); } } };
    if (j === 5 && status === "inreview" && mine) return { why: `The review is paused; ${assigneeName || "the reviewer"} stays assigned and can start it again.`, run: () => transition("review", "Back at Assigned to reviewer") };
    if (j === 6 && (status === "bizreview" || status === "reviewed") && isAdmin) return { why: "Site admin: the business review is cancelled and the author's review opens again.", run: () => transition("inreview", "Back in the author's review") };
    if (j === 8 && (status === "approved" || status === "scheduled") && isAdmin) return { why: "Site admin: the sign-off is withdrawn and the business review opens again.", run: () => transition("bizreview", "Back in the business review") };
    return null;
  };
  /** "‹ Back" left of the current step: back one step. Draft steps move at once; leaving a review stage asks first and says what happens. */
  const backAny = (): (() => void) | null => {
    const quick = backOf(cur); if (quick) return quick; if (cur < 1 || cur === LAST) return null; const plan = backPlan(cur - 1); if (!plan) return null;
    if (status === "draft" || status === "failed") return () => void plan.run();
    return () => void (async () => { if (await ask({ title: `Go back to ${STEPS[cur - 1][0]}?`, body: plan.why, confirmLabel: `Go back to ${STEPS[cur - 1][0]}` })) await plan.run(); })();
  };
  /** Actions that take the page back (left of the progress strip); stepAct holds the ones that move it on (right). */
  /* Demo only: jump the page to the state the next step describes.
     The handover steps belong to somebody else — a reviewer claims the review, a business reviewer
     signs off — so an author walking a demo cannot reach them at all. This writes the same status
     and meta the real buttons would and nothing else: no task, no audit entry, no notification.
     Deliberately a small icon with a tooltip that says so, not a labelled action. */
  const FF: Record<number, { label: string; via: PageStatus[]; meta?: Record<string, string> }> = {
    3: { label: "Assigned to reviewer", via: [], meta: { "ucp:assignee": user.id } },
    4: { label: "In author's review", via: ["inreview"] },
    /* `bizreview` cannot follow `inreview` — the API insists the author's review is marked done
       first — so this makes the same two hops a reviewer would. */
    5: { label: "Waiting for business review assignment", via: ["reviewed", "bizreview"] },
    6: { label: "In business review", via: [], meta: { "ucp:taskKind": "BizReview", "ucp:taskAssignee": user.id } },
    7: { label: "Ready to publish", via: ["approved"] },
    8: { label: "Published", via: ["published"] },
  };
  const ffJump = async (i: number) => {
    const next = FF[i]; if (!next) return;
    try {
      for (const st of next.via) { await repoApi.updateContent(page.path, { status: st }); setStatus(st); }
      if (next.meta) {
        await repoApi.setProps(`${page.path}/jcr:content`, next.meta);
        if (next.meta["ucp:assignee"]) setAssignee(next.meta["ucp:assignee"]);
        if (next.meta["ucp:taskAssignee"]) setBizTaken(next.meta["ucp:taskAssignee"]);
      }
      say(`Demo: moved to ${next.label}`); router.refresh();
    } catch (e) { say(e instanceof ApiError ? e.problem.title : "That did not work"); }
  };
  const stepBack = (i: number): React.ReactNode => i - 2 === 6 && bizAssigned && (mayBizApprove || canEdit) ? <button className="btn btn-sm" onClick={() => void reauthor()} title="Send it back to the author: the page returns to Build the page">Reauthor</button> : null;
  /** Our bottom bar's single action (only used while BOTTOM_BAR is on). */
  const actStep = [cur, ...MOBILE_ORDER].find(hasAct);
  /** Why the page cannot be changed right now (Add, Configure and AI are veiled; insights, settings, entities and history stay open); "" when it can. */
  const lockReason = lockedByOther ? `Locked by ${pageLock!.name}. Ask them or a site admin to unlock it in Pages.` : !canEdit ? "You don't have Edit on this folder. Ask a site admin to grant it." : inAuthor ? `The page is in the author's review${assigneeName ? ` with ${assigneeName}` : ""}. Editing takes it out of the review queue.` : status === "reviewed" ? "The author's review is done. Editing takes it back to a draft." : status === "bizreview" ? "The page is in business review. Editing takes it out of the review queue." : status === "approved" || status === "scheduled" ? "The page passed review and is ready to publish. Editing sends it back through review." : status === "published" ? "The page is live. Click Edit to change it; the live version stays online until you publish again." : "";
  const veilEdit = canEdit ? () => void goEdit("blocks") : undefined;
  const insightMeta = useMemo(() => ({ title, description, template: page.template, status, locale, assets: assetMap, entities }), [title, description, page.template, status, locale, assetMap, entities]);
  /* One pass over the insights: how many Must-fix items there are, and which blocks they point at.
     The second is what the preview marks, so the author can see where the problems are on the page
     instead of reading a list and hunting for them. */
  const crit = useMemo(() => {
    const items = pageInsights(blocks, insightMeta).groups.flatMap((g) => g.items).filter((i) => i.level === "crit");
    return { count: items.length, blocks: new Set(items.map((i) => i.blockId).filter(Boolean) as string[]) };
  }, [blocks, insightMeta]);
  const insightBadge = crit.count;
  critRef.current = insightBadge;
  /** The unfixed-insight count, shown beside the step rather than among its buttons. */
  /** The Must-fix count, beside the step rather than among its buttons — and a way into the list. */
  const insightWarn = insightBadge > 0 ? <button type="button" onClick={() => openRight("insights")}
    title={`Page insights found ${insightBadge} thing${insightBadge === 1 ? "" : "s"} you must fix before this page can go for review · open the list`}
    className="inline-flex flex-none cursor-pointer items-center gap-1 whitespace-nowrap text-xs text-warning underline-offset-2 hover:underline focus-visible:underline">
    <svg viewBox="0 0 24 24" aria-hidden className="size-3.5 flex-none fill-none stroke-current" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="M12 4.5l8.5 15h-17z" /><path d="M12 10v4M12 16.8v.2" /></svg>
    {insightBadge} to fix</button> : null;
  // On phones and tablets the panels float over the canvas instead of reserving space, so the 1:1 page keeps its width.
  const [avail, setAvail] = useState(0);
  /* The page is drawn at its real width (see lib/ucp/devices.ts) and `zoom`ed to fit the canvas.
     `zoom` rather than a transform, and one element rather than two: a scaled inner element needs
     an outer box sized from its measured height, and that measurement re-fires on every frame of
     a breakpoint change, retargeting the height animation mid-flight — which is what made the
     switch judder. `zoom` takes part in layout, so the parent sizes itself and nothing is measured. */
  useEffect(() => { const w = watched.current; const c = canvasRef.current; if (c === w.canvas) return;
    w.ro.forEach((r) => r.disconnect()); w.ro = []; w.canvas = c;
    if (c) { const r = new ResizeObserver(() => setAvail(c.clientWidth)); r.observe(c); w.ro.push(r); } });
  useEffect(() => () => { const w = watched.current; w.ro.forEach((r) => r.disconnect()); w.ro = []; w.canvas = null; /* forget it so a remount (React strict mode) re-attaches */ }, []);
  /* Watch the canvas and the page for size changes. They can mount after the first render, so re-attach whenever the element changes. */
  const watched = useRef<{ canvas: HTMLElement | null; ro: ResizeObserver[] }>({ canvas: null, ro: [] });
  /* The tour drives the editor into the state each stop describes, rather than hoping the
     author happens to have the right panel open. */
  const tourHost = {
    showPanels: () => { setZen(false); setFocusMode(false); setLeftRaw(true); setRight(true); },
    openLeft: (t: LeftTab) => { setLeftTab(t); setLeftRaw(true); },
    openRight: () => setRight(true),
    setDevice: (d: "desktop") => setDevice(d),
    selectFirstBlock: () => { const b = blocksRef.current[1] ?? blocksRef.current[0]; if (b) configure(b.id); return b?.id ?? null; },
  };
  const runTour = () => { void startEditorTour(tourHost); };
  /* First time anyone opens the builder, the tour introduces it — once, then never again
     unless they ask from the components panel. */
  useEffect(() => { if (tourSeen()) return; const id = setTimeout(runTour, 900); return () => clearTimeout(id); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const railsOn = !preview || !!lockReason; // a locked page keeps the rails (panels open read-only or veiled); a plain preview hides them
  const railBadge = (t: RightTab) => (t === "comments" ? commentCount : t === "insights" ? insightBadge : t === "content" ? Object.keys(bindings).length : t === "ai" ? aiTasks.filter((x) => x.stage !== "done").length : 0);
  const openRight = (t: RightTab) => { setZen(false); backToInsights.current = false; if (t === "block" && sel) configure(sel); else { setRightTab(t); setRight(true); } };
  const rightItems = RAIL_SHOWN().map(([t, label, path]) => ({ key: t, label: t === "page" ? `${kindLabel} settings` : label, path, active: right && rightTab === t, badge: railBadge(t), onClick: () => openRight(t) }));
  const rightTitle = rightTab === "block" ? (selected ? `Configure · ${BLOCK_BY_TYPE[selected.type].name}` : "Configure") : rightTab === "page" ? `${kindLabel} settings` : rightTab === "content" ? "Entities" : rightTab === "ai" ? "AI assistant" : rightTab === "insights" ? "Page insights" : rightTab === "comments" ? `Comments${commentTotal ? ` · ${commentTotal}` : ""}` : rightTab === "jira" ? "Jira" : "Version history";
  const panelW = rightW; // one width for every tab: a panel that jumps wider on Comments or History reads as a glitch
  const floatingOpen = focus && !phone && ((qcMode && qcOpen) || (reviewMode && floatOpen)); // full screen: keep the page clear of the floating panel
  /* The gutters reserve exactly what the docked panels occupy. They used to skip that on
     narrow viewports — from the days when the panels floated over the canvas — but the panels
     are opaque docked columns now, so the page simply disappeared behind them below 1100px. */
  /* The width switch, defined once: the top bar has it while editing, and the preview overlay
     has it too — checking the page at each width is most of what a preview is for, and it was
     the one control that disappeared when the top bar did. */
  const deviceSwitch = (cls = "") => <div role="group" aria-label="Preview width" className={`inline-flex overflow-hidden border border-line-2 ${cls}`}>{DEVICES.map(([d, label, path]) => <button key={d} onClick={() => setDevice(d)} className={`px-2.5 h-8 grid place-items-center transition-colors duration-150 ease-out ${device === d ? "bg-ink text-white" : "text-ink-3 hover:text-ink hover:bg-surface-3"}`} title={`${label} · ${DEVICE_W[d]}px`} aria-label={`${label} view, ${DEVICE_W[d]} pixels`} aria-pressed={device === d}><Ico d={path} /></button>)}</div>;
  const padL = focus ? 0 : !railsOn ? 24 : phone ? 12 : zen ? 24 : left && !leftFloating ? leftW + 24 : RAIL_W + 24;
  const padR = focus ? (floatingOpen ? 412 : 0) : !railsOn ? 24 : phone ? 12 : zen ? 24 : right && !rightFloat.floating ? panelW + 24 : RAIL_W + 24;

  /* How the page is fitted into the canvas, matching the UCP mock's `canvas.svelte`:
     Desktop works at 1:1 — it fills the canvas up to its 1280 breakpoint and never zooms, so type
     stays its real size and the page is never a shrunken picture of itself. XL always renders the
     full 1536 and zooms to fit, because a 1536 preview cannot exist on a 14" screen any other way.
     Tablet and mobile render at their true width and only zoom if the canvas is narrower. */
  const areaW = avail ? Math.max(0, avail - padL - padR - 2) : 0;
  const siteW = channel === "email" ? (device === "mobile" ? DEVICE_W.mobile : 640) : channel ? 380 : device === "desktop" ? Math.min(DEVICE_W.desktop, areaW || DEVICE_W.desktop) : DEVICE_W[device];
  const fit = areaW && areaW < siteW ? areaW / siteW : 1;

  return (
    <div className={`h-full grid ${focus ? "grid-rows-[1fr]" : BOTTOM_BAR ? "grid-rows-[54px_1fr_36px]" : "grid-rows-[54px_1fr_44px]"} min-w-0 overflow-hidden`}>
      {/* Toolbar (docked; gone in preview) */}
      {!focus && <div className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_minmax(max-content,1fr)] items-center gap-3 px-2.5 bg-surface border-b border-line overflow-x-auto overflow-y-hidden">
        {/* left: back + page · centre: device width · right: status | panels + preview | next action */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Close, not "‹ Pages": the editor owns the whole screen, so the control that gives it
              back is an exit. The destination is named in the tooltip rather than on the button,
              which is the review's "name the Back destination" without spending toolbar width. */}
          <button type="button" data-tour-close onClick={() => void closeEditor()} disabled={!!closing} aria-label="Close the editor and go back to Pages" title="Close the editor · back to Pages"
            className="grid size-8 flex-none place-items-center rounded-md text-ink-3 transition-[color,background-color,transform] duration-150 ease-out hover:bg-surface-3 hover:text-ink active:scale-[0.97] disabled:opacity-40">
            <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div className="min-w-0 flex-1"><span className="flex items-center gap-2 min-w-0"><b className="block text-sm truncate">{title}</b>{jira && <JiraChip url={jira} />}</span><span className="hidden sm:block text-xs text-ink-3 truncate">{flag} {locale} · {domain}{rel}</span></div>
        </div>
        {/* The save state sits here, beside the width switch. It used to be stacked above the
            "Waiting for a reviewer" line on the right, where the two read as one crowded block. */}
        <div className="hidden lg:flex items-center gap-2.5 justify-self-center">
          {deviceSwitch()}
          {saving === "Save failed" ? <button className="text-xs text-crit bg-crit-soft rounded-full px-2.5 py-1 hover:underline whitespace-nowrap" onClick={() => save().then(() => say("Saved")).catch(() => {})} title="Your last changes were not saved">Not saved · Retry</button>
            : canEdit && !locked && (status === "draft" || status === "failed") ? null /* the Save button says it */ : <span className="text-xs text-ink-3 bg-surface-2 rounded-full px-2.5 py-1 whitespace-nowrap" aria-live="polite" title="Changes are saved automatically">{saving === "Unsaved" ? "Saving…" : saving === "Saved just now" || saving === "Saved" ? "Saved" : saving}</span>}
        </div>
        <div className="flex items-center justify-end gap-2.5 min-w-0">
          {/* status, who has it, and what it is waiting for, in one group (the waiting line sits under the chips) */}
          <div className="flex flex-col items-end gap-0.5 flex-none">
            <div className="flex items-center gap-2">
              {/* the save state moved beside the width switch; the stage is on the status bar below */}
              {inAuthor && assignee && <span className="hidden sm:contents"><AssigneeChip name={assigneeName} admin={isAdmin} marketId={marketId} pagePath={page.path} meId={user.id} onReassigned={(r) => { setAssignee(r.assignee); say(`Reassigned to ${r.assigneeName}`); router.refresh(); }} /></span>}
            </div>
            {inAuthor && !mayApproveSelf && <span className="hidden sm:inline text-xs text-ink-3 whitespace-nowrap pr-1">{status === "inreview" ? `${assigneeName ? assigneeName.split(" ")[0] : "The reviewer"} is reviewing it` : assigneeName ? `Waiting for ${assigneeName.split(" ")[0]} to start` : "Waiting for a reviewer"}{canEdit && <> · <button type="button" className="underline underline-offset-2 hover:text-ink" onClick={() => setRemind(new Date().getTime())}>Remind</button></>}</span>}
            {status === "bizreview" && !mayBizSelf && <span className="hidden sm:inline text-xs text-ink-3 whitespace-nowrap pr-1">{bizName ? `Waiting for ${bizName.split(" ")[0]} to sign off` : bizGroups.length ? `Shared with ${bizGroups.join(", ")}` : "Waiting for a business reviewer"}{canEdit && bizAssigned && <> · <button type="button" className="underline underline-offset-2 hover:text-ink" onClick={() => setRemind(new Date().getTime())}>Remind</button></>}{isAdmin && bizAssigned && <> · <button type="button" className="underline underline-offset-2 hover:text-ink" onClick={() => setShare(true)}>Share link</button></>}</span>}
            {status === "reviewed" && !maySendBiz && <span className="hidden sm:inline text-xs text-ink-3 whitespace-nowrap pr-1">Waiting for the author to send it to the business review</span>}
          {(status === "approved" || status === "scheduled") && !mayStatus("published") && <span className="hidden sm:inline text-xs text-ink-3 whitespace-nowrap pr-1">Waiting for a publisher</span>}
          </div>
          {/* The two panel toggles that used to sit here are gone: each panel is reopened from the slim
              bar it leaves behind, which is where you are already looking when you want it back. */}
          {/* the page itself: look at it, or take it back to editing */}
          <div data-tour-actions className="flex items-center gap-1.5 pl-2.5">
            {/* Undo / redo, then focus mode — all plain icon buttons, no chip outline. */}
            {!focus && canEdit && !locked && <>
              <button type="button" onClick={undo} disabled={!canUndo} title="Undo · ⌘Z" aria-label="Undo"
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-[color,background-color,transform] duration-150 ease-out hover:bg-surface-3 hover:text-ink active:scale-[0.97] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink-3">
                <Undo2 className="size-4" strokeWidth={1.7} aria-hidden />
              </button>
              <button type="button" onClick={redo} disabled={!canRedo} title="Redo · \u21e7\u2318Z" aria-label="Redo"
                className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-[color,background-color,transform] duration-150 ease-out hover:bg-surface-3 hover:text-ink active:scale-[0.97] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink-3">
                <Redo2 className="size-4" strokeWidth={1.7} aria-hidden />
              </button>
              <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />
            </>}
            {/* Focus mode: a plain icon button like the mock's, with no chip outline around it. */}
            {!focus && <button data-tour-focus type="button" onClick={() => setZen(!zen)} aria-pressed={zen}
              title={zen ? "Show the panels · \u2318." : "Focus mode: hide both panels · \u2318."} aria-label={zen ? "Show the panels" : "Focus mode: hide both panels"}
              className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-md transition-[color,background-color,transform] duration-150 ease-out hover:bg-surface-3 active:scale-[0.97] ${zen ? "text-brand" : "text-ink-3 hover:text-ink"}`}>
              {zen ? <Minimize2 className="size-4" strokeWidth={1.7} aria-hidden /> : <Maximize2 className="size-4" strokeWidth={1.7} aria-hidden />}
            </button>}
            {/* No `focus` branch here: this whole bar is `{!focus && …}`, so an "Exit preview" button
                placed in it could never render. The preview's way out is the fixed control below. */}
            {(isForm || (isMsg && channel)) && status === "published" && <button type="button" className="btn btn-sm btn-secondary" onClick={() => setContractOpen(true)} title={isForm ? "The definition the Forms solution reads" : "How MDP fetches this published message"}>API contract</button>}
            {!canEdit
                ? <span className="inline-flex items-center gap-1 whitespace-nowrap px-1.5 text-xs text-ink-3" title={lockedByOther ? `Locked by ${pageLock!.name}` : "Ask a site admin for Edit on this folder"}><Lock className="size-3" strokeWidth={1.5} aria-hidden />Read-only</span>
                : locked
                  ? <button className="btn btn-sm btn-secondary" onClick={() => void goEdit("blocks")} title={status === "published" ? "Change the page; the live version stays online until you publish again" : "Take the page back to editing"}><Ico d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />Edit</button>
                  : (
                    /* One split button for every document action, as in the mock: the frequent one is
                       the button, the rest live under the chevron instead of spreading along the bar. */
                    <div ref={actionsRef} className="inline-flex" role="group" aria-label="Page actions">
                      <button type="button" className="btn btn-sm btn-primary rounded-e-none" disabled={!dirty || saving === "Saving…"}
                        onClick={async () => { try { await save(); say("Saved"); } catch { /* save() already says why */ } }}
                        title={dirty ? "Save now (it also saves by itself after a moment) · ⌘S" : "All changes are saved"}>
                        <Ico d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6" />{dirty ? (saving === "Saving…" ? "Saving…" : "Save draft") : "Saved"}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger aria-label="More page actions"
                          className="btn btn-sm btn-primary -ms-px cursor-pointer rounded-s-none !px-1.5 data-[popup-open]:bg-brand-hover">
                          <ChevronDown className="size-4" strokeWidth={2} aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-56">
                          <DropdownMenuItem onClick={() => setFocusMode(true)}><Eye className="size-4" strokeWidth={1.6} aria-hidden />Preview<DropdownMenuShortcut>⌘⇧F</DropdownMenuShortcut></DropdownMenuItem>
                          <DropdownMenuItem disabled={!dirty || saving === "Saving…"} onClick={() => { void save().then(() => say("Saved"), () => {}); }}><Ico d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6" />Save draft<DropdownMenuShortcut>⌘S</DropdownMenuShortcut></DropdownMenuItem>
                          <DropdownMenuItem disabled={status !== "draft" && status !== "failed"} onClick={openSend}><Send className="size-4" strokeWidth={1.6} aria-hidden />Send for review</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { select(null); setRightTab("page"); setRight(true); setZen(false); }}><Settings className="size-4" strokeWidth={1.6} aria-hidden />Page settings</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setRightTab("history"); setRight(true); setZen(false); }}><History className="size-4" strokeWidth={1.6} aria-hidden />Version history</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTranslating(true)}><Languages className="size-4" strokeWidth={1.6} aria-hidden />Translate this page…</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => void duplicatePage()}><Copy className="size-4" strokeWidth={1.6} aria-hidden />Duplicate page</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => void deletePage()}><Trash2 className="size-4" strokeWidth={1.6} aria-hidden />Delete page</DropdownMenuItem>
                          {firstStage && <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setAuthorsSignal((v) => v + 1)}><Users className="size-4" strokeWidth={1.6} aria-hidden />Authors<DropdownMenuShortcut>{authors.length || "none"}</DropdownMenuShortcut></DropdownMenuItem>
                          </>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
          </div>
        </div>
      </div>}
      {/* Body */}
      <div className="relative min-h-0 overflow-hidden bg-bg">
        <div className={`absolute inset-0 flex flex-col ${preview ? "preview" : ""}`}>
          {/* The hint / "1:1 · 1200 px" strip is gone: it was a light band sitting on the dark canvas
             ground, and it narrated what the canvas already shows. */}
          <div ref={canvasRef} className={`bld-pad ${focus ? "flex-1 overflow-auto p-0 bg-white" : "editor-ground flex-1 overflow-auto p-6 pb-24"} ${canEdit && !locked && !preview && !focus ? "can-edit" : ""} ${reviewMode ? "review-pick" : ""} ${patternMode ? "pattern-pick" : ""}`} style={{ paddingLeft: padL, paddingRight: padR }} onClick={onCanvasClick} onMouseMove={onCanvasMove} onDragOver={onCanvasDragOver} onDrop={onCanvasDrop} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropAt(null); }} onMouseLeave={() => { if (!qcPinned) setQcTarget(null); }} onDoubleClick={onCanvasDouble} onKeyDown={onCanvasKey} onInput={onInlineInput}>
            {isForm && <FormPageSwitch blocks={blocks} view={formView} layout={flow.layout} onView={goForm} />}
            {(() => { return <div className="bld-frame" style={{ width: siteW, zoom: fit, margin: "0 auto", ["--bld-unzoom" as string]: 1 / fit }}>
            <AssetsContext.Provider value={assetMap}><EntitiesContext.Provider value={entities}><InlineEditContext.Provider value={inlineCtx}><ChromeFor channel={channel} host={isForm ? { title: host?.title ?? "Host page", crumbs: (host?.path.replace(root, "") ?? "").split("/").filter(Boolean) } : undefined} marketName={marketName} crumbs={[...rel.split("/").filter(Boolean).slice(0, -1), title]} device={device}>
              {isForm && flow.layout === "wizard" && <FormProgress blocks={blocks} view={formView} submitTitle={flow.submitPage.heading} />}
              {isForm && formView.page === "submit" && <SubmitPageView blocks={blocks} flow={flow} onView={goForm} onEdit={() => openRight("page")} preview={preview} />}
              {blocks.length ? blocks.map((b, i) => { const line = dropAt === i && <div data-ui aria-hidden className="relative z-20 -my-px h-0.5 bg-brand" />; return <Fragment key={b.id}>{channel === "email" && <EmailRegionLabel blocks={blocks} i={i} />}{line}{(() => { const isSel = sel === b.id; const def = BLOCK_BY_TYPE[b.type]; return <div key={b.id} data-id={b.id} className={`cblk ${isSel ? "sel" : ""} ${commentTarget?.id === b.id && !commentTarget.field ? "cmt-target" : ""} ${isSel && mode === "edit" ? "editmode" : ""} ${b.props.hidden ? "hidden-blk" : ""} ${b.props.locked ? "locked" : ""} ${multi.includes(b.id) ? "multi" : ""} ${movingId === b.id ? "opacity-40" : ""} ${crit.blocks.has(b.id) ? "crit-blk" : ""} ${qcFlash === b.id ? "qc-flash" : ""} ${isForm && hiddenOnView(blocks, i, formView, flow.layout) ? "hidden!" : ""}`} tabIndex={0}>
                {multi.includes(b.id) && <span className="multi-n" aria-hidden>{multiBlocks.findIndex((x) => x.id === b.id) + 1}</span>}
                {reviewMode && <span className="cmt-pick" aria-hidden>{commentTarget?.id === b.id ? "Commenting here" : "Click a text or image to comment"}</span>}
                {!!commentCounts[b.id] && <button type="button" data-ui className="cmt-badge" title={`${commentCounts[b.id]} comment${commentCounts[b.id] === 1 ? "" : "s"} on this component`} onClick={(e) => { e.stopPropagation(); if (focus) setFloatOpen(true); else { setRightTab("comments"); setRight(true); } }}><CommentIcon size={12} />{commentCounts[b.id]}</button>}
                <span className="tag">{def.name}{b.props.locked ? " · locked" : ""}{b.props.hidden ? " · hidden" : ""}</span>
                {isSel && !preview && !multi.length && <ContextBar unzoom={1 / fit} moveType={MOVE_TYPE} onMoveStart={setMovingId} onMoveEnd={() => { setMovingId(null); setDropAt(null); }} block={b} index={i} count={blocks.length} mode={mode} pop={pop} setPop={setPop} clipboard={clipboard} aiSeed={aiSeed}
                  onEdit={() => (mode === "edit" ? (commitInline(true), setMode("select")) : enterEdit(b.id))} onConfigure={phone ? () => configure(b.id) : undefined /* desktop: clicking the block already opens Configure */}
                  onMore={(a) => { setPop(null); if (a === "duplicate") duplicate(b); else if (a === "copy") { setClipboard(b); say("Copied"); } else if (a === "paste" && clipboard) { mutate((bl) => { const c = bl.slice(); c.splice(i + 1, 0, { ...clipboard, id: makeBlock(clipboard.type).id, props: { ...clipboard.props } }); return c; }); } else if (a === "up") move(b.id, -1); else if (a === "down") move(b.id, 1); else if (a === "hide") setProp(b.id, "hidden", !b.props.hidden); else if (a === "lock") { setProp(b.id, "locked", !b.props.locked); if (!b.props.locked) setMode("select"); } else if (a === "delete") remove(b.id); else if (a === "history") { if (phone) setLeftRaw(false); setRightTab("history"); setRight(true); } else if (a === "pattern") { startPattern(b.id); say("Click the other components to put in the pattern"); } }}
                  onAi={(p) => { mutate((bl) => bl.map((x) => (x.id === b.id ? { ...x, props: { ...x.props, ...p.props } } : x))); say("AI changes applied"); }} />}
                {isForm && !preview && <RuleChips b={b} flow={flow} blocks={blocks} />}
                <RenderBlock b={b} /></div>; })()}</Fragment>; })
              : <div className="m-7 p-11 border-2 border-dashed border-line-2 rounded-xl text-center text-ink-2 text-base">How do you want to start this page?<small className="block text-sm text-ink-3 mt-1.5">Pick a layout, or add components one by one from the left.</small><div className="grid grid-cols-3 gap-3 mt-4 text-left">{TEMPLATES.filter((t) => t.blocks.length).slice(0, 3).map((t) => <button key={t.id} className="border border-line-2 bg-surface p-3.5 text-left hover:border-ink" onClick={() => mutate(() => t.blocks.map((x) => makeBlock(x, x === "mast" ? { heading: title } : {})))}><b className="block text-sm">{t.name}</b><small className="text-xs text-ink-3">{t.desc}</small></button>)}</div></div>}
            {dropAt === blocks.length && blocks.length > 0 && <div data-ui aria-hidden className="relative z-20 -my-px h-0.5 bg-brand" />}
            {isForm && <FormNav blocks={blocks} view={formView} layout={flow.layout} onView={goForm} onEdit={(id) => { select(id); configure(id); }} preview={preview} />}</ChromeFor></InlineEditContext.Provider></EntitiesContext.Provider></AssetsContext.Provider></div>; })()}
          </div>
          {editing && <div data-ui className="absolute left-1/2 -translate-x-1/2 bottom-6 flex gap-1 bg-foreground rounded-lg p-1 shadow-xl z-20 text-white text-xs" onMouseDown={(e) => e.preventDefault()}><span className="px-2 py-1.5 text-white/70">Editing text</span><button className="px-2.5 py-1.5 rounded hover:bg-white/15 inline-flex items-center" title="Choose content from an entity (or type {{ to insert at the cursor)" aria-label="Choose content from an entity" onClick={() => { setTokTyped(false); setContentPick({ target: "inline", label: "this text" }); }}><ContentIcon /></button><button className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-good font-medium" onClick={() => { commitInline(true); say("Saved"); }}><Check className="size-3.5" strokeWidth={2} aria-hidden />Save</button><button className="inline-flex items-center gap-1 px-3 py-1.5 rounded hover:bg-white/15" onClick={() => commitInline(false)}><svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>Cancel</button></div>}
          {(patternMode || multi.length > 0) && !preview && <div data-ui role="toolbar" aria-label="Design pattern selection" className="absolute left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-1 bg-foreground rounded-lg p-1 shadow-xl z-20 text-white text-xs" onMouseDown={(e) => e.preventDefault()}>
            <span className="flex items-center gap-2 px-2.5 py-1.5"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={1.8} strokeLinejoin="round" aria-hidden><path d={PATTERN_ICON} /></svg><b>New design pattern</b></span>
            <span className="px-2 py-1.5 text-white/70">{multi.length ? `${multi.length} component${multi.length === 1 ? "" : "s"}` : "Click the components to put in it"}{multi.length === 1 ? " · pick at least one more" : ""}</span>
            <button className="px-3 py-1.5 rounded bg-brand font-medium disabled:opacity-40" disabled={multi.length < 2} onClick={() => setSavingPattern(true)}>Name it and save…</button>
            <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded hover:bg-white/15" onClick={stopPattern}>Cancel</button></div>}
          {savingPattern && multiBlocks.length > 1 && <SavePatternDialog blocks={multiBlocks} marketId={marketId} onSave={savePattern} onClose={() => setSavingPattern(false)} />}
          {patMarkets && <PatternMarketsDialog name={patMarkets.name} value={patMarkets.markets ?? []} marketId={marketId} onClose={() => setPatMarkets(null)} onSave={async (m) => { try { await ucpApi.patternMarkets(marketId, patMarkets.id, m); say(m.length ? `${patMarkets.name}: only ${m.length} market${m.length === 1 ? "" : "s"}` : `${patMarkets.name}: all markets`); } catch { say("Could not change the markets"); } setPatMarkets(null); loadPatterns(); }} />}
          {ctaPop && selected && <div data-ui className="absolute left-1/2 -translate-x-1/2 bottom-6 w-[min(420px,calc(100vw-24px))] bg-surface border border-line rounded-xl shadow-2xl z-20 p-3.5 text-sm" onMouseDown={(e) => { e.stopPropagation(); if (!(e.target as HTMLElement).closest("input, textarea")) e.preventDefault(); }}>
            <div className="flex items-center mb-2.5"><b>Button</b><button className="ml-auto w-7 h-7 rounded text-ink-3 hover:bg-surface-3" onClick={() => setCtaPop(null)} aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>
            <label className="block text-xs text-ink-2 font-medium">Label<input autoFocus className="bdl-field mt-1" value={String(selected.props[ctaPop.labelKey] ?? "")} onChange={(e) => setProp(selected.id, ctaPop.labelKey, e.target.value)} /></label>
            {ctaPop.linkKey && <label className="block text-xs text-ink-2 font-medium mt-2.5">URL<input className="bdl-field mt-1" value={String(selected.props[ctaPop.linkKey] ?? "")} onChange={(e) => setProp(selected.id, ctaPop.linkKey!, e.target.value)} placeholder="/borrowing/credit-cards/apply" /></label>}
            <div className="flex justify-end mt-3"><button className="btn btn-sm btn-primary" onClick={() => setCtaPop(null)}>Done</button></div>
          </div>}
          {/* Ask AI: floating button → full-width bar at the bottom of the canvas. Read-only users get the hint instead. */}
        </div>
        {/* Left panel: Add / Outline */}
        {/* The left rail is gone: its three icons duplicated the panel's own Components / Patterns /
            Outline tabs. The top bar's "Components panel" toggle reopens the panel when it is closed. */}
        
        {railsOn && <LeftPanel allowedGroups={groupsFor(channel, isForm)} open={left} hidden={zen} phone={phone} width={leftW} canEdit={canEdit} onAdd={add} onClose={() => setLeft(false)} onOpenPanel={() => setLeft(true)}
          flow={isForm ? <FormFlowPanel blocks={blocks} view={formView} onView={goForm} flow={flow} editable={canEdit && !locked} sel={sel} onSelect={(id) => { select(id); configure(id); canvasRef.current?.querySelector<HTMLElement>(`.cblk[data-id="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }} onAddStep={addFormStep} onEditSubmit={() => openRight("page")} /> : undefined}
          railItems={(isForm ? FORM_LEFT_RAIL : LEFT_RAIL).map(([t, label, path]) => ({ key: t, label, path, active: leftTab === t, onClick: () => { setLeftTab(t); setLeft(true); } }))} lockedReason={lockReason || undefined} onEdit={veilEdit}
          onHelp={runTour} dragType={DRAG_TYPE} patternDragType={PATTERN_TYPE} onReorder={moveBlockTo} onFloatChange={setLeftFloating} blocks={blocks} selected={sel} onSelect={(id) => { select(id); canvasRef.current?.querySelector<HTMLElement>(`.cblk[data-id="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }}
          tab={leftTab} onTab={setLeftTab} patterns={isForm ? undefined : patterns} onAddPattern={addPattern} onRemovePattern={removePattern} onRestorePattern={async (p) => { try { await ucpApi.archivePattern(marketId, p.id, false); say(`${p.name} restored`); } catch { say("Could not restore"); } loadPatterns(); }} onDeletePattern={(p) => deletePatternForGood(p)} onPatternMarkets={setPatMarkets} mayManage={mayManagePattern} onStartPattern={() => startPattern()} creating={patternMode} />}
        {/* Right panel: Configure (contextual) or Page settings */}
        {railsOn && !focus && phone && <nav data-ui aria-label="Panels" className={phone ? "absolute left-0 right-0 bottom-0 h-12 bg-surface border-t border-line flex flex-row items-center justify-around px-2 z-[6]" : "absolute right-0 top-0 bottom-0 w-[52px] bg-surface border-l border-line flex flex-col items-center px-1.5 py-2.5 gap-1.5 z-[6] cursor-pointer"}>
          {/* The slim bar's own expand control, replacing the toggle that used to live in the top bar. */}
          {!phone && !right && <>
            <button type="button" title="Open the settings panel" aria-label="Open the settings panel"
              onClick={(e) => { e.stopPropagation(); if (rightTab === "block" && sel) configure(sel); else setRight(true); }}
              className="w-10 h-10 rounded-lg grid place-items-center text-ink-3 transition-[color,background-color,transform] duration-150 ease-out hover:bg-surface-3 hover:text-ink active:scale-[0.97]">
              <PanelRightOpen className="w-5 h-5" aria-hidden />
            </button>
            <span className="my-0.5 h-px w-5 bg-line" aria-hidden />
          </>}
          {phone && (isForm ? FORM_LEFT_RAIL : LEFT_RAIL).map(([t, label, path]) => { const on = left && leftTab === t; return <button key={t} type="button" title={label} aria-label={label} aria-pressed={on} onClick={() => { if (on) setLeftRaw(false); else { setLeftTab(t); setLeftRaw(true); setRight(false); } }} className={`w-10 h-10 rounded-lg grid place-items-center transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] ${on ? "bg-brand-soft text-brand" : "text-ink-3 hover:bg-surface-3 hover:text-ink"}`}><svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={path} /></svg></button>; })}
          {phone && <span className="w-px h-6 bg-line" aria-hidden />}
          {RAIL_SHOWN().map(([t, label, path]) => { const on = right && rightTab === t; const badge = t === "comments" ? commentCount : t === "insights" ? insightBadge : t === "content" ? Object.keys(bindings).length : t === "ai" ? aiTasks.filter((x) => x.stage !== "done").length : 0;
            return <button key={t} type="button" title={label} aria-label={label} aria-pressed={on} onClick={() => { if (on) { closeConfigure(true); return; } if (phone) setLeftRaw(false); if (t === "block" && sel) configure(sel); else { setRightTab(t); setRight(true); } }} className={`relative w-10 h-10 rounded-lg grid place-items-center transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] ${on ? "bg-brand-soft text-brand" : "text-ink-3 hover:bg-surface-3 hover:text-ink"}`}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={path} /></svg>
              {badge > 0 && <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-xs font-bold grid place-items-center ${on ? "bg-white text-brand" : "bg-brand text-white"}`}>{badge}</span>}
            </button>; })}
        </nav>}
        {railsOn && <aside data-ui {...rightFloat.panelProps} data-side="right" style={phone ? rightFloat.panelProps.style : rightFloat.floating ? { width: panelW, ...rightFloat.panelProps.style } : { width: zen ? 0 : right ? panelW : RAIL_W, ...rightFloat.panelProps.style }} className={panelClass("right", rightFloat.floating, phone)}>
          {/* Fixed width, like the left panel: a draggable edge is a setting nobody wants to manage. */}
          {!phone && !rightFloat.floating && <CollapsedRail side="right" show={!right && !zen} label="Open the settings panel" onOpen={() => openRight(rightTab)} items={rightItems} />}
          {rightFloat.floating && <GripStrip float={rightFloat} />}
          <PanelBody open={right} width={panelW} floating={rightFloat.floating}>
          <section aria-label="Page and component settings" className="flex min-h-0 flex-1 flex-col">
          <IconTabs label="Settings panels" items={rightItems} leading={<CollapseButton side="right" onClose={() => closeConfigure(true)} />} />
          {/* Configure is the one tab with a "deeper" state: once a block is selected there was no
              way back to the component list except Esc on the canvas, which nothing advertised. */}
          <h2 className="flex shrink-0 items-center gap-1 border-b border-line px-4 py-2 text-sm font-semibold">
            {rightTab === "block" && sel && (
              <button type="button" onClick={() => select(null)} title="Back to all components (Esc)" aria-label="Back to all components"
                className="-ms-1.5 grid size-6 flex-none cursor-pointer place-items-center rounded text-ink-3 transition-[color,background-color,transform] duration-150 ease-out hover:bg-surface-3 hover:text-ink active:scale-[0.97]">
                <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden />
              </button>
            )}
            <span className="min-w-0 truncate">{rightTitle}</span>
          </h2>
          <LockedVeil on={!!lockReason && (rightTab === "block" || rightTab === "ai")} reason={lockReason} onEdit={veilEdit}>
          {rightTab === "insights" ? <div className="flex-1 overflow-auto p-4 text-sm"><InsightsPanel blocks={blocks} page={insightMeta} onFix={(apply, label, blockId, field) => { if (!canEdit) { say("Read-only: ask a site admin for Edit"); return; } mutate(apply); say(`${label} · edit it in Component settings`); if (blockId) { backToInsights.current = true; configure(blockId); if (field) window.setTimeout(() => { const el = document.querySelector<HTMLElement>(`[data-field="${field}"]`); el?.scrollIntoView({ block: "center", behavior: "smooth" }); el?.querySelector<HTMLElement>("input, textarea, [contenteditable]")?.focus(); }, 120); } }} onSelectBlock={(id) => { select(id); const el = canvasRef.current?.querySelector<HTMLElement>(`.cblk[data-id="${id}"]`); el?.scrollIntoView({ block: "center", behavior: "smooth" }); }} onHoverBlock={(id) => { canvasRef.current?.querySelectorAll<HTMLElement>(".cblk.ins-hot").forEach((el) => el.classList.remove("ins-hot")); if (id) canvasRef.current?.querySelector<HTMLElement>(`.cblk[data-id="${id}"]`)?.classList.add("ins-hot"); }} /></div>
          : rightTab === "jira" && JIRA_TAB ? <JiraPanel marketId={marketId} path={page.path} jira={jira} step={STEPS[cur][0]} canWork={isAdmin || canEdit || can("review", page.path)} onLink={linkJira} onChange={(st) => { setJiraOn(st.integrate); setCommentsRev((n) => n + 1); }} />
          : rightTab === "comments" ? <div className="flex-1 overflow-auto p-4 text-sm"><PageComments key={`c${commentsRev}`} jira={jira ? jiraLabel(jira) : ""} jiraAuto={jiraOn} marketId={marketId} path={page.path} about={commentAbout} onClearAbout={() => setCommentAbout(null)} focusKey={commentFocus} bare {...reviewProps} /></div>
          : rightTab === "history" ? <div className="flex-1 overflow-auto p-4 text-sm"><VersionHistory marketId={marketId} path={page.path} currentBlocks={blocks.length} onCommentVersion={(a) => { setCommentAbout(a); setCommentFocus((k) => k + 1); setRightTab("comments"); }} onRestored={() => { router.refresh(); say("Version restored · reloading"); setTimeout(() => window.location.reload(), 400); }} /></div>
          : rightTab === "content" ? <div className="flex-1 overflow-auto p-4 text-sm"><EntitiesPanel marketId={marketId} base={`/${marketId}/${envId}`} pagePath={page.path} bindings={bindings} entities={entities} models={models} blocks={blocks} canEdit={canEdit && !locked} onChange={setBindings} say={say} /></div>
          : rightTab === "ai" ? <AiPanel tasks={aiTasks} draft={aiDraft} setDraft={setAiDraft} dirty={dirty} onAsk={startAiTask} onToggle={(t, id) => patchTask(t.id, (x) => ({ ...x, on: { ...x.on, [id]: !x.on[id] } }))} onRun={runAiTask} onUndo={undoAiOp} onRedo={redoAiOp} onUndoAll={undoAllAi} onSave={() => save().then(() => say("Saved")).catch(() => {})} /> : <div className="flex-1 overflow-auto text-sm">
            {/* Page settings was a flat wall of nine fields — the one tab on this side that really
                needed grouping. Same collapsible sections as Configure and the left panel, so both
                panels read the same way. Only Basics is open: the rest are reference, not edits. */}
            {rightTab === "page" && isForm ? <FormSettings marketId={marketId} base={`/${marketId}/${envId}`} path={page.path} meta={page.meta} blocks={blocks} host={host ? { ...host, rel: host.path.replace(root, "") } : undefined} editable={canEdit && !locked} status={status} title={title} flow={flow} />
            : rightTab === "page" && channel ? <MessageSettings channel={channel} template={page.template} title={title} onTitle={(v) => setPageField("title", v)} blocks={blocks} status={status} marketId={marketId} id={rel.slice(MESSAGING_FOLDER.length + 2)} path={page.path} editable={canEdit && !locked} onContract={() => setContractOpen(true)} />
            : rightTab === "page" ? <div className="flex flex-col">
              <Section t="Basics">
                <label className="text-xs text-ink-2 font-medium">Page title<input className="bdl-field mt-1" value={title} onChange={(e) => setPageField("title", e.target.value)} /></label>
                <label className="text-xs text-ink-2 font-medium">Meta description<textarea rows={3} className="bdl-field mt-1" value={description} onChange={(e) => setPageField("description", e.target.value)} placeholder="One or two sentences shown in search results" /><small className={`text-xs font-normal ${description.length > 155 ? "text-crit" : "text-ink-3"}`}>{description.length}/155 characters</small></label>
              </Section>
              <Section t="Address" open={false}>
                <div className="text-xs text-ink-2 font-medium">URL<ReadOnly title="The address this page will have. It follows the folder it lives in.">{domain}{rel}</ReadOnly></div>
                <div className="text-xs text-ink-2 font-medium">Template<ReadOnly title="Fixed when the page was created.">{TEMPLATES.find((t) => t.id === page.template)?.name ?? page.template}</ReadOnly><small className="text-xs text-ink-3 font-normal">Fixed after creation</small></div>
              </Section>
              <Section t="Languages" open={false}>
                <span className="text-xs text-ink-3">This page is {locale}. Create a translated copy in another locale.</span>
                <button className="btn btn-sm btn-secondary justify-center" onClick={() => setTranslating(true)}><Languages className="size-3.5" strokeWidth={1.5} aria-hidden />Translate this page…</button>
              </Section>
              <Section t="Tracking" open={false}>
                <div className="text-xs text-ink-2 font-medium"><label htmlFor="pg-jira">Jira ticket</label>
                  <form className="mt-1 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); void saveJira(jiraDraft); }}><input id="pg-jira" className="bdl-field min-w-0 flex-1" value={jiraDraft} onChange={(e) => { setJiraDraft(e.target.value); setJiraErr(""); }} placeholder="UCP-123 or https://…/browse/UCP-123" />
                    {jiraDraft.trim() !== jira && <button className="btn btn-sm btn-primary">Save</button>}</form>
                  {jiraErr ? <small className="text-xs block mt-1 text-crit font-normal">{jiraErr}</small> : jira ? <span className="mt-1.5 flex items-center gap-2 font-normal"><JiraChip url={jira} /><button type="button" className="btn btn-sm btn-secondary" onClick={() => void saveJira("")}>Remove link</button></span> : <small className="text-xs block mt-1 text-ink-3 font-normal">The ticket this page is built for. Everyone can open it from the page.</small>}</div>
              </Section>
              <Section t="Technical" open={false}>
                <div className="text-xs text-ink-2 font-medium">Repository path (JCR)<ReadOnly>{page.path}/jcr:content</ReadOnly><small className="text-xs text-ink-3 font-normal">Components are stored under jcr:content/root as nodes with sling:resourceType</small></div>
                <div className="text-xs text-ink-3">Created {page.created?.slice(0, 10)} · Last modified {page.lastModified?.slice(0, 16).replace("T", " ")}</div>
              </Section>
            </div>
            : !selected ? <div className="p-4 text-ink-3"><b className="block text-sm text-ink mb-1.5">Nothing selected</b>Click a block on the page to see its settings here.<div className="mt-3.5 flex flex-col gap-1.5">{blocks.slice(0, 8).map((k, ix) => <button key={k.id} className="btn btn-sm btn-secondary justify-start" onClick={() => configure(k.id)}>{ix + 1}. {BLOCK_BY_TYPE[k.type].name}</button>)}</div></div>
            : <><ConfigForm block={selected} index={blocks.indexOf(selected)} count={blocks.length} marketId={marketId} setProp={(k, v) => setProp(selected.id, k, v)} entities={entities} canEdit={canEdit && !locked} onFieldFocus={(k, l, start, end) => { if (editing) commitInline(true); lastField.current = { blockId: selected.id, k, l, start, end }; }} onChoose={(k, l) => setContentPick({ target: "field", blockId: selected.id, k, l })} />{isForm && (FORM_FIELD_TYPES.includes(selected.type) || selected.type === "formstep") && selected.type !== "fconsent" && <div className="border-t border-line px-3.5 py-3"><div className="mb-1 text-xs font-semibold">Rules</div><p className="mb-2 text-xs text-ink-3">{selected.type === "formstep" ? "Skip this step depending on an earlier answer." : "Show, hide or require this field depending on another answer, or let this answer drive other fields."}</p><RuleList rules={flow.rules} putRules={flow.putRules} blocks={blocks} editable={canEdit && !locked} only={(r) => selected.type === "formstep" ? r.then.action === "skip-step" && r.then.target === String(selected.props.title ?? "") : r.when.field === String(selected.props.name ?? "") || (r.then.action !== "skip-step" && r.then.target === String(selected.props.name ?? ""))} seed={selected.type === "formstep" ? { step: String(selected.props.title ?? "") } : { target: String(selected.props.name ?? "") }} empty={selected.type === "formstep" ? "No rule skips this step." : "No rules on this field yet."} /></div>}</>}
          </div>}
          </LockedVeil>
          {rightTab === "block" && selected && !lockReason && <div className="flex justify-end gap-2 px-3.5 py-2.5 border-t border-line bg-surface"><button className="btn btn-sm btn-secondary" onClick={() => closeConfigure(false)}>Cancel</button><button className="btn btn-sm btn-primary" onClick={() => { closeConfigure(true); say("Component updated · Save the page when you're done"); }}>Save</button></div>}
          </section>
          </PanelBody>
        </aside>}
        {/* The way out of the preview. It used to be a pill that faded after 3.5 seconds, leaving no
            control on screen at all — the editor's own "Exit preview" button sits in the top bar,
            which the preview hides, so Esc was the only way back and nothing said so any more.
            This stays put for as long as the preview is open. The sentence still fades, the button
            does not. `reviewMode` has its own Exit in the floating panel, so this stands down. */}
        {/* The way out of the preview, and the only one on screen: the editor's own "Exit preview"
            button is in the top bar, which the preview hides. Top left, because the quality
            checklist and the review panel both dock down the whole right-hand side. Shown in every
            preview, review included — gating it on `!reviewMode` left reviewers with nothing but
            the Esc key, which is exactly the state this was meant to fix. */}
        {focus && <div className="fixed top-4 left-4 z-[80] flex items-center gap-2">
          {/* the width switch travels into the preview: on a white page it needs its own ground */}
          {deviceSwitch("bg-surface shadow-lg")}
          <button type="button" className="btn btn-sm btn-primary shadow-lg" onClick={leavePreview} title="Leave the visitor preview (Esc)"><Ico d="M6 6l12 12M18 6L6 18" />Exit preview<kbd className="ml-1.5 border border-white/40 px-1 text-xs font-normal">Esc</kbd></button>
          <span aria-live="polite" className={`hidden text-xs text-white bg-bdl-charcoal px-2.5 py-1.5 transition-opacity duration-700 sm:block ${fsHint ? "opacity-100" : "opacity-0"}`}>This is what visitors see</span>
        </div>}
        {/* No Exit in this panel's header: the fixed "Exit preview" button above is on screen for
            the whole preview, review included, so a second one here only split the way out. */}
        {focus && reviewMode && <FloatingPanel title={status === "bizreview" && bizAssigned && mayBizApprove ? "Review" : "Comments"} count={commentTotal} open={floatOpen} onToggle={setFloatOpen} hint={commentTarget || (status === "bizreview" && bizAssigned && mayBizApprove) ? undefined : "Click a text, an image or a component on the page to comment on it."}>
          {status === "bizreview" && bizAssigned && mayBizApprove && <section aria-labelledby="dec-b" className="mb-3"><h3 id="dec-b" className="text-xs font-medium uppercase tracking-[.08em] text-ink-3">Decision</h3><div className="mt-1.5 rounded-lg border border-line bg-surface-2 p-3 text-sm">
            <p className="text-xs text-ink-3">Everything right? Sign it off. Something to change? Send it back to the author.</p>
            {askingB ? <><p className="text-xs mt-1">{askingB === "signoff" ? "Sign off this page? It becomes ready to publish." : "Send it back to the author? The page goes back to Build the page."}</p>
              <div className="flex gap-2 mt-2"><button className={`btn btn-sm btn-secondary ${askingB === "signoff" ? "btn-next" : "btn-primary"}`} onClick={() => void decideFS(askingB)}>{askingB === "signoff" ? "Yes, sign off" : "Yes, reauthor"}</button><button className="btn btn-sm btn-secondary" onClick={() => setAskingB(null)}>Cancel</button></div></>
              : <div className="flex flex-wrap gap-2 mt-2"><button className="btn btn-sm btn-primary btn-next" onClick={() => setAskingB("signoff")}>Sign off</button><button className="btn btn-sm btn-secondary" onClick={() => setAskingB("reauthor")}>Reauthor</button></div>}
          </div></section>}
          {status === "bizreview" && bizAssigned && mayBizApprove && <h3 className="text-xs font-medium uppercase tracking-[.08em] text-ink-3 mb-2 pt-3 border-t border-line">Comments <span className="normal-case tracking-normal font-normal text-ink-4">· click a text or an image on the page to comment on it</span></h3>}
          <PageComments marketId={marketId} path={page.path} about={null} onClearAbout={() => {}} focusKey={0} bare {...reviewProps} />
        </FloatingPanel>}
        {/* Clear of the status bar (36px + the 16px it would otherwise sit at): docked at the
            bottom right, this panel and its folded button covered the bar's next-step button. */}
        {qcMode && <FloatingPanel title="Quality checklist" bottom={focus ? 16 : 52} open={qcOpen} onToggle={setQcOpen} icon={<svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6h11M9 12h11M9 18h11" /><path d="M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17" /></svg>}
          hint={qcPinned ? <span className="flex items-center gap-2">Pinned · this stays while you look<button type="button" className="ml-auto underline" onClick={() => { setQcPinned(false); setQcTarget(null); }}>Whole page</button></span> : qcTarget ? "Click to pin it" : undefined}>
          <QualityChecklist blocks={blocks} meta={insightMeta} url={`https://${domain}${rel}`} templateName={TEMPLATES.find((t) => t.id === page.template)?.name ?? page.template ?? "Page"} target={qcTarget} onShow={(id) => { revealBlock(id); setQcFlash(id); window.setTimeout(() => setQcFlash((v) => (v === id ? "" : v)), 1600); }} onSend={canEdit && (status === "draft" || status === "failed") ? () => { leavePreview(); openSend(); } : undefined} />
        </FloatingPanel>}
        {decidedB && <DecisionOverlay decision={decidedB.decision} title={title} by={user.name} at={decidedB.at} action={<button className="btn btn-sm btn-primary" onClick={() => { setDecidedB(null); if (focus) setFocusMode(false); }}>Back to the builder</button>} />}
        {/* formatting bar over the text being edited (long text fields only) */}
        {editing && inlinePos?.rich && !contentPick && <div data-ui className="fixed z-30 bg-foreground rounded-lg p-1 shadow-xl" style={{ top: inlinePos.barTop, left: inlinePos.barLeft }}><FormatBar getRoot={getEditingEl} state={fmt} dark lists={inlinePos.lists} /></div>}
        {editing && inlinePos && !contentPick && <button type="button" data-ui className="fixed z-30 w-7 h-7 rounded-full grid place-items-center bg-info text-white shadow-lg hover:scale-105 transition-transform" style={{ top: inlinePos.top, left: inlinePos.left }} onMouseDown={(e) => e.preventDefault()} onClick={() => { setTokTyped(false); setContentPick({ target: "inline", label: "this text" }); }} title="Choose content from an entity" aria-label="Choose content from an entity"><ContentIcon className="w-3.5 h-3.5" /></button>}
        
        {contentPick && <ContentPicker marketId={marketId} marketName={marketName} flag={flag} locale={locale} models={models} current={contentPick.target === "field" ? contentPick.l : undefined} onClose={() => { setContentPick(null); setTokTyped(false); editingEl.current?.focus({ preventScroll: true }); }} onPick={(c) => void applyContent(c)} />}
        {remind > 0 && (() => { const rvName = status === "bizreview" ? bizName : assigneeName; const stageWord = status === "bizreview" ? "sign it off" : "review it"; const sent = typeof page.meta?.["ucp:sentAt"] === "string" ? String(page.meta["ucp:sentAt"]) : ""; const recent = !!remindedAt && remind - Date.parse(remindedAt) < 15 * 60_000; const who = rvName || (status === "bizreview" ? "the business reviewers" : "the reviewers");
          const sendIt = async () => { setReminding(true); try { const r = await ucpApi.remindReviewer(marketId, page.path); setRemindedAt(r.remindedAt); setRemind(0); say(`Reminder sent to ${r.reviewer}`); } catch (e) { say(e instanceof ApiError ? e.message : "Could not send the reminder"); } finally { setReminding(false); } };
          return <ModalShell title={`Remind ${rvName ? rvName.split(" ")[0] : (status === "bizreview" ? "the business reviewers" : "the reviewers")}?`} width={480} onClose={() => setRemind(0)}
            footer={<>{isAdmin && status === "bizreview" && <button className="btn btn-sm btn-secondary mr-auto" onClick={() => { setRemind(0); transition("approved", "Signed off as site admin · ready to publish"); }} title="Site admin: sign off on behalf of the business reviewer">Sign off now</button>}<button className="btn btn-sm btn-secondary" onClick={() => setRemind(0)}>Cancel</button><button className="btn btn-sm btn-primary" disabled={reminding || recent} onClick={sendIt}>{reminding ? "Sending…" : "Yes, send a reminder"}</button></>}>
            <p className="text-sm"><b>{title}</b> is waiting for {rvName ? <b>{rvName}</b> : (status === "bizreview" ? "a business reviewer" : "a reviewer")} to {stageWord}{sent ? <> since <span suppressHydrationWarning>{new Date(sent).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}</span></> : null}.</p>
            <p className="text-sm mt-2">Send {who} a reminder that you are waiting? It shows up in their notifications and at the top of their tasks.</p>
            {remindedAt && <p className={`text-xs rounded-md px-3 py-2 mt-3 ${recent ? "bg-warn-soft" : "bg-surface-2 text-ink-2"}`} suppressHydrationWarning>{recent ? "You sent a reminder a few minutes ago. Give them a moment before sending another." : `Last reminder: ${new Date(remindedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })}`}</p>}
          </ModalShell>; })()}
        {backToReview && <ModalShell title="Review is already done" width={500} onClose={() => setBackToReview(false)}
          footer={<><button className="btn btn-sm btn-secondary" onClick={() => setBackToReview(false)}>Keep approval</button><button className="btn btn-sm btn-primary" onClick={async () => { const wasScheduled = status === "scheduled"; setBackToReview(false); await transition("review", `Back in review${assigneeName ? ` with ${assigneeName}` : ""}`); if (wasScheduled) { await repoApi.setProps(`${page.path}/jcr:content`, { "ucp:publishAt": null }).catch(() => {}); setPublishAt(undefined); } router.refresh(); }}>Send back to review</button></>}>
          <p className="text-sm">This page is <b>approved</b> and ready to publish.</p>
          <p className="text-sm mt-2">Sending it back removes the approval. {assigneeName ? `The reviewer, ${assigneeName}, has` : "A reviewer has"} to approve it again before it can go live.</p>
          {status === "scheduled" && publishAt && <p className="text-sm bg-warn-soft rounded-md px-3 py-2 mt-3">The scheduled publish on <b>{new Date(publishAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</b> is cancelled.</p>}
        </ModalShell>}
        {decide && <ReviewedChoice title={title} onBehalf={status === "inreview" && onBehalf ? assigneeName || "the reviewer" : undefined} onClose={() => setDecide(false)} onSend={sendToBiz} onReauthor={() => reauthor(true)} />}
        {/* The draft share: without this the "Share draft" button set `share` and nothing rendered,
            because the only ShareReviewDialog here was the business-review one. */}
        {share && shareIn === "bar" && (status === "draft" || status === "failed") && <ShareReviewDialog key="draft" marketId={marketId} path={page.path} title={title} stage="draft" onClose={() => setShare(false)} />}
        {share && status === "bizreview" && <ShareReviewDialog key={status} marketId={marketId} path={page.path} title={title} stage="bizreview" onClose={() => setShare(false)} onAccess={(a) => { if (a.group) setBizGroups((g) => (g.includes(a.group!) ? g : [...g, a.group!])); if (a.person) setBizTaken(a.person); }}
          onApprove={isAdmin ? () => transition("approved", "Signed off as site admin · ready to publish") : undefined} />}
        {publishing && <PublishDialog marketId={marketId} envName={envName} pages={[{ path: page.path, title, status, publishAt }]} mayPublish={() => mayStatus("published")} onClose={() => setPublishing(false)}
          onDone={(r, m) => { const x = r[0]; setPublishing(false); if (!x?.ok) { say(x?.reason ?? "Nothing was published"); return; } setStatus(x.status as PageStatus); setPublishAt(undefined); say(m === "cancel" ? "Schedule cancelled · back to Approved" : m === "schedule" ? "Scheduled for publishing" : `Published to ${envName}`); router.refresh(); }} />}
        {sending && shareIn === "bar" && <SendForReviewModal marketId={marketId} pagePath={page.path} onClose={() => setSending(false)} onSend={sendForReview} />}
        {contractOpen && isForm && <FormContract marketId={marketId} id={page.name} name={title} onClose={() => setContractOpen(false)} />}
        {contractOpen && channel && <MessageContract marketId={marketId} id={rel.slice(MESSAGING_FOLDER.length + 2)} name={title} channel={channel} onClose={() => setContractOpen(false)} />}
        {translating && <TranslateModal marketId={marketId} path={page.path} title={title} onClose={() => setTranslating(false)} onDone={(created) => { say(`Created ${created.length} translation${created.length === 1 ? "" : "s"}`); router.refresh(); }} />}
        {firstStage && <AuthorsChip trigger={false} anchorRef={actionsRef} openSignal={authorsSignal} authors={authors} meId={user.id} admin={isAdmin} canEdit={canEdit} people={names} onAction={authorAction} />}
        {toast && <div style={{ bottom: focus ? 24 : 60 }} className="fixed left-1/2 z-[90] -translate-x-1/2 rounded-lg bg-foreground px-4 py-2.5 text-sm text-background shadow-xl">{toast}</div>}
        {/* Closing mirrors opening: the same spinner-over-label as the "Loading editor" skeleton, so the editor opens and shuts with one look. */}
        {closing && <EditorVeil label={closing} detail={title} />}
      </div>
      {/* Page progress: one slim row — [Workflow · N of 11] · the step you are on · what to do next.
          The list of every step lives in a drawer (the app's Sheet, as the asset details use), not a
          floating card: eleven steps with descriptions is a panel's worth of reading, and a dropdown
          hanging over the canvas had nothing holding it.
          The action slot has a fixed width so the step name does not shift as the actions change. */}
      {!focus && (() => {
        const act = hasAct(cur) ? cur : (MOBILE_ORDER.find(hasAct) ?? -1);
        const back = backAny();
        const done = cur === LAST;
        return <div className="flex items-center gap-3 border-t border-white bg-bdl-charcoal px-4 text-white">
          <p className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <StepDot n={cur + 1} done={done} tone={done ? "prev" : "cur"} />
            <b className="truncate font-medium text-white">{STEPS[cur][0]}</b>
            <span className="hidden truncate text-xs text-white/55 lg:inline">{STEPS[cur][1]}</span>
            {hasAct(cur) && insightWarn}
          </p>
          <div className="flex flex-none items-center gap-2"><div className="flex w-[27rem] flex-none flex-nowrap items-center justify-end gap-2" onClickCapture={() => setShareIn("bar")}>
            {back && <button type="button" onClick={back} className="btn btn-sm btn-secondary" title={`Back to ${STEPS[cur - 1][0]}`}>‹ Back</button>}
            {act >= 0 && <>{stepBack(act)}{stepAct(act)}</>}
          </div>
          <button type="button" onClick={() => setFlowOpen(true)} aria-haspopup="dialog"
            title="See every step: what is done and what is still ahead"
            className="flex flex-none items-center gap-2 border border-white/30 px-2.5 py-1.5 text-xs leading-4 font-medium whitespace-nowrap text-white/80 hover:border-white hover:text-white">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></svg>
            Workflow<span className="tabular-nums text-white/55">{cur + 1}/{STEPS.length}</span>
          </button></div>
        </div>;
      })()}
      {/* Every step, in a drawer. Not in preview: that belongs to the quality checklist. */}
      {!focus && (() => { const act = hasAct(cur) ? cur : (MOBILE_ORDER.find(hasAct) ?? -1);
        /* the draft steps share by link, so the drawer carries the link itself */
        /* Steps that hand the page to somebody by link share it inside the drawer, as step 2 does:
           the draft steps share the draft link, and "Waiting for a reviewer" shares the review link
           (stage "review" was supported by the dialog but had no call site, so while the page sat in
           the queue there was no way to send the link on or chase anyone). */
        const shareStage: "draft" | "review" | null =
          (status === "draft" || status === "failed") && (cur === 1 || cur === 2) ? "draft"
          : status === "review" && (cur === 3 || cur === 4) ? "review" : null;
        const shareHere = shareStage !== null;
        return <Sheet open={flowOpen} onOpenChange={(o) => { if (!o) setFlowOpen(false); }}>
        <SheetContent side="right" className="flex w-[min(26rem,100vw)] flex-col gap-0 p-0 sm:max-w-none">
          <SheetHeader className="gap-1 border-b border-line px-5 py-4 pe-12 text-left">
            <SheetTitle className="text-base font-medium">Workflow</SheetTitle>
            <SheetDescription className="text-xs text-ink-3">{cur === LAST ? "All done" : `Step ${cur + 1} of ${STEPS.length} · ${cur} done`}</SheetDescription>
          </SheetHeader>
          <ol className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {STEPS.map((st, i) => { const was = i < cur || (cur === LAST && i === LAST); const now = i === cur && cur !== LAST;
              const plan = i < cur ? backPlan(i) : null;
              const dim = share && shareIn === "drawer" && !shareClosing && i > cur; // the share has the floor
              return <li key={st[0]} aria-current={now ? "step" : undefined} className={`relative flex gap-3 py-2.5 transition-opacity duration-200 ${now ? "bg-brand-soft/50 -mx-2 px-2" : ""} ${dim ? "opacity-35" : ""}`}>
                {i < LAST && <span aria-hidden className={`absolute left-[11px] top-9 bottom-0 w-px ${was ? "bg-good" : "bg-line"}`} />}
                <StepDot n={i + 1} done={was} tone={was ? "prev" : now ? "cur" : "todo"} />
                <span className="min-w-0 flex-1">
                  <span className={`flex items-center gap-2 text-xs ${now ? "font-medium text-brand-hover" : was ? "text-ink" : "text-ink-2"}`}><span className="min-w-0 truncate" title={st[0]}>{st[0]}</span>{now && FF[i] && <Tooltip><TooltipTrigger render={<button type="button" aria-label={`Demo only: skip to ${FF[i].label}`} onClick={() => void ffJump(i)} className="grid h-5 w-5 flex-none place-items-center border border-line-2 text-ink-3 hover:border-ink-4 hover:text-ink" />}><svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 fill-current"><path d="M4 5l8 7-8 7zM13 5l8 7-8 7z" /></svg></TooltipTrigger><TooltipContent>Demo only · skips to “{FF[i].label}” without the real handover</TooltipContent></Tooltip>}
                    {/* what the step is waiting on, once the draft link has gone out */}
                    {i === 2 && draftPhase === "shared" && <span className="flex-none border border-bdl-rag-blue bg-bdl-info-bg px-1.5 text-xs text-bdl-charcoal">{commentTotal ? `${commentTotal} comment${commentTotal === 1 ? "" : "s"}` : "Awaiting"}</span>}
                    {now && <span className="ms-auto flex-none text-xs font-medium tracking-[.06em] text-brand uppercase">Now</span>}
                    {!was && !now && <span className="ms-auto flex-none text-xs text-ink-3">{OPTIONAL.has(i) ? "Optional" : "To do"}</span>}</span>
                  <span className="block text-xs leading-snug text-ink-3">{st[1]}</span>
                  {now && hasAct(cur) && insightWarn && <span className="mt-1 block">{insightWarn}</span>}
                  {/* the same refusal the quality checklist gives, where the send would otherwise be */}
                  {now && i === 1 && insightBadge > 0 && <span role="status" className="alert alert-error mt-2 text-xs"><span>This page cannot go for review until the {insightBadge} <b>Must fix</b> {insightBadge === 1 ? "item is" : "items are"} done.</span></span>}
                  {plan && <button type="button" className="btn btn-sm btn-secondary mt-1.5" onClick={() => { setFlowOpen(false); void plan.run(); }}>Go back to this step</button>}
                  {now && (act >= 0 || shareHere) && <span className="flow-actions mt-1.5 flex flex-wrap items-center gap-2 [&>span.text-warning]:basis-full" onClickCapture={() => setShareIn("drawer")}>
                    {act >= 0 && <>{stepBack(act)}{stepAct(act)}</>}
                    {shareStage === "review" && !share && <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setShareIn("drawer"); setShare(true); }}>Share link</button>}</span>}
                  {now && sending && shareIn === "drawer" && <span className="cmt-card-in mt-2.5 block border-t border-line pt-2.5">
                    <SendForReviewModal inline marketId={marketId} pagePath={page.path} onClose={() => setSending(false)} onSend={sendForReview} />
                  </span>}
                  {now && shareHere && share && shareIn === "drawer" && <span className={`${shareClosing ? "cmt-card-out" : "cmt-card-in"} mt-2.5 block border-t border-line pt-2.5`}>
                    <ShareReviewDialog inline marketId={marketId} path={page.path} title={title} stage={shareStage!} onClose={closeDrawerShare} onAccess={(a) => { if (a.person) setAssignee(a.person); }} />
                    <button type="button" className="btn btn-sm btn-secondary mt-3" onClick={closeDrawerShare}>Done</button>
                  </span>}
                </span>
              </li>; })}
          </ol>
        </SheetContent>
      </Sheet>; })()}
      {/* Both steppers live here while the new eleven-step one is tried out. `BOTTOM_BAR`
         back to true brings our charcoal status bar back and hides hers; nothing else changes. */}
      {BOTTOM_BAR && <>
        {/* Progress, as a status bar along the bottom.
            It used to be a 48px white band under the top bar: a second header, with 24px circles and
            a pill for the current step, both of which fight BDL's square corners, and a light strip
            between the white chrome and the dark canvas. BDL has no stepper of its own, so this is
            built from its tokens — charcoal ground, square marks, BDL red for where the page is now,
            BDL's success teal behind it. The nine names live on the marks; the bar itself says only
            which step this is, and carries the one action that moves the page on. */}
        {/* `border-white`: the canvas ground (#31363d) and this bar (#333333) are near enough to read
            as one dark area once the page is scrolled to the bottom, so a hairline keeps the edge. */}
        {!focus && <div className="flex items-center gap-3 border-t border-white px-3 bg-bdl-charcoal text-white">
          {/* Every step is named, not just the one the page is on: the bar is the overview of the
              whole run, so you can see what is behind and what is still to come without hovering.
              Short names carry the row; the step in progress gets its full name and the weight.
              Below `lg` there is no room for nine, so it falls back to the current step alone. */}
          <ol className="flex min-w-0 flex-1 items-center overflow-hidden" aria-label="Page progress">
            {STEPS.map((s, i) => { const done = i < cur || (cur === 8 && i === 8); const on = i === cur && cur !== 8;
              return <li key={s[0]} aria-current={on ? "step" : undefined} title={`${i + 1}. ${s[0]} · ${s[1]}`}
                className={`flex-none items-center gap-1.5 ${on ? "flex" : "hidden lg:flex"}`}>
                <span aria-hidden className={`h-2 w-2 flex-none ${done ? "bg-success" : on ? "bg-bdl-red" : "bg-white/25"}`} />
                <span className={`whitespace-nowrap text-xs ${on ? "font-medium text-white" : done ? "text-white/70" : "text-white/45"}`}>
                  {on ? s[0] : STEP_SHORT[i]}<span className="sr-only">{done ? " · done" : on ? " · where the page is now" : " · still to come"}</span>
                </span>
                {i < STEPS.length - 1 && <span aria-hidden className="mx-2 hidden h-px w-3 flex-none bg-white/20 lg:block" />}
              </li>; })}
          </ol>
          {actStep !== undefined && <div className="flex flex-none items-center gap-2">{stepAct(actStep)}</div>}
        </div>}
      </>}
    </div>
  );
}

/* ---- contextual toolbar at the selected block: Edit · AI · More (+ Configure on phones, where clicking only selects) ---- */
function Btn({ children, on, onClick, disabled, title }: { children: React.ReactNode; on?: boolean; onClick: () => void; disabled?: boolean; title: string }) { return <button title={title} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onClick(); }} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap disabled:opacity-40 ${on ? "bg-brand text-white" : "hover:bg-white/15"}`}>{children}</button>; }
type MoreAction = "duplicate" | "copy" | "paste" | "up" | "down" | "hide" | "lock" | "delete" | "history" | "pattern";
function ContextBar({ block: b, index, count, mode, pop, setPop, clipboard, aiSeed, unzoom = 1, moveType, onMoveStart, onMoveEnd, onEdit, onConfigure, onMore, onAi }: { block: Block; index: number; count: number; unzoom?: number; moveType?: string; onMoveStart?: (id: string) => void; onMoveEnd?: () => void; mode: "select" | "edit"; pop: "ai" | "more" | null; setPop: (p: "ai" | "more" | null) => void; clipboard: Block | null; aiSeed?: string; onEdit: () => void; onConfigure?: () => void; onMore: (a: MoreAction) => void; onAi: (p: AiProposal) => void }) {
  const locked = !!b.props.locked; const editing = mode === "edit";
  const [prompt, setPrompt] = useState(""); const [proposal, setProposal] = useState<AiProposal | null>(null);
  const ask = (p: string) => { setPrompt(p); setProposal(proposeAi(p, b)); };
  // A prompt from the palette (aiSeed) pre-fills and runs the popover once per seed: state adjusted during render, no effect needed.
  const [seenSeed, setSeenSeed] = useState(""); if (pop === "ai" && aiSeed && aiSeed !== seenSeed) { setSeenSeed(aiSeed); setPrompt(aiSeed); setProposal(proposeAi(aiSeed, b)); }
  const items: [MoreAction, string, boolean?][] = [["duplicate", "Duplicate"], ["copy", "Copy"], ["paste", "Paste after", !clipboard], ["hide", b.props.hidden ? "Show" : "Hide"], ["lock", locked ? "Unlock" : "Lock"], ["history", "Version history"], ["delete", "Delete"]];
  /* The bar swallows mousedown so clicking a button never moves the caret out of the text being
     edited — but Chrome will not begin a native drag once mousedown's default is prevented, so the
     grip has to be let through. */
  return <div data-ui className="absolute -top-5 left-3 z-[4]" onMouseDown={(e) => { e.stopPropagation(); if (!(e.target as HTMLElement).closest("input, textarea, [data-grip]")) e.preventDefault(); }} onDoubleClick={(e) => e.stopPropagation()}>
    {/* `zoom` nests multiplicatively, so 1/fit inside the frame's `fit` lands back at 1:1. */}
    <div role="toolbar" style={{ zoom: unzoom }} aria-label={`${BLOCK_BY_TYPE[b.type].name} actions`} className="flex items-center gap-0.5 bg-foreground text-background rounded-lg p-1 shadow-xl">
      {/* Grip: drag the block to a new place on the page. The arrows stay — they are the
          keyboard-reachable way to do the same thing, and they are faster for one step. */}
      {moveType && !locked && <span draggable data-grip
        onDragStart={(e) => { e.dataTransfer.setData(moveType, b.id); e.dataTransfer.effectAllowed = "move"; onMoveStart?.(b.id); }}
        onDragEnd={() => onMoveEnd?.()}
        title="Drag to move this component" aria-label="Drag to move this component"
        className="inline-flex cursor-grab items-center self-stretch px-1 text-white/50 hover:text-white active:cursor-grabbing">
        <GripVertical className="size-4" strokeWidth={1.6} aria-hidden />
      </span>}
      <b className="px-2 text-xs text-white/70 border-r border-white/15 mr-0.5">{BLOCK_BY_TYPE[b.type].name}{locked ? " · locked" : ""}{b.props.hidden ? " · hidden" : ""}</b>
      <Btn title={editing ? "Finish editing text" : "Edit text, images and buttons in place"} on={editing} onClick={onEdit} disabled={locked}>{editing ? "Done" : "Edit"}</Btn>
      {onConfigure && <Btn title="All properties, layout and behaviour" onClick={onConfigure}>Configure</Btn>}
      <Btn title="Create a design pattern starting with this component" onClick={() => onMore("pattern")}><span className="inline-flex items-center gap-1.5"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={1.8} strokeLinejoin="round" aria-hidden><path d={PATTERN_ICON} /></svg>Pattern</span></Btn>
      <Btn title="Ask AI to change this block" on={pop === "ai"} onClick={() => { setPop(pop === "ai" ? null : "ai"); setProposal(null); }} disabled={locked}><Sparkles className="size-3.5" strokeWidth={1.5} aria-hidden />AI</Btn>
      <span className="w-px h-5 bg-white/20 mx-0.5" aria-hidden />
      <Btn title="Move up" onClick={() => onMore("up")} disabled={index === 0 || locked}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" /></svg></Btn>
      <Btn title="Move down" onClick={() => onMore("down")} disabled={index === count - 1 || locked}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 5v14M5 12l7 7 7-7" /></svg></Btn>
      <Btn title="Delete block" onClick={() => onMore("delete")} disabled={locked}><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg></Btn>
      <Btn title="More actions" on={pop === "more"} onClick={() => setPop(pop === "more" ? null : "more")}><MoreHorizontal className="size-4" strokeWidth={1.8} aria-hidden /></Btn>
    </div>
    {pop === "more" && <div role="menu" className="absolute left-0 top-full mt-1 w-44 bg-surface border border-line rounded-lg shadow-2xl py-1 text-sm text-ink">{items.map(([a, l, dis]) => <button key={a} role="menuitem" disabled={dis} onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); onMore(a); }} className={`w-full text-left px-3 py-1.5 hover:bg-surface-3 disabled:opacity-40 ${a === "delete" ? "text-brand border-t border-line mt-1" : ""}`}>{l}</button>)}</div>}
    {pop === "ai" && <div className="absolute left-0 top-full mt-1 w-[min(440px,calc(100vw-24px))] bg-surface border border-line rounded-xl shadow-2xl p-3.5 text-sm text-ink">
      <div className="flex items-center mb-2"><b className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5" strokeWidth={1.5} aria-hidden />What would you like to change?</b><span className="ml-auto text-xs text-ink-3">{BLOCK_BY_TYPE[b.type].name} only</span></div>
      {!proposal && <div className="flex flex-col gap-1 mb-2.5">{AI_SUGGESTIONS.map((s) => <button key={s} onMouseDown={(e) => e.preventDefault()} className="text-left px-2.5 py-1.5 rounded-md border border-line hover:border-ink hover:bg-surface-2" onClick={(e) => { e.stopPropagation(); ask(s); }}>“{s}”</button>)}</div>}
      {proposal && <div className="mb-2.5">
        <div className="text-xs text-ink-3 mb-1.5">{proposal.note}</div>
        {Object.entries(proposal.props).length > 0 && <div className="border border-line rounded-md divide-y divide-line max-h-60 overflow-auto">{Object.entries(proposal.props).map(([k, v]) => <div key={k} className="p-2"><div className="text-xs uppercase tracking-[.06em] text-ink-3 font-medium">{k}</div><div className="line-through text-ink-3 text-xs break-words">{toPlain(b.props[k])}</div><div className="text-xs break-words">{toPlain(v)}</div></div>)}</div>}
        <div className="flex justify-end gap-2 mt-2.5"><button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); setProposal(null); }}>Discard</button>{Object.keys(proposal.props).length > 0 && <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); onAi(proposal); setProposal(null); setPop(null); }}>Apply</button>}</div>
      </div>}
      <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); if (prompt.trim()) ask(prompt.trim()); }}><input className="bdl-field flex-1" placeholder="Ask AI…" value={prompt} onChange={(e) => setPrompt(e.target.value)} /><button className="btn btn-sm btn-primary">Ask</button></form>
    </div>}
  </div>;
}

/* ---- Configure panel: Content / Layout / Behaviour / Metadata ---- */
type PropCtl = { P: Record<string, unknown>; setProp: (k: string, v: unknown) => void };
/* A single-choice control, so it is announced as one: radiogroup + radio, not a row of buttons. */
function Seg({ P, setProp, k, opts, label }: PropCtl & { k: string; opts: string[]; label?: string }) {
  const value = String(P[k] ?? opts[0]);
  return <div role="radiogroup" aria-label={label ?? k} className="flex gap-1">{opts.map((o) => <button key={o} type="button" role="radio" aria-checked={value === o} className={`bdl-chip flex-1 justify-center capitalize ${value === o ? "bdl-chip-active" : ""}`} onClick={() => setProp(k, o)}>{o}</button>)}</div>;
}
/* A real checkbox in BDL's own class, not a hand-rolled switch: it is the house control, it is
   reachable by keyboard and announced as a checkbox, and its label is properly associated. */
function Tog({ P, setProp, k, l }: PropCtl & { k: string; l: string }) {
  const id = `tog-${k}`;
  return <div className="flex items-start gap-2.5"><input id={id} type="checkbox" className="bdl-checkbox bdl-checkbox-sm mt-px" checked={!!P[k]} onChange={(e) => setProp(k, e.target.checked)} /><label htmlFor={id} className="text-xs font-medium text-ink-2">{l}</label></div>;
}
/* Configure's groups are collapsible now (same component as the left panel's groups), so a block
   with a long Content list no longer buries Layout, Behaviour and Metadata below the fold.
   Content is the one open by default — it is what the author came for. */
/**
 * A value you can read but not change — the URL, the template, the repository path.
 *
 * Built on `.bdl-field` so it is exactly the size of an editable field: these used to be 12px
 * in a lighter box, which read as a smaller, different kind of control sitting among the real
 * ones. The muted fill and the leading padlock are what say "read-only", not a change of scale.
 */
function ReadOnly({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    /* Padlock first, value after — the same icon-then-content order as the search fields, so
       the mark that says "you cannot change this" is read before the thing you cannot change. */
    <div className="bdl-field mt-1 flex items-center gap-2 !bg-surface-2 !text-ink-2" title={title}>
      <Lock className="size-3.5 shrink-0 text-ink-4" strokeWidth={1.5} aria-label="Read-only" />
      <span className="min-w-0 flex-1 break-all font-normal">{children}</span>
    </div>
  );
}

function Section({ t, children, open }: { t: string; children: React.ReactNode; open?: boolean }) {
  // An id so the header's `aria-controls` actually points at the region it expands.
  return <PanelSection id={`sec-${t.toLowerCase().replace(/\W+/g, "-")}`} title={t} defaultOpen={open ?? true}><div className="flex flex-col gap-3">{children}</div></PanelSection>;
}
type FieldFocus = (k: string, l: string, start: number, end: number) => void;
/** Remembers the caret of the last focused text field so token chips insert where the author was typing. */
const track = (k: string, l: string, fn: FieldFocus) => (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => { const t = e.currentTarget; fn(k, l, t.selectionStart ?? t.value.length, t.selectionEnd ?? t.value.length); };
/** "{ } Insert content" next to a text field: popover with the page's {{alias.field}} chips. */
/** Under a text field that inherits content: where it comes from, with a way to stop inheriting. */
function Inherited({ value, entities, onStop }: { value: string; entities: ResolvedEntities; onStop: (text: string) => void }) {
  const m = value.trim().match(/^\{\{\s*([a-zA-Z][\w-]*)\.([\w-]+)\s*\}\}$/); if (!m) return null; const e = entities[m[1]]; const v = e ? (m[2] === "title" ? e.values?.title ?? e.title : e.values?.[m[2]]) : undefined; const text = typeof v === "string" ? v : v === undefined ? "" : String(v);
  return <div className={`mt-1 flex items-center gap-2 text-xs rounded-md px-2 py-1 ${e ? "bg-info-soft text-info" : "bg-crit-soft text-crit"}`}><span className="min-w-0 truncate">{e ? <>⤓ From <b>{e.title}</b> · {m[2]}{text ? <> · “{text.replace(/<[^>]+>/g, " ").slice(0, 40)}”</> : null}</> : "Not linked to an entity on this page"}</span>{e && <button type="button" className="ml-auto flex-none underline" onClick={() => onStop(text)}>Stop inheriting</button>}</div>;
}
function ConfigForm({ block: selected, index, count, marketId, setProp, entities, canEdit, onFieldFocus, onChoose }: { block: Block; index: number; count: number; marketId: string; setProp: (k: string, v: unknown) => void; entities: ResolvedEntities; canEdit: boolean; onFieldFocus: FieldFocus; onChoose: (k: string, l: string) => void }) {
  const def = BLOCK_BY_TYPE[selected.type]; const P = selected.props;
  // The intro carries the panel's standard 16px inset; the sections below are flush to the
  // panel and add their own, so Configure lines up with Page settings exactly.
  return <div className="flex flex-col">
    <div className="px-4 py-3"><b className="text-sm">{def.name}</b><div className="text-xs text-ink-3">{def.desc}</div></div>
    <Section t="Content">{def.fields.map((f) => { const v = selected.props[f.k]; const invalid = f.req && !toPlain(v).trim(); return <div key={f.k} data-field={f.k}><label className="flex items-center text-xs text-ink-2 font-medium mb-1">{f.l}{(f.t === "text" || f.t === "textarea") && canEdit ? <button type="button" className="ml-auto mr-2 w-6 h-6 rounded grid place-items-center text-info hover:bg-info-soft" onMouseDown={(e) => e.preventDefault()} onClick={() => onChoose(f.k, f.l)} title="Choose content from an entity" aria-label={`Choose content from an entity for ${f.l}`}><ContentIcon /></button> : <span className="ml-auto" />}{f.req && <small className="text-xs text-ink-4">required</small>}</label>
      {f.t === "text" && !f.mono ? <RichField inline value={v} label={f.l} invalid={invalid} disabled={!canEdit} onChange={(html) => setProp(f.k, html)} onFocus={() => onFieldFocus(f.k, f.l, 0, 0)} />
      : f.t === "text" ? <input className={`bdl-field ${invalid ? "!border-crit" : ""}`} value={String(v ?? "")} onChange={(e) => setProp(f.k, e.target.value)} onFocus={track(f.k, f.l, onFieldFocus)} onSelect={track(f.k, f.l, onFieldFocus)} />
      : f.t === "textarea" && f.rich ? <RichField value={v} label={f.l} invalid={invalid} disabled={!canEdit} onChange={(html) => setProp(f.k, html)} onFocus={() => onFieldFocus(f.k, f.l, 0, 0)} />
      : f.t === "textarea" ? <textarea rows={4} className={`bdl-field ${invalid ? "!border-crit" : ""}`} value={String(v ?? "")} onChange={(e) => setProp(f.k, e.target.value)} onFocus={track(f.k, f.l, onFieldFocus)} onSelect={track(f.k, f.l, onFieldFocus)} />
      : f.t === "lines" ? <ListEditor rows={lines(v)} hint={f.hint} onChange={(rows) => setProp(f.k, joinLines(rows))} />
      : f.t === "select" ? <div className="flex gap-1">{f.o!.map((o) => <button key={o} className={`bdl-chip capitalize ${v === o ? "bdl-chip-active" : ""}`} onClick={() => setProp(f.k, o)}>{o}</button>)}</div>
      : f.t === "bool" ? <button className={`w-9 h-5 rounded-full relative ${v ? "bg-good" : "bg-line-2"}`} aria-pressed={!!v} onClick={() => setProp(f.k, !v)}><i className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${v ? "left-4" : "left-0.5"}`} /></button>
      : f.t === "asset" ? <AssetPicker marketId={marketId} value={String(v ?? "")} invalid={invalid} onChange={(id) => setProp(f.k, id)} />
      : <input className="bdl-field" value={String(v ?? "")} onChange={(e) => setProp(f.k, e.target.value)} />}
      {(f.t === "text" || f.t === "textarea") && <Inherited value={String(v ?? "")} entities={entities} onStop={(text) => setProp(f.k, text)} />}
      {invalid ? <div className="text-xs text-crit mt-1">Required before the page can be sent for review.</div> : f.hint && f.t !== "lines" ? <div className="text-xs text-ink-3 mt-1">{f.hint}</div> : null}</div>; })}</Section>
    <Section t="Layout" open={false}><div><label className="block text-xs text-ink-2 font-medium mb-1">Width</label><Seg P={P} setProp={setProp} k="layout" label="Width" opts={["full", "contained", "narrow"]} /></div><div><label className="block text-xs text-ink-2 font-medium mb-1">Spacing</label><Seg P={P} setProp={setProp} k="spacing" label="Spacing" opts={["default", "compact", "roomy"]} /></div></Section>
    <Section t="Behaviour" open={false}><Tog P={P} setProp={setProp} k="hidden" l="Hidden (not rendered on the live site)" /><Tog P={P} setProp={setProp} k="hideMobile" l="Hide on mobile" /><Tog P={P} setProp={setProp} k="locked" l="Locked (no edits until unlocked)" /><Tog P={P} setProp={setProp} k="personalise" l="Targeting enabled (Adobe Target segment)" /></Section>
    <Section t="Metadata" open={false}><div className="text-xs text-ink-2 font-medium">Node<ReadOnly>jcr:content/root/{selected.id}</ReadOnly></div><div className="text-xs text-ink-2 font-medium">sling:resourceType<ReadOnly>hsbc/components/{selected.type}</ReadOnly></div></Section>
  </div>;
}

function ListEditor({ rows, hint, onChange }: { rows: string[][]; hint?: string; onChange: (rows: string[][]) => void }) {
  const cols = (hint ?? "Value").split("|").map((c) => c.trim());
  const set = (r: number, c: number, v: string) => { const n = rows.map((x) => x.slice()); while (n[r].length <= c) n[r].push(""); n[r][c] = cellSafe(v); onChange(n); };
  return <div className="flex flex-col gap-2">{rows.map((r, ri) => <div key={ri} className="border border-line bg-surface-2 p-2.5 rounded-md"><div className="flex justify-between items-center mb-1"><b className="text-xs">Item {ri + 1}</b><span className="flex gap-0.5"><button className="btn-ghost" disabled={ri === 0} onClick={() => { const n = rows.slice(); [n[ri - 1], n[ri]] = [n[ri], n[ri - 1]]; onChange(n); }} aria-label="Move up">↑</button><button className="btn-ghost" disabled={ri === rows.length - 1} onClick={() => { const n = rows.slice(); [n[ri + 1], n[ri]] = [n[ri], n[ri + 1]]; onChange(n); }} aria-label="Move down">↓</button><button className="btn-ghost" onClick={() => onChange(rows.filter((_, i) => i !== ri))} aria-label="Remove"><svg viewBox="0 0 24 24" aria-hidden className="size-3.5 fill-none stroke-current" strokeWidth={1.8} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button></span></div>
    {cols.map((c, ci) => { const n = c.toLowerCase(); const plain = /icon|style|link|url/.test(n); const block = n.includes("text") || n.includes("answer");
      return <div key={ci} className="mt-1.5 text-xs text-ink-3">{plain ? <label className="block">{c}<input className="bdl-field mt-0.5" value={r[ci] ?? ""} onChange={(e) => set(ri, ci, e.target.value)} /></label>
        : <><span className="block mb-0.5">{c}</span><RichField inline={!block} compact value={r[ci] ?? ""} label={`${c}, item ${ri + 1}`} onChange={(html) => set(ri, ci, html)} /></>}</div>; })}</div>)}
    <button className="btn btn-sm btn-secondary justify-center" onClick={() => onChange([...rows, cols.map(() => "")])}>＋ Add item</button></div>;
}

/* ---- Ask AI bar: full-width prompt at the bottom of the canvas (page level). Enter asks, Esc closes. ---- */
function Stage({ label, state, children }: { label: string; state: "done" | "on" | "todo"; children?: React.ReactNode }) {
  return <div className={`flex gap-2.5 ${state === "todo" ? "opacity-40" : ""}`}>
    <i className={`mt-0.5 w-5 h-5 flex-none rounded-full grid place-items-center not-italic text-xs font-bold ${state === "done" ? "bg-good text-white" : state === "on" ? "bg-brand text-white animate-pulse" : "border border-line-2 text-ink-3"}`}>{state === "done" ? <Check className="size-3" strokeWidth={2.5} aria-hidden /> : STAGES.indexOf(label as typeof STAGES[number]) + 1}</i>
    <div className="min-w-0 flex-1"><div className="text-xs tracking-[.1em] uppercase text-ink-3 font-medium">{label}</div>{children}</div>
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
    <div ref={ref} className="flex-1 overflow-auto p-3.5 text-sm flex flex-col gap-4 min-h-0">
      {history.length > 0 && <div className="border border-line rounded-lg bg-surface-2 p-2.5"><div className="text-xs tracking-[.1em] uppercase text-ink-3 font-medium mb-1">Earlier in this session</div>{history.map((t) => <div key={t.id} className="flex gap-2 text-xs py-0.5"><span className="truncate text-ink-2">{t.prompt}</span><span className="ml-auto flex-none text-ink-3">{applied(t)}/{t.plan.ops.length} applied</span></div>)}</div>}
      {!tasks.length && <div className="flex-1 flex flex-col justify-center items-center text-center px-2 py-6 gap-4">
        <div className="w-11 h-11 rounded-full bg-foreground text-background grid place-items-center" aria-hidden><Sparkles className="size-5" strokeWidth={1.5} /></div>
        <div><b className="block text-base">What would you like to do with this page?</b><p className="text-xs text-ink-3 mt-1 max-w-[280px]">You will see a plan first. Nothing changes until you run it, and every change can be undone.</p></div>
        <div className="flex flex-wrap justify-center gap-1.5 max-w-[320px]">{AI_EXAMPLES.flatMap((g) => g.items).map(([label, prompt, hint]) => <button key={label} type="button" title={hint} onClick={() => onAsk(prompt)} className="text-xs px-3 py-1.5 rounded-full border border-line-2 bg-surface text-ink-2 hover:border-ink hover:text-ink hover:bg-surface-2">{label}</button>)}</div>
        <p className="text-xs text-ink-4">With a block selected, the AI button on the block changes only that block.</p>
      </div>}
      {tasks.map((t, ti) => { const last = ti === tasks.length - 1; const ops = t.plan.ops; const enabled = ops.filter((o) => t.on[o.id]); const n = applied(t); const st = (s: typeof STAGES[number]): "done" | "on" | "todo" => { const order = { understanding: 0, plan: 1, executing: 2, done: 4 }[t.stage]; const i = STAGES.indexOf(s); return i < order || t.stage === "done" ? "done" : i === order ? "on" : "todo"; };
        return <div key={t.id} className={`flex flex-col gap-3 ${last ? "" : "opacity-80"}`}>
          <div className="self-end max-w-[85%] bg-ink text-white rounded-xl rounded-br-sm px-3 py-2 text-sm"><span className="block text-xs uppercase tracking-[.08em] text-white/60">You</span>{t.prompt}</div>
          <div className="border border-line rounded-xl p-3 flex flex-col gap-3 bg-surface">
            <b className="inline-flex items-center gap-1.5 text-sm"><Sparkles className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />{t.plan.title}</b>
            <Stage label="Understanding" state={st("Understanding")}><p className="text-ink-2 mt-0.5">{t.plan.understanding}</p>{t.stage === "understanding" && <p className="text-xs text-ink-3 mt-1">Reading the page and working out what could be better…</p>}</Stage>
            {t.stage !== "understanding" && <Stage label="Plan" state={st("Plan")}>
              {t.plan.note && <p className="text-xs text-ink-3 mt-0.5 mb-1.5">{t.plan.note}</p>}
              {ops.length ? <ul className="flex flex-col gap-1 mt-1">{ops.map((o) => <li key={o.id}><label className={`flex gap-2 items-start ${t.stage === "plan" ? "cursor-pointer" : ""}`}><input type="checkbox" className="bdl-checkbox bdl-checkbox-sm mt-0.5" checked={!!t.on[o.id]} disabled={t.stage !== "plan"} onChange={() => onToggle(t, o.id)} /><span className={t.on[o.id] ? "" : "line-through text-ink-3"}>{o.label}</span></label></li>)}</ul> : <p className="text-ink-3 mt-1">Nothing to change.</p>}
              {t.stage === "plan" && <div className="mt-2.5"><p className="text-xs text-ink-3 mb-2">Untick anything you don’t want. Nothing changes until you run the plan.</p><div className="flex gap-2"><button className="btn btn-sm btn-primary" onClick={() => onRun(t)} disabled={!enabled.length && ops.length > 0}>{enabled.length ? `Run plan · ${enabled.length} change${enabled.length === 1 ? "" : "s"}` : "Nothing selected"}</button></div></div>}
            </Stage>}
            {(t.stage === "executing" || t.stage === "done") && <Stage label="Executing" state={st("Executing")}><ul className="flex flex-col gap-0.5 mt-1">{enabled.map((o) => { const d = t.done.includes(o.id); return <li key={o.id} className={`flex gap-2 ${d ? "text-ink" : "text-ink-3"}`}><span className={`w-4 flex-none ${d ? "text-good" : ""}`}>{d ? <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> : "…"}</span><span>{o.label}</span></li>; })}</ul></Stage>}
            {t.stage === "done" && <Stage label="Review" state="done">
              <div className="flex flex-col gap-2 mt-1">{t.done.map((id) => { const o = ops.find((x) => x.id === id)!; const r = t.results[id]; if (!r) return null; return <div key={id} className={`border border-line rounded-md p-2 ${r.undone ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-2"><b className={`text-xs ${r.undone ? "line-through" : ""}`}>{o.label}</b>{r.undone ? <button className="btn-ghost ml-auto flex-none" onClick={() => onRedo(t, id)}>Redo</button> : r.changes.length > 0 && <button className="btn-ghost ml-auto flex-none" onClick={() => onUndo(t, id)}>Undo</button>}</div>
                {r.changes.length > 0 && <div className="mt-1 divide-y divide-line max-h-48 overflow-auto">{r.changes.map((c, i) => <div key={i} className="py-1 text-xs"><span className="font-medium">{c.block}</span>{c.field && <span className="text-ink-3"> · {c.field}</span>}{c.before !== undefined && c.after !== undefined ? <div className="break-words"><span className="line-through text-ink-3">{c.before || "(empty)"}</span> → <span>{c.after || "(empty)"}</span></div> : <div className={c.after ? "text-good" : "text-ink-3"}>{c.after ?? c.before}</div>}</div>)}</div>}
              </div>; })}</div>
              {n > 0 && <button className="btn btn-sm btn-secondary mt-2" onClick={() => onUndoAll(t)}>Undo all</button>}
            </Stage>}
            {t.stage === "done" && <Stage label="Done" state="done"><p className="mt-0.5">Applied {n} of {enabled.length} change{enabled.length === 1 ? "" : "s"}{n > 0 ? " · Save the page to keep them" : "."}</p>{n > 0 && <p className="text-xs text-ink-3 mt-1">Changed something you didn’t mean to? Use Undo next to that change, or Undo all.</p>}{n > 0 && <button className="btn btn-sm btn-primary mt-2" onClick={onSave} disabled={!dirty}>{dirty ? "Save page" : "Saved"}</button>}</Stage>}
          </div>
        </div>; })}
    </div>
    <form className="px-3.5 py-3 border-t border-line bg-surface" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) onAsk(draft); }}>
      <div className="border border-line-2 bg-surface focus-within:ring-2 focus-within:ring-ring">
        {/* The placeholder used to repeat the heading above it and carry a second “e.g.” line, which
            a 320px panel clipped mid-sentence. One short line instead. The hint and the button share
            one row: the hint is short enough to fit beside the button at this width and is held to a
            single line, so it can never wrap the button onto a second row. */}
        {/* `block`: an inline-block textarea sits on the text baseline and leaves a phantom gap under
            itself, which made this hint sit further from the box than the comments one.
            `border-0`: BDL's base layer gives every `textarea` a `1px solid #767676`, a second and
            darker box inside this one, whose edges also sat 10px wider than the button's. */}
        <textarea rows={3} className="block w-full resize-none border-0 bg-transparent px-2.5 pt-2.5 pb-2 text-sm leading-snug outline-none" placeholder={tasks.length ? "Ask a follow-up…" : "Ask for a change…"} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (draft.trim()) onAsk(draft); } }} aria-label="Ask AI" />
        <div className="flex items-center gap-2 px-2.5 pt-1 pb-2.5"><span className="min-w-0 flex-1 truncate text-xs text-ink-3" title="Press Enter to ask. Press Shift and Enter together for a new line.">Enter to ask · ⇧Enter for a line</span><button className="btn btn-sm btn-primary flex-none" disabled={!draft.trim()}><Sparkles className="size-3.5" strokeWidth={1.5} aria-hidden />Ask</button></div>
      </div>
    </form>
  </>;
}

/** Website chrome for pages; the inbox or phone frame for messages. */
function ChromeFor({ channel, host, children, ...site }: { channel?: string; host?: { title: string; crumbs: string[] }; marketName: string; crumbs: string[]; device: string; children: React.ReactNode }) {
  if (host) return <FormChrome marketName={site.marketName} crumbs={host.crumbs} hostTitle={host.title} device={site.device}>{children}</FormChrome>;
  return channel ? <MessageChrome channel={channel}>{children}</MessageChrome> : <SiteChrome {...site}>{children}</SiteChrome>;
}

/** Region dividers on an e-mail canvas: Header and Footer are fixed (edit only), Body takes components. */
function EmailRegionLabel({ blocks, i }: { blocks: Block[]; i: number }) {
  const r = emailRegion(blocks[i].type); const prev = i > 0 ? emailRegion(blocks[i - 1].type) : null; if (prev === r) return null;
  const tag = (t: string, d: string) => <div data-ui className="m-region"><b>{t}</b><span>{d}</span></div>;
  if (r === "header") return tag("Header", "fixed · edit only");
  if (r === "body") return tag("Body", "add, move and remove components here");
  return <>{prev === "header" && <>{tag("Body", "add, move and remove components here")}<div data-ui className="m-region-empty">Add components from the left: they go into the body.</div></>}{tag("Footer", "fixed · edit only")}</>;
}
