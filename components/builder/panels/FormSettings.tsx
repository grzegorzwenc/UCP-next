"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { PanelSection } from "./PanelSection";
import { FIELD_TYPES, RETENTION, SUBMIT_ACTIONS, formChecks, submitEndpoint } from "@/lib/forms/model";
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
export function FormSettings({ marketId, base, path, blocks, host, editable, status, title, flow }: {
  flow: FormFlowState;
  marketId: string; base: string; path: string; meta?: Record<string, unknown>; blocks: B[]; host?: { path: string; title: string; rel: string }; editable: boolean; status: string; title: string;
}) {
  const { rules, submitPage: sp, putSubmitPage, submit, putSubmit } = flow;
  const [contract, setContract] = useState(false);
  const fields = useMemo(() => blocks.filter((b) => FIELD_TYPES.includes(b.type) && b.type !== "fconsent" && String(b.props.name ?? "")), [blocks]);
  const checks = formChecks(blocks, rules, submit);

  const act = SUBMIT_ACTIONS[submit.action]; const custom = submit.action === "custom"; const url = submitEndpoint(submit); const urlOk = /^https:\/\/\S+$/.test(url);

  return <div className="flex flex-col">
    <S t="Location">
      <div className="text-xs text-ink-2 font-medium">Shown on page</div>
      {host ? <div className="border border-line bg-surface-2 px-3 py-2 text-sm"><b className="block">{host.title}</b><span className="text-xs text-ink-3 break-all">{host.rel}</span>
        <Link href={`${base}/page${host.rel}`} className="mt-1.5 inline-flex items-center gap-1 text-xs underline">Open the page<ExternalLink className="size-3" aria-hidden /></Link></div>
        : <p className="text-xs text-crit">No host page. Every form must be placed on a page.</p>}
      <p className="text-xs text-ink-3">The page shows the form with its Form component. A page cannot go live with a form that is not published.</p>
    </S>
    <p className="mx-3.5 my-2 text-xs text-ink-3">Steps, layout and rules are in <b>Steps</b> on the left.</p>
    <S t="Submit page">
      <p className="text-xs text-ink-3">The last page before sending: customers check their answers and press the Submit button.</p>
      <label className="text-xs text-ink-2 font-medium">Heading<input className={sel} disabled={!editable} value={sp.heading} onChange={(e) => putSubmitPage({ ...sp, heading: e.target.value })} /></label>
      <label className="text-xs text-ink-2 font-medium">Text<textarea rows={2} className={sel} disabled={!editable} value={sp.intro} onChange={(e) => putSubmitPage({ ...sp, intro: e.target.value })} /></label>
      <label className="flex items-center gap-2 text-xs text-ink-2"><input type="checkbox" className="bdl-checkbox bdl-checkbox-sm" disabled={!editable} checked={sp.summary} onChange={(e) => putSubmitPage({ ...sp, summary: e.target.checked })} />Show a summary of the answers</label>
    </S>
    <div id="fs-submit-button"><S t="Submit button">
      <p className="text-xs text-ink-3">The only place a form talks to a system: pressing it sends the answers to the endpoint below. If the call fails, the customer sees the Failure page.</p>
      <label className="text-xs text-ink-2 font-medium">Button label<input className={sel} disabled={!editable} value={sp.button} onChange={(e) => putSubmitPage({ ...sp, button: e.target.value })} /></label>
      <label className="text-xs text-ink-2 font-medium">Integration<select className={sel} disabled={!editable} value={submit.action} onChange={(e) => putSubmit({ action: e.target.value, mapping: {}, retention: submit.retention })}>{Object.entries(SUBMIT_ACTIONS).map(([k, a]) => <option key={k} value={k}>{a.name}</option>)}</select><small className="block text-ink-3 font-normal mt-1">{act?.desc}</small></label>
      <div className="text-xs text-ink-2 font-medium">Endpoint
        <div className="mt-1 flex items-stretch"><span className="grid place-items-center border border-r-0 border-line bg-surface-2 px-2 font-mono text-[11px] text-ink-2">POST</span>
          <input className={`bdl-field flex-1 font-mono text-[11px] ${url && !urlOk ? "!border-crit" : ""}`} disabled={!editable} placeholder={act?.endpoint || "https://…"} value={submit.endpoint ?? (custom ? "" : act?.endpoint ?? "")} onChange={(e) => putSubmit({ ...submit, endpoint: e.target.value.trim() })} aria-label="Endpoint URL" /></div>
        <small className={`block font-normal mt-1 ${url && !urlOk ? "text-crit" : "text-ink-3"}`}>{url && !urlOk ? "Use a full https:// address." : !editable ? "Read-only: the form is in review or published. Move it back to draft to change it." : "Where the button POSTs the answers. It must be registered with the Forms solution before the form goes live."}
          {editable && !custom && submit.endpoint && submit.endpoint !== act?.endpoint && <button type="button" className="ml-1 underline" onClick={() => { const { endpoint: _e, ...rest } = submit; void _e; putSubmit(rest); }}>Use the registered one</button>}</small></div>
      {fields.length > 0 && <div className="grid gap-1.5"><div className="text-xs text-ink-2 font-medium">What is sent<small className="block text-ink-3 font-normal">Each answer and the name it is sent under.{act?.required.length ? " * required by the integration." : ""}</small></div>{fields.map((f) => { const k = String(f.props.name); return <label key={f.id} className="grid grid-cols-[1fr_1fr] items-center gap-2 text-xs"><span className="truncate" title={k}>{String(f.props.label)}</span>
        {custom ? <input className="bdl-field font-mono" disabled={!editable} placeholder="not sent" value={submit.mapping[k] ?? ""} onChange={(e) => { const m = { ...submit.mapping }; if (e.target.value) m[k] = e.target.value; else delete m[k]; putSubmit({ ...submit, mapping: m }); }} />
          : <select className="bdl-field" disabled={!editable} value={submit.mapping[k] ?? ""} onChange={(e) => { const m = { ...submit.mapping }; if (e.target.value) m[k] = e.target.value; else delete m[k]; putSubmit({ ...submit, mapping: m }); }}><option value="">Not sent</option>{act?.target.map((t) => <option key={t} value={t}>{t}{act.required.includes(t) ? " *" : ""}</option>)}</select>}</label>; })}</div>}
      <label className="text-xs text-ink-2 font-medium">Data retention<select className={sel} disabled={!editable} value={submit.retention} onChange={(e) => putSubmit({ ...submit, retention: e.target.value })}>{Object.entries(RETENTION).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <p className="text-xs text-ink-3">Answers go from the customer’s browser through the Forms solution to the endpoint. UCP never stores customer data.</p>
    </S></div>
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
