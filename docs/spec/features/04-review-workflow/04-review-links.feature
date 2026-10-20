@epic:review-workflow @status:done
Feature: Review links for people without UCP access
  As a business stakeholder who has no UCP account
  I want to open a link, read the page, comment and decide
  So that I can take part in the review without learning the CMS

  Background:
    Given the page "Cash ISA" is in business review
    And a review link was created for it

  Rule: A link works only during the stage it was shared for

    Scenario: Opening a valid link
      When I open the review link
      Then I see the page full screen with a floating Comments panel
      And search engines are told not to index it

    Scenario: The stage is over
      Given the page has moved on to "Ready to publish"
      When I open the review link
      Then I see "This business review is finished. You can still read the page and the comments."
      And I cannot comment or decide

    Scenario: Unknown link
      When I open a review link with an unknown token
      Then I see "This review link does not work"

  Rule: Anyone with the link can comment, with their name and e-mail

    Scenario: Commenting on a part of the page
      When I click a heading on the page
      And I write "Is this rate still correct?"
      And I enter my name and e-mail
      Then the comment is saved against that heading
      And it is marked "During the business review"

    Scenario: Commenting without a name
      When I post a comment without my name or e-mail
      Then I see "Add your name and e-mail so the team knows who commented"

  Rule: Only the people the review was sent to can decide

    Scenario Outline: Who may sign off through the link
      Given the link was <sent>
      When a guest using "<email>" signs off
      Then <outcome>

      Examples:
        | sent                                        | email                  | outcome                                                                      |
        | to "partner@example.com"                    | partner@example.com    | the page is "Ready to publish" and approved by "guest:partner@example.com"  |
        | to "partner@example.com"                    | other@example.com      | they see "This link was sent to partner@example.com. Use that e-mail to decide." |
        | to the "Business owners" group              | david.clarke@hsbc.com  | the page is "Ready to publish"                                               |
        | as a plain copied link                      | anyone@example.com     | they see "Signing off is for the people the review was sent to."            |

    Scenario: A business reviewer is already assigned
      Given "david.clarke" is the assigned business reviewer
      When another invited person tries to decide
      Then they see "David Clarke decides on this page."

    Scenario: Reauthor through the link
      When the invited reviewer chooses "Reauthor" with a note
      Then the page is back at "Build the page"
      And the note is added as a comment
      And a full-screen message says "Sent back to the author"
