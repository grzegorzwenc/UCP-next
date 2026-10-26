# HSBC Unified Content Platform — product specification

Reverse-engineered from the working prototype (`ucp-next`, October 2026).
Acceptance criteria are written as Gherkin scenarios (`Given / When / Then`) so they can be read
by the business and turned into automated acceptance tests later.

## 1. Product in one sentence

**One platform where every HSBC market builds, reviews, approves and publishes web content
with the same HSBC components, the same four-eyes workflow and a full audit trail.**

## 2. How this specification is organised

**One source of truth: the epic pages in [`epics/`](epics/).** Everything about an epic and its
stories is written there, and only there. This README and the roadmap only point to them.

```
docs/spec/
├── README.md     this page: overview, epics list, how to create them in Jira
├── ROADMAP.md    what is built, what comes next, build order
└── epics/        one page per Jira Epic (EP-01 … EP-09) — the source of truth
```

Every epic page reads top to bottom:

```
# EP-03 · Page builder
Epic · Business benefit · Scope · list of stories

## US-03.04 · Never lose my work          ← one Jira Story (ID = epic.order)
Business benefit                           two sentences: what the bank gains
User story                                 As a … / I want … / So that …
Persona · Depends on                       stories that must exist first ("is blocked by")
Acceptance criteria                        Scenario 1, Scenario 2, … (Given / When / Then)
```

Stories inside an epic are listed **in build order**. Related requirements are merged into one story
(one goal for one persona); a story is split only when the persona changes.

## 3. Who uses it (personas)

| Persona | Role in UCP | Typical demo account | Main goal |
|---|---|---|---|
| Content author | Author | `content.author`, `elin.llewelyn` | Build pages and send them for review |
| Peer reviewer | Reviewer | `rachel.hughes`, `aisha.khan` | Check pages before the business sees them |
| Business owner | Reviewer (Review only) | `david.clarke`, `maria.santos` | Sign off or send back |
| Publisher | Publisher | `jordan.mensah`, `michael.osei` | Put approved pages live, now or scheduled |
| Site admin | Site admin | `super.admin`, `priya.kaur` | People, permissions, templates, models; can act on behalf |
| Viewer | Viewer | `tunde.boateng` | Read only |
| Guest reviewer | — (review link) | any e-mail | Comment and decide without a UCP account |

## 4. The content lifecycle (the spine of the product)

```
Build the page → Preview → Waiting for author's review assignment (Backlog)
→ Assigned to reviewer → In author's review → Reviewed
→ Waiting for business review assignment → In business review
→ Ready to publish → (Scheduled) → Published
            ↑                                    │
            └──────────── Reauthor ──────────────┘
```

Four-eyes rules: the author never reviews their own page; the peer reviewer never does the
business review; only the assigned person decides; site admins may act, visibly "on behalf of".

### 4.1 Who hands the page to whom

The author does **not** click through the flow. The author requests the next step, the page
travels through other people, and it comes back to the author at the end (or earlier, with
comments, through "Reauthor"). Full story: [EP-04 · Review workflow](epics/EP-04-review-workflow.md) — stories US-04.22 to US-04.26.

```mermaid
sequenceDiagram
  autonumber
  actor A as Content author
  participant B as Backlog
  actor R as Peer reviewer
  actor O as Business owner / group
  actor P as Publisher
  A->>B: Send to author's review (+ note)
  B-->>R: visible to every reviewer except the author
  R->>R: Assign to me · Start review · comment
  alt changes needed
    R-->>A: Reauthor → back to Build the page
  else fine
    R->>O: Send to business review · share (person, group, link)
  end
  O->>O: Assign to me · comment · decide
  alt changes needed
    O-->>A: Reauthor → back to Build the page (both reviews start over)
  else signed off
    O->>P: Ready to publish
  end
  P->>P: Publish now or schedule (files go live with it)
  P-->>A: Page is live · author sees it under Published
```

| Step | Who acts | What the author sees meanwhile |
|---|---|---|
| Build the page | author (and co-authors) | the builder |
| Waiting for author's review assignment | any reviewer except the author | "Waiting for a reviewer to take it" |
| Assigned / In author's review | the assigned peer reviewer | "Remind" |
| Waiting for business review / In business review | a business owner or an invited group | "Remind" |
| Ready to publish / Scheduled | a publisher | "Waiting for a publisher" |
| Published | — | the page under "Published"; Edit starts a new version |

