@epic:page-builder @status:done
Feature: Build a page from components
  Authors build on-brand pages from HSBC components and edit their text in place, without knowing code.

  Background:
    Given I am signed in with Edit on the page "Cash ISA"
    And the page is at "Build the page"

  Rule: US-03.01.1 · Add on-brand components from the library
    As a content author
    I want to find components in the library and add them where I need them
    So that every page is built only from approved HSBC components

    Scenario: Adding a component
      Given the "Key facts" component is selected
      When I click "Add" on "Rates table" in the component library
      Then the rates table is added below "Key facts"
      And I see "Rates table added · click ✎ Edit to fill it in"

    Scenario: Finding a component
      When I type "faq" into "Find a component…"
      Then only "FAQ" is listed

    Scenario: An empty page offers starter layouts
      Given the page has no components
      Then I see "How do you want to start this page?" with 3 layouts

  Rule: US-03.01.2 · Edit text where it is shown
    As a content author
    I want to type and format text directly on the page
    So that I see the result as customers will while I write

    Scenario: Editing a heading in place
      When I click the masthead heading
      Then I can type straight away with the caret where I clicked
      When I press Enter
      Then the heading is saved

    Scenario: Long text needs ⌘ Enter
      When I edit a paragraph and press ⌘ Enter
      Then the paragraph is saved

    Scenario: Changing a button
      When I click a button that has a link
      Then a "Button" box lets me change the label and the URL

    Scenario: Formatting
      When I edit a paragraph
      Then I can make text bold, italic, underlined, a link, a bullet list or a numbered list
      And links must start with https, mailto, tel, / or #

  Rule: US-03.01.3 · Arrange and configure every component the same way
    As a content author
    I want the same toolbar on every component and a Configure panel with all its properties
    So that I can move, protect and fine-tune any component without learning each one

    Scenario: Component toolbar
      When I select a component
      Then I see "✎ Edit", "Pattern", "✨ AI", move up, move down, delete and "⋯ More"
      And "⋯ More" offers Duplicate, Copy, Paste after, Hide, Lock, Version history and Delete

    Scenario: Locked component
      Given the "Disclaimer" component is locked
      When I click its text
      Then I see "This block is locked. Unlock it from ⋯ More."

    Scenario: Configure panel
      When I click a component
      Then Configure opens with Content, Layout, Behaviour and Metadata
      And required fields are marked "required"
      And Cancel puts back the values from when Configure opened

  Rule: US-03.01.4 · Never lose my work
    As a content author
    I want the page to save itself, to save on demand and to tell me when saving fails
    So that no edit is ever lost

    Scenario: Autosave
      When I stop typing for about a second
      Then the page saves itself and shows "✓ Saved"

    Scenario: Save button and shortcut
      Then a "Save" button sits next to "Preview" while there are unsaved changes
      And ⌘ S saves at once

    Scenario: Save failed
      Given the server cannot be reached
      Then I see "Not saved · Retry"

  Rule: US-03.01.5 · Check the page on every device width
    As a content author
    I want to preview the page at desktop, tablet and mobile width and full screen
    So that it works for every customer before I send it for review

    Scenario Outline: Device preview
      When I choose "<device>"
      Then the page is drawn at <width> px and the label says "1:1 · <width> px"

      Examples:
        | device  | width |
        | desktop | 1200  |
        | tablet  | 768   |
        | mobile  | 390   |

    Scenario: Full-screen preview
      When I click "Preview" or press ⌘ ⇧ F
      Then the page fills the screen and Esc goes back to editing
