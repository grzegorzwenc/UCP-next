/**
 * Forms (Feature 3). A form is built in the page builder from Forms repository components, for the page that
 * hosts it (meta `ucp:hostPage`), and goes through the page workflow. Rules, the submit action and the layout
 * live on the form's jcr:content (`ucp:formRules`, `ucp:formSubmit`, `ucp:formLayout`) and are edited in the
 * builder's Form settings panel. The published form is served to the Forms solution as AEM Forms core
 * components JSON (/api/delivery/v1/forms/<id>); submissions go to the Forms solution, never to UCP. Client-safe.
 */
export type RuleOp = "equals" | "not-equals" | "is-filled" | "is-empty" | "greater-than" | "less-than";
export type RuleAction = "show" | "hide" | "require" | "skip-step";
export type FormRule = { id: string; when: { field: string; op: RuleOp; value?: string }; then: { action: RuleAction; target: string } };
export type FormSubmit = { action: string; mapping: Record<string, string>; retention: string };
export const RULE_OPS: Record<RuleOp, string> = { equals: "is", "not-equals": "is not", "is-filled": "is filled in", "is-empty": "is empty", "greater-than": "is more than", "less-than": "is less than" };
export const RULE_ACTIONS: Record<RuleAction, string> = { show: "Show", hide: "Hide", require: "Make required", "skip-step": "Skip step" };

/** Submit actions offered by the Forms solution for the market (story 3.3.2) and the target fields each one takes. */
export const SUBMIT_ACTIONS: Record<string, { name: string; desc: string; target: string[]; required: string[] }> = {
  "crm-lead": { name: "CRM lead", desc: "Creates a lead in the market CRM", target: ["firstName", "lastName", "fullName", "email", "phone", "product", "notes"], required: ["email"] },
  "case-queue": { name: "Case queue", desc: "Opens a case in the servicing queue", target: ["customerName", "email", "topic", "description", "attachment"], required: ["customerName", "topic"] },
  application: { name: "Application service", desc: "Starts an application in the origination system", target: ["fullName", "dateOfBirth", "email", "phone", "employment", "employer", "income", "documents"], required: ["fullName", "dateOfBirth", "email"] },
  "email-inbox": { name: "E-mail inbox", desc: "Sends the answers to a team mailbox", target: ["subject", "body"], required: [] },
};
export const RETENTION: Record<string, string> = { "lead-12m": "Leads – kept 12 months", "contact-6m": "Contact requests – kept 6 months", "application-7y": "Applications – kept 7 years" };
export const DEFAULT_SUBMIT: FormSubmit = { action: "crm-lead", mapping: {}, retention: "lead-12m" };

/** UCP form component → AEM Forms core component (epic 3.4: one-to-one, so the Forms solution renders the definition as is). */
export const AEM: Record<string, string> = {
  formstep: "core/fd/components/form/panelcontainer/v1/panelcontainer", ftext: "core/fd/components/form/textinput/v1/textinput", femail: "core/fd/components/form/emailinput/v1/emailinput",
  fphone: "core/fd/components/form/telephoneinput/v1/telephoneinput", fnumber: "core/fd/components/form/numberinput/v1/numberinput", fdate: "core/fd/components/form/datepicker/v1/datepicker",
  fchoice: "core/fd/components/form/dropdown/v1/dropdown", ffile: "core/fd/components/form/fileinput/v1/fileinput", fconsent: "core/fd/components/form/termsandconditions/v1/termsandconditions",
  finfo: "core/fd/components/form/text/v1/text",
};
export const FIELD_TYPES = ["ftext", "femail", "fphone", "fnumber", "fdate", "fchoice", "ffile", "fconsent"];
export const CONSENT_VERSION: Record<string, string> = { "Privacy notice": "v4", "Marketing preferences": "v2", "Credit search": "v3" };

type Comp = { resourceType: string; props: Record<string, unknown> };
const typeOf = (c: Comp) => c.resourceType.split("/").pop() ?? "";
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const plain = (v: unknown) => str(v).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
const parse = <T,>(v: unknown, d: T): T => { if (typeof v !== "string" || !v) return d; try { return JSON.parse(v) as T; } catch { return d; } };
export const formRules = (meta?: Record<string, unknown>) => parse<FormRule[]>(meta?.["ucp:formRules"], []);
export const formSubmit = (meta?: Record<string, unknown>) => parse<FormSubmit>(meta?.["ucp:formSubmit"], DEFAULT_SUBMIT);

