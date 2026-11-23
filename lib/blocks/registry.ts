import type { Block } from "@/lib/api/types";
import { toPlain } from "./richtext";

export type FieldType = "text" | "textarea" | "lines" | "select" | "bool" | "asset" | "form";
/** `rich`: long text with formatting (bold, italic, underline, links, bullet and numbered lists), stored as safe HTML. */
export type Field = { k: string; l: string; t: FieldType; req?: boolean; mono?: boolean; hint?: string; o?: string[]; rich?: boolean };
export type BlockDef = { type: string; name: string; group: string; desc: string; fields: Field[]; defaults: Record<string, unknown> };

/** The HSBC block library (translated AEM dialogs in the real platform). Same catalogue as the prototype. */
export const BLOCKS: BlockDef[] = [
  { type: "mast", group: "HSBC tiles", name: "Masthead", desc: "Full-width photo with a white title box",
    fields: [{ k: "heading", l: "Heading", t: "text", req: true }, { k: "intro", l: "Sub-heading", t: "text" }, { k: "cta", l: "Button label", t: "text" }, { k: "link", l: "Button link", t: "text", mono: true }, { k: "image", l: "Photo", t: "asset" }],
    defaults: { heading: "Your heading here", intro: "One sentence that explains what this page is for.", cta: "", link: "#", image: "hero-cards" } },
  { type: "contentmaster", group: "HSBC tiles", name: "Content master", desc: "Light 28px heading with a paragraph",
    fields: [{ k: "heading", l: "Heading", t: "text", req: true }, { k: "body", l: "Paragraph", t: "textarea", rich: true }],
    defaults: { heading: "What is a rewards credit card?", body: "Rewards cards earn you points as you use them. Then you can spend your points on shopping, travel and much more." } },
  { type: "icontiles", group: "HSBC tiles", name: "Icon tiles", desc: "Three benefits with red line icons",
    fields: [{ k: "heading", l: "Heading", t: "text" }, { k: "items", l: "Tiles", t: "lines", hint: "Icon | Title | Text" }],
    defaults: { heading: "How a rewards credit card can help you", items: "star | Earn Reward points | See your Reward points stack up as you use your card.\nwallet | Make your rewards work for you | Spend your points on shopping, travel or leisure.\nbag | Get rewarded when you shop | Everyday spending counts too, not just big purchases." } },
  { type: "mastertiles", group: "HSBC tiles", name: "Master tiles", desc: "Product tiles with card image, representative example and Apply button",
    fields: [{ k: "heading", l: "Heading", t: "text" }, { k: "items", l: "Tiles", t: "lines", hint: "Card style | Name | Text | Purchase rate | Representative APR | Button label" }, { k: "note", l: "Small print", t: "text" }],
    defaults: { heading: "Explore our rewards credit cards", items: "red | Rewards Credit Card | Earn reward points on eligible purchases. Get 2,500 points worth £25 as a welcome bonus with your first transaction. | 26.9% p.a. (variable) | 26.9% APR (variable) | Apply now\nblack | Premier Credit Card | Travel benefits, rewards and Premier privileges with no annual fee. For HSBC Premier customers. | 29.9% p.a. (variable) | 29.9% APR (variable) | Apply now\npremier | Premier World Elite Mastercard | 70,000 reward points when you spend £2,000 in the first 90 days. Annual fee £290. | 29.9% p.a. (variable) | 100.2% APR (variable) | Apply now", note: "Eligibility criteria apply. Credit subject to status. Based on an assumed credit limit of £1,200." } },
  { type: "linktiles", group: "HSBC tiles", name: "Link tiles", desc: "Three bordered tiles with chevron headings",
    fields: [{ k: "heading", l: "Heading", t: "text" }, { k: "items", l: "Tiles", t: "lines", hint: "Title | Text | Link" }],
    defaults: { heading: "Not the right type of card?", items: "Purchase credit cards | Buy now and spread the cost of all your purchases, large or small. | /credit-cards/purchase\nBalance transfer credit cards | Give yourself some breathing room with our balance transfer options. | /credit-cards/balance-transfer\nCredit-builder credit cards | Build your credit score when you spend and repay on time. | /credit-cards/credit-builder" } },
  { type: "footnotes", group: "HSBC tiles", name: "Additional information", desc: "Grey footnotes section at the bottom of the page",
    fields: [{ k: "heading", l: "Heading", t: "text" }, { k: "items", l: "Notes", t: "lines" }],
    defaults: { heading: "Additional information", items: "You will not be able to apply for a credit limit increase in the first 6 months after your card is opened.\nEligible spend excludes cash advances, fees, balance transfers, cheques, refunds, interest or any other charges." } },
  { type: "banner", group: "Layout", name: "Call-to-action banner", desc: "Dark or light strip with one button",
    fields: [{ k: "heading", l: "Heading", t: "text", req: true }, { k: "text", l: "Text", t: "text" }, { k: "cta", l: "Button label", t: "text" }, { k: "link", l: "Button link", t: "text", mono: true }, { k: "style", l: "Style", t: "select", o: ["dark", "light"] }],
    defaults: { heading: "Ready to get started?", text: "It takes about five minutes to apply online.", cta: "Apply now", link: "#", style: "dark" } },
  { type: "text", group: "Content", name: "Rich text", desc: "Heading and paragraphs",
    fields: [{ k: "heading", l: "Heading", t: "text" }, { k: "body", l: "Body", t: "textarea", rich: true, hint: "Enter starts a new paragraph. Use the toolbar for bold, links and lists." }],
    defaults: { heading: "About this account", body: "Write your paragraphs here.\n\nA blank line starts a new paragraph." } },
  { type: "facts", group: "Content", name: "Key facts", desc: "Three to six label / value tiles",
    fields: [{ k: "heading", l: "Heading", t: "text" }, { k: "items", l: "Facts", t: "lines", hint: "Label | Value" }],
    defaults: { heading: "Key facts", items: "Minimum deposit | £1,000\nAccess | Instant\nFSCS protected | Up to £85,000" } },
  { type: "faq", group: "Content", name: "FAQ", desc: "Expandable questions and answers",
    fields: [{ k: "heading", l: "Heading", t: "text" }, { k: "items", l: "Questions", t: "lines", hint: "Question | Answer" }],
    defaults: { heading: "Common questions", items: "Can I open this online? | Yes, most customers can apply online in about five minutes.\nIs my money protected? | Eligible deposits are covered by the FSCS up to £85,000." } },
  { type: "rates", group: "Data", name: "Rates table", desc: "Term, AER and gross rates",
    fields: [{ k: "heading", l: "Heading", t: "text" }, { k: "rows", l: "Rows", t: "lines", hint: "Term | AER | Gross" }, { k: "note", l: "Footnote", t: "text" }],
    defaults: { heading: "Our rates", rows: "1 year | 4.10% | 4.10%\n2 years | 3.95% | 3.95%\n3 years | 3.80% | 3.80%", note: "Rates correct as at 15 September 2027." } },
  { type: "form", group: "Conversion", name: "Form", desc: "Embed a form from the Forms service",
    fields: [{ k: "form", l: "Form", t: "form", req: true }, { k: "heading", l: "Heading", t: "text" }],
    defaults: { form: "apply-card", heading: "Apply online" } },
  { type: "disclaimer", group: "Content", name: "Disclaimer", desc: "Small print, regulatory text",
    fields: [{ k: "text", l: "Text", t: "textarea", req: true, rich: true }],
    defaults: { text: "Rates are variable and correct as at the date shown. AER stands for Annual Equivalent Rate." } },
  /* ---- Messaging: e-mail components (render reliably in e-mail clients) ---- */
  { type: "envelope", group: "Header", name: "Envelope", desc: "Sender, subject line and inbox preview text",
    fields: [{ k: "fromName", l: "From name", t: "text", req: true }, { k: "subject", l: "Subject", t: "text", req: true, hint: "Up to 90 characters. Variables like {{firstName}} are allowed." }, { k: "preheader", l: "Preview text", t: "text", hint: "Shown after the subject in most inboxes" }],
    defaults: { fromName: "HSBC UK", subject: "Your subject line", preheader: "" } },
  { type: "emailheader", group: "Header", name: "E-mail header", desc: "HSBC logo bar (part of the fixed header)",
    fields: [{ k: "tagline", l: "Tagline", t: "text" }], defaults: { tagline: "" } },
  { type: "emailhero", group: "Body", name: "Hero image", desc: "Full-width image with alt text",
    fields: [{ k: "image", l: "Image", t: "asset", req: true }, { k: "alt", l: "Alt text", t: "text", req: true }], defaults: { image: "hero-savings", alt: "" } },
  { type: "emailheading", group: "Body", name: "Heading", desc: "E-mail headline",
    fields: [{ k: "heading", l: "Heading", t: "text", req: true }], defaults: { heading: "Make your savings work harder" } },
  { type: "emailtext", group: "Body", name: "Text", desc: "Paragraphs; {{firstName}} and other variables allowed",
    fields: [{ k: "body", l: "Text", t: "textarea", req: true }], defaults: { body: "Dear {{firstName}},\n\nWrite your message here." } },
  { type: "emailbutton", group: "Body", name: "Button", desc: "Call to action with a full https link",
    fields: [{ k: "cta", l: "Label", t: "text", req: true }, { k: "link", l: "Link", t: "text", mono: true, req: true }], defaults: { cta: "Find out more", link: "https://www.hsbc.co.uk/" } },
  { type: "emailproduct", group: "Body", name: "Product card", desc: "Product, headline rate and a link",
    fields: [{ k: "name", l: "Product", t: "text", req: true }, { k: "rate", l: "Headline rate", t: "text" }, { k: "detail", l: "Detail", t: "textarea" }, { k: "link", l: "Link", t: "text", mono: true }],
    defaults: { name: "Flexible Saver", rate: "3.50% AER", detail: "Variable rate. Access your money when you need it.", link: "https://www.hsbc.co.uk/savings/" } },
  { type: "emaildivider", group: "Body", name: "Divider", desc: "Thin line between sections", fields: [], defaults: {} },
  { type: "emailfooter", group: "Footer", name: "Legal footer", desc: "Regulatory text and unsubscribe link (the fixed footer)",
    fields: [{ k: "legal", l: "Legal text", t: "textarea", req: true }, { k: "unsubscribe", l: "Unsubscribe text", t: "text", req: true }],
    defaults: { legal: "HSBC UK Bank plc. Registered in England and Wales (company number 9928412). Authorised by the Prudential Regulation Authority and regulated by the Financial Conduct Authority and the Prudential Regulation Authority.", unsubscribe: "Unsubscribe from marketing e-mails" } },
  /* ---- Messaging: one component per simple channel ---- */
  { type: "sms", group: "Message", name: "SMS", desc: "Sender ID, text and opt-out",
    fields: [{ k: "sender", l: "Sender ID", t: "text", req: true, hint: "Up to 11 letters or digits" }, { k: "text", l: "Text", t: "textarea", req: true, hint: "GSM-7: 160 characters per segment, 153 when split. Variables like {{firstName}} are allowed." }, { k: "optout", l: "Opt-out line", t: "select", o: ["Add “Reply STOP to opt out”", "None (service or security message)"] }],
    defaults: { sender: "HSBC", text: "Hi {{firstName}}, ", optout: "Add “Reply STOP to opt out”" } },
  { type: "push", group: "Message", name: "Pop-up / push notification", desc: "Notification that pops up on the lock screen or over the open app",
    fields: [{ k: "title", l: "Title", t: "text", req: true, hint: "Up to 50 characters" }, { k: "body", l: "Text", t: "textarea", req: true, hint: "Up to 178 characters" }, { k: "link", l: "Deep link", t: "text", mono: true, hint: "e.g. hsbc://statements/latest" }, { k: "image", l: "Image", t: "asset" }, { k: "shown", l: "Pops up", t: "select", o: ["On the lock screen", "Over the open app"] }],
    defaults: { title: "Your statement is ready", body: "{{firstName}}, your latest statement is ready to view.", link: "hsbc://statements/latest", image: "", shown: "On the lock screen" } },
  { type: "inapp", group: "Message", name: "In-app message", desc: "Message inside the app: modal, bottom sheet, top banner or a card in the feed",
    fields: [{ k: "heading", l: "Heading", t: "text", req: true }, { k: "body", l: "Text", t: "textarea", req: true }, { k: "cta", l: "Button label", t: "text", req: true }, { k: "link", l: "Button link", t: "text", mono: true }, { k: "dismiss", l: "Close label", t: "text" }, { k: "image", l: "Image", t: "asset" }, { k: "placement", l: "Format", t: "select", o: ["Modal", "Bottom sheet", "Top banner", "Card in the feed"] }, { k: "trigger", l: "Show on", t: "select", o: ["App open", "After login", "Screen view"] }],
    defaults: { heading: "Are your details up to date?", body: "Check your phone number and e-mail so we can reach you about your accounts.", cta: "Check my details", link: "hsbc://profile/contact", dismiss: "Not now", image: "", placement: "Bottom sheet", trigger: "After login" } },
  /* ---- Forms: Forms repository components (AEM Forms core components), built on the page that hosts the form ---- */
  { type: "formstep", group: "Form", name: "Step", desc: "Starts a step; customers move step by step with a progress bar",
    fields: [{ k: "title", l: "Step title", t: "text", req: true }, { k: "next", l: "Next button", t: "text", hint: "On the last step this button goes to the Submit page" }, { k: "back", l: "Back button", t: "text", hint: "Not shown on the first step" }], defaults: { title: "Your details", next: "Continue", back: "Back" } },
  { type: "ftext", group: "Form", name: "Text input", desc: "Single or multi-line text",
    fields: [{ k: "label", l: "Label", t: "text", req: true }, { k: "name", l: "Field name (for rules and mapping)", t: "text", mono: true, req: true }, { k: "help", l: "Help text", t: "text" }, { k: "placeholder", l: "Placeholder", t: "text" }, { k: "lines", l: "Size", t: "select", o: ["One line", "Several lines"] }, { k: "maxLength", l: "Max length", t: "text" }, { k: "pattern", l: "Pattern (regular expression)", t: "text", mono: true }, { k: "required", l: "Required", t: "select", o: ["Required", "Optional"] }, { k: "error", l: "Error message", t: "text", hint: "Leave empty for the Forms repository default" }],
    defaults: { label: "Full name", name: "fullName", help: "", placeholder: "", lines: "One line", maxLength: "", pattern: "", required: "Required", error: "" } },
  { type: "femail", group: "Form", name: "E-mail", desc: "Validated e-mail address",
    fields: [{ k: "label", l: "Label", t: "text", req: true }, { k: "name", l: "Field name (for rules and mapping)", t: "text", mono: true, req: true }, { k: "help", l: "Help text", t: "text" }, { k: "required", l: "Required", t: "select", o: ["Required", "Optional"] }, { k: "error", l: "Error message", t: "text", hint: "Leave empty for the Forms repository default" }], defaults: { label: "E-mail", name: "email", help: "", required: "Required", error: "" } },
  { type: "fphone", group: "Form", name: "Phone", desc: "Phone number with format check",
    fields: [{ k: "label", l: "Label", t: "text", req: true }, { k: "name", l: "Field name (for rules and mapping)", t: "text", mono: true, req: true }, { k: "help", l: "Help text", t: "text" }, { k: "required", l: "Required", t: "select", o: ["Required", "Optional"] }, { k: "error", l: "Error message", t: "text", hint: "Leave empty for the Forms repository default" }], defaults: { label: "Phone", name: "phone", help: "", required: "Optional", error: "" } },
  { type: "fnumber", group: "Form", name: "Number", desc: "Amounts and numbers with a range",
    fields: [{ k: "label", l: "Label", t: "text", req: true }, { k: "name", l: "Field name (for rules and mapping)", t: "text", mono: true, req: true }, { k: "help", l: "Help text", t: "text" }, { k: "min", l: "Minimum", t: "text" }, { k: "max", l: "Maximum", t: "text" }, { k: "required", l: "Required", t: "select", o: ["Required", "Optional"] }, { k: "error", l: "Error message", t: "text", hint: "Leave empty for the Forms repository default" }], defaults: { label: "Amount (£)", name: "amount", help: "", min: "0", max: "", required: "Required", error: "" } },
  { type: "fdate", group: "Form", name: "Date", desc: "Date picker",
    fields: [{ k: "label", l: "Label", t: "text", req: true }, { k: "name", l: "Field name (for rules and mapping)", t: "text", mono: true, req: true }, { k: "help", l: "Help text", t: "text" }, { k: "required", l: "Required", t: "select", o: ["Required", "Optional"] }, { k: "error", l: "Error message", t: "text", hint: "Leave empty for the Forms repository default" }], defaults: { label: "Date of birth", name: "dob", help: "", required: "Required", error: "" } },
  { type: "fchoice", group: "Form", name: "Choice", desc: "Drop-down, radio buttons or checkboxes",
    fields: [{ k: "label", l: "Label", t: "text", req: true }, { k: "name", l: "Field name (for rules and mapping)", t: "text", mono: true, req: true }, { k: "help", l: "Help text", t: "text" }, { k: "style", l: "Shown as", t: "select", o: ["Drop-down", "Radio buttons", "Checkboxes"] }, { k: "options", l: "Options", t: "lines", hint: "One option per line" }, { k: "required", l: "Required", t: "select", o: ["Required", "Optional"] }, { k: "error", l: "Error message", t: "text", hint: "Leave empty for the Forms repository default" }],
    defaults: { label: "I'm interested in", name: "product", help: "", style: "Drop-down", options: "Savings\nMortgages\nCredit cards\nLoans", required: "Required", error: "" } },
  { type: "ffile", group: "Form", name: "File upload", desc: "Documents within the repository's type and size limits",
    fields: [{ k: "label", l: "Label", t: "text", req: true }, { k: "name", l: "Field name (for rules and mapping)", t: "text", mono: true, req: true }, { k: "help", l: "Help text", t: "text" }, { k: "types", l: "File types", t: "select", o: ["PDF, JPG, PNG", "PDF only", "Images only"] }, { k: "size", l: "Max size", t: "select", o: ["10 MB", "5 MB", "2 MB"] }, { k: "required", l: "Required", t: "select", o: ["Required", "Optional"] }],
    defaults: { label: "Proof of income", name: "documents", help: "", types: "PDF, JPG, PNG", size: "10 MB", required: "Required" } },
  { type: "fconsent", group: "Form", name: "Consent", desc: "Approved, versioned consent wording from the Forms repository",
    fields: [{ k: "consent", l: "Consent block", t: "select", o: ["Privacy notice", "Marketing preferences", "Credit search"] }, { k: "required", l: "Required", t: "select", o: ["Required", "Optional"] }], defaults: { consent: "Privacy notice", required: "Required" } },
  { type: "finfo", group: "Form", name: "Guidance text", desc: "Static help for the customer between fields",
    fields: [{ k: "text", l: "Text", t: "textarea", req: true }], defaults: { text: "Upload your last three months' payslips or, if you're self-employed, your latest tax return." } },
  { type: "fsuccess", group: "Form", name: "Success page", desc: "Shown after the Forms solution accepts the submission",
    fields: [{ k: "heading", l: "Heading", t: "text", req: true }, { k: "text", l: "Message", t: "textarea", req: true }, { k: "reference", l: "Reference", t: "select", o: ["Show the submission reference", "Do not show"] }, { k: "cta", l: "Button label", t: "text" }, { k: "link", l: "Button link", t: "text", mono: true }],
    defaults: { heading: "Thank you", text: "We've received your details. Someone from our team will contact you within 2 working days.", reference: "Show the submission reference", cta: "Back to HSBC UK", link: "/", locked: true } },
  { type: "ffailure", group: "Form", name: "Failure page", desc: "Shown when the Forms solution cannot accept the submission",
    fields: [{ k: "heading", l: "Heading", t: "text", req: true }, { k: "text", l: "Message", t: "textarea", req: true }, { k: "cta", l: "Button label", t: "text" }],
    defaults: { heading: "Sorry, we couldn't send your form", text: "Nothing has been lost. Please try again in a few minutes, or call us on 0345 740 4404.", cta: "Try again", locked: true } },
];
export const BLOCK_BY_TYPE: Record<string, BlockDef> = Object.fromEntries(BLOCKS.map((b) => [b.type, b]));
export const GROUPS = [...new Set(BLOCKS.map((b) => b.group))];

