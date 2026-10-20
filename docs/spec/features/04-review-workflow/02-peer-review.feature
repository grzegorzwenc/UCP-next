@epic:review-workflow @status:done
Feature: Author's (peer) review
  As a reviewer
  I want to take pages from the Backlog, review them and decide what happens next
  So that every page is checked by a second person before the business sees it

  Background:
    Given the page "Cash ISA" was sent for review by "content.author"
    And "rachel.hughes" has "Review & approve" on the page

  Rule: Any reviewer except the author can take a page from the Backlog

    Scenario: A reviewer assigns the page to themselves
      Given I am signed in as "rachel.hughes"
      When I click "Assign to me" on "Cash ISA" in the Backlog
      Then I am the peer reviewer of the page
      And the stepper shows "Assigned to reviewer"
      And I see "Cash ISA is yours · find it in Ready for review"

    Scenario: The author cannot review their own page (four eyes)
      Given I am signed in as "content.author"
      When I try to take "Cash ISA" from the Backlog
      Then I see "You wrote this page, so someone else reviews it"
      And the Backlog shows "Waiting for a reviewer to take it" instead of "Assign to me"

    Scenario: Someone without Review cannot take it
      Given I am signed in as "tunde.boateng" who only has Read
      Then the "Assign to me" button is disabled
      And I see "Only reviewers can take it · you don't have Review & approve here"

    Scenario: Two reviewers try to take the same page
      Given "aisha.khan" already took "Cash ISA"
      When I try to take it as "rachel.hughes"
      Then I see "Already assigned to Aisha Khan"

  Rule: A review that has not started can go back to the Backlog

    Scenario Outline: Back to backlog
      Given "rachel.hughes" took "Cash ISA" but has not started the review
      And I am signed in as "<who>"
      When I click "Back to backlog"
      Then <outcome>

      Examples:
        | who           | outcome                                                                                   |
        | rachel.hughes | nobody is assigned and the page is in the Backlog again                                  |
        | super.admin   | nobody is assigned and the page is in the Backlog again                                  |
        | aisha.khan    | I see "Only the assigned reviewer or a site admin can put it back in the Backlog"        |

    Scenario: A started review cannot go back
      Given the review of "Cash ISA" has started
      When the reviewer clicks "Back to backlog"
      Then they see "The review has already started"

  Rule: Only the assigned reviewer starts and finishes the review

    Scenario: Starting the review
      Given I am signed in as "rachel.hughes" and I am assigned to "Cash ISA"
      When I click "Start review"
      Then the page status is "In author's review"

    Scenario: Someone else tries to approve an assigned review
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

  Rule: Site admins can steer the review but act visibly on behalf of others

    Scenario: An admin reassigns the peer reviewer
      Given I am signed in as "super.admin"
      When I click the pencil next to the peer reviewer in My tasks
      And I choose "aisha.khan"
      Then "aisha.khan" is the peer reviewer
      And the audit log says "reassigned the review of Cash ISA from Rachel Hughes to Aisha Khan"

    Scenario: An admin assigns automatically
      When I choose "Assign automatically"
      Then the reviewer with the fewest open reviews is assigned
      But never the person who sent the page

    Scenario: An admin marks it reviewed for the reviewer
      Given "rachel.hughes" is the reviewer
      When I click "Reviewed for Rachel Hughes" as "super.admin"
      Then the audit line ends with "(on behalf of Rachel Hughes)"

  Rule: Authors can nudge a waiting reviewer, but not too often

    Scenario: Sending a reminder
      Given I am signed in as "content.author" and the review is waiting
      When I click "Remind"
      Then the reviewer gets the notification "Reminder: Content Author is waiting for your review of Cash ISA"

    Scenario: Reminder rate limit
      Given a reminder was sent 5 minutes ago
      When I click "Remind" again
      Then I see "A reminder was sent a few minutes ago"
