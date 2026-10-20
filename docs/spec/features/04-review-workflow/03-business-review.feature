@epic:review-workflow @status:done
Feature: Business review and sign-off
  As a business owner
  I want to review the page and either sign it off or send it back
  So that nothing goes live without the business agreeing to it

  Background:
    Given the author's review of "Cash ISA" was done by "rachel.hughes"
    And the page was sent to the business review

  Rule: The business review waits until a person or a group takes it

    Scenario: Waiting for a business reviewer
      Then the stepper shows "Waiting for business review assignment"
      And My tasks lists the page under "Ready for business review"

    Scenario: A business reviewer takes it
      Given I am signed in as "david.clarke" with Review on the page
      When I click "Assign to me"
      Then I am the business reviewer
      And the stepper shows "In business review"

    Scenario: The peer reviewer cannot also do the business review (four eyes)
      Given I am signed in as "rachel.hughes"
      When I try to take the business review
      Then I see "You did the author's review · someone else does the business review"

  Rule: The page can be shared with people and groups outside the author team

    Scenario: Share with a review group
      Given the "Share for review" dialog is open
      When I give the "Savings & Mortgages board" group access
      Then the members of the group see the page in My tasks
      And I see "Savings & Mortgages board (3 people) now has access"
      And the group is shown as a chip and cannot be added twice

    Scenario: Share by e-mail with a UCP user
      When I send the review link to "maria.santos@hsbc.com"
      Then Maria Santos is assigned as the business reviewer
      And my mail app opens with the link

    Scenario: Share by e-mail with someone outside UCP
      When I send the review link to "partner@example.com"
      Then I see "partner@example.com can comment through the link"

    Scenario: Invalid e-mail
      When I send the review link to "not-an-email"
      Then I see "That e-mail address does not look right"

  Rule: Only the assigned business reviewer signs off

    Scenario: Signing off
      Given I am the assigned business reviewer
      When I click "Sign off"
      Then the page status is "Ready to publish"
      And the publishers see it under "Ready to publish" in My tasks

    Scenario: Someone else tries to sign off
      Given "david.clarke" is the business reviewer
      When "maria.santos" signs it off
      Then she sees "Only the assigned business reviewer can sign this page off"

    Scenario: Business reviewer sends it back
      When I click "Reauthor" and confirm
      Then the page is back at "Build the page"
      And both reviews start over

  Rule: People are not changed during the business review

    Scenario: No reassigning in business review
      Given I am signed in as "super.admin"
      Then there is no pencil next to the business reviewer in My tasks

  Rule: The decision can be made in full screen

    Scenario: Decide from the full-screen review
      Given I opened "Review & feedback" in full screen
      When I choose "Sign off" in the "Decision" section
      And I confirm "Yes, sign off"
      Then a full-screen message says "Signed off" with my name and the time
