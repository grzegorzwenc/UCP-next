# Story map

## Creating these stories in Jira

The hierarchy is **Epic → Story**: create the 9 epics first (issue type Epic, same Team and Sprint), then the stories under them.

### Epics

Create the 9 epics first. Each epic section below has a card with the values and a description ready to paste.

| Jira field | Value |
|---|---|
| Issue type | **Epic** |
| Epic name / Summary | Epic ID and name, e.g. `EP-03 · Page builder` |
| Team | **WPB Digital Browser: Tools** |
| Description | **Business benefit** (two sentences), **Scope**, and the list of its stories |

### Stories

Use these settings for **every** story in this map:

| Jira field | Value |
|---|---|
| Issue type | **Story** |
| Story type | **Functional** |
| Sprint | **TBD** |
| Team | **WPB Digital Browser: Tools** |
| Epic Link | The epic the story sits under, e.g. `EP-03 · Page builder` |
| Summary | Story ID and name, e.g. `US-03.04 · Never lose my work` |
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
- Copy the acceptance criteria exactly from the epic file (linked under each epic below), including the story's Background if it has one; `Scenario Outline` tables go in as they are.
- Create the stories in the order of this map; record each `Depends on` as an issue link "is blocked by" to the story it names.
- Keep the story ID at the start of the Summary, so Jira tickets and the epic files can always be matched.

## How to read it

**Epic → Story**, exactly as in Jira. Each epic starts with its own card (name, business benefit, scope, a description ready to paste), then one table of its stories; every row is one Jira Story with its **ID · name**, **persona**, **business benefit** and **user story**. Right under each story, click **Acceptance criteria** to open its scenarios. `Depends on` = create as "is blocked by" links. **Wave** = earliest build wave across the whole product (wave 1 needs nothing; a story can start once everything it depends on is done). 🛡 site-admin story · ⏭ planned, not built yet · 🧪 runs on a stand-in today (mock).

**9 epics · 87 stories · 16 build waves.** Generated from the `.feature` files with `python3 tools/story-map.py` — edit the epic files, then regenerate.

