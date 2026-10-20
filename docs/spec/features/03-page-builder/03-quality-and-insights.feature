@epic:page-builder @status:done
Feature: Page insights and quality checklist
  As a content author
  I want the page checked for content, accessibility, compliance and search problems
  So that reviewers spend their time on substance, not on mistakes a machine can find

  Rule: Page insights group findings by how serious they are

    Scenario: Verdict
      Given the page has 2 critical findings
      Then Page insights says "2 things to fix before publishing"
      And the findings are listed under "Must fix", "Should fix" and "Checks passed"

    Scenario Outline: Checks
      Given <situation>
      Then Page insights reports "<finding>" as <level>

      Examples:
        | situation                                         | finding                       | level    |
        | a required field is empty                         | empty required field          | critical |
        | an image has no alt text and is not decorative    | image without alt text        | critical |
        | a token does not match a linked entity            | broken token                  | critical |
        | the page has rates but no disclaimer              | no disclaimer                 | critical |
        | a heading is longer than 60 characters            | long heading                  | warning  |
        | a button says "Click here"                        | vague call to action          | warning  |
        | the text says "guaranteed"                        | risky wording                 | warning  |
        | the meta description is missing                   | no description                | warning  |

    Scenario: One-click fixes
      Given a button says "Learn more"
      When I click the fix
      Then the button says "See the details" and I see "Fixed: …"

    Scenario: Show on page
      When I click "Show on page" on a finding
      Then the component is selected and scrolled into view

  Rule: The quality checklist follows the pointer in the author's preview

    Scenario: Whole page
      Given I am in full-screen Preview of my draft
      And I am not pointing at anything
      Then the floating "Quality checklist" shows title tag, meta description, canonical URL, page type, one masthead and required fields

    Scenario: One element
      When I point at a heading
      Then the checklist shows: has text, length within the limit, not the example text, no risky wording

    Scenario: Pinning
      When I click a heading
      Then the checklist stays on it until I click it again
