@epic:page-builder @status:done @mock
Feature: AI assistant
  AI proposes changes that the author checks before they are applied, so work goes faster without losing control over what is published.

  Note: the prototype uses a deterministic offline planner (lib/ai/planner.ts, lib/ai/mock.ts).
  Free-form prompts and translation need the real AI service (UCP_AI_URL).

  # Business benefit: AI speeds up copy improvements while the author keeps full control over every change. Showing before and after prevents unreviewed AI text from reaching customers.
  @depends:US-03.01.3
  Rule: US-03.04.1 · Improve one component with AI
    As a content author
    I want AI to suggest changes to the selected component only, shown before and after
    So that I can accept or reject each suggestion knowing exactly what changes

    Scenario: Before and after
      Given the "Masthead" component is selected
      When I click "✨ AI" and choose "Make this more concise"
      Then I see the old and the new text of each changed field
      And I can "Apply" or "Discard"

    Scenario: Nothing to change
      Given the component has no button
      When I ask "Make the CTA more compelling"
      Then I see "This block has no button."

  # Business benefit: Page-wide changes such as accessibility or SEO fixes take minutes instead of hours. Approval and undo for each change keep accountability with the author and limit the risk of AI errors.
  @depends:US-03.01.4
  Rule: US-03.04.2 · Let AI plan page-wide changes that I approve
    As a content author
    I want the page AI to show its plan first and change nothing until I run the changes I ticked
    So that I work faster on whole pages and can undo anything

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

  # Business benefit: AI cannot become a loophole around the bank's access controls, which protects content integrity. This gives risk and compliance teams confidence to approve AI use.
  @depends:US-03.04.2
  Rule: US-03.04.3 · Keep AI within page permissions
    As a business owner
    I want AI to refuse to plan changes for people who may only read a page
    So that AI never becomes a way around permissions

    Scenario: Viewer
      Given I have only Read on the page
      When I ask the page AI anything
      Then nothing is planned and I am told the page is read-only
