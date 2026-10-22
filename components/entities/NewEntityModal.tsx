"use client";
import { useState } from "react";
import type { Entity, Model } from "@/lib/ucp/types";
import { ucpApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { ModalShell, Err, inputCls } from "@/components/models/ModalShell";
import { StatusPill } from "@/components/models/ModelDialogs";
import { ModelIcon } from "@/components/models/bits";

/** Fields an author fills in: the published schema when there is one, minus hidden fields. */
const authorFields = (m: Model) => (m.publishedFields ?? m.fields).filter((f) => !f.hidden).length;

function ModelCard({ m, onPick }: { m: Model; onPick: () => void }) {
  const draft = m.status === "draft"; const n = authorFields(m);
  return <button type="button" disabled={draft} onClick={onPick} title={draft ? "Publish the model first" : undefined}
    className={`text-left flex items-start gap-3 border rounded-lg p-3 ${draft ? "border-line bg-surface-2 opacity-60 cursor-not-allowed" : "border-line-2 bg-surface hover:border-brand hover:bg-brand-soft/30"}`}>
    <ModelIcon m={m} big />
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2"><b className="text-[14px] truncate">{m.name}</b>{draft && <StatusPill status="draft" />}</span>
      <span className="block text-[12.5px] text-ink-3 line-clamp-2">{m.description || "No description"}</span>
      <span className="block text-[12px] text-ink-4 mt-1">{draft ? "Publish the model first" : `${n} field${n === 1 ? "" : "s"}`}</span>
    </span>
  </button>;
}

/**
 * "＋ New entity" wizard: 1) select a content model, 2) give the entity a title. Creates a draft and hands it back
 * so the caller opens it in the entity editor, where the fields are filled in. With `initial` it starts on step 2.
 */
export function NewEntityModal({ marketId, models, initial, folder = "", onClose, onDone }: { marketId: string; models: Model[]; initial?: Model; folder?: string; onClose: () => void; onDone: (m: Model, e: Entity) => void }) {
  const usable = (m?: Model) => (m && m.status !== "draft" ? m : undefined);
  const [model, setModel] = useState<Model | undefined>(usable(initial));
  const [title, setTitle] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const sorted = [...models].sort((a, b) => Number(a.status === "draft") - Number(b.status === "draft") || a.name.localeCompare(b.name));
  const submit = async () => {
    if (!model) return; if (!title.trim()) { setErr("Give the entity a title"); return; }
    setBusy(true); setErr(null);
    try { onDone(model, await ucpApi.createEntity(marketId, model.id, title.trim(), {}, model.id === initial?.id ? folder : "")); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  if (!model) return <ModalShell title="New entity" subtitle="Step 1 of 2 · Select content model" width={720} onClose={onClose}
    footer={<button type="button" className="btn" onClick={onClose}>Cancel</button>}>
    {sorted.length ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="list" aria-label="Content models">{sorted.map((m) => <div role="listitem" key={m.id} className="grid"><ModelCard m={m} onPick={() => { setModel(m); setErr(null); }} /></div>)}</div>
      : <p className="text-[13px] text-ink-3 py-6 text-center">There are no content models yet. Ask a site admin to create and publish one.</p>}
  </ModalShell>;

  return <ModalShell title={`New ${model.name} entity`} subtitle="Step 2 of 2 · Title. You fill in the content on the next screen; it starts as a draft." width={520} onClose={onClose}
    footer={<><button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button><button type="button" className="btn btn-primary" onClick={submit} disabled={busy || !title.trim()}>{busy ? "Creating…" : "Create and fill in"}</button></>}>
    <div className="flex items-center gap-2.5 bg-surface-2 border border-line rounded-lg px-3 py-2 mb-3 text-[13px]"><ModelIcon m={model} /><span className="min-w-0 flex-1 truncate">Content model: <b>{model.name}</b></span><button type="button" className="underline text-ink-2 hover:text-ink" onClick={() => { setModel(undefined); setErr(null); }} disabled={busy}>Change model</button></div>
    <form onSubmit={(e) => { e.preventDefault(); submit(); }}><label className="block text-[13px] font-semibold">Title<input autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HSBC Savings Account" /></label>
      <p className="text-[12px] text-ink-3 mt-1.5">Only people in your team see this name; pages show the field values.</p><Err err={err} /></form>
  </ModalShell>;
}
