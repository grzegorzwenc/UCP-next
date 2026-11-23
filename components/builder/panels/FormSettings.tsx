"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { PanelSection } from "./PanelSection";
import { repoApi } from "@/lib/api";
import { errorText } from "@/lib/api/errors";
import { AFTER_SUBMIT, BEFORE_SUBMIT, FIELD_TYPES, RETENTION, SUBMIT_ACTIONS, formChecks, formSubmit, type FormSubmit } from "@/lib/forms/model";
import { type FormFlowState } from "@/components/forms/rules";
import { FormContract } from "@/components/forms/FormContract";

type B = { id: string; type: string; props: Record<string, unknown> };
const sel = "bdl-field mt-1";
const S = ({ t, open = true, children }: { t: string; open?: boolean; children: React.ReactNode }) => <PanelSection id={`fs-${t.toLowerCase().replace(/\W+/g, "-")}`} title={t} defaultOpen={open}><div className="flex flex-col gap-3">{children}</div></PanelSection>;

/**
 * The builder's right-hand settings panel for a form (in place of Page settings): where the form lives,
 * its flow and steps, rules, what happens on submit, and the checks a reviewer will look at.
 * Rules, submit action and layout are saved on the form's jcr:content straight away.
 */
export function FormSettings({ marketId, base, path, meta, blocks, host, editable, status, title, flow }: {
  flow: FormFlowState;
  marketId: string; base: string; path: string; meta?: Record<string, unknown>; blocks: B[]; host?: { path: string; title: string; rel: string }; editable: boolean; status: string; title: string;
}) {
  const { rules, submitPage: sp, putSubmitPage } = flow;
  const [submit, setSubmit] = useState<FormSubmit>(() => formSubmit(meta));
  const [saved, setSaved] = useState<string | null>(null); const [contract, setContract] = useState(false);
  const fields = useMemo(() => blocks.filter((b) => FIELD_TYPES.includes(b.type) && b.type !== "fconsent" && String(b.props.name ?? "")), [blocks]);
  const checks = formChecks(blocks, rules, submit);

  async function persist(p: Record<string, unknown>) { try { await repoApi.setProps(`${path}/jcr:content`, p, { text: `changed the settings of form ${title}`, target: path }); setSaved("Saved"); } catch (e) { setSaved(errorText(e)); } setTimeout(() => setSaved(null), 1800); }
  const putSubmit = (s: FormSubmit) => { setSubmit(s); void persist({ "ucp:formSubmit": JSON.stringify(s) }); };
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
    <p className="mx-3.5 my-2 text-xs text-ink-3">Steps, pages, layout and rules are in <b>Steps &amp; pages</b> on the left.</p>
    <S t="Submit page">
      <p className="text-xs text-ink-3">The last page before sending: customers check their answers and press the button. Integrations run around the submit.</p>
      <label className="text-xs text-ink-2 font-medium">Heading<input className={sel} disabled={!editable} value={sp.heading} onChange={(e) => putSubmitPage({ ...sp, heading: e.target.value })} /></label>
      <label className="text-xs text-ink-2 font-medium">Text<textarea rows={2} className={sel} disabled={!editable} value={sp.intro} onChange={(e) => putSubmitPage({ ...sp, intro: e.target.value })} /></label>
      <label className="text-xs text-ink-2 font-medium">Submit button<input className={sel} disabled={!editable} value={sp.button} onChange={(e) => putSubmitPage({ ...sp, button: e.target.value })} /></label>
      <label className="flex items-center gap-2 text-xs text-ink-2"><input type="checkbox" className="bdl-checkbox bdl-checkbox-sm" disabled={!editable} checked={sp.summary} onChange={(e) => putSubmitPage({ ...sp, summary: e.target.checked })} />Show a summary of the answers</label>
      <div className="text-xs text-ink-2 font-medium">Before sending<small className="block text-ink-3 font-normal">Run in this order when the customer presses {sp.button || "Submit"}. If one fails, the Failure page shows.</small></div>
      <div className="grid gap-1">{Object.entries(BEFORE_SUBMIT).map(([k, v]) => <label key={k} className="flex items-start gap-2 text-xs"><input type="checkbox" className="bdl-checkbox bdl-checkbox-sm mt-0.5" disabled={!editable} checked={sp.before.includes(k)} onChange={(e) => putSubmitPage({ ...sp, before: e.target.checked ? [...sp.before, k] : sp.before.filter((x) => x !== k) })} /><span><b className="font-medium">{v.name}</b><small className="block text-ink-3">{v.desc}</small></span></label>)}</div>
      <div className="text-xs text-ink-2 font-medium">After sending</div>
      <div className="grid gap-1">{Object.entries(AFTER_SUBMIT).map(([k, v]) => <label key={k} className="flex items-start gap-2 text-xs"><input type="checkbox" className="bdl-checkbox bdl-checkbox-sm mt-0.5" disabled={!editable} checked={sp.after.includes(k)} onChange={(e) => putSubmitPage({ ...sp, after: e.target.checked ? [...sp.after, k] : sp.after.filter((x) => x !== k) })} /><span><b className="font-medium">{v.name}</b><small className="block text-ink-3">{v.desc}</small></span></label>)}</div>
      {sp.after.some((x) => x.startsWith("confirm-")) && <label className="text-xs text-ink-2 font-medium">Confirmation message<input className={`${sel} font-mono`} disabled={!editable} placeholder="service/application-received" value={sp.confirmMessage} onChange={(e) => putSubmitPage({ ...sp, confirmMessage: e.target.value })} /><small className="block text-ink-3 font-normal mt-1">Its path under Messaging. MDP sends it with the case reference.</small></label>}
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
