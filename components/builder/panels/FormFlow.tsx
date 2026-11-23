"use client";
import { ArrowRight, Check, CircleAlert, ClipboardCheck, FileText, Pencil, Plus, Send, Zap } from "lucide-react";
import { PanelSection } from "./PanelSection";
import { BLOCK_BY_TYPE } from "@/lib/blocks/registry";
import { AFTER_SUBMIT, BEFORE_SUBMIT, FIELD_TYPES } from "@/lib/forms/model";
import { RuleList, effectText, ruleFields, rulesOn, type FormFlowState, type FormView } from "@/components/forms/rules";

/**
 * A form is a set of pages: one per step, then the Submit page (summary, submit button and the
 * integrations around it), then the Success or Failure page. This file has the Steps & pages tab
 * of the builder's left panel and the pieces the canvas draws around the components.
 */
type B = { id: string; type: string; props: Record<string, unknown> };
const s = (v: unknown) => String(v ?? "");

/** The step each block belongs to (blocks before the first Step belong to step 0). */
export function stepIndexes(blocks: B[]) { let k = -1; return blocks.map((b) => { if (b.type === "formstep") k++; return Math.max(k, 0); }); }
export function stepsOf(blocks: B[]) { const st = blocks.filter((b) => b.type === "formstep"); return st.length ? st : []; }
/** Which form page shows this block. */
export function viewOfBlock(blocks: B[], id: string): FormView | null {
  const i = blocks.findIndex((b) => b.id === id); if (i < 0) return null; const t = blocks[i].type;
  if (t === "fsuccess") return { page: "success" }; if (t === "ffailure") return { page: "failure" };
  return { page: "step", step: stepIndexes(blocks)[i] };
}
/** Whether the canvas hides a block on the current form page. */
export function hiddenOnView(blocks: B[], i: number, view: FormView, layout: "wizard" | "single") {
  const t = blocks[i].type;
  if (view.page === "success") return t !== "fsuccess";
  if (view.page === "failure") return t !== "ffailure";
  if (view.page !== "step") return true;
  if (t === "fsuccess" || t === "ffailure") return true;
  return layout === "wizard" && stepIndexes(blocks)[i] !== view.step;
}
const sameView = (a: FormView, b: FormView) => a.page === "step" ? b.page === "step" && a.step === b.step : a.page === b.page;

/* ---------------- canvas ---------------- */

/** Above the canvas: every page of the form, to jump straight to one. Builder-only. */
export function FormPageSwitch({ blocks, view, layout, onView }: { blocks: B[]; view: FormView; layout: "wizard" | "single"; onView: (v: FormView) => void }) {
  const steps = stepsOf(blocks); const btn = (on: boolean) => `inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-3"}`;
  return <div data-ui className="sticky top-0 z-30 mx-auto mb-4 flex w-fit max-w-full items-center gap-0.5 overflow-x-auto border border-line bg-surface p-1 shadow-sm" role="tablist" aria-label="Form pages" onClick={(e) => e.stopPropagation()}>
    {layout === "single" || steps.length <= 1
      ? <button type="button" role="tab" aria-selected={view.page === "step"} className={btn(view.page === "step")} onClick={() => onView({ page: "step", step: 0 })}><FileText className="size-3.5" aria-hidden />Form</button>
      : steps.map((st, i) => <button key={st.id} type="button" role="tab" aria-selected={view.page === "step" && view.step === i} className={btn(view.page === "step" && view.step === i)} onClick={() => onView({ page: "step", step: i })}><span className="tabular-nums">{i + 1}</span><span className="max-w-[9rem] truncate">{s(st.props.title) || "Untitled step"}</span></button>)}
    <span className="mx-1 h-4 w-px bg-line-2" aria-hidden />
    <button type="button" role="tab" aria-selected={view.page === "submit"} className={btn(view.page === "submit")} onClick={() => onView({ page: "submit" })}><ClipboardCheck className="size-3.5" aria-hidden />Submit page</button>
    <button type="button" role="tab" aria-selected={view.page === "success"} className={btn(view.page === "success")} onClick={() => onView({ page: "success" })}><Check className="size-3.5" aria-hidden />Success</button>
    <button type="button" role="tab" aria-selected={view.page === "failure"} className={btn(view.page === "failure")} onClick={() => onView({ page: "failure" })}><CircleAlert className="size-3.5" aria-hidden />Failure</button>
  </div>;
}

