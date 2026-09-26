"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { useSession } from "@/components/shell/Session";

/**
 * The page builder on ContentLIBRE (UCP_BACKEND=contentlibre).
 *
 * One renderer: the preview is the backend's own render of the page (or of the open draft), not a React copy of its
 * components. Structure, allowed components and fields come from the backend's `.libre-model.json`, and every write
 * goes through the backend's composition validator - whatever this screen offers, the backend decides.
 *
 * Edits land in a draft (publication.mode=drafts): "Edit" opens one, "Publish" makes it live, "Discard" drops it.
 */

type FieldDef = { name: string; type: string; default?: unknown };
type ModelItem = { path: string; resourceType: string; deployed?: boolean };
type ModelSlot = { id: string; type: string; label: string; maxItems: number; items: ModelItem[] };
type Model = {
  resourceType: string; path: string;
  slotTypes: Record<string, { allowedComponents: string[] }>;
  slots: ModelSlot[];
  components: Record<string, { label: string; fields: FieldDef[] }>;
  values: Record<string, unknown>;
};
type Review = { state: "IN_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "OUTDATED"; requestedBy?: string; requestedAt?: string; assignee?: string; due?: string; note?: string; decidedBy?: string; decidedAt?: string; comment?: string };
type Draft = { id: string; state: string; label?: string; revision?: string; stale: boolean; createdBy?: string; modified?: string; review?: Review };
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
const STATUS_PILL: Record<string, string> = { published: "published", modified: "modified", draft: "draft", unpublished: "draft", review: "review", approved: "approved" };
const qs = (params: Record<string, string | undefined>) => new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();

type Loaded = { drafts: Drafts; page: PageDoc; model: Model | null };
/** Everything the builder shows for one page: its drafts, then the page and structure of the open draft (or the live payload). */
async function fetchPage(path: string): Promise<Loaded> {
  const drafts = await call<Drafts>(`/api/cl/drafts?${qs({ path })}`);
  const open = drafts.open[0];
  const payload = open ? `/var/pages/drafts${path}/${open.id}/jcr:content` : `${path}/jcr:content`;
  const [page, model] = await Promise.all([
    call<PageDoc>(`/api/cl/page?${qs({ path, draft: open?.id })}`),
    call<Model>(`/api/cl/model?node=${encodeURIComponent(payload)}`).catch(() => null),
  ]);
  return { drafts, page, model };
}

export function ClBuilder({ path, listUrl }: { path: string; listUrl: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  /** Bumped after every successful action: reloads structure, preview and the inspector. */
  const [version, setVersion] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [selModel, setSelModel] = useState<{ node: string; model: Model } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [stalePublish, setStalePublish] = useState(false);

  const drafts = loaded?.drafts; const page = loaded?.page; const model = loaded?.model ?? null;
  const draft = drafts?.open[0];
  const payload = draft ? `/var/pages/drafts${path}/${draft.id}/jcr:content` : `${path}/jcr:content`;
  const editable = !!draft && page?.permissions?.edit !== false;
  const q = (extra: Record<string, string | undefined> = {}) => qs({ path, ...extra });
  const inspected = selected && selModel?.node === selected ? selModel.model : null;
  const { user } = useSession();
  const [reviewForm, setReviewForm] = useState<null | "request" | "changes">(null);
  const review = draft?.review; const reviewState = review?.state;
  // The backend decides (approver groups, never your own request); this only hides what it would refuse.
  const canDecide = reviewState === "IN_REVIEW" && (user.role === "admin" || (user.role === "reviewer" && review?.requestedBy !== user.id));
  const publishBlocked = reviewState === "IN_REVIEW" ? "Waiting for review" : reviewState === "CHANGES_REQUESTED" ? "Changes were requested" : reviewState === "OUTDATED" ? "Changed after approval: send for review again" : drafts?.reviewRequired && reviewState !== "APPROVED" ? "This site publishes reviewed drafts only" : null;

  useEffect(() => {
    let current = true;
    fetchPage(path).then((l) => { if (current) setLoaded(l); }, (e: Error) => { if (current) setNote({ kind: "err", text: e.message }); });
    return () => { current = false; };
  }, [path, version]);
  useEffect(() => {
    if (!selected) return;
    let current = true;
    call<Model>(`/api/cl/model?node=${encodeURIComponent(selected)}`).then(
      (m) => { if (current) setSelModel({ node: selected, model: m }); },
      (e: Error) => { if (current) setNote({ kind: "err", text: e.message }); });
    return () => { current = false; };
  }, [selected, version]);

  /** Every action: run, report the backend's own words, reload structure and preview. */
  async function act(label: string, fn: () => Promise<unknown>, after?: () => void) {
    setBusy(true); setNote(null);
    try { await fn(); setNote({ kind: "ok", text: label }); after?.(); setVersion((v) => v + 1); }
    catch (e) {
      const err = e as Error & { type?: string };
      if (err.type?.endsWith("/draft-stale")) setStalePublish(true);
      setNote({ kind: "err", text: err.message });
    }
    finally { setBusy(false); }
  }

  const openDraft = () => act("Draft opened. Your changes stay private until you publish.", () => call(`/api/cl/drafts?${q()}`, { method: "POST", body: "{}" }));
  const publish = (force = false) => act("Published. The page is live.", () => call(`/api/cl/drafts/publish?${q()}`, { method: "POST", body: JSON.stringify({ draft: draft?.id, revision: draft?.revision, force }) }), () => { setStalePublish(false); setSelected(null); });
  const discard = () => act("Draft discarded.", async () => {
    const r = await call<{ message: string }>(`/api/cl/drafts?${q({ draft: draft?.id })}`, { method: "DELETE" });
    if (/removed|deleted|goes with/i.test(r.message) && !drafts?.publication) window.location.href = listUrl;
  }, () => setSelected(null));

  if (!drafts || !page) return <div className="p-10 text-ink-3">{note?.kind === "err" ? note.text : "Loading the page…"}</div>;
  // The review, when there is one, is what the page is waiting on; otherwise its publication status.
  const status = reviewState === "IN_REVIEW" ? "review" : reviewState === "APPROVED" ? "approved" : page.status ?? "draft";
  const previewSrc = `/api/cl/preview?${q({ draft: draft?.id })}&v=${version}`;

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
            {canDecide && <>
              <button className="btn btn-sm" disabled={busy} onClick={() => setReviewForm(reviewForm === "changes" ? null : "changes")}>Request changes</button>
              <button className="btn btn-sm on" disabled={busy} onClick={() => void act("Approved. It can be published now.", () => call(`/api/cl/drafts/decision?${q()}`, { method: "POST", body: JSON.stringify({ draft: draft.id, decision: "approve" }) }))}>Approve</button>
            </>}
            <button className="btn btn-sm on" disabled={busy || !!publishBlocked} title={publishBlocked ?? undefined} onClick={() => void publish(false)}>Publish</button>
          </>}
        </div>
      </div>
      {draft && review && <ReviewBanner review={review} />}
      {draft && reviewForm === "request" && <ReviewRequestForm busy={busy} onCancel={() => setReviewForm(null)} onSend={(body) => act("Sent for review.", () => call(`/api/cl/drafts/review?${q()}`, { method: "POST", body: JSON.stringify({ draft: draft.id, ...body }) }), () => setReviewForm(null))} />}
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

        <main className="bg-surface-3 min-h-[70vh] lg:min-h-0 p-3">
          <iframe key={previewSrc} src={previewSrc} title={`Preview of ${page.title ?? path}`} className="w-full h-[70vh] lg:h-full bg-white border border-line rounded" />
        </main>

        <aside className="border-t lg:border-t-0 lg:border-l border-line overflow-auto p-4 bg-surface" aria-label="Inspector">
          {selected && inspected
            ? <Inspector key={`${selected}-${version}`} node={selected} model={inspected} editable={editable} busy={busy} act={act} onClose={() => setSelected(null)} />
            : <PageMeta key={`${draft?.id}-${version}`} page={page} editable={editable} busy={busy} onSave={(patch) => act("Page details saved to the draft.", () => call(`/api/cl/page?${q({ draft: draft?.id })}`, { method: "PATCH", body: JSON.stringify(patch) }))} />}
          {payload && <p className="font-mono text-[10.5px] text-ink-4 mt-6 break-all">{payload}</p>}
        </aside>
      </div>
    </div>
  );
}

