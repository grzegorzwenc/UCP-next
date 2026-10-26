# Story map

## Creating these stories in Jira

Use these settings for **every** story in this map:

| Jira field | Value |
|---|---|
| Issue type | **Story** |
| Story type | **Functional** |
| Sprint | **TBD** |
| Team | **WPB Digital Browser: Tools** |
| Summary | Story ID and name, e.g. `US-03.01.4 · Never lose my work` |
| Description | Three parts, in this order: **Business benefit** (the two sentences), **User story** (As a / I want / So that), **Acceptance criteria** (the scenarios) |
| Acceptance criteria | **Only** the acceptance criteria (the Given / When / Then scenarios of the story) |

**Description template**

```
Business benefit
<the two sentences from "# Business benefit:">

User story
As a <persona>
I want <capability>
So that <value>

Acceptance criteria
Scenario: …
  Given …
  When …
  Then …
```

**Acceptance criteria field template**

```
Scenario: …
  Given …
  When …
  Then …
```

Notes
- Copy the acceptance criteria exactly from the `.feature` file of the story (linked under each feature below); `Scenario Outline` tables go in as they are.
- Create the stories in the order of this map; record each `Depends on` as an issue link "is blocked by" to the story it names.
- Keep the story ID at the start of the Summary, so Jira tickets and the `.feature` files can always be matched.

## How to read a story

Every story below is one Jira Story, shown the way it is filled in: **ID · name**, **persona**, **business benefit**, **user story**, then the **acceptance criteria**. `Depends on` = create as "is blocked by" links. **Wave** = earliest build wave across the whole product (wave 1 needs nothing; a story can start once everything it depends on is done). 🛡 site-admin story · ⏭ planned, not built yet.

**87 stories · 28 features · 9 epics · 16 build waves.** Generated from the `.feature` files with `python3 tools/story-map.py` — edit the features, then regenerate.

## Contents

