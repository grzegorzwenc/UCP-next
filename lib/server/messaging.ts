import "server-only";
import { repo, blocksToComponents } from "@/lib/repo";
import type { PageStatus } from "@/lib/repo";
import { makeBlock, MESSAGING_FOLDER } from "@/lib/blocks/registry";

/**
 * Messaging lives in the market's own tree at <root>/messaging: folders and messages are pages, so the
 * Pages explorer, the page builder, the review workflow, My tasks, comments and versions all apply as is.
 * The first visit creates the folder and a few demo messages at different workflow stages.
 */
const ago = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
type Seed = { folder: string; name: string; title: string; template: string; status: PageStatus; blocks: ReturnType<typeof makeBlock>[]; meta?: Record<string, unknown> };

function demo(): Seed[] {
  return [
    { folder: "campaigns", name: "autumn-savings-offer", title: "Autumn savings offer", template: "email-offer", status: "published", blocks: [
      makeBlock("envelope", { subject: "{{firstName}}, earn 3.50% AER on your savings", preheader: "Our Flexible Saver rate is up for a limited time" }), makeBlock("emailheader", { tagline: "Savings" }),
      makeBlock("emailhero", { image: "hero-savings", alt: "A couple planning their savings at home" }), makeBlock("emailheading", { heading: "Make your savings work harder" }),
      makeBlock("emailtext", { body: "Dear {{firstName}},\n\nFrom 1 December our Flexible Saver pays a higher variable rate, and you can still take money out whenever you need it." }),
      makeBlock("emailproduct"), makeBlock("emailbutton", { cta: "Open a Flexible Saver", link: "https://www.hsbc.co.uk/savings/products/flexible-saver/" }), makeBlock("emailfooter")] },
    { folder: "campaigns", name: "card-freeze-feature", title: "App feature: card freeze", template: "email-newsletter", status: "review", meta: { "ucp:sentBy": "anna.kowalczyk", "ucp:sentAt": ago(5) }, blocks: [
      makeBlock("envelope", { subject: "New in the HSBC UK app: instant card freeze", preheader: "Freeze and unfreeze your card in one tap" }), makeBlock("emailheader"),
      makeBlock("emailhero", { image: "hero-cards", alt: "A credit card next to a phone" }), makeBlock("emailheading", { heading: "Your card, under your control" }),
      makeBlock("emailtext", { body: "Hi {{firstName}}, you can now freeze your card ending {{accountEnding}} in the app and unfreeze it again in seconds." }),
      makeBlock("emailbutton", { cta: "Open the app", link: "https://www.hsbc.co.uk/ways-to-bank/mobile/" }), makeBlock("emailfooter")] },
    { folder: "security-alerts", name: "card-payment-alert", title: "Card payment security alert", template: "sms", status: "published", blocks: [
      makeBlock("sms", { text: "HSBC: a payment of {{amount}} on your card ending {{accountEnding}} needs checking. If this wasn't you, call 0345 600 6161. We will never ask for your PIN.", optout: "None (service or security message)" })] },
    { folder: "service", name: "branch-appointment-reminder", title: "Branch appointment reminder", template: "sms", status: "draft", blocks: [
      makeBlock("sms", { text: "Hi {{firstName}}, a reminder of your appointment at your HSBC branch on {{date}}. Need to change it? Visit hsbc.co.uk/appointments" })] },
    { folder: "service", name: "statement-ready", title: "Statement ready", template: "push", status: "approved", meta: { "ucp:sentBy": "content.author" }, blocks: [
      makeBlock("push", { title: "Your statement is ready", body: "{{firstName}}, your November statement for the account ending {{accountEnding}} is ready to view.", link: "hsbc://statements/latest" })] },
    { folder: "service", name: "savings-rate-change", title: "Savings rate change", template: "push", status: "draft", blocks: [
      makeBlock("push", { title: "Your savings rate is changing", body: "The rate on your {{productName}} changes on {{date}}. Tap to see the details.", link: "hsbc://accounts/savings", image: "hero-savings" })] },
    { folder: "security-alerts", name: "update-contact-details", title: "Update your contact details", template: "inapp", status: "published", blocks: [makeBlock("inapp")] },
  ];
}

const seeding = new Map<string, Promise<void>>();
/** One seeding run per market, even when several loaders ask at once. */
export function ensureMessaging(marketRoot: string): Promise<void> {
  let p = seeding.get(marketRoot); if (!p) { p = seed(marketRoot).finally(() => seeding.delete(marketRoot)); seeding.set(marketRoot, p); } return p;
}
async function folder(parentPath: string, name: string, title: string) {
  const f = await repo().createPage({ parentPath, name, template: "folder", title });
  await repo().setProps(`${f.path}/jcr:content`, { "sling:resourceType": "hsbc/components/folder" });
}
async function seed(marketRoot: string) {
  const r = repo(); const root = `${marketRoot}/${MESSAGING_FOLDER}`;
  if (await r.getNode(root, 0).catch(() => undefined)) return;
  await folder(marketRoot, MESSAGING_FOLDER, "Messaging");
  for (const [n, t] of [["campaigns", "Campaigns"], ["service", "Service"], ["security-alerts", "Security alerts"]]) await folder(root, n, t);
  for (const m of demo()) {
    const p = await r.createPage({ parentPath: `${root}/${m.folder}`, name: m.name, template: m.template, title: m.title });
    await r.saveComponents(p.path, blocksToComponents(m.blocks));
    await r.updateContent(p.path, { status: m.status, locale: "en-GB" });
    if (m.meta) await r.setProps(`${p.path}/jcr:content`, m.meta);
  }
}
