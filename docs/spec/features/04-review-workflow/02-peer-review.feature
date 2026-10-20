@epic:review-workflow @status:done
Feature: Author's (peer) review
  A second person from the content team checks the page and decides: on to the business, or back to the author.

  Background:
    Given the page "Cash ISA" was sent for review by "content.author"
    And "rachel.hughes" has "Review & approve" on the page

  Rule: US-04.02.1 · Take a review from the Backlog, or give it back
    As a peer reviewer
    I want to assign a waiting page to myself and return it if I cannot do it
    So that every review has exactly one owner and nothing gets stuck with me

    Scenario: A reviewer assigns the page to themselves
      Given I am signed in as "rachel.hughes"
      When I click "Assign to me" on "Cash ISA" in the Backlog
      Then I am the peer reviewer of the page
      And the stepper shows "Assigned to reviewer"
      And I see "Cash ISA is yours · find it in Ready for review"

    Scenario: Two reviewers try to take the same page
      Given "aisha.khan" already took "Cash ISA"
      When I try to take it as "rachel.hughes"
      Then I see "Already assigned to Aisha Khan"

    Scenario: Someone without Review cannot take it
      Given I am signed in as "tunde.boateng" who only has Read
      Then the "Assign to me" button is disabled
      And I see "Only reviewers can take it · you don't have Review & approve here"

    Scenario Outline: Back to backlog before the review starts
      Given "rachel.hughes" took "Cash ISA" but has not started the review
      And I am signed in as "<who>"
      When I click "Back to backlog"
      Then <outcome>

      Examples:
        | who           | outcome                                                                            |
        | rachel.hughes | nobody is assigned and the page is in the Backlog again                           |
        | aisha.khan    | I see "Only the assigned reviewer or a site admin can put it back in the Backlog" |

    Scenario: A started review cannot go back
      Given the review of "Cash ISA" has started
      When the reviewer clicks "Back to backlog"
      Then they see "The review has already started"

  Rule: US-04.02.2 · Review the page and decide what happens next
    As a peer reviewer
    I want to finish my review with one decision: business review or back to the author
    So that the page moves on without extra hand-offs

    Scenario: Starting the review
      Given I am signed in as "rachel.hughes" and I am assigned to "Cash ISA"
      When I click "Start review"
      Then the page status is "In author's review"

    Scenario: Only the assigned reviewer decides
      Given "rachel.hughes" is assigned to "Cash ISA"
      When "aisha.khan" marks it reviewed
      Then she sees "Only the assigned reviewer can approve this page"

    Scenario: Finishing the review opens a choice
      Given the review of "Cash ISA" is in progress and I am the reviewer
      When I click "Reviewed"
      Then I see "Author's review done · what next?"
      And I can choose "Send to business review" or "Reauthor"

    Scenario: Sending to the business review
      When I choose "Send to business review"
      Then the page status is "In business review"
      And the stepper shows "Waiting for business review assignment"
      And the "Share for review" dialog opens as the next step

    Scenario: Sending the page back to the author
      When I choose "Reauthor"
      And I confirm "Send it back to the author?"
      Then the page is back at "Build the page"
      And the peer reviewer, the business reviewer and the review groups are cleared

  Rule: US-04.02.3 · Nudge a reviewer who is taking long
    As a content author
    I want to remind the reviewer, but not more often than every 15 minutes
    So that my page keeps moving without spamming anyone

    Scenario: Sending a reminder
      Given I am signed in as "content.author" and the review is waiting
      When I click "Remind"
      Then the reviewer gets the notification "Reminder: Content Author is waiting for your review of Cash ISA"

    Scenario: Reminder rate limit
      Given a reminder was sent 5 minutes ago
      When I click "Remind" again
      Then I see "A reminder was sent a few minutes ago"

  @admin
  Rule: US-04.02.4 · Steer reviews as a site admin
    As a site admin
    I want to reassign reviewers and act for them when needed
    So that reviews never get stuck, and everyone can see that I stepped in

    Scenario: Reassigning the peer reviewer
      Given I am signed in as "super.admin"
      When I click the pencil next to the peer reviewer in My tasks
      And I choose "aisha.khan"
      Then "aisha.khan" is the peer reviewer
      And the audit log says "reassigned the review of Cash ISA from Rachel Hughes to Aisha Khan"

    Scenario: Assigning automatically
      When I choose "Assign automatically"
      Then the reviewer with the fewest open reviews is assigned
      But never the person who sent the page

    Scenario: Putting any review back in the Backlog
      Given "rachel.hughes" took "Cash ISA" but has not started the review
      When I click "Back to backlog" as "super.admin"
      Then nobody is assigned and the page is in the Backlog again

    Scenario: Marking it reviewed for the reviewer
      Given "rachel.hughes" is the reviewer
      When I click "Reviewed for Rachel Hughes" as "super.admin"
      Then the audit line ends with "(on behalf of Rachel Hughes)"