- [01 · Access & navigation](#01--access--navigation)
- [02 · Pages](#02--pages)
- [03 · Page builder](#03--page-builder)
- [04 · Review workflow](#04--review-workflow)
- [05 · Publishing](#05--publishing)
- [06 · Content library](#06--content-library)
- [07 · Translations](#07--translations)
- [08 · Governance](#08--governance)
- [09 · Delivery API](#09--delivery-api)

---

## 01 · Access & navigation

### Feature: Sign in and sign out
Source: [`01-sign-in.feature`](features/01-access-and-navigation/01-sign-in.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-01.01.1 · Sign in with the company account | content author | — | 1 |
| 2 | US-01.01.2 · Open a review link without an account | guest reviewer | US-04.04.1 | 14 |
| 3 | US-01.01.3 · Try the private demo as any person | business owner | US-01.01.1 | 2 |

#### US-01.01.1 · Sign in with the company account

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | — |
| Build wave | 1 |

**Business benefit**

Only identified staff can reach the CMS, which closes the door to anonymous changes on customer-facing pages. Every action is tied to a named person, giving auditors a reliable trail.

**User story**

> As a content author  
> I want to sign in with my company account and land where I was going  
> So that UCP knows who I am and only signed-in people reach the CMS  

**Acceptance criteria**

```gherkin
Scenario: Opening a screen without a session
  Given I am not signed in
  When I open "/uk/prod/pages"
  Then I am sent to "/login?next=/uk/prod/pages"

Scenario: Sign in with company SSO
  Given I am on "/login?next=/uk/prod/pages"
  When I click "Sign in with company SSO" and choose "Super admin"
  Then I am on "/uk/prod/pages"
  And the audit log says "signed in (SSO stand-in)"

Scenario: Only internal addresses are followed
  Given the login link says "next=//evil.example"
  When I sign in
  Then I am on "/uk/prod/dashboard"

Scenario: Sign out
  When I open the account menu and click "Sign out"
  Then I am on the login screen

Scenario: Session length
  Then a session lasts 12 hours
```

#### US-01.01.2 · Open a review link without an account

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | guest reviewer |
| Depends on | US-04.04.1 |
| Build wave | 14 |

**Business benefit**

External and occasional reviewers can sign off pages without the bank buying and managing extra CMS licences. Reviews happen sooner because nobody waits for an account to be created.

**User story**

> As a guest reviewer  
> I want to open a review link without signing in  
> So that I can give feedback on a page without a CMS account  

**Acceptance criteria**

```gherkin
Scenario: Review links do not need a session
  When I open a review link "/review/<token>"
  Then the page opens without signing in
```

#### US-01.01.3 · Try the private demo as any person

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | business owner |
| Depends on | US-01.01.1 |
| Build wave | 2 |

**Business benefit**

Stakeholders can evaluate every role before the bank commits to a rollout, reducing the risk of a costly wrong choice. The demo stays private, so unfinished screens and sample data are never exposed publicly.

**User story**

> As a business owner  
> I want the hosted demo kept behind a password and to try it as any demo person  
> So that I can evaluate every role without exposing the demo to the public  

**Acceptance criteria**

```gherkin
Scenario: The hosted demo is behind a password
  Given the demo password is configured
  When I open any address of the demo without it
  Then the browser asks for a user name and password
  And search engines are told not to index the demo

Scenario: Demo accounts
  When I open "/login?demo=1"
  Then every demo person is listed with their role and team
```

### Feature: Markets, environments and navigation
Source: [`02-markets-and-navigation.feature`](features/01-access-and-navigation/02-markets-and-navigation.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-01.02.1 · Switch between markets | content author | — | 1 |
| 2 | US-01.02.2 · Always know which environment I am in | publisher | — | 1 |
| 3 | US-01.02.3 · Reach any screen quickly on any device | content author | — | 1 |

#### US-01.02.1 · Switch between markets

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | — |
| Build wave | 1 |

**Business benefit**

One platform serves every market, so the bank runs and pays for a single CMS instead of one per country. Authors working across markets make fewer wrong-market edits.

**User story**

> As a content author  
> I want to pick an instance and market and switch market without losing my place  
> So that I can work across several countries on one platform without confusion  

**Acceptance criteria**

```gherkin
Scenario Outline: Instances
  When I choose the instance "<instance>"
  Then the market list shows <markets>

  Examples:
    | instance | markets              |
    | EMEA     | UK, France, Germany, UAE |
    | APAC     | Hong Kong, Singapore |
    | NA       | Mexico               |

Scenario: Switching market keeps my place
  Given I am on Pages in the UK
  When I switch to "HSBC France"
  Then I am on Pages in France
```

#### US-01.02.2 · Always know which environment I am in

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | publisher |
| Depends on | — |
| Build wave | 1 |

**Business benefit**

Constant visibility of the environment prevents accidental publication to customers, a costly and reputationally damaging incident. Teams can test freely in staging with confidence.

**User story**

> As a publisher  
> I want the environment and its consequences always visible  
> So that I never publish to customers by mistake  

**Acceptance criteria**

```gherkin
Scenario Outline: Environment note
  When I choose "<environment>"
  Then the dashboard says "<note>"

  Examples:
    | environment | note                                              |
    | Production  | Publishing here goes live for customers.          |
    | Staging     | Nothing in this environment reaches customers.    |
```

#### US-01.02.3 · Reach any screen quickly on any device

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | — |
| Build wave | 1 |

**Business benefit**

Authors spend less time hunting through menus, which raises daily output at no extra cost. The same tool works on laptops and small screens, so work does not stall away from the desk.

**User story**

> As a content author  
> I want a command palette, a global search and a menu that fits my screen  
> So that every page and section is a couple of keystrokes away  

**Acceptance criteria**

```gherkin
Scenario: Command palette
  When I press ⌘ K
  Then I can find pages and go to any section
  And in the page builder I can ask AI or add a component from it
  And Tab stays inside the palette and Esc returns focus to where I was

Scenario: Global search
  When I type "isa" into the top search
  Then I see up to 8 pages, 5 assets, 4 people, 3 templates and 3 models
  And Enter opens the first result

Scenario Outline: Side menu
  Given my screen is <width>
  Then the side menu is <behaviour>

  Examples:
    | width                 | behaviour                                   |
    | 1100 px or wider      | full, and I can collapse it to icons        |
    | 768 to 1099 px        | icons only                                  |
    | narrower than 768 px  | hidden behind ☰ and opens as a drawer       |
```

### Feature: Roles and permissions
Source: [`03-permissions.feature`](features/01-access-and-navigation/03-permissions.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-01.03.1 · Give each role and workflow step the right permissions | business owner | — | 1 |
| 2 | US-01.03.2 · Manage people and their permissions 🛡 | site admin | US-01.03.1 | 2 |
| 3 | US-01.03.3 · Only site admins can change access | business owner | US-01.03.2 | 3 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given the permissions are Read, Edit, Review & approve, Publish and Manage
  And they are granted on the whole site or on a top-level folder
```

#### US-01.03.1 · Give each role and workflow step the right permissions

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | business owner |
| Depends on | — |
| Build wave | 1 |

**Business benefit**

Approval rights follow the bank's segregation-of-duties rules, which supports regulatory compliance. Sensible defaults also cut the admin effort of setting up each new person.

**User story**

> As a business owner  
> I want each role to come with sensible defaults and each workflow step to need its permission  
> So that only qualified people edit, approve and publish content  

**Acceptance criteria**

```gherkin
Scenario Outline: Role defaults
  Given a person with the role "<role>" and no individual grants
  Then they can <permissions>

  Examples:
    | role       | permissions                              |
    | Author     | read and edit                            |
    | Reviewer   | read, edit and review                    |
    | Publisher  | read, review and publish                 |
    | Site admin | do everything                            |
    | Viewer     | read                                     |

Scenario Outline: Status changes
  When someone moves a page to "<status>"
  Then they need <permission>

  Examples:
    | status                    | permission         |
    | Build the page (draft)    | Edit               |
    | Waiting for review        | Edit               |
    | In author's review        | Review & approve   |
    | Ready to publish          | Review & approve   |
    | Scheduled / Published     | Publish            |
```

#### US-01.03.2 · Manage people and their permissions 🛡

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | site admin |
| Depends on | US-01.03.1 |
| Build wave | 2 |

**Business benefit**

Access can be tailored per folder, so teams work independently without over-privileged accounts. Every grant is logged, which makes access reviews and audits straightforward.

**User story**

> As a site admin  
> I want to invite people and grant them permissions on the right folders  
> So that everyone has exactly the access their job needs  

**Acceptance criteria**

```gherkin
Scenario: Granting a permission
  Given I am a site admin on "Users & roles"
  When I click "Edit" on the "Banking" row for "anna.kowalczyk"
  Then she has Edit on Banking and also Read there
  And the audit log says "gave Anna Kowalczyk Edit on Banking"

Scenario: Inherited permissions
  Given "rachel.hughes" has Review on the whole site
  Then each folder row shows Review as "Inherited from whole site"

Scenario: Inviting a person
  When I invite "Sam Taylor" as an Author
  Then the sign-in id is "sam.taylor"
  And they get the Author permissions on the whole site
```

#### US-01.03.3 · Only site admins can change access

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | business owner |
| Depends on | US-01.03.2 |
| Build wave | 3 |

**Business benefit**

Server-side enforcement closes a privilege-escalation risk that would otherwise undermine every other control. It gives security and audit teams evidence that access rules cannot be bypassed.

**User story**

> As a business owner  
> I want only site admins to change users and permissions, enforced on screen and on the server  
> So that nobody can grant themselves more than they should have  

**Acceptance criteria**

```gherkin
Scenario: Non-admins see only themselves
  Given I am signed in as "content.author"
  When I open "Users & roles"
  Then I see only my own profile
  And "Only site admins can change users and permissions"

Scenario: The server refuses changes from non-admins
  Given I am a viewer
  When I save components of a page or change a user
  Then the answer is 403 with a request id
```

---

## 02 · Pages

### Feature: Browse and create pages
Source: [`01-browse-and-create.feature`](features/02-pages/01-browse-and-create.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-02.01.1 · Find any page in the market | content author | US-01.03.1 | 2 |
| 2 | US-02.01.2 · Create pages and folders from on-brand templates | content author | US-02.01.1, US-06.01.3 | 4 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given I am signed in to the "HSBC UK" market in "Production"
```

#### US-02.01.1 · Find any page in the market

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-01.03.1 |
| Build wave | 2 |

**Business benefit**

Authors find the right page in seconds, which saves time on every task across all markets. Fewer duplicate pages get created because existing ones are easy to find.

**User story**

> As a content author  
> I want to browse the folder tree and search the whole market  
> So that I quickly find the page I need to work on  

**Acceptance criteria**

```gherkin
Scenario: Browsing folders
  When I open Pages
  Then I see the folder tree on the left and the pages of the current folder in a table
  And the table shows Name, Status, URL, Template and Updated
  And translated pages show their locale and a "Source:" link

Scenario: Search across the market
  When I type "isa" into "Find a page by title or URL"
  Then pages from every folder that match are listed

Scenario: Long folders load in parts
  Given a folder has 120 pages
  Then 50 are shown with "Show 50 more"
```

#### US-02.01.2 · Create pages and folders from on-brand templates

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-02.01.1, US-06.01.3 |
| Build wave | 4 |

**Business benefit**

Every new page starts on-brand and market-appropriate, reducing rework and brand-compliance findings in review. Folder permissions keep teams from cluttering areas they do not own.

**User story**

> As a content author  
> I want to create folders and new pages from a template allowed in my market, where I have Edit  
> So that the site structure stays tidy and every page starts on-brand  

**Acceptance criteria**

```gherkin
Scenario: Creating a page
  When I click "New page"
  And I enter the title "Regular saver"
  Then the URL name becomes "regular-saver"
  When I choose the "Product page" template and click "Create and open"
  Then the page builder opens with the template's components
  And the masthead heading says "Regular saver"
  And I am the first author of the page

Scenario: Templates limited to other markets are not offered
  Given the "Rates page" template is for Hong Kong only
  When I click "New page" in the UK market
  Then "Rates page" is not in the template list

Scenario: Starting from the template library
  When I click "Use template" on "Campaign landing"
  Then the New page dialog opens with "Campaign landing" chosen

Scenario: Creating a folder
  When I click "New folder" and enter "Insurance"
  Then the folder "Insurance" appears in the tree

Scenario: Read-only folder
  Given I don't have Edit on "Borrowing"
  Then the folder shows "Read-only in this folder"
  And there is no "New page" or "New folder"
```

### Feature: Organise pages (rename, move, copy, duplicate, lock, restore)
Source: [`02-organise-pages.feature`](features/02-pages/02-organise-pages.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-02.02.1 · Know what an action will change before it happens | content author | — | 1 |
| 2 | US-02.02.2 · Move and copy pages without breaking or overwriting anything | content author | US-02.02.1, US-02.01.2 | 5 |
| 3 | US-02.02.3 · Lock a page while I work on it | content author | US-02.02.1 | 2 |
| 4 | US-02.02.4 · Override someone else's lock 🛡 | site admin | US-02.02.3 | 3 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given I am signed in with Edit on the "Banking" folder
```

#### US-02.02.1 · Know what an action will change before it happens

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | — |
| Build wave | 1 |

**Business benefit**

Clear impact warnings prevent accidental changes to live pages and the customer complaints they cause. Showing only allowed actions also reduces support requests and permission errors.

**User story**

> As a content author  
> I want to see only the actions I may take and a confirmation that explains their impact  
> So that I never change pages by accident  

**Acceptance criteria**

```gherkin
Scenario Outline: Confirmation with impact
  When I choose "<action>" for "Cash ISA"
  Then a confirmation explains "<impact>"

  Examples:
    | action    | impact                                                                  |
    | Move      | the address changes and old bookmarks of live pages break               |
    | Copy      | copies are created as drafts with the same components                   |
    | Duplicate | a copy called "Cash ISA (copy)" appears in the same folder as a draft   |
    | Lock      | only you and site admins can change, move or delete it                  |
    | Restore   | each page goes back to its last saved version; the current one is kept  |

Scenario: Selection bar
  When I tick several pages
  Then the bar offers Translate, Publish, Lock, Copy, Restore, Compare, Move, Archive and Delete with icons
  And without Edit on every selected item only Translate and Publish are offered
```

#### US-02.02.2 · Move and copy pages without breaking or overwriting anything

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-02.02.1, US-02.01.2 |
| Build wave | 5 |

**Business benefit**

Reorganising the site no longer produces broken links that harm customer experience and search ranking. Colleagues' pages are never overwritten, avoiding lost work and rework.

**User story**

> As a content author  
> I want moves to update the links that point to a page and copies never to replace an existing page  
> So that reorganising the site never breaks links or someone else's work  

**Acceptance criteria**

```gherkin
Scenario: Pages that link here are updated
  Given 2 pages link to "Cash ISA"
  When I move "Cash ISA" to "Savings"
  Then the confirmation lists the 2 pages
  And "Update their links to the new address" is ticked
  And after moving, their links point to the new address

Scenario: A folder cannot move into itself
  When I move "Banking" into "Banking/Savings"
  Then that destination is not offered

Scenario: Moving to the same folder
  When I move pages to the folder they are already in
  Then I see "They are already in that folder"

Scenario: Copying into the same folder
  When I copy "Cash ISA" into its own folder
  Then the copy is called "cash-isa-copy" and titled "Cash ISA (copy)"

Scenario: Folders are not copied
  When I copy a selection that contains a folder
  Then I see "Folders are not copied · pick pages"
```

#### US-02.02.3 · Lock a page while I work on it

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-02.02.1 |
| Build wave | 2 |

**Business benefit**

Locks prevent conflicting edits on sensitive pages while they are being prepared. Reviews and publishing continue, so the lock never delays time-critical releases.

**User story**

> As a content author  
> I want a page I locked to be changeable only by me or a site admin  
> So that nobody edits, moves or deletes it while it is mine  

**Acceptance criteria**

```gherkin
Scenario: Someone else tries to edit a locked page
  Given "rachel.hughes" locked "Cash ISA"
  When I edit, move or delete it
  Then I see "Locked by Rachel Hughes" and "Ask them or a site admin to unlock it in Pages"
  But reviews and publishing of the page still go on

Scenario: Unlocking someone else's lock
  When I try to unlock "Cash ISA" locked by "rachel.hughes"
  Then I see "Cash ISA is locked by Rachel Hughes"
```

#### US-02.02.4 · Override someone else's lock 🛡

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | site admin |
| Depends on | US-02.02.3 |
| Build wave | 3 |

**Business benefit**

Work is never blocked by an absent colleague, which protects deadlines for campaigns and regulatory updates. Keeping the override with site admins keeps it controlled and accountable.

**User story**

> As a site admin  
> I want to change or unlock a page that someone else locked  
> So that work is not blocked when the person who locked it is unavailable  

**Acceptance criteria**

```gherkin
Scenario: A site admin unlocks someone else's lock
  Given "rachel.hughes" locked "Cash ISA"
  And I am a site admin
  When I unlock "Cash ISA" in Pages
  Then the page is unlocked and can be changed, moved or deleted again
```

### Feature: Archive and delete pages
Source: [`03-archive-and-delete.feature`](features/02-pages/03-archive-and-delete.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-02.03.1 · Archive pages instead of deleting them | content author | — | 1 |
| 2 | US-02.03.2 · See everything affected before deleting permanently | content author | US-02.03.1, US-06.02.1, US-03.05.1 | 4 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given I am signed in with Edit on the folder
```

#### US-02.03.1 · Archive pages instead of deleting them

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | — |
| Build wave | 1 |

**Business benefit**

Making archive the default removes the risk of permanently losing content that may be needed again or for record-keeping. Restoring is quick, saving the cost of rebuilding pages.

**User story**

> As a content author  
> I want to archive pages I no longer need and restore them later  
> So that nothing is lost by mistake  

**Acceptance criteria**

```gherkin
Scenario: Delete always offers Archive first
  When I choose "Delete" for "Old offer"
  Then I am asked "Archive “Old offer” instead of deleting?"
  And "Archive" is the main button and "No, delete permanently…" the alternative

Scenario: Archiving a page
  When I archive "Old offer"
  Then it leaves the page list, My tasks and search
  And if it was live it goes offline
  And it appears in "Archive · 1" at the bottom of the folder with who archived it and when

Scenario: Restoring from the archive
  When I click "Restore" on "Old offer" in the archive
  Then it is back in the list as a draft

Scenario: Locked pages cannot be archived by others
  Given another person locked "Old offer"
  When I archive it
  Then I see that it is locked by them
```

#### US-02.03.2 · See everything affected before deleting permanently

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-02.03.1, US-06.02.1, US-03.05.1 |
| Build wave | 4 |

**Business benefit**

Showing every affected link and file before deletion prevents broken customer journeys and orphaned documents. Permanent deletion becomes a deliberate, documented decision.

**User story**

> As a content author  
> I want to see links, linked content, files and pages inside before I delete for good  
> So that broken links are visible before they happen  

**Acceptance criteria**

```gherkin
Scenario: References are checked
  Given 3 pages link to "Old offer"
  And it shows the entity "ISA rates 2026" that is also on 2 other pages
  And it uses the file "offer.pdf" that no other page uses
  When I choose "No, delete permanently…"
  Then I see "3 pages link here" with the list of pages
  And "Linked content" says the entity is not deleted and is also on 2 other pages
  And "Files used only here" lets me tick "offer.pdf" to delete it too

Scenario: Deleting a folder deletes the pages inside
  When I delete the folder "Campaigns 2025" with 4 pages, 1 of them live
  Then I see "Everything inside is deleted too: 4 pages" and "1 live page goes offline"
  And I must type "delete" to confirm
```

---

## 03 · Page builder

### Feature: Build a page from components
Source: [`01-build-a-page.feature`](features/03-page-builder/01-build-a-page.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-03.01.1 · Add on-brand components from the library | content author | US-02.01.2 | 5 |
| 2 | US-03.01.2 · Edit text where it is shown | content author | US-03.01.1 | 6 |
| 3 | US-03.01.3 · Arrange and configure every component the same way | content author | US-03.01.1 | 6 |
| 4 | US-03.01.4 · Never lose my work | content author | US-03.01.2 | 7 |
| 5 | US-03.01.5 · Check the page on every device width | content author | US-03.01.1 | 6 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given I am signed in with Edit on the page "Cash ISA"
  And the page is at "Build the page"
```

#### US-03.01.1 · Add on-brand components from the library

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-02.01.2 |
| Build wave | 5 |

**Business benefit**

Pages are built only from approved components, so brand and compliance quality is built in rather than checked later. Authors produce pages without developer help, lowering cost and time to market.

**User story**

> As a content author  
> I want to find components in the library and add them where I need them  
> So that every page is built only from approved HSBC components  

**Acceptance criteria**

```gherkin
Scenario: Adding a component
  Given the "Key facts" component is selected
  When I click "Add" on "Rates table" in the component library
  Then the rates table is added below "Key facts"
  And I see "Rates table added · click ✎ Edit to fill it in"

Scenario: Finding a component
  When I type "faq" into "Find a component…"
  Then only "FAQ" is listed

Scenario: An empty page offers starter layouts
  Given the page has no components
  Then I see "How do you want to start this page?" with 3 layouts
```

#### US-03.01.2 · Edit text where it is shown

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.01.1 |
| Build wave | 6 |

**Business benefit**

Authors see exactly what customers will see, which reduces review rounds caused by layout surprises. Restricting link formats also blocks unsafe links from reaching customers.

**User story**

> As a content author  
> I want to type and format text directly on the page  
> So that I see the result as customers will while I write  

**Acceptance criteria**

```gherkin
Scenario: Editing a heading in place
  When I click the masthead heading
  Then I can type straight away with the caret where I clicked
  When I press Enter
  Then the heading is saved

Scenario: Long text needs ⌘ Enter
  When I edit a paragraph and press ⌘ Enter
  Then the paragraph is saved

Scenario: Changing a button
  When I click a button that has a link
  Then a "Button" box lets me change the label and the URL

Scenario: Formatting
  When I edit a paragraph
  Then I can make text bold, italic, underlined, a link, a bullet list or a numbered list
  And links must start with https, mailto, tel, / or #
```

#### US-03.01.3 · Arrange and configure every component the same way

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.01.1 |
| Build wave | 6 |

**Business benefit**

One consistent way to configure all components shortens training for new authors. Locking components protects mandatory content such as disclaimers from accidental edits.

**User story**

> As a content author  
> I want the same toolbar on every component and a Configure panel with all its properties  
> So that I can move, protect and fine-tune any component without learning each one  

**Acceptance criteria**

```gherkin
Scenario: Component toolbar
  When I select a component
  Then I see "✎ Edit", "Pattern", "✨ AI", move up, move down, delete and "⋯ More"
  And "⋯ More" offers Duplicate, Copy, Paste after, Hide, Lock, Version history and Delete

Scenario: Locked component
  Given the "Disclaimer" component is locked
  When I click its text
  Then I see "This block is locked. Unlock it from ⋯ More."

Scenario: Configure panel
  When I click a component
  Then Configure opens with Content, Layout, Behaviour and Metadata
  And required fields are marked "required"
  And Cancel puts back the values from when Configure opened
```

#### US-03.01.4 · Never lose my work

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.01.2 |
| Build wave | 7 |

**Business benefit**

Authors never redo work after a closed tab or a lost connection. Fewer lost edits also mean fewer errors slipping into reviewed pages.

**User story**

> As a content author  
> I want the page to save itself, to save on demand and to tell me when saving fails  
> So that no edit is ever lost  

**Acceptance criteria**

```gherkin
Scenario: Autosave
  When I stop typing for about a second
  Then the page saves itself and shows "✓ Saved"

Scenario: Save button and shortcut
  Then a "Save" button sits next to "Preview" while there are unsaved changes
  And ⌘ S saves at once

Scenario: Save failed
  Given the server cannot be reached
  Then I see "Not saved · Retry"
```

#### US-03.01.5 · Check the page on every device width

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.01.1 |
| Build wave | 6 |

**Business benefit**

Problems on mobile and tablet are caught before review, when they are cheapest to fix. Customers get a consistent experience on every device, which protects trust and conversion.

**User story**

> As a content author  
> I want to preview the page at desktop, tablet and mobile width and full screen  
> So that it works for every customer before I send it for review  

**Acceptance criteria**

```gherkin
Scenario Outline: Device preview
  When I choose "<device>"
  Then the page is drawn at <width> px and the label says "1:1 · <width> px"

  Examples:
    | device  | width |
    | desktop | 1200  |
    | tablet  | 768   |
    | mobile  | 390   |

Scenario: Full-screen preview
  When I click "Preview" or press ⌘ ⇧ F
  Then the page fills the screen and Esc goes back to editing
```

### Feature: Design patterns
Source: [`02-design-patterns.feature`](features/03-page-builder/02-design-patterns.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-03.02.1 · Reuse a section in one click | content author | US-03.01.1 | 6 |
| 2 | US-03.02.2 · Save my own design pattern | content author | US-03.02.1, US-03.01.3 | 7 |
| 3 | US-03.02.3 · Remove my patterns safely | content author | US-03.02.2 | 8 |
| 4 | US-03.02.4 · Remove built-in design-system patterns 🛡 | site admin | US-03.02.3 | 9 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given I am signed in with Edit on the page
```

#### US-03.02.1 · Reuse a section in one click

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.01.1 |
| Build wave | 6 |

**Business benefit**

Common sections look identical across pages, strengthening brand consistency for customers. Adding a whole section in one click saves authors significant build time.

**User story**

> As a content author  
> I want to pick a design pattern from its own library and add all its components at once  
> So that common sections look the same on every page  

**Acceptance criteria**

```gherkin
Scenario: Opening the pattern library
  When I click the "Design patterns" tile in the left rail
  Then I see the patterns with live thumbnails
  And design-system patterns are labelled "Design system" and mine "Saved"

Scenario: Adding a pattern
  When I click "Product introduction"
  Then Masthead, Content master and Icon tiles are added below the selected component
  And I see "Product introduction added · 3 components"
```

#### US-03.02.2 · Save my own design pattern

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.02.1, US-03.01.3 |
| Build wave | 7 |

**Business benefit**

Proven sections are reused instead of rebuilt, spreading good practice across teams and markets. Market targeting stops a pattern from appearing where it does not fit local rules.

**User story**

> As a content author  
> I want to save components already on the page as a named pattern, for all or only some markets  
> So that I and my colleagues can reuse a section that works  

**Acceptance criteria**

```gherkin
Scenario: Creating a pattern
  When I click "Create a design pattern"
  And I click the "Content master" and "Icon tiles" components
  Then they get the numbers 1 and 2
  And the bar says "New design pattern · 2 components"
  When I click "Name it and save…" and enter "Savings intro"
  Then "Savings intro" is in the pattern library

Scenario: Starting from a component
  When I click "Pattern" on the toolbar of a component
  Then the new pattern starts with that component

Scenario: A pattern needs two components
  Given I picked one component
  Then "Name it and save…" is disabled and the bar says "pick at least one more"

Scenario: Names are unique
  When I save a pattern called "Product introduction"
  Then I see "A pattern with this name already exists"

Scenario: UK-only pattern
  When I save a pattern for "Only some local markets" with only "UK" ticked
  Then UK pages see it
  And Hong Kong pages do not

Scenario: Changing the markets later
  When I click "Markets" on my pattern and untick the current market
  Then I am warned "This market will no longer see it. Pages that already use it keep their components."
```

#### US-03.02.3 · Remove my patterns safely

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.02.2 |
| Build wave | 8 |

**Business benefit**

The pattern library stays tidy without risking pages that already use a pattern. Two-step removal prevents losing valuable shared work by mistake.

**User story**

> As a content author  
> I want to archive my own patterns first and delete them for good only on purpose  
> So that a pattern is never lost by mistake and pages that use it are not affected  

**Acceptance criteria**

```gherkin
Scenario: Archive and restore
  When I click the bin on my pattern and choose "Archive"
  Then it moves to "Archived · 1" and can be restored

Scenario: Delete for good
  Given my pattern is archived
  When I click "Delete" and type "delete"
  Then it is gone for good
  And pages that use it keep their components

Scenario Outline: Who may remove a pattern
  Given the pattern "<pattern>"
  When "<who>" removes it
  Then <outcome>

  Examples:
    | pattern               | who            | outcome                                                   |
    | saved by me           | me             | it is archived                                            |
    | saved by someone else | me             | there is no bin on it                                     |
    | Product introduction  | content.author | there is no bin on it                                     |
```

#### US-03.02.4 · Remove built-in design-system patterns 🛡

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | site admin |
| Depends on | US-03.02.3 |
| Build wave | 9 |

**Business benefit**

Outdated design-system sections can be retired centrally, so new pages do not reuse superseded designs. Restricting this to site admins protects the shared library from accidental removal.

**User story**

> As a site admin  
> I want to remove built-in design-system patterns that ordinary authors cannot touch  
> So that the shared pattern library stays current  

**Acceptance criteria**

```gherkin
Scenario Outline: A site admin removes a design-system pattern
  Given the pattern "<pattern>"
  When "<who>" removes it
  Then <outcome>

  Examples:
    | pattern               | who            | outcome                                                   |
    | Product introduction  | super.admin    | it is archived                                            |
```

### Feature: Page insights and quality checklist
Source: [`03-quality-and-insights.feature`](features/03-page-builder/03-quality-and-insights.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-03.03.1 · See and fix what blocks publishing | content author | US-03.01.2 | 7 |
| 2 | US-03.03.2 · Check any element while previewing | content author | US-03.01.5, US-06.02.2 | 7 |

#### US-03.03.1 · See and fix what blocks publishing

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.01.2 |
| Build wave | 7 |

**Business benefit**

Automatic checks catch accessibility, compliance and SEO issues before review, reducing regulatory and reputational risk. Reviewers spend their time on substance rather than mechanical mistakes.

**User story**

> As a content author  
> I want findings grouped by how serious they are, with one-click fixes and a way to find them on the page  
> So that the page reaches review without mistakes a machine can find  

**Acceptance criteria**

```gherkin
Scenario: Verdict
  Given the page has 2 critical findings
  Then Page insights says "2 things to fix before publishing"
  And the findings are listed under "Must fix", "Should fix" and "Checks passed"

Scenario Outline: Checks
  Given <situation>
  Then Page insights reports "<finding>" as <level>

  Examples:
    | situation                                         | finding                       | level    |
    | a required field is empty                         | empty required field          | critical |
    | an image has no alt text and is not decorative    | image without alt text        | critical |
    | a token does not match a linked entity            | broken token                  | critical |
    | the page has rates but no disclaimer              | no disclaimer                 | critical |
    | a heading is longer than 60 characters            | long heading                  | warning  |
    | a button says "Click here"                        | vague call to action          | warning  |
    | the text says "guaranteed"                        | risky wording                 | warning  |
    | the meta description is missing                   | no description                | warning  |

Scenario: One-click fixes
  Given a button says "Learn more"
  When I click the fix
  Then the button says "See the details" and I see "Fixed: …"

Scenario: Show on page
  When I click "Show on page" on a finding
  Then the component is selected and scrolled into view
```

#### US-03.03.2 · Check any element while previewing

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.01.5, US-06.02.2 |
| Build wave | 7 |

**Business benefit**

Authors verify each element in the context customers see, catching issues earlier and more cheaply. A consistent checklist raises the baseline quality of every page.

**User story**

> As a content author  
> I want a quality checklist that follows my pointer in full-screen preview  
> So that I can check the whole page and each element as customers will see it  

**Acceptance criteria**

```gherkin
Scenario: Whole page
  Given I am in full-screen Preview of my draft
  And I am not pointing at anything
  Then the floating "Quality checklist" shows title tag, meta description, canonical URL, page type, one masthead and required fields

Scenario: One element
  When I point at a heading
  Then the checklist shows: has text, length within the limit, not the example text, no risky wording

Scenario: Pinning
  When I click a heading
  Then the checklist stays on it until I click it again
```

### Feature: AI assistant
Source: [`04-ai-assistant.feature`](features/03-page-builder/04-ai-assistant.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-03.04.1 · Improve one component with AI | content author | US-03.01.3 | 7 |
| 2 | US-03.04.2 · Let AI plan page-wide changes that I approve | content author | US-03.01.4 | 8 |
| 3 | US-03.04.3 · Keep AI within page permissions | business owner | US-03.04.2 | 9 |

#### US-03.04.1 · Improve one component with AI

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.01.3 |
| Build wave | 7 |

**Business benefit**

AI speeds up copy improvements while the author keeps full control over every change. Showing before and after prevents unreviewed AI text from reaching customers.

**User story**

> As a content author  
> I want AI to suggest changes to the selected component only, shown before and after  
> So that I can accept or reject each suggestion knowing exactly what changes  

**Acceptance criteria**

```gherkin
Scenario: Before and after
  Given the "Masthead" component is selected
  When I click "✨ AI" and choose "Make this more concise"
  Then I see the old and the new text of each changed field
  And I can "Apply" or "Discard"

Scenario: Nothing to change
  Given the component has no button
  When I ask "Make the CTA more compelling"
  Then I see "This block has no button."
```

#### US-03.04.2 · Let AI plan page-wide changes that I approve

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.01.4 |
| Build wave | 8 |

**Business benefit**

Page-wide changes such as accessibility or SEO fixes take minutes instead of hours. Approval and undo for each change keep accountability with the author and limit the risk of AI errors.

**User story**

> As a content author  
> I want the page AI to show its plan first and change nothing until I run the changes I ticked  
> So that I work faster on whole pages and can undo anything  

**Acceptance criteria**

```gherkin
Scenario: Plan, run, review
  When I ask the page AI "Make this page work better on mobile"
  Then I see the stages Understanding, Plan, Executing, Review and Done
  And every planned change has a checkbox, all ticked
  When I untick one change and click "Run plan · 3 changes"
  Then the 3 changes are applied one by one
  And each change has Undo and Redo, and there is "Undo all"
  And I see "Applied 3 of 4 changes · Save the page to keep them"

Scenario Outline: What the planner understands
  When I ask "<prompt>"
  Then the plan <does>

  Examples:
    | prompt                         | does                                                            |
    | Design a landing page          | lays out a full page, or adds sections to an existing page      |
    | Translate to Welsh             | translates the text fields with the glossary                    |
    | Make it accessible             | adds alt text, an h1 and descriptive buttons                    |
    | Improve SEO                    | writes a meta description of up to 155 characters and adds an FAQ |
    | Add a promo for the new card   | adds rich text and a banner after the masthead                  |
    | Polish it                      | shortens long text and fixes vague buttons                      |

Scenario: The page already follows the patterns
  When I ask "Polish it" on a page with nothing to improve
  Then I see "Page already follows HSBC content patterns — nothing to change"
```

#### US-03.04.3 · Keep AI within page permissions

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | business owner |
| Depends on | US-03.04.2 |
| Build wave | 9 |

**Business benefit**

AI cannot become a loophole around the bank's access controls, which protects content integrity. This gives risk and compliance teams confidence to approve AI use.

**User story**

> As a business owner  
> I want AI to refuse to plan changes for people who may only read a page  
> So that AI never becomes a way around permissions  

**Acceptance criteria**

```gherkin
Scenario: Viewer
  Given I have only Read on the page
  When I ask the page AI anything
  Then nothing is planned and I am told the page is read-only
```

### Feature: Linked content (entities and tokens)
Source: [`05-linked-content.feature`](features/03-page-builder/05-linked-content.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-03.05.1 · Show shared content from one place | content author | US-06.03.2 | 3 |
| 2 | US-03.05.2 · Keep page text and linked content consistent | content author | US-03.05.1 | 4 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given the entity "ISA rates 2026" of the model "Rate" exists
```

#### US-03.05.1 · Show shared content from one place

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-06.03.2 |
| Build wave | 3 |

**Business benefit**

Rates and product details are maintained once and update everywhere, cutting maintenance effort. It removes the risk of customers seeing outdated or conflicting figures on different pages.

**User story**

> As a content author  
> I want to link an entity to the page and use its fields in text and component fields  
> So that a change to the content appears on every page that uses it  

**Acceptance criteria**

```gherkin
Scenario: Linking an entity to the page
  When I open "Entities" in the right rail and click "＋ Add entity"
  And I choose "ISA rates 2026"
  Then it is linked with the alias "rate"
  And I see "Added ISA rates 2026 · use {{rate.title}} in text"

Scenario: Choosing content for a field
  When I click the content icon next to the "Heading" field
  And I choose Folder, Entity "ISA rates 2026" and Field "aer"
  And I click "Use this content"
  Then the heading shows the value of "aer"
  And the field says "⤓ From ISA rates 2026 · aer"

Scenario: Typing a token
  When I type "{{" while editing a text
  Then the content picker opens and the token is inserted at the caret
```

#### US-03.05.2 · Keep page text and linked content consistent

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.05.1 |
| Build wave | 4 |

**Business benefit**

Broken or missing shared content is flagged before it reaches customers, protecting accuracy of regulated information. Authors can still detach content deliberately, with a clear trace.

**User story**

> As a content author  
> I want to detach a field on purpose and be warned about tokens and entities that do not match  
> So that the page never shows broken or missing shared content  

**Acceptance criteria**

```gherkin
Scenario: Stop inheriting
  When I click "Stop inheriting" under a field
  Then the token is replaced by its current text

Scenario: Tokens for entities that are not linked
  Given the text contains "{{offer.title}}" but no entity "offer" is linked
  Then Entities shows it under "Not linked yet" with a "Link" picker
  And Page insights reports a broken token

Scenario: An entity in use cannot be removed
  Given "{{rate.aer}}" is used 2 times in the text
  Then the entity shows "used 2× in the text" and has no remove button
```

### Feature: Working together on a page (authors, Jira, versions)
Source: [`06-collaboration.feature`](features/03-page-builder/06-collaboration.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-03.06.1 · Build a page together with other authors | content author | US-02.01.2 | 5 |
| 2 | US-03.06.2 · Assign other people as authors 🛡 | site admin | US-03.06.1 | 6 |
| 3 | US-03.06.3 · Link a page to its Jira ticket | content author | — | 1 |
| 4 | US-03.06.4 · Go back to any earlier version | content author | US-03.01.4 | 8 |

#### US-03.06.1 · Build a page together with other authors

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-02.01.2 |
| Build wave | 5 |

**Business benefit**

Larger pages are delivered faster because several authors can share the work. Clear ownership means reviewers and managers always know who is responsible.

**User story**

> As a content author  
> I want to join or leave the authors of a page while it is being built  
> So that we can share the work and everyone sees who is responsible  

**Acceptance criteria**

```gherkin
Scenario: Joining as an author
  Given "Super Admin" created the page and is its only author
  And I am signed in as "jordan.mensah" with Edit
  Then the hint says "Super Admin is building this page · Assign me to work on it with them"
  When I click "Assign me"
  Then the Authors chip shows "You + 1"
  And the hint says "Building it together with Super Admin"

Scenario: Leaving
  When I click "Leave" in the Authors list
  Then I am no longer an author

Scenario: Authors are fixed after the first stage
  Given the page was sent for review
  When anyone changes the authors
  Then they see "Authors can only change while the page is at Build the page"

Scenario: Co-authors in My tasks
  Given the page has 2 authors
  Then My tasks shows the second one under the Content author as "+ Name"
```

#### US-03.06.2 · Assign other people as authors 🛡

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | site admin |
| Depends on | US-03.06.1 |
| Build wave | 6 |

**Business benefit**

Managers can hand out work deliberately and keep delivery on schedule. Every assignment is logged and limited to people with Edit, keeping access controlled.

**User story**

> As a site admin  
> I want to add or remove other people as authors of a page  
> So that work is handed out deliberately and nobody is assigned behind their back  

**Acceptance criteria**

```gherkin
Scenario: A site admin adds an author
  Given I am signed in as "super.admin"
  When I choose "aisha.khan" in "Add a person…" in the Authors list and click "Add"
  Then "aisha.khan" is an author of the page
  And the audit log says "assigned Aisha Khan as an author of" the page

Scenario: The person must be able to edit
  When I add someone without Edit on the page
  Then I see that they don't have Edit on this page

Scenario: Only site admins assign other people
  Given I am not a site admin
  When I try to add "aisha.khan" as an author
  Then I see "Only a site admin can assign other people"
```

#### US-03.06.3 · Link a page to its Jira ticket

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | — |
| Build wave | 1 |

**Business benefit**

Every page change is traceable to the business request behind it, which supports audit and change management. Reviewers reach the context in one click, speeding up approval.

**User story**

> As a content author  
> I want to link the page to its Jira ticket and open it in one click  
> So that the work is traceable to the request behind it  

**Acceptance criteria**

```gherkin
Scenario Outline: Linking a ticket
  When I enter "<input>" into "Jira ticket" in Page settings and save
  Then <outcome>

  Examples:
    | input                                         | outcome                                                        |
    | ucp-482                                       | the chip "UCP-482 ↗" links to https://hsbc.atlassian.net/browse/UCP-482 |
    | https://jira.example.com/browse/MKT-7         | the chip "MKT-7 ↗" links to that address                       |
    | not a link                                    | I see "Paste a Jira link (https://…) or a ticket key like UCP-123" |

Scenario: Opening the ticket
  When I click the Jira chip next to the page title or in My tasks
  Then the ticket opens in a new tab
```

#### US-03.06.4 · Go back to any earlier version

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.01.4 |
| Build wave | 8 |

**Business benefit**

Any mistake can be reversed quickly, limiting the impact of an incorrect change. A full version history supports audit and regulatory record-keeping.

**User story**

> As a content author  
> I want every save kept as a version that I can restore or comment on  
> So that any change can be reversed and discussed  

**Acceptance criteria**

```gherkin
Scenario: Restoring a version
  When I open Version history and click "Restore" on an earlier version
  And I confirm "Unsaved edits in the builder are replaced. A copy of the current page is kept as a new version."
  Then the page goes back to that version
  And the version before the restore is kept

Scenario: Commenting on a version
  When I click "Comment" on a version
  Then the comment says "About the version from …"
```

---

## 04 · Review workflow

### Feature: End-to-end journey of a page (who hands it to whom)
Source: [`00-end-to-end-handoffs.feature`](features/04-review-workflow/00-end-to-end-handoffs.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-04.00.1 · Hand the page over step by step | content author | US-04.01.1, US-04.02.2, US-04.03.2, US-05.01.1 | 14 |
| 2 | US-04.00.2 · Get the page back when someone asks for changes | content author | US-04.00.1 | 15 |
| 3 | US-04.00.3 · Nobody approves their own work | bank | US-04.00.1 | 15 |
| 4 | US-04.00.4 · Walk the whole flow as a site admin, on record 🛡 | site admin | US-04.00.1, US-04.00.3 | 16 |
| 5 | US-04.00.5 · Ask for publishing and hear when the page is live ⏭ | content author | US-04.00.1 | 15 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given these people work on the UK site
  | person         | persona         | permissions on the folder           |
  | content.author | content author  | Read, Edit                          |
  | rachel.hughes  | peer reviewer   | Read, Edit, Review & approve        |
  | david.clarke   | business owner  | Read, Review & approve              |
  | jordan.mensah  | publisher       | Read, Review & approve, Publish     |
  | super.admin    | site admin      | everything                          |
```

#### US-04.00.1 · Hand the page over step by step

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-04.01.1, US-04.02.2, US-04.03.2, US-05.01.1 |
| Build wave | 14 |

**Business benefit**

Every page passes through separate authoring, review, sign-off and publishing hands, which builds four-eyes control into the process itself. Clear hand-offs cut idle time between teams and shorten time to market.

**User story**

> As a content author  
> I want to request each next step instead of doing it myself  
> So that every page is checked by other people before customers see it  

**Acceptance criteria**

```gherkin
Scenario: The happy path, one person per step
  Given "content.author" built the page "Cash ISA"
  When "content.author" sends it for review
  Then it waits in the Backlog for any reviewer
  When "rachel.hughes" takes it, reviews it and chooses "Send to business review"
  Then it waits for a business reviewer
  When "david.clarke" takes it and signs it off
  Then it is "Ready to publish"
  When "jordan.mensah" publishes it
  Then it is "Published"
  And "content.author" sees "Cash ISA" under "Published" in My tasks

Scenario Outline: What the author can do at each stage
  Given the page "Cash ISA" is at "<stage>"
  And I am signed in as "content.author"
  Then the next step for me is "<my action>"
  And the step itself is done by "<who acts>"

  Examples:
    | stage                                  | my action                         | who acts                       |
    | Build the page                         | Send to author's review           | me                             |
    | Waiting for author's review assignment | Wait · "Waiting for a reviewer"   | any reviewer except me         |
    | Assigned to reviewer                   | Remind                            | the assigned reviewer          |
    | In author's review                     | Remind                            | the assigned reviewer          |
    | Waiting for business review assignment | Wait                              | a business owner               |
    | In business review                     | Remind                            | the business reviewer or group |
    | Ready to publish                       | Wait · "Waiting for a publisher"  | a publisher                    |
    | Published                              | Edit to start a new version       | me                             |
```

#### US-04.00.2 · Get the page back when someone asks for changes

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-04.00.1 |
| Build wave | 15 |

**Business benefit**

Rework goes back to one accountable author instead of being patched by reviewers, which keeps responsibility clear. Restarting both reviews after changes means no unchecked edit can reach customers.

**User story**

> As a content author  
> I want any reviewer to send the page back to me with comments  
> So that I fix it once and the whole check starts again  

**Acceptance criteria**

```gherkin
Scenario Outline: Reauthor returns the page to the author
  Given "<reviewer>" is reviewing "Cash ISA" at "<stage>"
  When they choose "Reauthor" with comments
  Then the page is back at "Build the page" for "content.author"
  And the comments stay on the page
  And both reviews start over when it is sent again

  Examples:
    | reviewer      | stage              |
    | rachel.hughes | In author's review |
    | david.clarke  | In business review |
```

#### US-04.00.3 · Nobody approves their own work

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | bank |
| Depends on | US-04.00.1 |
| Build wave | 15 |

**Business benefit**

Segregation of duties is enforced by the system rather than by policy documents, which satisfies four-eyes compliance requirements. Auditors can rely on the platform instead of sampling manual evidence.

**User story**

> As the bank  
> I want different people for authoring, peer review and business review  
> So that the four-eyes principle holds on every page  

**Acceptance criteria**

```gherkin
Scenario Outline: Four-eyes checks
  Given "<person>" did "<earlier step>" on "Cash ISA"
  When "<person>" tries to "<later step>"
  Then they see "<message>"

  Examples:
    | person         | earlier step      | later step                | message                                                              |
    | content.author | write the page    | take the author's review  | You wrote this page, so someone else reviews it                      |
    | rachel.hughes  | the peer review   | take the business review  | You did the author's review · someone else does the business review  |
    | rachel.hughes  | the peer review   | sign it off               | Someone else must do the business review                             |

Scenario: An author without Publish cannot put the page live
  Given "Cash ISA" is "Ready to publish"
  And I am signed in as "content.author"
  Then I see "Waiting for a publisher" instead of "Publish"
```

#### US-04.00.4 · Walk the whole flow as a site admin, on record 🛡

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | site admin |
| Depends on | US-04.00.1, US-04.00.3 |
| Build wave | 16 |

**Business benefit**

Urgent regulatory or pricing changes can still go live when reviewers are unavailable, which reduces business risk. Every override is recorded as on behalf of a named person, so audit trails stay complete.

**User story**

> As a site admin  
> I want to perform any step for the person who should do it  
> So that I can demo the platform and unblock urgent pages  

**Acceptance criteria**

```gherkin
Scenario: Walking every step alone
  Given I am signed in as "super.admin"
  Then every step on the stepper offers its action to me
  And I can take my own page from the Backlog

Scenario: Acting on behalf is recorded
  Given "rachel.hughes" is the assigned peer reviewer
  When I click "Reviewed for Rachel Hughes"
  Then the audit line ends with "(on behalf of Rachel Hughes)"

Scenario: Ordinary users never see actions for other people
  Given I am signed in as "content.author"
  Then no button on the stepper or in My tasks lets me act for someone else
```

#### US-04.00.5 · Ask for publishing and hear when the page is live ⏭

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-04.00.1 |
| Build wave | 15 |

**Business benefit**

Planned launch dates reduce last-minute coordination between marketing and publishers. Authors learn when a page is live without chasing anyone, which saves time and avoids missed campaign starts.

**User story**

> As a content author  
> I want to request publishing at a date and be told when the page is live  
> So that I can plan launches without chasing the publisher  

**Acceptance criteria**

```gherkin
Scenario: Requesting publishing
  Given "Cash ISA" is "Ready to publish"
  When I click "Request publishing" and choose 1 November at 09:00
  Then the publishers get a task "Publish Cash ISA on 1 Nov 09:00"

Scenario: Live notification
  When the publisher publishes "Cash ISA"
  Then I get the notification "Cash ISA is live"
```

### Feature: Send a page for the author's review
Source: [`01-send-for-review.feature`](features/04-review-workflow/01-send-for-review.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-04.01.1 · Request a review from the shared Backlog | content author | US-03.01.4, US-01.03.1 | 8 |
| 2 | US-04.01.2 · Check the page before handing it over | content author | US-04.01.1, US-03.03.1 | 9 |
| 3 | US-04.01.3 · Keep the page stable while it is being reviewed | content author | US-04.01.1 | 9 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given I am signed in as "content.author" with Edit on the folder of the page
  And the page "Cash ISA" is at the "Build the page" stage
```

#### US-04.01.1 · Request a review from the shared Backlog

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-03.01.4, US-01.03.1 |
| Build wave | 8 |

**Business benefit**

A shared Backlog lets the first free reviewer start, so pages do not queue behind one person's calendar. Due dates and audit entries make review turnaround measurable from day one.

**User story**

> As a content author  
> I want to send the page to a Backlog that every reviewer sees, with a note  
> So that the first free reviewer can take it and I don't have to chase one person  

**Acceptance criteria**

```gherkin
Scenario: Sending the page for review
  When I click "Send to author's review"
  And I add the note "Rates changed on 1 Oct" for the reviewer
  And I click "Send to the Backlog"
  Then the page status is "Waiting for author's review assignment"
  And nobody is assigned to review it
  And the review is due in 3 days
  And the audit log says "sent Cash ISA for review · open to all reviewers in the Backlog"
  And I see "Sent for review · it is in the Backlog, any reviewer can take it"

Scenario: Nobody can review the folder
  Given no user has "Review & approve" on the folder of the page
  When I send the page for review
  Then I see "Nobody can review this page"
  And I am told "Ask a site admin to grant Review & approve on this folder"
```

#### US-04.01.2 · Check the page before handing it over

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-04.01.1, US-03.03.1 |
| Build wave | 9 |

**Business benefit**

Catching missing fields and quality problems before hand-off avoids wasted review cycles. Fewer round trips mean faster delivery and lower review cost.

**User story**

> As a content author  
> I want a last check of the page, with any problems Page insights found  
> So that I only send pages that are complete  

**Acceptance criteria**

```gherkin
Scenario: Leaving the preview asks whether the page looks right
  Given I am on the "Preview" step
  When I leave the preview
  Then I see the dialog "Does everything look right?"
  And I can choose "No, keep editing" or "Yes, send for review"

Scenario: Page insights warn about problems but do not block sending
  Given Page insights found 2 things to fix on the page
  When I leave the preview
  Then the dialog says "Page insights found 2 things to fix. You can still send it"

Scenario: Required fields are missing
  Given 3 required component fields are empty
  When I click "Send to author's review"
  Then I see "Fill in 3 required fields first"
  And the first incomplete component opens in Configure
```

#### US-04.01.3 · Keep the page stable while it is being reviewed

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-04.01.1 |
| Build wave | 9 |

**Business benefit**

Reviewers approve exactly the version that will be published, which protects the integrity of the four-eyes check. It prevents silent changes after approval that could expose the bank to conduct risk.

**User story**

> As a content author  
> I want the page to be read-only during review, with a clear way to take it back  
> So that reviewers check exactly what I sent  

**Acceptance criteria**

```gherkin
Scenario: The page is read-only in review
  Given the page was sent for review
  When I open it in the page builder
  Then the page is shown as a preview
  And the component and AI panels say "Editing takes it out of the review queue"

Scenario: Taking the page back for editing
  Given the page was sent for review
  When I click "Edit the page"
  And I confirm "Reopen this page for editing? It will leave the review queue."
  Then the page is back at "Build the page"
```

### Feature: Author's (peer) review
Source: [`02-peer-review.feature`](features/04-review-workflow/02-peer-review.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-04.02.1 · Take a review from the Backlog, or give it back | peer reviewer | US-04.01.1 | 9 |
| 2 | US-04.02.2 · Review the page and decide what happens next | peer reviewer | US-04.02.1 | 10 |
| 3 | US-04.02.3 · Nudge a reviewer who is taking long | content author | US-04.02.1 | 10 |
| 4 | US-04.02.4 · Steer reviews as a site admin 🛡 | site admin | US-04.02.1, US-04.02.2 | 11 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given the page "Cash ISA" was sent for review by "content.author"
  And "rachel.hughes" has "Review & approve" on the page
```

#### US-04.02.1 · Take a review from the Backlog, or give it back

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | peer reviewer |
| Depends on | US-04.01.1 |
| Build wave | 9 |

**Business benefit**

Reviews start as soon as any reviewer is free, so pages do not wait for one person. Each review has one named owner, which makes delays visible.

**User story**

> As a peer reviewer  
> I want to assign a waiting page to myself and return it if I cannot do it  
> So that every review has exactly one owner and nothing gets stuck with me  

**Acceptance criteria**

```gherkin
Scenario: A reviewer assigns the page to themselves
  Given I am signed in as "rachel.hughes"
  When I click "Assign to me" on "Cash ISA" in the Backlog
  Then I am the peer reviewer of the page
  And the stepper shows "Assigned to reviewer"
  And I see "Cash ISA is yours · find it in Ready for review"

Scenario: Two reviewers try to take the same page
  Given "aisha.khan" already took "Cash ISA"
  When I try to take it as "rachel.hughes"
  Then I see "Already assigned to Aisha Khan"

Scenario: Someone without Review cannot take it
  Given I am signed in as "tunde.boateng" who only has Read
  Then the "Assign to me" button is disabled
  And I see "Only reviewers can take it · you don't have Review & approve here"

Scenario Outline: Back to backlog before the review starts
  Given "rachel.hughes" took "Cash ISA" but has not started the review
  And I am signed in as "<who>"
  When I click "Back to backlog"
  Then <outcome>

  Examples:
    | who           | outcome                                                                            |
    | rachel.hughes | nobody is assigned and the page is in the Backlog again                           |
    | aisha.khan    | I see "Only the assigned reviewer or a site admin can put it back in the Backlog" |

Scenario: A started review cannot go back
  Given the review of "Cash ISA" has started
  When the reviewer clicks "Back to backlog"
  Then they see "The review has already started"
```

#### US-04.02.2 · Review the page and decide what happens next

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | peer reviewer |
| Depends on | US-04.02.1 |
| Build wave | 10 |

**Business benefit**

A single decision point moves the page on or back without extra meetings or e-mails. Only the assigned reviewer can approve, which keeps the peer check accountable and auditable.

**User story**

> As a peer reviewer  
> I want to finish my review with one decision: business review or back to the author  
> So that the page moves on without extra hand-offs  

**Acceptance criteria**

```gherkin
Scenario: Starting the review
  Given I am signed in as "rachel.hughes" and I am assigned to "Cash ISA"
  When I click "Start review"
  Then the page status is "In author's review"

Scenario: Only the assigned reviewer decides
  Given "rachel.hughes" is assigned to "Cash ISA"
  When "aisha.khan" marks it reviewed
  Then she sees "Only the assigned reviewer can approve this page"

Scenario: Finishing the review opens a choice
  Given the review of "Cash ISA" is in progress and I am the reviewer
  When I click "Reviewed"
  Then I see "Author's review done · what next?"
  And I can choose "Send to business review" or "Reauthor"

Scenario: Sending to the business review
  When I choose "Send to business review"
  Then the page status is "In business review"
  And the stepper shows "Waiting for business review assignment"
  And the "Share for review" dialog opens as the next step

Scenario: Sending the page back to the author
  When I choose "Reauthor"
  And I confirm "Send it back to the author?"
  Then the page is back at "Build the page"
  And the peer reviewer, the business reviewer and the review groups are cleared
```

#### US-04.02.3 · Nudge a reviewer who is taking long

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-04.02.1 |
| Build wave | 10 |

**Business benefit**

Rate-limited reminders keep pages moving without manual chasing or noisy escalation. Shorter waiting times bring content to market faster.

**User story**

> As a content author  
> I want to remind the reviewer, but not more often than every 15 minutes  
> So that my page keeps moving without spamming anyone  

**Acceptance criteria**

```gherkin
Scenario: Sending a reminder
  Given I am signed in as "content.author" and the review is waiting
  When I click "Remind"
  Then the reviewer gets the notification "Reminder: Content Author is waiting for your review of Cash ISA"

Scenario: Reminder rate limit
  Given a reminder was sent 5 minutes ago
  When I click "Remind" again
  Then I see "A reminder was sent a few minutes ago"
```

#### US-04.02.4 · Steer reviews as a site admin 🛡

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | site admin |
| Depends on | US-04.02.1, US-04.02.2 |
| Build wave | 11 |

**Business benefit**

Admins can rebalance workload and unblock stuck reviews, which protects launch dates. Every intervention is logged on behalf of the reviewer, so oversight never weakens the audit trail.

**User story**

> As a site admin  
> I want to reassign reviewers and act for them when needed  
> So that reviews never get stuck, and everyone can see that I stepped in  

**Acceptance criteria**

```gherkin
Scenario: Reassigning the peer reviewer
  Given I am signed in as "super.admin"
  When I click the pencil next to the peer reviewer in My tasks
  And I choose "aisha.khan"
  Then "aisha.khan" is the peer reviewer
  And the audit log says "reassigned the review of Cash ISA from Rachel Hughes to Aisha Khan"

Scenario: Assigning automatically
  When I choose "Assign automatically"
  Then the reviewer with the fewest open reviews is assigned
  But never the person who sent the page

Scenario: Putting any review back in the Backlog
  Given "rachel.hughes" took "Cash ISA" but has not started the review
  When I click "Back to backlog" as "super.admin"
  Then nobody is assigned and the page is in the Backlog again

Scenario: Marking it reviewed for the reviewer
  Given "rachel.hughes" is the reviewer
  When I click "Reviewed for Rachel Hughes" as "super.admin"
  Then the audit line ends with "(on behalf of Rachel Hughes)"
```

### Feature: Business review and sign-off
Source: [`03-business-review.feature`](features/04-review-workflow/03-business-review.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-04.03.1 · Take the business review | business owner | US-04.02.2 | 11 |
| 2 | US-04.03.2 · Sign off the page or send it back to the author | business owner | US-04.03.1 | 12 |
| 3 | US-04.03.3 · Share the page with the right business reviewers | peer reviewer | US-04.03.1 | 12 |
| 4 | US-04.03.4 · Sign off on behalf of the business reviewer as a site admin 🛡 | site admin | US-04.03.1, US-04.03.2 | 13 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given the author's review of "Cash ISA" was done by "rachel.hughes"
  And the page was sent to the business review
```

#### US-04.03.1 · Take the business review

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | business owner |
| Depends on | US-04.02.2 |
| Build wave | 11 |

**Business benefit**

Each business decision has one named owner, which gives clear accountability for customer-facing messages. Blocking the peer reviewer from also signing off enforces four-eyes separation.

**User story**

> As a business owner  
> I want to take a page that waits for business review  
> So that it is clear who decides on it  

**Acceptance criteria**

```gherkin
Scenario: Waiting for a business reviewer
  Then the stepper shows "Waiting for business review assignment"
  And My tasks lists the page under "Ready for business review"

Scenario: A business owner takes it
  Given I am signed in as "david.clarke" with Review on the page
  When I click "Assign to me"
  Then I am the business reviewer
  And the stepper shows "In business review"

Scenario: The peer reviewer cannot also do the business review
  Given I am signed in as "rachel.hughes"
  When I try to take the business review
  Then I see "You did the author's review · someone else does the business review"
```

#### US-04.03.2 · Sign off the page or send it back to the author

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | business owner |
| Depends on | US-04.03.1 |
| Build wave | 12 |

**Business benefit**

Nothing reaches customers without explicit business approval, which reduces conduct and mis-selling risk. Deciding on the page as customers see it lowers the chance of costly post-launch corrections.

**User story**

> As a business owner  
> I want to sign the page off or send it back to the author, also from full screen  
> So that I decide while looking at the page as customers will see it  

**Acceptance criteria**

```gherkin
Scenario: Signing off
  Given I am the assigned business reviewer
  When I click "Sign off"
  Then the page status is "Ready to publish"
  And the publishers see it under "Ready to publish" in My tasks
  And the author sees it under "Ready to publish" with "Waiting for a publisher"

Scenario: Someone else tries to sign off
  Given "david.clarke" is the business reviewer
  When "maria.santos" signs it off
  Then she sees "Only the assigned business reviewer can sign this page off"

Scenario: Sending it back
  When I click "Reauthor" and confirm
  Then the page is back at "Build the page"
  And both reviews start over

Scenario: Deciding in full screen
  Given I opened "Review & feedback" in full screen
  When I choose "Sign off" in the "Decision" section
  And I confirm "Yes, sign off"
  Then a full-screen message says "Signed off" with my name and the time
```

#### US-04.03.3 · Share the page with the right business reviewers

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | peer reviewer |
| Depends on | US-04.03.1 |
| Build wave | 12 |

**Business benefit**

Getting the right stakeholders in early avoids late rejections and repeated review rounds. External partners can contribute without new UCP licences, which keeps cost down.

**User story**

> As a peer reviewer  
> I want to share the page with a person, a review group or a link  
> So that the right business owners see it, even without a UCP account  

**Acceptance criteria**

```gherkin
Scenario: Share with a review group
  Given the "Share for review" dialog is open
  When I give the "Savings & Mortgages board" group access
  Then the members of the group see the page in My tasks
  And I see "Savings & Mortgages board (3 people) now has access"
  And the group is shown as a chip and cannot be added twice

Scenario: Share by e-mail with a UCP user
  When I send the review link to "maria.santos@hsbc.com"
  Then Maria Santos is assigned as the business reviewer
  And my mail app opens with the link

Scenario: Share by e-mail with someone outside UCP
  When I send the review link to "partner@example.com"
  Then I see "partner@example.com can comment through the link"

Scenario: Invalid e-mail
  When I send the review link to "not-an-email"
  Then I see "That e-mail address does not look right"
```

#### US-04.03.4 · Sign off on behalf of the business reviewer as a site admin 🛡

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | site admin |
| Depends on | US-04.03.1, US-04.03.2 |
| Build wave | 13 |

**Business benefit**

Keeping the business reviewer fixed protects the integrity of the business decision. Recorded on-behalf sign-off still lets urgent pages move without breaking the audit trail.

**User story**

> As a site admin  
> I want people to stay fixed during the business review, but be able to sign off for the assignee  
> So that the business decision is not changed behind its back, and urgent pages can still move  

**Acceptance criteria**

```gherkin
Scenario: No reassigning in business review
  Given I am signed in as "super.admin"
  Then there is no pencil next to the business reviewer in My tasks

Scenario: Signing off on behalf
  Given "david.clarke" is the business reviewer
  When I click "Sign off for David Clarke"
  Then I see "Signed off as site admin · ready to publish"
  And the audit line ends with "(on behalf of David Clarke)"
```

### Feature: Review links for people without UCP access
Source: [`04-review-links.feature`](features/04-review-workflow/04-review-links.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-04.04.1 · Read and comment through a link | guest reviewer | US-04.03.3 | 13 |
| 2 | US-04.04.2 · Decide through the link, only if invited | guest reviewer who was invited | US-04.04.1 | 14 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given the page "Cash ISA" is in business review
  And a review link was created for it
```

#### US-04.04.1 · Read and comment through a link

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | guest reviewer |
| Depends on | US-04.03.3 |
| Build wave | 13 |

**Business benefit**

Stakeholders without a UCP account can give feedback, which saves licence cost and onboarding effort. Feedback lands on the page itself, so nothing is lost in e-mail threads.

**User story**

> As a guest reviewer  
> I want to open a link, see the page full screen and comment on any part of it  
> So that I can give feedback without learning the CMS  

**Acceptance criteria**

```gherkin
Scenario: Opening a valid link
  When I open the review link
  Then I see the page full screen with a floating Comments panel
  And search engines are told not to index it

Scenario: Commenting on a part of the page
  When I click a heading on the page
  And I write "Is this rate still correct?"
  And I enter my name and e-mail
  Then the comment is saved against that heading
  And it is marked "During the business review"

Scenario: Commenting without a name
  When I post a comment without my name or e-mail
  Then I see "Add your name and e-mail so the team knows who commented"

Scenario: The stage is over
  Given the page has moved on to "Ready to publish"
  When I open the review link
  Then I see "This business review is finished. You can still read the page and the comments."
  And I cannot comment or decide

Scenario: Unknown link
  When I open a review link with an unknown token
  Then I see "This review link does not work"
```

#### US-04.04.2 · Decide through the link, only if invited

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | guest reviewer who was invited |
| Depends on | US-04.04.1 |
| Build wave | 14 |

**Business benefit**

The business can approve without a UCP account, which speeds up sign-off for busy owners. Restricting decisions to invited addresses stops forwarded links from approving content, which limits fraud and compliance risk.

**User story**

> As a guest reviewer who was invited  
> I want to sign off or send the page back from the link  
> So that the business can decide without a UCP account, while a forwarded link cannot approve anything  

**Acceptance criteria**

```gherkin
Scenario Outline: Who may sign off through the link
  Given the link was <sent>
  When a guest using "<email>" signs off
  Then <outcome>

  Examples:
    | sent                            | email                 | outcome                                                                          |
    | to "partner@example.com"        | partner@example.com   | the page is "Ready to publish" and approved by "guest:partner@example.com"      |
    | to "partner@example.com"        | other@example.com     | they see "This link was sent to partner@example.com. Use that e-mail to decide." |
    | to the "Business owners" group  | david.clarke@hsbc.com | the page is "Ready to publish"                                                   |
    | as a plain copied link          | anyone@example.com    | they see "Signing off is for the people the review was sent to."                |

Scenario: A business reviewer is already assigned
  Given "david.clarke" is the assigned business reviewer
  When another invited person tries to decide
  Then they see "David Clarke decides on this page."

Scenario: Reauthor through the link
  When the invited reviewer chooses "Reauthor" with a note
  Then the page is back at "Build the page"
  And the note is added as a comment
  And a full-screen message says "Sent back to the author"
```

### Feature: Comments on a page
Source: [`05-comments.feature`](features/04-review-workflow/05-comments.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-04.05.1 · Comment on exactly what I mean | peer reviewer or business owner | US-04.02.2 | 11 |
| 2 | US-04.05.2 · Work through the feedback | content author | US-04.05.1 | 12 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given the page "Cash ISA" is in the author's review
  And I am signed in as the reviewer
```

#### US-04.05.1 · Comment on exactly what I mean

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | peer reviewer or business owner |
| Depends on | US-04.02.2 |
| Build wave | 11 |

**Business benefit**

Feedback pinned to the exact element removes ambiguity and reduces rework. Limiting who can comment keeps feedback relevant and the review record trustworthy.

**User story**

> As a peer reviewer or business owner  
> I want to click a text, picture or component and comment on it  
> So that the author knows exactly what to change  

**Acceptance criteria**

```gherkin
Scenario Outline: Picking a target
  When I click <target> on the page
  Then the comment box shows "<label>"

  Examples:
    | target                     | label                          |
    | the masthead heading       | “Your heading here” · Masthead |
    | the masthead photo         | Background image · Masthead    |
    | empty space in a component | Key facts                      |

Scenario Outline: Invalid comments
  When I post "<text>"
  Then I see "<message>"

  Examples:
    | text                     | message                              |
    |                          | Write a comment first                |
    | 2,001 characters of text | Keep comments under 2,000 characters |

Scenario: Only people working on the page can comment in UCP
  Given I am signed in as a viewer
  When I post a comment
  Then I see "Only people who edit or review this page can comment"

Scenario: Opening comments
  When I click the Comments icon in the right rail
  Then the Comments panel opens with the number of open comments
  And "Review & feedback" next to "1:1" opens the page full screen with floating comments
```

#### US-04.05.2 · Work through the feedback

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-04.05.1 |
| Build wave | 12 |

**Business benefit**

Authors see at a glance what is still open, so no requested change is missed before sign-off. Resolved comments never leak onto the published page, which protects the customer experience.

**User story**

> As a content author  
> I want to jump to each comment's place, resolve it and undo by mistake  
> So that I see what is still open and the published page stays clean  

**Acceptance criteria**

```gherkin
Scenario: Components with open comments show a badge
  Given the "Key facts" component has 2 open comments
  Then the component shows a badge with "2"

Scenario: Jumping to what a comment is about
  When I click the chip of a comment
  Then the page scrolls to that part and flashes it

Scenario: The part was removed
  Given the commented text was deleted from the page
  When I click the chip of the comment
  Then I see "That part is not on the page any more"

Scenario: Resolving with undo
  When I resolve a comment
  Then it moves to "Resolved · not shown on the page"
  And its marker disappears from the page
  And I can click "Undo" for 6 seconds

Scenario: Pinning
  When I pin a comment
  Then it stays at the top of the list

Scenario: Deleting someone else's comment
  Given I am not a site admin
  When I delete a comment written by someone else
  Then I see "You can only delete your own comments"
```

### Feature: My tasks
Source: [`06-my-tasks.feature`](features/04-review-workflow/06-my-tasks.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-04.06.1 · See what needs me, by stage | As anyone in the content team | US-04.01.1 | 9 |
| 2 | US-04.06.2 · Follow my own pages as an author | content author | US-04.06.1 | 10 |
| 3 | US-04.06.3 · Pick up and finish work as a reviewer or publisher | peer reviewer, business owner or publisher | US-04.06.1 | 10 |
| 4 | US-04.06.4 · Oversee everything as a site admin 🛡 | site admin | US-04.06.1, US-04.06.3 | 11 |

#### US-04.06.1 · See what needs me, by stage

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | As anyone in the content team |
| Depends on | US-04.01.1 |
| Build wave | 9 |

**Business benefit**

One prioritised work list reduces time lost looking for pending work across tools. Due dates and overdue markers make bottlenecks visible to the team and management.

**User story**

> As anyone in the content team  
> I want every page in the workflow as one task in the right tab  
> So that I know what to do next without thinking  

**Acceptance criteria**

```gherkin
Scenario Outline: Task per stage
  Given a page with status "<status>"
  Then My tasks shows it in "<tab>" with the text "<text>"

  Examples:
    | status    | tab                       | text                                              |
    | review    | Backlog                   | Waiting for author's review assignment · start it |
    | inreview  | In review                 | In author's review · finish and mark reviewed     |
    | reviewed  | Reviewed                  | Author's review done · send to business review    |
    | bizreview | Ready for business review | Business review · sign off before publishing      |
    | approved  | Ready to publish          | Business review done · ready to publish           |
    | scheduled | Ready to publish          | Check scheduled publish                           |
    | failed    | Ready to publish          | Fix failed publish                                |

Scenario: People and dates on every row
  Then each row shows the Content author, the Peer reviewer and the Business reviewer with full name and e-mail
  And co-authors are listed under the Content author as "+ Name"
  And a Jira chip is shown next to the title when the page has a ticket
  And the due date shows "N days overdue", "Due today", "Due tomorrow" or the date

Scenario: Filters and markers
  Then I can search by page or person
  And I can tick "Only assigned to me"
  And I can sort by newest or by due date
  And new tasks have a red dot until I have seen them
  And the header says "N assigned to you · M new"
```

#### US-04.06.2 · Follow my own pages as an author

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-04.06.1 |
| Build wave | 10 |

**Business benefit**

Authors can track their pages without asking around, which reduces status meetings. Hiding review actions on their own work enforces four-eyes separation in the interface.

**User story**

> As a content author  
> I want to see where each of my pages is and who has it, without review buttons for my own work  
> So that I know whom to remind and when the page comes back to me  

**Acceptance criteria**

```gherkin
Scenario: My page waits for a reviewer
  Given I sent "Cash ISA" for review
  Then "Cash ISA" is not in my Backlog
  And it is under "Ready for review" with "Waiting for a reviewer to take it"

Scenario Outline: My actions on my own page
  Given my page is in "<tab>"
  Then I see "<actions>"

  Examples:
    | tab              | actions                 |
    | In review        | Remind                  |
    | Ready to publish | Waiting for a publisher |
    | Published        | Open                    |
```

#### US-04.06.3 · Pick up and finish work as a reviewer or publisher

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | peer reviewer, business owner or publisher |
| Depends on | US-04.06.1 |
| Build wave | 10 |

**Business benefit**

Taking and finishing work from one list shortens cycle time for every hand-off. Showing only the permitted action reduces errors and unauthorised steps.

**User story**

> As a peer reviewer, business owner or publisher  
> I want the action for my step right on the row  
> So that I can take and finish work from one list  

**Acceptance criteria**

```gherkin
Scenario: The Backlog is a shared bucket
  Given I am signed in as a reviewer
  Then each Backlog row has "Assign to me" instead of "Open"

Scenario Outline: Row actions
  Given a task in "<tab>"
  And I am "<who>"
  Then I see "<actions>"

  Examples:
    | tab                       | who                   | actions                       |
    | Backlog                   | a reviewer            | Assign to me                  |
    | Ready for review          | the assigned reviewer | Back to backlog, Start review |
    | In review                 | the assigned reviewer | Reviewed                      |
    | Ready for business review | a business owner      | Assign to me                  |
    | Business review           | the business reviewer | Reauthor, Sign off            |
    | Ready to publish          | a publisher           | Publish                       |
```

#### US-04.06.4 · Oversee everything as a site admin 🛡

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | site admin |
| Depends on | US-04.06.1, US-04.06.3 |
| Build wave | 11 |

**Business benefit**

Admins can balance workload across reviewers, which protects delivery dates. Restricting reassignment once a page is ready to publish keeps late changes under control.

**User story**

> As a site admin  
> I want to see all tasks, split by who has them, and change the peer reviewer  
> So that I can balance work and unblock pages  

**Acceptance criteria**

```gherkin
Scenario: Admin view
  Given I am signed in as "super.admin"
  Then tasks are split into "Assigned to me" and "Assigned to others"
  And a pencil next to the Peer reviewer lets me change the person while the page is in review

Scenario: No reassigning at Ready to publish
  Then rows in "Ready to publish" have no pencil and no "Assign to anyone"
```

### Feature: Notifications
Source: [`07-notifications.feature`](features/04-review-workflow/07-notifications.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-04.07.1 · Be told when a page is handed to me | As anyone in the content team | US-04.06.1 | 10 |
| 2 | US-04.07.2 · Act on a notification in one click | As anyone in the content team | US-04.07.1 | 11 |

#### US-04.07.1 · Be told when a page is handed to me

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | As anyone in the content team |
| Depends on | US-04.06.1 |
| Build wave | 10 |

**Business benefit**

People learn immediately when it is their turn, which removes idle time between hand-offs. Faster hand-offs shorten time to market for every page.

**User story**

> As anyone in the content team  
> I want a notification when it is my turn on a page  
> So that I don't have to keep checking My tasks  

**Acceptance criteria**

```gherkin
Scenario: The bell polls and shows unread items
  Given I am signed in
  Then the bell checks for news every 60 seconds
  And shows a badge with the number of unread items
  And "Mark all as read" clears the badge

Scenario Outline: What I am told
  Given <event>
  Then my bell shows "<message>"

  Examples:
    | event                                    | message                                                                |
    | the author reminds me about a review     | Reminder: Content Author is waiting for your review of Cash ISA       |
    | I was assigned a review                  | Super Admin assigned you to review Cash ISA                           |
    | the author's review of my page is done   | finished the author's review of Cash ISA · send it to business review |
    | the page reached business review         | sent to business review: Cash ISA · business sign-off needed          |
    | the business signed off a page I publish | finished the business review of Cash ISA · ready to publish           |
    | my draft has not been sent               | Your draft of Cash ISA is waiting to be sent for review               |
```

#### US-04.07.2 · Act on a notification in one click

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | As anyone in the content team |
| Depends on | US-04.07.1 |
| Build wave | 11 |

**Business benefit**

Overdue items stand out, so service levels and regulatory deadlines are met more reliably. One-click access cuts the time from notice to action.

**User story**

> As anyone in the content team  
> I want urgent items to stand out and to open the page from the notification  
> So that overdue work is handled first  

**Acceptance criteria**

```gherkin
Scenario: Overdue work stands out
  Given a review assigned to me is overdue
  Then its notification is marked critical

Scenario: Clicking a notification opens the page
  When I click a notification about "Cash ISA"
  Then the page opens in the page builder
```

---

## 05 · Publishing

### Feature: Publish and schedule pages
Source: [`01-publish-and-schedule.feature`](features/05-publishing/01-publish-and-schedule.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-05.01.1 · Publish a signed-off page now, together with its files | publisher | US-04.03.2, US-06.02.4 | 13 |
| 2 | US-05.01.2 · Publish later at a chosen time | publisher | US-05.01.1 | 14 |
| 3 | US-05.01.3 · Publish several pages in one go | publisher | US-05.01.1 | 14 |
| 4 | US-05.01.4 · Hand a signed-off page over to the publisher | content author | US-05.01.1 | 14 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given I am signed in as "jordan.mensah" with Publish on the folder
```

#### US-05.01.1 · Publish a signed-off page now, together with its files

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | publisher |
| Depends on | US-04.03.2, US-06.02.4 |
| Build wave | 13 |

**Business benefit**

Approved pages reach customers in one controlled step instead of a chain of manual releases. Publishing the files with the page removes broken pictures and missing documents that damage customer trust.

**User story**

> As a publisher  
> I want to put a page that passed both reviews live in one step, together with the pictures and documents it uses  
> So that customers never see a page with missing pictures or documents  

**Acceptance criteria**

```gherkin
Scenario Outline: Pages that are not ready are skipped with a reason
  Given the page "Cash ISA" has status "<status>"
  When I open the Publish dialog for it
  Then it is listed as skipped with "<reason>"

  Examples:
    | status    | reason                     |
    | review    | Still in author's review   |
    | reviewed  | Business review comes next |
    | bizreview | Still in business review   |
    | draft     | Needs review first         |
    | published | Already live               |

Scenario: The dialog lists the files on the page (step 1, "Images and files")
  Given "Cash ISA" uses the picture "hero-isa.jpg" and the PDF "isa-terms.pdf" that are not published
  When I open the Publish dialog
  Then step "Images and files" lists both files with their status
  And both are ticked to be published with the page

Scenario: Leaving a draft file behind blocks the page
  When I untick "isa-terms.pdf"
  Then I see "isa-terms.pdf stays unpublished, so the page cannot go live yet"
  And the server refuses the page with "Uses 1 file that is not published yet"

Scenario: Publish now (step 2, "Choose when to publish")
  When I choose "Publish now" and confirm
  Then the page status is "Published"
  And a live copy of the page is kept for comparisons
  And confetti and "Published! Cash ISA is live" fill the screen
```

#### US-05.01.2 · Publish later at a chosen time

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | publisher |
| Depends on | US-05.01.1 |
| Build wave | 14 |

**Business benefit**

Campaigns and rate changes go live at the agreed minute without anyone working out of hours. Fewer manual late-night releases also means fewer publishing mistakes and lower overtime cost.

**User story**

> As a publisher  
> I want to schedule a signed-off page to go live at a chosen time, and cancel that schedule if plans change  
> So that content goes live exactly when the campaign or rate change starts, without anyone being online  

**Acceptance criteria**

```gherkin
Scenario: Schedule
  When I choose "Schedule" for tomorrow at 09:00
  Then the page status is "Scheduled"
  And the audit log says "scheduled Cash ISA for" that date

Scenario: Too soon to schedule
  When I schedule the page for 2 minutes from now
  Then I see "Pick a time at least 5 minutes from now"

Scenario: A scheduled page goes live on its own
  Given "Cash ISA" is scheduled for a time that has passed
  When anyone opens a CMS screen
  Then the page is published by "system"

Scenario: Cancelling a schedule
  Given "Cash ISA" is scheduled
  When I click "Cancel schedule"
  Then the page is back at "Ready to publish"
```

#### US-05.01.3 · Publish several pages in one go

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | publisher |
| Depends on | US-05.01.1 |
| Build wave | 14 |

**Business benefit**

Related pages of a launch go live together, so customers never see half of a product release. Per-page results cut the time spent finding out what was held back and why.

**User story**

> As a publisher  
> I want to publish a selection of pages at once and see the result for each  
> So that a release of related pages goes live together and I know which ones were held back and why  

**Acceptance criteria**

```gherkin
Scenario: Bulk publish from the page list
  Given I selected 3 pages in Pages and 1 of them is still in review
  When I click "Publish" in the selection bar and publish now
  Then the 2 ready pages go live
  And "Publishing results" shows a tick for each and the reason for the third
```

#### US-05.01.4 · Hand a signed-off page over to the publisher

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-05.01.1 |
| Build wave | 14 |

**Business benefit**

Keeping publishing with authorised publishers enforces separation of duties that auditors and regulators expect. Clear hand-over status reduces chasing between teams and shortens time to market.

**User story**

> As a content author  
> I want to see that my signed-off page is waiting for a publisher instead of publishing it myself  
> So that only people with Publish put content live, and I know who acts next until I am told the page is live  

**Acceptance criteria**

```gherkin
Scenario: No Publish permission
  Given I am signed in as "content.author"
  Then a page at "Ready to publish" shows "Waiting for a publisher"
```

### Feature: Compare an authoring version with the live page
Source: [`02-compare-with-live.feature`](features/05-publishing/02-compare-with-live.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-05.02.1 · See what will change before publishing | publisher | US-05.01.1, US-03.06.4 | 14 |
| 2 | US-05.02.2 · Check an older version against live | content author | US-05.02.1 | 15 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given the page "Cash ISA" was published before and has been edited since
```

#### US-05.02.1 · See what will change before publishing

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | publisher |
| Depends on | US-05.01.1, US-03.06.4 |
| Build wave | 14 |

**Business benefit**

Publishers catch unintended changes before customers see them, lowering the risk of wrong rates or terms going live. A clear list of differences makes sign-off faster and easier to evidence.

**User story**

> As a publisher  
> I want to see the authoring version next to the live page, with every difference listed  
> So that I know exactly what will change for customers when I publish  

**Acceptance criteria**

```gherkin
Scenario: Compare is offered only for one page that has been live
  When I select "Cash ISA" alone in Pages
  Then the "Compare" button is enabled
  But it is disabled with "Not published yet · nothing to compare" for a page that was never live
  And it asks to "Pick one page to compare" when several pages are selected

Scenario: Side by side with the differences
  When I click "Compare"
  Then I see the authoring version on the left and the live page on the right
  And both sides scroll together
  And the sidebar lists each component as "Added", "Removed", "Changed" or "Moved"
  And a changed page title is listed too

Scenario: Jump to a difference
  When I click a difference in the sidebar
  Then it flashes on both sides
```

#### US-05.02.2 · Check an older version against live

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-05.02.1 |
| Build wave | 15 |

**Business benefit**

The bank can quickly establish when a change was made and what customers were shown at the time. This supports complaint handling and regulatory enquiries without costly investigation.

**User story**

> As a content author  
> I want to compare any saved version of my page with the live page  
> So that I can find when a change was made and what customers still see  

**Acceptance criteria**

```gherkin
Scenario: Pick an older authoring version
  When I choose a saved version from the authoring dropdown
  Then the left side shows that version and the differences are recalculated
```

---

## 06 · Content library

### Feature: Page templates
Source: [`01-templates.feature`](features/06-content-library/01-templates.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-06.01.1 · Build and maintain page templates 🛡 | site admin | — | 1 |
| 2 | US-06.01.2 · Limit a template to some markets 🛡 | site admin | US-06.01.1 | 2 |
| 3 | US-06.01.3 · Pick the right template for my market | content author | US-06.01.1, US-06.01.2 | 3 |

#### US-06.01.1 · Build and maintain page templates 🛡

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | site admin |
| Depends on | — |
| Build wave | 1 |

**Business benefit**

Every page type starts from an approved structure with mandatory brand and navigation parts, so brand and compliance consistency is built in. New pages are created faster, cutting time to market.

**User story**

> As a site admin  
> I want to create, edit, duplicate and delete templates the way I edit pages  
> So that every new page of a type starts consistent, with the required HSBC parts in place  

**Acceptance criteria**

```gherkin
Scenario: Editing a template
  Given I am a site admin
  When I add, move or remove components in the template editor
  Then the template saves itself
  And the HSBC menu, breadcrumb and footer cannot be removed

Scenario: Existing pages are not changed
  Then the settings say "Changing the template does not change pages already created with it."

Scenario: New, duplicate and delete
  Then I can create a template with a unique name, duplicate it as "(copy)" and delete it
  But the "Blank page" template cannot be duplicated or deleted
```

#### US-06.01.2 · Limit a template to some markets 🛡

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | site admin |
| Depends on | US-06.01.1 |
| Build wave | 2 |

**Business benefit**

Market-specific layouts cannot be reused by markets they were not approved for, reducing local regulatory and brand risk. Central teams can share templates safely without extra manual checks.

**User story**

> As a site admin  
> I want to choose in which local markets a template can be used  
> So that local templates stay local  

**Acceptance criteria**

```gherkin
Scenario: Choosing markets
  When I choose "Only some local markets" and tick "Hong Kong" in Template settings
  Then only Hong Kong can create pages from it
  And I am warned that the UK can no longer create pages from it
```

#### US-06.01.3 · Pick the right template for my market

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-06.01.1, US-06.01.2 |
| Build wave | 3 |

**Business benefit**

Authors start from approved, market-appropriate templates instead of improvising layouts, which lowers rework and review effort. Read-only access protects templates from accidental change.

**User story**

> As a content author  
> I want to browse the template library and see what each template contains and where it can be used, without being able to change it  
> So that I start pages from an approved template that is allowed in my market  

**Acceptance criteria**

```gherkin
Scenario: Read-only for everyone else
  Given I am signed in as "content.author"
  Then the template library says "Read-only · ask a site admin to change templates"
  And "Edit" buttons read "View"

Scenario: Template cards
  Then each card shows a thumbnail, the number of blocks, the folder, the markets and "used by N pages"

Scenario: A template for another market
  Given "Rates page" is for Hong Kong only
  When I open the library in the UK
  Then its card is dimmed and the button says "Not for UK"
```

### Feature: Assets (images and documents)
Source: [`02-assets.feature`](features/06-content-library/02-assets.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-06.02.1 · Upload and replace files safely | content author | — | 1 |
| 2 | US-06.02.2 · Make files accessible | content author | US-06.02.1 | 2 |
| 3 | US-06.02.3 · Find the right file | content author | US-06.02.1, US-06.02.2 | 3 |
| 4 | US-06.02.4 · Approve files for live use | publisher | US-06.02.1 | 2 |

#### US-06.02.1 · Upload and replace files safely

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | — |
| Build wave | 1 |

**Business benefit**

Files can be updated without breaking live pages, protecting the customer experience and the bank's reputation. Automatic renaming prevents costly overwrites of approved material.

**User story**

> As a content author  
> I want to upload and replace files without ever overwriting another file or deleting one that pages still use  
> So that no live page breaks because of a change in the library  

**Acceptance criteria**

```gherkin
Scenario: Uploading
  When I drop "hero.jpg" into "Campaigns"
  Then it is uploaded as a draft
  And a second "hero.jpg" becomes "hero-2.jpg"

Scenario: Replacing keeps pages working
  When I replace "hero.jpg" with a new file
  Then pages that use it show the new file
  And its alt text is kept

Scenario: Deleting a used file
  Given "hero.jpg" is used on 2 pages
  Then I cannot delete it and I am told "Remove it from pages first"
```

#### US-06.02.2 · Make files accessible

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-06.02.1 |
| Build wave | 2 |

**Business benefit**

Recording alt text and document accessibility details helps the bank meet its accessibility obligations and avoid legal risk. Customers using assistive technology get the same information as everyone else.

**User story**

> As a content author  
> I want to record alt text per language for images and the accessibility details of documents  
> So that every file on our pages can be used by customers with assistive technology  

**Acceptance criteria**

```gherkin
Scenario: Alt text per language
  When I open the accessibility panel of an image
  Then I enter alt text for every language of the market, the first one required
  And instead of alt text I can mark it "Decorative only"
  And I am told not to start with "image of" and to keep it under 150 characters

Scenario: Documents
  Then a PDF needs a title, a language and "Tagged PDF, checked"
```

#### US-06.02.3 · Find the right file

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-06.02.1, US-06.02.2 |
| Build wave | 3 |

**Business benefit**

Reusing approved files avoids duplicate purchases and repeated approvals, lowering cost. Smart views surface unused and inaccessible files so problems are fixed before audits find them.

**User story**

> As a content author  
> I want to browse files by folder and type and see which ones are unused or missing accessibility details  
> So that I reuse approved files and can clean up problems quickly  

**Acceptance criteria**

```gherkin
Scenario: Browsing
  When I open Assets
  Then I see folders with counts, a grid or list, and filters for Images, Documents and Icons

Scenario Outline: Smart views
  When I open "<view>"
  Then I see <what>

  Examples:
    | view                         | what                                        |
    | Not used on any page         | files no page uses                          |
    | Missing accessibility info   | images without alt text and untagged PDFs   |
```

#### US-06.02.4 · Approve files for live use

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | publisher |
| Depends on | US-06.02.1 |
| Build wave | 2 |

**Business benefit**

Only approved files can appear on live pages, reducing brand, legal and compliance risk. The publish record shows who approved each file and when, supporting audits.

**User story**

> As a publisher  
> I want to publish draft files and have pages refused while they still use a draft file  
> So that customers only ever see approved files  

**Acceptance criteria**

```gherkin
Scenario: Publishing a file
  Given I have Publish
  When I click "Publish" on a draft file
  Then it shows "Published" with who and when

Scenario: A page cannot go live with a draft file
  Then publishing a page that uses a draft file is refused until the file is published
```

### Feature: Content models and content entities
Source: [`03-models-and-entities.feature`](features/06-content-library/03-models-and-entities.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-06.03.1 · Define and evolve content models 🛡 | site admin | — | 1 |
| 2 | US-06.03.2 · Create reusable content items from a model | content author | US-06.03.1 | 2 |
| 3 | US-06.03.3 · Update a fact everywhere at once | content author | US-06.03.2, US-03.05.1 | 4 |

#### US-06.03.1 · Define and evolve content models 🛡

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | site admin |
| Depends on | — |
| Build wave | 1 |

**Business benefit**

Structured, validated content types give every channel consistent data and reduce errors in key facts. Guarded breaking changes protect live content and avoid costly outages.

**User story**

> As a site admin  
> I want to create content models with validated fields, publish them, and change them safely over time  
> So that authors get well-structured content types and live content is not broken by a careless change  

**Acceptance criteria**

```gherkin
Scenario: Creating a model
  Given I am a site admin
  When I create the model "Savings product" in 3 steps: information, fields and review
  Then its id is "savings-product"
  And I can "Save as draft" or "Save & publish"

Scenario Outline: Field validation
  When I add a field with <problem>
  Then I see an error

  Examples:
    | problem                                  |
    | a key that is not camelCase              |
    | a key that already exists                |
    | a minimum length above the maximum       |
    | an invalid regular expression            |
    | a select field without options           |

Scenario: Breaking changes need confirmation
  Given the model is published
  When I remove a field, change a type or make a field required and publish
  Then I must tick "I understand the impact"

Scenario: Versions
  Then every change is kept as a version I can compare and restore into the draft
```

#### US-06.03.2 · Create reusable content items from a model

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-06.03.1 |
| Build wave | 2 |

**Business benefit**

Facts such as rates are entered once, so the bank avoids inconsistent figures that could mislead customers. Blocking deletion of items in use prevents broken pages.

**User story**

> As a content author  
> I want to fill in entities from published models, see the model as documentation, and be stopped from deleting entities in use  
> So that facts like rates are written once, correctly, and no page loses its content  

**Acceptance criteria**

```gherkin
Scenario: Read-only for others
  Given I am not a site admin
  Then content models show "Read-only · documentation view"

Scenario: Creating an entity
  Given I have Edit on the market
  When I create an entity of the published model "Rate" called "ISA rates 2026"
  Then a form built from the model's fields opens

Scenario: Draft models cannot be used
  Then a model that is still a draft is disabled with "Publish the model first"

Scenario: Validation
  When I save with 2 invalid fields
  Then I see "Fix 2 fields before saving"

Scenario: Entities in use cannot be deleted
  Given "ISA rates 2026" is used on 3 pages
  When I delete it
  Then I see "Used on 3 pages · Remove it from those pages first"
```

#### US-06.03.3 · Update a fact everywhere at once

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-06.03.2, US-03.05.1 |
| Build wave | 4 |

**Business benefit**

A rate change reaches every page and channel at the same moment, lowering conduct risk from outdated figures. It removes the cost of editing many pages by hand.

**User story**

> As a content author  
> I want publishing an entity to update every page that shows it  
> So that a changed rate is correct on all pages and channels at the same moment  

**Acceptance criteria**

```gherkin
Scenario: Publishing an entity updates the pages that use it
  When I publish "ISA rates 2026"
  Then the audit log says it updates the pages that show it
  And the delivery API shows the new values on those pages
```

---

## 07 · Translations

### Feature: Translate pages
Source: [`01-translate-pages.feature`](features/07-translations/01-translate-pages.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-07.01.1 · Create translated copies of pages in a few steps | content author | US-02.01.1 | 3 |
| 2 | US-07.01.2 · Review every language version before it goes live | business owner | US-07.01.1, US-04.01.1 | 9 |

*Background — applies to every story of this feature (add it at the top of the acceptance criteria):*

```gherkin
Background:
  Given I selected "Cash ISA" and "Fixed rate bonds" in the UK market
```

#### US-07.01.1 · Create translated copies of pages in a few steps

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-02.01.1 |
| Build wave | 3 |

**Business benefit**

Pages reach every language of a market far faster than copying them by hand, shortening time to market. Wider language coverage improves access for customers and supports local language requirements.

**User story**

> As a content author  
> I want to choose the languages, how the text is translated and where the copies go, then check and create them in one flow  
> So that I can offer pages in every language of my market without copying them by hand  

**Acceptance criteria**

```gherkin
Scenario: Four steps
  When I click "Translate"
  Then I go through "Languages", "How", "Where" and "Check"

Scenario: Languages
  Then the market's own languages are shown first, then other markets' languages
  And I see "1 language × 2 pages = 2 translations" when I pick Welsh
  And a language every selected page already has is disabled with "already translated"

Scenario: How
  Then I can choose "AI draft now" or "Send to the translation vendor"

Scenario: Where
  Then I can put each translation next to its source page as "cy-cash-isa"
  And I can instead put all of them into one folder

Scenario: Check and create
  Given "cy-cash-isa" already exists
  Then the check step marks it "already exists · skipped"
  When I click "Create 1 translation"
  Then the new page waits in the review Backlog
  And it shows "Source: /banking/savings/fixed-rate-bonds" in the page list
```

#### US-07.01.2 · Review every language version before it goes live

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | business owner |
| Depends on | US-07.01.1, US-04.01.1 |
| Build wave | 9 |

**Business benefit**

Translations get the same checks as originals, so no unverified wording about products or terms reaches customers. This keeps the bank compliant in every language it publishes.

**User story**

> As a business owner  
> I want every translated page to go through the same author's review and business review as the original  
> So that no unchecked translation reaches customers  

**Acceptance criteria**

```gherkin
Scenario: Translations always go through the workflow
  Then every translated page is created at "Waiting for author's review assignment"
  And it needs the author's review and the business review before it can be published
```

---

## 08 · Governance

### Feature: Audit log and dashboard
Source: [`01-audit-and-dashboard.feature`](features/08-governance/01-audit-and-dashboard.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-08.01.1 · Search and export a full audit trail 🛡 | site admin | US-01.03.1 | 2 |
| 2 | US-08.01.2 · See my own activity | content author | US-08.01.1 | 3 |
| 3 | US-08.01.3 · See what needs attention | content author | US-08.01.1, US-04.06.1 | 10 |

#### US-08.01.1 · Search and export a full audit trail 🛡

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | site admin |
| Depends on | US-01.03.1 |
| Build wave | 2 |

**Business benefit**

The bank can answer auditors and regulators with complete evidence of who changed what and when. Fast search and CSV export cut the cost of compliance reviews.

**User story**

> As a site admin  
> I want every change recorded with who, what, when and a request id, and to search and export everyone's events  
> So that the bank can prove who did what to auditors and regulators  

**Acceptance criteria**

```gherkin
Scenario: Audit entries
  When anyone saves, sends for review, reviews, signs off, publishes, archives, deletes or changes permissions
  Then the audit log gets a line with the person, the action, the page and a request id

Scenario: Finding events
  Then I can filter by Content, Publishing, Permissions or System
  And search by person, page, action or request id
  And choose All time, Today or Last 2 days
  And export the result to CSV
```

#### US-08.01.2 · See my own activity

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-08.01.1 |
| Build wave | 3 |

**Business benefit**

Staff can check their own work without seeing colleagues' activity, respecting need-to-know access. Fewer support requests to admins lowers operating cost.

**User story**

> As a content author  
> I want to see a log of my own actions only  
> So that I can check what I did without seeing other people's activity  

**Acceptance criteria**

```gherkin
Scenario: Admins see everyone, others see themselves
  Given I am not a site admin
  When I open the audit log
  Then it is titled "My activity" and shows only my actions
```

#### US-08.01.3 · See what needs attention

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | content author |
| Depends on | US-08.01.1, US-04.06.1 |
| Build wave | 10 |

**Business benefit**

Waiting reviews and failed publishes are spotted early, so content reaches customers on time. Managers get a quick view of throughput without manual reporting.

**User story**

> As a content author  
> I want a dashboard that summarises waiting reviews, how much of the site is live, failed publishes, my tasks and recent activity  
> So that I see at a glance where work stands and what to do next  

**Acceptance criteria**

```gherkin
Scenario: Dashboard tiles
  When I open the dashboard
  Then I see how many pages wait for review and how old the oldest is
  And the share of the site that is live
  And failed publishes as "N failed · A publish failed and needs action"
  And my top 5 tasks with overdue ones in red
  And the latest 5 activity lines

Scenario: Nothing waiting
  Given no page waits for review
  Then the tile says "Nothing waiting. Nice."
```

---

## 09 · Delivery API

### Feature: Content delivery API
Source: [`01-delivery-api.feature`](features/09-delivery-api/01-delivery-api.feature)

| # | Story | Persona | Depends on | Wave |
|---|---|---|---|---|
| 1 | US-09.01.1 · Get only approved content, and preview drafts separately | front-end developer | US-05.01.1 | 14 |
| 2 | US-09.01.2 · Render pages straight from the JSON | front-end developer | US-09.01.1, US-03.05.1, US-06.02.1 | 15 |
| 3 | US-09.01.3 · Explore and try the API in the CMS | front-end developer | US-09.01.1, US-09.01.2 | 16 |

#### US-09.01.1 · Get only approved content, and preview drafts separately

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | front-end developer |
| Depends on | US-05.01.1 |
| Build wave | 14 |

**Business benefit**

Only approved content can reach customers through any channel, reducing the risk of leaking unreleased offers. Separate previews let teams test upcoming pages without affecting live sites.

**User story**

> As a front-end developer  
> I want the public API to return only published pages, with a separate preview address for drafts  
> So that customers only ever see approved content while I can still test upcoming pages  

**Acceptance criteria**

```gherkin
Scenario: List of published pages
  When I call "GET /api/delivery/v1/pages?market=uk"
  Then I get only published pages with route, title, template, updatedAt and a link

Scenario: A draft page is not public
  When I call "GET /api/delivery/v1/pages/banking/new-offer" for a page that is not published
  Then I get 404 "Not published" pointing to the preview address

Scenario: Preview includes drafts
  When I call "GET /api/delivery/v1/preview/pages/banking/new-offer"
  Then I get the page JSON
```

#### US-09.01.2 · Render pages straight from the JSON

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | front-end developer |
| Depends on | US-09.01.1, US-03.05.1, US-06.02.1 |
| Build wave | 15 |

**Business benefit**

All websites and apps show the same approved content from one source, cutting duplicate work across channels. Ready-to-use JSON and schemas shorten integration time and reduce rendering errors.

**User story**

> As a front-end developer  
> I want page JSON with resolved values, image renditions, form references and meta, plus a JSON Schema for each model  
> So that any channel can render the content without extra lookups or guesswork  

**Acceptance criteria**

```gherkin
Scenario: Page JSON
  Then tokens are replaced with published entity values
  And images come with original, hero and card rendition addresses
  And forms come as an embed reference with their version
  And meta has the canonical address of the page

Scenario: Schemas
  When I call "GET /api/delivery/v1/models/rate"
  Then I get a JSON Schema with the required fields and localised fields marked
```

#### US-09.01.3 · Explore and try the API in the CMS

| Field | Value |
|---|---|
| Issue type | Story |
| Story type | Functional |
| Sprint | TBD |
| Team | WPB Digital Browser: Tools |
| Persona | front-end developer |
| Depends on | US-09.01.1, US-09.01.2 |
| Build wave | 16 |

**Business benefit**

Developers integrate new channels faster without waiting for separate documentation. Self-service exploration lowers support effort and time to market.

**User story**

> As a front-end developer  
> I want a screen that shows each page's address and JSON, the model schemas and all endpoints, with "Copy URL" and "Try it"  
> So that I can integrate quickly without reading separate documentation  

**Acceptance criteria**

```gherkin
Scenario: API & delivery screen
  When I open "API & delivery"
  Then I can pick a page and see its public or preview address, its JSON, "Copy URL" and "Try it"
  And see the JSON Schema of each model and a table of all endpoints
```

---

## Build waves (whole product)

Stories in the same wave can be built in parallel once the earlier waves are done.

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
