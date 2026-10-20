@epic:content-library @status:done
Feature: Page templates
  Defines which components a type of page starts with and in which markets it can be used.

  @admin
  Rule: US-06.01.1 · Build and maintain page templates
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

  @admin
  Rule: US-06.01.2 · Limit a template to some markets
    As a site admin
    I want to choose in which local markets a template can be used
    So that local templates stay local

    Scenario: Choosing markets
      When I choose "Only some local markets" and tick "Hong Kong" in Template settings
      Then only Hong Kong can create pages from it
      And I am warned that the UK can no longer create pages from it

  Rule: US-06.01.3 · Pick the right template for my market
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
