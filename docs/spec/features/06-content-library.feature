@epic:content-library @status:done
Feature: Content library
  Reusable building blocks and content: page templates, assets with accessibility data, content models and entities.

  # Business benefit: Every page type starts from an approved structure with mandatory brand and navigation parts, so brand and compliance consistency is built in. New pages are created faster, cutting time to market.
  @admin
  Rule: US-06.01 · Build and maintain page templates
    As a site admin
    I want to create, edit, duplicate and delete templates the way I edit pages
    So that every new page of a type starts consistent, with the required HSBC parts in place

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

  # Business benefit: Market-specific layouts cannot be reused by markets they were not approved for, reducing local regulatory and brand risk. Central teams can share templates safely without extra manual checks.
  @admin @depends:US-06.01
  Rule: US-06.02 · Limit a template to some markets
    As a site admin
    I want to choose in which local markets a template can be used
    So that local templates stay local

    Scenario: Choosing markets
      When I choose "Only some local markets" and tick "Hong Kong" in Template settings
      Then only Hong Kong can create pages from it
      And I am warned that the UK can no longer create pages from it

  # Business benefit: Authors start from approved, market-appropriate templates instead of improvising layouts, which lowers rework and review effort. Read-only access protects templates from accidental change.
  @depends:US-06.01 @depends:US-06.02
  Rule: US-06.03 · Pick the right template for my market
    As a content author
    I want to browse the template library and see what each template contains and where it can be used, without being able to change it
    So that I start pages from an approved template that is allowed in my market

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

  # Business benefit: Files can be updated without breaking live pages, protecting the customer experience and the bank's reputation. Automatic renaming prevents costly overwrites of approved material.
  Rule: US-06.04 · Upload and replace files safely
    As a content author
    I want to upload and replace files without ever overwriting another file or deleting one that pages still use
    So that no live page breaks because of a change in the library

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

  # Business benefit: Recording alt text and document accessibility details helps the bank meet its accessibility obligations and avoid legal risk. Customers using assistive technology get the same information as everyone else.
  @depends:US-06.04
  Rule: US-06.05 · Make files accessible
    As a content author
    I want to record alt text per language for images and the accessibility details of documents
    So that every file on our pages can be used by customers with assistive technology

    Scenario: Alt text per language
      When I open the accessibility panel of an image
      Then I enter alt text for every language of the market, the first one required
      And instead of alt text I can mark it "Decorative only"
      And I am told not to start with "image of" and to keep it under 150 characters

    Scenario: Documents
      Then a PDF needs a title, a language and "Tagged PDF, checked"

  # Business benefit: Reusing approved files avoids duplicate purchases and repeated approvals, lowering cost. Smart views surface unused and inaccessible files so problems are fixed before audits find them.
  @depends:US-06.04 @depends:US-06.05
  Rule: US-06.06 · Find the right file
    As a content author
    I want to browse files by folder and type and see which ones are unused or missing accessibility details
    So that I reuse approved files and can clean up problems quickly

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

  # Business benefit: Only approved files can appear on live pages, reducing brand, legal and compliance risk. The publish record shows who approved each file and when, supporting audits.
  @depends:US-06.04
  Rule: US-06.07 · Approve files for live use
    As a publisher
    I want to publish draft files and have pages refused while they still use a draft file
    So that customers only ever see approved files

    Scenario: Publishing a file
      Given I have Publish
      When I click "Publish" on a draft file
      Then it shows "Published" with who and when

    Scenario: A page cannot go live with a draft file
      Then publishing a page that uses a draft file is refused until the file is published

  # Business benefit: Structured, validated content types give every channel consistent data and reduce errors in key facts. Guarded breaking changes protect live content and avoid costly outages.
  @admin
  Rule: US-06.08 · Define and evolve content models
    As a site admin
    I want to create content models with validated fields, publish them, and change them safely over time
    So that authors get well-structured content types and live content is not broken by a careless change

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

  # Business benefit: Facts such as rates are entered once, so the bank avoids inconsistent figures that could mislead customers. Blocking deletion of items in use prevents broken pages.
  @depends:US-06.08
  Rule: US-06.09 · Create reusable content items from a model
    As a content author
    I want to fill in entities from published models, see the model as documentation, and be stopped from deleting entities in use
    So that facts like rates are written once, correctly, and no page loses its content

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

  # Business benefit: A rate change reaches every page and channel at the same moment, lowering conduct risk from outdated figures. It removes the cost of editing many pages by hand.
  @depends:US-06.09 @depends:US-03.15
  Rule: US-06.10 · Update a fact everywhere at once
    As a content author
    I want publishing an entity to update every page that shows it
    So that a changed rate is correct on all pages and channels at the same moment

    Scenario: Publishing an entity updates the pages that use it
      When I publish "ISA rates 2026"
      Then the audit log says it updates the pages that show it
      And the delivery API shows the new values on those pages
