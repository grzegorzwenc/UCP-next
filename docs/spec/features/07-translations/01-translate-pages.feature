@epic:translations @status:done
Feature: Translate pages
  As a content author in a multilingual market
  I want to create translated copies of pages in a few clear steps
  So that every language version still goes through the same review before going live

  Background:
    Given I selected "Cash ISA" and "Fixed rate bonds" in the UK market

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

  Scenario: Translations always go through the workflow
    Then every translated page is created at "Waiting for author's review assignment"
    And it needs the author's review and the business review before it can be published