/** The progress bar customers see at the top of a step-by-step form. Clickable in the builder. */
export function FormProgress({ blocks, view, onView }: { blocks: B[]; view: FormView; onView: (v: FormView) => void }) {
  const steps = stepsOf(blocks); if (steps.length < 1) return null;
  const cur = view.page === "step" ? view.step : steps.length;
  const items = [...steps.map((st) => s(st.props.title) || "Untitled step"), "Check and send"];
  return <ol className="f-prog" aria-label="Progress">{items.map((t, i) => <li key={i} className={i < cur ? "done" : i === cur ? "cur" : ""}>
    <button type="button" onClick={(e) => { e.stopPropagation(); onView(i < steps.length ? { page: "step", step: i } : { page: "submit" }); }}><span className="n">{i < cur ? "✓" : i + 1}</span><span className="t">{t}</span></button></li>)}</ol>;
}

/** Back / Next at the bottom of a step. Clicking moves between pages; the pencil edits the labels. */
export function FormNav({ blocks, view, layout, onView, onEdit, preview }: { blocks: B[]; view: FormView; layout: "wizard" | "single"; onView: (v: FormView) => void; onEdit: (stepId: string) => void; preview: boolean }) {
  const steps = stepsOf(blocks); if (view.page !== "step") return null;
  const i = layout === "single" ? steps.length - 1 : view.step; const st = steps[Math.max(i, 0)]; const last = layout === "single" || i >= steps.length - 1;
  const next = s(st?.props.next) || "Continue"; const back = s(st?.props.back) || "Back";
  return <div className="f-nav">
    {layout === "wizard" && i > 0 ? <button type="button" className="f-btn sec" onClick={(e) => { e.stopPropagation(); onView({ page: "step", step: i - 1 }); }}>{back}</button> : <span />}
    <button type="button" className="f-btn" onClick={(e) => { e.stopPropagation(); onView(last ? { page: "submit" } : { page: "step", step: i + 1 }); }}>{next}</button>
    {!preview && st && <button type="button" data-ui className="f-edit" title="Edit the button labels" onClick={(e) => { e.stopPropagation(); onEdit(st.id); }}><Pencil className="size-3" aria-hidden />Edit buttons</button>}
  </div>;
}