type Act = (label: string, fn: () => Promise<unknown>, after?: () => void) => Promise<void>;

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
function Inspector({ node, model, editable, busy, act, onClose }: { node: string; model: Model; editable: boolean; busy: boolean; act: Act; onClose: () => void }) {
  const def = model.components[model.resourceType];
  const fields = useMemo(() => def?.fields ?? [], [def]);
  const initial = useMemo(() => Object.fromEntries(fields.map((f) => [f.name, model.values[f.name] ?? f.default ?? ""])), [fields, model.values]);
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const changed = fields.filter((f) => JSON.stringify(values[f.name]) !== JSON.stringify(initial[f.name]));
  const save = () => act("Saved to the draft.", () => call("/api/cl/component/properties", { method: "POST", body: JSON.stringify({ node, values: changed.map((f) => ({ field: f, value: values[f.name] })) }) }));
  return <div className="grid gap-3">
    <div className="flex items-center"><h2 className="font-semibold">{def?.label ?? nameOf(model.resourceType)}</h2><button className="ml-auto text-ink-3" aria-label="Close" onClick={onClose}>✕</button></div>
    {!fields.length && <p className="text-ink-3 text-[13px]">This component has no editable fields.</p>}
    {fields.map((f) => <label key={f.name} className="grid gap-1 text-[12.5px] text-ink-3">{f.name}
      {f.type === "boolean"
        ? <input type="checkbox" disabled={!editable} checked={!!values[f.name]} onChange={(e) => setValues({ ...values, [f.name]: e.target.checked })} />
        : f.type === "long"
          ? <input type="number" disabled={!editable} className="border border-line rounded px-2 py-1 text-[13px] text-ink bg-surface" value={String(values[f.name] ?? "")} onChange={(e) => setValues({ ...values, [f.name]: Number(e.target.value) })} />
          : f.type === "readonly"
            ? <span className="text-ink">{String(values[f.name] ?? "")}</span>
            : <textarea rows={String(values[f.name] ?? "").length > 60 ? 4 : 1} disabled={!editable} className="border border-line rounded px-2 py-1 text-[13px] text-ink bg-surface" value={Array.isArray(values[f.name]) ? (values[f.name] as unknown[]).join("\n") : String(values[f.name] ?? "")} onChange={(e) => setValues({ ...values, [f.name]: f.type === "string[]" ? e.target.value.split("\n") : e.target.value })} />}
    </label>)}
    {editable && fields.length > 0 && <button className="btn btn-sm on justify-self-start" disabled={busy || !changed.length} onClick={() => void save()}>Save {changed.length ? `(${changed.length})` : ""}</button>}
    {model.slots.length > 0 && <div className="border-t border-line pt-3"><h3 className="text-[11px] tracking-[.1em] uppercase text-ink-3 font-semibold mb-2">Inside this component</h3>
      <SlotList model={model} node={node} editable={editable} busy={busy} selected={null} onSelect={() => undefined} act={act} /></div>}
    {!editable && <p className="text-[12px] text-ink-3">Read-only: open a draft to edit.</p>}
  </div>;
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

/** Where the draft stands in review, in one line: who asked whom, by when, and what was decided. */
function ReviewBanner({ review }: { review: Review }) {
  const tone = review.state === "APPROVED" ? "bg-good-soft text-good" : review.state === "IN_REVIEW" ? "bg-info-soft text-info" : "bg-warn-soft text-warn";
  const text = review.state === "IN_REVIEW"
    ? `In review: sent by ${review.requestedBy ?? "?"} ${when(review.requestedAt)}${review.assignee ? ` to ${review.assignee}` : " to any approver"}${review.due ? `, due ${when(review.due)}` : ""}.`
    : review.state === "APPROVED" ? `Approved by ${review.decidedBy ?? "?"} ${when(review.decidedAt)}. Ready to publish.`
    : review.state === "CHANGES_REQUESTED" ? `Changes requested by ${review.decidedBy ?? "?"} ${when(review.decidedAt)}. Make them, then send for review again.`
    : "Approved, then changed. Send it for review again before publishing.";
  return <div className={`px-5 py-2 text-[13px] border-b border-line ${tone}`} role="note">
    {text}{review.note && review.state === "IN_REVIEW" && <span className="block text-ink-2">Note: {review.note}</span>}{review.comment && review.state !== "IN_REVIEW" && <span className="block text-ink-2">Reviewer: {review.comment}</span>}
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