/** The page before sending: a summary of the answers, the submit button, and what runs around the submit. */
export type SubmitPage = { heading: string; intro: string; button: string; summary: boolean; before: string[]; after: string[]; confirmMessage: string };
export const DEFAULT_SUBMIT_PAGE: SubmitPage = { heading: "Check your answers", intro: "Check your answers before you send them. You can change anything you need to.", button: "Submit", summary: true, before: ["bot-check"], after: [], confirmMessage: "" };
export const formSubmitPage = (meta?: Record<string, unknown>) => ({ ...DEFAULT_SUBMIT_PAGE, ...parse<Partial<SubmitPage>>(meta?.["ucp:formSubmitPage"], {}) });
/** Integrations the Forms solution can run when the customer presses Submit, before the answers are sent on. A failure shows the Failure page. */
export const BEFORE_SUBMIT: Record<string, { name: string; desc: string }> = {
  "bot-check": { name: "Bot check", desc: "reCAPTCHA Enterprise score; blocks automated submissions" },
  "address-lookup": { name: "Address validation", desc: "Checks the address against the postcode file (Loqate)" },
  "fraud-screening": { name: "Fraud screening", desc: "Device and behaviour risk score (ThreatMetrix)" },
  "sanctions": { name: "Sanctions and PEP screening", desc: "Name and date of birth against the sanctions lists" },
  "eligibility": { name: "Eligibility check", desc: "Calls the product eligibility API; ineligible answers go to the Failure page" },
  "duplicate": { name: "Duplicate check", desc: "Stops a second application from the same customer within 24 hours" },
};
/** What runs after a successful submit. */
export const AFTER_SUBMIT: Record<string, { name: string; desc: string }> = {
  "confirm-email": { name: "Confirmation e-mail", desc: "Sent by MDP using a message from Messaging" },
  "confirm-sms": { name: "Confirmation SMS", desc: "Sent by MDP using a message from Messaging" },
  "documents": { name: "Store uploaded documents", desc: "Files go to the document store with the case reference" },
  "analytics": { name: "Conversion event", desc: "form_submit event to analytics, with no personal data" },
  "webhook": { name: "Webhook", desc: "POSTs the submission id to a registered endpoint" },
};
export const formLayout = (meta?: Record<string, unknown>) => (meta?.["ucp:formLayout"] === "single" ? "single" : "wizard");

/** Checks shown before a form goes to review: what a reviewer would send back. */
export function formChecks(comps: { type: string; props: Record<string, unknown> }[], rules: FormRule[], submit: FormSubmit): string[] {
  const out: string[] = []; const fields = comps.filter((c) => FIELD_TYPES.includes(c.type)); const names = fields.map((c) => str(c.props.name)).filter(Boolean);
  if (!comps.some((c) => c.type === "fconsent" && c.props.consent === "Privacy notice")) out.push("Add the Privacy notice consent");
  if (comps[0]?.type !== "formstep") out.push("Start the form with a Step");
  if (new Set(names).size !== names.length) out.push("Two fields share a field name");
  const steps = new Set(comps.filter((c) => c.type === "formstep").map((c) => str(c.props.title)));
  if (rules.some((r) => !names.includes(r.when.field) || (r.then.action === "skip-step" ? !steps.has(r.then.target) : !names.includes(r.then.target)))) out.push("A rule points to a field or step that no longer exists");
  const act = SUBMIT_ACTIONS[submit.action]; if (act) { const mapped = new Set(Object.values(submit.mapping)); const miss = act.required.filter((r) => !mapped.has(r)); if (miss.length) out.push(`Map the required ${act.name} fields: ${miss.join(", ")}`); }
  return out;
}

