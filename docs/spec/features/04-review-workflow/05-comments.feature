@epic:review-workflow @status:done
Feature: Comments on a page
  As anyone working on a page
  I want to comment on a specific text, picture or component
  So that feedback is precise and nobody has to describe where the problem is

  Background:
    Given the page "Cash ISA" is in the author's review
    And I am signed in as the reviewer

  Rule: In review stages a click on the page picks what the comment is about

    Scenario Outline: Picking a target
      When I click <target> on the page
      Then the comment box shows "<label>"

      Examples:
        | target                    | label                              |
        | the masthead heading      | “Your heading here” · Masthead     |
        | the masthead photo        | Background image · Masthead        |
        | empty space in a component| Key facts                          |

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

  Rule: Comments are validated

    Scenario Outline: Invalid comments
      When I post "<text>"
      Then I see "<message>"

      Examples:
        | text                     | message                               |
        |                          | Write a comment first                 |
        | 2,001 characters of text | Keep comments under 2,000 characters  |

    Scenario: Only people working on the page can comment in UCP
      Given I am signed in as a viewer
      When I post a comment
      Then I see "Only people who edit or review this page can comment"

  Rule: Resolved comments leave the page but stay in the list

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

  Rule: Comments are a separate panel from version history

    Scenario: Opening comments
      When I click the Comments icon in the right rail
      Then the Comments panel opens with the number of open comments
      And "Review & feedback" next to "1:1" opens the page full screen with floating comments
