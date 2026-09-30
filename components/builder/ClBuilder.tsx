"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { useSession } from "@/components/shell/Session";
import { PublishDialog } from "@/components/pages/PublishDialog";
import { ucpApi } from "@/lib/api";
import type { ReviewerOption } from "@/lib/ucp/types";
import { toPlain } from "@/lib/blocks/richtext";
import { ClCanvas, type InlineField } from "./ClCanvas";
import { RichField } from "./RichTextEditor";
import { PageComments } from "./PageComments";
import { VersionHistory } from "./VersionHistory";

/**
 * The page builder on ContentLIBRE (UCP_BACKEND=contentlibre).
 *
 * One renderer: the preview is the backend's own render of the page (or of the open draft), not a React copy of its
 * components. Structure, allowed components and fields come from the backend's `.libre-model.json`, and every write
 * goes through the backend's composition validator - whatever this screen offers, the backend decides.
 *
 * The preview is rendered in edit mode, so it carries the backend's markers: blocks are selected by clicking them and
 * text is changed where it stands (ClCanvas). How each field is shown - label, widget, required, hint, options - is the
 * backend's field description, not a guess made here.
 *
 * Edits land in a draft (publication.mode=drafts): "Edit" opens one, "Publish" makes it live, "Discard" drops it.
 * An approved draft can also be scheduled; the backend publishes it when it is due, or says on the draft why not.
 *
 * The review follows the CMS's stages (the mock's): waiting in the Backlog → in the author's review → reviewed → business
 * review → ready. Asking, approving and sending back are the backend's decisions on the draft; the stages in between are
 * the CMS's, kept beside the page (lib/repo/adapters/contentlibre.ts). Comments, history and locks are the CMS's too.
 */

/** A field as `.libre-model.json` describes it: the type is what is stored, the widget how it is edited. */
type FieldDef = { name: string; type: string; default?: unknown; label?: string; widget?: string; required?: boolean; hint?: string; options?: { value: string; label: string }[] };
type ModelItem = { path: string; resourceType: string; deployed?: boolean };
type ModelSlot = { id: string; type: string; label: string; maxItems: number; items: ModelItem[] };
type Model = {
  resourceType: string; path: string;
  slotTypes: Record<string, { allowedComponents: string[] }>;
  slots: ModelSlot[];
  components: Record<string, { label: string; fields: FieldDef[] }>;
  values: Record<string, unknown>;
};
type Review = { state: "IN_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "OUTDATED"; requestedBy?: string; requestedAt?: string; assignee?: string; due?: string; note?: string; decidedBy?: string; decidedAt?: string; comment?: string; assignedBy?: string; remindedAt?: string; remindedBy?: string };
type Schedule = { publishAt?: string; scheduledBy?: string; failed?: string; failedAt?: string };
type Draft = { id: string; state: string; label?: string; revision?: string; stale: boolean; createdBy?: string; modified?: string; review?: Review; schedule?: Schedule };
type Drafts = { page: string; publication?: string | null; publishedBy?: string; publishedAt?: string; draftsMode: boolean; reviewRequired: boolean; open: Draft[]; archived: Draft[] };
type PageDoc = { path: string; title?: string; description?: string; navTitle?: string; hideInNav?: boolean; status?: string; permissions?: { edit: boolean; delete: boolean } };
type Problem = { title?: string; detail?: string; status?: number };

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { const p = body as Problem; throw Object.assign(new Error(p.detail || p.title || `HTTP ${res.status}`), { status: res.status, type: (body as { type?: string }).type }); }
  return body as T;
}
const nameOf = (path: string) => path.split("/").pop() ?? path;
const STATUS_PILL: Record<string, string> = { published: "published", modified: "modified", draft: "draft", unpublished: "draft", review: "review", inreview: "inreview", reviewed: "reviewed", bizreview: "bizreview", approved: "approved", scheduled: "scheduled", failed: "failed" };
/** The backend's own interval between two reminders of one review. */
const REMIND_MS = 15 * 60_000;
const qs = (params: Record<string, string | undefined>) => new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();

/** `at` tells one load from the next: panels are keyed by it, so a form never keeps values from before a save. */
/** The CMS's own view of the page: the stage of the review, and what it keeps beside the page (a lock). */
type CmsPage = { status: string; meta?: Record<string, unknown> };
type Loaded = { drafts: Drafts; page: PageDoc; model: Model | null; cms: CmsPage | null; at: number };
/** Everything the builder shows for one page: its drafts, then the page and structure of the open draft (or the live payload). */
async function fetchPage(path: string): Promise<Loaded> {
  const drafts = await call<Drafts>(`/api/cl/drafts?${qs({ path })}`);
  const open = drafts.open[0];
  const payload = open ? `/var/pages/drafts${path}/${open.id}/jcr:content` : `${path}/jcr:content`;
  const [page, model, cms] = await Promise.all([
    call<PageDoc>(`/api/cl/page?${qs({ path, draft: open?.id })}`),
    call<Model>(`/api/cl/model?node=${encodeURIComponent(payload)}`).catch(() => null),
    call<CmsPage>(`/api/repo/page?${qs({ path })}`).catch(() => null),
  ]);
  return { drafts, page, model, cms, at: Date.now() };
}

