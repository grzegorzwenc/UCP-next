@epic:publishing @status:done
Feature: Publish and schedule pages
  As a publisher
  I want to put signed-off pages live now or at a chosen time, together with the files they use
  So that customers never see a page with missing pictures or documents

  Background:
    Given I am signed in as "jordan.mensah" with Publish on the folder

  Rule: Only pages that passed both reviews can go live

    Scenario Outline: Pages that are not ready are skipped with a reason
      Given the page "Cash ISA" has status "<status>"
      When I open the Publish dialog for it
      Then it is listed as skipped with "<reason>"

      Examples:
        | status    | reason                     |
        | review    | Still in author's review   |
        | reviewed  | Business review comes next |
        | bizreview | Still in business review   |
        | draft     | Needs review first         |
        | published | Already live               |

    Scenario: No Publish permission
      Given I am signed in as "content.author"
      Then a page at "Ready to publish" shows "Waiting for a publisher"

  Rule: Files the page uses are published with it (step 1)

    Scenario: The dialog lists the files on the page
      Given "Cash ISA" uses the picture "hero-isa.jpg" and the PDF "isa-terms.pdf" that are not published
      When I open the Publish dialog
      Then step "Images and files" lists both files with their status
      And both are ticked to be published with the page

    Scenario: Leaving a draft file behind blocks the page
      When I untick "isa-terms.pdf"
      Then I see "isa-terms.pdf stays unpublished, so the page cannot go live yet"
      And the server refuses the page with "Uses 1 file that is not published yet"

  Rule: Publish now or at a chosen time (step 2, "Choose when to publish")

    Scenario: Publish now
      When I choose "Publish now" and confirm
      Then the page status is "Published"
      And a live copy of the page is kept for comparisons
      And confetti and "Published! Cash ISA is live" fill the screen

    Scenario: Schedule
      When I choose "Schedule" for tomorrow at 09:00
      Then the page status is "Scheduled"
      And the audit log says "scheduled Cash ISA for" that date

    Scenario: Too soon to schedule
      When I schedule the page for 2 minutes from now
      Then I see "Pick a time at least 5 minutes from now"

    Scenario: A scheduled page goes live on its own
      Given "Cash ISA" is scheduled for a time that has passed
      When anyone opens a CMS screen
      Then the page is published by "system"

    Scenario: Cancelling a schedule
      Given "Cash ISA" is scheduled
      When I click "Cancel schedule"
      Then the page is back at "Ready to publish"

  Rule: Several pages can be published in one go

    Scenario: Bulk publish from the page list
      Given I selected 3 pages in Pages and 1 of them is still in review
      When I click "Publish" in the selection bar and publish now
      Then the 2 ready pages go live
      And "Publishing results" shows a tick for each and the reason for the third