**Site admin is the exception, not the flow.** A site admin sees every action on every step
("Reviewed for …", "Sign off for …", take their own page from the Backlog) so the platform can be
demoed end to end and urgent pages can be unblocked. Each such step is written to the audit log
as "on behalf of". Ordinary users never see buttons for someone else's step (stories marked "site admin only").

## 5. Epics

| # | Epic | Stories | What it covers |
|---|---|---|---|
| EP-01 | [Access & navigation](epics/EP-01-access-and-navigation.md) | 9 | Who you are, where you are, what you may do |
| EP-02 | [Pages](epics/EP-02-pages.md) | 8 | The site tree and safe page operations |
| EP-03 | [Page builder](epics/EP-03-page-builder.md) | 20 | Making a page |
| EP-04 | [Review workflow](epics/EP-04-review-workflow.md) | 26 | Four-eyes approval |
| EP-05 | [Publishing](epics/EP-05-publishing.md) | 6 | Going live safely |
| EP-06 | [Content library](epics/EP-06-content-library.md) | 10 | Reusable building blocks and content |
| EP-07 | [Translations](epics/EP-07-translations.md) | 2 | Language versions through the same workflow |
| EP-08 | [Governance](epics/EP-08-governance.md) | 3 | Proof and overview |
| EP-09 | [Delivery API](epics/EP-09-delivery-api.md) | 3 | Content for every channel |

## 6. Creating the epics and stories in Jira

Copy everything from the epic pages; nothing has to be invented.

**Epics** (create the 9 epics first)

| Jira field | Value |
|---|---|
| Issue type | **Epic** |
| Epic name / Summary | e.g. `EP-03 · Page builder` |
| Team | **WPB Digital Browser: Tools** |
| Description | the epic's **Business benefit** and **Scope** |

**Stories** (same settings for all 87)

| Jira field | Value |
|---|---|
| Issue type | **Story** |
| Story type | **Functional** |
| Sprint | **TBD** |
| Team | **WPB Digital Browser: Tools** |
| Epic Link | the epic the story is under, e.g. `EP-03 · Page builder` |
| Summary | story ID and name, e.g. `US-03.04 · Never lose my work` |
| Description | **Business benefit**, then **User story**, then **Acceptance criteria** |
| Acceptance criteria | **only** the acceptance criteria (Background, if any, and Scenario 1, 2, …) |

- Create the stories in the order they appear on the epic page.
- Record every **Depends on** as an issue link "is blocked by".
- Keep the story ID at the start of the Summary, so a Jira ticket always matches its section on the epic page.

## 7. Glossary

| Term | Meaning |
|---|---|
| Market | A country site (UK, Hong Kong…), grouped into instances (EMEA, APAC, NA) |
| Environment | Development, Test, Staging, Production |
| Component (block) | An HSBC building block such as Masthead, Key facts, Rates table |
| Design pattern | Several components saved together and added in one click |
| Template | The components a new page starts with; can be limited to markets |
| Content model / entity | A content type (e.g. Rate) and one item of it (e.g. ISA rates 2026) |
| Token | `{{alias.field}}` in text, replaced with the entity's value |
| Backlog | Pages sent for review that nobody has taken yet |
| Four eyes | The rule that a different person checks each step |
| Review link | A link that lets people without UCP comment and, if invited, decide |

## 8. Where the behaviour lives in the code

| Area | Files |
|---|---|
| Workflow & permissions | `lib/ucp/perms.ts`, `lib/server/ucp.ts`, `app/api/repo/[...op]/route.ts`, `app/api/ucp/[...op]/route.ts` |
| Page builder | `components/builder/*`, `lib/blocks/*`, `lib/ai/*`, `lib/ucp/insights.ts`, `lib/ucp/tokens.ts` |
| Pages | `components/explorer/*`, `components/pages/*` |
| Tasks & review | `components/tasks/*`, `components/review/*`, `app/review/[token]` |
| Library | `components/templates/*`, `components/assets/*`, `components/models/*`, `components/entities/*` |
| Repository | `lib/repo/*` (mock, Sling, ContentLIBRE adapters; KV shared state on Cloudflare) |
| Tests | `tests/e2e/*` (Playwright, 19 tests) |

See [ROADMAP.md](ROADMAP.md) for what is built, what is a stand-in and what comes next.