/** The published form definition for the Forms solution: panels (steps) of AEM core components, plus rules, submit action and result pages. */
export function formDefinition(f: { id: string; title: string; status: string; locale: string; market: string; hostPage?: string; updatedAt?: string; meta?: Record<string, unknown> }, comps: Comp[]) {
  type Panel = { id: string; fieldType: "panel"; "sling:resourceType": string; label: { value: string }; items: Record<string, unknown>[] };
  const panels: Panel[] = []; let success: Record<string, unknown> | null = null, failure: Record<string, unknown> | null = null;
  for (const c of comps) {
    const t = typeOf(c); const p = c.props;
    if (t === "formstep") { panels.push({ id: `step-${panels.length + 1}`, fieldType: "panel", "sling:resourceType": AEM.formstep, label: { value: plain(p.title) }, items: [] }); continue; }
    if (t === "fsuccess") { success = { title: plain(p.heading), message: plain(p.text), showReference: str(p.reference).startsWith("Show"), button: plain(p.cta) || null, link: str(p.link) || null }; continue; }
    if (t === "ffailure") { failure = { title: plain(p.heading), message: plain(p.text), button: plain(p.cta) || null }; continue; }
    if (!AEM[t]) continue;
    if (!panels.length) panels.push({ id: "step-1", fieldType: "panel", "sling:resourceType": AEM.formstep, label: { value: "Form" }, items: [] });
    const style = str(p.style); const res = t === "fchoice" ? (style === "Radio buttons" ? "core/fd/components/form/radiobutton/v1/radiobutton" : style === "Checkboxes" ? "core/fd/components/form/checkboxgroup/v1/checkboxgroup" : AEM.fchoice) : AEM[t];
    const item: Record<string, unknown> = t === "finfo" ? { fieldType: "plain-text", "sling:resourceType": res, value: plain(p.text) }
      : t === "fconsent" ? { name: `consent_${str(p.consent).toLowerCase().replace(/\W+/g, "_")}`, fieldType: "checkbox", "sling:resourceType": res, required: p.required !== "Optional", consent: { id: str(p.consent), version: CONSENT_VERSION[str(p.consent)] ?? "v1" } }
      : { name: str(p.name), fieldType: t === "fchoice" ? (style === "Checkboxes" ? "checkbox-group" : style === "Radio buttons" ? "radio-group" : "drop-down") : t === "ffile" ? "file-input" : t.slice(1) + "-input", "sling:resourceType": res, label: { value: plain(p.label) }, description: plain(p.help) || null, placeholder: plain(p.placeholder) || null, required: p.required !== "Optional",
          ...(t === "fchoice" ? { enum: str(p.options).split("\n").map((x) => x.trim()).filter(Boolean) } : {}), ...(p.maxLength ? { maxLength: Number(p.maxLength) } : {}), ...(p.pattern ? { pattern: str(p.pattern) } : {}),
          ...(t === "fnumber" ? { minimum: p.min === "" ? null : Number(p.min), maximum: p.max === "" ? null : Number(p.max) } : {}), ...(t === "ffile" ? { accept: str(p.types), maxFileSize: str(p.size) } : {}), ...(p.error ? { constraintMessages: { required: plain(p.error) } } : {}) };
    panels[panels.length - 1].items.push(item);
  }
  const submit = formSubmit(f.meta);
  return {
    contractVersion: "1.0", id: f.id, title: f.title, market: f.market, locale: f.locale, status: f.status, publishedAt: f.updatedAt ?? null, hostPage: f.hostPage ?? null,
    fieldType: "form", "sling:resourceType": "core/fd/components/form/container/v2/container",
    layout: formLayout(f.meta) === "wizard" ? "core/fd/components/form/wizard/v2/wizard" : "core/fd/components/form/panelcontainer/v1/panelcontainer",
    items: panels, rules: formRules(f.meta),
    submit: { action: { id: submit.action, name: SUBMIT_ACTIONS[submit.action]?.name ?? submit.action }, mapping: submit.mapping, retentionPolicy: submit.retention, endpoint: `{formsSolution}/api/v1/forms/${f.id}/submissions` },
    submitPage: (() => { const sp = formSubmitPage(f.meta); return { title: sp.heading, description: sp.intro, showSummary: sp.summary, button: { label: sp.button }, beforeSubmit: sp.before.map((id) => ({ id, name: BEFORE_SUBMIT[id]?.name ?? id })), afterSubmit: sp.after.map((id) => ({ id, name: AFTER_SUBMIT[id]?.name ?? id, ...(id.startsWith("confirm-") && sp.confirmMessage ? { message: `/v1/messages/${sp.confirmMessage}` } : {}) })) }; })(),
    thankYou: success, error: failure,
    _links: { self: `/v1/forms/${f.id}?market=${f.market}` },
  };
}
