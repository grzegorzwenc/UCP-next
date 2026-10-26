@epic:review-workflow @status:done
Feature: Notifications
  The bell tells people when a page is handed to them or comes back to them.

  # Business benefit: People learn immediately when it is their turn, which removes idle time between hand-offs. Faster hand-offs shorten time to market for every page.
  @depends:US-04.06.1
  Rule: US-04.07.1 · Be told when a page is handed to me
    As anyone in the content team
    I want a notification when it is my turn on a page
    So that I don't have to keep checking My tasks

    Scenario: The bell polls and shows unread items
      Given I am signed in
      Then the bell checks for news every 60 seconds
      And shows a badge with the number of unread items
      And "Mark all as read" clears the badge

    Scenario Outline: What I am told
      Given <event>
      Then my bell shows "<message>"

      Examples:
        | event                                    | message                                                                |
        | the author reminds me about a review     | Reminder: Content Author is waiting for your review of Cash ISA       |
        | I was assigned a review                  | Super Admin assigned you to review Cash ISA                           |
        | the author's review of my page is done   | finished the author's review of Cash ISA · send it to business review |
        | the page reached business review         | sent to business review: Cash ISA · business sign-off needed          |
        | the business signed off a page I publish | finished the business review of Cash ISA · ready to publish           |
        | my draft has not been sent               | Your draft of Cash ISA is waiting to be sent for review               |

  # Business benefit: Overdue items stand out, so service levels and regulatory deadlines are met more reliably. One-click access cuts the time from notice to action.
  @depends:US-04.07.1
  Rule: US-04.07.2 · Act on a notification in one click
    As anyone in the content team
    I want urgent items to stand out and to open the page from the notification
    So that overdue work is handled first

    Scenario: Overdue work stands out
      Given a review assigned to me is overdue
      Then its notification is marked critical

    Scenario: Clicking a notification opens the page
      When I click a notification about "Cash ISA"
      Then the page opens in the page builder