export const uid = () => Math.random().toString(36).slice(2, 9);
export const makeBlock = (type: string, props: Record<string, unknown> = {}): Block => ({ id: uid(), type, props: { ...BLOCK_BY_TYPE[type].defaults, ...props } });
export const lines = (s: unknown): string[][] => String(s ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.split("|").map((x) => x.trim()));
export const joinLines = (rows: string[][]) => rows.map((r) => r.join(" | ")).join("\n");
export const missingRequired = (b: Block) => BLOCK_BY_TYPE[b.type].fields.filter((f) => f.req && !toPlain(b.props[f.k]).trim());

export type Channel = "email" | "push" | "sms" | "inapp";
export const TEMPLATES: { id: string; name: string; desc: string; blocks: string[]; channel?: Channel; form?: boolean; /** per-block overrides, by index */ props?: Record<number, Record<string, unknown>> }[] = [
  { id: "blank", name: "Blank page", desc: "Start with nothing", blocks: [] },
  { id: "product", name: "Product page", desc: "Masthead · Content · Icon tiles · Master tiles · Link tiles · Footnotes", blocks: ["mast", "contentmaster", "icontiles", "mastertiles", "linktiles", "footnotes"] },
  { id: "rates", name: "Rates page", desc: "Masthead · Facts · Rates · FAQ · Form", blocks: ["mast", "facts", "rates", "faq", "form", "disclaimer"] },
  { id: "hub", name: "Category hub", desc: "Masthead · Content · Link tiles · Banner", blocks: ["mast", "contentmaster", "linktiles", "banner"] },
  { id: "campaign", name: "Campaign landing", desc: "Masthead · Text · Banner · Form", blocks: ["mast", "text", "banner", "form", "disclaimer"] },
  /* message templates: the Messaging screen offers these, the Pages screen does not */
  { id: "email-blank", channel: "email", name: "Blank e-mail", desc: "Only the locked envelope, header and legal footer: add the rest yourself", blocks: ["envelope", "emailheader", "emailfooter"], props: { 0: { subject: "", preheader: "" } } },
  { id: "email-offer", channel: "email", name: "Product offer e-mail", desc: "Hero, headline, product card and a call to action", blocks: ["envelope", "emailheader", "emailhero", "emailheading", "emailtext", "emailproduct", "emailbutton", "emailfooter"] },
  { id: "email-newsletter", channel: "email", name: "Newsletter e-mail", desc: "Hero, story and a link to read more", blocks: ["envelope", "emailheader", "emailhero", "emailheading", "emailtext", "emailbutton", "emaildivider", "emailtext", "emailfooter"] },
  { id: "email-notice", channel: "email", name: "Service notice e-mail", desc: "Text-first notice for service or regulatory updates", blocks: ["envelope", "emailheader", "emailheading", "emailtext", "emaildivider", "emailtext", "emailfooter"] },
  { id: "push-blank", channel: "push", name: "Blank pop-up / push", desc: "Start empty and fill in title, text and link yourself", blocks: ["push"], props: { 0: { title: "", body: "", link: "" } } },
  { id: "push", channel: "push", name: "Account update push", desc: "Title, text, deep link and an optional image", blocks: ["push"] },
  { id: "sms-blank", channel: "sms", name: "Blank SMS", desc: "Start empty and write the text yourself", blocks: ["sms"], props: { 0: { text: "" } } },
  { id: "sms", channel: "sms", name: "Service SMS", desc: "A service text with segment counter and opt-out", blocks: ["sms"] },
  { id: "inapp-blank", channel: "inapp", name: "Blank in-app message", desc: "Start empty and fill in heading, text and button yourself", blocks: ["inapp"], props: { 0: { heading: "", body: "", cta: "", link: "", dismiss: "" } } },
  { id: "inapp", channel: "inapp", name: "Update details in-app", desc: "Bottom sheet with a button, shown after login", blocks: ["inapp"] },
  /* form templates: the Forms screen offers these; consent, privacy and result pages are locked */
  { id: "form-blank", form: true, name: "Blank form", desc: "One step with the privacy notice", blocks: ["formstep", "fconsent", "fsuccess", "ffailure"], props: { 0: { title: "Your details" }, 1: { locked: true } } },
  { id: "form-lead", form: true, name: "Lead form", desc: "Short interest form that creates a CRM lead", blocks: ["formstep", "ftext", "femail", "fphone", "fchoice", "fconsent", "fsuccess", "ffailure"], props: { 0: { title: "Your details" }, 5: { locked: true } } },
  { id: "form-contact", form: true, name: "Contact us form", desc: "Topic, message and an attachment for servicing", blocks: ["formstep", "ftext", "femail", "fchoice", "ftext", "ffile", "fconsent", "fsuccess", "ffailure"], props: { 0: { title: "How can we help?" }, 3: { label: "Topic", name: "topic", options: "My account\nCard\nPayments\nComplaint\nSomething else" }, 4: { label: "Your message", name: "message", lines: "Several lines", maxLength: "1000" }, 5: { label: "Attachment", name: "attachment", required: "Optional" }, 6: { locked: true }, 7: { heading: "Message sent", text: "Thanks for getting in touch. We reply to most messages within 5 working days." } } },
  { id: "form-application", form: true, name: "Application form", desc: "Several steps: about you, income, documents, consent", blocks: ["formstep", "ftext", "fdate", "femail", "fphone", "formstep", "fchoice", "ftext", "fnumber", "formstep", "finfo", "ffile", "formstep", "fconsent", "fconsent", "fsuccess", "ffailure"], props: { 0: { title: "About you" }, 4: { label: "Mobile number", required: "Required" }, 5: { title: "Employment and income" }, 6: { label: "Employment status", name: "employment", style: "Radio buttons", options: "Employed\nSelf-employed\nRetired\nNot working" }, 7: { label: "Employer", name: "employer", required: "Optional" }, 8: { label: "Annual income (£)", name: "income" }, 9: { title: "Documents" }, 12: { title: "Check and agree" }, 13: { consent: "Credit search", locked: true }, 14: { consent: "Privacy notice", locked: true }, 15: { heading: "Application received", text: "Thank you. We'll check your application and e-mail you a decision, usually within 2 working days." } } },
];

