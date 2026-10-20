@epic:page-builder @status:done
Feature: Design patterns
  A design pattern is a group of components saved together, so common sections look the same on every page and take one click to add.

  Background:
    Given I am signed in with Edit on the page

  Rule: US-03.02.1 · Reuse a section in one click
    As a content author
    I want to pick a design pattern from its own library and add all its components at once
    So that common sections look the same on every page

    Scenario: Opening the pattern library
      When I click the "Design patterns" tile in the left rail
      Then I see the patterns with live thumbnails
      And design-system patterns are labelled "Design system" and mine "Saved"

    Scenario: Adding a pattern
      When I click "Product introduction"
      Then Masthead, Content master and Icon tiles are added below the selected component
      And I see "Product introduction added · 3 components"

  Rule: US-03.02.2 · Save my own design pattern
    As a content author
    I want to save components already on the page as a named pattern, for all or only some markets
    So that I and my colleagues can reuse a section that works

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

  Rule: US-03.02.3 · Remove my patterns safely
    As a content author
    I want to archive my own patterns first and delete them for good only on purpose
    So that a pattern is never lost by mistake and pages that use it are not affected

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

  @admin
  Rule: US-03.02.4 · Manage design-system patterns
    As a site admin
    I want to remove built-in design-system patterns that ordinary authors cannot touch
    So that the shared pattern library stays current

    Scenario Outline: A site admin removes a design-system pattern
      Given the pattern "<pattern>"
      When "<who>" removes it
      Then <outcome>

      Examples:
        | pattern               | who            | outcome                                                   |
        | Product introduction  | super.admin    | it is archived                                            |
