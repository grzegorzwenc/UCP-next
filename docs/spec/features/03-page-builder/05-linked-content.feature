@epic:page-builder @status:done
Feature: Linked content (entities and tokens)
  Shared content such as rates or product names lives in one place, so a change to it appears on every page that uses it.

  Background:
    Given the entity "ISA rates 2026" of the model "Rate" exists

  # Business benefit: Rates and product details are maintained once and update everywhere, cutting maintenance effort. It removes the risk of customers seeing outdated or conflicting figures on different pages.
  @depends:US-06.03.2
  Rule: US-03.05.1 · Show shared content from one place
    As a content author
    I want to link an entity to the page and use its fields in text and component fields
    So that a change to the content appears on every page that uses it

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

  # Business benefit: Broken or missing shared content is flagged before it reaches customers, protecting accuracy of regulated information. Authors can still detach content deliberately, with a clear trace.
  @depends:US-03.05.1
  Rule: US-03.05.2 · Keep page text and linked content consistent
    As a content author
    I want to detach a field on purpose and be warned about tokens and entities that do not match
    So that the page never shows broken or missing shared content

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