/** Widgets a text can be edited with in place; the rest (links, images, choices) belong to the panel. */
const INLINE_WIDGETS = ["text", "textarea", "richtext"];
const blank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && !toPlain(v).trim()) || (Array.isArray(v) && !v.some((x) => String(x).trim()));
const prettify = (name: string) => name.replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());

export function ClBuilder({ path, listUrl, marketId, assetOrigin }: { path: string; listUrl: string; marketId: string; assetOrigin: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  /** Bumped after every successful action: reloads structure, preview and the inspector. */
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [selModel, setSelModel] = useState<{ node: string; model: Model; at: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [stalePublish, setStalePublish] = useState(false);

  const drafts = loaded?.drafts; const page = loaded?.page; const model = loaded?.model ?? null;
  const draft = drafts?.open[0];
  const payload = draft ? `/var/pages/drafts${path}/${draft.id}/jcr:content` : `${path}/jcr:content`;
  const editableDraft = !!draft && page?.permissions?.edit !== false;
  const q = (extra: Record<string, string | undefined> = {}) => qs({ path, ...extra });
  const inspected = selected && selModel?.node === selected ? selModel.model : null;
  const { user } = useSession();
  const [reviewForm, setReviewForm] = useState<null | "request" | "changes" | "assign">(null);
  const [scheduling, setScheduling] = useState(false);
  const review = draft?.review; const reviewState = review?.state;
  // The backend decides (approver groups, never your own request); this only hides what it would refuse.
  const isAdmin = user.role === "admin" || !!user.perms?.root?.manage;
  // Reviewers never review their own request (the backend refuses it too); a site admin may.
  const mayReview = isAdmin || (user.role === "reviewer" && review?.requestedBy !== user.id);
  const cms = loaded?.cms; const stage = reviewState === "IN_REVIEW" ? (cms?.status ?? "review") : undefined;
  const lock = (() => { const raw = cms?.meta?.["ucp:pageLock"]; if (typeof raw !== "string" || !raw) return null; try { return JSON.parse(raw) as { by?: string; name?: string }; } catch { return null; } })();
  const lockedOut = !!lock && lock.by !== user.id && !isAdmin;
  const editable = editableDraft && !lockedOut;
  const [panel, setPanel] = useState<"details" | "comments" | "history">("details");
  // Changing the reviewer: whoever asked, an approver or an administrator (the backend checks the same).
  const canReassign = reviewState === "IN_REVIEW" && (user.role === "admin" || user.role === "reviewer" || review?.requestedBy === user.id);
  const schedule = draft?.schedule;
  const [clock] = useState(() => Date.now());
  const remindedRecently = !!review?.remindedAt && clock - Date.parse(review.remindedAt) < REMIND_MS;
  const publishBlocked = reviewState === "IN_REVIEW" ? "Waiting for review" : reviewState === "CHANGES_REQUESTED" ? "Changes were requested" : reviewState === "OUTDATED" ? "Changed after approval: send for review again" : drafts?.reviewRequired && reviewState !== "APPROVED" ? "This site publishes reviewed drafts only" : null;

  useEffect(() => {
    let current = true;
    fetchPage(path).then((l) => { if (current) setLoaded(l); }, (e: Error) => { if (current) setNote({ kind: "err", text: e.message }); });
    return () => { current = false; };
  }, [path, version]);
  /** One model fetch per component and version, shared by the inspector, the canvas and the required-field check. */
  const models = useRef(new Map<string, Promise<Model>>());
  const labels = useRef(new Map<string, string>());
  const modelOf = useCallback((node: string) => {
    let m = models.current.get(node);
    if (!m) {
      m = call<Model>(`/api/cl/model?node=${encodeURIComponent(node)}`).then((x) => { for (const [t, c] of Object.entries(x.components)) labels.current.set(t, c.label); return x; });
      models.current.set(node, m);
      m.catch(() => models.current.delete(node));
    }
    return m;
  }, []);
  useEffect(() => { models.current.clear(); }, [version]);
  useEffect(() => {
    if (!selected) return;
    let current = true;
    modelOf(selected).then(
      (m) => { if (current) setSelModel({ node: selected, model: m, at: Date.now() }); },
      (e: Error) => { if (current) setNote({ kind: "err", text: e.message }); });
    return () => { current = false; };
  }, [selected, version, modelOf]);

  /** Every action: run, report the backend's own words, reload structure and preview. */
  async function act(label: string, fn: () => Promise<unknown>, after?: () => void): Promise<boolean> {
    setBusy(true); setNote(null);
    try { await fn(); setNote({ kind: "ok", text: label }); after?.(); setVersion((v) => v + 1); return true; }
    catch (e) {
      const err = e as Error & { type?: string };
      if (err.type?.endsWith("/draft-stale")) setStalePublish(true);
      setNote({ kind: "err", text: err.message });
      return false;
    }
    finally { setBusy(false); }
  }

  const fieldOf = async (node: string, name: string) => { const m = await modelOf(node); return m.components[m.resourceType]?.fields.find((f) => f.name === name) ?? null; };
  /** Whether a marked text can be changed in place: a string field shown as text, a long text or rich text. */
  const describe = async (node: string, name: string): Promise<InlineField | null> => {
    const f = await fieldOf(node, name).catch(() => null);
    if (!f || f.type !== "string" || !INLINE_WIDGETS.includes(f.widget ?? "text")) return null;
    return { label: f.label ?? f.name, rich: f.widget === "richtext", multiline: f.widget === "textarea" || f.widget === "richtext" };
  };
  const inlineSave = async (node: string, name: string, value: string) => {
    const f = await fieldOf(node, name).catch(() => null);
    if (!f) return false;
    return act(`Saved ${f.label ?? f.name}.`, () => call("/api/cl/component/properties", { method: "POST", body: JSON.stringify({ node, values: [{ field: f, value }] }) }));
  };
  /** Required fields left empty anywhere on the page, as "Component › Field"; checked before review, like the backend's description asks. */
  const missingRequired = async (): Promise<string[]> => {
    const out: string[] = [];
    const visit = async (m: Model): Promise<void> => {
      const def = m.components[m.resourceType];
      for (const f of def?.fields ?? []) if (f.required && blank(m.values[f.name])) out.push(`${def?.label ?? nameOf(m.resourceType)} › ${f.label ?? f.name}`);
      await Promise.all(m.slots.flatMap((s) => s.items).filter((i) => i.deployed !== false).map(async (i) => visit(await modelOf(i.path))));
    };
    if (loaded?.model) await visit(loaded.model);
    return out;
  };
  const sendForReview = async (body: { assignee?: string; due?: string; note?: string }) => {
    const missing = await missingRequired().catch(() => []);
    if (missing.length) { setNote({ kind: "err", text: `Fill in the required fields first: ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? ` and ${missing.length - 6} more` : ""}.` }); return; }
    await act("Sent for review.", () => call(`/api/cl/drafts/review?${q()}`, { method: "POST", body: JSON.stringify({ draft: draft?.id, ...body }) }), () => setReviewForm(null));
  };
  const labelOf = (type: string) => labels.current.get(type) ?? loaded?.model?.components[type]?.label ?? prettify(nameOf(type));

  const openDraft = () => act("Draft opened. Your changes stay private until you publish.", () => call(`/api/cl/drafts?${q()}`, { method: "POST", body: "{}" }));
  const publish = (force = false) => act("Published. The page is live.", () => call(`/api/cl/drafts/publish?${q()}`, { method: "POST", body: JSON.stringify({ draft: draft?.id, revision: draft?.revision, force }) }), () => { setStalePublish(false); setSelected(null); });
  const discard = () => act("Draft discarded.", async () => {
    const r = await call<{ message: string }>(`/api/cl/drafts?${q({ draft: draft?.id })}`, { method: "DELETE" });
    if (/removed|deleted|goes with/i.test(r.message) && !drafts?.publication) window.location.href = listUrl;
  }, () => setSelected(null));

  if (!drafts || !page) return <div className="p-10 text-ink-3">{note?.kind === "err" ? note.text : "Loading the page…"}</div>;
  // The review, when there is one, is what the page is waiting on (at the CMS's stage); otherwise its publication status.
  const status = schedule?.failed ? "failed" : schedule?.publishAt ? "scheduled" : stage ?? (reviewState === "APPROVED" ? "approved" : page.status ?? "draft");
  /** A move to the next stage, through the CMS's workflow (the backend decides where a decision is its own). */
  const toStage = (next: string, done: string) => act(done, () => call(`/api/repo/page?${qs({ market: marketId, path })}`, { method: "PATCH", body: JSON.stringify({ status: next }) }));
  const claim = () => act("Assigned to you. Start the review when you are ready.", () => call(`/api/ucp/review/claim?${qs({ market: marketId, path })}`, { method: "POST", body: "{}" }));
  const previewSrc = `/api/cl/preview?${q({ draft: draft?.id })}&v=${version}`;
  const canvasSrc = `/api/cl/preview?${q({ draft: draft?.id })}&edit=1&v=${version}`;

  return (
    <div className="lg:h-full flex flex-col min-h-0">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-line bg-surface">
        <Link href={listUrl} className="text-ink-3 text-[13px]">‹ Pages</Link>
        <div className="min-w-0"><b className="block truncate">{page.title ?? nameOf(path)}</b><span className="font-mono text-[11.5px] text-ink-3">{path}</span></div>
        <Pill status={STATUS_PILL[status] ?? "draft"} />
        {draft && <span className="text-[12px] text-ink-3">Draft {draft.label ? `“${draft.label}” ` : ""}by {draft.createdBy ?? "?"}{draft.stale ? " · page published since" : ""}</span>}
        <div className="ml-auto flex gap-2">
          <a className="btn btn-sm" href={previewSrc} target="_blank" rel="noopener noreferrer">Open preview ↗</a>
          {!draft && <button className="btn btn-sm on" disabled={busy || page.permissions?.edit === false} onClick={() => void openDraft()}>✎ Edit</button>}
          {draft && <>
            <button className="btn btn-sm" disabled={busy} onClick={() => void discard()}>Discard draft</button>
            {reviewState !== "IN_REVIEW" && <button className="btn btn-sm" disabled={busy} onClick={() => setReviewForm(reviewForm === "request" ? null : "request")}>Send for review</button>}
            {reviewState === "IN_REVIEW" && editable && <button className="btn btn-sm" disabled={busy || remindedRecently} title={remindedRecently ? "A reminder was sent less than 15 minutes ago" : undefined}
              onClick={() => void act("Reminder sent to the reviewer.", () => call(`/api/cl/drafts/review/remind?${q()}`, { method: "POST", body: JSON.stringify({ draft: draft.id }) }))}>Remind reviewer</button>}
            {canReassign && <button className="btn btn-sm" disabled={busy} onClick={() => setReviewForm(reviewForm === "assign" ? null : "assign")}>Change reviewer</button>}
            {stage === "review" && !review?.assignee && mayReview && <button className="btn btn-sm on" disabled={busy} onClick={() => void claim()}>Assign to me</button>}
            {stage === "review" && review?.assignee && (review.assignee === user.id || isAdmin) && <button className="btn btn-sm on" disabled={busy} onClick={() => void toStage("inreview", "Review started.")}>Start review</button>}
            {stage === "inreview" && (review?.assignee === user.id || isAdmin) && <button className="btn btn-sm on" disabled={busy} onClick={() => void toStage("reviewed", "Reviewed. The author sends it on to the business review.")}>Mark reviewed</button>}
            {stage === "reviewed" && (review?.requestedBy === user.id || isAdmin) && <button className="btn btn-sm on" disabled={busy} onClick={() => void toStage("bizreview", "Sent to the business review.")}>Send to business review</button>}
            {stage === "bizreview" && mayReview && <button className="btn btn-sm on" disabled={busy} onClick={() => void toStage("approved", "Signed off. It can be published now.")}>Sign off</button>}
            {(stage === "inreview" || stage === "bizreview") && (mayReview || review?.assignee === user.id) && <button className="btn btn-sm" disabled={busy} onClick={() => setReviewForm(reviewForm === "changes" ? null : "changes")}>Reauthor</button>}
            {(reviewState === "APPROVED" || schedule) && <button className="btn btn-sm" disabled={busy} onClick={() => setScheduling(true)}>{schedule?.publishAt ? "Change schedule" : "Schedule…"}</button>}
            <button className="btn btn-sm on" disabled={busy || !!publishBlocked} title={publishBlocked ?? undefined} onClick={() => void publish(false)}>Publish now</button>
          </>}
        </div>
      </div>
      <StageBar status={status} />
      {lock && <div className="px-5 py-2 text-[13px] border-b border-line bg-warn-soft text-warn" role="note">Locked by {lock.name ?? "someone"}{lockedOut ? ". Only they or a site admin can change it; ask them to unlock it in Pages." : ". Others cannot change it until it is unlocked in Pages."}</div>}
      {draft && review && <ReviewBanner review={review} />}
      {draft && schedule && <ScheduleBanner schedule={schedule} />}
      {draft && reviewForm === "assign" && <AssignForm marketId={marketId} path={path} current={review?.assignee} busy={busy} onCancel={() => setReviewForm(null)}
        onSend={(assignee) => act(assignee ? `${assignee} is now asked to review.` : "Any approver can review it now.", () => call(`/api/cl/drafts/review/assign?${q()}`, { method: "POST", body: JSON.stringify({ draft: draft.id, assignee: assignee || undefined }) }), () => setReviewForm(null))} />}
      {scheduling && <PublishDialog marketId={marketId} envName="this site" pages={[{ path, title: page.title ?? nameOf(path), status: schedule?.failed && reviewState === "APPROVED" ? "approved" : status, publishAt: schedule?.publishAt }]} mayPublish={() => true}
        onClose={() => setScheduling(false)} onDone={(r) => { setScheduling(false); const x = r[0]; setNote(x?.ok ? { kind: "ok", text: x.status === "scheduled" ? "Scheduled. The page goes live at the time you picked." : x.status === "published" ? "Published. The page is live." : "Schedule cancelled." } : { kind: "err", text: x?.reason ?? "Nothing changed." }); setVersion((v) => v + 1); }} />}
      {draft && reviewForm === "request" && <ReviewRequestForm busy={busy} onCancel={() => setReviewForm(null)} onSend={(body) => void sendForReview(body)} />}
      {draft && reviewForm === "changes" && <ChangesForm busy={busy} onCancel={() => setReviewForm(null)} onSend={(comment) => act("Changes requested. The author has been asked to update the draft.", () => call(`/api/cl/drafts/decision?${q()}`, { method: "POST", body: JSON.stringify({ draft: draft.id, decision: "request-changes", comment }) }), () => setReviewForm(null))} />}
      {(note || stalePublish) && <div role="status" className={`px-5 py-2 text-[13px] border-b border-line ${note?.kind === "err" ? "bg-crit/10 text-crit" : "bg-good-soft text-good"}`}>
        {note?.text}{stalePublish && <> <button className="btn btn-sm ml-2" disabled={busy} onClick={() => void publish(true)}>Publish anyway</button></>}
      </div>}


      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_300px] min-h-0 flex-1">
        <aside className="border-b lg:border-b-0 lg:border-r border-line overflow-auto p-3 bg-surface" aria-label="Page structure">
          <h2 className="text-[11px] tracking-[.1em] uppercase text-ink-3 font-semibold mb-2">Structure</h2>
          {!model ? <p className="text-ink-3 text-[13px]">No structure for this page.</p>
            : <SlotList model={model} node={model.path} editable={editable} busy={busy} selected={selected} onSelect={setSelected} act={act} />}
          {!draft && <p className="text-[12px] text-ink-3 mt-4">This is the live page. Choose <b>Edit</b> to change it in a private draft.</p>}
        </aside>

        <main className="bg-surface-3 min-h-[70vh] lg:min-h-0 p-3 flex flex-col gap-2">
          <p className="text-[12px] text-ink-3">{editable
            ? "Click a block to select it. Double-click a text to change it where it is: Enter saves (Ctrl+Enter in longer texts), Esc cancels."
            : "Click a block to see its fields. Choose Edit to change the page."}</p>
          <div className="flex-1 min-h-0">
            <ClCanvas src={canvasSrc} title={`Preview of ${page.title ?? path}`} editable={editable && !busy} selected={selected} labelOf={labelOf}
              onSelect={setSelected} describe={describe} onInlineSave={inlineSave} onNote={(text) => setNote({ kind: "ok", text })} />
          </div>
        </main>

        <aside className="border-t lg:border-t-0 lg:border-l border-line overflow-auto p-4 bg-surface" aria-label="Inspector">
          <div role="tablist" aria-label="Panel" className="flex gap-1 mb-3 -mt-1 border-b border-line">
            {(["details", "comments", "history"] as const).map((k) => <button key={k} role="tab" aria-selected={panel === k} onClick={() => setPanel(k)}
              className={`px-2.5 py-1.5 text-[12.5px] font-semibold border-b-2 -mb-px ${panel === k ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>{k === "details" ? "Details" : k === "comments" ? "Comments" : "History"}</button>)}
          </div>
          {panel === "comments" ? <PageComments marketId={marketId} path={path} about={null} onClearAbout={() => undefined} focusKey={0} bare />
          : panel === "history" ? <VersionHistory marketId={marketId} path={path} currentBlocks={0} onRestored={() => { setNote({ kind: "ok", text: "Restored into a new draft." }); setVersion((v) => v + 1); }} />
          : selected && inspected
            ? <Inspector key={`${selected}-${selModel?.at}`} node={selected} model={inspected} editable={editable} busy={busy} act={act} onClose={() => setSelected(null)} onSelect={setSelected} assetOrigin={assetOrigin} />
            : <PageMeta key={`${draft?.id}-${loaded?.at}`} page={page} editable={editable} busy={busy} onSave={(patch) => act("Page details saved to the draft.", () => call(`/api/cl/page?${q({ draft: draft?.id })}`, { method: "PATCH", body: JSON.stringify(patch) }))} />}
          {panel === "details" && payload && <p className="font-mono text-[10.5px] text-ink-4 mt-6 break-all">{payload}</p>}
        </aside>
      </div>
    </div>
  );
}

type Act = (label: string, fn: () => Promise<unknown>, after?: () => void) => Promise<boolean>;

/** The slots of one component instance, with its items and what may be added - the backend's model, as given. */
function SlotList({ model, node, editable, busy, selected, onSelect, act }: { model: Model; node: string; editable: boolean; busy: boolean; selected: string | null; onSelect: (p: string) => void; act: Act }) {
  if (!model.slots.length) return <p className="text-ink-3 text-[12.5px]">No slots.</p>;
  return <div className="grid gap-4">{model.slots.map((slot) => {
    const slotPath = `${node}/slots/${slot.id}`;
    const allowed = model.slotTypes[slot.type]?.allowedComponents ?? [];
    const full = slot.maxItems >= 0 && slot.items.length >= slot.maxItems;
    return <section key={slot.id}>
      <h3 className="text-[13px] font-semibold mb-1">{slot.label} <span className="text-ink-3 font-normal">({slot.items.length}{slot.maxItems >= 0 ? ` / ${slot.maxItems}` : ""})</span></h3>
      <ul className="grid gap-1">{slot.items.map((item, i) => {
        const label = model.components[item.resourceType]?.label ?? nameOf(item.resourceType);
        const on = selected === item.path;
        const move = (before?: string) => act("Moved.", () => call("/api/cl/component/move", { method: "POST", body: JSON.stringify({ slot: slotPath, source: item.path, before }) }));
        return <li key={item.path} className={`flex items-center gap-1 rounded border px-2 py-1 text-[13px] ${on ? "border-accent bg-accent-soft" : "border-line"}`}>
          <button className="flex-1 text-left truncate" onClick={() => onSelect(item.path)} aria-label={`Select ${label} (${nameOf(item.path)})`} aria-pressed={on} title={item.path}>{label} <span className="text-ink-4 font-mono text-[11px]">{nameOf(item.path)}</span></button>
          {editable && <>
            <button className="w-6 text-ink-3 disabled:opacity-30" aria-label={`Move ${label} up`} disabled={busy || i === 0} onClick={() => void move(nameOf(slot.items[i - 1].path))}>↑</button>
            <button className="w-6 text-ink-3 disabled:opacity-30" aria-label={`Move ${label} down`} disabled={busy || i === slot.items.length - 1} onClick={() => void move(slot.items[i + 2] ? nameOf(slot.items[i + 2].path) : undefined)}>↓</button>
            <button className="w-6 text-crit disabled:opacity-30" aria-label={`Remove ${label}`} disabled={busy} onClick={() => void act(`Removed ${label}.`, () => call("/api/cl/component/remove", { method: "POST", body: JSON.stringify({ node: item.path }) }), () => on && onSelect(""))}>✕</button>
          </>}
        </li>;
      })}</ul>
      {editable && !full && allowed.length > 0 && <AddComponent allowed={allowed} model={model} busy={busy} onAdd={(type) => act(`Added ${model.components[type]?.label ?? type}.`, () => call("/api/cl/component/insert", { method: "POST", body: JSON.stringify({ slot: slotPath, resourceType: type, fields: model.components[type]?.fields ?? [] }) }))} />}
    </section>;
  })}</div>;
}

function AddComponent({ allowed, model, busy, onAdd }: { allowed: string[]; model: Model; busy: boolean; onAdd: (type: string) => void }) {
  const [type, setType] = useState("");
  return <div className="flex gap-1 mt-1.5">
    <select aria-label="Component to add" className="flex-1 border border-line rounded px-1.5 py-1 text-[12.5px] bg-surface" value={type} onChange={(e) => setType(e.target.value)}>
      <option value="">＋ Add a component…</option>
      {allowed.map((t) => <option key={t} value={t}>{model.components[t]?.label ?? nameOf(t)}</option>)}
    </select>
    <button className="btn btn-sm" disabled={busy || !type} onClick={() => { onAdd(type); setType(""); }}>Add</button>
  </div>;
}

/** The fields the backend declares for this component, with its stored values; saved as one Sling POST. */
function Inspector({ node, model, editable, busy, act, onClose, onSelect, assetOrigin }: { node: string; model: Model; editable: boolean; busy: boolean; act: Act; onClose: () => void; onSelect: (p: string) => void; assetOrigin: string }) {
  const def = model.components[model.resourceType];
  const fields = useMemo(() => def?.fields ?? [], [def]);
  const initial = useMemo(() => Object.fromEntries(fields.map((f) => [f.name, model.values[f.name] ?? f.default ?? ""])), [fields, model.values]);
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const changed = fields.filter((f) => JSON.stringify(values[f.name]) !== JSON.stringify(initial[f.name]));
  const save = () => act("Saved to the draft.", () => call("/api/cl/component/properties", { method: "POST", body: JSON.stringify({ node, values: changed.map((f) => ({ field: f, value: values[f.name] })) }) }));
  return <div className="grid gap-3">
    <div className="flex items-center"><h2 className="font-semibold">{def?.label ?? nameOf(model.resourceType)}</h2><button className="ml-auto text-ink-3" aria-label="Close" onClick={onClose}>✕</button></div>
    {!fields.length && <p className="text-ink-3 text-[13px]">This component has no editable fields.</p>}
    {fields.map((f) => <FieldRow key={f.name} f={f} value={values[f.name]} editable={editable} assetOrigin={assetOrigin} onChange={(v) => setValues((cur) => ({ ...cur, [f.name]: v }))} />)}
    {editable && fields.length > 0 && <button className="btn btn-sm on justify-self-start" disabled={busy || !changed.length} onClick={() => void save()}>Save {changed.length ? `(${changed.length})` : ""}</button>}
    {model.slots.length > 0 && <div className="border-t border-line pt-3"><h3 className="text-[11px] tracking-[.1em] uppercase text-ink-3 font-semibold mb-2">Inside this component</h3>
      <SlotList model={model} node={node} editable={editable} busy={busy} selected={null} onSelect={onSelect} act={act} /></div>}
    {!editable && <p className="text-[12px] text-ink-3">Read-only: open a draft to edit.</p>}
  </div>;
}

/** The widget a field is edited with: the backend's, or its type's plain default for an older backend. */
const widgetOf = (f: FieldDef) => f.widget ?? (f.type === "long" ? "number" : f.type === "boolean" ? "checkbox" : f.type === "string[]" ? "lines" : f.type === "readonly" ? "readonly" : "text");

/** One field, shown as the backend describes it: label, widget, required mark and hint. */
function FieldRow({ f, value, editable, assetOrigin, onChange }: { f: FieldDef; value: unknown; editable: boolean; assetOrigin: string; onChange: (v: unknown) => void }) {
  const widget = widgetOf(f); const label = f.label ?? f.name; const id = `cl-field-${f.name.replace(/[^\w-]/g, "-")}`;
  const missing = editable && !!f.required && blank(value);
  const text = Array.isArray(value) ? value.join("\n") : String(value ?? "");
  const box = `border rounded px-2 py-1 text-[13px] text-ink bg-surface ${missing ? "border-crit" : "border-line"}`;
  const listed = !!f.options?.some((o) => o.value === text);
  const control =
    widget === "checkbox" ? <input id={id} type="checkbox" disabled={!editable} checked={!!value} onChange={(e) => onChange(e.target.checked)} />
    : widget === "readonly" ? <span className="text-ink">{text}</span>
    : widget === "number" ? <input id={id} type="number" disabled={!editable} className={box} value={text} onChange={(e) => onChange(Number(e.target.value))} />
    : widget === "select" ? <select id={id} disabled={!editable} className={box} value={text} onChange={(e) => onChange(f.type === "long" ? Number(e.target.value) : e.target.value)}>
        {(!f.required || !text) && <option value="">{f.required ? "Choose…" : "—"}</option>}
        {!!text && !listed && <option value={text}>{text} (not in the list)</option>}
        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    : widget === "richtext" ? <RichField value={value} onChange={onChange} label={label} disabled={!editable} invalid={missing} />
    : widget === "textarea" || widget === "lines" ? <textarea id={id} rows={widget === "lines" ? Math.max(3, text.split("\n").length) : 4} disabled={!editable} className={box} value={text}
        onChange={(e) => onChange(widget === "lines" ? e.target.value.split("\n") : e.target.value)} />
    : <input id={id} type="text" inputMode={widget === "link" ? "url" : undefined} spellCheck={widget !== "link" && widget !== "image"} disabled={!editable} className={box} value={text} onChange={(e) => onChange(e.target.value)} />;
  return <div className="grid gap-1 text-[12.5px] text-ink-3">
    <label htmlFor={widget === "richtext" ? undefined : id} className="flex items-baseline gap-1" title={f.name}>{label}{f.required && <span className="text-crit" aria-hidden>*</span>}{f.required && <span className="sr-only">(required)</span>}</label>
    {control}
    {widget === "image" && <ImagePreview src={text} origin={assetOrigin} />}
    {f.hint && <span className="text-[11.5px] text-ink-4">{f.hint}</span>}
    {missing && <span className="text-[11.5px] text-crit">Required before the page can be sent for review.</span>}
  </div>;
}

/** A thumbnail for an image field whose value is a path or an address; a site's logical asset name has none. */
function ImagePreview({ src, origin }: { src: string; origin: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const url = /^https?:\/\//i.test(src) ? src : src.startsWith("/") ? `${origin}${src}` : null;
  if (!url || failed === url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="max-h-28 w-auto max-w-full object-contain border border-line rounded bg-surface-2" onError={() => setFailed(url)} />;
}

/** Page details (title, description, navigation) - written to the draft through content/v1. */
function PageMeta({ page, editable, busy, onSave }: { page: PageDoc; editable: boolean; busy: boolean; onSave: (patch: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState(page.title ?? ""); const [description, setDescription] = useState(page.description ?? "");
  const [navTitle, setNavTitle] = useState(page.navTitle ?? ""); const [hideInNav, setHideInNav] = useState(!!page.hideInNav);
  const patch: Record<string, unknown> = {};
  if (title !== (page.title ?? "")) patch.title = title || null;
  if (description !== (page.description ?? "")) patch.description = description || null;
  if (navTitle !== (page.navTitle ?? "")) patch.navTitle = navTitle || null;
  if (hideInNav !== !!page.hideInNav) patch.hideInNav = hideInNav;
  const input = "border border-line rounded px-2 py-1 text-[13px] text-ink bg-surface";
  return <div className="grid gap-3">
    <h2 className="font-semibold">Page details</h2>
    <label className="grid gap-1 text-[12.5px] text-ink-3">Title<input id="cl-title" className={input} disabled={!editable} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
    <label className="grid gap-1 text-[12.5px] text-ink-3">Description<textarea id="cl-description" rows={3} className={input} disabled={!editable} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
    <label className="grid gap-1 text-[12.5px] text-ink-3">Navigation title<input id="cl-navtitle" className={input} disabled={!editable} value={navTitle} onChange={(e) => setNavTitle(e.target.value)} /></label>
    <label className="flex items-center gap-2 text-[12.5px] text-ink-3"><input id="cl-hide" type="checkbox" disabled={!editable} checked={hideInNav} onChange={(e) => setHideInNav(e.target.checked)} />Hide in navigation</label>
    {editable && <button className="btn btn-sm on justify-self-start" disabled={busy || !Object.keys(patch).length} onClick={() => onSave(patch)}>Save details</button>}
    {!editable && <p className="text-[12px] text-ink-3">Select a component on the left to see its fields. Open a draft to edit.</p>}
  </div>;
}

const when = (iso?: string) => iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

const STEPS: [string, string[]][] = [["Draft", ["draft", "modified", "failed"]], ["Author's review", ["review", "inreview"]], ["Reviewed", ["reviewed"]], ["Business review", ["bizreview"]], ["Ready to publish", ["approved", "scheduled"]], ["Live", ["published"]]];
/** Where the page is in the review flow - the mock's steps, one current. */
function StageBar({ status }: { status: string }) {
  const at = Math.max(0, STEPS.findIndex(([, s]) => s.includes(status)));
  return <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 px-5 py-2 border-b border-line bg-surface-2 text-[12px]" aria-label="Review steps">
    {STEPS.map(([label], i) => <li key={label} className="flex items-center gap-1" aria-current={i === at ? "step" : undefined}>
      <span className={`px-2 py-0.5 rounded-full ${i === at ? "bg-ink text-white font-semibold" : i < at ? "text-good" : "text-ink-3"}`}>{i < at ? "✓ " : ""}{label}</span>
      {i < STEPS.length - 1 && <span aria-hidden className="text-ink-4">›</span>}
    </li>)}
  </ol>;
}

/** A scheduled publication, or why it did not happen when it was due. */
function ScheduleBanner({ schedule }: { schedule: Schedule }) {
  if (schedule.failed) return <div className="px-5 py-2 text-[13px] border-b border-line bg-crit/10 text-crit" role="alert">
    The scheduled publication did not happen{schedule.failedAt ? ` (${when(schedule.failedAt)})` : ""}: {schedule.failed}
  </div>;
  return <div className="px-5 py-2 text-[13px] border-b border-line bg-info-soft text-info" role="note">
    Scheduled to go live {when(schedule.publishAt)}{schedule.scheduledBy ? `, published as ${schedule.scheduledBy}` : ""}. Changing the draft now stops it from going live until it is scheduled again.
  </div>;
}

/** Ask somebody else to review, from the people who may review this page; the request itself stays. */
function AssignForm({ marketId, path, current, busy, onSend, onCancel }: { marketId: string; path: string; current?: string; busy: boolean; onSend: (assignee: string) => void; onCancel: () => void }) {
  const [people, setPeople] = useState<ReviewerOption[] | null>(null); const [pick, setPick] = useState(current ?? "");
  useEffect(() => { let live = true; ucpApi.reviewers(marketId, path).then((p) => { if (live) setPeople(p); }, () => { if (live) setPeople([]); }); return () => { live = false; }; }, [marketId, path]);
  return <form className="px-5 py-3 border-b border-line bg-surface-2 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); onSend(pick); }}>
    <label className="grid gap-1 text-[12px] text-ink-3">Reviewer
      <select id="cl-review-reassign" className="border border-line rounded px-2 py-1 text-[13px] bg-surface min-w-[220px]" value={pick} onChange={(e) => setPick(e.target.value)} disabled={!people}>
        <option value="">Any approver</option>
        {(people ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}{p.activeReviews ? ` · ${p.activeReviews} in review` : ""}</option>)}
      </select>
    </label>
    <button type="submit" className="btn btn-sm on" disabled={busy || !people || pick === (current ?? "")}>Change reviewer</button>
    <button type="button" className="btn btn-sm" onClick={onCancel}>Cancel</button>
  </form>;
}

/** Where the draft stands in review, in one line: who asked whom, by when, and what was decided. */
function ReviewBanner({ review }: { review: Review }) {
  const tone = review.state === "APPROVED" ? "bg-good-soft text-good" : review.state === "IN_REVIEW" ? "bg-info-soft text-info" : "bg-warn-soft text-warn";
  const text = review.state === "IN_REVIEW"
    ? `In review: sent by ${review.requestedBy ?? "?"} ${when(review.requestedAt)}${review.assignee ? ` to ${review.assignee}` : " to any approver"}${review.due ? `, due ${when(review.due)}` : ""}.`
    : review.state === "APPROVED" ? `Approved by ${review.decidedBy ?? "?"} ${when(review.decidedAt)}. Ready to publish.`
    : review.state === "CHANGES_REQUESTED" ? `Changes requested by ${review.decidedBy ?? "?"} ${when(review.decidedAt)}. Make them, then send for review again.`
    : "Approved, then changed. Send it for review again before publishing.";
  return <div className={`px-5 py-2 text-[13px] border-b border-line ${tone}`} role="note">
    {text}{review.state === "IN_REVIEW" && review.remindedAt && <span className="block text-ink-2">Reminded by {review.remindedBy ?? "?"} {when(review.remindedAt)}.</span>}{review.note && review.state === "IN_REVIEW" && <span className="block text-ink-2">Note: {review.note}</span>}{review.comment && review.state !== "IN_REVIEW" && <span className="block text-ink-2">Reviewer: {review.comment}</span>}
  </div>;
}

function ReviewRequestForm({ busy, onSend, onCancel }: { busy: boolean; onSend: (body: { assignee?: string; due?: string; note?: string }) => void; onCancel: () => void }) {
  const [assignee, setAssignee] = useState(""); const [due, setDue] = useState(""); const [note, setNote] = useState("");
  const input = "border border-line rounded px-2 py-1 text-[13px] bg-surface";
  return <form className="px-5 py-3 border-b border-line bg-surface-2 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); onSend({ assignee: assignee.trim() || undefined, due: due ? new Date(`${due}T17:00:00`).toISOString() : undefined, note: note.trim() || undefined }); }}>
    <label className="grid gap-1 text-[12px] text-ink-3">Reviewer (user id, optional)<input id="cl-review-assignee" className={input} value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Any approver" /></label>
    <label className="grid gap-1 text-[12px] text-ink-3">Due<input id="cl-review-due" type="date" className={input} value={due} onChange={(e) => setDue(e.target.value)} /></label>
    <label className="grid gap-1 text-[12px] text-ink-3 flex-1 min-w-[220px]">What should the reviewer check?<input id="cl-review-note" className={input} value={note} onChange={(e) => setNote(e.target.value)} /></label>
    <button type="submit" className="btn btn-sm on" disabled={busy}>Send for review</button>
    <button type="button" className="btn btn-sm" onClick={onCancel}>Cancel</button>
  </form>;
}

function ChangesForm({ busy, onSend, onCancel }: { busy: boolean; onSend: (comment: string) => void; onCancel: () => void }) {
  const [comment, setComment] = useState("");
  return <form className="px-5 py-3 border-b border-line bg-surface-2 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); onSend(comment.trim()); }}>
    <label className="grid gap-1 text-[12px] text-ink-3 flex-1 min-w-[260px]">What needs to change?<input id="cl-review-comment" className="border border-line rounded px-2 py-1 text-[13px] bg-surface" value={comment} onChange={(e) => setComment(e.target.value)} required /></label>
    <button type="submit" className="btn btn-sm on" disabled={busy || !comment.trim()}>Request changes</button>
    <button type="button" className="btn btn-sm" onClick={onCancel}>Cancel</button>
  </form>;
}
