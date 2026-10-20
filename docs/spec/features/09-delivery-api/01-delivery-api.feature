@epic:delivery-api @status:done
Feature: Content delivery API
  As a front-end developer of an HSBC website or app
  I want published content as JSON
  So that any channel can show the same approved content

  Rule: Only published pages are public

    Scenario: List of published pages
      When I call "GET /api/delivery/v1/pages?market=uk"
      Then I get only published pages with route, title, template, updatedAt and a link

    Scenario: A draft page is not public
      When I call "GET /api/delivery/v1/pages/banking/new-offer" for a page that is not published
      Then I get 404 "Not published" pointing to the preview address

    Scenario: Preview includes drafts
      When I call "GET /api/delivery/v1/preview/pages/banking/new-offer"
      Then I get the page JSON

  Rule: The JSON is ready to render

    Scenario: Page JSON
      Then tokens are replaced with published entity values
      And images come with original, hero and card rendition addresses
      And forms come as an embed reference with their version
      And meta has the canonical address of the page

    Scenario: Schemas
      When I call "GET /api/delivery/v1/models/rate"
      Then I get a JSON Schema with the required fields and localised fields marked

  Rule: The API is easy to explore

    Scenario: API & delivery screen
      When I open "API & delivery"
      Then I can pick a page and see its public or preview address, its JSON, "Copy URL" and "Try it"
      And see the JSON Schema of each model and a table of all endpoints
