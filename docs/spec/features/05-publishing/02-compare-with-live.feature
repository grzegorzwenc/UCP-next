@epic:publishing @status:done
Feature: Compare an authoring version with the live page
  Shows the draft next to what customers see today, with the differences listed.

  Background:
    Given the page "Cash ISA" was published before and has been edited since

  Rule: US-05.02.1 · See what will change before publishing
    As a publisher
    I want to see the authoring version next to the live page, with every difference listed
    So that I know exactly what will change for customers when I publish

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

    Scenario: Jump to a difference
      When I click a difference in the sidebar
      Then it flashes on both sides

  Rule: US-05.02.2 · Check an older version against live
    As a content author
    I want to compare any saved version of my page with the live page
    So that I can find when a change was made and what customers still see

    Scenario: Pick an older authoring version
      When I choose a saved version from the authoring dropdown
      Then the left side shows that version and the differences are recalculated
