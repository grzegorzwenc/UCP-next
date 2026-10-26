@epic:translations @status:done
Feature: Translations
  Language versions of pages, created in a few steps and approved through the same workflow.

  # Business benefit: Pages reach every language of a market far faster than copying them by hand, shortening time to market. Wider language coverage improves access for customers and supports local language requirements.
  @depends:US-02.01
  Rule: US-07.01 · Create translated copies of pages in a few steps
    As a content author
    I want to choose the languages, how the text is translated and where the copies go, then check and create them in one flow
    So that I can offer pages in every language of my market without copying them by hand

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

  # Business benefit: Translations get the same checks as originals, so no unverified wording about products or terms reaches customers. This keeps the bank compliant in every language it publishes.
  @depends:US-07.01 @depends:US-04.01
  Rule: US-07.02 · Review every language version before it goes live
    As a business owner
    I want every translated page to go through the same author's review and business review as the original
    So that no unchecked translation reaches customers

    Background:
      Given I selected "Cash ISA" and "Fixed rate bonds" in the UK market

    Scenario: Translations always go through the workflow
      Then every translated page is created at "Waiting for author's review assignment"
      And it needs the author's review and the business review before it can be published