/* ---------------- messaging ---------------- */
/** Where messages live: a folder tree of its own inside the market, opened in the Messaging screen. */
export const MESSAGING_FOLDER = "messaging";
export const isMessagingPath = (path: string, marketRoot: string) => path === `${marketRoot}/${MESSAGING_FOLDER}` || path.startsWith(`${marketRoot}/${MESSAGING_FOLDER}/`);
export const CHANNEL_LABEL: Record<Channel, string> = { email: "E-mail", push: "Pop-up / Push", sms: "SMS", inapp: "In-app" };
export const CHANNEL_ORDER: Channel[] = ["email", "push", "sms", "inapp"];
export const channelOf = (templateId?: string): Channel | undefined => TEMPLATES.find((t) => t.id === templateId)?.channel;
export const PAGE_TEMPLATES = TEMPLATES.filter((t) => !t.channel && !t.form);
export const FORM_TEMPLATES = TEMPLATES.filter((t) => t.form);
export const isFormTemplate = (id?: string) => !!TEMPLATES.find((t) => t.id === id)?.form;
export const MESSAGE_TEMPLATES = TEMPLATES.filter((t) => t.channel);
/** Component groups the builder palette offers: pages never get message components, an e-mail only gets e-mail ones, SMS/push/pop-up have their one component. */
/** component groups that are not for website pages */
export const PAGE_EXCLUDED = ["Header", "Body", "Footer", "Message", "Form"];
/** e-mail groups whose components come with the template and are only edited */
export const FIXED_GROUPS = ["Header", "Footer"];
export const groupsFor = (channel?: Channel, form = false) => (form ? ["Form"] : channel === "email" ? ["Header", "Body", "Footer"] : channel ? [] : GROUPS.filter((g) => !PAGE_EXCLUDED.includes(g)));
/** Forms live in <root>/forms, in folders that mirror the site, because every form is built for the page that hosts it. */
export const FORMS_FOLDER = "forms";
export const isFormsPath = (path: string, marketRoot: string) => path === `${marketRoot}/${FORMS_FOLDER}` || path.startsWith(`${marketRoot}/${FORMS_FOLDER}/`);
/** Messaging and Forms trees are not part of the website: keep them out of Pages, sitemaps and the pages API. */
export const isAppTree = (path: string, marketRoot: string) => isMessagingPath(path, marketRoot) || isFormsPath(path, marketRoot);