/** The Submit page: the answers to check, the submit button, and (builder-only) what runs around the submit. */
export function SubmitPageView({ blocks, flow, onView, onEdit, preview }: { blocks: B[]; flow: FormFlowState; onView: (v: FormView) => void; onEdit: () => void; preview: boolean }) {
  const sp = flow.submitPage; const idx = stepIndexes(blocks); const steps = stepsOf(blocks);
  const fields = blocks.map((b, i) => ({ b, i })).filter(({ b }) => FIELD_TYPES.includes(b.type) && b.type !== "fconsent");
  const groups = (steps.length ? steps.map((st, k) => ({ title: s(st.props.title), k })) : [{ title: "Your answers", k: 0 }]).map((g) => ({ ...g, items: fields.filter((f) => idx[f.i] === g.k) })).filter((g) => g.items.length);
  const consents = blocks.filter((b) => b.type === "fconsent");
  return <div className="f-submit" onClick={(e) => { if (!preview) { e.stopPropagation(); onEdit(); } }}>
    {!preview && <span data-ui className="f-edit top"><Pencil className="size-3" aria-hidden />Click to edit the Submit page</span>}
    <div className="f-step"><span className="bar" /><h2>{sp.heading}</h2></div>
    {sp.intro && <p className="f-help">{sp.intro}</p>}
    {sp.summary && groups.map((g) => <div key={g.k} className="f-sum"><div className="h"><b>{g.title}</b><button type="button" onClick={(e) => { e.stopPropagation(); onView({ page: "step", step: g.k }); }}>Change</button></div>
      <dl>{g.items.map(({ b }) => <div key={b.id}><dt>{s(b.props.label)}</dt><dd>{b.type === "ffile" ? "document.pdf" : b.type === "fdate" ? "12 / 03 / 1986" : b.type === "fchoice" ? s(b.props.options).split("\n")[0] : `{${s(b.props.name)}}`}</dd></div>)}</dl></div>)}
    {consents.length > 0 && <p className="f-help">You agreed to: {consents.map((c) => s(c.props.consent)).join(", ")}.</p>}
    <div className="f-nav">
      <button type="button" className="f-btn sec" onClick={(e) => { e.stopPropagation(); onView({ page: "step", step: Math.max(steps.length - 1, 0) }); }}>Back</button>
      <button type="button" className="f-btn" onClick={(e) => { e.stopPropagation(); onView({ page: "success" }); }}><Send className="size-3.5" aria-hidden />{sp.button || "Submit"}</button>
    </div>
    {!preview && <div data-ui className="f-integr">
      <div><b>Before sending</b>{sp.before.length ? sp.before.map((id) => <span key={id}>{BEFORE_SUBMIT[id]?.name ?? id}</span>) : <i>Nothing</i>}</div>
      <div><b>On submit</b><span>Send to the Forms solution</span></div>
      <div><b>After sending</b>{sp.after.length ? sp.after.map((id) => <span key={id}>{AFTER_SUBMIT[id]?.name ?? id}</span>) : <i>Nothing</i>}</div>
      <small>If a check fails the customer sees the Failure page.</small>
    </div>}
  </div>;
}

/** Above a field or step on the canvas: the rules that change it. */
export function RuleChips({ b, flow, blocks }: { b: B; flow: FormFlowState; blocks: B[] }) {
  const list = rulesOn(b, flow.rules); if (!list.length) return null; const fields = ruleFields(blocks);
  return <div data-ui className="f-rules">{list.map((r) => <span key={r.id} className="f-rule"><Zap className="size-3" aria-hidden />{effectText(r, fields)}</span>)}</div>;
}

/* ---------------- left panel: Steps & pages ---------------- */

