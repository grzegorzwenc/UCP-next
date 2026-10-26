@epic:publishing @status:done
Feature: Publishing
  Going live safely: publish now or on schedule together with the files a page uses, and compare drafts with what customers see.

  # Business benefit: Approved pages reach customers in one controlled step instead of a chain of manual releases. Publishing the files with the page removes broken pictures and missing documents that damage customer trust.
  @depends:US-04.09 @depends:US-06.07
  Rule: US-05.01 · Publish a signed-off page now, together with its files
    As a publisher
    I want to put a page that passed both reviews live in one step, together with the pictures and documents it uses
    So that customers never see a page with missing pictures or documents

    Background:
      Given I am signed in as "jordan.mensah" with Publish on the folder

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

    Scenario: The dialog lists the files on the page (step 1, "Images and files")
      Given "Cash ISA" uses the picture "hero-isa.jpg" and the PDF "isa-terms.pdf" that are not published
      When I open the Publish dialog
      Then step "Images and files" lists both files with their status
      And both are ticked to be published with the page

    Scenario: Leaving a draft file behind blocks the page
      When I untick "isa-terms.pdf"
      Then I see "isa-terms.pdf stays unpublished, so the page cannot go live yet"
      And the server refuses the page with "Uses 1 file that is not published yet"

    Scenario: Publish now (step 2, "Choose when to publish")
      When I choose "Publish now" and confirm
      Then the page status is "Published"
      And a live copy of the page is kept for comparisons
      And confetti and "Published! Cash ISA is live" fill the screen

  # Business benefit: Campaigns and rate changes go live at the agreed minute without anyone working out of hours. Fewer manual late-night releases also means fewer publishing mistakes and lower overtime cost.
  @depends:US-05.01
  Rule: US-05.02 · Publish later at a chosen time
    As a publisher
    I want to schedule a signed-off page to go live at a chosen time, and cancel that schedule if plans change
    So that content goes live exactly when the campaign or rate change starts, without anyone being online

    Background:
      Given I am signed in as "jordan.mensah" with Publish on the folder

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

  # Business benefit: Related pages of a launch go live together, so customers never see half of a product release. Per-page results cut the time spent finding out what was held back and why.
  @depends:US-05.01
  Rule: US-05.03 · Publish several pages in one go
    As a publisher
    I want to publish a selection of pages at once and see the result for each
    So that a release of related pages goes live together and I know which ones were held back and why

    Background:
      Given I am signed in as "jordan.mensah" with Publish on the folder

    Scenario: Bulk publish from the page list
      Given I selected 3 pages in Pages and 1 of them is still in review
      When I click "Publish" in the selection bar and publish now
      Then the 2 ready pages go live
      And "Publishing results" shows a tick for each and the reason for the third

  # Business benefit: Keeping publishing with authorised publishers enforces separation of duties that auditors and regulators expect. Clear hand-over status reduces chasing between teams and shortens time to market.
  @depends:US-05.01
  Rule: US-05.04 · Hand a signed-off page over to the publisher
    As a content author
    I want to see that my signed-off page is waiting for a publisher instead of publishing it myself
    So that only people with Publish put content live, and I know who acts next until I am told the page is live

    Background:
      Given I am signed in as "jordan.mensah" with Publish on the folder

    Scenario: No Publish permission
      Given I am signed in as "content.author"
      Then a page at "Ready to publish" shows "Waiting for a publisher"

  # Business benefit: Publishers catch unintended changes before customers see them, lowering the risk of wrong rates or terms going live. A clear list of differences makes sign-off faster and easier to evidence.
  @depends:US-05.01 @depends:US-03.20
  Rule: US-05.05 · See what will change before publishing
    As a publisher
    I want to see the authoring version next to the live page, with every difference listed
    So that I know exactly what will change for customers when I publish

    Background:
      Given the page "Cash ISA" was published before and has been edited since

    Scenario: Compare is offered only for one page that has been live
      When I select "Cash ISA" alone in Pages
      Then the "Compare" button is enabled
      But it is disabled with "Not published yet · nothing to compare" for a page that was never live
      And it asks to "Pick one page to compare" when several pages are selected

    Scenario: Side by side with the differences
      When I click "Compare"
      Then I see the authoring version on the left and the live page on the right
      And both sides scroll together
      And the sidebar lists each component as "Added", "Removed", "Changed" or "Moved"
      And a changed page title is listed too

    Scenario: Jump to a difference
      When I click a difference in the sidebar
      Then it flashes on both sides

  # Business benefit: The bank can quickly establish when a change was made and what customers were shown at the time. This supports complaint handling and regulatory enquiries without costly investigation.
  @depends:US-05.05
  Rule: US-05.06 · Check an older version against live
    As a content author
    I want to compare any saved version of my page with the live page
    So that I can find when a change was made and what customers still see

    Background:
      Given the page "Cash ISA" was published before and has been edited since

    Scenario: Pick an older authoring version
      When I choose a saved version from the authoring dropdown
      Then the left side shows that version and the differences are recalculated
