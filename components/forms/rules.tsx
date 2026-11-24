"use client";
import { useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { repoApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { FIELD_TYPES, RULE_ACTIONS, RULE_OPS, formLayout, formRules, formSubmitPage, type FormRule, type RuleAction, type RuleOp, type SubmitPage } from "@/lib/forms/model";

/**
 * Form rules, shared by every place that shows them: the Steps & pages tab, the form settings,
 * the settings of one field, and the chips between fields on the canvas. One state, saved on the
 * form's jcr:content as `ucp:formRules` straight away.
 */
type B = { id: string; type: string; props: Record<string, unknown> };
const sel = "bdl-field mt-1";

export type FormView = { page: "step"; step: number } | { page: "submit" | "success" | "failure" };
export type FormFlowState = ReturnType<typeof useFormFlow>;
/** Rules, layout and the Submit page of one form, saved on its jcr:content as soon as they change. */
export function useFormFlow(meta: Record<string, unknown> | undefined, path: string, title: string, say?: (m: string) => void) {
  const [rules, setRules] = useState<FormRule[]>(() => formRules(meta));
  const [layout, setLayout] = useState<"wizard" | "single">(() => formLayout(meta));
  const [submitPage, setSubmitPage] = useState<SubmitPage>(() => formSubmitPage(meta));
  const persist = (p: Record<string, unknown>, what: string) => repoApi.setProps(`${path}/jcr:content`, p, { text: `changed the ${what} of form ${title}`, target: path }).then(() => say?.("Saved"), (e) => say?.(errorText(e)));
  return {
    rules, layout, submitPage,
    putRules: (r: FormRule[]) => { setRules(r); void persist({ "ucp:formRules": JSON.stringify(r) }, "rules"); },
    putLayout: (l: "wizard" | "single") => { setLayout(l); void persist({ "ucp:formLayout": l }, "layout"); },
    putSubmitPage: (sp: SubmitPage) => { setSubmitPage(sp); void persist({ "ucp:formSubmitPage": JSON.stringify(sp) }, "submit page"); },
  };
}

/** Fields a rule can read or act on (consents are never conditional). */
export const ruleFields = (blocks: B[]) => blocks.filter((b) => FIELD_TYPES.includes(b.type) && b.type !== "fconsent" && String(b.props.name ?? ""));
export const formSteps = (blocks: B[]) => blocks.filter((b) => b.type === "formstep").map((b) => String(b.props.title ?? ""));
const labelOf = (fields: B[], name: string) => String(fields.find((f) => f.props.name === name)?.props.label ?? name);
const needsValue = (op: RuleOp) => !["is-filled", "is-empty"].includes(op);

/** "When Employment is “Employed”" */
export function whenText(r: FormRule, fields: B[]) { return `${labelOf(fields, r.when.field)} ${RULE_OPS[r.when.op]}${needsValue(r.when.op) ? ` “${r.when.value ?? ""}”` : ""}`; }
/** How a rule reads on the field it changes. */
export function effectText(r: FormRule, fields: B[]) {
  const w = whenText(r, fields);
  return r.then.action === "show" ? `Shown only when ${w}` : r.then.action === "hide" ? `Hidden when ${w}` : r.then.action === "require" ? `Required when ${w}` : `Step skipped when ${w}`;
}
/** Rules that change this block (a field, or a step for "skip step"). */
export function rulesOn(b: B, rules: FormRule[]) {
  if (b.type === "formstep") return rules.filter((r) => r.then.action === "skip-step" && r.then.target === String(b.props.title ?? ""));
  const n = String(b.props.name ?? ""); return n ? rules.filter((r) => r.then.action !== "skip-step" && r.then.target === n) : [];
}
/** Rules this field's answer drives. */
export const rulesFrom = (b: B, rules: FormRule[]) => { const n = String(b.props.name ?? ""); return n ? rules.filter((r) => r.when.field === n) : []; };

export function newRule(fields: B[], steps: string[], opts: { source?: string; target?: string; step?: string } = {}): FormRule | null {
  const src = fields.find((f) => f.props.name === opts.source) ?? fields.find((f) => f.props.options && f.props.name !== opts.target) ?? fields.find((f) => f.props.name !== opts.target);
  if (!src) return null;
  const firstOpt = String(src.props.options ?? "").split("\n")[0]?.trim() ?? "";
  const target = opts.step ?? opts.target ?? String(fields.find((f) => f !== src)?.props.name ?? "");
  return { id: `r${Date.now().toString(36)}`, when: { field: String(src.props.name), op: "equals", value: firstOpt }, then: { action: opts.step ? "skip-step" : "show", target } };
}

/** One rule, editable: When <field> <condition> <value> then <action> <target>. */
export function RuleCard({ r, fields, steps, editable, onChange, onDelete }: { r: FormRule; fields: B[]; steps: string[]; editable: boolean; onChange: (r: FormRule) => void; onDelete: () => void }) {
  const src = fields.find((f) => f.props.name === r.when.field); const opts = String(src?.props.options ?? "").split("\n").map((x) => x.trim()).filter(Boolean); const needs = needsValue(r.when.op);
  const set = (p: { when?: Partial<FormRule["when"]>; then?: Partial<FormRule["then"]> }) => onChange({ ...r, when: { ...r.when, ...p.when }, then: { ...r.then, ...p.then } });
  return <div className="border border-line p-2.5 grid gap-1.5 text-xs bg-surface">
    <div className="flex items-center"><Zap className="size-3.5 text-warn" aria-hidden /><b className="ml-1">When</b>{editable && <button type="button" className="ml-auto text-ink-3 hover:text-crit" aria-label="Delete rule" onClick={onDelete}><Trash2 className="size-3.5" /></button>}</div>
    <select className={sel} disabled={!editable} value={r.when.field} onChange={(e) => set({ when: { field: e.target.value, value: "" } })} aria-label="Field">{fields.map((f) => <option key={f.id} value={String(f.props.name)}>{String(f.props.label)}</option>)}</select>
    <div className="grid grid-cols-2 gap-1.5"><select className={sel} disabled={!editable} value={r.when.op} onChange={(e) => set({ when: { op: e.target.value as RuleOp } })} aria-label="Condition">{Object.entries(RULE_OPS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      {needs && (opts.length ? <select className={sel} disabled={!editable} value={r.when.value ?? ""} onChange={(e) => set({ when: { value: e.target.value } })} aria-label="Value"><option value="">Choose</option>{opts.map((o) => <option key={o}>{o}</option>)}</select> : <input className={sel} disabled={!editable} value={r.when.value ?? ""} placeholder="value" onChange={(e) => set({ when: { value: e.target.value } })} aria-label="Value" />)}</div>
    <b>then</b>
    <div className="grid grid-cols-2 gap-1.5"><select className={sel} disabled={!editable} value={r.then.action} onChange={(e) => { const a = e.target.value as RuleAction; set({ then: { action: a, target: a === "skip-step" ? steps[0] ?? "" : String(fields.find((f) => f.props.name !== r.when.field)?.props.name ?? "") } }); }} aria-label="Action">{Object.entries(RULE_ACTIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <select className={sel} disabled={!editable} value={r.then.target} onChange={(e) => set({ then: { target: e.target.value } })} aria-label="Target">{r.then.action === "skip-step" ? steps.map((s) => <option key={s} value={s}>{s}</option>) : fields.filter((f) => f.props.name !== r.when.field).map((f) => <option key={f.id} value={String(f.props.name)}>{String(f.props.label)}</option>)}</select></div>
    <span className="text-ink-3">When {whenText(r, fields)} → {RULE_ACTIONS[r.then.action].toLowerCase()} {r.then.action === "skip-step" ? `step “${r.then.target}”` : labelOf(fields, r.then.target)}</span>
  </div>;
}

/** A list of rules with an Add button. `only` narrows it (e.g. to one field); new rules get `seed`. */
export function RuleList({ rules, putRules, blocks, editable, only, seed, empty }: {
  rules: FormRule[]; putRules: (r: FormRule[]) => void; blocks: B[]; editable: boolean;
  only?: (r: FormRule) => boolean; seed?: { source?: string; target?: string; step?: string }; empty?: string;
}) {
  const fields = ruleFields(blocks); const steps = formSteps(blocks); const shown = only ? rules.filter(only) : rules;
  return <div className="grid gap-2">
    {!shown.length && empty && <p className="text-xs text-ink-3">{empty}</p>}
    {shown.map((r) => <RuleCard key={r.id} r={r} fields={fields} steps={steps} editable={editable} onChange={(n) => putRules(rules.map((x) => (x.id === r.id ? n : x)))} onDelete={() => putRules(rules.filter((x) => x.id !== r.id))} />)}
    {editable && fields.length > 1 && <button type="button" className="btn btn-sm btn-secondary justify-center" onClick={() => { const n = newRule(fields, steps, seed); if (n) putRules([...rules, n]); }}><Plus className="size-3.5" aria-hidden />Add rule</button>}
  </div>;
}
