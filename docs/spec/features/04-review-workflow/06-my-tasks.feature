@epic:review-workflow @status:done
Feature: My tasks
  One list of the pages that need me, grouped by stage, with only the actions I may take.

  # Business benefit: One prioritised work list reduces time lost looking for pending work across tools. Due dates and overdue markers make bottlenecks visible to the team and management.
  @depends:US-04.01.1
  Rule: US-04.06.1 · See what needs me, by stage
    As anyone in the content team
    I want every page in the workflow as one task in the right tab
    So that I know what to do next without thinking

    Scenario Outline: Task per stage
      Given a page with status "<status>"
      Then My tasks shows it in "<tab>" with the text "<text>"

      Examples:
        | status    | tab                       | text                                              |
        | review    | Backlog                   | Waiting for author's review assignment · start it |
        | inreview  | In review                 | In author's review · finish and mark reviewed     |
        | reviewed  | Reviewed                  | Author's review done · send to business review    |
        | bizreview | Ready for business review | Business review · sign off before publishing      |
        | approved  | Ready to publish          | Business review done · ready to publish           |
        | scheduled | Ready to publish          | Check scheduled publish                           |
        | failed    | Ready to publish          | Fix failed publish                                |

    Scenario: People and dates on every row
      Then each row shows the Content author, the Peer reviewer and the Business reviewer with full name and e-mail
      And co-authors are listed under the Content author as "+ Name"
      And a Jira chip is shown next to the title when the page has a ticket
      And the due date shows "N days overdue", "Due today", "Due tomorrow" or the date

    Scenario: Filters and markers
      Then I can search by page or person
      And I can tick "Only assigned to me"
      And I can sort by newest or by due date
      And new tasks have a red dot until I have seen them
      And the header says "N assigned to you · M new"

  # Business benefit: Authors can track their pages without asking around, which reduces status meetings. Hiding review actions on their own work enforces four-eyes separation in the interface.
  @depends:US-04.06.1
  Rule: US-04.06.2 · Follow my own pages as an author
    As a content author
    I want to see where each of my pages is and who has it, without review buttons for my own work
    So that I know whom to remind and when the page comes back to me

    Scenario: My page waits for a reviewer
      Given I sent "Cash ISA" for review
      Then "Cash ISA" is not in my Backlog
      And it is under "Ready for review" with "Waiting for a reviewer to take it"

    Scenario Outline: My actions on my own page
      Given my page is in "<tab>"
      Then I see "<actions>"

      Examples:
        | tab              | actions                 |
        | In review        | Remind                  |
        | Ready to publish | Waiting for a publisher |
        | Published        | Open                    |

  # Business benefit: Taking and finishing work from one list shortens cycle time for every hand-off. Showing only the permitted action reduces errors and unauthorised steps.
  @depends:US-04.06.1
  Rule: US-04.06.3 · Pick up and finish work as a reviewer or publisher
    As a peer reviewer, business owner or publisher
    I want the action for my step right on the row
    So that I can take and finish work from one list

    Scenario: The Backlog is a shared bucket
      Given I am signed in as a reviewer
      Then each Backlog row has "Assign to me" instead of "Open"

    Scenario Outline: Row actions
      Given a task in "<tab>"
      And I am "<who>"
      Then I see "<actions>"

      Examples:
        | tab                       | who                   | actions                       |
        | Backlog                   | a reviewer            | Assign to me                  |
        | Ready for review          | the assigned reviewer | Back to backlog, Start review |
        | In review                 | the assigned reviewer | Reviewed                      |
        | Ready for business review | a business owner      | Assign to me                  |
        | Business review           | the business reviewer | Reauthor, Sign off            |
        | Ready to publish          | a publisher           | Publish                       |

  # Business benefit: Admins can balance workload across reviewers, which protects delivery dates. Restricting reassignment once a page is ready to publish keeps late changes under control.
  @admin @depends:US-04.06.1 @depends:US-04.06.3
  Rule: US-04.06.4 · Oversee everything as a site admin
    As a site admin
    I want to see all tasks, split by who has them, and change the peer reviewer
    So that I can balance work and unblock pages

    Scenario: Admin view
      Given I am signed in as "super.admin"
      Then tasks are split into "Assigned to me" and "Assigned to others"
      And a pencil next to the Peer reviewer lets me change the person while the page is in review

    Scenario: No reassigning at Ready to publish
      Then rows in "Ready to publish" have no pencil and no "Assign to anyone"
