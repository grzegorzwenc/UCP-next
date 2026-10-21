/** Why UCP: benefits per audience, written from what the platform does today ("planned" marks what is not built yet). */
export type Benefit = { title: string; text: string; planned?: boolean };
export type Audience = { id: "developers" | "authors" | "customers"; name: string; tagline: string; benefits: Benefit[] };

export const AUDIENCES: Audience[] = [
  { id: "developers", name: "Developers", tagline: "A technical platform to build every channel on", benefits: [
    { title: "Content as a clean API", text: "Every published page is ready-to-render JSON: tokens resolved, images with rendition URLs, forms as versioned embed references and SEO meta with the canonical URL. Web, app or kiosk all use the same approved content." },
    { title: "A contract you can code against", text: "Each content model publishes a JSON Schema with required and localised fields marked, so you can generate types and validate data instead of guessing." },
    { title: "Preview and live, separated", text: "The public API returns only published content; a separate preview endpoint shows drafts, so upcoming pages can be tested without being exposed." },
    { title: "Backend-agnostic by design", text: "One repository port maps pages to JCR/Sling nodes, with adapters for Sling/AEM and ContentLIBRE behind it. The system of record can change without rewriting the UI." },
    { title: "Predictable errors, full traceability", text: "Every API error is RFC 7807 problem+json with a request ID that also appears in the audit log, so any issue is traced end to end." },
    { title: "Rules enforced by the server", text: "Permissions, the four-eyes workflow, page locks and “no live page with draft files” are checked by the API itself, not just hidden in the UI." },
    { title: "Modern, lightweight stack", text: "Next.js on the edge (Cloudflare Workers), one-command deploys and Playwright end-to-end tests on the core flows." },
    { title: "Built-in API explorer", text: "See every page's live or preview URL, its JSON and each model's schema, and try them from inside the CMS." },
    { title: "Executable specification", text: "236 Gherkin scenarios describe the behaviour and can become automated acceptance tests." },
    { title: "API keys, publish webhooks, environment promotion", text: "Secure access per app, events when content goes live, and content moving from dev to production.", planned: true },
  ] },
  { id: "authors", name: "Content authors", tagline: "Build, review and publish without code or chasing people", benefits: [
    { title: "On-brand pages without code", text: "Pages are built from approved HSBC components and text is edited right on the page, on desktop, tablet and mobile: what you see is what customers get." },
    { title: "Reuse instead of rebuilding", text: "Templates start new pages correctly, design patterns add whole sections in one click, and shared content such as rates lives in one place and updates every page that uses it." },
    { title: "Mistakes caught before review", text: "Page insights and the quality checklist flag empty fields, missing alt text, vague buttons, risky wording and missing disclaimers, often with a one-click fix." },
    { title: "A clear, fair workflow", text: "Send a page once: it goes to a shared Backlog any reviewer can take, then to the business, then to a publisher. You always see where it is and who has it, and can send a reminder." },
    { title: "Precise feedback", text: "Reviewers comment on the exact text, image or component. Business people without a CMS account comment and sign off through a link." },
    { title: "Work together, never lose work", text: "Several authors can build a page together; autosave runs all the time and every version can be restored or compared with the live page." },
    { title: "Safe site management", text: "Moving a page updates the links that point to it, archive comes before delete, and every action tells you its impact first." },
    { title: "One place for your work", text: "My tasks, notifications and the dashboard show what needs you next." },
    { title: "Translations with less effort", text: "A four-step flow creates language versions that go through the same review as any page." },
    { title: "AI that proposes, you decide", text: "AI shows a plan, you tick the changes you want, and every change can be undone. Today the planner is deterministic; the AI service connects next.", planned: true },
  ] },
  { id: "customers", name: "Customers", tagline: "What people see on HSBC pages", benefits: [
    { title: "Content you can trust", text: "Every page is checked by at least two people besides its author, including the business owner, before it goes live." },
    { title: "Correct, consistent information", text: "Rates, product names and key facts come from one source, so they match on every page and update everywhere at once." },
    { title: "Accessible to everyone", text: "Images need alt text in every language of the market or are marked decorative, documents need accessibility tags, and headings and buttons are checked to be clear." },
    { title: "Clear and compliant", text: "Pages with rates or offers must carry their disclaimers, and misleading phrases such as “guaranteed” or “risk-free” are flagged before publishing." },
    { title: "Nothing broken", text: "Pages go live together with their images and documents, moved pages keep their links working, and scheduled launches go live on time." },
    { title: "A consistent HSBC experience", text: "The same components and patterns in every market and on every device: the bank looks and behaves the same everywhere." },
    { title: "Content in your language", text: "Local-language versions follow the same quality checks as the original." },
  ] },
];
