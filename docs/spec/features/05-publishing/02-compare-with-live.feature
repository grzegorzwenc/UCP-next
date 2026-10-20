@epic:publishing @status:done
Feature: Compare an authoring version with the live page
  As an author or publisher
  I want to see the draft next to what customers see today, with the differences listed
  So that I know exactly what will change when I publish

  Background:
    Given the page "Cash ISA" was published before and has been edited since

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

  Scenario: Pick an older authoring version
    When I choose a saved version from the authoring dropdown
    Then the left side shows that version and the differences are recalculated

  Scenario: Jump to a difference
    When I click a difference in the sidebar
    Then it flashes on both sides