| Epic | Stories | Source |
|---|---|---|
| [EP-01 · Access & navigation](#ep-01-access--navigation) | 9 | [`01-access-and-navigation.feature`](epics/01-access-and-navigation.feature) |
| [EP-02 · Pages](#ep-02-pages) | 8 | [`02-pages.feature`](epics/02-pages.feature) |
| [EP-03 · Page builder](#ep-03-page-builder) | 20 | [`03-page-builder.feature`](epics/03-page-builder.feature) |
| [EP-04 · Review workflow](#ep-04-review-workflow) | 26 | [`04-review-workflow.feature`](epics/04-review-workflow.feature) |
| [EP-05 · Publishing](#ep-05-publishing) | 6 | [`05-publishing.feature`](epics/05-publishing.feature) |
| [EP-06 · Content library](#ep-06-content-library) | 10 | [`06-content-library.feature`](epics/06-content-library.feature) |
| [EP-07 · Translations](#ep-07-translations) | 2 | [`07-translations.feature`](epics/07-translations.feature) |
| [EP-08 · Governance](#ep-08-governance) | 3 | [`08-governance.feature`](epics/08-governance.feature) |
| [EP-09 · Delivery API](#ep-09-delivery-api) | 3 | [`09-delivery-api.feature`](epics/09-delivery-api.feature) |

---

## EP-01 · Access & navigation

| Epic field | Value |
|---|---|
| Issue type | Epic |
| Epic name / Summary | EP-01 · Access & navigation |
| Team | WPB Digital Browser: Tools |
| Business benefit | Only identified staff with the right permissions can change customer-facing content, which closes the door to anonymous or unauthorised changes. One platform for every market and environment replaces separate country tools and cuts licence and support cost. |
| Scope | Who you are, where you are and what you may do: sign-in, markets and environments, navigation, roles and permissions. |
| Stories | 9 · US-01.01 to US-01.09 |

<details><summary>Epic description to paste into Jira</summary>

```text
Business benefit
Only identified staff with the right permissions can change customer-facing content, which closes the door to anonymous or unauthorised changes. One platform for every market and environment replaces separate country tools and cuts licence and support cost.

Scope
Who you are, where you are and what you may do: sign-in, markets and environments, navigation, roles and permissions.

Stories
US-01.01 · Sign in with the company account
US-01.02 · Open a review link without an account
US-01.03 · Try the private demo as any person
US-01.04 · Switch between markets
US-01.05 · Always know which environment I am in
US-01.06 · Reach any screen quickly on any device
US-01.07 · Give each role and workflow step the right permissions
US-01.08 · Manage people and their permissions
US-01.09 · Only site admins can change access
```

</details>

Source: [`01-access-and-navigation.feature`](epics/01-access-and-navigation.feature)

**Stories**

<table>
<tr><th>#</th><th>Story</th><th>Persona</th><th>Business benefit</th><th>User story</th><th>Depends on</th><th>Wave</th></tr>
<tr><td>1</td><td><b>US-01.01</b> · Sign in with the company account 🧪</td><td>content author</td><td>Only identified staff can reach the CMS, which closes the door to anonymous changes on customer-facing pages. Every action is tied to a named person, giving auditors a reliable trail.</td><td>As a content author<br>I want to sign in with my company account and land where I was going<br>So that UCP knows who I am and only signed-in people reach the CMS<br>Note: the prototype uses an SSO stand-in (pick an account, no password). Real SSO is on the roadmap.</td><td>—</td><td>1</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 5 scenarios</summary><p><b>Scenario 1</b> · Opening a screen without a session</p><pre lang="gherkin">Given I am not signed in
When I open &quot;/uk/prod/pages&quot;
Then I am sent to &quot;/login?next=/uk/prod/pages&quot;</pre><p><b>Scenario 2</b> · Sign in with company SSO</p><pre lang="gherkin">Given I am on &quot;/login?next=/uk/prod/pages&quot;
When I click &quot;Sign in with company SSO&quot; and choose &quot;Super admin&quot;
Then I am on &quot;/uk/prod/pages&quot;
And the audit log says &quot;signed in (SSO stand-in)&quot;</pre><p><b>Scenario 3</b> · Only internal addresses are followed</p><pre lang="gherkin">Given the login link says &quot;next=//evil.example&quot;
When I sign in
Then I am on &quot;/uk/prod/dashboard&quot;</pre><p><b>Scenario 4</b> · Sign out</p><pre lang="gherkin">When I open the account menu and click &quot;Sign out&quot;
Then I am on the login screen</pre><p><b>Scenario 5</b> · Session length</p><pre lang="gherkin">Then a session lasts 12 hours</pre></details></td></tr>
<tr><td>2</td><td><b>US-01.02</b> · Open a review link without an account 🧪</td><td>guest reviewer</td><td>External and occasional reviewers can sign off pages without the bank buying and managing extra CMS licences. Reviews happen sooner because nobody waits for an account to be created.</td><td>As a guest reviewer<br>I want to open a review link without signing in<br>So that I can give feedback on a page without a CMS account<br>Note: the prototype uses an SSO stand-in (pick an account, no password). Real SSO is on the roadmap.</td><td>US-04.12</td><td>14</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Scenario</b> · Review links do not need a session</p><pre lang="gherkin">When I open a review link &quot;/review/&lt;token&gt;&quot;
Then the page opens without signing in</pre></details></td></tr>
<tr><td>3</td><td><b>US-01.03</b> · Try the private demo as any person 🧪</td><td>business owner</td><td>Stakeholders can evaluate every role before the bank commits to a rollout, reducing the risk of a costly wrong choice. The demo stays private, so unfinished screens and sample data are never exposed publicly.</td><td>As a business owner<br>I want the hosted demo kept behind a password and to try it as any demo person<br>So that I can evaluate every role without exposing the demo to the public<br>Note: the prototype uses an SSO stand-in (pick an account, no password). Real SSO is on the roadmap.</td><td>US-01.01</td><td>2</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · The hosted demo is behind a password</p><pre lang="gherkin">Given the demo password is configured
When I open any address of the demo without it
Then the browser asks for a user name and password
And search engines are told not to index the demo</pre><p><b>Scenario 2</b> · Demo accounts</p><pre lang="gherkin">When I open &quot;/login?demo=1&quot;
Then every demo person is listed with their role and team</pre></details></td></tr>
<tr><td>4</td><td><b>US-01.04</b> · Switch between markets</td><td>content author</td><td>One platform serves every market, so the bank runs and pays for a single CMS instead of one per country. Authors working across markets make fewer wrong-market edits.</td><td>As a content author<br>I want to pick an instance and market and switch market without losing my place<br>So that I can work across several countries on one platform without confusion</td><td>—</td><td>1</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · Instances <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">When I choose the instance &quot;&lt;instance&gt;&quot;
Then the market list shows &lt;markets&gt;
Examples:
  | instance | markets              |
  | EMEA     | UK, France, Germany, UAE |
  | APAC     | Hong Kong, Singapore |
  | NA       | Mexico               |</pre><p><b>Scenario 2</b> · Switching market keeps my place</p><pre lang="gherkin">Given I am on Pages in the UK
When I switch to &quot;HSBC France&quot;
Then I am on Pages in France</pre></details></td></tr>
<tr><td>5</td><td><b>US-01.05</b> · Always know which environment I am in</td><td>publisher</td><td>Constant visibility of the environment prevents accidental publication to customers, a costly and reputationally damaging incident. Teams can test freely in staging with confidence.</td><td>As a publisher<br>I want the environment and its consequences always visible<br>So that I never publish to customers by mistake</td><td>—</td><td>1</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Scenario</b> · Environment note <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">When I choose &quot;&lt;environment&gt;&quot;
Then the dashboard says &quot;&lt;note&gt;&quot;
Examples:
  | environment | note                                              |
  | Production  | Publishing here goes live for customers.          |
  | Staging     | Nothing in this environment reaches customers.    |</pre></details></td></tr>
<tr><td>6</td><td><b>US-01.06</b> · Reach any screen quickly on any device</td><td>content author</td><td>Authors spend less time hunting through menus, which raises daily output at no extra cost. The same tool works on laptops and small screens, so work does not stall away from the desk.</td><td>As a content author<br>I want a command palette, a global search and a menu that fits my screen<br>So that every page and section is a couple of keystrokes away</td><td>—</td><td>1</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Scenario 1</b> · Command palette</p><pre lang="gherkin">When I press ⌘ K
Then I can find pages and go to any section
And in the page builder I can ask AI or add a component from it
And Tab stays inside the palette and Esc returns focus to where I was</pre><p><b>Scenario 2</b> · Global search</p><pre lang="gherkin">When I type &quot;isa&quot; into the top search
Then I see up to 8 pages, 5 assets, 4 people, 3 templates and 3 models
And Enter opens the first result</pre><p><b>Scenario 3</b> · Side menu <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given my screen is &lt;width&gt;
Then the side menu is &lt;behaviour&gt;
Examples:
  | width                 | behaviour                                   |
  | 1100 px or wider      | full, and I can collapse it to icons        |
  | 768 to 1099 px        | icons only                                  |
  | narrower than 768 px  | hidden behind ☰ and opens as a drawer       |</pre></details></td></tr>
<tr><td>7</td><td><b>US-01.07</b> · Give each role and workflow step the right permissions</td><td>business owner</td><td>Approval rights follow the bank&#x27;s segregation-of-duties rules, which supports regulatory compliance. Sensible defaults also cut the admin effort of setting up each new person.</td><td>As a business owner<br>I want each role to come with sensible defaults and each workflow step to need its permission<br>So that only qualified people edit, approve and publish content</td><td>—</td><td>1</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the permissions are Read, Edit, Review &amp; approve, Publish and Manage
And they are granted on the whole site or on a top-level folder</pre><p><b>Scenario 1</b> · Role defaults <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given a person with the role &quot;&lt;role&gt;&quot; and no individual grants
Then they can &lt;permissions&gt;
Examples:
  | role       | permissions                              |
  | Author     | read and edit                            |
  | Reviewer   | read, edit and review                    |
  | Publisher  | read, review and publish                 |
  | Site admin | do everything                            |
  | Viewer     | read                                     |</pre><p><b>Scenario 2</b> · Status changes <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">When someone moves a page to &quot;&lt;status&gt;&quot;
Then they need &lt;permission&gt;
Examples:
  | status                    | permission         |
  | Build the page (draft)    | Edit               |
  | Waiting for review        | Edit               |
  | In author&#x27;s review        | Review &amp; approve   |
  | Ready to publish          | Review &amp; approve   |
  | Scheduled / Published     | Publish            |</pre></details></td></tr>
<tr><td>8</td><td><b>US-01.08</b> · Manage people and their permissions 🛡</td><td>site admin</td><td>Access can be tailored per folder, so teams work independently without over-privileged accounts. Every grant is logged, which makes access reviews and audits straightforward.</td><td>As a site admin<br>I want to invite people and grant them permissions on the right folders<br>So that everyone has exactly the access their job needs</td><td>US-01.07</td><td>2</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the permissions are Read, Edit, Review &amp; approve, Publish and Manage
And they are granted on the whole site or on a top-level folder</pre><p><b>Scenario 1</b> · Granting a permission</p><pre lang="gherkin">Given I am a site admin on &quot;Users &amp; roles&quot;
When I click &quot;Edit&quot; on the &quot;Banking&quot; row for &quot;anna.kowalczyk&quot;
Then she has Edit on Banking and also Read there
And the audit log says &quot;gave Anna Kowalczyk Edit on Banking&quot;</pre><p><b>Scenario 2</b> · Inherited permissions</p><pre lang="gherkin">Given &quot;rachel.hughes&quot; has Review on the whole site
Then each folder row shows Review as &quot;Inherited from whole site&quot;</pre><p><b>Scenario 3</b> · Inviting a person</p><pre lang="gherkin">When I invite &quot;Sam Taylor&quot; as an Author
Then the sign-in id is &quot;sam.taylor&quot;
And they get the Author permissions on the whole site</pre></details></td></tr>
<tr><td>9</td><td><b>US-01.09</b> · Only site admins can change access</td><td>business owner</td><td>Server-side enforcement closes a privilege-escalation risk that would otherwise undermine every other control. It gives security and audit teams evidence that access rules cannot be bypassed.</td><td>As a business owner<br>I want only site admins to change users and permissions, enforced on screen and on the server<br>So that nobody can grant themselves more than they should have</td><td>US-01.08</td><td>3</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the permissions are Read, Edit, Review &amp; approve, Publish and Manage
And they are granted on the whole site or on a top-level folder</pre><p><b>Scenario 1</b> · Non-admins see only themselves</p><pre lang="gherkin">Given I am signed in as &quot;content.author&quot;
When I open &quot;Users &amp; roles&quot;
Then I see only my own profile
And &quot;Only site admins can change users and permissions&quot;</pre><p><b>Scenario 2</b> · The server refuses changes from non-admins</p><pre lang="gherkin">Given I am a viewer
When I save components of a page or change a user
Then the answer is 403 with a request id</pre></details></td></tr>
</table>

---

## EP-02 · Pages

| Epic field | Value |
|---|---|
| Issue type | Epic |
| Epic name / Summary | EP-02 · Pages |
| Team | WPB Digital Browser: Tools |
| Business benefit | Pages are found, created and reorganised without broken links, lost work or accidental deletions, which protects customers from dead ends. Archive-before-delete and impact warnings remove a whole class of costly publishing incidents. |
| Scope | The site tree and safe page operations: find, create, organise, lock, archive and delete pages without breaking anything. |
| Stories | 8 · US-02.01 to US-02.08 |

<details><summary>Epic description to paste into Jira</summary>

```text
Business benefit
Pages are found, created and reorganised without broken links, lost work or accidental deletions, which protects customers from dead ends. Archive-before-delete and impact warnings remove a whole class of costly publishing incidents.

Scope
The site tree and safe page operations: find, create, organise, lock, archive and delete pages without breaking anything.

Stories
US-02.01 · Find any page in the market
US-02.02 · Create pages and folders from on-brand templates
US-02.03 · Know what an action will change before it happens
US-02.04 · Move and copy pages without breaking or overwriting anything
US-02.05 · Lock a page while I work on it
US-02.06 · Override someone else's lock
US-02.07 · Archive pages instead of deleting them
US-02.08 · See everything affected before deleting permanently
```

</details>

Source: [`02-pages.feature`](epics/02-pages.feature)

**Stories**

<table>
<tr><th>#</th><th>Story</th><th>Persona</th><th>Business benefit</th><th>User story</th><th>Depends on</th><th>Wave</th></tr>
<tr><td>1</td><td><b>US-02.01</b> · Find any page in the market</td><td>content author</td><td>Authors find the right page in seconds, which saves time on every task across all markets. Fewer duplicate pages get created because existing ones are easy to find.</td><td>As a content author<br>I want to browse the folder tree and search the whole market<br>So that I quickly find the page I need to work on</td><td>US-01.07</td><td>2</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in to the &quot;HSBC UK&quot; market in &quot;Production&quot;</pre><p><b>Scenario 1</b> · Browsing folders</p><pre lang="gherkin">When I open Pages
Then I see the folder tree on the left and the pages of the current folder in a table
And the table shows Name, Status, URL, Template and Updated
And translated pages show their locale and a &quot;Source:&quot; link</pre><p><b>Scenario 2</b> · Search across the market</p><pre lang="gherkin">When I type &quot;isa&quot; into &quot;Find a page by title or URL&quot;
Then pages from every folder that match are listed</pre><p><b>Scenario 3</b> · Long folders load in parts</p><pre lang="gherkin">Given a folder has 120 pages
Then 50 are shown with &quot;Show 50 more&quot;</pre></details></td></tr>
<tr><td>2</td><td><b>US-02.02</b> · Create pages and folders from on-brand templates</td><td>content author</td><td>Every new page starts on-brand and market-appropriate, reducing rework and brand-compliance findings in review. Folder permissions keep teams from cluttering areas they do not own.</td><td>As a content author<br>I want to create folders and new pages from a template allowed in my market, where I have Edit<br>So that the site structure stays tidy and every page starts on-brand</td><td>US-02.01, US-06.03</td><td>4</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 5 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in to the &quot;HSBC UK&quot; market in &quot;Production&quot;</pre><p><b>Scenario 1</b> · Creating a page</p><pre lang="gherkin">When I click &quot;New page&quot;
And I enter the title &quot;Regular saver&quot;
Then the URL name becomes &quot;regular-saver&quot;
When I choose the &quot;Product page&quot; template and click &quot;Create and open&quot;
Then the page builder opens with the template&#x27;s components
And the masthead heading says &quot;Regular saver&quot;
And I am the first author of the page</pre><p><b>Scenario 2</b> · Templates limited to other markets are not offered</p><pre lang="gherkin">Given the &quot;Rates page&quot; template is for Hong Kong only
When I click &quot;New page&quot; in the UK market
Then &quot;Rates page&quot; is not in the template list</pre><p><b>Scenario 3</b> · Starting from the template library</p><pre lang="gherkin">When I click &quot;Use template&quot; on &quot;Campaign landing&quot;
Then the New page dialog opens with &quot;Campaign landing&quot; chosen</pre><p><b>Scenario 4</b> · Creating a folder</p><pre lang="gherkin">When I click &quot;New folder&quot; and enter &quot;Insurance&quot;
Then the folder &quot;Insurance&quot; appears in the tree</pre><p><b>Scenario 5</b> · Read-only folder</p><pre lang="gherkin">Given I don&#x27;t have Edit on &quot;Borrowing&quot;
Then the folder shows &quot;Read-only in this folder&quot;
And there is no &quot;New page&quot; or &quot;New folder&quot;</pre></details></td></tr>
<tr><td>3</td><td><b>US-02.03</b> · Know what an action will change before it happens</td><td>content author</td><td>Clear impact warnings prevent accidental changes to live pages and the customer complaints they cause. Showing only allowed actions also reduces support requests and permission errors.</td><td>As a content author<br>I want to see only the actions I may take and a confirmation that explains their impact<br>So that I never change pages by accident</td><td>—</td><td>1</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the &quot;Banking&quot; folder</pre><p><b>Scenario 1</b> · Confirmation with impact <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">When I choose &quot;&lt;action&gt;&quot; for &quot;Cash ISA&quot;
Then a confirmation explains &quot;&lt;impact&gt;&quot;
Examples:
  | action    | impact                                                                  |
  | Move      | the address changes and old bookmarks of live pages break               |
  | Copy      | copies are created as drafts with the same components                   |
  | Duplicate | a copy called &quot;Cash ISA (copy)&quot; appears in the same folder as a draft   |
  | Lock      | only you and site admins can change, move or delete it                  |
  | Restore   | each page goes back to its last saved version; the current one is kept  |</pre><p><b>Scenario 2</b> · Selection bar</p><pre lang="gherkin">When I tick several pages
Then the bar offers Translate, Publish, Lock, Copy, Restore, Compare, Move, Archive and Delete with icons
And without Edit on every selected item only Translate and Publish are offered</pre></details></td></tr>
<tr><td>4</td><td><b>US-02.04</b> · Move and copy pages without breaking or overwriting anything</td><td>content author</td><td>Reorganising the site no longer produces broken links that harm customer experience and search ranking. Colleagues&#x27; pages are never overwritten, avoiding lost work and rework.</td><td>As a content author<br>I want moves to update the links that point to a page and copies never to replace an existing page<br>So that reorganising the site never breaks links or someone else&#x27;s work</td><td>US-02.03, US-02.02</td><td>5</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 5 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the &quot;Banking&quot; folder</pre><p><b>Scenario 1</b> · Pages that link here are updated</p><pre lang="gherkin">Given 2 pages link to &quot;Cash ISA&quot;
When I move &quot;Cash ISA&quot; to &quot;Savings&quot;
Then the confirmation lists the 2 pages
And &quot;Update their links to the new address&quot; is ticked
And after moving, their links point to the new address</pre><p><b>Scenario 2</b> · A folder cannot move into itself</p><pre lang="gherkin">When I move &quot;Banking&quot; into &quot;Banking/Savings&quot;
Then that destination is not offered</pre><p><b>Scenario 3</b> · Moving to the same folder</p><pre lang="gherkin">When I move pages to the folder they are already in
Then I see &quot;They are already in that folder&quot;</pre><p><b>Scenario 4</b> · Copying into the same folder</p><pre lang="gherkin">When I copy &quot;Cash ISA&quot; into its own folder
Then the copy is called &quot;cash-isa-copy&quot; and titled &quot;Cash ISA (copy)&quot;</pre><p><b>Scenario 5</b> · Folders are not copied</p><pre lang="gherkin">When I copy a selection that contains a folder
Then I see &quot;Folders are not copied · pick pages&quot;</pre></details></td></tr>
<tr><td>5</td><td><b>US-02.05</b> · Lock a page while I work on it</td><td>content author</td><td>Locks prevent conflicting edits on sensitive pages while they are being prepared. Reviews and publishing continue, so the lock never delays time-critical releases.</td><td>As a content author<br>I want a page I locked to be changeable only by me or a site admin<br>So that nobody edits, moves or deletes it while it is mine</td><td>US-02.03</td><td>2</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the &quot;Banking&quot; folder</pre><p><b>Scenario 1</b> · Someone else tries to edit a locked page</p><pre lang="gherkin">Given &quot;rachel.hughes&quot; locked &quot;Cash ISA&quot;
When I edit, move or delete it
Then I see &quot;Locked by Rachel Hughes&quot; and &quot;Ask them or a site admin to unlock it in Pages&quot;
But reviews and publishing of the page still go on</pre><p><b>Scenario 2</b> · Unlocking someone else&#x27;s lock</p><pre lang="gherkin">When I try to unlock &quot;Cash ISA&quot; locked by &quot;rachel.hughes&quot;
Then I see &quot;Cash ISA is locked by Rachel Hughes&quot;</pre></details></td></tr>
<tr><td>6</td><td><b>US-02.06</b> · Override someone else&#x27;s lock 🛡</td><td>site admin</td><td>Work is never blocked by an absent colleague, which protects deadlines for campaigns and regulatory updates. Keeping the override with site admins keeps it controlled and accountable.</td><td>As a site admin<br>I want to change or unlock a page that someone else locked<br>So that work is not blocked when the person who locked it is unavailable</td><td>US-02.05</td><td>3</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the &quot;Banking&quot; folder</pre><p><b>Scenario</b> · A site admin unlocks someone else&#x27;s lock</p><pre lang="gherkin">Given &quot;rachel.hughes&quot; locked &quot;Cash ISA&quot;
And I am a site admin
When I unlock &quot;Cash ISA&quot; in Pages
Then the page is unlocked and can be changed, moved or deleted again</pre></details></td></tr>
<tr><td>7</td><td><b>US-02.07</b> · Archive pages instead of deleting them</td><td>content author</td><td>Making archive the default removes the risk of permanently losing content that may be needed again or for record-keeping. Restoring is quick, saving the cost of rebuilding pages.</td><td>As a content author<br>I want to archive pages I no longer need and restore them later<br>So that nothing is lost by mistake</td><td>—</td><td>1</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 4 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the folder</pre><p><b>Scenario 1</b> · Delete always offers Archive first</p><pre lang="gherkin">When I choose &quot;Delete&quot; for &quot;Old offer&quot;
Then I am asked &quot;Archive “Old offer” instead of deleting?&quot;
And &quot;Archive&quot; is the main button and &quot;No, delete permanently…&quot; the alternative</pre><p><b>Scenario 2</b> · Archiving a page</p><pre lang="gherkin">When I archive &quot;Old offer&quot;
Then it leaves the page list, My tasks and search
And if it was live it goes offline
And it appears in &quot;Archive · 1&quot; at the bottom of the folder with who archived it and when</pre><p><b>Scenario 3</b> · Restoring from the archive</p><pre lang="gherkin">When I click &quot;Restore&quot; on &quot;Old offer&quot; in the archive
Then it is back in the list as a draft</pre><p><b>Scenario 4</b> · Locked pages cannot be archived by others</p><pre lang="gherkin">Given another person locked &quot;Old offer&quot;
When I archive it
Then I see that it is locked by them</pre></details></td></tr>
<tr><td>8</td><td><b>US-02.08</b> · See everything affected before deleting permanently</td><td>content author</td><td>Showing every affected link and file before deletion prevents broken customer journeys and orphaned documents. Permanent deletion becomes a deliberate, documented decision.</td><td>As a content author<br>I want to see links, linked content, files and pages inside before I delete for good<br>So that broken links are visible before they happen</td><td>US-02.07, US-06.04, US-03.15</td><td>4</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the folder</pre><p><b>Scenario 1</b> · References are checked</p><pre lang="gherkin">Given 3 pages link to &quot;Old offer&quot;
And it shows the entity &quot;ISA rates 2026&quot; that is also on 2 other pages
And it uses the file &quot;offer.pdf&quot; that no other page uses
When I choose &quot;No, delete permanently…&quot;
Then I see &quot;3 pages link here&quot; with the list of pages
And &quot;Linked content&quot; says the entity is not deleted and is also on 2 other pages
And &quot;Files used only here&quot; lets me tick &quot;offer.pdf&quot; to delete it too</pre><p><b>Scenario 2</b> · Deleting a folder deletes the pages inside</p><pre lang="gherkin">When I delete the folder &quot;Campaigns 2025&quot; with 4 pages, 1 of them live
Then I see &quot;Everything inside is deleted too: 4 pages&quot; and &quot;1 live page goes offline&quot;
And I must type &quot;delete&quot; to confirm</pre></details></td></tr>
</table>

---

## EP-03 · Page builder

| Epic field | Value |
|---|---|
| Issue type | Epic |
| Epic name / Summary | EP-03 · Page builder |
| Team | WPB Digital Browser: Tools |
| Business benefit | Authors build on-brand, compliant pages themselves from approved components, without developers, which shortens time to market for every campaign and rate change. Built-in quality checks and reusable patterns catch errors early and keep every market looking like HSBC. |
| Scope | Making a page: HSBC components, in-place editing, design patterns, quality checks, AI help, linked content and working together. |
| Stories | 20 · US-03.01 to US-03.20 |

<details><summary>Epic description to paste into Jira</summary>

```text
Business benefit
Authors build on-brand, compliant pages themselves from approved components, without developers, which shortens time to market for every campaign and rate change. Built-in quality checks and reusable patterns catch errors early and keep every market looking like HSBC.

Scope
Making a page: HSBC components, in-place editing, design patterns, quality checks, AI help, linked content and working together.

Stories
US-03.01 · Add on-brand components from the library
US-03.02 · Edit text where it is shown
US-03.03 · Arrange and configure every component the same way
US-03.04 · Never lose my work
US-03.05 · Check the page on every device width
US-03.06 · Reuse a section in one click
US-03.07 · Save my own design pattern
US-03.08 · Remove my patterns safely
US-03.09 · Remove built-in design-system patterns
US-03.10 · See and fix what blocks publishing
US-03.11 · Check any element while previewing
US-03.12 · Improve one component with AI
US-03.13 · Let AI plan page-wide changes that I approve
US-03.14 · Keep AI within page permissions
US-03.15 · Show shared content from one place
US-03.16 · Keep page text and linked content consistent
US-03.17 · Build a page together with other authors
US-03.18 · Assign other people as authors
US-03.19 · Link a page to its Jira ticket
US-03.20 · Go back to any earlier version
```

</details>

Source: [`03-page-builder.feature`](epics/03-page-builder.feature)

**Stories**

<table>
<tr><th>#</th><th>Story</th><th>Persona</th><th>Business benefit</th><th>User story</th><th>Depends on</th><th>Wave</th></tr>
<tr><td>1</td><td><b>US-03.01</b> · Add on-brand components from the library</td><td>content author</td><td>Pages are built only from approved components, so brand and compliance quality is built in rather than checked later. Authors produce pages without developer help, lowering cost and time to market.</td><td>As a content author<br>I want to find components in the library and add them where I need them<br>So that every page is built only from approved HSBC components</td><td>US-02.02</td><td>5</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the page &quot;Cash ISA&quot;
And the page is at &quot;Build the page&quot;</pre><p><b>Scenario 1</b> · Adding a component</p><pre lang="gherkin">Given the &quot;Key facts&quot; component is selected
When I click &quot;Add&quot; on &quot;Rates table&quot; in the component library
Then the rates table is added below &quot;Key facts&quot;
And I see &quot;Rates table added · click ✎ Edit to fill it in&quot;</pre><p><b>Scenario 2</b> · Finding a component</p><pre lang="gherkin">When I type &quot;faq&quot; into &quot;Find a component…&quot;
Then only &quot;FAQ&quot; is listed</pre><p><b>Scenario 3</b> · An empty page offers starter layouts</p><pre lang="gherkin">Given the page has no components
Then I see &quot;How do you want to start this page?&quot; with 3 layouts</pre></details></td></tr>
<tr><td>2</td><td><b>US-03.02</b> · Edit text where it is shown</td><td>content author</td><td>Authors see exactly what customers will see, which reduces review rounds caused by layout surprises. Restricting link formats also blocks unsafe links from reaching customers.</td><td>As a content author<br>I want to type and format text directly on the page<br>So that I see the result as customers will while I write</td><td>US-03.01</td><td>6</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 4 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the page &quot;Cash ISA&quot;
And the page is at &quot;Build the page&quot;</pre><p><b>Scenario 1</b> · Editing a heading in place</p><pre lang="gherkin">When I click the masthead heading
Then I can type straight away with the caret where I clicked
When I press Enter
Then the heading is saved</pre><p><b>Scenario 2</b> · Long text needs ⌘ Enter</p><pre lang="gherkin">When I edit a paragraph and press ⌘ Enter
Then the paragraph is saved</pre><p><b>Scenario 3</b> · Changing a button</p><pre lang="gherkin">When I click a button that has a link
Then a &quot;Button&quot; box lets me change the label and the URL</pre><p><b>Scenario 4</b> · Formatting</p><pre lang="gherkin">When I edit a paragraph
Then I can make text bold, italic, underlined, a link, a bullet list or a numbered list
And links must start with https, mailto, tel, / or #</pre></details></td></tr>
<tr><td>3</td><td><b>US-03.03</b> · Arrange and configure every component the same way</td><td>content author</td><td>One consistent way to configure all components shortens training for new authors. Locking components protects mandatory content such as disclaimers from accidental edits.</td><td>As a content author<br>I want the same toolbar on every component and a Configure panel with all its properties<br>So that I can move, protect and fine-tune any component without learning each one</td><td>US-03.01</td><td>6</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the page &quot;Cash ISA&quot;
And the page is at &quot;Build the page&quot;</pre><p><b>Scenario 1</b> · Component toolbar</p><pre lang="gherkin">When I select a component
Then I see &quot;✎ Edit&quot;, &quot;Pattern&quot;, &quot;✨ AI&quot;, move up, move down, delete and &quot;⋯ More&quot;
And &quot;⋯ More&quot; offers Duplicate, Copy, Paste after, Hide, Lock, Version history and Delete</pre><p><b>Scenario 2</b> · Locked component</p><pre lang="gherkin">Given the &quot;Disclaimer&quot; component is locked
When I click its text
Then I see &quot;This block is locked. Unlock it from ⋯ More.&quot;</pre><p><b>Scenario 3</b> · Configure panel</p><pre lang="gherkin">When I click a component
Then Configure opens with Content, Layout, Behaviour and Metadata
And required fields are marked &quot;required&quot;
And Cancel puts back the values from when Configure opened</pre></details></td></tr>
<tr><td>4</td><td><b>US-03.04</b> · Never lose my work</td><td>content author</td><td>Authors never redo work after a closed tab or a lost connection. Fewer lost edits also mean fewer errors slipping into reviewed pages.</td><td>As a content author<br>I want the page to save itself, to save on demand and to tell me when saving fails<br>So that no edit is ever lost</td><td>US-03.02</td><td>7</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the page &quot;Cash ISA&quot;
And the page is at &quot;Build the page&quot;</pre><p><b>Scenario 1</b> · Autosave</p><pre lang="gherkin">When I stop typing for about a second
Then the page saves itself and shows &quot;✓ Saved&quot;</pre><p><b>Scenario 2</b> · Save button and shortcut</p><pre lang="gherkin">Then a &quot;Save&quot; button sits next to &quot;Preview&quot; while there are unsaved changes
And ⌘ S saves at once</pre><p><b>Scenario 3</b> · Save failed</p><pre lang="gherkin">Given the server cannot be reached
Then I see &quot;Not saved · Retry&quot;</pre></details></td></tr>
<tr><td>5</td><td><b>US-03.05</b> · Check the page on every device width</td><td>content author</td><td>Problems on mobile and tablet are caught before review, when they are cheapest to fix. Customers get a consistent experience on every device, which protects trust and conversion.</td><td>As a content author<br>I want to preview the page at desktop, tablet and mobile width and full screen<br>So that it works for every customer before I send it for review</td><td>US-03.01</td><td>6</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the page &quot;Cash ISA&quot;
And the page is at &quot;Build the page&quot;</pre><p><b>Scenario 1</b> · Device preview <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">When I choose &quot;&lt;device&gt;&quot;
Then the page is drawn at &lt;width&gt; px and the label says &quot;1:1 · &lt;width&gt; px&quot;
Examples:
  | device  | width |
  | desktop | 1200  |
  | tablet  | 768   |
  | mobile  | 390   |</pre><p><b>Scenario 2</b> · Full-screen preview</p><pre lang="gherkin">When I click &quot;Preview&quot; or press ⌘ ⇧ F
Then the page fills the screen and Esc goes back to editing</pre></details></td></tr>
<tr><td>6</td><td><b>US-03.06</b> · Reuse a section in one click</td><td>content author</td><td>Common sections look identical across pages, strengthening brand consistency for customers. Adding a whole section in one click saves authors significant build time.</td><td>As a content author<br>I want to pick a design pattern from its own library and add all its components at once<br>So that common sections look the same on every page</td><td>US-03.01</td><td>6</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the page</pre><p><b>Scenario 1</b> · Opening the pattern library</p><pre lang="gherkin">When I click the &quot;Design patterns&quot; tile in the left rail
Then I see the patterns with live thumbnails
And design-system patterns are labelled &quot;Design system&quot; and mine &quot;Saved&quot;</pre><p><b>Scenario 2</b> · Adding a pattern</p><pre lang="gherkin">When I click &quot;Product introduction&quot;
Then Masthead, Content master and Icon tiles are added below the selected component
And I see &quot;Product introduction added · 3 components&quot;</pre></details></td></tr>
<tr><td>7</td><td><b>US-03.07</b> · Save my own design pattern</td><td>content author</td><td>Proven sections are reused instead of rebuilt, spreading good practice across teams and markets. Market targeting stops a pattern from appearing where it does not fit local rules.</td><td>As a content author<br>I want to save components already on the page as a named pattern, for all or only some markets<br>So that I and my colleagues can reuse a section that works</td><td>US-03.06, US-03.03</td><td>7</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 6 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the page</pre><p><b>Scenario 1</b> · Creating a pattern</p><pre lang="gherkin">When I click &quot;Create a design pattern&quot;
And I click the &quot;Content master&quot; and &quot;Icon tiles&quot; components
Then they get the numbers 1 and 2
And the bar says &quot;New design pattern · 2 components&quot;
When I click &quot;Name it and save…&quot; and enter &quot;Savings intro&quot;
Then &quot;Savings intro&quot; is in the pattern library</pre><p><b>Scenario 2</b> · Starting from a component</p><pre lang="gherkin">When I click &quot;Pattern&quot; on the toolbar of a component
Then the new pattern starts with that component</pre><p><b>Scenario 3</b> · A pattern needs two components</p><pre lang="gherkin">Given I picked one component
Then &quot;Name it and save…&quot; is disabled and the bar says &quot;pick at least one more&quot;</pre><p><b>Scenario 4</b> · Names are unique</p><pre lang="gherkin">When I save a pattern called &quot;Product introduction&quot;
Then I see &quot;A pattern with this name already exists&quot;</pre><p><b>Scenario 5</b> · UK-only pattern</p><pre lang="gherkin">When I save a pattern for &quot;Only some local markets&quot; with only &quot;UK&quot; ticked
Then UK pages see it
And Hong Kong pages do not</pre><p><b>Scenario 6</b> · Changing the markets later</p><pre lang="gherkin">When I click &quot;Markets&quot; on my pattern and untick the current market
Then I am warned &quot;This market will no longer see it. Pages that already use it keep their components.&quot;</pre></details></td></tr>
<tr><td>8</td><td><b>US-03.08</b> · Remove my patterns safely</td><td>content author</td><td>The pattern library stays tidy without risking pages that already use a pattern. Two-step removal prevents losing valuable shared work by mistake.</td><td>As a content author<br>I want to archive my own patterns first and delete them for good only on purpose<br>So that a pattern is never lost by mistake and pages that use it are not affected</td><td>US-03.07</td><td>8</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the page</pre><p><b>Scenario 1</b> · Archive and restore</p><pre lang="gherkin">When I click the bin on my pattern and choose &quot;Archive&quot;
Then it moves to &quot;Archived · 1&quot; and can be restored</pre><p><b>Scenario 2</b> · Delete for good</p><pre lang="gherkin">Given my pattern is archived
When I click &quot;Delete&quot; and type &quot;delete&quot;
Then it is gone for good
And pages that use it keep their components</pre><p><b>Scenario 3</b> · Who may remove a pattern <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given the pattern &quot;&lt;pattern&gt;&quot;
When &quot;&lt;who&gt;&quot; removes it
Then &lt;outcome&gt;
Examples:
  | pattern               | who            | outcome                                                   |
  | saved by me           | me             | it is archived                                            |
  | saved by someone else | me             | there is no bin on it                                     |
  | Product introduction  | content.author | there is no bin on it                                     |</pre></details></td></tr>
<tr><td>9</td><td><b>US-03.09</b> · Remove built-in design-system patterns 🛡</td><td>site admin</td><td>Outdated design-system sections can be retired centrally, so new pages do not reuse superseded designs. Restricting this to site admins protects the shared library from accidental removal.</td><td>As a site admin<br>I want to remove built-in design-system patterns that ordinary authors cannot touch<br>So that the shared pattern library stays current</td><td>US-03.08</td><td>9</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in with Edit on the page</pre><p><b>Scenario</b> · A site admin removes a design-system pattern <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given the pattern &quot;&lt;pattern&gt;&quot;
When &quot;&lt;who&gt;&quot; removes it
Then &lt;outcome&gt;
Examples:
  | pattern               | who            | outcome                                                   |
  | Product introduction  | super.admin    | it is archived                                            |</pre></details></td></tr>
<tr><td>10</td><td><b>US-03.10</b> · See and fix what blocks publishing</td><td>content author</td><td>Automatic checks catch accessibility, compliance and SEO issues before review, reducing regulatory and reputational risk. Reviewers spend their time on substance rather than mechanical mistakes.</td><td>As a content author<br>I want findings grouped by how serious they are, with one-click fixes and a way to find them on the page<br>So that the page reaches review without mistakes a machine can find</td><td>US-03.02</td><td>7</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 4 scenarios</summary><p><b>Scenario 1</b> · Verdict</p><pre lang="gherkin">Given the page has 2 critical findings
Then Page insights says &quot;2 things to fix before publishing&quot;
And the findings are listed under &quot;Must fix&quot;, &quot;Should fix&quot; and &quot;Checks passed&quot;</pre><p><b>Scenario 2</b> · Checks <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given &lt;situation&gt;
Then Page insights reports &quot;&lt;finding&gt;&quot; as &lt;level&gt;
Examples:
  | situation                                         | finding                       | level    |
  | a required field is empty                         | empty required field          | critical |
  | an image has no alt text and is not decorative    | image without alt text        | critical |
  | a token does not match a linked entity            | broken token                  | critical |
  | the page has rates but no disclaimer              | no disclaimer                 | critical |
  | a heading is longer than 60 characters            | long heading                  | warning  |
  | a button says &quot;Click here&quot;                        | vague call to action          | warning  |
  | the text says &quot;guaranteed&quot;                        | risky wording                 | warning  |
  | the meta description is missing                   | no description                | warning  |</pre><p><b>Scenario 3</b> · One-click fixes</p><pre lang="gherkin">Given a button says &quot;Learn more&quot;
When I click the fix
Then the button says &quot;See the details&quot; and I see &quot;Fixed: …&quot;</pre><p><b>Scenario 4</b> · Show on page</p><pre lang="gherkin">When I click &quot;Show on page&quot; on a finding
Then the component is selected and scrolled into view</pre></details></td></tr>
<tr><td>11</td><td><b>US-03.11</b> · Check any element while previewing</td><td>content author</td><td>Authors verify each element in the context customers see, catching issues earlier and more cheaply. A consistent checklist raises the baseline quality of every page.</td><td>As a content author<br>I want a quality checklist that follows my pointer in full-screen preview<br>So that I can check the whole page and each element as customers will see it</td><td>US-03.05, US-06.05</td><td>7</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Scenario 1</b> · Whole page</p><pre lang="gherkin">Given I am in full-screen Preview of my draft
And I am not pointing at anything
Then the floating &quot;Quality checklist&quot; shows title tag, meta description, canonical URL, page type, one masthead and required fields</pre><p><b>Scenario 2</b> · One element</p><pre lang="gherkin">When I point at a heading
Then the checklist shows: has text, length within the limit, not the example text, no risky wording</pre><p><b>Scenario 3</b> · Pinning</p><pre lang="gherkin">When I click a heading
Then the checklist stays on it until I click it again</pre></details></td></tr>
<tr><td>12</td><td><b>US-03.12</b> · Improve one component with AI 🧪</td><td>content author</td><td>AI speeds up copy improvements while the author keeps full control over every change. Showing before and after prevents unreviewed AI text from reaching customers.</td><td>As a content author<br>I want AI to suggest changes to the selected component only, shown before and after<br>So that I can accept or reject each suggestion knowing exactly what changes<br>Note: the prototype uses a deterministic offline planner (lib/ai/planner.ts, lib/ai/mock.ts).</td><td>US-03.03</td><td>7</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · Before and after</p><pre lang="gherkin">Given the &quot;Masthead&quot; component is selected
When I click &quot;✨ AI&quot; and choose &quot;Make this more concise&quot;
Then I see the old and the new text of each changed field
And I can &quot;Apply&quot; or &quot;Discard&quot;</pre><p><b>Scenario 2</b> · Nothing to change</p><pre lang="gherkin">Given the component has no button
When I ask &quot;Make the CTA more compelling&quot;
Then I see &quot;This block has no button.&quot;</pre></details></td></tr>
<tr><td>13</td><td><b>US-03.13</b> · Let AI plan page-wide changes that I approve 🧪</td><td>content author</td><td>Page-wide changes such as accessibility or SEO fixes take minutes instead of hours. Approval and undo for each change keep accountability with the author and limit the risk of AI errors.</td><td>As a content author<br>I want the page AI to show its plan first and change nothing until I run the changes I ticked<br>So that I work faster on whole pages and can undo anything<br>Note: the prototype uses a deterministic offline planner (lib/ai/planner.ts, lib/ai/mock.ts).</td><td>US-03.04</td><td>8</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Scenario 1</b> · Plan, run, review</p><pre lang="gherkin">When I ask the page AI &quot;Make this page work better on mobile&quot;
Then I see the stages Understanding, Plan, Executing, Review and Done
And every planned change has a checkbox, all ticked
When I untick one change and click &quot;Run plan · 3 changes&quot;
Then the 3 changes are applied one by one
And each change has Undo and Redo, and there is &quot;Undo all&quot;
And I see &quot;Applied 3 of 4 changes · Save the page to keep them&quot;</pre><p><b>Scenario 2</b> · What the planner understands <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">When I ask &quot;&lt;prompt&gt;&quot;
Then the plan &lt;does&gt;
Examples:
  | prompt                         | does                                                            |
  | Design a landing page          | lays out a full page, or adds sections to an existing page      |
  | Translate to Welsh             | translates the text fields with the glossary                    |
  | Make it accessible             | adds alt text, an h1 and descriptive buttons                    |
  | Improve SEO                    | writes a meta description of up to 155 characters and adds an FAQ |
  | Add a promo for the new card   | adds rich text and a banner after the masthead                  |
  | Polish it                      | shortens long text and fixes vague buttons                      |</pre><p><b>Scenario 3</b> · The page already follows the patterns</p><pre lang="gherkin">When I ask &quot;Polish it&quot; on a page with nothing to improve
Then I see &quot;Page already follows HSBC content patterns — nothing to change&quot;</pre></details></td></tr>
<tr><td>14</td><td><b>US-03.14</b> · Keep AI within page permissions 🧪</td><td>business owner</td><td>AI cannot become a loophole around the bank&#x27;s access controls, which protects content integrity. This gives risk and compliance teams confidence to approve AI use.</td><td>As a business owner<br>I want AI to refuse to plan changes for people who may only read a page<br>So that AI never becomes a way around permissions<br>Note: the prototype uses a deterministic offline planner (lib/ai/planner.ts, lib/ai/mock.ts).</td><td>US-03.13</td><td>9</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Scenario</b> · Viewer</p><pre lang="gherkin">Given I have only Read on the page
When I ask the page AI anything
Then nothing is planned and I am told the page is read-only</pre></details></td></tr>
<tr><td>15</td><td><b>US-03.15</b> · Show shared content from one place</td><td>content author</td><td>Rates and product details are maintained once and update everywhere, cutting maintenance effort. It removes the risk of customers seeing outdated or conflicting figures on different pages.</td><td>As a content author<br>I want to link an entity to the page and use its fields in text and component fields<br>So that a change to the content appears on every page that uses it</td><td>US-06.09</td><td>3</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the entity &quot;ISA rates 2026&quot; of the model &quot;Rate&quot; exists</pre><p><b>Scenario 1</b> · Linking an entity to the page</p><pre lang="gherkin">When I open &quot;Entities&quot; in the right rail and click &quot;＋ Add entity&quot;
And I choose &quot;ISA rates 2026&quot;
Then it is linked with the alias &quot;rate&quot;
And I see &quot;Added ISA rates 2026 · use {{rate.title}} in text&quot;</pre><p><b>Scenario 2</b> · Choosing content for a field</p><pre lang="gherkin">When I click the content icon next to the &quot;Heading&quot; field
And I choose Folder, Entity &quot;ISA rates 2026&quot; and Field &quot;aer&quot;
And I click &quot;Use this content&quot;
Then the heading shows the value of &quot;aer&quot;
And the field says &quot;⤓ From ISA rates 2026 · aer&quot;</pre><p><b>Scenario 3</b> · Typing a token</p><pre lang="gherkin">When I type &quot;{{&quot; while editing a text
Then the content picker opens and the token is inserted at the caret</pre></details></td></tr>
<tr><td>16</td><td><b>US-03.16</b> · Keep page text and linked content consistent</td><td>content author</td><td>Broken or missing shared content is flagged before it reaches customers, protecting accuracy of regulated information. Authors can still detach content deliberately, with a clear trace.</td><td>As a content author<br>I want to detach a field on purpose and be warned about tokens and entities that do not match<br>So that the page never shows broken or missing shared content</td><td>US-03.15</td><td>4</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the entity &quot;ISA rates 2026&quot; of the model &quot;Rate&quot; exists</pre><p><b>Scenario 1</b> · Stop inheriting</p><pre lang="gherkin">When I click &quot;Stop inheriting&quot; under a field
Then the token is replaced by its current text</pre><p><b>Scenario 2</b> · Tokens for entities that are not linked</p><pre lang="gherkin">Given the text contains &quot;{{offer.title}}&quot; but no entity &quot;offer&quot; is linked
Then Entities shows it under &quot;Not linked yet&quot; with a &quot;Link&quot; picker
And Page insights reports a broken token</pre><p><b>Scenario 3</b> · An entity in use cannot be removed</p><pre lang="gherkin">Given &quot;{{rate.aer}}&quot; is used 2 times in the text
Then the entity shows &quot;used 2× in the text&quot; and has no remove button</pre></details></td></tr>
<tr><td>17</td><td><b>US-03.17</b> · Build a page together with other authors</td><td>content author</td><td>Larger pages are delivered faster because several authors can share the work. Clear ownership means reviewers and managers always know who is responsible.</td><td>As a content author<br>I want to join or leave the authors of a page while it is being built<br>So that we can share the work and everyone sees who is responsible</td><td>US-02.02</td><td>5</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 4 scenarios</summary><p><b>Scenario 1</b> · Joining as an author</p><pre lang="gherkin">Given &quot;Super Admin&quot; created the page and is its only author
And I am signed in as &quot;jordan.mensah&quot; with Edit
Then the hint says &quot;Super Admin is building this page · Assign me to work on it with them&quot;
When I click &quot;Assign me&quot;
Then the Authors chip shows &quot;You + 1&quot;
And the hint says &quot;Building it together with Super Admin&quot;</pre><p><b>Scenario 2</b> · Leaving</p><pre lang="gherkin">When I click &quot;Leave&quot; in the Authors list
Then I am no longer an author</pre><p><b>Scenario 3</b> · Authors are fixed after the first stage</p><pre lang="gherkin">Given the page was sent for review
When anyone changes the authors
Then they see &quot;Authors can only change while the page is at Build the page&quot;</pre><p><b>Scenario 4</b> · Co-authors in My tasks</p><pre lang="gherkin">Given the page has 2 authors
Then My tasks shows the second one under the Content author as &quot;+ Name&quot;</pre></details></td></tr>
<tr><td>18</td><td><b>US-03.18</b> · Assign other people as authors 🛡</td><td>site admin</td><td>Managers can hand out work deliberately and keep delivery on schedule. Every assignment is logged and limited to people with Edit, keeping access controlled.</td><td>As a site admin<br>I want to add or remove other people as authors of a page<br>So that work is handed out deliberately and nobody is assigned behind their back</td><td>US-03.17</td><td>6</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Scenario 1</b> · A site admin adds an author</p><pre lang="gherkin">Given I am signed in as &quot;super.admin&quot;
When I choose &quot;aisha.khan&quot; in &quot;Add a person…&quot; in the Authors list and click &quot;Add&quot;
Then &quot;aisha.khan&quot; is an author of the page
And the audit log says &quot;assigned Aisha Khan as an author of&quot; the page</pre><p><b>Scenario 2</b> · The person must be able to edit</p><pre lang="gherkin">When I add someone without Edit on the page
Then I see that they don&#x27;t have Edit on this page</pre><p><b>Scenario 3</b> · Only site admins assign other people</p><pre lang="gherkin">Given I am not a site admin
When I try to add &quot;aisha.khan&quot; as an author
Then I see &quot;Only a site admin can assign other people&quot;</pre></details></td></tr>
<tr><td>19</td><td><b>US-03.19</b> · Link a page to its Jira ticket</td><td>content author</td><td>Every page change is traceable to the business request behind it, which supports audit and change management. Reviewers reach the context in one click, speeding up approval.</td><td>As a content author<br>I want to link the page to its Jira ticket and open it in one click<br>So that the work is traceable to the request behind it</td><td>—</td><td>1</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · Linking a ticket <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">When I enter &quot;&lt;input&gt;&quot; into &quot;Jira ticket&quot; in Page settings and save
Then &lt;outcome&gt;
Examples:
  | input                                         | outcome                                                        |
  | ucp-482                                       | the chip &quot;UCP-482 ↗&quot; links to https://hsbc.atlassian.net/browse/UCP-482 |
  | https://jira.example.com/browse/MKT-7         | the chip &quot;MKT-7 ↗&quot; links to that address                       |
  | not a link                                    | I see &quot;Paste a Jira link (https://…) or a ticket key like UCP-123&quot; |</pre><p><b>Scenario 2</b> · Opening the ticket</p><pre lang="gherkin">When I click the Jira chip next to the page title or in My tasks
Then the ticket opens in a new tab</pre></details></td></tr>
<tr><td>20</td><td><b>US-03.20</b> · Go back to any earlier version</td><td>content author</td><td>Any mistake can be reversed quickly, limiting the impact of an incorrect change. A full version history supports audit and regulatory record-keeping.</td><td>As a content author<br>I want every save kept as a version that I can restore or comment on<br>So that any change can be reversed and discussed</td><td>US-03.04</td><td>8</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · Restoring a version</p><pre lang="gherkin">When I open Version history and click &quot;Restore&quot; on an earlier version
And I confirm &quot;Unsaved edits in the builder are replaced. A copy of the current page is kept as a new version.&quot;
Then the page goes back to that version
And the version before the restore is kept</pre><p><b>Scenario 2</b> · Commenting on a version</p><pre lang="gherkin">When I click &quot;Comment&quot; on a version
Then the comment says &quot;About the version from …&quot;</pre></details></td></tr>
</table>

---

## EP-04 · Review workflow

| Epic field | Value |
|---|---|
| Issue type | Epic |
| Epic name / Summary | EP-04 · Review workflow |
| Team | WPB Digital Browser: Tools |
| Business benefit | Every page is checked by separate people for content and for business sign-off before it goes live, which builds the four-eyes control regulators expect into the tool itself. Clear hand-offs, tasks and reminders remove idle time between teams and make delays visible. |
| Scope | The four-eyes approval chain: the author hands the page to a peer reviewer, then to the business, with comments, review links, My tasks and notifications. |
| Stories | 26 · US-04.01 to US-04.26 |

<details><summary>Epic description to paste into Jira</summary>

```text
Business benefit
Every page is checked by separate people for content and for business sign-off before it goes live, which builds the four-eyes control regulators expect into the tool itself. Clear hand-offs, tasks and reminders remove idle time between teams and make delays visible.

Scope
The four-eyes approval chain: the author hands the page to a peer reviewer, then to the business, with comments, review links, My tasks and notifications.

Stories
US-04.01 · Request a review from the shared Backlog
US-04.02 · Check the page before handing it over
US-04.03 · Keep the page stable while it is being reviewed
US-04.04 · Take a review from the Backlog, or give it back
US-04.05 · Review the page and decide what happens next
US-04.06 · Nudge a reviewer who is taking long
US-04.07 · Steer reviews as a site admin
US-04.08 · Take the business review
US-04.09 · Sign off the page or send it back to the author
US-04.10 · Share the page with the right business reviewers
US-04.11 · Sign off on behalf of the business reviewer as a site admin
US-04.12 · Read and comment through a link
US-04.13 · Decide through the link, only if invited
US-04.14 · Comment on exactly what I mean
US-04.15 · Work through the feedback
US-04.16 · See what needs me, by stage
US-04.17 · Follow my own pages as an author
US-04.18 · Pick up and finish work as a reviewer or publisher
US-04.19 · Oversee everything as a site admin
US-04.20 · Be told when a page is handed to me
US-04.21 · Act on a notification in one click
US-04.22 · Hand the page over step by step
US-04.23 · Get the page back when someone asks for changes
US-04.24 · Nobody approves their own work
US-04.25 · Walk the whole flow as a site admin, on record
US-04.26 · Ask for publishing and hear when the page is live
```

</details>

Source: [`04-review-workflow.feature`](epics/04-review-workflow.feature)

**Stories**

<table>
<tr><th>#</th><th>Story</th><th>Persona</th><th>Business benefit</th><th>User story</th><th>Depends on</th><th>Wave</th></tr>
<tr><td>1</td><td><b>US-04.01</b> · Request a review from the shared Backlog</td><td>content author</td><td>A shared Backlog lets the first free reviewer start, so pages do not queue behind one person&#x27;s calendar. Due dates and audit entries make review turnaround measurable from day one.</td><td>As a content author<br>I want to send the page to a Backlog that every reviewer sees, with a note<br>So that the first free reviewer can take it and I don&#x27;t have to chase one person</td><td>US-03.04, US-01.07</td><td>8</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in as &quot;content.author&quot; with Edit on the folder of the page
And the page &quot;Cash ISA&quot; is at the &quot;Build the page&quot; stage</pre><p><b>Scenario 1</b> · Sending the page for review</p><pre lang="gherkin">When I click &quot;Send to author&#x27;s review&quot;
And I add the note &quot;Rates changed on 1 Oct&quot; for the reviewer
And I click &quot;Send to the Backlog&quot;
Then the page status is &quot;Waiting for author&#x27;s review assignment&quot;
And nobody is assigned to review it
And the review is due in 3 days
And the audit log says &quot;sent Cash ISA for review · open to all reviewers in the Backlog&quot;
And I see &quot;Sent for review · it is in the Backlog, any reviewer can take it&quot;</pre><p><b>Scenario 2</b> · Nobody can review the folder</p><pre lang="gherkin">Given no user has &quot;Review &amp; approve&quot; on the folder of the page
When I send the page for review
Then I see &quot;Nobody can review this page&quot;
And I am told &quot;Ask a site admin to grant Review &amp; approve on this folder&quot;</pre></details></td></tr>
<tr><td>2</td><td><b>US-04.02</b> · Check the page before handing it over</td><td>content author</td><td>Catching missing fields and quality problems before hand-off avoids wasted review cycles. Fewer round trips mean faster delivery and lower review cost.</td><td>As a content author<br>I want a last check of the page, with any problems Page insights found<br>So that I only send pages that are complete</td><td>US-04.01, US-03.10</td><td>9</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in as &quot;content.author&quot; with Edit on the folder of the page
And the page &quot;Cash ISA&quot; is at the &quot;Build the page&quot; stage</pre><p><b>Scenario 1</b> · Leaving the preview asks whether the page looks right</p><pre lang="gherkin">Given I am on the &quot;Preview&quot; step
When I leave the preview
Then I see the dialog &quot;Does everything look right?&quot;
And I can choose &quot;No, keep editing&quot; or &quot;Yes, send for review&quot;</pre><p><b>Scenario 2</b> · Page insights warn about problems but do not block sending</p><pre lang="gherkin">Given Page insights found 2 things to fix on the page
When I leave the preview
Then the dialog says &quot;Page insights found 2 things to fix. You can still send it&quot;</pre><p><b>Scenario 3</b> · Required fields are missing</p><pre lang="gherkin">Given 3 required component fields are empty
When I click &quot;Send to author&#x27;s review&quot;
Then I see &quot;Fill in 3 required fields first&quot;
And the first incomplete component opens in Configure</pre></details></td></tr>
<tr><td>3</td><td><b>US-04.03</b> · Keep the page stable while it is being reviewed</td><td>content author</td><td>Reviewers approve exactly the version that will be published, which protects the integrity of the four-eyes check. It prevents silent changes after approval that could expose the bank to conduct risk.</td><td>As a content author<br>I want the page to be read-only during review, with a clear way to take it back<br>So that reviewers check exactly what I sent</td><td>US-04.01</td><td>9</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in as &quot;content.author&quot; with Edit on the folder of the page
And the page &quot;Cash ISA&quot; is at the &quot;Build the page&quot; stage</pre><p><b>Scenario 1</b> · The page is read-only in review</p><pre lang="gherkin">Given the page was sent for review
When I open it in the page builder
Then the page is shown as a preview
And the component and AI panels say &quot;Editing takes it out of the review queue&quot;</pre><p><b>Scenario 2</b> · Taking the page back for editing</p><pre lang="gherkin">Given the page was sent for review
When I click &quot;Edit the page&quot;
And I confirm &quot;Reopen this page for editing? It will leave the review queue.&quot;
Then the page is back at &quot;Build the page&quot;</pre></details></td></tr>
<tr><td>4</td><td><b>US-04.04</b> · Take a review from the Backlog, or give it back</td><td>peer reviewer</td><td>Reviews start as soon as any reviewer is free, so pages do not wait for one person. Each review has one named owner, which makes delays visible.</td><td>As a peer reviewer<br>I want to assign a waiting page to myself and return it if I cannot do it<br>So that every review has exactly one owner and nothing gets stuck with me</td><td>US-04.01</td><td>9</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 5 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the page &quot;Cash ISA&quot; was sent for review by &quot;content.author&quot;
And &quot;rachel.hughes&quot; has &quot;Review &amp; approve&quot; on the page</pre><p><b>Scenario 1</b> · A reviewer assigns the page to themselves</p><pre lang="gherkin">Given I am signed in as &quot;rachel.hughes&quot;
When I click &quot;Assign to me&quot; on &quot;Cash ISA&quot; in the Backlog
Then I am the peer reviewer of the page
And the stepper shows &quot;Assigned to reviewer&quot;
And I see &quot;Cash ISA is yours · find it in Ready for review&quot;</pre><p><b>Scenario 2</b> · Two reviewers try to take the same page</p><pre lang="gherkin">Given &quot;aisha.khan&quot; already took &quot;Cash ISA&quot;
When I try to take it as &quot;rachel.hughes&quot;
Then I see &quot;Already assigned to Aisha Khan&quot;</pre><p><b>Scenario 3</b> · Someone without Review cannot take it</p><pre lang="gherkin">Given I am signed in as &quot;tunde.boateng&quot; who only has Read
Then the &quot;Assign to me&quot; button is disabled
And I see &quot;Only reviewers can take it · you don&#x27;t have Review &amp; approve here&quot;</pre><p><b>Scenario 4</b> · Back to backlog before the review starts <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given &quot;rachel.hughes&quot; took &quot;Cash ISA&quot; but has not started the review
And I am signed in as &quot;&lt;who&gt;&quot;
When I click &quot;Back to backlog&quot;
Then &lt;outcome&gt;
Examples:
  | who           | outcome                                                                            |
  | rachel.hughes | nobody is assigned and the page is in the Backlog again                           |
  | aisha.khan    | I see &quot;Only the assigned reviewer or a site admin can put it back in the Backlog&quot; |</pre><p><b>Scenario 5</b> · A started review cannot go back</p><pre lang="gherkin">Given the review of &quot;Cash ISA&quot; has started
When the reviewer clicks &quot;Back to backlog&quot;
Then they see &quot;The review has already started&quot;</pre></details></td></tr>
<tr><td>5</td><td><b>US-04.05</b> · Review the page and decide what happens next</td><td>peer reviewer</td><td>A single decision point moves the page on or back without extra meetings or e-mails. Only the assigned reviewer can approve, which keeps the peer check accountable and auditable.</td><td>As a peer reviewer<br>I want to finish my review with one decision: business review or back to the author<br>So that the page moves on without extra hand-offs</td><td>US-04.04</td><td>10</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 5 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the page &quot;Cash ISA&quot; was sent for review by &quot;content.author&quot;
And &quot;rachel.hughes&quot; has &quot;Review &amp; approve&quot; on the page</pre><p><b>Scenario 1</b> · Starting the review</p><pre lang="gherkin">Given I am signed in as &quot;rachel.hughes&quot; and I am assigned to &quot;Cash ISA&quot;
When I click &quot;Start review&quot;
Then the page status is &quot;In author&#x27;s review&quot;</pre><p><b>Scenario 2</b> · Only the assigned reviewer decides</p><pre lang="gherkin">Given &quot;rachel.hughes&quot; is assigned to &quot;Cash ISA&quot;
When &quot;aisha.khan&quot; marks it reviewed
Then she sees &quot;Only the assigned reviewer can approve this page&quot;</pre><p><b>Scenario 3</b> · Finishing the review opens a choice</p><pre lang="gherkin">Given the review of &quot;Cash ISA&quot; is in progress and I am the reviewer
When I click &quot;Reviewed&quot;
Then I see &quot;Author&#x27;s review done · what next?&quot;
And I can choose &quot;Send to business review&quot; or &quot;Reauthor&quot;</pre><p><b>Scenario 4</b> · Sending to the business review</p><pre lang="gherkin">When I choose &quot;Send to business review&quot;
Then the page status is &quot;In business review&quot;
And the stepper shows &quot;Waiting for business review assignment&quot;
And the &quot;Share for review&quot; dialog opens as the next step</pre><p><b>Scenario 5</b> · Sending the page back to the author</p><pre lang="gherkin">When I choose &quot;Reauthor&quot;
And I confirm &quot;Send it back to the author?&quot;
Then the page is back at &quot;Build the page&quot;
And the peer reviewer, the business reviewer and the review groups are cleared</pre></details></td></tr>
<tr><td>6</td><td><b>US-04.06</b> · Nudge a reviewer who is taking long</td><td>content author</td><td>Rate-limited reminders keep pages moving without manual chasing or noisy escalation. Shorter waiting times bring content to market faster.</td><td>As a content author<br>I want to remind the reviewer, but not more often than every 15 minutes<br>So that my page keeps moving without spamming anyone</td><td>US-04.04</td><td>10</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the page &quot;Cash ISA&quot; was sent for review by &quot;content.author&quot;
And &quot;rachel.hughes&quot; has &quot;Review &amp; approve&quot; on the page</pre><p><b>Scenario 1</b> · Sending a reminder</p><pre lang="gherkin">Given I am signed in as &quot;content.author&quot; and the review is waiting
When I click &quot;Remind&quot;
Then the reviewer gets the notification &quot;Reminder: Content Author is waiting for your review of Cash ISA&quot;</pre><p><b>Scenario 2</b> · Reminder rate limit</p><pre lang="gherkin">Given a reminder was sent 5 minutes ago
When I click &quot;Remind&quot; again
Then I see &quot;A reminder was sent a few minutes ago&quot;</pre></details></td></tr>
<tr><td>7</td><td><b>US-04.07</b> · Steer reviews as a site admin 🛡</td><td>site admin</td><td>Admins can rebalance workload and unblock stuck reviews, which protects launch dates. Every intervention is logged on behalf of the reviewer, so oversight never weakens the audit trail.</td><td>As a site admin<br>I want to reassign reviewers and act for them when needed<br>So that reviews never get stuck, and everyone can see that I stepped in</td><td>US-04.04, US-04.05</td><td>11</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 4 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the page &quot;Cash ISA&quot; was sent for review by &quot;content.author&quot;
And &quot;rachel.hughes&quot; has &quot;Review &amp; approve&quot; on the page</pre><p><b>Scenario 1</b> · Reassigning the peer reviewer</p><pre lang="gherkin">Given I am signed in as &quot;super.admin&quot;
When I click the pencil next to the peer reviewer in My tasks
And I choose &quot;aisha.khan&quot;
Then &quot;aisha.khan&quot; is the peer reviewer
And the audit log says &quot;reassigned the review of Cash ISA from Rachel Hughes to Aisha Khan&quot;</pre><p><b>Scenario 2</b> · Assigning automatically</p><pre lang="gherkin">When I choose &quot;Assign automatically&quot;
Then the reviewer with the fewest open reviews is assigned
But never the person who sent the page</pre><p><b>Scenario 3</b> · Putting any review back in the Backlog</p><pre lang="gherkin">Given &quot;rachel.hughes&quot; took &quot;Cash ISA&quot; but has not started the review
When I click &quot;Back to backlog&quot; as &quot;super.admin&quot;
Then nobody is assigned and the page is in the Backlog again</pre><p><b>Scenario 4</b> · Marking it reviewed for the reviewer</p><pre lang="gherkin">Given &quot;rachel.hughes&quot; is the reviewer
When I click &quot;Reviewed for Rachel Hughes&quot; as &quot;super.admin&quot;
Then the audit line ends with &quot;(on behalf of Rachel Hughes)&quot;</pre></details></td></tr>
<tr><td>8</td><td><b>US-04.08</b> · Take the business review</td><td>business owner</td><td>Each business decision has one named owner, which gives clear accountability for customer-facing messages. Blocking the peer reviewer from also signing off enforces four-eyes separation.</td><td>As a business owner<br>I want to take a page that waits for business review<br>So that it is clear who decides on it</td><td>US-04.05</td><td>11</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the author&#x27;s review of &quot;Cash ISA&quot; was done by &quot;rachel.hughes&quot;
And the page was sent to the business review</pre><p><b>Scenario 1</b> · Waiting for a business reviewer</p><pre lang="gherkin">Then the stepper shows &quot;Waiting for business review assignment&quot;
And My tasks lists the page under &quot;Ready for business review&quot;</pre><p><b>Scenario 2</b> · A business owner takes it</p><pre lang="gherkin">Given I am signed in as &quot;david.clarke&quot; with Review on the page
When I click &quot;Assign to me&quot;
Then I am the business reviewer
And the stepper shows &quot;In business review&quot;</pre><p><b>Scenario 3</b> · The peer reviewer cannot also do the business review</p><pre lang="gherkin">Given I am signed in as &quot;rachel.hughes&quot;
When I try to take the business review
Then I see &quot;You did the author&#x27;s review · someone else does the business review&quot;</pre></details></td></tr>
<tr><td>9</td><td><b>US-04.09</b> · Sign off the page or send it back to the author</td><td>business owner</td><td>Nothing reaches customers without explicit business approval, which reduces conduct and mis-selling risk. Deciding on the page as customers see it lowers the chance of costly post-launch corrections.</td><td>As a business owner<br>I want to sign the page off or send it back to the author, also from full screen<br>So that I decide while looking at the page as customers will see it</td><td>US-04.08</td><td>12</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 4 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the author&#x27;s review of &quot;Cash ISA&quot; was done by &quot;rachel.hughes&quot;
And the page was sent to the business review</pre><p><b>Scenario 1</b> · Signing off</p><pre lang="gherkin">Given I am the assigned business reviewer
When I click &quot;Sign off&quot;
Then the page status is &quot;Ready to publish&quot;
And the publishers see it under &quot;Ready to publish&quot; in My tasks
And the author sees it under &quot;Ready to publish&quot; with &quot;Waiting for a publisher&quot;</pre><p><b>Scenario 2</b> · Someone else tries to sign off</p><pre lang="gherkin">Given &quot;david.clarke&quot; is the business reviewer
When &quot;maria.santos&quot; signs it off
Then she sees &quot;Only the assigned business reviewer can sign this page off&quot;</pre><p><b>Scenario 3</b> · Sending it back</p><pre lang="gherkin">When I click &quot;Reauthor&quot; and confirm
Then the page is back at &quot;Build the page&quot;
And both reviews start over</pre><p><b>Scenario 4</b> · Deciding in full screen</p><pre lang="gherkin">Given I opened &quot;Review &amp; feedback&quot; in full screen
When I choose &quot;Sign off&quot; in the &quot;Decision&quot; section
And I confirm &quot;Yes, sign off&quot;
Then a full-screen message says &quot;Signed off&quot; with my name and the time</pre></details></td></tr>
<tr><td>10</td><td><b>US-04.10</b> · Share the page with the right business reviewers</td><td>peer reviewer</td><td>Getting the right stakeholders in early avoids late rejections and repeated review rounds. External partners can contribute without new UCP licences, which keeps cost down.</td><td>As a peer reviewer<br>I want to share the page with a person, a review group or a link<br>So that the right business owners see it, even without a UCP account</td><td>US-04.08</td><td>12</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 4 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the author&#x27;s review of &quot;Cash ISA&quot; was done by &quot;rachel.hughes&quot;
And the page was sent to the business review</pre><p><b>Scenario 1</b> · Share with a review group</p><pre lang="gherkin">Given the &quot;Share for review&quot; dialog is open
When I give the &quot;Savings &amp; Mortgages board&quot; group access
Then the members of the group see the page in My tasks
And I see &quot;Savings &amp; Mortgages board (3 people) now has access&quot;
And the group is shown as a chip and cannot be added twice</pre><p><b>Scenario 2</b> · Share by e-mail with a UCP user</p><pre lang="gherkin">When I send the review link to &quot;maria.santos@hsbc.com&quot;
Then Maria Santos is assigned as the business reviewer
And my mail app opens with the link</pre><p><b>Scenario 3</b> · Share by e-mail with someone outside UCP</p><pre lang="gherkin">When I send the review link to &quot;partner@example.com&quot;
Then I see &quot;partner@example.com can comment through the link&quot;</pre><p><b>Scenario 4</b> · Invalid e-mail</p><pre lang="gherkin">When I send the review link to &quot;not-an-email&quot;
Then I see &quot;That e-mail address does not look right&quot;</pre></details></td></tr>
<tr><td>11</td><td><b>US-04.11</b> · Sign off on behalf of the business reviewer as a site admin 🛡</td><td>site admin</td><td>Keeping the business reviewer fixed protects the integrity of the business decision. Recorded on-behalf sign-off still lets urgent pages move without breaking the audit trail.</td><td>As a site admin<br>I want people to stay fixed during the business review, but be able to sign off for the assignee<br>So that the business decision is not changed behind its back, and urgent pages can still move</td><td>US-04.08, US-04.09</td><td>13</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the author&#x27;s review of &quot;Cash ISA&quot; was done by &quot;rachel.hughes&quot;
And the page was sent to the business review</pre><p><b>Scenario 1</b> · No reassigning in business review</p><pre lang="gherkin">Given I am signed in as &quot;super.admin&quot;
Then there is no pencil next to the business reviewer in My tasks</pre><p><b>Scenario 2</b> · Signing off on behalf</p><pre lang="gherkin">Given &quot;david.clarke&quot; is the business reviewer
When I click &quot;Sign off for David Clarke&quot;
Then I see &quot;Signed off as site admin · ready to publish&quot;
And the audit line ends with &quot;(on behalf of David Clarke)&quot;</pre></details></td></tr>
<tr><td>12</td><td><b>US-04.12</b> · Read and comment through a link</td><td>guest reviewer</td><td>Stakeholders without a UCP account can give feedback, which saves licence cost and onboarding effort. Feedback lands on the page itself, so nothing is lost in e-mail threads.</td><td>As a guest reviewer<br>I want to open a link, see the page full screen and comment on any part of it<br>So that I can give feedback without learning the CMS</td><td>US-04.10</td><td>13</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 5 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the page &quot;Cash ISA&quot; is in business review
And a review link was created for it</pre><p><b>Scenario 1</b> · Opening a valid link</p><pre lang="gherkin">When I open the review link
Then I see the page full screen with a floating Comments panel
And search engines are told not to index it</pre><p><b>Scenario 2</b> · Commenting on a part of the page</p><pre lang="gherkin">When I click a heading on the page
And I write &quot;Is this rate still correct?&quot;
And I enter my name and e-mail
Then the comment is saved against that heading
And it is marked &quot;During the business review&quot;</pre><p><b>Scenario 3</b> · Commenting without a name</p><pre lang="gherkin">When I post a comment without my name or e-mail
Then I see &quot;Add your name and e-mail so the team knows who commented&quot;</pre><p><b>Scenario 4</b> · The stage is over</p><pre lang="gherkin">Given the page has moved on to &quot;Ready to publish&quot;
When I open the review link
Then I see &quot;This business review is finished. You can still read the page and the comments.&quot;
And I cannot comment or decide</pre><p><b>Scenario 5</b> · Unknown link</p><pre lang="gherkin">When I open a review link with an unknown token
Then I see &quot;This review link does not work&quot;</pre></details></td></tr>
<tr><td>13</td><td><b>US-04.13</b> · Decide through the link, only if invited</td><td>guest reviewer who was invited</td><td>The business can approve without a UCP account, which speeds up sign-off for busy owners. Restricting decisions to invited addresses stops forwarded links from approving content, which limits fraud and compliance risk.</td><td>As a guest reviewer who was invited<br>I want to sign off or send the page back from the link<br>So that the business can decide without a UCP account, while a forwarded link cannot approve anything</td><td>US-04.12</td><td>14</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the page &quot;Cash ISA&quot; is in business review
And a review link was created for it</pre><p><b>Scenario 1</b> · Who may sign off through the link <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given the link was &lt;sent&gt;
When a guest using &quot;&lt;email&gt;&quot; signs off
Then &lt;outcome&gt;
Examples:
  | sent                            | email                 | outcome                                                                          |
  | to &quot;partner@example.com&quot;        | partner@example.com   | the page is &quot;Ready to publish&quot; and approved by &quot;guest:partner@example.com&quot;      |
  | to &quot;partner@example.com&quot;        | other@example.com     | they see &quot;This link was sent to partner@example.com. Use that e-mail to decide.&quot; |
  | to the &quot;Business owners&quot; group  | david.clarke@hsbc.com | the page is &quot;Ready to publish&quot;                                                   |
  | as a plain copied link          | anyone@example.com    | they see &quot;Signing off is for the people the review was sent to.&quot;                |</pre><p><b>Scenario 2</b> · A business reviewer is already assigned</p><pre lang="gherkin">Given &quot;david.clarke&quot; is the assigned business reviewer
When another invited person tries to decide
Then they see &quot;David Clarke decides on this page.&quot;</pre><p><b>Scenario 3</b> · Reauthor through the link</p><pre lang="gherkin">When the invited reviewer chooses &quot;Reauthor&quot; with a note
Then the page is back at &quot;Build the page&quot;
And the note is added as a comment
And a full-screen message says &quot;Sent back to the author&quot;</pre></details></td></tr>
<tr><td>14</td><td><b>US-04.14</b> · Comment on exactly what I mean</td><td>peer reviewer or business owner</td><td>Feedback pinned to the exact element removes ambiguity and reduces rework. Limiting who can comment keeps feedback relevant and the review record trustworthy.</td><td>As a peer reviewer or business owner<br>I want to click a text, picture or component and comment on it<br>So that the author knows exactly what to change</td><td>US-04.05</td><td>11</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 4 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the page &quot;Cash ISA&quot; is in the author&#x27;s review
And I am signed in as the reviewer</pre><p><b>Scenario 1</b> · Picking a target <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">When I click &lt;target&gt; on the page
Then the comment box shows &quot;&lt;label&gt;&quot;
Examples:
  | target                     | label                          |
  | the masthead heading       | “Your heading here” · Masthead |
  | the masthead photo         | Background image · Masthead    |
  | empty space in a component | Key facts                      |</pre><p><b>Scenario 2</b> · Invalid comments <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">When I post &quot;&lt;text&gt;&quot;
Then I see &quot;&lt;message&gt;&quot;
Examples:
  | text                     | message                              |
  |                          | Write a comment first                |
  | 2,001 characters of text | Keep comments under 2,000 characters |</pre><p><b>Scenario 3</b> · Only people working on the page can comment in UCP</p><pre lang="gherkin">Given I am signed in as a viewer
When I post a comment
Then I see &quot;Only people who edit or review this page can comment&quot;</pre><p><b>Scenario 4</b> · Opening comments</p><pre lang="gherkin">When I click the Comments icon in the right rail
Then the Comments panel opens with the number of open comments
And &quot;Review &amp; feedback&quot; next to &quot;1:1&quot; opens the page full screen with floating comments</pre></details></td></tr>
<tr><td>15</td><td><b>US-04.15</b> · Work through the feedback</td><td>content author</td><td>Authors see at a glance what is still open, so no requested change is missed before sign-off. Resolved comments never leak onto the published page, which protects the customer experience.</td><td>As a content author<br>I want to jump to each comment&#x27;s place, resolve it and undo by mistake<br>So that I see what is still open and the published page stays clean</td><td>US-04.14</td><td>12</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 6 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the page &quot;Cash ISA&quot; is in the author&#x27;s review
And I am signed in as the reviewer</pre><p><b>Scenario 1</b> · Components with open comments show a badge</p><pre lang="gherkin">Given the &quot;Key facts&quot; component has 2 open comments
Then the component shows a badge with &quot;2&quot;</pre><p><b>Scenario 2</b> · Jumping to what a comment is about</p><pre lang="gherkin">When I click the chip of a comment
Then the page scrolls to that part and flashes it</pre><p><b>Scenario 3</b> · The part was removed</p><pre lang="gherkin">Given the commented text was deleted from the page
When I click the chip of the comment
Then I see &quot;That part is not on the page any more&quot;</pre><p><b>Scenario 4</b> · Resolving with undo</p><pre lang="gherkin">When I resolve a comment
Then it moves to &quot;Resolved · not shown on the page&quot;
And its marker disappears from the page
And I can click &quot;Undo&quot; for 6 seconds</pre><p><b>Scenario 5</b> · Pinning</p><pre lang="gherkin">When I pin a comment
Then it stays at the top of the list</pre><p><b>Scenario 6</b> · Deleting someone else&#x27;s comment</p><pre lang="gherkin">Given I am not a site admin
When I delete a comment written by someone else
Then I see &quot;You can only delete your own comments&quot;</pre></details></td></tr>
<tr><td>16</td><td><b>US-04.16</b> · See what needs me, by stage</td><td>As anyone in the content team</td><td>One prioritised work list reduces time lost looking for pending work across tools. Due dates and overdue markers make bottlenecks visible to the team and management.</td><td>As anyone in the content team<br>I want every page in the workflow as one task in the right tab<br>So that I know what to do next without thinking</td><td>US-04.01</td><td>9</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Scenario 1</b> · Task per stage <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given a page with status &quot;&lt;status&gt;&quot;
Then My tasks shows it in &quot;&lt;tab&gt;&quot; with the text &quot;&lt;text&gt;&quot;
Examples:
  | status    | tab                       | text                                              |
  | review    | Backlog                   | Waiting for author&#x27;s review assignment · start it |
  | inreview  | In review                 | In author&#x27;s review · finish and mark reviewed     |
  | reviewed  | Reviewed                  | Author&#x27;s review done · send to business review    |
  | bizreview | Ready for business review | Business review · sign off before publishing      |
  | approved  | Ready to publish          | Business review done · ready to publish           |
  | scheduled | Ready to publish          | Check scheduled publish                           |
  | failed    | Ready to publish          | Fix failed publish                                |</pre><p><b>Scenario 2</b> · People and dates on every row</p><pre lang="gherkin">Then each row shows the Content author, the Peer reviewer and the Business reviewer with full name and e-mail
And co-authors are listed under the Content author as &quot;+ Name&quot;
And a Jira chip is shown next to the title when the page has a ticket
And the due date shows &quot;N days overdue&quot;, &quot;Due today&quot;, &quot;Due tomorrow&quot; or the date</pre><p><b>Scenario 3</b> · Filters and markers</p><pre lang="gherkin">Then I can search by page or person
And I can tick &quot;Only assigned to me&quot;
And I can sort by newest or by due date
And new tasks have a red dot until I have seen them
And the header says &quot;N assigned to you · M new&quot;</pre></details></td></tr>
<tr><td>17</td><td><b>US-04.17</b> · Follow my own pages as an author</td><td>content author</td><td>Authors can track their pages without asking around, which reduces status meetings. Hiding review actions on their own work enforces four-eyes separation in the interface.</td><td>As a content author<br>I want to see where each of my pages is and who has it, without review buttons for my own work<br>So that I know whom to remind and when the page comes back to me</td><td>US-04.16</td><td>10</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · My page waits for a reviewer</p><pre lang="gherkin">Given I sent &quot;Cash ISA&quot; for review
Then &quot;Cash ISA&quot; is not in my Backlog
And it is under &quot;Ready for review&quot; with &quot;Waiting for a reviewer to take it&quot;</pre><p><b>Scenario 2</b> · My actions on my own page <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given my page is in &quot;&lt;tab&gt;&quot;
Then I see &quot;&lt;actions&gt;&quot;
Examples:
  | tab              | actions                 |
  | In review        | Remind                  |
  | Ready to publish | Waiting for a publisher |
  | Published        | Open                    |</pre></details></td></tr>
<tr><td>18</td><td><b>US-04.18</b> · Pick up and finish work as a reviewer or publisher</td><td>peer reviewer, business owner or publisher</td><td>Taking and finishing work from one list shortens cycle time for every hand-off. Showing only the permitted action reduces errors and unauthorised steps.</td><td>As a peer reviewer, business owner or publisher<br>I want the action for my step right on the row<br>So that I can take and finish work from one list</td><td>US-04.16</td><td>10</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · The Backlog is a shared bucket</p><pre lang="gherkin">Given I am signed in as a reviewer
Then each Backlog row has &quot;Assign to me&quot; instead of &quot;Open&quot;</pre><p><b>Scenario 2</b> · Row actions <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given a task in &quot;&lt;tab&gt;&quot;
And I am &quot;&lt;who&gt;&quot;
Then I see &quot;&lt;actions&gt;&quot;
Examples:
  | tab                       | who                   | actions                       |
  | Backlog                   | a reviewer            | Assign to me                  |
  | Ready for review          | the assigned reviewer | Back to backlog, Start review |
  | In review                 | the assigned reviewer | Reviewed                      |
  | Ready for business review | a business owner      | Assign to me                  |
  | Business review           | the business reviewer | Reauthor, Sign off            |
  | Ready to publish          | a publisher           | Publish                       |</pre></details></td></tr>
<tr><td>19</td><td><b>US-04.19</b> · Oversee everything as a site admin 🛡</td><td>site admin</td><td>Admins can balance workload across reviewers, which protects delivery dates. Restricting reassignment once a page is ready to publish keeps late changes under control.</td><td>As a site admin<br>I want to see all tasks, split by who has them, and change the peer reviewer<br>So that I can balance work and unblock pages</td><td>US-04.16, US-04.18</td><td>11</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · Admin view</p><pre lang="gherkin">Given I am signed in as &quot;super.admin&quot;
Then tasks are split into &quot;Assigned to me&quot; and &quot;Assigned to others&quot;
And a pencil next to the Peer reviewer lets me change the person while the page is in review</pre><p><b>Scenario 2</b> · No reassigning at Ready to publish</p><pre lang="gherkin">Then rows in &quot;Ready to publish&quot; have no pencil and no &quot;Assign to anyone&quot;</pre></details></td></tr>
<tr><td>20</td><td><b>US-04.20</b> · Be told when a page is handed to me</td><td>As anyone in the content team</td><td>People learn immediately when it is their turn, which removes idle time between hand-offs. Faster hand-offs shorten time to market for every page.</td><td>As anyone in the content team<br>I want a notification when it is my turn on a page<br>So that I don&#x27;t have to keep checking My tasks</td><td>US-04.16</td><td>10</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · The bell polls and shows unread items</p><pre lang="gherkin">Given I am signed in
Then the bell checks for news every 60 seconds
And shows a badge with the number of unread items
And &quot;Mark all as read&quot; clears the badge</pre><p><b>Scenario 2</b> · What I am told <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given &lt;event&gt;
Then my bell shows &quot;&lt;message&gt;&quot;
Examples:
  | event                                    | message                                                                |
  | the author reminds me about a review     | Reminder: Content Author is waiting for your review of Cash ISA       |
  | I was assigned a review                  | Super Admin assigned you to review Cash ISA                           |
  | the author&#x27;s review of my page is done   | finished the author&#x27;s review of Cash ISA · send it to business review |
  | the page reached business review         | sent to business review: Cash ISA · business sign-off needed          |
  | the business signed off a page I publish | finished the business review of Cash ISA · ready to publish           |
  | my draft has not been sent               | Your draft of Cash ISA is waiting to be sent for review               |</pre></details></td></tr>
<tr><td>21</td><td><b>US-04.21</b> · Act on a notification in one click</td><td>As anyone in the content team</td><td>Overdue items stand out, so service levels and regulatory deadlines are met more reliably. One-click access cuts the time from notice to action.</td><td>As anyone in the content team<br>I want urgent items to stand out and to open the page from the notification<br>So that overdue work is handled first</td><td>US-04.20</td><td>11</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · Overdue work stands out</p><pre lang="gherkin">Given a review assigned to me is overdue
Then its notification is marked critical</pre><p><b>Scenario 2</b> · Clicking a notification opens the page</p><pre lang="gherkin">When I click a notification about &quot;Cash ISA&quot;
Then the page opens in the page builder</pre></details></td></tr>
<tr><td>22</td><td><b>US-04.22</b> · Hand the page over step by step</td><td>content author</td><td>Every page passes through separate authoring, review, sign-off and publishing hands, which builds four-eyes control into the process itself. Clear hand-offs cut idle time between teams and shorten time to market.</td><td>As a content author<br>I want to request each next step instead of doing it myself<br>So that every page is checked by other people before customers see it</td><td>US-04.01, US-04.05, US-04.09, US-05.01</td><td>14</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given these people work on the UK site
| person         | persona         | permissions on the folder           |
| content.author | content author  | Read, Edit                          |
| rachel.hughes  | peer reviewer   | Read, Edit, Review &amp; approve        |
| david.clarke   | business owner  | Read, Review &amp; approve              |
| jordan.mensah  | publisher       | Read, Review &amp; approve, Publish     |
| super.admin    | site admin      | everything                          |</pre><p><b>Scenario 1</b> · The happy path, one person per step</p><pre lang="gherkin">Given &quot;content.author&quot; built the page &quot;Cash ISA&quot;
When &quot;content.author&quot; sends it for review
Then it waits in the Backlog for any reviewer
When &quot;rachel.hughes&quot; takes it, reviews it and chooses &quot;Send to business review&quot;
Then it waits for a business reviewer
When &quot;david.clarke&quot; takes it and signs it off
Then it is &quot;Ready to publish&quot;
When &quot;jordan.mensah&quot; publishes it
Then it is &quot;Published&quot;
And &quot;content.author&quot; sees &quot;Cash ISA&quot; under &quot;Published&quot; in My tasks</pre><p><b>Scenario 2</b> · What the author can do at each stage <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given the page &quot;Cash ISA&quot; is at &quot;&lt;stage&gt;&quot;
And I am signed in as &quot;content.author&quot;
Then the next step for me is &quot;&lt;my action&gt;&quot;
And the step itself is done by &quot;&lt;who acts&gt;&quot;
Examples:
  | stage                                  | my action                         | who acts                       |
  | Build the page                         | Send to author&#x27;s review           | me                             |
  | Waiting for author&#x27;s review assignment | Wait · &quot;Waiting for a reviewer&quot;   | any reviewer except me         |
  | Assigned to reviewer                   | Remind                            | the assigned reviewer          |
  | In author&#x27;s review                     | Remind                            | the assigned reviewer          |
  | Waiting for business review assignment | Wait                              | a business owner               |
  | In business review                     | Remind                            | the business reviewer or group |
  | Ready to publish                       | Wait · &quot;Waiting for a publisher&quot;  | a publisher                    |
  | Published                              | Edit to start a new version       | me                             |</pre></details></td></tr>
<tr><td>23</td><td><b>US-04.23</b> · Get the page back when someone asks for changes</td><td>content author</td><td>Rework goes back to one accountable author instead of being patched by reviewers, which keeps responsibility clear. Restarting both reviews after changes means no unchecked edit can reach customers.</td><td>As a content author<br>I want any reviewer to send the page back to me with comments<br>So that I fix it once and the whole check starts again</td><td>US-04.22</td><td>15</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given these people work on the UK site
| person         | persona         | permissions on the folder           |
| content.author | content author  | Read, Edit                          |
| rachel.hughes  | peer reviewer   | Read, Edit, Review &amp; approve        |
| david.clarke   | business owner  | Read, Review &amp; approve              |
| jordan.mensah  | publisher       | Read, Review &amp; approve, Publish     |
| super.admin    | site admin      | everything                          |</pre><p><b>Scenario</b> · Reauthor returns the page to the author <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given &quot;&lt;reviewer&gt;&quot; is reviewing &quot;Cash ISA&quot; at &quot;&lt;stage&gt;&quot;
When they choose &quot;Reauthor&quot; with comments
Then the page is back at &quot;Build the page&quot; for &quot;content.author&quot;
And the comments stay on the page
And both reviews start over when it is sent again
Examples:
  | reviewer      | stage              |
  | rachel.hughes | In author&#x27;s review |
  | david.clarke  | In business review |</pre></details></td></tr>
<tr><td>24</td><td><b>US-04.24</b> · Nobody approves their own work</td><td>bank</td><td>Segregation of duties is enforced by the system rather than by policy documents, which satisfies four-eyes compliance requirements. Auditors can rely on the platform instead of sampling manual evidence.</td><td>As the bank<br>I want different people for authoring, peer review and business review<br>So that the four-eyes principle holds on every page</td><td>US-04.22</td><td>15</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given these people work on the UK site
| person         | persona         | permissions on the folder           |
| content.author | content author  | Read, Edit                          |
| rachel.hughes  | peer reviewer   | Read, Edit, Review &amp; approve        |
| david.clarke   | business owner  | Read, Review &amp; approve              |
| jordan.mensah  | publisher       | Read, Review &amp; approve, Publish     |
| super.admin    | site admin      | everything                          |</pre><p><b>Scenario 1</b> · Four-eyes checks <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given &quot;&lt;person&gt;&quot; did &quot;&lt;earlier step&gt;&quot; on &quot;Cash ISA&quot;
When &quot;&lt;person&gt;&quot; tries to &quot;&lt;later step&gt;&quot;
Then they see &quot;&lt;message&gt;&quot;
Examples:
  | person         | earlier step      | later step                | message                                                              |
  | content.author | write the page    | take the author&#x27;s review  | You wrote this page, so someone else reviews it                      |
  | rachel.hughes  | the peer review   | take the business review  | You did the author&#x27;s review · someone else does the business review  |
  | rachel.hughes  | the peer review   | sign it off               | Someone else must do the business review                             |</pre><p><b>Scenario 2</b> · An author without Publish cannot put the page live</p><pre lang="gherkin">Given &quot;Cash ISA&quot; is &quot;Ready to publish&quot;
And I am signed in as &quot;content.author&quot;
Then I see &quot;Waiting for a publisher&quot; instead of &quot;Publish&quot;</pre></details></td></tr>
<tr><td>25</td><td><b>US-04.25</b> · Walk the whole flow as a site admin, on record 🛡</td><td>site admin</td><td>Urgent regulatory or pricing changes can still go live when reviewers are unavailable, which reduces business risk. Every override is recorded as on behalf of a named person, so audit trails stay complete.</td><td>As a site admin<br>I want to perform any step for the person who should do it<br>So that I can demo the platform and unblock urgent pages</td><td>US-04.22, US-04.24</td><td>16</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given these people work on the UK site
| person         | persona         | permissions on the folder           |
| content.author | content author  | Read, Edit                          |
| rachel.hughes  | peer reviewer   | Read, Edit, Review &amp; approve        |
| david.clarke   | business owner  | Read, Review &amp; approve              |
| jordan.mensah  | publisher       | Read, Review &amp; approve, Publish     |
| super.admin    | site admin      | everything                          |</pre><p><b>Scenario 1</b> · Walking every step alone</p><pre lang="gherkin">Given I am signed in as &quot;super.admin&quot;
Then every step on the stepper offers its action to me
And I can take my own page from the Backlog</pre><p><b>Scenario 2</b> · Acting on behalf is recorded</p><pre lang="gherkin">Given &quot;rachel.hughes&quot; is the assigned peer reviewer
When I click &quot;Reviewed for Rachel Hughes&quot;
Then the audit line ends with &quot;(on behalf of Rachel Hughes)&quot;</pre><p><b>Scenario 3</b> · Ordinary users never see actions for other people</p><pre lang="gherkin">Given I am signed in as &quot;content.author&quot;
Then no button on the stepper or in My tasks lets me act for someone else</pre></details></td></tr>
<tr><td>26</td><td><b>US-04.26</b> · Ask for publishing and hear when the page is live ⏭</td><td>content author</td><td>Planned launch dates reduce last-minute coordination between marketing and publishers. Authors learn when a page is live without chasing anyone, which saves time and avoids missed campaign starts.</td><td>As a content author<br>I want to request publishing at a date and be told when the page is live<br>So that I can plan launches without chasing the publisher</td><td>US-04.22</td><td>15</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given these people work on the UK site
| person         | persona         | permissions on the folder           |
| content.author | content author  | Read, Edit                          |
| rachel.hughes  | peer reviewer   | Read, Edit, Review &amp; approve        |
| david.clarke   | business owner  | Read, Review &amp; approve              |
| jordan.mensah  | publisher       | Read, Review &amp; approve, Publish     |
| super.admin    | site admin      | everything                          |</pre><p><b>Scenario 1</b> · Requesting publishing</p><pre lang="gherkin">Given &quot;Cash ISA&quot; is &quot;Ready to publish&quot;
When I click &quot;Request publishing&quot; and choose 1 November at 09:00
Then the publishers get a task &quot;Publish Cash ISA on 1 Nov 09:00&quot;</pre><p><b>Scenario 2</b> · Live notification</p><pre lang="gherkin">When the publisher publishes &quot;Cash ISA&quot;
Then I get the notification &quot;Cash ISA is live&quot;</pre></details></td></tr>
</table>

---

## EP-05 · Publishing

| Epic field | Value |
|---|---|
| Issue type | Epic |
| Epic name / Summary | EP-05 · Publishing |
| Team | WPB Digital Browser: Tools |
| Business benefit | Only signed-off pages go live, together with every image and document they need, so customers never see half-finished or broken content. Scheduled releases go live at the agreed minute without out-of-hours work. |
| Scope | Going live safely: publish now or on schedule together with the files a page uses, and compare drafts with what customers see. |
| Stories | 6 · US-05.01 to US-05.06 |

<details><summary>Epic description to paste into Jira</summary>

```text
Business benefit
Only signed-off pages go live, together with every image and document they need, so customers never see half-finished or broken content. Scheduled releases go live at the agreed minute without out-of-hours work.

Scope
Going live safely: publish now or on schedule together with the files a page uses, and compare drafts with what customers see.

Stories
US-05.01 · Publish a signed-off page now, together with its files
US-05.02 · Publish later at a chosen time
US-05.03 · Publish several pages in one go
US-05.04 · Hand a signed-off page over to the publisher
US-05.05 · See what will change before publishing
US-05.06 · Check an older version against live
```

</details>

Source: [`05-publishing.feature`](epics/05-publishing.feature)

**Stories**

<table>
<tr><th>#</th><th>Story</th><th>Persona</th><th>Business benefit</th><th>User story</th><th>Depends on</th><th>Wave</th></tr>
<tr><td>1</td><td><b>US-05.01</b> · Publish a signed-off page now, together with its files</td><td>publisher</td><td>Approved pages reach customers in one controlled step instead of a chain of manual releases. Publishing the files with the page removes broken pictures and missing documents that damage customer trust.</td><td>As a publisher<br>I want to put a page that passed both reviews live in one step, together with the pictures and documents it uses<br>So that customers never see a page with missing pictures or documents</td><td>US-04.09, US-06.07</td><td>13</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 4 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in as &quot;jordan.mensah&quot; with Publish on the folder</pre><p><b>Scenario 1</b> · Pages that are not ready are skipped with a reason <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">Given the page &quot;Cash ISA&quot; has status &quot;&lt;status&gt;&quot;
When I open the Publish dialog for it
Then it is listed as skipped with &quot;&lt;reason&gt;&quot;
Examples:
  | status    | reason                     |
  | review    | Still in author&#x27;s review   |
  | reviewed  | Business review comes next |
  | bizreview | Still in business review   |
  | draft     | Needs review first         |
  | published | Already live               |</pre><p><b>Scenario 2</b> · The dialog lists the files on the page (step 1, &quot;Images and files&quot;)</p><pre lang="gherkin">Given &quot;Cash ISA&quot; uses the picture &quot;hero-isa.jpg&quot; and the PDF &quot;isa-terms.pdf&quot; that are not published
When I open the Publish dialog
Then step &quot;Images and files&quot; lists both files with their status
And both are ticked to be published with the page</pre><p><b>Scenario 3</b> · Leaving a draft file behind blocks the page</p><pre lang="gherkin">When I untick &quot;isa-terms.pdf&quot;
Then I see &quot;isa-terms.pdf stays unpublished, so the page cannot go live yet&quot;
And the server refuses the page with &quot;Uses 1 file that is not published yet&quot;</pre><p><b>Scenario 4</b> · Publish now (step 2, &quot;Choose when to publish&quot;)</p><pre lang="gherkin">When I choose &quot;Publish now&quot; and confirm
Then the page status is &quot;Published&quot;
And a live copy of the page is kept for comparisons
And confetti and &quot;Published! Cash ISA is live&quot; fill the screen</pre></details></td></tr>
<tr><td>2</td><td><b>US-05.02</b> · Publish later at a chosen time</td><td>publisher</td><td>Campaigns and rate changes go live at the agreed minute without anyone working out of hours. Fewer manual late-night releases also means fewer publishing mistakes and lower overtime cost.</td><td>As a publisher<br>I want to schedule a signed-off page to go live at a chosen time, and cancel that schedule if plans change<br>So that content goes live exactly when the campaign or rate change starts, without anyone being online</td><td>US-05.01</td><td>14</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 4 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in as &quot;jordan.mensah&quot; with Publish on the folder</pre><p><b>Scenario 1</b> · Schedule</p><pre lang="gherkin">When I choose &quot;Schedule&quot; for tomorrow at 09:00
Then the page status is &quot;Scheduled&quot;
And the audit log says &quot;scheduled Cash ISA for&quot; that date</pre><p><b>Scenario 2</b> · Too soon to schedule</p><pre lang="gherkin">When I schedule the page for 2 minutes from now
Then I see &quot;Pick a time at least 5 minutes from now&quot;</pre><p><b>Scenario 3</b> · A scheduled page goes live on its own</p><pre lang="gherkin">Given &quot;Cash ISA&quot; is scheduled for a time that has passed
When anyone opens a CMS screen
Then the page is published by &quot;system&quot;</pre><p><b>Scenario 4</b> · Cancelling a schedule</p><pre lang="gherkin">Given &quot;Cash ISA&quot; is scheduled
When I click &quot;Cancel schedule&quot;
Then the page is back at &quot;Ready to publish&quot;</pre></details></td></tr>
<tr><td>3</td><td><b>US-05.03</b> · Publish several pages in one go</td><td>publisher</td><td>Related pages of a launch go live together, so customers never see half of a product release. Per-page results cut the time spent finding out what was held back and why.</td><td>As a publisher<br>I want to publish a selection of pages at once and see the result for each<br>So that a release of related pages goes live together and I know which ones were held back and why</td><td>US-05.01</td><td>14</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in as &quot;jordan.mensah&quot; with Publish on the folder</pre><p><b>Scenario</b> · Bulk publish from the page list</p><pre lang="gherkin">Given I selected 3 pages in Pages and 1 of them is still in review
When I click &quot;Publish&quot; in the selection bar and publish now
Then the 2 ready pages go live
And &quot;Publishing results&quot; shows a tick for each and the reason for the third</pre></details></td></tr>
<tr><td>4</td><td><b>US-05.04</b> · Hand a signed-off page over to the publisher</td><td>content author</td><td>Keeping publishing with authorised publishers enforces separation of duties that auditors and regulators expect. Clear hand-over status reduces chasing between teams and shortens time to market.</td><td>As a content author<br>I want to see that my signed-off page is waiting for a publisher instead of publishing it myself<br>So that only people with Publish put content live, and I know who acts next until I am told the page is live</td><td>US-05.01</td><td>14</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I am signed in as &quot;jordan.mensah&quot; with Publish on the folder</pre><p><b>Scenario</b> · No Publish permission</p><pre lang="gherkin">Given I am signed in as &quot;content.author&quot;
Then a page at &quot;Ready to publish&quot; shows &quot;Waiting for a publisher&quot;</pre></details></td></tr>
<tr><td>5</td><td><b>US-05.05</b> · See what will change before publishing</td><td>publisher</td><td>Publishers catch unintended changes before customers see them, lowering the risk of wrong rates or terms going live. A clear list of differences makes sign-off faster and easier to evidence.</td><td>As a publisher<br>I want to see the authoring version next to the live page, with every difference listed<br>So that I know exactly what will change for customers when I publish</td><td>US-05.01, US-03.20</td><td>14</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the page &quot;Cash ISA&quot; was published before and has been edited since</pre><p><b>Scenario 1</b> · Compare is offered only for one page that has been live</p><pre lang="gherkin">When I select &quot;Cash ISA&quot; alone in Pages
Then the &quot;Compare&quot; button is enabled
But it is disabled with &quot;Not published yet · nothing to compare&quot; for a page that was never live
And it asks to &quot;Pick one page to compare&quot; when several pages are selected</pre><p><b>Scenario 2</b> · Side by side with the differences</p><pre lang="gherkin">When I click &quot;Compare&quot;
Then I see the authoring version on the left and the live page on the right
And both sides scroll together
And the sidebar lists each component as &quot;Added&quot;, &quot;Removed&quot;, &quot;Changed&quot; or &quot;Moved&quot;
And a changed page title is listed too</pre><p><b>Scenario 3</b> · Jump to a difference</p><pre lang="gherkin">When I click a difference in the sidebar
Then it flashes on both sides</pre></details></td></tr>
<tr><td>6</td><td><b>US-05.06</b> · Check an older version against live</td><td>content author</td><td>The bank can quickly establish when a change was made and what customers were shown at the time. This supports complaint handling and regulatory enquiries without costly investigation.</td><td>As a content author<br>I want to compare any saved version of my page with the live page<br>So that I can find when a change was made and what customers still see</td><td>US-05.05</td><td>15</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given the page &quot;Cash ISA&quot; was published before and has been edited since</pre><p><b>Scenario</b> · Pick an older authoring version</p><pre lang="gherkin">When I choose a saved version from the authoring dropdown
Then the left side shows that version and the differences are recalculated</pre></details></td></tr>
</table>

---

## EP-06 · Content library

| Epic field | Value |
|---|---|
| Issue type | Epic |
| Epic name / Summary | EP-06 · Content library |
| Team | WPB Digital Browser: Tools |
| Business benefit | Templates, assets, models and shared content are defined once and reused everywhere, so facts like rates are correct on every page and brand rules are applied by default. Accessibility data on every file supports inclusive design and regulatory accessibility duties. |
| Scope | Reusable building blocks and content: page templates, assets with accessibility data, content models and entities. |
| Stories | 10 · US-06.01 to US-06.10 |

<details><summary>Epic description to paste into Jira</summary>

```text
Business benefit
Templates, assets, models and shared content are defined once and reused everywhere, so facts like rates are correct on every page and brand rules are applied by default. Accessibility data on every file supports inclusive design and regulatory accessibility duties.

Scope
Reusable building blocks and content: page templates, assets with accessibility data, content models and entities.

Stories
US-06.01 · Build and maintain page templates
US-06.02 · Limit a template to some markets
US-06.03 · Pick the right template for my market
US-06.04 · Upload and replace files safely
US-06.05 · Make files accessible
US-06.06 · Find the right file
US-06.07 · Approve files for live use
US-06.08 · Define and evolve content models
US-06.09 · Create reusable content items from a model
US-06.10 · Update a fact everywhere at once
```

</details>

Source: [`06-content-library.feature`](epics/06-content-library.feature)

**Stories**

<table>
<tr><th>#</th><th>Story</th><th>Persona</th><th>Business benefit</th><th>User story</th><th>Depends on</th><th>Wave</th></tr>
<tr><td>1</td><td><b>US-06.01</b> · Build and maintain page templates 🛡</td><td>site admin</td><td>Every page type starts from an approved structure with mandatory brand and navigation parts, so brand and compliance consistency is built in. New pages are created faster, cutting time to market.</td><td>As a site admin<br>I want to create, edit, duplicate and delete templates the way I edit pages<br>So that every new page of a type starts consistent, with the required HSBC parts in place</td><td>—</td><td>1</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Scenario 1</b> · Editing a template</p><pre lang="gherkin">Given I am a site admin
When I add, move or remove components in the template editor
Then the template saves itself
And the HSBC menu, breadcrumb and footer cannot be removed</pre><p><b>Scenario 2</b> · Existing pages are not changed</p><pre lang="gherkin">Then the settings say &quot;Changing the template does not change pages already created with it.&quot;</pre><p><b>Scenario 3</b> · New, duplicate and delete</p><pre lang="gherkin">Then I can create a template with a unique name, duplicate it as &quot;(copy)&quot; and delete it
But the &quot;Blank page&quot; template cannot be duplicated or deleted</pre></details></td></tr>
<tr><td>2</td><td><b>US-06.02</b> · Limit a template to some markets 🛡</td><td>site admin</td><td>Market-specific layouts cannot be reused by markets they were not approved for, reducing local regulatory and brand risk. Central teams can share templates safely without extra manual checks.</td><td>As a site admin<br>I want to choose in which local markets a template can be used<br>So that local templates stay local</td><td>US-06.01</td><td>2</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Scenario</b> · Choosing markets</p><pre lang="gherkin">When I choose &quot;Only some local markets&quot; and tick &quot;Hong Kong&quot; in Template settings
Then only Hong Kong can create pages from it
And I am warned that the UK can no longer create pages from it</pre></details></td></tr>
<tr><td>3</td><td><b>US-06.03</b> · Pick the right template for my market</td><td>content author</td><td>Authors start from approved, market-appropriate templates instead of improvising layouts, which lowers rework and review effort. Read-only access protects templates from accidental change.</td><td>As a content author<br>I want to browse the template library and see what each template contains and where it can be used, without being able to change it<br>So that I start pages from an approved template that is allowed in my market</td><td>US-06.01, US-06.02</td><td>3</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Scenario 1</b> · Read-only for everyone else</p><pre lang="gherkin">Given I am signed in as &quot;content.author&quot;
Then the template library says &quot;Read-only · ask a site admin to change templates&quot;
And &quot;Edit&quot; buttons read &quot;View&quot;</pre><p><b>Scenario 2</b> · Template cards</p><pre lang="gherkin">Then each card shows a thumbnail, the number of blocks, the folder, the markets and &quot;used by N pages&quot;</pre><p><b>Scenario 3</b> · A template for another market</p><pre lang="gherkin">Given &quot;Rates page&quot; is for Hong Kong only
When I open the library in the UK
Then its card is dimmed and the button says &quot;Not for UK&quot;</pre></details></td></tr>
<tr><td>4</td><td><b>US-06.04</b> · Upload and replace files safely</td><td>content author</td><td>Files can be updated without breaking live pages, protecting the customer experience and the bank&#x27;s reputation. Automatic renaming prevents costly overwrites of approved material.</td><td>As a content author<br>I want to upload and replace files without ever overwriting another file or deleting one that pages still use<br>So that no live page breaks because of a change in the library</td><td>—</td><td>1</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Scenario 1</b> · Uploading</p><pre lang="gherkin">When I drop &quot;hero.jpg&quot; into &quot;Campaigns&quot;
Then it is uploaded as a draft
And a second &quot;hero.jpg&quot; becomes &quot;hero-2.jpg&quot;</pre><p><b>Scenario 2</b> · Replacing keeps pages working</p><pre lang="gherkin">When I replace &quot;hero.jpg&quot; with a new file
Then pages that use it show the new file
And its alt text is kept</pre><p><b>Scenario 3</b> · Deleting a used file</p><pre lang="gherkin">Given &quot;hero.jpg&quot; is used on 2 pages
Then I cannot delete it and I am told &quot;Remove it from pages first&quot;</pre></details></td></tr>
<tr><td>5</td><td><b>US-06.05</b> · Make files accessible</td><td>content author</td><td>Recording alt text and document accessibility details helps the bank meet its accessibility obligations and avoid legal risk. Customers using assistive technology get the same information as everyone else.</td><td>As a content author<br>I want to record alt text per language for images and the accessibility details of documents<br>So that every file on our pages can be used by customers with assistive technology</td><td>US-06.04</td><td>2</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · Alt text per language</p><pre lang="gherkin">When I open the accessibility panel of an image
Then I enter alt text for every language of the market, the first one required
And instead of alt text I can mark it &quot;Decorative only&quot;
And I am told not to start with &quot;image of&quot; and to keep it under 150 characters</pre><p><b>Scenario 2</b> · Documents</p><pre lang="gherkin">Then a PDF needs a title, a language and &quot;Tagged PDF, checked&quot;</pre></details></td></tr>
<tr><td>6</td><td><b>US-06.06</b> · Find the right file</td><td>content author</td><td>Reusing approved files avoids duplicate purchases and repeated approvals, lowering cost. Smart views surface unused and inaccessible files so problems are fixed before audits find them.</td><td>As a content author<br>I want to browse files by folder and type and see which ones are unused or missing accessibility details<br>So that I reuse approved files and can clean up problems quickly</td><td>US-06.04, US-06.05</td><td>3</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · Browsing</p><pre lang="gherkin">When I open Assets
Then I see folders with counts, a grid or list, and filters for Images, Documents and Icons</pre><p><b>Scenario 2</b> · Smart views <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">When I open &quot;&lt;view&gt;&quot;
Then I see &lt;what&gt;
Examples:
  | view                         | what                                        |
  | Not used on any page         | files no page uses                          |
  | Missing accessibility info   | images without alt text and untagged PDFs   |</pre></details></td></tr>
<tr><td>7</td><td><b>US-06.07</b> · Approve files for live use</td><td>publisher</td><td>Only approved files can appear on live pages, reducing brand, legal and compliance risk. The publish record shows who approved each file and when, supporting audits.</td><td>As a publisher<br>I want to publish draft files and have pages refused while they still use a draft file<br>So that customers only ever see approved files</td><td>US-06.04</td><td>2</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · Publishing a file</p><pre lang="gherkin">Given I have Publish
When I click &quot;Publish&quot; on a draft file
Then it shows &quot;Published&quot; with who and when</pre><p><b>Scenario 2</b> · A page cannot go live with a draft file</p><pre lang="gherkin">Then publishing a page that uses a draft file is refused until the file is published</pre></details></td></tr>
<tr><td>8</td><td><b>US-06.08</b> · Define and evolve content models 🛡</td><td>site admin</td><td>Structured, validated content types give every channel consistent data and reduce errors in key facts. Guarded breaking changes protect live content and avoid costly outages.</td><td>As a site admin<br>I want to create content models with validated fields, publish them, and change them safely over time<br>So that authors get well-structured content types and live content is not broken by a careless change</td><td>—</td><td>1</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 4 scenarios</summary><p><b>Scenario 1</b> · Creating a model</p><pre lang="gherkin">Given I am a site admin
When I create the model &quot;Savings product&quot; in 3 steps: information, fields and review
Then its id is &quot;savings-product&quot;
And I can &quot;Save as draft&quot; or &quot;Save &amp; publish&quot;</pre><p><b>Scenario 2</b> · Field validation <i>(outline: one run per row of the table)</i></p><pre lang="gherkin">When I add a field with &lt;problem&gt;
Then I see an error
Examples:
  | problem                                  |
  | a key that is not camelCase              |
  | a key that already exists                |
  | a minimum length above the maximum       |
  | an invalid regular expression            |
  | a select field without options           |</pre><p><b>Scenario 3</b> · Breaking changes need confirmation</p><pre lang="gherkin">Given the model is published
When I remove a field, change a type or make a field required and publish
Then I must tick &quot;I understand the impact&quot;</pre><p><b>Scenario 4</b> · Versions</p><pre lang="gherkin">Then every change is kept as a version I can compare and restore into the draft</pre></details></td></tr>
<tr><td>9</td><td><b>US-06.09</b> · Create reusable content items from a model</td><td>content author</td><td>Facts such as rates are entered once, so the bank avoids inconsistent figures that could mislead customers. Blocking deletion of items in use prevents broken pages.</td><td>As a content author<br>I want to fill in entities from published models, see the model as documentation, and be stopped from deleting entities in use<br>So that facts like rates are written once, correctly, and no page loses its content</td><td>US-06.08</td><td>2</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 5 scenarios</summary><p><b>Scenario 1</b> · Read-only for others</p><pre lang="gherkin">Given I am not a site admin
Then content models show &quot;Read-only · documentation view&quot;</pre><p><b>Scenario 2</b> · Creating an entity</p><pre lang="gherkin">Given I have Edit on the market
When I create an entity of the published model &quot;Rate&quot; called &quot;ISA rates 2026&quot;
Then a form built from the model&#x27;s fields opens</pre><p><b>Scenario 3</b> · Draft models cannot be used</p><pre lang="gherkin">Then a model that is still a draft is disabled with &quot;Publish the model first&quot;</pre><p><b>Scenario 4</b> · Validation</p><pre lang="gherkin">When I save with 2 invalid fields
Then I see &quot;Fix 2 fields before saving&quot;</pre><p><b>Scenario 5</b> · Entities in use cannot be deleted</p><pre lang="gherkin">Given &quot;ISA rates 2026&quot; is used on 3 pages
When I delete it
Then I see &quot;Used on 3 pages · Remove it from those pages first&quot;</pre></details></td></tr>
<tr><td>10</td><td><b>US-06.10</b> · Update a fact everywhere at once</td><td>content author</td><td>A rate change reaches every page and channel at the same moment, lowering conduct risk from outdated figures. It removes the cost of editing many pages by hand.</td><td>As a content author<br>I want publishing an entity to update every page that shows it<br>So that a changed rate is correct on all pages and channels at the same moment</td><td>US-06.09, US-03.15</td><td>4</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Scenario</b> · Publishing an entity updates the pages that use it</p><pre lang="gherkin">When I publish &quot;ISA rates 2026&quot;
Then the audit log says it updates the pages that show it
And the delivery API shows the new values on those pages</pre></details></td></tr>
</table>

---

## EP-07 · Translations

| Epic field | Value |
|---|---|
| Issue type | Epic |
| Epic name / Summary | EP-07 · Translations |
| Team | WPB Digital Browser: Tools |
| Business benefit | Language versions are produced in minutes instead of being rebuilt by hand, so local markets launch at the same time as the original. Every translation goes through the same review, so speed never bypasses compliance. |
| Scope | Language versions of pages, created in a few steps and approved through the same workflow. |
| Stories | 2 · US-07.01 to US-07.02 |

<details><summary>Epic description to paste into Jira</summary>

```text
Business benefit
Language versions are produced in minutes instead of being rebuilt by hand, so local markets launch at the same time as the original. Every translation goes through the same review, so speed never bypasses compliance.

Scope
Language versions of pages, created in a few steps and approved through the same workflow.

Stories
US-07.01 · Create translated copies of pages in a few steps
US-07.02 · Review every language version before it goes live
```

</details>

Source: [`07-translations.feature`](epics/07-translations.feature)

**Stories**

<table>
<tr><th>#</th><th>Story</th><th>Persona</th><th>Business benefit</th><th>User story</th><th>Depends on</th><th>Wave</th></tr>
<tr><td>1</td><td><b>US-07.01</b> · Create translated copies of pages in a few steps</td><td>content author</td><td>Pages reach every language of a market far faster than copying them by hand, shortening time to market. Wider language coverage improves access for customers and supports local language requirements.</td><td>As a content author<br>I want to choose the languages, how the text is translated and where the copies go, then check and create them in one flow<br>So that I can offer pages in every language of my market without copying them by hand</td><td>US-02.01</td><td>3</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 5 scenarios</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I selected &quot;Cash ISA&quot; and &quot;Fixed rate bonds&quot; in the UK market</pre><p><b>Scenario 1</b> · Four steps</p><pre lang="gherkin">When I click &quot;Translate&quot;
Then I go through &quot;Languages&quot;, &quot;How&quot;, &quot;Where&quot; and &quot;Check&quot;</pre><p><b>Scenario 2</b> · Languages</p><pre lang="gherkin">Then the market&#x27;s own languages are shown first, then other markets&#x27; languages
And I see &quot;1 language × 2 pages = 2 translations&quot; when I pick Welsh
And a language every selected page already has is disabled with &quot;already translated&quot;</pre><p><b>Scenario 3</b> · How</p><pre lang="gherkin">Then I can choose &quot;AI draft now&quot; or &quot;Send to the translation vendor&quot;</pre><p><b>Scenario 4</b> · Where</p><pre lang="gherkin">Then I can put each translation next to its source page as &quot;cy-cash-isa&quot;
And I can instead put all of them into one folder</pre><p><b>Scenario 5</b> · Check and create</p><pre lang="gherkin">Given &quot;cy-cash-isa&quot; already exists
Then the check step marks it &quot;already exists · skipped&quot;
When I click &quot;Create 1 translation&quot;
Then the new page waits in the review Backlog
And it shows &quot;Source: /banking/savings/fixed-rate-bonds&quot; in the page list</pre></details></td></tr>
<tr><td>2</td><td><b>US-07.02</b> · Review every language version before it goes live</td><td>business owner</td><td>Translations get the same checks as originals, so no unverified wording about products or terms reaches customers. This keeps the bank compliant in every language it publishes.</td><td>As a business owner<br>I want every translated page to go through the same author&#x27;s review and business review as the original<br>So that no unchecked translation reaches customers</td><td>US-07.01, US-04.01</td><td>9</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Background</b> · applies to every scenario below</p><pre lang="gherkin">Given I selected &quot;Cash ISA&quot; and &quot;Fixed rate bonds&quot; in the UK market</pre><p><b>Scenario</b> · Translations always go through the workflow</p><pre lang="gherkin">Then every translated page is created at &quot;Waiting for author&#x27;s review assignment&quot;
And it needs the author&#x27;s review and the business review before it can be published</pre></details></td></tr>
</table>

---

## EP-08 · Governance

| Epic field | Value |
|---|---|
| Issue type | Epic |
| Epic name / Summary | EP-08 · Governance |
| Team | WPB Digital Browser: Tools |
| Business benefit | Every change is recorded with who, what and when, giving the bank evidence for auditors and regulators on demand. A shared dashboard shows bottlenecks early, so managers act before deadlines are missed. |
| Scope | Proof and overview: the audit trail of every change and the dashboard of what needs attention. |
| Stories | 3 · US-08.01 to US-08.03 |

<details><summary>Epic description to paste into Jira</summary>

```text
Business benefit
Every change is recorded with who, what and when, giving the bank evidence for auditors and regulators on demand. A shared dashboard shows bottlenecks early, so managers act before deadlines are missed.

Scope
Proof and overview: the audit trail of every change and the dashboard of what needs attention.

Stories
US-08.01 · Search and export a full audit trail
US-08.02 · See my own activity
US-08.03 · See what needs attention
```

</details>

Source: [`08-governance.feature`](epics/08-governance.feature)

**Stories**

<table>
<tr><th>#</th><th>Story</th><th>Persona</th><th>Business benefit</th><th>User story</th><th>Depends on</th><th>Wave</th></tr>
<tr><td>1</td><td><b>US-08.01</b> · Search and export a full audit trail 🛡</td><td>site admin</td><td>The bank can answer auditors and regulators with complete evidence of who changed what and when. Fast search and CSV export cut the cost of compliance reviews.</td><td>As a site admin<br>I want every change recorded with who, what, when and a request id, and to search and export everyone&#x27;s events<br>So that the bank can prove who did what to auditors and regulators</td><td>US-01.07</td><td>2</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · Audit entries</p><pre lang="gherkin">When anyone saves, sends for review, reviews, signs off, publishes, archives, deletes or changes permissions
Then the audit log gets a line with the person, the action, the page and a request id</pre><p><b>Scenario 2</b> · Finding events</p><pre lang="gherkin">Then I can filter by Content, Publishing, Permissions or System
And search by person, page, action or request id
And choose All time, Today or Last 2 days
And export the result to CSV</pre></details></td></tr>
<tr><td>2</td><td><b>US-08.02</b> · See my own activity</td><td>content author</td><td>Staff can check their own work without seeing colleagues&#x27; activity, respecting need-to-know access. Fewer support requests to admins lowers operating cost.</td><td>As a content author<br>I want to see a log of my own actions only<br>So that I can check what I did without seeing other people&#x27;s activity</td><td>US-08.01</td><td>3</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Scenario</b> · Admins see everyone, others see themselves</p><pre lang="gherkin">Given I am not a site admin
When I open the audit log
Then it is titled &quot;My activity&quot; and shows only my actions</pre></details></td></tr>
<tr><td>3</td><td><b>US-08.03</b> · See what needs attention</td><td>content author</td><td>Waiting reviews and failed publishes are spotted early, so content reaches customers on time. Managers get a quick view of throughput without manual reporting.</td><td>As a content author<br>I want a dashboard that summarises waiting reviews, how much of the site is live, failed publishes, my tasks and recent activity<br>So that I see at a glance where work stands and what to do next</td><td>US-08.01, US-04.16</td><td>10</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · Dashboard tiles</p><pre lang="gherkin">When I open the dashboard
Then I see how many pages wait for review and how old the oldest is
And the share of the site that is live
And failed publishes as &quot;N failed · A publish failed and needs action&quot;
And my top 5 tasks with overdue ones in red
And the latest 5 activity lines</pre><p><b>Scenario 2</b> · Nothing waiting</p><pre lang="gherkin">Given no page waits for review
Then the tile says &quot;Nothing waiting. Nice.&quot;</pre></details></td></tr>
</table>

---

## EP-09 · Delivery API

| Epic field | Value |
|---|---|
| Issue type | Epic |
| Epic name / Summary | EP-09 · Delivery API |
| Team | WPB Digital Browser: Tools |
| Business benefit | Every website and app reads the same approved content from one API, so the bank stops duplicating content per channel. Clear contracts and schemas let development teams integrate quickly and with fewer defects. |
| Scope | Approved content as JSON for every HSBC website and app. |
| Stories | 3 · US-09.01 to US-09.03 |

<details><summary>Epic description to paste into Jira</summary>

```text
Business benefit
Every website and app reads the same approved content from one API, so the bank stops duplicating content per channel. Clear contracts and schemas let development teams integrate quickly and with fewer defects.

Scope
Approved content as JSON for every HSBC website and app.

Stories
US-09.01 · Get only approved content, and preview drafts separately
US-09.02 · Render pages straight from the JSON
US-09.03 · Explore and try the API in the CMS
```

</details>

Source: [`09-delivery-api.feature`](epics/09-delivery-api.feature)

**Stories**

<table>
<tr><th>#</th><th>Story</th><th>Persona</th><th>Business benefit</th><th>User story</th><th>Depends on</th><th>Wave</th></tr>
<tr><td>1</td><td><b>US-09.01</b> · Get only approved content, and preview drafts separately</td><td>front-end developer</td><td>Only approved content can reach customers through any channel, reducing the risk of leaking unreleased offers. Separate previews let teams test upcoming pages without affecting live sites.</td><td>As a front-end developer<br>I want the public API to return only published pages, with a separate preview address for drafts<br>So that customers only ever see approved content while I can still test upcoming pages</td><td>US-05.01</td><td>14</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 3 scenarios</summary><p><b>Scenario 1</b> · List of published pages</p><pre lang="gherkin">When I call &quot;GET /api/delivery/v1/pages?market=uk&quot;
Then I get only published pages with route, title, template, updatedAt and a link</pre><p><b>Scenario 2</b> · A draft page is not public</p><pre lang="gherkin">When I call &quot;GET /api/delivery/v1/pages/banking/new-offer&quot; for a page that is not published
Then I get 404 &quot;Not published&quot; pointing to the preview address</pre><p><b>Scenario 3</b> · Preview includes drafts</p><pre lang="gherkin">When I call &quot;GET /api/delivery/v1/preview/pages/banking/new-offer&quot;
Then I get the page JSON</pre></details></td></tr>
<tr><td>2</td><td><b>US-09.02</b> · Render pages straight from the JSON</td><td>front-end developer</td><td>All websites and apps show the same approved content from one source, cutting duplicate work across channels. Ready-to-use JSON and schemas shorten integration time and reduce rendering errors.</td><td>As a front-end developer<br>I want page JSON with resolved values, image renditions, form references and meta, plus a JSON Schema for each model<br>So that any channel can render the content without extra lookups or guesswork</td><td>US-09.01, US-03.15, US-06.04</td><td>15</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 2 scenarios</summary><p><b>Scenario 1</b> · Page JSON</p><pre lang="gherkin">Then tokens are replaced with published entity values
And images come with original, hero and card rendition addresses
And forms come as an embed reference with their version
And meta has the canonical address of the page</pre><p><b>Scenario 2</b> · Schemas</p><pre lang="gherkin">When I call &quot;GET /api/delivery/v1/models/rate&quot;
Then I get a JSON Schema with the required fields and localised fields marked</pre></details></td></tr>
<tr><td>3</td><td><b>US-09.03</b> · Explore and try the API in the CMS</td><td>front-end developer</td><td>Developers integrate new channels faster without waiting for separate documentation. Self-service exploration lowers support effort and time to market.</td><td>As a front-end developer<br>I want a screen that shows each page&#x27;s address and JSON, the model schemas and all endpoints, with &quot;Copy URL&quot; and &quot;Try it&quot;<br>So that I can integrate quickly without reading separate documentation</td><td>US-09.01, US-09.02</td><td>16</td></tr>
<tr><td></td><td colspan="6"><details><summary>Acceptance criteria · 1 scenario</summary><p><b>Scenario</b> · API &amp; delivery screen</p><pre lang="gherkin">When I open &quot;API &amp; delivery&quot;
Then I can pick a page and see its public or preview address, its JSON, &quot;Copy URL&quot; and &quot;Try it&quot;
And see the JSON Schema of each model and a table of all endpoints</pre></details></td></tr>
</table>

---

## Build waves (whole product)

Stories in the same wave can be built in parallel once the earlier waves are done.

**Wave 1** — US-01.01 Sign in with the company account · US-01.04 Switch between markets · US-01.05 Always know which environment I am in · US-01.06 Reach any screen quickly on any device · US-01.07 Give each role and workflow step the right permissions · US-02.03 Know what an action will change before it happens · US-02.07 Archive pages instead of deleting them · US-03.19 Link a page to its Jira ticket · US-06.01 Build and maintain page templates · US-06.04 Upload and replace files safely · US-06.08 Define and evolve content models

**Wave 2** — US-01.03 Try the private demo as any person · US-01.08 Manage people and their permissions · US-02.01 Find any page in the market · US-02.05 Lock a page while I work on it · US-06.02 Limit a template to some markets · US-06.05 Make files accessible · US-06.07 Approve files for live use · US-06.09 Create reusable content items from a model · US-08.01 Search and export a full audit trail

**Wave 3** — US-01.09 Only site admins can change access · US-02.06 Override someone else's lock · US-03.15 Show shared content from one place · US-06.03 Pick the right template for my market · US-06.06 Find the right file · US-07.01 Create translated copies of pages in a few steps · US-08.02 See my own activity

**Wave 4** — US-02.02 Create pages and folders from on-brand templates · US-02.08 See everything affected before deleting permanently · US-03.16 Keep page text and linked content consistent · US-06.10 Update a fact everywhere at once

**Wave 5** — US-02.04 Move and copy pages without breaking or overwriting anything · US-03.01 Add on-brand components from the library · US-03.17 Build a page together with other authors

**Wave 6** — US-03.02 Edit text where it is shown · US-03.03 Arrange and configure every component the same way · US-03.05 Check the page on every device width · US-03.06 Reuse a section in one click · US-03.18 Assign other people as authors

**Wave 7** — US-03.04 Never lose my work · US-03.07 Save my own design pattern · US-03.10 See and fix what blocks publishing · US-03.11 Check any element while previewing · US-03.12 Improve one component with AI

**Wave 8** — US-03.08 Remove my patterns safely · US-03.13 Let AI plan page-wide changes that I approve · US-03.20 Go back to any earlier version · US-04.01 Request a review from the shared Backlog

**Wave 9** — US-03.09 Remove built-in design-system patterns · US-03.14 Keep AI within page permissions · US-04.02 Check the page before handing it over · US-04.03 Keep the page stable while it is being reviewed · US-04.04 Take a review from the Backlog, or give it back · US-04.16 See what needs me, by stage · US-07.02 Review every language version before it goes live

**Wave 10** — US-04.05 Review the page and decide what happens next · US-04.06 Nudge a reviewer who is taking long · US-04.17 Follow my own pages as an author · US-04.18 Pick up and finish work as a reviewer or publisher · US-04.20 Be told when a page is handed to me · US-08.03 See what needs attention

**Wave 11** — US-04.07 Steer reviews as a site admin · US-04.08 Take the business review · US-04.14 Comment on exactly what I mean · US-04.19 Oversee everything as a site admin · US-04.21 Act on a notification in one click

**Wave 12** — US-04.09 Sign off the page or send it back to the author · US-04.10 Share the page with the right business reviewers · US-04.15 Work through the feedback

**Wave 13** — US-04.11 Sign off on behalf of the business reviewer as a site admin · US-04.12 Read and comment through a link · US-05.01 Publish a signed-off page now, together with its files

**Wave 14** — US-01.02 Open a review link without an account · US-04.13 Decide through the link, only if invited · US-04.22 Hand the page over step by step · US-05.02 Publish later at a chosen time · US-05.03 Publish several pages in one go · US-05.04 Hand a signed-off page over to the publisher · US-05.05 See what will change before publishing · US-09.01 Get only approved content, and preview drafts separately

**Wave 15** — US-04.23 Get the page back when someone asks for changes · US-04.24 Nobody approves their own work · US-04.26 Ask for publishing and hear when the page is live · US-05.06 Check an older version against live · US-09.02 Render pages straight from the JSON

**Wave 16** — US-04.25 Walk the whole flow as a site admin, on record · US-09.03 Explore and try the API in the CMS
