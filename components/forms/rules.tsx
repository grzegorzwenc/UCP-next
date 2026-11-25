"use client";
import { useState } from "react";
import { Asterisk, Eye, EyeOff, Plus, SkipForward, Trash2 } from "lucide-react";
import { repoApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { FIELD_TYPES, RULE_ACTIONS, RULE_OPS, formLayout, formRules, formSubmit, formSubmitPage, type FormRule, type FormSubmit, type RuleAction, type RuleOp, type SubmitPage } from "@/lib/forms/model";

/**
 * Form rules, shared by every place that shows them: the Steps & pages tab, the form settings,
 * the settings of one field, and the chips between fields on the canvas. One state, saved on the
 * form's jcr:content as `ucp:formRules` straight away.
 */
type B = { id: string; type: string; props: Record<string, unknown> };
const sel = "bdl-field mt-1";

export type FormView = { page: "step"; step: number } | { page: "submit" | "success" | "failure" };
export type FormFlowState = ReturnType<typeof useFormFlow>;
/** Rules, layout, the Submit page and the Submit button integration of one form, saved on its jcr:content as soon as they change. */
export function useFormFlow(meta: Record<string, unknown> | undefined, path: string, title: string, say?: (m: string) => void) {
  const [rules, setRules] = useState<FormRule[]>(() => formRules(meta));
  const [layout, setLayout] = useState<"wizard" | "single">(() => formLayout(meta));
  const [submitPage, setSubmitPage] = useState<SubmitPage>(() => formSubmitPage(meta));
  const [submit, setSubmit] = useState<FormSubmit>(() => formSubmit(meta));
  const persist = (p: Record<string, unknown>, what: string) => repoApi.setProps(`${path}/jcr:content`, p, { text: `changed the ${what} of form ${title}`, target: path }).then(() => say?.("Saved"), (e) => say?.(errorText(e)));
  return {
    rules, layout, submitPage, submit,
    putRules: (r: FormRule[]) => { setRules(r); void persist({ "ucp:formRules": JSON.stringify(r) }, "rules"); },
    putLayout: (l: "wizard" | "single") => { setLayout(l); void persist({ "ucp:formLayout": l }, "layout"); },
    putSubmitPage: (sp: SubmitPage) => { setSubmitPage(sp); void persist({ "ucp:formSubmitPage": JSON.stringify(sp) }, "submit page"); },
    putSubmit: (x: FormSubmit) => { setSubmit(x); void persist({ "ucp:formSubmit": JSON.stringify(x) }, "Submit button integration"); },
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

/** What a person wants a rule to do, in their words; each one becomes a rule with that action. */
export const RULE_INTENTS: { action: RuleAction; label: string; hint: string; icon: typeof Eye }[] = [
  { action: "show", label: "Show a field only when…", hint: "e.g. ask for the employer only if the customer is employed", icon: Eye },
  { action: "hide", label: "Hide a field when…", hint: "e.g. no phone number when they prefer e-mail", icon: EyeOff },
  { action: "require", label: "Make a field required when…", hint: "e.g. income is required above a loan amount", icon: Asterisk },
  { action: "skip-step", label: "Skip a step when…", hint: "e.g. no documents step for existing customers", icon: SkipForward },
];
const fieldIndex = (blocks: B[], name: string) => blocks.findIndex((b) => b.props.name === name);
const stepIndex = (blocks: B[], title: string) => blocks.findIndex((b) => b.type === "formstep" && b.props.title === title);

/**
 * A new rule for an intent. The condition reads an answer given *before* the target (a field can't depend on
 * one the customer hasn't reached yet), preferring a choice field so the value is a pick, not typing.
 */
export function newRule(blocks: B[], action: RuleAction, opts: { target?: string; step?: string; source?: string } = {}): FormRule | null {
  const fields = ruleFields(blocks); const steps = formSteps(blocks);
  const target = action === "skip-step" ? opts.step ?? steps[steps.length > 1 ? 1 : 0] ?? "" : opts.target ?? "";
  const tIdx = action === "skip-step" ? stepIndex(blocks, target) : target ? fieldIndex(blocks, target) : blocks.length;
  const before = fields.filter((f) => f.props.name !== target && blocks.indexOf(f) < (tIdx < 0 ? blocks.length : tIdx));
  const pool = before.length ? before : fields.filter((f) => f.props.name !== target);
  const src = pool.find((f) => f.props.name === opts.source) ?? [...pool].reverse().find((f) => f.props.options) ?? pool[pool.length - 1];
  if (!src) return null;
  const firstOpt = String(src.props.options ?? "").split("\n")[0]?.trim() ?? "";
  const tgt = target || String(fields.find((f) => blocks.indexOf(f) > blocks.indexOf(src))?.props.name ?? fields.find((f) => f !== src)?.props.name ?? "");
  return { id: `r${Date.now().toString(36)}`, when: { field: String(src.props.name), op: firstOpt ? "equals" : "is-filled", value: firstOpt }, then: { action, target: tgt } };
}

/** What's wrong with a rule, in plain words (empty when it's fine). */
export function ruleProblem(r: FormRule, blocks: B[]): string | null {
  const fields = ruleFields(blocks); const src = fields.find((f) => f.props.name === r.when.field);
  if (!src) return "The field this rule reads was removed. Pick another one.";
  if (needsValue(r.when.op) && !String(r.when.value ?? "").trim()) return "Choose the answer that triggers the rule.";
  const tIdx = r.then.action === "skip-step" ? stepIndex(blocks, r.then.target) : fieldIndex(blocks, r.then.target);
  if (tIdx < 0) return r.then.action === "skip-step" ? "That step no longer exists." : "That field no longer exists.";
  if (r.then.target === r.when.field) return "A field can't depend on its own answer.";
  if (blocks.indexOf(src) > tIdx) return `“${labelOf(fields, r.when.field)}” comes later in the form, so the customer hasn't answered it yet. Move it up or pick an earlier field.`;
  if (["greater-than", "less-than"].includes(r.when.op) && src.type !== "fnumber") return "“More than” and “less than” only work on a Number field.";
  return null;
}

const OPS_FOR = (type?: string): RuleOp[] => type === "fnumber" ? ["equals", "not-equals", "greater-than", "less-than", "is-filled", "is-empty"] : type === "fchoice" ? ["equals", "not-equals", "is-filled", "is-empty"] : ["equals", "not-equals", "is-filled", "is-empty"];
const ACTION_WORD: Record<RuleAction, string> = { show: "Show", hide: "Hide", require: "Require", "skip-step": "Skip" };
const chip = "inline-grid place-items-center rounded px-1.5 h-6 text-[11px] font-semibold uppercase tracking-wide";

/**
 * One rule as a sentence: IF <field> <is> <answer> → THEN <show> <field>. Fixed parts (`fixed`) are shown as
 * text: on a field's own panel the target is that field, so only the condition is left to pick.
 */
export function RuleCard({ r, blocks, editable, onChange, onDelete, fixed }: { r: FormRule; blocks: B[]; editable: boolean; onChange: (r: FormRule) => void; onDelete: () => void; fixed?: "target" }) {
  const fields = ruleFields(blocks); const steps = formSteps(blocks);
  const src = fields.find((f) => f.props.name === r.when.field); const opts = String(src?.props.options ?? "").split("\n").map((x) => x.trim()).filter(Boolean); const needs = needsValue(r.when.op);
  const set = (p: { when?: Partial<FormRule["when"]>; then?: Partial<FormRule["then"]> }) => onChange({ ...r, when: { ...r.when, ...p.when }, then: { ...r.then, ...p.then } });
  const problem = ruleProblem(r, blocks);
  const tIdx = r.then.action === "skip-step" ? stepIndex(blocks, r.then.target) : fieldIndex(blocks, r.then.target);
  const earlier = fields.filter((f) => f.props.name !== r.then.target && (tIdx < 0 || blocks.indexOf(f) < tIdx));
  const sources = src && !earlier.includes(src) ? [...earlier, src] : earlier;
  const targetName = r.then.action === "skip-step" ? `step “${r.then.target}”` : `“${labelOf(fields, r.then.target)}”`;
  return <div className={`border bg-surface text-xs ${problem ? "border-warn" : "border-line"}`}>
    <div className="grid gap-1.5 p-2.5">
      <div className="flex items-center gap-1.5"><span className={`${chip} bg-info-soft text-info`}>If</span><span className="text-ink-3">the customer answers</span>
        {editable && <button type="button" className="ml-auto text-ink-3 hover:text-crit" aria-label="Delete rule" title="Delete rule" onClick={onDelete}><Trash2 className="size-3.5" /></button>}</div>
      <select className={sel} disabled={!editable} value={r.when.field} onChange={(e) => { const f = fields.find((x) => x.props.name === e.target.value); const o = String(f?.props.options ?? "").split("\n")[0]?.trim() ?? ""; set({ when: { field: e.target.value, op: o ? "equals" : "is-filled", value: o } }); }} aria-label="Question">{sources.map((f) => <option key={f.id} value={String(f.props.name)}>{String(f.props.label)}</option>)}</select>
      <div className={`grid gap-1.5 ${needs ? "grid-cols-[auto_1fr]" : ""}`}><select className={sel} disabled={!editable} value={r.when.op} onChange={(e) => set({ when: { op: e.target.value as RuleOp } })} aria-label="Condition">{OPS_FOR(src?.type).map((k) => <option key={k} value={k}>{RULE_OPS[k]}</option>)}</select>
        {needs && (opts.length ? <select className={sel} disabled={!editable} value={r.when.value ?? ""} onChange={(e) => set({ when: { value: e.target.value } })} aria-label="Answer"><option value="">Choose an answer</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>
          : <input className={sel} disabled={!editable} type={src?.type === "fnumber" ? "number" : "text"} value={r.when.value ?? ""} placeholder={src?.type === "fnumber" ? "Amount" : "Answer"} onChange={(e) => set({ when: { value: e.target.value } })} aria-label="Answer" />)}</div>
      <div className="mt-1 flex items-center gap-1.5"><span className={`${chip} bg-good-soft text-good`}>Then</span>
        {fixed === "target" ? <span className="text-ink-2"><b>{ACTION_WORD[r.then.action].toLowerCase()}</b> {r.then.action === "skip-step" ? "this step" : "this field"}</span> : null}</div>
      {fixed === "target" ? <div className="flex flex-wrap gap-1">{(r.then.action === "skip-step" ? ["skip-step"] as RuleAction[] : ["show", "hide", "require"] as RuleAction[]).map((a) => <button key={a} type="button" disabled={!editable} className={`bdl-chip ${r.then.action === a ? "bdl-chip-active" : ""}`} onClick={() => set({ then: { action: a } })}>{RULE_ACTIONS[a]}</button>)}</div>
      : <div className="grid gap-1.5"><select className={sel} disabled={!editable} value={r.then.action} onChange={(e) => { const a = e.target.value as RuleAction; const n = a === "skip-step" ? steps.find((s) => stepIndex(blocks, s) > blocks.indexOf(src!)) ?? steps[0] ?? "" : (r.then.action === "skip-step" ? String(fields.find((f) => blocks.indexOf(f) > blocks.indexOf(src!))?.props.name ?? "") : r.then.target); set({ then: { action: a, target: n } }); }} aria-label="Action">{Object.entries(RULE_ACTIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select className={sel} disabled={!editable} value={r.then.target} onChange={(e) => set({ then: { target: e.target.value } })} aria-label="Target">{r.then.action === "skip-step" ? steps.map((s) => <option key={s} value={s}>{s}</option>) : fields.filter((f) => f.props.name !== r.when.field).map((f) => <option key={f.id} value={String(f.props.name)}>{String(f.props.label)}</option>)}</select></div>}
    </div>
    <div className={`border-t px-2.5 py-1.5 ${problem ? "border-warn bg-warn-soft text-warn" : "border-line bg-surface-2 text-ink-2"}`}>{problem ?? <>{ACTION_WORD[r.then.action]} {targetName} when {whenText(r, fields)}.</>}</div>
  </div>;
}

/**
 * Rules with an "Add rule" menu that starts from what the person wants (show / hide / require / skip),
 * not from an empty rule. `only` narrows the list (one field or step); `seed` fixes the target there.
 */
export function RuleList({ rules, putRules, blocks, editable, only, seed, empty }: {
  rules: FormRule[]; putRules: (r: FormRule[]) => void; blocks: B[]; editable: boolean;
  only?: (r: FormRule) => boolean; seed?: { target?: string; step?: string }; empty?: string;
}) {
  const [menu, setMenu] = useState(false); const [fresh, setFresh] = useState<string | null>(null);
  const fields = ruleFields(blocks); const shown = only ? rules.filter(only) : rules;
  const intents = RULE_INTENTS.filter((i) => seed?.step ? i.action === "skip-step" : seed?.target ? i.action !== "skip-step" : i.action !== "skip-step" || formSteps(blocks).length > 1);
  const add = (a: RuleAction) => { const n = newRule(blocks, a, seed); setMenu(false); if (n) { setFresh(n.id); putRules([...rules, n]); } };
  const fixed = seed?.target || seed?.step ? "target" as const : undefined;
  return <div className="grid gap-2">
    {!shown.length && empty && <p className="text-xs text-ink-3">{empty}</p>}
    {shown.map((r) => <div key={r.id} className={fresh === r.id ? "ring-2 ring-info/40" : ""}><RuleCard r={r} blocks={blocks} editable={editable} fixed={fixed && r.then.target === (seed?.target ?? seed?.step) ? fixed : undefined} onChange={(n) => putRules(rules.map((x) => (x.id === r.id ? n : x)))} onDelete={() => putRules(rules.filter((x) => x.id !== r.id))} /></div>)}
    {editable && fields.length > 1 && (intents.length === 1 ? <button type="button" className="btn btn-sm btn-secondary justify-center" onClick={() => add(intents[0].action)}><Plus className="size-3.5" aria-hidden />{intents[0].label.replace("a step", "this step")}</button>
      : !menu ? <button type="button" className="btn btn-sm btn-secondary justify-center" onClick={() => setMenu(true)} aria-expanded={false}><Plus className="size-3.5" aria-hidden />Add rule</button>
      : <div className="border border-line bg-surface" role="menu" aria-label="What should the rule do?">
          <div className="flex items-center px-2.5 py-1.5 text-xs font-semibold border-b border-line">What should the rule do?<button type="button" className="ml-auto text-ink-3 hover:text-ink" onClick={() => setMenu(false)} aria-label="Cancel">Cancel</button></div>
          {intents.map((i) => <button key={i.action} type="button" role="menuitem" className="flex w-full items-start gap-2 px-2.5 py-2 text-left hover:bg-surface-3" onClick={() => add(i.action)}><i.icon className="size-4 mt-0.5 text-ink-3 shrink-0" aria-hidden /><span><span className="block text-xs font-medium">{seed?.target ? i.label.replace("a field", "this field") : i.label}</span><span className="block text-[11px] text-ink-3">{i.hint}</span></span></button>)}
        </div>)}
  </div>;
}
