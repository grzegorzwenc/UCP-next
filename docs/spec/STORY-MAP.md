# Story map

Every user story of the specification on one page: in build order inside each feature, with its business benefit and what it depends on.
Generated from the `.feature` files (they stay the source of truth).

Columns: **#** build order inside the feature · **Wave** the earliest build wave across the whole product (wave 1 has no dependencies; a story can start once every story it depends on is done) · 🛡 site-admin story · ⏭ planned.

**87 stories · 28 features · 9 epics · 16 build waves**


## 01 · Access & navigation


### Sign in and sign out
[`01-sign-in.feature`](features/01-access-and-navigation/01-sign-in.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-01.01.1** · Sign in with the company account | content author | Only identified staff can reach the CMS, which closes the door to anonymous changes on customer-facing pages. Every action is tied to a named person, giving auditors a reliable trail. | — | 1 |
| 2 | **US-01.01.2** · Open a review link without an account | guest reviewer | External and occasional reviewers can sign off pages without the bank buying and managing extra CMS licences. Reviews happen sooner because nobody waits for an account to be created. | US-04.04.1 | 14 |
| 3 | **US-01.01.3** · Try the private demo as any person | business owner | Stakeholders can evaluate every role before the bank commits to a rollout, reducing the risk of a costly wrong choice. The demo stays private, so unfinished screens and sample data are never exposed publicly. | US-01.01.1 | 2 |

### Markets, environments and navigation
[`02-markets-and-navigation.feature`](features/01-access-and-navigation/02-markets-and-navigation.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-01.02.1** · Switch between markets | content author | One platform serves every market, so the bank runs and pays for a single CMS instead of one per country. Authors working across markets make fewer wrong-market edits. | — | 1 |
| 2 | **US-01.02.2** · Always know which environment I am in | publisher | Constant visibility of the environment prevents accidental publication to customers, a costly and reputationally damaging incident. Teams can test freely in staging with confidence. | — | 1 |
| 3 | **US-01.02.3** · Reach any screen quickly on any device | content author | Authors spend less time hunting through menus, which raises daily output at no extra cost. The same tool works on laptops and small screens, so work does not stall away from the desk. | — | 1 |

### Roles and permissions
[`03-permissions.feature`](features/01-access-and-navigation/03-permissions.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-01.03.1** · Give each role and workflow step the right permissions | business owner | Approval rights follow the bank's segregation-of-duties rules, which supports regulatory compliance. Sensible defaults also cut the admin effort of setting up each new person. | — | 1 |
| 2 | **US-01.03.2** · Manage people and their permissions 🛡 | site admin | Access can be tailored per folder, so teams work independently without over-privileged accounts. Every grant is logged, which makes access reviews and audits straightforward. | US-01.03.1 | 2 |
| 3 | **US-01.03.3** · Only site admins can change access | business owner | Server-side enforcement closes a privilege-escalation risk that would otherwise undermine every other control. It gives security and audit teams evidence that access rules cannot be bypassed. | US-01.03.2 | 3 |

## 02 · Pages


### Browse and create pages
[`01-browse-and-create.feature`](features/02-pages/01-browse-and-create.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-02.01.1** · Find any page in the market | content author | Authors find the right page in seconds, which saves time on every task across all markets. Fewer duplicate pages get created because existing ones are easy to find. | US-01.03.1 | 2 |
| 2 | **US-02.01.2** · Create pages and folders from on-brand templates | content author | Every new page starts on-brand and market-appropriate, reducing rework and brand-compliance findings in review. Folder permissions keep teams from cluttering areas they do not own. | US-02.01.1, US-06.01.3 | 4 |

### Organise pages (rename, move, copy, duplicate, lock, restore)
[`02-organise-pages.feature`](features/02-pages/02-organise-pages.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-02.02.1** · Know what an action will change before it happens | content author | Clear impact warnings prevent accidental changes to live pages and the customer complaints they cause. Showing only allowed actions also reduces support requests and permission errors. | — | 1 |
| 2 | **US-02.02.2** · Move and copy pages without breaking or overwriting anything | content author | Reorganising the site no longer produces broken links that harm customer experience and search ranking. Colleagues' pages are never overwritten, avoiding lost work and rework. | US-02.02.1, US-02.01.2 | 5 |
| 3 | **US-02.02.3** · Lock a page while I work on it | content author | Locks prevent conflicting edits on sensitive pages while they are being prepared. Reviews and publishing continue, so the lock never delays time-critical releases. | US-02.02.1 | 2 |
| 4 | **US-02.02.4** · Override someone else's lock 🛡 | site admin | Work is never blocked by an absent colleague, which protects deadlines for campaigns and regulatory updates. Keeping the override with site admins keeps it controlled and accountable. | US-02.02.3 | 3 |

### Archive and delete pages
[`03-archive-and-delete.feature`](features/02-pages/03-archive-and-delete.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-02.03.1** · Archive pages instead of deleting them | content author | Making archive the default removes the risk of permanently losing content that may be needed again or for record-keeping. Restoring is quick, saving the cost of rebuilding pages. | — | 1 |
| 2 | **US-02.03.2** · See everything affected before deleting permanently | content author | Showing every affected link and file before deletion prevents broken customer journeys and orphaned documents. Permanent deletion becomes a deliberate, documented decision. | US-02.03.1, US-06.02.1, US-03.05.1 | 4 |

## 03 · Page builder


### Build a page from components
[`01-build-a-page.feature`](features/03-page-builder/01-build-a-page.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-03.01.1** · Add on-brand components from the library | content author | Pages are built only from approved components, so brand and compliance quality is built in rather than checked later. Authors produce pages without developer help, lowering cost and time to market. | US-02.01.2 | 5 |
| 2 | **US-03.01.2** · Edit text where it is shown | content author | Authors see exactly what customers will see, which reduces review rounds caused by layout surprises. Restricting link formats also blocks unsafe links from reaching customers. | US-03.01.1 | 6 |
| 3 | **US-03.01.3** · Arrange and configure every component the same way | content author | One consistent way to configure all components shortens training for new authors. Locking components protects mandatory content such as disclaimers from accidental edits. | US-03.01.1 | 6 |
| 4 | **US-03.01.4** · Never lose my work | content author | Authors never redo work after a closed tab or a lost connection. Fewer lost edits also mean fewer errors slipping into reviewed pages. | US-03.01.2 | 7 |
| 5 | **US-03.01.5** · Check the page on every device width | content author | Problems on mobile and tablet are caught before review, when they are cheapest to fix. Customers get a consistent experience on every device, which protects trust and conversion. | US-03.01.1 | 6 |

### Design patterns
[`02-design-patterns.feature`](features/03-page-builder/02-design-patterns.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-03.02.1** · Reuse a section in one click | content author | Common sections look identical across pages, strengthening brand consistency for customers. Adding a whole section in one click saves authors significant build time. | US-03.01.1 | 6 |
| 2 | **US-03.02.2** · Save my own design pattern | content author | Proven sections are reused instead of rebuilt, spreading good practice across teams and markets. Market targeting stops a pattern from appearing where it does not fit local rules. | US-03.02.1, US-03.01.3 | 7 |
| 3 | **US-03.02.3** · Remove my patterns safely | content author | The pattern library stays tidy without risking pages that already use a pattern. Two-step removal prevents losing valuable shared work by mistake. | US-03.02.2 | 8 |
| 4 | **US-03.02.4** · Remove built-in design-system patterns 🛡 | site admin | Outdated design-system sections can be retired centrally, so new pages do not reuse superseded designs. Restricting this to site admins protects the shared library from accidental removal. | US-03.02.3 | 9 |

### Page insights and quality checklist
[`03-quality-and-insights.feature`](features/03-page-builder/03-quality-and-insights.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-03.03.1** · See and fix what blocks publishing | content author | Automatic checks catch accessibility, compliance and SEO issues before review, reducing regulatory and reputational risk. Reviewers spend their time on substance rather than mechanical mistakes. | US-03.01.2 | 7 |
| 2 | **US-03.03.2** · Check any element while previewing | content author | Authors verify each element in the context customers see, catching issues earlier and more cheaply. A consistent checklist raises the baseline quality of every page. | US-03.01.5, US-06.02.2 | 7 |

### AI assistant
[`04-ai-assistant.feature`](features/03-page-builder/04-ai-assistant.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-03.04.1** · Improve one component with AI | content author | AI speeds up copy improvements while the author keeps full control over every change. Showing before and after prevents unreviewed AI text from reaching customers. | US-03.01.3 | 7 |
| 2 | **US-03.04.2** · Let AI plan page-wide changes that I approve | content author | Page-wide changes such as accessibility or SEO fixes take minutes instead of hours. Approval and undo for each change keep accountability with the author and limit the risk of AI errors. | US-03.01.4 | 8 |
| 3 | **US-03.04.3** · Keep AI within page permissions | business owner | AI cannot become a loophole around the bank's access controls, which protects content integrity. This gives risk and compliance teams confidence to approve AI use. | US-03.04.2 | 9 |

### Linked content (entities and tokens)
[`05-linked-content.feature`](features/03-page-builder/05-linked-content.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-03.05.1** · Show shared content from one place | content author | Rates and product details are maintained once and update everywhere, cutting maintenance effort. It removes the risk of customers seeing outdated or conflicting figures on different pages. | US-06.03.2 | 3 |
| 2 | **US-03.05.2** · Keep page text and linked content consistent | content author | Broken or missing shared content is flagged before it reaches customers, protecting accuracy of regulated information. Authors can still detach content deliberately, with a clear trace. | US-03.05.1 | 4 |

### Working together on a page (authors, Jira, versions)
[`06-collaboration.feature`](features/03-page-builder/06-collaboration.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-03.06.1** · Build a page together with other authors | content author | Larger pages are delivered faster because several authors can share the work. Clear ownership means reviewers and managers always know who is responsible. | US-02.01.2 | 5 |
| 2 | **US-03.06.2** · Assign other people as authors 🛡 | site admin | Managers can hand out work deliberately and keep delivery on schedule. Every assignment is logged and limited to people with Edit, keeping access controlled. | US-03.06.1 | 6 |
| 3 | **US-03.06.3** · Link a page to its Jira ticket | content author | Every page change is traceable to the business request behind it, which supports audit and change management. Reviewers reach the context in one click, speeding up approval. | — | 1 |
| 4 | **US-03.06.4** · Go back to any earlier version | content author | Any mistake can be reversed quickly, limiting the impact of an incorrect change. A full version history supports audit and regulatory record-keeping. | US-03.01.4 | 8 |

## 04 · Review workflow


### End-to-end journey of a page (who hands it to whom)
[`00-end-to-end-handoffs.feature`](features/04-review-workflow/00-end-to-end-handoffs.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-04.00.1** · Hand the page over step by step | content author | Every page passes through separate authoring, review, sign-off and publishing hands, which builds four-eyes control into the process itself. Clear hand-offs cut idle time between teams and shorten time to market. | US-04.01.1, US-04.02.2, US-04.03.2, US-05.01.1 | 14 |
| 2 | **US-04.00.2** · Get the page back when someone asks for changes | content author | Rework goes back to one accountable author instead of being patched by reviewers, which keeps responsibility clear. Restarting both reviews after changes means no unchecked edit can reach customers. | US-04.00.1 | 15 |
| 3 | **US-04.00.3** · Nobody approves their own work | the bank | Segregation of duties is enforced by the system rather than by policy documents, which satisfies four-eyes compliance requirements. Auditors can rely on the platform instead of sampling manual evidence. | US-04.00.1 | 15 |
| 4 | **US-04.00.4** · Walk the whole flow as a site admin, on record 🛡 | site admin | Urgent regulatory or pricing changes can still go live when reviewers are unavailable, which reduces business risk. Every override is recorded as on behalf of a named person, so audit trails stay complete. | US-04.00.1, US-04.00.3 | 16 |
| 5 | **US-04.00.5** · Ask for publishing and hear when the page is live ⏭ | content author | Planned launch dates reduce last-minute coordination between marketing and publishers. Authors learn when a page is live without chasing anyone, which saves time and avoids missed campaign starts. | US-04.00.1 | 15 |

### Send a page for the author's review
[`01-send-for-review.feature`](features/04-review-workflow/01-send-for-review.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-04.01.1** · Request a review from the shared Backlog | content author | A shared Backlog lets the first free reviewer start, so pages do not queue behind one person's calendar. Due dates and audit entries make review turnaround measurable from day one. | US-03.01.4, US-01.03.1 | 8 |
| 2 | **US-04.01.2** · Check the page before handing it over | content author | Catching missing fields and quality problems before hand-off avoids wasted review cycles. Fewer round trips mean faster delivery and lower review cost. | US-04.01.1, US-03.03.1 | 9 |
| 3 | **US-04.01.3** · Keep the page stable while it is being reviewed | content author | Reviewers approve exactly the version that will be published, which protects the integrity of the four-eyes check. It prevents silent changes after approval that could expose the bank to conduct risk. | US-04.01.1 | 9 |

### Author's (peer) review
[`02-peer-review.feature`](features/04-review-workflow/02-peer-review.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-04.02.1** · Take a review from the Backlog, or give it back | peer reviewer | Reviews start as soon as any reviewer is free, so pages do not wait for one person. Each review has one named owner, which makes delays visible. | US-04.01.1 | 9 |
| 2 | **US-04.02.2** · Review the page and decide what happens next | peer reviewer | A single decision point moves the page on or back without extra meetings or e-mails. Only the assigned reviewer can approve, which keeps the peer check accountable and auditable. | US-04.02.1 | 10 |
| 3 | **US-04.02.3** · Nudge a reviewer who is taking long | content author | Rate-limited reminders keep pages moving without manual chasing or noisy escalation. Shorter waiting times bring content to market faster. | US-04.02.1 | 10 |
| 4 | **US-04.02.4** · Steer reviews as a site admin 🛡 | site admin | Admins can rebalance workload and unblock stuck reviews, which protects launch dates. Every intervention is logged on behalf of the reviewer, so oversight never weakens the audit trail. | US-04.02.1, US-04.02.2 | 11 |

### Business review and sign-off
[`03-business-review.feature`](features/04-review-workflow/03-business-review.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-04.03.1** · Take the business review | business owner | Each business decision has one named owner, which gives clear accountability for customer-facing messages. Blocking the peer reviewer from also signing off enforces four-eyes separation. | US-04.02.2 | 11 |
| 2 | **US-04.03.2** · Sign off the page or send it back to the author | business owner | Nothing reaches customers without explicit business approval, which reduces conduct and mis-selling risk. Deciding on the page as customers see it lowers the chance of costly post-launch corrections. | US-04.03.1 | 12 |
| 3 | **US-04.03.3** · Share the page with the right business reviewers | peer reviewer | Getting the right stakeholders in early avoids late rejections and repeated review rounds. External partners can contribute without new UCP licences, which keeps cost down. | US-04.03.1 | 12 |
| 4 | **US-04.03.4** · Sign off on behalf of the business reviewer as a site admin 🛡 | site admin | Keeping the business reviewer fixed protects the integrity of the business decision. Recorded on-behalf sign-off still lets urgent pages move without breaking the audit trail. | US-04.03.1, US-04.03.2 | 13 |

### Review links for people without UCP access
[`04-review-links.feature`](features/04-review-workflow/04-review-links.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-04.04.1** · Read and comment through a link | guest reviewer | Stakeholders without a UCP account can give feedback, which saves licence cost and onboarding effort. Feedback lands on the page itself, so nothing is lost in e-mail threads. | US-04.03.3 | 13 |
| 2 | **US-04.04.2** · Decide through the link, only if invited | guest reviewer who was invited | The business can approve without a UCP account, which speeds up sign-off for busy owners. Restricting decisions to invited addresses stops forwarded links from approving content, which limits fraud and compliance risk. | US-04.04.1 | 14 |

### Comments on a page
[`05-comments.feature`](features/04-review-workflow/05-comments.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-04.05.1** · Comment on exactly what I mean | peer reviewer or business owner | Feedback pinned to the exact element removes ambiguity and reduces rework. Limiting who can comment keeps feedback relevant and the review record trustworthy. | US-04.02.2 | 11 |
| 2 | **US-04.05.2** · Work through the feedback | content author | Authors see at a glance what is still open, so no requested change is missed before sign-off. Resolved comments never leak onto the published page, which protects the customer experience. | US-04.05.1 | 12 |

### My tasks
[`06-my-tasks.feature`](features/04-review-workflow/06-my-tasks.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-04.06.1** · See what needs me, by stage | anyone in the content team | One prioritised work list reduces time lost looking for pending work across tools. Due dates and overdue markers make bottlenecks visible to the team and management. | US-04.01.1 | 9 |
| 2 | **US-04.06.2** · Follow my own pages as an author | content author | Authors can track their pages without asking around, which reduces status meetings. Hiding review actions on their own work enforces four-eyes separation in the interface. | US-04.06.1 | 10 |
| 3 | **US-04.06.3** · Pick up and finish work as a reviewer or publisher | peer reviewer, business owner or publisher | Taking and finishing work from one list shortens cycle time for every hand-off. Showing only the permitted action reduces errors and unauthorised steps. | US-04.06.1 | 10 |
| 4 | **US-04.06.4** · Oversee everything as a site admin 🛡 | site admin | Admins can balance workload across reviewers, which protects delivery dates. Restricting reassignment once a page is ready to publish keeps late changes under control. | US-04.06.1, US-04.06.3 | 11 |

### Notifications
[`07-notifications.feature`](features/04-review-workflow/07-notifications.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-04.07.1** · Be told when a page is handed to me | anyone in the content team | People learn immediately when it is their turn, which removes idle time between hand-offs. Faster hand-offs shorten time to market for every page. | US-04.06.1 | 10 |
| 2 | **US-04.07.2** · Act on a notification in one click | anyone in the content team | Overdue items stand out, so service levels and regulatory deadlines are met more reliably. One-click access cuts the time from notice to action. | US-04.07.1 | 11 |

## 05 · Publishing


### Publish and schedule pages
[`01-publish-and-schedule.feature`](features/05-publishing/01-publish-and-schedule.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-05.01.1** · Publish a signed-off page now, together with its files | publisher | Approved pages reach customers in one controlled step instead of a chain of manual releases. Publishing the files with the page removes broken pictures and missing documents that damage customer trust. | US-04.03.2, US-06.02.4 | 13 |
| 2 | **US-05.01.2** · Publish later at a chosen time | publisher | Campaigns and rate changes go live at the agreed minute without anyone working out of hours. Fewer manual late-night releases also means fewer publishing mistakes and lower overtime cost. | US-05.01.1 | 14 |
| 3 | **US-05.01.3** · Publish several pages in one go | publisher | Related pages of a launch go live together, so customers never see half of a product release. Per-page results cut the time spent finding out what was held back and why. | US-05.01.1 | 14 |
| 4 | **US-05.01.4** · Hand a signed-off page over to the publisher | content author | Keeping publishing with authorised publishers enforces separation of duties that auditors and regulators expect. Clear hand-over status reduces chasing between teams and shortens time to market. | US-05.01.1 | 14 |

### Compare an authoring version with the live page
[`02-compare-with-live.feature`](features/05-publishing/02-compare-with-live.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-05.02.1** · See what will change before publishing | publisher | Publishers catch unintended changes before customers see them, lowering the risk of wrong rates or terms going live. A clear list of differences makes sign-off faster and easier to evidence. | US-05.01.1, US-03.06.4 | 14 |
| 2 | **US-05.02.2** · Check an older version against live | content author | The bank can quickly establish when a change was made and what customers were shown at the time. This supports complaint handling and regulatory enquiries without costly investigation. | US-05.02.1 | 15 |

## 06 · Content library


### Page templates
[`01-templates.feature`](features/06-content-library/01-templates.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-06.01.1** · Build and maintain page templates 🛡 | site admin | Every page type starts from an approved structure with mandatory brand and navigation parts, so brand and compliance consistency is built in. New pages are created faster, cutting time to market. | — | 1 |
| 2 | **US-06.01.2** · Limit a template to some markets 🛡 | site admin | Market-specific layouts cannot be reused by markets they were not approved for, reducing local regulatory and brand risk. Central teams can share templates safely without extra manual checks. | US-06.01.1 | 2 |
| 3 | **US-06.01.3** · Pick the right template for my market | content author | Authors start from approved, market-appropriate templates instead of improvising layouts, which lowers rework and review effort. Read-only access protects templates from accidental change. | US-06.01.1, US-06.01.2 | 3 |

### Assets (images and documents)
[`02-assets.feature`](features/06-content-library/02-assets.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-06.02.1** · Upload and replace files safely | content author | Files can be updated without breaking live pages, protecting the customer experience and the bank's reputation. Automatic renaming prevents costly overwrites of approved material. | — | 1 |
| 2 | **US-06.02.2** · Make files accessible | content author | Recording alt text and document accessibility details helps the bank meet its accessibility obligations and avoid legal risk. Customers using assistive technology get the same information as everyone else. | US-06.02.1 | 2 |
| 3 | **US-06.02.3** · Find the right file | content author | Reusing approved files avoids duplicate purchases and repeated approvals, lowering cost. Smart views surface unused and inaccessible files so problems are fixed before audits find them. | US-06.02.1, US-06.02.2 | 3 |
| 4 | **US-06.02.4** · Approve files for live use | publisher | Only approved files can appear on live pages, reducing brand, legal and compliance risk. The publish record shows who approved each file and when, supporting audits. | US-06.02.1 | 2 |

### Content models and content entities
[`03-models-and-entities.feature`](features/06-content-library/03-models-and-entities.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-06.03.1** · Define and evolve content models 🛡 | site admin | Structured, validated content types give every channel consistent data and reduce errors in key facts. Guarded breaking changes protect live content and avoid costly outages. | — | 1 |
| 2 | **US-06.03.2** · Create reusable content items from a model | content author | Facts such as rates are entered once, so the bank avoids inconsistent figures that could mislead customers. Blocking deletion of items in use prevents broken pages. | US-06.03.1 | 2 |
| 3 | **US-06.03.3** · Update a fact everywhere at once | content author | A rate change reaches every page and channel at the same moment, lowering conduct risk from outdated figures. It removes the cost of editing many pages by hand. | US-06.03.2, US-03.05.1 | 4 |

## 07 · Translations


### Translate pages
[`01-translate-pages.feature`](features/07-translations/01-translate-pages.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-07.01.1** · Create translated copies of pages in a few steps | content author | Pages reach every language of a market far faster than copying them by hand, shortening time to market. Wider language coverage improves access for customers and supports local language requirements. | US-02.01.1 | 3 |
| 2 | **US-07.01.2** · Review every language version before it goes live | business owner | Translations get the same checks as originals, so no unverified wording about products or terms reaches customers. This keeps the bank compliant in every language it publishes. | US-07.01.1, US-04.01.1 | 9 |

## 08 · Governance


### Audit log and dashboard
[`01-audit-and-dashboard.feature`](features/08-governance/01-audit-and-dashboard.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-08.01.1** · Search and export a full audit trail 🛡 | site admin | The bank can answer auditors and regulators with complete evidence of who changed what and when. Fast search and CSV export cut the cost of compliance reviews. | US-01.03.1 | 2 |
| 2 | **US-08.01.2** · See my own activity | content author | Staff can check their own work without seeing colleagues' activity, respecting need-to-know access. Fewer support requests to admins lowers operating cost. | US-08.01.1 | 3 |
| 3 | **US-08.01.3** · See what needs attention | content author | Waiting reviews and failed publishes are spotted early, so content reaches customers on time. Managers get a quick view of throughput without manual reporting. | US-08.01.1, US-04.06.1 | 10 |

## 09 · Delivery API


### Content delivery API
[`01-delivery-api.feature`](features/09-delivery-api/01-delivery-api.feature)

| # | Story | Persona | Business benefit | Depends on | Wave |
|---|---|---|---|---|---|
| 1 | **US-09.01.1** · Get only approved content, and preview drafts separately | front-end developer | Only approved content can reach customers through any channel, reducing the risk of leaking unreleased offers. Separate previews let teams test upcoming pages without affecting live sites. | US-05.01.1 | 14 |
| 2 | **US-09.01.2** · Render pages straight from the JSON | front-end developer | All websites and apps show the same approved content from one source, cutting duplicate work across channels. Ready-to-use JSON and schemas shorten integration time and reduce rendering errors. | US-09.01.1, US-03.05.1, US-06.02.1 | 15 |
| 3 | **US-09.01.3** · Explore and try the API in the CMS | front-end developer | Developers integrate new channels faster without waiting for separate documentation. Self-service exploration lowers support effort and time to market. | US-09.01.1, US-09.01.2 | 16 |

## Build waves (whole product)

Stories that can be built in parallel once the previous waves are done.

**Wave 1** — US-01.01.1 Sign in with the company account · US-01.02.1 Switch between markets · US-01.02.2 Always know which environment I am in · US-01.02.3 Reach any screen quickly on any device · US-01.03.1 Give each role and workflow step the right permissions · US-02.02.1 Know what an action will change before it happens · US-02.03.1 Archive pages instead of deleting them · US-03.06.3 Link a page to its Jira ticket · US-06.01.1 Build and maintain page templates · US-06.02.1 Upload and replace files safely · US-06.03.1 Define and evolve content models

**Wave 2** — US-01.01.3 Try the private demo as any person · US-01.03.2 Manage people and their permissions · US-02.01.1 Find any page in the market · US-02.02.3 Lock a page while I work on it · US-06.01.2 Limit a template to some markets · US-06.02.2 Make files accessible · US-06.02.4 Approve files for live use · US-06.03.2 Create reusable content items from a model · US-08.01.1 Search and export a full audit trail

**Wave 3** — US-01.03.3 Only site admins can change access · US-02.02.4 Override someone else's lock · US-03.05.1 Show shared content from one place · US-06.01.3 Pick the right template for my market · US-06.02.3 Find the right file · US-07.01.1 Create translated copies of pages in a few steps · US-08.01.2 See my own activity

**Wave 4** — US-02.01.2 Create pages and folders from on-brand templates · US-02.03.2 See everything affected before deleting permanently · US-03.05.2 Keep page text and linked content consistent · US-06.03.3 Update a fact everywhere at once

**Wave 5** — US-02.02.2 Move and copy pages without breaking or overwriting anything · US-03.01.1 Add on-brand components from the library · US-03.06.1 Build a page together with other authors

**Wave 6** — US-03.01.2 Edit text where it is shown · US-03.01.3 Arrange and configure every component the same way · US-03.01.5 Check the page on every device width · US-03.02.1 Reuse a section in one click · US-03.06.2 Assign other people as authors

**Wave 7** — US-03.01.4 Never lose my work · US-03.02.2 Save my own design pattern · US-03.03.1 See and fix what blocks publishing · US-03.03.2 Check any element while previewing · US-03.04.1 Improve one component with AI

**Wave 8** — US-03.02.3 Remove my patterns safely · US-03.04.2 Let AI plan page-wide changes that I approve · US-03.06.4 Go back to any earlier version · US-04.01.1 Request a review from the shared Backlog

**Wave 9** — US-03.02.4 Remove built-in design-system patterns · US-03.04.3 Keep AI within page permissions · US-04.01.2 Check the page before handing it over · US-04.01.3 Keep the page stable while it is being reviewed · US-04.02.1 Take a review from the Backlog, or give it back · US-04.06.1 See what needs me, by stage · US-07.01.2 Review every language version before it goes live

**Wave 10** — US-04.02.2 Review the page and decide what happens next · US-04.02.3 Nudge a reviewer who is taking long · US-04.06.2 Follow my own pages as an author · US-04.06.3 Pick up and finish work as a reviewer or publisher · US-04.07.1 Be told when a page is handed to me · US-08.01.3 See what needs attention

**Wave 11** — US-04.02.4 Steer reviews as a site admin · US-04.03.1 Take the business review · US-04.05.1 Comment on exactly what I mean · US-04.06.4 Oversee everything as a site admin · US-04.07.2 Act on a notification in one click

**Wave 12** — US-04.03.2 Sign off the page or send it back to the author · US-04.03.3 Share the page with the right business reviewers · US-04.05.2 Work through the feedback

**Wave 13** — US-04.03.4 Sign off on behalf of the business reviewer as a site admin · US-04.04.1 Read and comment through a link · US-05.01.1 Publish a signed-off page now, together with its files

**Wave 14** — US-01.01.2 Open a review link without an account · US-04.00.1 Hand the page over step by step · US-04.04.2 Decide through the link, only if invited · US-05.01.2 Publish later at a chosen time · US-05.01.3 Publish several pages in one go · US-05.01.4 Hand a signed-off page over to the publisher · US-05.02.1 See what will change before publishing · US-09.01.1 Get only approved content, and preview drafts separately

**Wave 15** — US-04.00.2 Get the page back when someone asks for changes · US-04.00.3 Nobody approves their own work · US-04.00.5 Ask for publishing and hear when the page is live · US-05.02.2 Check an older version against live · US-09.01.2 Render pages straight from the JSON

**Wave 16** — US-04.00.4 Walk the whole flow as a site admin, on record · US-09.01.3 Explore and try the API in the CMS
