# HSBC Unified Content Platform — product specification

Reverse-engineered from the working prototype (`ucp-next`, October 2026).
Behaviour is written in Gherkin (`Given / When / Then`) so it can be read by the business
and turned into automated acceptance tests later.

## 1. Product in one sentence

**One platform where every HSBC market builds, reviews, approves and publishes web content
with the same HSBC components, the same four-eyes workflow and a full audit trail.**

## 2. Hierarchy

```
Product  ─ HSBC Unified Content Platform
 └─ Epic        (9)   a business capability, e.g. "Review workflow"
     └─ Feature (27)  one .feature file, e.g. "Business review and sign-off"
         └─ Rule        a business rule inside the feature
             └─ Scenario  one concrete example (Given / When / Then)
```

Tags on every feature: `@epic:<name>`, `@status:done | next | later`, and `@mock` where the
prototype uses a stand-in (SSO, AI).

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

## 5. Epics and features

| # | Epic | Features (files) | What it covers |
|---|---|---|---|
| 01 | [Access & navigation](features/01-access-and-navigation) | sign-in · markets & navigation · permissions | Who you are, where you are, what you may do |
| 02 | [Pages](features/02-pages) | browse & create · organise · archive & delete | The site tree and safe page operations |
| 03 | [Page builder](features/03-page-builder) | build a page · design patterns · quality & insights · AI assistant · linked content · collaboration | Making a page |
| 04 | [Review workflow](features/04-review-workflow) | send for review · peer review · business review · review links · comments · My tasks · notifications | Four-eyes approval |
| 05 | [Publishing](features/05-publishing) | publish & schedule · compare with live | Going live safely |
| 06 | [Content library](features/06-content-library) | templates · assets · models & entities | Reusable building blocks and content |
| 07 | [Translations](features/07-translations) | translate pages | Language versions through the same workflow |
| 08 | [Governance](features/08-governance) | audit log & dashboard | Proof and overview |
| 09 | [Delivery API](features/09-delivery-api) | delivery API | Content for every channel |

## 6. Glossary

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

## 7. Where the truth lives in the code

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
