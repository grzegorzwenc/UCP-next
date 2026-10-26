@epic:review-workflow @status:done
Feature: Comments on a page
  Feedback is attached to the exact text, picture or component it is about.

  Background:
    Given the page "Cash ISA" is in the author's review
    And I am signed in as the reviewer

  # Business benefit: Feedback pinned to the exact element removes ambiguity and reduces rework. Limiting who can comment keeps feedback relevant and the review record trustworthy.
  @depends:US-04.02.2
  Rule: US-04.05.1 · Comment on exactly what I mean
    As a peer reviewer or business owner
    I want to click a text, picture or component and comment on it
    So that the author knows exactly what to change

    Scenario Outline: Picking a target
      When I click <target> on the page
      Then the comment box shows "<label>"

      Examples:
        | target                     | label                          |
        | the masthead heading       | “Your heading here” · Masthead |
        | the masthead photo         | Background image · Masthead    |
        | empty space in a component | Key facts                      |

    Scenario Outline: Invalid comments
      When I post "<text>"
      Then I see "<message>"

      Examples:
        | text                     | message                              |
        |                          | Write a comment first                |
        | 2,001 characters of text | Keep comments under 2,000 characters |

    Scenario: Only people working on the page can comment in UCP
      Given I am signed in as a viewer
      When I post a comment
      Then I see "Only people who edit or review this page can comment"

    Scenario: Opening comments
      When I click the Comments icon in the right rail
      Then the Comments panel opens with the number of open comments
      And "Review & feedback" next to "1:1" opens the page full screen with floating comments

  # Business benefit: Authors see at a glance what is still open, so no requested change is missed before sign-off. Resolved comments never leak onto the published page, which protects the customer experience.
  @depends:US-04.05.1
  Rule: US-04.05.2 · Work through the feedback
    As a content author
    I want to jump to each comment's place, resolve it and undo by mistake
    So that I see what is still open and the published page stays clean

    Scenario: Components with open comments show a badge
      Given the "Key facts" component has 2 open comments
      Then the component shows a badge with "2"

    Scenario: Jumping to what a comment is about
      When I click the chip of a comment
      Then the page scrolls to that part and flashes it

    Scenario: The part was removed
      Given the commented text was deleted from the page
      When I click the chip of the comment
      Then I see "That part is not on the page any more"

    Scenario: Resolving with undo
      When I resolve a comment
      Then it moves to "Resolved · not shown on the page"
      And its marker disappears from the page
      And I can click "Undo" for 6 seconds

    Scenario: Pinning
      When I pin a comment
      Then it stays at the top of the list

    Scenario: Deleting someone else's comment
      Given I am not a site admin
      When I delete a comment written by someone else
      Then I see "You can only delete your own comments"
