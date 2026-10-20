@epic:page-builder @status:done @mock
Feature: AI assistant
  As a content author
  I want AI to propose changes that I can check before they are applied
  So that I work faster without losing control over what is published

  Note: the prototype uses a deterministic offline planner (lib/ai/planner.ts, lib/ai/mock.ts).
  Free-form prompts and translation need the real AI service (UCP_AI_URL).

  Rule: Component AI changes only the selected component

    Scenario: Before and after
      Given the "Masthead" component is selected
      When I click "✨ AI" and choose "Make this more concise"
      Then I see the old and the new text of each changed field
      And I can "Apply" or "Discard"

    Scenario: Nothing to change
      Given the component has no button
      When I ask "Make the CTA more compelling"
      Then I see "This block has no button."

  Rule: Page AI plans first and changes nothing until I run the plan

    Scenario: Plan, run, review
      When I ask the page AI "Make this page work better on mobile"
      Then I see the stages Understanding, Plan, Executing, Review and Done
      And every planned change has a checkbox, all ticked
      When I untick one change and click "Run plan · 3 changes"
      Then the 3 changes are applied one by one
      And each change has Undo and Redo, and there is "Undo all"
      And I see "Applied 3 of 4 changes · Save the page to keep them"

    Scenario Outline: What the planner understands
      When I ask "<prompt>"
      Then the plan <does>

      Examples:
        | prompt                         | does                                                            |
        | Design a landing page          | lays out a full page, or adds sections to an existing page      |
        | Translate to Welsh             | translates the text fields with the glossary                    |
        | Make it accessible             | adds alt text, an h1 and descriptive buttons                    |
        | Improve SEO                    | writes a meta description of up to 155 characters and adds an FAQ |
        | Add a promo for the new card   | adds rich text and a banner after the masthead                  |
        | Polish it                      | shortens long text and fixes vague buttons                      |

    Scenario: The page already follows the patterns
      When I ask "Polish it" on a page with nothing to improve
      Then I see "Page already follows HSBC content patterns — nothing to change"

  Rule: Read-only users cannot run AI

    Scenario: Viewer
      Given I have only Read on the page
      When I ask the page AI anything
      Then nothing is planned and I am told the page is read-only
