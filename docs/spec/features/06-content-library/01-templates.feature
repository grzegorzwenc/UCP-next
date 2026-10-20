@epic:content-library @status:done
Feature: Page templates
  As a site admin
  I want to define which components a type of page starts with, and in which markets it can be used
  So that pages are consistent and local templates stay local

  Rule: Only site admins change templates

    Scenario: Read-only for everyone else
      Given I am signed in as "content.author"
      Then the template library says "Read-only · ask a site admin to change templates"
      And "Edit" buttons read "View"

  Rule: The library shows where each template can be used

    Scenario: Template cards
      Then each card shows a thumbnail, the number of blocks, the folder, the markets and "used by N pages"

    Scenario: A template for another market
      Given "Rates page" is for Hong Kong only
      When I open the library in the UK
      Then its card is dimmed and the button says "Not for UK"

  Rule: Templates are edited like pages

    Scenario: Editing a template
      Given I am a site admin
      When I add, move or remove components in the template editor
      Then the template saves itself
      And the HSBC menu, breadcrumb and footer cannot be removed

    Scenario: Choosing markets
      When I choose "Only some local markets" and tick "Hong Kong" in Template settings
      Then only Hong Kong can create pages from it
      And I am warned that the UK can no longer create pages from it

    Scenario: Existing pages are not changed
      Then the settings say "Changing the template does not change pages already created with it."

    Scenario: New, duplicate and delete
      Then I can create a template with a unique name, duplicate it as "(copy)" and delete it
      But the "Blank page" template cannot be duplicated or deleted
