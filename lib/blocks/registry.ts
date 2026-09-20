import type { Block } from "@/lib/api/types";

export type FieldType = "text" | "textarea" | "lines" | "select" | "bool" | "asset" | "form";
export type Field = { k: string; l: string; t: FieldType; req?: boolean; mono?: boolean; hint?: string; o?: string[] };
export type BlockDef = { type: string; name: string; group: string; desc: string; fields: Field[]; defaults: Record<string, unknown> };

/** The HSBC block library (translated AEM dialogs in the real platform). Same catalogue as the prototype. */
export const BLOCKS: BlockDef[] = [
  { type: "mast", group: "HSBC tiles", name: "Masthead", desc: "Full-width photo with a white title box",
    fields: [{ k: "heading", l: "Heading", t: "text", req: true }, { k: "intro", l: "Sub-heading", t: "text" }, { k: "cta", l: "Button label", t: "text" }, { k: "link", l: "Button link", t: "text", mono: true }, { k: "image", l: "Photo", t: "asset" }],
    defaults: { heading: "Your heading here", intro: "One sentence that explains what this page is for.", cta: "", link: "#", image: "hero-cards" } },
  { type: "contentmaster", group: "HSBC tiles", name: "Content master", desc: "Light 28px heading with a paragraph",
    fields: [{ k: "heading", l: "Heading", t: "text", req: true }, { k: "body", l: "Paragraph", t: "textarea" }],
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
    fields: [{ k: "heading", l: "Heading", t: "text" }, { k: "body", l: "Body", t: "textarea", hint: "Blank line starts a new paragraph." }],
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
    fields: [{ k: "text", l: "Text", t: "textarea", req: true }],
    defaults: { text: "Rates are variable and correct as at the date shown. AER stands for Annual Equivalent Rate." } },
];
export const BLOCK_BY_TYPE: Record<string, BlockDef> = Object.fromEntries(BLOCKS.map((b) => [b.type, b]));
export const GROUPS = [...new Set(BLOCKS.map((b) => b.group))];

export const uid = () => Math.random().toString(36).slice(2, 9);
export const makeBlock = (type: string, props: Record<string, unknown> = {}): Block => ({ id: uid(), type, props: { ...BLOCK_BY_TYPE[type].defaults, ...props } });
export const lines = (s: unknown): string[][] => String(s ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.split("|").map((x) => x.trim()));
export const joinLines = (rows: string[][]) => rows.map((r) => r.join(" | ")).join("\n");
export const missingRequired = (b: Block) => BLOCK_BY_TYPE[b.type].fields.filter((f) => f.req && !b.props[f.k]);

export const TEMPLATES: { id: string; name: string; desc: string; blocks: string[] }[] = [
  { id: "blank", name: "Blank page", desc: "Start with nothing", blocks: [] },
  { id: "product", name: "Product page", desc: "Masthead · Content · Icon tiles · Master tiles · Link tiles · Footnotes", blocks: ["mast", "contentmaster", "icontiles", "mastertiles", "linktiles", "footnotes"] },
  { id: "rates", name: "Rates page", desc: "Masthead · Facts · Rates · FAQ · Form", blocks: ["mast", "facts", "rates", "faq", "form", "disclaimer"] },
  { id: "hub", name: "Category hub", desc: "Masthead · Content · Link tiles · Banner", blocks: ["mast", "contentmaster", "linktiles", "banner"] },
  { id: "campaign", name: "Campaign landing", desc: "Masthead · Text · Banner · Form", blocks: ["mast", "text", "banner", "form", "disclaimer"] },
];
