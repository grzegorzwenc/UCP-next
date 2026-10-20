@epic:review-workflow @status:done
Feature: Send a page for the author's review
  As a content author
  I want to send a finished draft to a shared review Backlog
  So that any reviewer can pick it up and the page does not depend on one person

  Background:
    Given I am signed in as "content.author" with Edit on the folder of the page
    And the page "Cash ISA" is at the "Build the page" stage

  Rule: The author checks the page before sending it

    Scenario: Leaving the preview asks whether the page looks right
      Given I am on the "Preview" step
      When I leave the preview
      Then I see the dialog "Does everything look right?"
      And I can choose "No, keep editing" or "Yes, send for review"

    Scenario: Page insights warn about problems but do not block sending
      Given Page insights found 2 things to fix on the page
      When I leave the preview
      Then the dialog says "Page insights found 2 things to fix. You can still send it"

  Rule: Only a complete page can go to review

    Scenario: Required fields are missing
      Given 3 required component fields are empty
      When I click "Send to author's review"
      Then I see "Fill in 3 required fields first"
      And the first incomplete component opens in Configure

    Scenario: Nobody can review the folder
      Given no user has "Review & approve" on the folder of the page
      When I send the page for review
      Then I see "Nobody can review this page"
      And I am told "Ask a site admin to grant Review & approve on this folder"

  Rule: A sent page waits unassigned in the Backlog

    Scenario: Sending the page for review
      When I click "Send to author's review"
      And I add the note "Rates changed on 1 Oct" for the reviewer
      And I click "Send to the Backlog"
      Then the page status is "Waiting for author's review assignment"
      And nobody is assigned to review it
      And the review is due in 3 days
      And the audit log says "sent Cash ISA for review · open to all reviewers in the Backlog"
      And I see "Sent for review · it is in the Backlog, any reviewer can take it"

    Scenario: The page becomes read-only while it is in review
      Given the page was sent for review
      When I open it in the page builder
      Then the page is shown as a preview
      And the component and AI panels say "Editing takes it out of the review queue"

    Scenario: Reopening a page in review for editing
      Given the page was sent for review
      When I click "Edit the page"
      And I confirm "Reopen this page for editing? It will leave the review queue."
      Then the page is back at "Build the page"
