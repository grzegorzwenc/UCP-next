@epic:review-workflow @status:done
Feature: Send a page for the author's review
  The author finishes the page, checks it once more and hands it to a shared Backlog of reviewers.

  Background:
    Given I am signed in as "content.author" with Edit on the folder of the page
    And the page "Cash ISA" is at the "Build the page" stage

  Rule: US-04.01.1 · Check the page before handing it over
    As a content author
    I want a last check of the page, with any problems Page insights found
    So that I only send pages that are complete

    Scenario: Leaving the preview asks whether the page looks right
      Given I am on the "Preview" step
      When I leave the preview
      Then I see the dialog "Does everything look right?"
      And I can choose "No, keep editing" or "Yes, send for review"

    Scenario: Page insights warn about problems but do not block sending
      Given Page insights found 2 things to fix on the page
      When I leave the preview
      Then the dialog says "Page insights found 2 things to fix. You can still send it"

    Scenario: Required fields are missing
      Given 3 required component fields are empty
      When I click "Send to author's review"
      Then I see "Fill in 3 required fields first"
      And the first incomplete component opens in Configure

  Rule: US-04.01.2 · Request a review from the shared Backlog
    As a content author
    I want to send the page to a Backlog that every reviewer sees, with a note
    So that the first free reviewer can take it and I don't have to chase one person

    Scenario: Sending the page for review
      When I click "Send to author's review"
      And I add the note "Rates changed on 1 Oct" for the reviewer
      And I click "Send to the Backlog"
      Then the page status is "Waiting for author's review assignment"
      And nobody is assigned to review it
      And the review is due in 3 days
      And the audit log says "sent Cash ISA for review · open to all reviewers in the Backlog"
      And I see "Sent for review · it is in the Backlog, any reviewer can take it"

    Scenario: Nobody can review the folder
      Given no user has "Review & approve" on the folder of the page
      When I send the page for review
      Then I see "Nobody can review this page"
      And I am told "Ask a site admin to grant Review & approve on this folder"

  Rule: US-04.01.3 · Keep the page stable while it is being reviewed
    As a content author
    I want the page to be read-only during review, with a clear way to take it back
    So that reviewers check exactly what I sent

    Scenario: The page is read-only in review
      Given the page was sent for review
      When I open it in the page builder
      Then the page is shown as a preview
      And the component and AI panels say "Editing takes it out of the review queue"

    Scenario: Taking the page back for editing
      Given the page was sent for review
      When I click "Edit the page"
      And I confirm "Reopen this page for editing? It will leave the review queue."
      Then the page is back at "Build the page"
