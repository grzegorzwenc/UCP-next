@epic:pages @status:done
Feature: Organise pages (rename, move, copy, duplicate, lock, restore)
  Pages can be reorganised safely: every action says what it will change, links keep working and nobody's work is overwritten by accident.

  Background:
    Given I am signed in with Edit on the "Banking" folder

  Rule: US-02.02.1 · Know what an action will change before it happens
    As a content author
    I want to see only the actions I may take and a confirmation that explains their impact
    So that I never change pages by accident

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

    Scenario: Selection bar
      When I tick several pages
      Then the bar offers Translate, Publish, Lock, Copy, Restore, Compare, Move, Archive and Delete with icons
      And without Edit on every selected item only Translate and Publish are offered

  Rule: US-02.02.2 · Move and copy pages without breaking or overwriting anything
    As a content author
    I want moves to update the links that point to a page and copies never to replace an existing page
    So that reorganising the site never breaks links or someone else's work

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

    Scenario: Copying into the same folder
      When I copy "Cash ISA" into its own folder
      Then the copy is called "cash-isa-copy" and titled "Cash ISA (copy)"

    Scenario: Folders are not copied
      When I copy a selection that contains a folder
      Then I see "Folders are not copied · pick pages"

  Rule: US-02.02.3 · Lock a page while I work on it
    As a content author
    I want a page I locked to be changeable only by me or a site admin
    So that nobody edits, moves or deletes it while it is mine

    Scenario: Someone else tries to edit a locked page
      Given "rachel.hughes" locked "Cash ISA"
      When I edit, move or delete it
      Then I see "Locked by Rachel Hughes" and "Ask them or a site admin to unlock it in Pages"
      But reviews and publishing of the page still go on

    Scenario: Unlocking someone else's lock
      When I try to unlock "Cash ISA" locked by "rachel.hughes"
      Then I see "Cash ISA is locked by Rachel Hughes"

  @admin
  Rule: US-02.02.4 · Override someone else's lock
    As a site admin
    I want to change or unlock a page that someone else locked
    So that work is not blocked when the person who locked it is unavailable

    Scenario: A site admin unlocks someone else's lock
      Given "rachel.hughes" locked "Cash ISA"
      And I am a site admin
      When I unlock "Cash ISA" in Pages
      Then the page is unlocked and can be changed, moved or deleted again
