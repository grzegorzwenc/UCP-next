@epic:page-builder @status:done
Feature: Linked content (entities and tokens)
  As a content author
  I want to show shared content such as rates or product names from one place
  So that a change to the content appears on every page that uses it

  Background:
    Given the entity "ISA rates 2026" of the model "Rate" exists

  Scenario: Linking an entity to the page
    When I open "Entities" in the right rail and click "＋ Add entity"
    And I choose "ISA rates 2026"
    Then it is linked with the alias "rate"
    And I see "Added ISA rates 2026 · use {{rate.title}} in text"

  Scenario: Choosing content for a field
    When I click the content icon next to the "Heading" field
    And I choose Folder, Entity "ISA rates 2026" and Field "aer"
    And I click "Use this content"
    Then the heading shows the value of "aer"
    And the field says "⤓ From ISA rates 2026 · aer"

  Scenario: Typing a token
    When I type "{{" while editing a text
    Then the content picker opens and the token is inserted at the caret

  Scenario: Stop inheriting
    When I click "Stop inheriting" under a field
    Then the token is replaced by its current text

  Scenario: Tokens for entities that are not linked
    Given the text contains "{{offer.title}}" but no entity "offer" is linked
    Then Entities shows it under "Not linked yet" with a "Link" picker
    And Page insights reports a broken token

  Scenario: An entity in use cannot be removed
    Given "{{rate.aer}}" is used 2 times in the text
    Then the entity shows "used 2× in the text" and has no remove button
