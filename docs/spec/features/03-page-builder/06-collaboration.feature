@epic:page-builder @status:done
Feature: Working together on a page (authors, Jira, versions)
  As a content team
  We want to build a page together, link it to its ticket and go back to any earlier version
  So that work is shared, traceable and reversible

  Rule: Several authors can build a page at the first stage

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

    Scenario: Only site admins assign other people
      Given I am not a site admin
      When I try to add "aisha.khan" as an author
      Then I see "Only a site admin can assign other people"

    Scenario: Authors are fixed after the first stage
      Given the page was sent for review
      When anyone changes the authors
      Then they see "Authors can only change while the page is at Build the page"

    Scenario: Co-authors in My tasks
      Given the page has 2 authors
      Then My tasks shows the second one under the Content author as "+ Name"

  Rule: A page can link to its Jira ticket

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

  Rule: Every save is a version that can be restored

    Scenario: Restoring a version
      When I open Version history and click "Restore" on an earlier version
      And I confirm "Unsaved edits in the builder are replaced. A copy of the current page is kept as a new version."
      Then the page goes back to that version
      And the version before the restore is kept

    Scenario: Commenting on a version
      When I click "Comment" on a version
      Then the comment says "About the version from …"
