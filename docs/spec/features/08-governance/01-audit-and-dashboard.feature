@epic:governance @status:done
Feature: Audit log and dashboard
  A record of every change and a summary of where work stands, so the bank can prove who did what and the team sees what needs attention.

  # Business benefit: The bank can answer auditors and regulators with complete evidence of who changed what and when. Fast search and CSV export cut the cost of compliance reviews.
  @admin @depends:US-01.03.1
  Rule: US-08.01.1 · Search and export a full audit trail
    As a site admin
    I want every change recorded with who, what, when and a request id, and to search and export everyone's events
    So that the bank can prove who did what to auditors and regulators

    Scenario: Audit entries
      When anyone saves, sends for review, reviews, signs off, publishes, archives, deletes or changes permissions
      Then the audit log gets a line with the person, the action, the page and a request id

    Scenario: Finding events
      Then I can filter by Content, Publishing, Permissions or System
      And search by person, page, action or request id
      And choose All time, Today or Last 2 days
      And export the result to CSV

  # Business benefit: Staff can check their own work without seeing colleagues' activity, respecting need-to-know access. Fewer support requests to admins lowers operating cost.
  @depends:US-08.01.1
  Rule: US-08.01.2 · See my own activity
    As a content author
    I want to see a log of my own actions only
    So that I can check what I did without seeing other people's activity

    Scenario: Admins see everyone, others see themselves
      Given I am not a site admin
      When I open the audit log
      Then it is titled "My activity" and shows only my actions

  # Business benefit: Waiting reviews and failed publishes are spotted early, so content reaches customers on time. Managers get a quick view of throughput without manual reporting.
  @depends:US-08.01.1 @depends:US-04.06.1
  Rule: US-08.01.3 · See what needs attention
    As a content author
    I want a dashboard that summarises waiting reviews, how much of the site is live, failed publishes, my tasks and recent activity
    So that I see at a glance where work stands and what to do next

    Scenario: Dashboard tiles
      When I open the dashboard
      Then I see how many pages wait for review and how old the oldest is
      And the share of the site that is live
      And failed publishes as "N failed · A publish failed and needs action"
      And my top 5 tasks with overdue ones in red
      And the latest 5 activity lines

    Scenario: Nothing waiting
      Given no page waits for review
      Then the tile says "Nothing waiting. Nice."
