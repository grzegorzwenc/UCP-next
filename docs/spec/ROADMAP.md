# Roadmap

Reverse roadmap: first what the prototype already proves (in the order it was built),
then what is a stand-in, then what has to happen to make it production-ready.

Legend: ✅ built · 🟡 built as a stand-in (mock) · ⬜ not built

## Phase 0 — Foundation ✅

| Item | Status |
|---|---|
| Next.js 16 app, HSBC shell (top bar, side menu, ⌘K palette, search) | ✅ |
| Markets in 3 instances, 4 environments | ✅ (environments are labels only — see Phase 5) |
| Repository port with JCR/Sling mapping; mock, Sling and ContentLIBRE adapters | ✅ / 🟡 ContentLIBRE pages only |
| Shared demo state on Cloudflare KV, deploy to Workers behind Basic Auth | ✅ |
| Roles and folder-level permissions, Users & roles screen | ✅ |
| Sign-in | 🟡 SSO stand-in (pick an account) |

## Phase 1 — Authoring ✅

| Item | Status |
|---|---|
| Page builder: 13 HSBC components, inline editing, Configure, rich text, device widths, autosave, ⌘S | ✅ |
| Pages: tree, search, create from template, rename, move with relinking, copy, duplicate, lock | ✅ |
| Templates with market visibility | ✅ |
| Assets with accessibility panel and publish status | ✅ |
| Content models (versions, breaking-change guard) and entities with tokens | ✅ |
| Page insights, quality checklist in preview | ✅ |
| Design patterns (create, markets, archive/delete) | ✅ |
| Several authors per page, Jira link | ✅ |
| AI assistant (component and page level, plan → run → undo) | 🟡 deterministic planner, no model call |

## Phase 2 — Four-eyes workflow ✅

| Item | Status |
|---|---|
| Backlog, Assign to me, Back to backlog, peer review, Reviewed → next step | ✅ |
| Business review: claim, groups, share by link/e-mail, sign-off, reauthor | ✅ |
| Review links for guests with invite-only decisions | ✅ |
| Comments on text/image/component, resolve with undo, pin, full-screen feedback | ✅ |
| My tasks with stage tabs, three people per page, admin reassign, reminders | ✅ |
| Notifications bell | ✅ |
| E-mail sending (invites, review links, reminders) | 🟡 opens the user's mail app / nothing is sent |

## Phase 3 — Publishing & governance ✅

| Item | Status |
|---|---|
| Publish now / schedule, files published with the page, bulk publish, fanfare | ✅ |
| Compare authoring version with live | ✅ |
| Archive (restorable) and delete with reference check | ✅ |
| Translations in 4 steps, always through review | ✅ (🟡 glossary instead of MT) |
| Audit log with CSV export; dashboard | ✅ |
| Delivery API (pages, preview, models, assets, markets, templates) | ✅ |
| Scheduled publishing | 🟡 runs when someone opens a CMS screen, not as a job |

## Phase 4 — Production readiness (next) ⬜

Ordered by risk. Each item should get its own `@status:next` feature file.

| # | Item | Why |
|---|---|---|
| 1 | Real SSO (Entra ID / SAML), secure cookies | Anyone can sign in as anyone today |
| 2 | Session check on every `/api/*` call | APIs without a session act as a default user |
| 3 | Server-side permission checks on uploads, asset writes and audit writes | Today only the UI hides them; audit can be deleted |
| 4 | Workflow order enforced on every status change | A direct API call can skip stages |
| 5 | Permission filtering on search and page reads | Search shows pages people cannot read |
| 6 | Real Sling/AEM backend as the system of record | Mock data resets; KV is last-writer-wins |
| 7 | Background job for scheduled publishing | Must not depend on someone opening a screen |
| 8 | E-mail service for invites, review links and reminders | Nothing is sent today |

## Phase 5 — Scale (later) ⬜

| Item | Notes |
|---|---|
| Real environments with promotion dev → test → stage → prod | Today one data set for all |
| AI service (UCP_AI_URL) for free prompts and machine translation, vendor integration | Planner stays as the safe default |
| Forms service UI and form picker | Today a form id field only |
| Delivery API keys, webhooks, `/v1/content/{model}`, binary renditions | Documented, not served |
| Jira two-way sync (status of the ticket on the page) | Today a link only |
| Real-time co-editing presence for several authors | Today authors are assigned, edits are last-save-wins |
| Delivery and usage metrics on the dashboard | Today fixed demo numbers |

## Known inconsistencies found while documenting

| Where | Finding |
|---|---|
| Builder translate dialog | "Send translated pages straight to review" is ignored — translations always go to review (intended, remove the checkbox) |
| Builder | "Review is already done" dialog is never opened (dead code) |
| Publish dialog | UI needs 5 minutes ahead, server publishes immediately under 1 minute |
| ⌘S | Two handlers; one does not check Edit/read-only |
| Version restore | No server-side Edit/lock check |
| Model delete | Does not check entities that use the model |
| Entities from draft models | Blocked in the UI only |
