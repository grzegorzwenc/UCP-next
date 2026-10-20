@epic:pages @status:done
Feature: Organise pages (rename, move, copy, duplicate, lock, restore)
  As a content author
  I want to reorganise pages safely and always know what an action will change
  So that I never break links or overwrite someone else's work by accident

  Background:
    Given I am signed in with Edit on the "Banking" folder

  Rule: Every action that changes pages asks first and says what will happen

    Scenario Outline: Confirmation with impact
      When I choose "<action>" for "Cash ISA"
      Then a confirmation explains "<impact>"

      Examples:
        | action    | impact                                                                  |
        | Move      | the address changes and old bookmarks of live pages break               |
        | Copy      | copies are created as drafts with the same components                   |
        | Duplicate | a copy called "Cash ISA (copy)" appears in the same folder as a draft   |
        | Lock      | only you and site admins can change, move or delete it                  |
        | Restore   | each page goes back to its last saved version; the current one is kept  |

  Rule: Moving keeps links working

    Scenario: Pages that link here are updated
      Given 2 pages link to "Cash ISA"
      When I move "Cash ISA" to "Savings"
      Then the confirmation lists the 2 pages
      And "Update their links to the new address" is ticked
      And after moving, their links point to the new address

    Scenario: A folder cannot move into itself
      When I move "Banking" into "Banking/Savings"
      Then that destination is not offered

    Scenario: Moving to the same folder
      When I move pages to the folder they are already in
      Then I see "They are already in that folder"

  Rule: Copies never overwrite

    Scenario: Copying into the same folder
      When I copy "Cash ISA" into its own folder
      Then the copy is called "cash-isa-copy" and titled "Cash ISA (copy)"

    Scenario: Folders are not copied
      When I copy a selection that contains a folder
      Then I see "Folders are not copied · pick pages"

  Rule: A locked page can only be changed by the person who locked it or a site admin

    Scenario: Someone else tries to edit a locked page
      Given "rachel.hughes" locked "Cash ISA"
      When I edit, move or delete it
      Then I see "Locked by Rachel Hughes" and "Ask them or a site admin to unlock it in Pages"
      But reviews and publishing of the page still go on

    Scenario: Unlocking someone else's lock
      When I try to unlock "Cash ISA" locked by "rachel.hughes"
      Then I see "Cash ISA is locked by Rachel Hughes"

  Rule: The selection bar shows only what I can do

    Scenario: Selection bar
      When I tick several pages
      Then the bar offers Translate, Publish, Lock, Copy, Restore, Compare, Move, Archive and Delete with icons
      And without Edit on every selected item only Translate and Publish are offered
