@epic:content-library @status:done
Feature: Content models and content entities
  Structured content types (models) and reusable content items (entities), so facts like rates and product names are written once and shown everywhere.

  @admin
  Rule: US-06.03.1 · Define and evolve content models
    As a site admin
    I want to create content models with validated fields, publish them, and change them safely over time
    So that authors get well-structured content types and live content is not broken by a careless change

    Scenario: Creating a model
      Given I am a site admin
      When I create the model "Savings product" in 3 steps: information, fields and review
      Then its id is "savings-product"
      And I can "Save as draft" or "Save & publish"

    Scenario Outline: Field validation
      When I add a field with <problem>
      Then I see an error

      Examples:
        | problem                                  |
        | a key that is not camelCase              |
        | a key that already exists                |
        | a minimum length above the maximum       |
        | an invalid regular expression            |
        | a select field without options           |

    Scenario: Breaking changes need confirmation
      Given the model is published
      When I remove a field, change a type or make a field required and publish
      Then I must tick "I understand the impact"

    Scenario: Versions
      Then every change is kept as a version I can compare and restore into the draft

  Rule: US-06.03.2 · Create reusable content items from a model
    As a content author
    I want to fill in entities from published models, see the model as documentation, and be stopped from deleting entities in use
    So that facts like rates are written once, correctly, and no page loses its content

    Scenario: Read-only for others
      Given I am not a site admin
      Then content models show "Read-only · documentation view"

    Scenario: Creating an entity
      Given I have Edit on the market
      When I create an entity of the published model "Rate" called "ISA rates 2026"
      Then a form built from the model's fields opens

    Scenario: Draft models cannot be used
      Then a model that is still a draft is disabled with "Publish the model first"

    Scenario: Validation
      When I save with 2 invalid fields
      Then I see "Fix 2 fields before saving"

    Scenario: Entities in use cannot be deleted
      Given "ISA rates 2026" is used on 3 pages
      When I delete it
      Then I see "Used on 3 pages · Remove it from those pages first"

  Rule: US-06.03.3 · Update a fact everywhere at once
    As a content author
    I want publishing an entity to update every page that shows it
    So that a changed rate is correct on all pages and channels at the same moment

    Scenario: Publishing an entity updates the pages that use it
      When I publish "ISA rates 2026"
      Then the audit log says it updates the pages that show it
      And the delivery API shows the new values on those pages
