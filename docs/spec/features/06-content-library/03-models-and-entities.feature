@epic:content-library @status:done
Feature: Content models and content entities
  As a site admin and as a content author
  We want structured content types and reusable content items
  So that facts like rates and product names are written once and shown everywhere

  Rule: Only site admins change content models

    Scenario: Read-only for others
      Given I am not a site admin
      Then content models show "Read-only · documentation view"

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

  Rule: Entities are content items made from a published model

    Scenario: Creating an entity
      Given I have Edit on the market
      When I create an entity of the published model "Rate" called "ISA rates 2026"
      Then a form built from the model's fields opens

    Scenario: Draft models cannot be used
      Then a model that is still a draft is disabled with "Publish the model first"

    Scenario: Validation
      When I save with 2 invalid fields
      Then I see "Fix 2 fields before saving"

    Scenario: Publishing an entity updates the pages that use it
      When I publish "ISA rates 2026"
      Then the audit log says it updates the pages that show it
      And the delivery API shows the new values on those pages

    Scenario: Entities in use cannot be deleted
      Given "ISA rates 2026" is used on 3 pages
      When I delete it
      Then I see "Used on 3 pages · Remove it from those pages first"
