"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ExternalLink, Plus, Trash2, Zap } from "lucide-react";
import { PanelSection } from "./PanelSection";
import { repoApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { FIELD_TYPES, RETENTION, RULE_ACTIONS, RULE_OPS, SUBMIT_ACTIONS, formChecks, formLayout, formRules, formSubmit, type FormRule, type FormSubmit, type RuleAction, type RuleOp } from "@/lib/forms/model";
import { FormContract } from "@/components/forms/FormContract";

type B = { id: string; type: string; props: Record<string, unknown> };
const sel = "bdl-field mt-1";
const S = ({ t, open = true, children }: { t: string; open?: boolean; children: React.ReactNode }) => <PanelSection id={`fs-${t.toLowerCase().replace(/\W+/g, "-")}`} title={t} defaultOpen={open}><div className="flex flex-col gap-3">{children}</div></PanelSection>;

/**
 * The builder's right-hand settings panel for a form (in place of Page settings): where the form lives,
 * its flow and steps, rules, what happens on submit, and the checks a reviewer will look at.
 * Rules, submit action and layout are saved on the form's jcr:content straight away.
 */
export function FormSettings({ marketId, base, path, meta, blocks, host, editable, status, title }: {
  marketId: string; base: string; path: string; meta?: Record<string, unknown>; blocks: B[]; host?: { path: string; title: string; rel: string }; editable: boolean; status: string; title: string;
}) {
  const [rules, setRules] = useState<FormRule[]>(() => formRules(meta)); const [submit, setSubmit] = useState<FormSubmit>(() => formSubmit(meta)); const [layout, setLayout] = useState(() => formLayout(meta));
  const [saved, setSaved] = useState<string | null>(null); const [contract, setContract] = useState(false);
  const fields = useMemo(() => blocks.filter((b) => FIELD_TYPES.includes(b.type) && b.type !== "fconsent" && String(b.props.name ?? "")), [blocks]);
  const steps = useMemo(() => blocks.filter((b) => b.type === "formstep").map((b) => String(b.props.title ?? "")), [blocks]);
  const label = (name: string) => String(fields.find((f) => f.props.name === name)?.props.label ?? name);
  const checks = formChecks(blocks, rules, submit);

  async function persist(p: Record<string, unknown>) { try { await repoApi.setProps(`${path}/jcr:content`, p, { text: `changed the settings of form ${title}`, target: path }); setSaved("Saved"); } catch (e) { setSaved(errorText(e)); } setTimeout(() => setSaved(null), 1800); }
  const putRules = (r: FormRule[]) => { setRules(r); void persist({ "ucp:formRules": JSON.stringify(r) }); };
  const putSubmit = (s: FormSubmit) => { setSubmit(s); void persist({ "ucp:formSubmit": JSON.stringify(s) }); };
  const putLayout = (l: "wizard" | "single") => { setLayout(l); void persist({ "ucp:formLayout": l }); };
  const setRule = (id: string, p: { when?: Partial<FormRule["when"]>; then?: Partial<FormRule["then"]> }) => putRules(rules.map((r) => (r.id === id ? { ...r, when: { ...r.when, ...p.when }, then: { ...r.then, ...p.then } } : r)));
  const act = SUBMIT_ACTIONS[submit.action];

  return <div className="flex flex-col">
    {saved && <div className="mx-3.5 mt-2 text-xs text-good flex items-center gap-1" role="status"><Check className="size-3.5" aria-hidden />{saved}</div>}
    <S t="Location">
      <div className="text-xs text-ink-2 font-medium">Shown on page</div>
      {host ? <div className="border border-line bg-surface-2 px-3 py-2 text-sm"><b className="block">{host.title}</b><span className="text-xs text-ink-3 break-all">{host.rel}</span>
        <Link href={`${base}/page${host.rel}`} className="mt-1.5 inline-flex items-center gap-1 text-xs underline">Open the page<ExternalLink className="size-3" aria-hidden /></Link></div>
        : <p className="text-xs text-crit">No host page. Every form must be placed on a page.</p>}
      <p className="text-xs text-ink-3">The page shows the form with its Form component. A page cannot go live with a form that is not published.</p>
    </S>
    <S t="Flow and steps">
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Layout">{([["wizard", "Step by step"], ["single", "One page"]] as const).map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={layout === k} disabled={!editable} onClick={() => putLayout(k)} className={`border px-2 py-1.5 text-xs ${layout === k ? "border-ink bg-ink text-white" : "border-line-2 hover:bg-surface-3"}`}>{l}</button>)}</div>
      <ol className="grid gap-1 text-xs">{steps.map((s, i) => { const skip = rules.some((r) => r.then.action === "skip-step" && r.then.target === s); return <li key={i} className="flex items-center gap-2 border border-line px-2 py-1.5"><span className="font-medium">{s || "Untitled step"}</span>{skip && <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] text-warn"><Zap className="size-3" aria-hidden />skipped by a rule</span>}</li>; })}</ol>
      <p className="text-xs text-ink-3">Add a <b>Step</b> component to start a new step. Success and failure pages are the last two components.</p>
    </S>
    <S t={`Rules${rules.length ? ` · ${rules.length}` : ""}`}>
      <p className="text-xs text-ink-3">When a field has a value, show, hide or require another field, or skip a step. The same rules run in the browser and in the Forms solution.</p>
      {rules.map((r) => { const src = fields.find((f) => f.props.name === r.when.field); const opts = String(src?.props.options ?? "").split("\n").map((x) => x.trim()).filter(Boolean); const needs = !["is-filled", "is-empty"].includes(r.when.op);
        return <div key={r.id} className="border border-line p-2.5 grid gap-1.5 text-xs">
          <div className="flex items-center"><Zap className="size-3.5 text-warn" aria-hidden /><b className="ml-1">When</b>{editable && <button type="button" className="ml-auto text-ink-3 hover:text-crit" aria-label="Delete rule" onClick={() => putRules(rules.filter((x) => x.id !== r.id))}><Trash2 className="size-3.5" /></button>}</div>
          <select className={sel} disabled={!editable} value={r.when.field} onChange={(e) => setRule(r.id, { when: { field: e.target.value, value: "" } })} aria-label="Field">{fields.map((f) => <option key={f.id} value={String(f.props.name)}>{String(f.props.label)}</option>)}</select>
          <div className="grid grid-cols-2 gap-1.5"><select className={sel} disabled={!editable} value={r.when.op} onChange={(e) => setRule(r.id, { when: { op: e.target.value as RuleOp } })} aria-label="Condition">{Object.entries(RULE_OPS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            {needs && (opts.length ? <select className={sel} disabled={!editable} value={r.when.value ?? ""} onChange={(e) => setRule(r.id, { when: { value: e.target.value } })} aria-label="Value"><option value="">Choose</option>{opts.map((o) => <option key={o}>{o}</option>)}</select> : <input className={sel} disabled={!editable} value={r.when.value ?? ""} placeholder="value" onChange={(e) => setRule(r.id, { when: { value: e.target.value } })} aria-label="Value" />)}</div>
          <b>then</b>
          <div className="grid grid-cols-2 gap-1.5"><select className={sel} disabled={!editable} value={r.then.action} onChange={(e) => { const a = e.target.value as RuleAction; setRule(r.id, { then: { action: a, target: a === "skip-step" ? steps[0] ?? "" : String(fields[0]?.props.name ?? "") } }); }} aria-label="Action">{Object.entries(RULE_ACTIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <select className={sel} disabled={!editable} value={r.then.target} onChange={(e) => setRule(r.id, { then: { target: e.target.value } })} aria-label="Target">{r.then.action === "skip-step" ? steps.map((s) => <option key={s} value={s}>{s}</option>) : fields.filter((f) => f.props.name !== r.when.field).map((f) => <option key={f.id} value={String(f.props.name)}>{String(f.props.label)}</option>)}</select></div>
          <span className="text-ink-3">When {label(r.when.field)} {RULE_OPS[r.when.op]} {needs ? `“${r.when.value ?? ""}”` : ""} → {RULE_ACTIONS[r.then.action].toLowerCase()} {r.then.action === "skip-step" ? `step “${r.then.target}”` : label(r.then.target)}</span>
        </div>; })}
      {editable && fields.length > 1 && <button type="button" className="btn btn-sm btn-secondary justify-center" onClick={() => { const src = fields.find((f) => f.props.options) ?? fields[0]; const tgt = fields.find((f) => f !== src); putRules([...rules, { id: `r${Date.now().toString(36)}`, when: { field: String(src.props.name), op: "equals", value: String(src.props.options ?? "").split("\n")[0]?.trim() ?? "" }, then: { action: "show", target: String(tgt?.props.name ?? "") } }]); }}><Plus className="size-3.5" aria-hidden />Add rule</button>}
    </S>
    <S t="Submission" open={false}>
      <p className="text-xs text-ink-3">Answers go from the customer’s browser to the Forms solution, which validates, stores and routes them. UCP never stores customer data.</p>
      <label className="text-xs text-ink-2 font-medium">Submit action<select className={sel} disabled={!editable} value={submit.action} onChange={(e) => putSubmit({ ...submit, action: e.target.value, mapping: {} })}>{Object.entries(SUBMIT_ACTIONS).map(([k, a]) => <option key={k} value={k}>{a.name}</option>)}</select><small className="block text-ink-3 font-normal mt-1">{act?.desc}</small></label>
      {act && act.target.length > 0 && <div className="grid gap-1.5"><div className="text-xs text-ink-2 font-medium">Field mapping</div>{fields.filter((f) => f.type !== "fconsent").map((f) => <label key={f.id} className="grid grid-cols-[1fr_1fr] items-center gap-2 text-xs"><span className="truncate" title={String(f.props.name)}>{String(f.props.label)}</span>
        <select className="bdl-field" disabled={!editable} value={submit.mapping[String(f.props.name)] ?? ""} onChange={(e) => { const m = { ...submit.mapping }; if (e.target.value) m[String(f.props.name)] = e.target.value; else delete m[String(f.props.name)]; putSubmit({ ...submit, mapping: m }); }}><option value="">Not sent</option>{act.target.map((t) => <option key={t} value={t}>{t}{act.required.includes(t) ? " *" : ""}</option>)}</select></label>)}</div>}
      <label className="text-xs text-ink-2 font-medium">Data retention<select className={sel} disabled={!editable} value={submit.retention} onChange={(e) => putSubmit({ ...submit, retention: e.target.value })}>{Object.entries(RETENTION).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
    </S>
    <S t="Checks before review">
      {checks.length ? <ul className="grid gap-1 text-xs">{checks.map((c) => <li key={c} className="text-crit">● {c}</li>)}</ul> : <p className="text-xs text-good flex items-center gap-1"><Check className="size-3.5" aria-hidden />Nothing to fix</p>}
    </S>
    <S t="Forms solution" open={false}>
      <p className="text-xs text-ink-3">Published forms are served to the Forms solution as AEM Forms core components.</p>
      <button type="button" className="btn btn-sm btn-secondary justify-center" disabled={status !== "published"} title={status !== "published" ? "Available once the form is published" : undefined} onClick={() => setContract(true)}>Show API contract</button>
    </S>
    {contract && <FormContract marketId={marketId} id={path.split("/").pop() ?? ""} name={title} onClose={() => setContract(false)} />}
  </div>;
}