/** The blocks a template starts with, including its per-block overrides (form and message templates carry them). */
export const templateBlocks = (id: string, title = ""): Block[] => { const t = TEMPLATES.find((x) => x.id === id); return (t?.blocks ?? []).map((b, i) => makeBlock(b, { ...(b === "mast" ? { heading: title } : {}), ...(t?.props?.[i] ?? {}) })); };

/* ---------------- e-mail structure: fixed header, free body, fixed footer ---------------- */
export type EmailRegion = "header" | "body" | "footer";
/** Header (envelope + logo bar) and footer (legal text + unsubscribe) come with every e-mail template: they can be edited, not moved or removed. Components go in the body. */
export const emailRegion = (type: string): EmailRegion => (type === "envelope" || type === "emailheader" ? "header" : type === "emailfooter" ? "footer" : "body");
/** Keeps an e-mail in header → body → footer order and puts back a header or footer component that an edit tried to remove. */
export function arrangeEmail(next: Block[], prev: Block[]): Block[] {
  const lost = prev.filter((b) => emailRegion(b.type) !== "body" && !next.some((x) => x.id === b.id));
  const all = [...next, ...lost]; const by = (r: EmailRegion) => all.filter((b) => emailRegion(b.type) === r);
  return [...by("header"), ...by("body"), ...by("footer")];
}
