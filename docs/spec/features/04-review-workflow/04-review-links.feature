@epic:review-workflow @status:done
Feature: Review links for people without UCP access
  Business stakeholders often have no UCP account. A link lets them read, comment and, if invited, decide.

  Background:
    Given the page "Cash ISA" is in business review
    And a review link was created for it

  Rule: US-04.04.1 · Read and comment through a link
    As a guest reviewer
    I want to open a link, see the page full screen and comment on any part of it
    So that I can give feedback without learning the CMS

    Scenario: Opening a valid link
      When I open the review link
      Then I see the page full screen with a floating Comments panel
      And search engines are told not to index it

    Scenario: Commenting on a part of the page
      When I click a heading on the page
      And I write "Is this rate still correct?"
      And I enter my name and e-mail
      Then the comment is saved against that heading
      And it is marked "During the business review"

    Scenario: Commenting without a name
      When I post a comment without my name or e-mail
      Then I see "Add your name and e-mail so the team knows who commented"

    Scenario: The stage is over
      Given the page has moved on to "Ready to publish"
      When I open the review link
      Then I see "This business review is finished. You can still read the page and the comments."
      And I cannot comment or decide

    Scenario: Unknown link
      When I open a review link with an unknown token
      Then I see "This review link does not work"

  Rule: US-04.04.2 · Decide through the link, only if invited
    As a guest reviewer who was invited
    I want to sign off or send the page back from the link
    So that the business can decide without a UCP account, while a forwarded link cannot approve anything

    Scenario Outline: Who may sign off through the link
      Given the link was <sent>
      When a guest using "<email>" signs off
      Then <outcome>

      Examples:
        | sent                            | email                 | outcome                                                                          |
        | to "partner@example.com"        | partner@example.com   | the page is "Ready to publish" and approved by "guest:partner@example.com"      |
        | to "partner@example.com"        | other@example.com     | they see "This link was sent to partner@example.com. Use that e-mail to decide." |
        | to the "Business owners" group  | david.clarke@hsbc.com | the page is "Ready to publish"                                                   |
        | as a plain copied link          | anyone@example.com    | they see "Signing off is for the people the review was sent to."                |

    Scenario: A business reviewer is already assigned
      Given "david.clarke" is the assigned business reviewer
      When another invited person tries to decide
      Then they see "David Clarke decides on this page."

    Scenario: Reauthor through the link
      When the invited reviewer chooses "Reauthor" with a note
      Then the page is back at "Build the page"
      And the note is added as a comment
      And a full-screen message says "Sent back to the author"
