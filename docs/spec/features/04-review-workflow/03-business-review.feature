@epic:review-workflow @status:done
Feature: Business review and sign-off
  The business owns the message. Nothing goes live until a business owner signs it off.

  Background:
    Given the author's review of "Cash ISA" was done by "rachel.hughes"
    And the page was sent to the business review

  # Business benefit: Each business decision has one named owner, which gives clear accountability for customer-facing messages. Blocking the peer reviewer from also signing off enforces four-eyes separation.
  @depends:US-04.02.2
  Rule: US-04.03.1 · Take the business review
    As a business owner
    I want to take a page that waits for business review
    So that it is clear who decides on it

    Scenario: Waiting for a business reviewer
      Then the stepper shows "Waiting for business review assignment"
      And My tasks lists the page under "Ready for business review"

    Scenario: A business owner takes it
      Given I am signed in as "david.clarke" with Review on the page
      When I click "Assign to me"
      Then I am the business reviewer
      And the stepper shows "In business review"

    Scenario: The peer reviewer cannot also do the business review
      Given I am signed in as "rachel.hughes"
      When I try to take the business review
      Then I see "You did the author's review · someone else does the business review"

  # Business benefit: Nothing reaches customers without explicit business approval, which reduces conduct and mis-selling risk. Deciding on the page as customers see it lowers the chance of costly post-launch corrections.
  @depends:US-04.03.1
  Rule: US-04.03.2 · Sign off the page or send it back to the author
    As a business owner
    I want to sign the page off or send it back to the author, also from full screen
    So that I decide while looking at the page as customers will see it

    Scenario: Signing off
      Given I am the assigned business reviewer
      When I click "Sign off"
      Then the page status is "Ready to publish"
      And the publishers see it under "Ready to publish" in My tasks
      And the author sees it under "Ready to publish" with "Waiting for a publisher"

    Scenario: Someone else tries to sign off
      Given "david.clarke" is the business reviewer
      When "maria.santos" signs it off
      Then she sees "Only the assigned business reviewer can sign this page off"

    Scenario: Sending it back
      When I click "Reauthor" and confirm
      Then the page is back at "Build the page"
      And both reviews start over

    Scenario: Deciding in full screen
      Given I opened "Review & feedback" in full screen
      When I choose "Sign off" in the "Decision" section
      And I confirm "Yes, sign off"
      Then a full-screen message says "Signed off" with my name and the time

  # Business benefit: Getting the right stakeholders in early avoids late rejections and repeated review rounds. External partners can contribute without new UCP licences, which keeps cost down.
  @depends:US-04.03.1
  Rule: US-04.03.3 · Share the page with the right business reviewers
    As a peer reviewer
    I want to share the page with a person, a review group or a link
    So that the right business owners see it, even without a UCP account

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

  # Business benefit: Keeping the business reviewer fixed protects the integrity of the business decision. Recorded on-behalf sign-off still lets urgent pages move without breaking the audit trail.
  @admin @depends:US-04.03.1 @depends:US-04.03.2
  Rule: US-04.03.4 · Sign off on behalf of the business reviewer as a site admin
    As a site admin
    I want people to stay fixed during the business review, but be able to sign off for the assignee
    So that the business decision is not changed behind its back, and urgent pages can still move

    Scenario: No reassigning in business review
      Given I am signed in as "super.admin"
      Then there is no pencil next to the business reviewer in My tasks

    Scenario: Signing off on behalf
      Given "david.clarke" is the business reviewer
      When I click "Sign off for David Clarke"
      Then I see "Signed off as site admin · ready to publish"
      And the audit line ends with "(on behalf of David Clarke)"
