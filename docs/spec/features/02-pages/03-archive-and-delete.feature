@epic:pages @status:done
Feature: Archive and delete pages
  As a content author
  I want to archive pages I no longer need and delete only what is truly gone
  So that nothing is lost by mistake and broken links are visible before they happen

  Background:
    Given I am signed in with Edit on the folder

  Rule: Archive is the safe default; delete cannot be undone

    Scenario: Delete always offers Archive first
      When I choose "Delete" for "Old offer"
      Then I am asked "Archive “Old offer” instead of deleting?"
      And "Archive" is the main button and "No, delete permanently…" the alternative

    Scenario: Archiving a page
      When I archive "Old offer"
      Then it leaves the page list, My tasks and search
      And if it was live it goes offline
      And it appears in "Archive · 1" at the bottom of the folder with who archived it and when

    Scenario: Restoring from the archive
      When I click "Restore" on "Old offer" in the archive
      Then it is back in the list as a draft

  Rule: Before deleting I see everything that is affected

    Scenario: References are checked
      Given 3 pages link to "Old offer"
      And it shows the entity "ISA rates 2026" that is also on 2 other pages
      And it uses the file "offer.pdf" that no other page uses
      When I choose "No, delete permanently…"
      Then I see "3 pages link here" with the list of pages
      And "Linked content" says the entity is not deleted and is also on 2 other pages
      And "Files used only here" lets me tick "offer.pdf" to delete it too

    Scenario: Deleting a folder deletes the pages inside
      When I delete the folder "Campaigns 2025" with 4 pages, 1 of them live
      Then I see "Everything inside is deleted too: 4 pages" and "1 live page goes offline"
      And I must type "delete" to confirm

    Scenario: Locked pages cannot be archived by others
      Given another person locked "Old offer"
      When I archive it
      Then I see that it is locked by them
