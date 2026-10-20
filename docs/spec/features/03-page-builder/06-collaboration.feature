@epic:page-builder @status:done
Feature: Working together on a page (authors, Jira, versions)
  A page can be built by several authors, linked to its ticket and taken back to any earlier version, so work is shared, traceable and reversible.

  Rule: US-03.06.1 · Build a page together with other authors
    As a content author
    I want to join or leave the authors of a page while it is being built
    So that we can share the work and everyone sees who is responsible

    Scenario: Joining as an author
      Given "Super Admin" created the page and is its only author
      And I am signed in as "jordan.mensah" with Edit
      Then the hint says "Super Admin is building this page · Assign me to work on it with them"
      When I click "Assign me"
      Then the Authors chip shows "You + 1"
      And the hint says "Building it together with Super Admin"

    Scenario: Leaving
      When I click "Leave" in the Authors list
      Then I am no longer an author

    Scenario: Authors are fixed after the first stage
      Given the page was sent for review
      When anyone changes the authors
      Then they see "Authors can only change while the page is at Build the page"

    Scenario: Co-authors in My tasks
      Given the page has 2 authors
      Then My tasks shows the second one under the Content author as "+ Name"

  @admin
  Rule: US-03.06.2 · Assign other people as authors
    As a site admin
    I want to add or remove other people as authors of a page
    So that work is handed out deliberately and nobody is assigned behind their back

    Scenario: A site admin adds an author
      Given I am signed in as "super.admin"
      When I choose "aisha.khan" in "Add a person…" in the Authors list and click "Add"
      Then "aisha.khan" is an author of the page
      And the audit log says "assigned Aisha Khan as an author of" the page

    Scenario: The person must be able to edit
      When I add someone without Edit on the page
      Then I see that they don't have Edit on this page

    Scenario: Only site admins assign other people
      Given I am not a site admin
      When I try to add "aisha.khan" as an author
      Then I see "Only a site admin can assign other people"

  Rule: US-03.06.3 · Link a page to its Jira ticket
    As a content author
    I want to link the page to its Jira ticket and open it in one click
    So that the work is traceable to the request behind it

    Scenario Outline: Linking a ticket
      When I enter "<input>" into "Jira ticket" in Page settings and save
      Then <outcome>

      Examples:
        | input                                         | outcome                                                        |
        | ucp-482                                       | the chip "UCP-482 ↗" links to https://hsbc.atlassian.net/browse/UCP-482 |
        | https://jira.example.com/browse/MKT-7         | the chip "MKT-7 ↗" links to that address                       |
        | not a link                                    | I see "Paste a Jira link (https://…) or a ticket key like UCP-123" |

    Scenario: Opening the ticket
      When I click the Jira chip next to the page title or in My tasks
      Then the ticket opens in a new tab

  Rule: US-03.06.4 · Go back to any earlier version
    As a content author
    I want every save kept as a version that I can restore or comment on
    So that any change can be reversed and discussed

    Scenario: Restoring a version
      When I open Version history and click "Restore" on an earlier version
      And I confirm "Unsaved edits in the builder are replaced. A copy of the current page is kept as a new version."
      Then the page goes back to that version
      And the version before the restore is kept

    Scenario: Commenting on a version
      When I click "Comment" on a version
      Then the comment says "About the version from …"
