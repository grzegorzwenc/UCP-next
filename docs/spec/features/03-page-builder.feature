@epic:page-builder @status:done
Feature: Page builder
  Making a page: HSBC components, in-place editing, design patterns, quality checks, AI help, linked content and working together.

  # Business benefit: Pages are built only from approved components, so brand and compliance quality is built in rather than checked later. Authors produce pages without developer help, lowering cost and time to market.
  @depends:US-02.02
  Rule: US-03.01 · Add on-brand components from the library
    As a content author
    I want to find components in the library and add them where I need them
    So that every page is built only from approved HSBC components

    Background:
      Given I am signed in with Edit on the page "Cash ISA"
      And the page is at "Build the page"

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

  # Business benefit: Authors see exactly what customers will see, which reduces review rounds caused by layout surprises. Restricting link formats also blocks unsafe links from reaching customers.
  @depends:US-03.01
  Rule: US-03.02 · Edit text where it is shown
    As a content author
    I want to type and format text directly on the page
    So that I see the result as customers will while I write

    Background:
      Given I am signed in with Edit on the page "Cash ISA"
      And the page is at "Build the page"

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

  # Business benefit: One consistent way to configure all components shortens training for new authors. Locking components protects mandatory content such as disclaimers from accidental edits.
  @depends:US-03.01
  Rule: US-03.03 · Arrange and configure every component the same way
    As a content author
    I want the same toolbar on every component and a Configure panel with all its properties
    So that I can move, protect and fine-tune any component without learning each one

    Background:
      Given I am signed in with Edit on the page "Cash ISA"
      And the page is at "Build the page"

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

  # Business benefit: Authors never redo work after a closed tab or a lost connection. Fewer lost edits also mean fewer errors slipping into reviewed pages.
  @depends:US-03.02
  Rule: US-03.04 · Never lose my work
    As a content author
    I want the page to save itself, to save on demand and to tell me when saving fails
    So that no edit is ever lost

    Background:
      Given I am signed in with Edit on the page "Cash ISA"
      And the page is at "Build the page"

    Scenario: Autosave
      When I stop typing for about a second
      Then the page saves itself and shows "✓ Saved"

    Scenario: Save button and shortcut
      Then a "Save" button sits next to "Preview" while there are unsaved changes
      And ⌘ S saves at once

    Scenario: Save failed
      Given the server cannot be reached
      Then I see "Not saved · Retry"

  # Business benefit: Problems on mobile and tablet are caught before review, when they are cheapest to fix. Customers get a consistent experience on every device, which protects trust and conversion.
  @depends:US-03.01
  Rule: US-03.05 · Check the page on every device width
    As a content author
    I want to preview the page at desktop, tablet and mobile width and full screen
    So that it works for every customer before I send it for review

    Background:
      Given I am signed in with Edit on the page "Cash ISA"
      And the page is at "Build the page"

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

  # Business benefit: Common sections look identical across pages, strengthening brand consistency for customers. Adding a whole section in one click saves authors significant build time.
  @depends:US-03.01
  Rule: US-03.06 · Reuse a section in one click
    As a content author
    I want to pick a design pattern from its own library and add all its components at once
    So that common sections look the same on every page

    Background:
      Given I am signed in with Edit on the page

    Scenario: Opening the pattern library
      When I click the "Design patterns" tile in the left rail
      Then I see the patterns with live thumbnails
      And design-system patterns are labelled "Design system" and mine "Saved"

    Scenario: Adding a pattern
      When I click "Product introduction"
      Then Masthead, Content master and Icon tiles are added below the selected component
      And I see "Product introduction added · 3 components"

  # Business benefit: Proven sections are reused instead of rebuilt, spreading good practice across teams and markets. Market targeting stops a pattern from appearing where it does not fit local rules.
  @depends:US-03.06 @depends:US-03.03
  Rule: US-03.07 · Save my own design pattern
    As a content author
    I want to save components already on the page as a named pattern, for all or only some markets
    So that I and my colleagues can reuse a section that works

    Background:
      Given I am signed in with Edit on the page

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

  # Business benefit: The pattern library stays tidy without risking pages that already use a pattern. Two-step removal prevents losing valuable shared work by mistake.
  @depends:US-03.07
  Rule: US-03.08 · Remove my patterns safely
    As a content author
    I want to archive my own patterns first and delete them for good only on purpose
    So that a pattern is never lost by mistake and pages that use it are not affected

    Background:
      Given I am signed in with Edit on the page

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

  # Business benefit: Outdated design-system sections can be retired centrally, so new pages do not reuse superseded designs. Restricting this to site admins protects the shared library from accidental removal.
  @admin @depends:US-03.08
  Rule: US-03.09 · Remove built-in design-system patterns
    As a site admin
    I want to remove built-in design-system patterns that ordinary authors cannot touch
    So that the shared pattern library stays current

    Background:
      Given I am signed in with Edit on the page

    Scenario Outline: A site admin removes a design-system pattern
      Given the pattern "<pattern>"
      When "<who>" removes it
      Then <outcome>

      Examples:
        | pattern               | who            | outcome                                                   |
        | Product introduction  | super.admin    | it is archived                                            |

  # Business benefit: Automatic checks catch accessibility, compliance and SEO issues before review, reducing regulatory and reputational risk. Reviewers spend their time on substance rather than mechanical mistakes.
  @depends:US-03.02
  Rule: US-03.10 · See and fix what blocks publishing
    As a content author
    I want findings grouped by how serious they are, with one-click fixes and a way to find them on the page
    So that the page reaches review without mistakes a machine can find

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

  # Business benefit: Authors verify each element in the context customers see, catching issues earlier and more cheaply. A consistent checklist raises the baseline quality of every page.
  @depends:US-03.05 @depends:US-06.05
  Rule: US-03.11 · Check any element while previewing
    As a content author
    I want a quality checklist that follows my pointer in full-screen preview
    So that I can check the whole page and each element as customers will see it

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

  # Business benefit: AI speeds up copy improvements while the author keeps full control over every change. Showing before and after prevents unreviewed AI text from reaching customers.
  @depends:US-03.03 @mock
  Rule: US-03.12 · Improve one component with AI
    As a content author
    I want AI to suggest changes to the selected component only, shown before and after
    So that I can accept or reject each suggestion knowing exactly what changes
    Note: the prototype uses a deterministic offline planner (lib/ai/planner.ts, lib/ai/mock.ts).
    Free-form prompts and translation need the real AI service (UCP_AI_URL).

    Scenario: Before and after
      Given the "Masthead" component is selected
      When I click "✨ AI" and choose "Make this more concise"
      Then I see the old and the new text of each changed field
      And I can "Apply" or "Discard"

    Scenario: Nothing to change
      Given the component has no button
      When I ask "Make the CTA more compelling"
      Then I see "This block has no button."

  # Business benefit: Page-wide changes such as accessibility or SEO fixes take minutes instead of hours. Approval and undo for each change keep accountability with the author and limit the risk of AI errors.
  @depends:US-03.04 @mock
  Rule: US-03.13 · Let AI plan page-wide changes that I approve
    As a content author
    I want the page AI to show its plan first and change nothing until I run the changes I ticked
    So that I work faster on whole pages and can undo anything
    Note: the prototype uses a deterministic offline planner (lib/ai/planner.ts, lib/ai/mock.ts).
    Free-form prompts and translation need the real AI service (UCP_AI_URL).

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

  # Business benefit: AI cannot become a loophole around the bank's access controls, which protects content integrity. This gives risk and compliance teams confidence to approve AI use.
  @depends:US-03.13 @mock
  Rule: US-03.14 · Keep AI within page permissions
    As a business owner
    I want AI to refuse to plan changes for people who may only read a page
    So that AI never becomes a way around permissions
    Note: the prototype uses a deterministic offline planner (lib/ai/planner.ts, lib/ai/mock.ts).
    Free-form prompts and translation need the real AI service (UCP_AI_URL).

    Scenario: Viewer
      Given I have only Read on the page
      When I ask the page AI anything
      Then nothing is planned and I am told the page is read-only

  # Business benefit: Rates and product details are maintained once and update everywhere, cutting maintenance effort. It removes the risk of customers seeing outdated or conflicting figures on different pages.
  @depends:US-06.09
  Rule: US-03.15 · Show shared content from one place
    As a content author
    I want to link an entity to the page and use its fields in text and component fields
    So that a change to the content appears on every page that uses it

    Background:
      Given the entity "ISA rates 2026" of the model "Rate" exists

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

  # Business benefit: Broken or missing shared content is flagged before it reaches customers, protecting accuracy of regulated information. Authors can still detach content deliberately, with a clear trace.
  @depends:US-03.15
  Rule: US-03.16 · Keep page text and linked content consistent
    As a content author
    I want to detach a field on purpose and be warned about tokens and entities that do not match
    So that the page never shows broken or missing shared content

    Background:
      Given the entity "ISA rates 2026" of the model "Rate" exists

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

  # Business benefit: Larger pages are delivered faster because several authors can share the work. Clear ownership means reviewers and managers always know who is responsible.
  @depends:US-02.02
  Rule: US-03.17 · Build a page together with other authors
    As a content author
    I want to join or leave the authors of a page while it is being built
    So that we can share the work and everyone sees who is responsible

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

  # Business benefit: Managers can hand out work deliberately and keep delivery on schedule. Every assignment is logged and limited to people with Edit, keeping access controlled.
  @admin @depends:US-03.17
  Rule: US-03.18 · Assign other people as authors
    As a site admin
    I want to add or remove other people as authors of a page
    So that work is handed out deliberately and nobody is assigned behind their back

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

  # Business benefit: Every page change is traceable to the business request behind it, which supports audit and change management. Reviewers reach the context in one click, speeding up approval.
  Rule: US-03.19 · Link a page to its Jira ticket
    As a content author
    I want to link the page to its Jira ticket and open it in one click
    So that the work is traceable to the request behind it

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

  # Business benefit: Any mistake can be reversed quickly, limiting the impact of an incorrect change. A full version history supports audit and regulatory record-keeping.
  @depends:US-03.04
  Rule: US-03.20 · Go back to any earlier version
    As a content author
    I want every save kept as a version that I can restore or comment on
    So that any change can be reversed and discussed

    Scenario: Restoring a version
      When I open Version history and click "Restore" on an earlier version
      And I confirm "Unsaved edits in the builder are replaced. A copy of the current page is kept as a new version."
      Then the page goes back to that version
      And the version before the restore is kept

    Scenario: Commenting on a version
      When I click "Comment" on a version
      Then the comment says "About the version from …"
