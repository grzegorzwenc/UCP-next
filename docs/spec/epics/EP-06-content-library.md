# EP-06 · Content library

**Epic:** EP-06 · Content library

**Business benefit:** Templates, assets, models and shared content are defined once and reused everywhere, so facts like rates are correct on every page and brand rules are applied by default. Accessibility data on every file supports inclusive design and regulatory accessibility duties.

**Scope:** Reusable building blocks and content: page templates, assets with accessibility data, content models and entities.

**Stories (10):**

1. [US-06.01 · Templates (admin): create, edit, duplicate and delete page templates](#us-0601--templates-admin-create-edit-duplicate-and-delete-page-templates)
2. [US-06.02 · Template markets (admin): limit a template to selected local markets](#us-0602--template-markets-admin-limit-a-template-to-selected-local-markets)
3. [US-06.03 · Template library: browse templates and see contents and allowed markets](#us-0603--template-library-browse-templates-and-see-contents-and-allowed-markets)
4. [US-06.04 · Asset upload: upload and replace files without overwriting or breaking pages](#us-0604--asset-upload-upload-and-replace-files-without-overwriting-or-breaking-pages)
5. [US-06.05 · Asset accessibility: alt text per language and document accessibility details](#us-0605--asset-accessibility-alt-text-per-language-and-document-accessibility-details)
6. [US-06.06 · Asset library: browse by folder and type, find unused files and missing alt text](#us-0606--asset-library-browse-by-folder-and-type-find-unused-files-and-missing-alt-text)
7. [US-06.07 · Asset publishing: publish files and block pages that still use draft files](#us-0607--asset-publishing-publish-files-and-block-pages-that-still-use-draft-files)
8. [US-06.08 · Content models (admin): define fields, publish and change models safely with versions](#us-0608--content-models-admin-define-fields-publish-and-change-models-safely-with-versions)
9. [US-06.09 · Content entities: create and edit content items from published models](#us-0609--content-entities-create-and-edit-content-items-from-published-models)
10. [US-06.10 · Entity publishing: one publish updates every page that shows the entity](#us-0610--entity-publishing-one-publish-updates-every-page-that-shows-the-entity)

---

## US-06.01 · Templates (admin): create, edit, duplicate and delete page templates

**Business benefit:** Every page type starts from an approved structure with mandatory brand and navigation parts, so brand and compliance consistency is built in. New pages are created faster, cutting time to market.

**User story:**

As a site admin  
I want to create, edit, duplicate and delete templates the way I edit pages  
So that every new page of a type starts consistent, with the required HSBC parts in place  

**Persona:** site admin · **Depends on:** — · **Note:** site admin only

**Acceptance criteria:**

**Scenario 1 · Editing a template**

```gherkin
Given I am a site admin
When I add, move or remove components in the template editor
Then the template saves itself
And the HSBC menu, breadcrumb and footer cannot be removed
```

**Scenario 2 · Existing pages are not changed**

```gherkin
Then the settings say "Changing the template does not change pages already created with it."
```

**Scenario 3 · New, duplicate and delete**

```gherkin
Then I can create a template with a unique name, duplicate it as "(copy)" and delete it
But the "Blank page" template cannot be duplicated or deleted
```


---

## US-06.02 · Template markets (admin): limit a template to selected local markets

**Business benefit:** Market-specific layouts cannot be reused by markets they were not approved for, reducing local regulatory and brand risk. Central teams can share templates safely without extra manual checks.

**User story:**

As a site admin  
I want to choose in which local markets a template can be used  
So that local templates stay local  

**Persona:** site admin · **Depends on:** US-06.01 · **Note:** site admin only

**Acceptance criteria:**

**Scenario 1 · Choosing markets**

```gherkin
When I choose "Only some local markets" and tick "Hong Kong" in Template settings
Then only Hong Kong can create pages from it
And I am warned that the UK can no longer create pages from it
```


---

## US-06.03 · Template library: browse templates and see contents and allowed markets

**Business benefit:** Authors start from approved, market-appropriate templates instead of improvising layouts, which lowers rework and review effort. Read-only access protects templates from accidental change.

**User story:**

As a content author  
I want to browse the template library and see what each template contains and where it can be used, without being able to change it  
So that I start pages from an approved template that is allowed in my market  

**Persona:** content author · **Depends on:** US-06.01, US-06.02

**Acceptance criteria:**

**Scenario 1 · Read-only for everyone else**

```gherkin
Given I am signed in as "content.author"
Then the template library says "Read-only · ask a site admin to change templates"
And "Edit" buttons read "View"
```

**Scenario 2 · Template cards**

```gherkin
Then each card shows a thumbnail, the number of blocks, the folder, the markets and "used by N pages"
```

**Scenario 3 · A template for another market**

```gherkin
Given "Rates page" is for Hong Kong only
When I open the library in the UK
Then its card is dimmed and the button says "Not for UK"
```


---

## US-06.04 · Asset upload: upload and replace files without overwriting or breaking pages

**Business benefit:** Files can be updated without breaking live pages, protecting the customer experience and the bank's reputation. Automatic renaming prevents costly overwrites of approved material.

**User story:**

As a content author  
I want to upload and replace files without ever overwriting another file or deleting one that pages still use  
So that no live page breaks because of a change in the library  

**Persona:** content author · **Depends on:** —

**Acceptance criteria:**

**Scenario 1 · Uploading**

```gherkin
When I drop "hero.jpg" into "Campaigns"
Then it is uploaded as a draft
And a second "hero.jpg" becomes "hero-2.jpg"
```

**Scenario 2 · Replacing keeps pages working**

```gherkin
When I replace "hero.jpg" with a new file
Then pages that use it show the new file
And its alt text is kept
```

**Scenario 3 · Deleting a used file**

```gherkin
Given "hero.jpg" is used on 2 pages
Then I cannot delete it and I am told "Remove it from pages first"
```


---

## US-06.05 · Asset accessibility: alt text per language and document accessibility details

**Business benefit:** Recording alt text and document accessibility details helps the bank meet its accessibility obligations and avoid legal risk. Customers using assistive technology get the same information as everyone else.

**User story:**

As a content author  
I want to record alt text per language for images and the accessibility details of documents  
So that every file on our pages can be used by customers with assistive technology  

**Persona:** content author · **Depends on:** US-06.04

**Acceptance criteria:**

**Scenario 1 · Alt text per language**

```gherkin
When I open the accessibility panel of an image
Then I enter alt text for every language of the market, the first one required
And instead of alt text I can mark it "Decorative only"
And I am told not to start with "image of" and to keep it under 150 characters
```

**Scenario 2 · Documents**

```gherkin
Then a PDF needs a title, a language and "Tagged PDF, checked"
```


---

## US-06.06 · Asset library: browse by folder and type, find unused files and missing alt text

**Business benefit:** Reusing approved files avoids duplicate purchases and repeated approvals, lowering cost. Smart views surface unused and inaccessible files so problems are fixed before audits find them.

**User story:**

As a content author  
I want to browse files by folder and type and see which ones are unused or missing accessibility details  
So that I reuse approved files and can clean up problems quickly  

**Persona:** content author · **Depends on:** US-06.04, US-06.05

**Acceptance criteria:**

**Scenario 1 · Browsing**

```gherkin
When I open Assets
Then I see folders with counts, a grid or list, and filters for Images, Documents and Icons
```

**Scenario 2 · Smart views** *(one run per row of the table)*

```gherkin
When I open "<view>"
Then I see <what>

Examples:
  | view                         | what                                        |
  | Not used on any page         | files no page uses                          |
  | Missing accessibility info   | images without alt text and untagged PDFs   |
```


---

## US-06.07 · Asset publishing: publish files and block pages that still use draft files

**Business benefit:** Only approved files can appear on live pages, reducing brand, legal and compliance risk. The publish record shows who approved each file and when, supporting audits.

**User story:**

As a publisher  
I want to publish draft files and have pages refused while they still use a draft file  
So that customers only ever see approved files  

**Persona:** publisher · **Depends on:** US-06.04

**Acceptance criteria:**

**Scenario 1 · Publishing a file**

```gherkin
Given I have Publish
When I click "Publish" on a draft file
Then it shows "Published" with who and when
```

**Scenario 2 · A page cannot go live with a draft file**

```gherkin
Then publishing a page that uses a draft file is refused until the file is published
```


---

## US-06.08 · Content models (admin): define fields, publish and change models safely with versions

**Business benefit:** Structured, validated content types give every channel consistent data and reduce errors in key facts. Guarded breaking changes protect live content and avoid costly outages.

**User story:**

As a site admin  
I want to create content models with validated fields, publish them, and change them safely over time  
So that authors get well-structured content types and live content is not broken by a careless change  

**Persona:** site admin · **Depends on:** — · **Note:** site admin only

**Acceptance criteria:**

**Scenario 1 · Creating a model**

```gherkin
Given I am a site admin
When I create the model "Savings product" in 3 steps: information, fields and review
Then its id is "savings-product"
And I can "Save as draft" or "Save & publish"
```

**Scenario 2 · Field validation** *(one run per row of the table)*

```gherkin
When I add a field with <problem>
Then I see an error

Examples:
  | problem                                  |
  | a key that is not camelCase              |
  | a key that already exists                |
  | a minimum length above the maximum       |
  | an invalid regular expression            |
  | a select field without options           |
```

**Scenario 3 · Breaking changes need confirmation**

```gherkin
Given the model is published
When I remove a field, change a type or make a field required and publish
Then I must tick "I understand the impact"
```

**Scenario 4 · Versions**

```gherkin
Then every change is kept as a version I can compare and restore into the draft
```


---

## US-06.09 · Content entities: create and edit content items from published models

**Business benefit:** Facts such as rates are entered once, so the bank avoids inconsistent figures that could mislead customers. Blocking deletion of items in use prevents broken pages.

**User story:**

As a content author  
I want to fill in entities from published models, see the model as documentation, and be stopped from deleting entities in use  
So that facts like rates are written once, correctly, and no page loses its content  

**Persona:** content author · **Depends on:** US-06.08

**Acceptance criteria:**

**Scenario 1 · Read-only for others**

```gherkin
Given I am not a site admin
Then content models show "Read-only · documentation view"
```

**Scenario 2 · Creating an entity**

```gherkin
Given I have Edit on the market
When I create an entity of the published model "Rate" called "ISA rates 2026"
Then a form built from the model's fields opens
```

**Scenario 3 · Draft models cannot be used**

```gherkin
Then a model that is still a draft is disabled with "Publish the model first"
```

**Scenario 4 · Validation**

```gherkin
When I save with 2 invalid fields
Then I see "Fix 2 fields before saving"
```

**Scenario 5 · Entities in use cannot be deleted**

```gherkin
Given "ISA rates 2026" is used on 3 pages
When I delete it
Then I see "Used on 3 pages · Remove it from those pages first"
```


---

## US-06.10 · Entity publishing: one publish updates every page that shows the entity

**Business benefit:** A rate change reaches every page and channel at the same moment, lowering conduct risk from outdated figures. It removes the cost of editing many pages by hand.

**User story:**

As a content author  
I want publishing an entity to update every page that shows it  
So that a changed rate is correct on all pages and channels at the same moment  

**Persona:** content author · **Depends on:** US-06.09, US-03.15

**Acceptance criteria:**

**Scenario 1 · Publishing an entity updates the pages that use it**

```gherkin
When I publish "ISA rates 2026"
Then the audit log says it updates the pages that show it
And the delivery API shows the new values on those pages
```
