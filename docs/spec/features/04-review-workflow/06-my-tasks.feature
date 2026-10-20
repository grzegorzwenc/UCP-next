@epic:review-workflow @status:done
Feature: My tasks
  As anyone in the content team
  I want one list of the pages that need me, grouped by stage
  So that I know what to do next without thinking

  Rule: Every page in the workflow becomes exactly one task

    Scenario Outline: Task per stage
      Given a page with status "<status>"
      Then My tasks shows it in "<tab>" with the text "<text>"

      Examples:
        | status    | tab                        | text                                              |
        | review    | Backlog                    | Waiting for author's review assignment · start it |
        | inreview  | In review                  | In author's review · finish and mark reviewed     |
        | reviewed  | Reviewed                   | Author's review done · send to business review    |
        | bizreview | Ready for business review  | Business review · sign off before publishing      |
        | approved  | Ready to publish           | Business review done · ready to publish           |
        | scheduled | Ready to publish           | Check scheduled publish                           |
        | failed    | Ready to publish           | Fix failed publish                                |

  Rule: The Backlog is a shared bucket

    Scenario: Authors don't see their own pages in the Backlog
      Given I am signed in as "content.author" who sent "Cash ISA" for review
      Then "Cash ISA" is not in my Backlog
      And it is under "Ready for review" with "Waiting for a reviewer to take it"

    Scenario: Reviewers take work from the Backlog
      Given I am signed in as a reviewer
      Then each Backlog row has "Assign to me" instead of "Open"

  Rule: Each row shows the three people and the dates

    Scenario: People and dates
      Then each row shows the Content author, the Peer reviewer and the Business reviewer with full name and e-mail
      And co-authors are listed under the Content author as "+ Name"
      And a Jira chip is shown next to the title when the page has a ticket
      And the due date shows "N days overdue", "Due today", "Due tomorrow" or the date

  Rule: People only see the actions they may take

    Scenario Outline: Row actions
      Given a task in "<tab>"
      And I am "<who>"
      Then I see "<actions>"

      Examples:
        | tab                       | who                          | actions                         |
        | Backlog                   | a reviewer                   | Assign to me                    |
        | Ready for review          | the assigned reviewer        | Back to backlog, Start review   |
        | In review                 | the author                   | Remind                          |
        | In review                 | the assigned reviewer        | Reviewed                        |
        | Ready for business review | a business owner             | Assign to me                    |
        | Business review           | the business reviewer        | Reauthor, Sign off              |
        | Ready to publish          | a publisher                  | Publish                         |
        | Ready to publish          | an author                    | Waiting for a publisher         |

  Rule: Admins see everything and can steer it

    Scenario: Admin view
      Given I am signed in as "super.admin"
      Then tasks are split into "Assigned to me" and "Assigned to others"
      And a pencil next to the Peer reviewer lets me change the person while the page is in review

    Scenario: No reassigning at Ready to publish
      Then rows in "Ready to publish" have no pencil and no "Assign to anyone"

  Rule: The list is easy to scan

    Scenario: Filters and markers
      Then I can search by page or person
      And I can tick "Only assigned to me"
      And I can sort by newest or by due date
      And new tasks have a red dot until I have seen them
      And the header says "N assigned to you · M new"
