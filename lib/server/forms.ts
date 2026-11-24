import "server-only";
import { repo, blocksToComponents } from "@/lib/repo";
import type { PageStatus } from "@/lib/repo";
import { FORMS_FOLDER, makeBlock, templateBlocks } from "@/lib/blocks/registry";

/**
 * Forms live at <root>/forms in folders that mirror the site: a form for /help/contact sits in Forms › Help › Contact us.
 * Each form is a page built in the page builder, with `ucp:hostPage` naming the page that shows it.
 * The first visit creates demo forms on real pages, at different workflow stages. Ids match the Form component's list.
 */
type Seed = { host: string; name: string; title: string; template: string; status: PageStatus; blocks?: ReturnType<typeof makeBlock>[]; rules?: unknown[]; submit?: unknown; meta?: Record<string, unknown> };
const ago = (h: number) => new Date(Date.now() - h * 3600000).toISOString();

function demo(): Seed[] {
  const lead = templateBlocks("form-lead"); lead[0].props.title = "Request a call back"; lead[4] = makeBlock("fchoice", { label: "Best time to call", name: "callTime", style: "Radio buttons", options: "Morning\nAfternoon\nEvening" });
  lead[6].props.text = "Thanks. A mortgage adviser will call you at the time you chose, usually within 2 working days.";
  const appRules = [{ id: "r1", when: { field: "employment", op: "equals", value: "Employed" }, then: { action: "show", target: "employer" } }, { id: "r2", when: { field: "employment", op: "equals", value: "Retired" }, then: { action: "skip-step", target: "Documents" } }];
  const appSubmit = { action: "application", mapping: { fullName: "fullName", dob: "dateOfBirth", email: "email", phone: "phone", employment: "employment", employer: "employer", income: "income", documents: "documents" }, retention: "application-7y" };
  return [
    { host: "/help/contact", name: "contact", title: "Contact us", template: "form-contact", status: "published", submit: { action: "case-queue", mapping: { fullName: "customerName", email: "email", topic: "topic", message: "description", attachment: "attachment" }, retention: "contact-6m" } },
    { host: "/borrowing/mortgages/overview", name: "mortgage-callback", title: "Request a mortgage call back", template: "form-lead", status: "published", blocks: lead, submit: { action: "crm-lead", mapping: { fullName: "fullName", email: "email", phone: "phone", callTime: "notes" }, retention: "lead-12m" }, meta: { "ucp:formLayout": "single" } },
    { host: "/banking/savings/cash-isa", name: "apply-savings", title: "Apply for a savings account", template: "form-application", status: "review", rules: appRules, submit: appSubmit, meta: { "ucp:sentBy": "sunita.patel", "ucp:sentAt": ago(6) } },
    { host: "/borrowing/credit-cards/rewards-credit-cards", name: "apply-card", title: "Credit card application", template: "form-application", status: "draft", rules: appRules, submit: appSubmit },
  ];
}

const seeding = new Map<string, Promise<void>>();
export function ensureForms(marketRoot: string): Promise<void> {
  let p = seeding.get(marketRoot); if (!p) { p = seed(marketRoot).finally(() => seeding.delete(marketRoot)); seeding.set(marketRoot, p); } return p;
}
async function folder(parentPath: string, name: string, title: string) {
  const f = await repo().createPage({ parentPath, name, template: "folder", title });
  await repo().setProps(`${f.path}/jcr:content`, { "sling:resourceType": "hsbc/components/folder" });
}
async function seed(marketRoot: string) {
  const r = repo(); const root = `${marketRoot}/${FORMS_FOLDER}`;
  if (await r.getNode(root, 0).catch(() => undefined)) return;
  await folder(marketRoot, FORMS_FOLDER, "Forms");
  for (const f of demo()) {
    const hostPath = `${marketRoot}${f.host}`; if (!(await r.getPage(hostPath).catch(() => undefined))) continue;
    let cur = root;
    for (const seg of f.host.split("/").filter(Boolean)) {
      const next = `${cur}/${seg}`;
      if (!(await r.getNode(next, 0).catch(() => undefined))) await folder(cur, seg, (await r.getPage(`${marketRoot}${next.slice(root.length)}`).catch(() => undefined))?.title ?? seg);
      cur = next;
    }
    const p = await r.createPage({ parentPath: cur, name: f.name, template: f.template, title: f.title });
    await r.saveComponents(p.path, blocksToComponents(f.blocks ?? templateBlocks(f.template)));
    await r.updateContent(p.path, { status: f.status, locale: "en-GB" });
    await r.setProps(`${p.path}/jcr:content`, { "ucp:hostPage": hostPath, ...(f.rules ? { "ucp:formRules": JSON.stringify(f.rules) } : {}), ...(f.submit ? { "ucp:formSubmit": JSON.stringify(f.submit) } : {}), ...(f.meta ?? {}) });
  }
}