export function FormFlowPanel({ blocks, view, onView, flow, editable, sel, onSelect, onAddStep, onEditSubmit }: {
  blocks: B[]; view: FormView; onView: (v: FormView) => void; flow: FormFlowState; editable: boolean; sel: string | null;
  onSelect: (id: string) => void; onAddStep: () => void; onEditSubmit: () => void;
}) {
  const steps = stepsOf(blocks); const idx = stepIndexes(blocks); const fields = ruleFields(blocks);
  const row = (on: boolean) => `flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-surface-2 ${on ? "bg-brand-soft text-ink shadow-[inset_2px_0_0_var(--color-brand,currentColor)]" : "text-ink-2"}`;
  const skipRules = (title: string) => flow.rules.filter((r) => r.then.action === "skip-step" && r.then.target === title);
  const success = blocks.find((b) => b.type === "fsuccess"); const failure = blocks.find((b) => b.type === "ffailure");
  return <div className="min-h-0 flex-1 overflow-auto">
    <PanelSection id="ff-layout" title="Layout">
      <div className="grid grid-cols-2 gap-1.5 px-3 pb-3" role="radiogroup" aria-label="Layout">{([["wizard", "Step by step"], ["single", "One page"]] as const).map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={flow.layout === k} disabled={!editable} onClick={() => flow.putLayout(k)} className={`border px-2 py-1.5 text-xs ${flow.layout === k ? "border-ink bg-ink text-white" : "border-line-2 hover:bg-surface-3"}`}>{l}</button>)}</div>
    </PanelSection>
    <PanelSection id="ff-pages" title="Pages" count={(flow.layout === "wizard" ? Math.max(steps.length, 1) : 1) + 3}>
      <ul className="m-0 list-none p-0 pb-2">
        {(flow.layout === "wizard" && steps.length ? steps : [null]).map((st, k) => { const on = view.page === "step" && (flow.layout === "single" || view.step === k); const mine = blocks.filter((b, i) => idx[i] === k && FIELD_TYPES.includes(b.type));
          const title = st ? s(st.props.title) || "Untitled step" : "Form"; const skips = st ? skipRules(s(st.props.title)) : [];
          return <li key={st?.id ?? "form"} className="m-0 p-0">
            <button type="button" className={row(on)} onClick={() => { onView({ page: "step", step: k }); if (st) onSelect(st.id); }}>
              <span className="grid size-5 shrink-0 place-items-center border border-line-2 text-[11px] tabular-nums">{st ? k + 1 : <FileText className="size-3" aria-hidden />}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{title}</span><span className="text-[11px] text-ink-3">{mine.length} field{mine.length === 1 ? "" : "s"}</span></button>
            {on && <ul className="m-0 list-none border-s border-line-2 py-0.5 ps-0 ms-5">{blocks.map((b, i) => ({ b, i })).filter(({ b, i }) => (flow.layout === "single" || idx[i] === k) && b.type !== "formstep" && b.type !== "fsuccess" && b.type !== "ffailure").map(({ b }) => { const n = rulesOn(b, flow.rules).length;
              return <li key={b.id}><button type="button" className={`${row(sel === b.id)} !py-1 !text-xs`} onClick={() => onSelect(b.id)}><span className="min-w-0 flex-1 truncate">{s(b.props.label) || s(b.props.consent) || BLOCK_BY_TYPE[b.type]?.name}</span>{n > 0 && <Zap className="size-3 text-warn" aria-label={`${n} rule${n === 1 ? "" : "s"}`} />}</button></li>; })}</ul>}
            {skips.map((r) => <div key={r.id} className="ms-5 flex items-center gap-1 px-3 py-0.5 text-[11px] text-warn"><Zap className="size-3" aria-hidden />{effectText(r, fields)}</div>)}
            {st && flow.layout === "wizard" && <div aria-hidden className="ms-5 flex items-center gap-1 px-3 text-[10px] text-ink-4"><ArrowRight className="size-3" />{s(st.props.next) || "Continue"}</div>}
          </li>; })}
        {editable && flow.layout === "wizard" && <li className="px-3 py-1.5"><button type="button" className="btn btn-sm btn-secondary w-full justify-center" onClick={onAddStep}><Plus className="size-3.5" aria-hidden />Add step</button></li>}
        <li className="m-0 mt-1 border-t border-line p-0 pt-1"><button type="button" className={row(view.page === "submit")} onClick={() => { onView({ page: "submit" }); onEditSubmit(); }}><ClipboardCheck className="size-4 shrink-0 text-ink-3" aria-hidden /><span className="min-w-0 flex-1 truncate font-medium">Submit page</span><span className="text-[11px] text-ink-3">{(() => { const n = flow.submitPage.before.length + flow.submitPage.after.length; return `${n} integration${n === 1 ? "" : "s"}`; })()}</span></button></li>
        <li className="m-0 p-0"><button type="button" className={row(sameView(view, { page: "success" }))} onClick={() => { onView({ page: "success" }); if (success) onSelect(success.id); }}><Check className="size-4 shrink-0 text-good" aria-hidden /><span className="min-w-0 flex-1 truncate font-medium">Success page</span></button></li>
        <li className="m-0 p-0"><button type="button" className={row(sameView(view, { page: "failure" }))} onClick={() => { onView({ page: "failure" }); if (failure) onSelect(failure.id); }}><CircleAlert className="size-4 shrink-0 text-crit" aria-hidden /><span className="min-w-0 flex-1 truncate font-medium">Failure page</span></button></li>
      </ul>
    </PanelSection>
    <PanelSection id="ff-rules" title="Rules" count={flow.rules.length}>
      <div className="grid gap-2 px-3 pb-3">
        <p className="text-xs text-ink-3">Between fields (show, hide, require) and between pages (skip a step).</p>
        <RuleList rules={flow.rules} putRules={flow.putRules} blocks={blocks} editable={editable} />
      </div>
    </PanelSection>
  </div>;
}
