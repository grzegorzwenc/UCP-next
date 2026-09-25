"use client";
import { useState } from "react";
import type { Model, ModelField } from "@/lib/ucp/types";
import { ModalShell, inputCls } from "./ModalShell";
import { camel, KEY_RE } from "./fieldMeta";

type Kind = "one" | "many" | "parent" | "children";
/**
 * Confirms a link drawn on the model map and turns it into a Reference field on the source model.
 * Linking a model to itself builds a tree: "Parent" (each item has one parent) or "Children" (each item lists its children).
 */
export function RelationDialog({ from, to, taken, onClose, onSubmit }: { from: Model; to: Model; taken: string[]; onClose: () => void; onSubmit: (f: ModelField) => void }) {
  const self = from.id === to.id;
  const plural = (s: string) => (/(s|x|ch|sh)$/i.test(s) ? `${s}es` : /[^aeiou]y$/i.test(s) ? `${s.slice(0, -1)}ies` : `${s}s`);
  const labelFor = (k: Kind) => (k === "parent" ? `Parent ${to.name.toLowerCase()}` : k === "children" ? `Child ${plural(to.name.toLowerCase())}` : k === "many" ? plural(to.name) : to.name);
  const [kind, setKind] = useState<Kind>(self ? "parent" : "one");
  const [label, setLabel] = useState(labelFor(self ? "parent" : "one")); const [touched, setTouched] = useState(false);
  const [req, setReq] = useState(false);
  const key = camel(label); const clash = taken.includes(key); const bad = !label.trim() || !KEY_RE.test(key) || clash;
  const pickKind = (k: Kind) => { setKind(k); if (!touched) setLabel(labelFor(k)); };
  const many = kind === "many" || kind === "children";
  const opts: [Kind, string, string][] = self
    ? [["parent", "Parent (tree)", `Each ${from.name} can sit under one other ${from.name}.`], ["children", "Children (tree)", `Each ${from.name} lists the ${plural(from.name)} below it.`]]
    : [["one", `One ${to.name}`, `Each ${from.name} links to a single ${to.name}.`], ["many", `Many ${plural(to.name)}`, `Each ${from.name} can link to several ${plural(to.name)}.`]];
  const submit = () => { if (bad) return; onSubmit({ k: key, l: label.trim(), t: "Reference", req, loc: false, desc: self ? (kind === "parent" ? `Builds the ${from.name} tree` : `Child items in the ${from.name} tree`) : undefined, validation: { referenceModel: to.id, ...(many ? { multiple: true } : {}) } }); };
  return <ModalShell title={self ? `Build a ${from.name} tree` : `Link ${from.name} to ${to.name}`} subtitle={<>Adds a reference field to <b>{from.name}</b>. It is saved in the draft; publish {from.name} to make it live.</>} width={520} onClose={onClose}
    footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={bad} onClick={submit}>{self ? "Create tree link" : "Create link"}</button></>}>
    <div className="flex items-center gap-2 text-[13px] mb-4"><span className="px-2.5 py-1 rounded bg-ink text-white font-semibold">{from.name}</span><span className="text-accent font-semibold">{self ? "↻" : many ? "→→" : "→"}</span><span className="px-2.5 py-1 rounded bg-ink text-white font-semibold">{to.name}</span></div>
    <div role="radiogroup" aria-label="Kind of link" className="grid gap-1.5">
      {opts.map(([k, l, hint]) => <label key={k} className={`flex items-start gap-2.5 px-3 py-2 rounded-md border cursor-pointer ${kind === k ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-2"}`}>
        <input type="radio" name="rel-kind" className="mt-1 accent-[var(--accent)]" checked={kind === k} onChange={() => pickKind(k)} /><span><b className="block text-[13.5px]">{l}</b><small className="text-ink-3 text-[12.5px]">{hint}</small></span></label>)}
    </div>
    <label className="block text-[13px] font-semibold mt-4">Field name<input className={inputCls} value={label} onChange={(e) => { setLabel(e.target.value); setTouched(true); }} aria-invalid={bad} autoFocus /></label>
    <p className="text-[12px] mt-1">{clash ? <span className="text-crit">{from.name} already has a field “{key}”. Pick another name.</span> : <span className="text-ink-4">Key <span className="font-mono">{key || "—"}</span></span>}</p>
    <label className="flex items-center gap-2 text-[13px] mt-3"><input type="checkbox" className="accent-[var(--accent)]" checked={req} onChange={(e) => setReq(e.target.checked)} />Required{self && <span className="text-ink-4 text-[12px]">(usually off, so the top of the tree can stay empty)</span>}</label>
  </ModalShell>;
}
