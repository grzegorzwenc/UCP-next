@epic:governance @status:done
Feature: Audit log and dashboard
  As a site admin, and as every member of the team
  I want a record of every change and a summary of where work stands
  So that the bank can prove who did what and the team sees what needs attention

  Rule: Every change is recorded with who, what, when and a request id

    Scenario: Audit entries
      When anyone saves, sends for review, reviews, signs off, publishes, archives, deletes or changes permissions
      Then the audit log gets a line with the person, the action, the page and a request id

    Scenario: Admins see everyone, others see themselves
      Given I am not a site admin
      When I open the audit log
      Then it is titled "My activity" and shows only my actions

    Scenario: Finding events
      Then I can filter by Content, Publishing, Permissions or System
      And search by person, page, action or request id
      And choose All time, Today or Last 2 days
      And export the result to CSV

  Rule: The dashboard says what needs attention

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
