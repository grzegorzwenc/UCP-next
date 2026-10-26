@epic:delivery-api @status:done
Feature: Content delivery API
  Published content as JSON for HSBC websites and apps, so any channel can show the same approved content.

  # Business benefit: Only approved content can reach customers through any channel, reducing the risk of leaking unreleased offers. Separate previews let teams test upcoming pages without affecting live sites.
  @depends:US-05.01.1
  Rule: US-09.01.1 · Get only approved content, and preview drafts separately
    As a front-end developer
    I want the public API to return only published pages, with a separate preview address for drafts
    So that customers only ever see approved content while I can still test upcoming pages

    Scenario: List of published pages
      When I call "GET /api/delivery/v1/pages?market=uk"
      Then I get only published pages with route, title, template, updatedAt and a link

    Scenario: A draft page is not public
      When I call "GET /api/delivery/v1/pages/banking/new-offer" for a page that is not published
      Then I get 404 "Not published" pointing to the preview address

    Scenario: Preview includes drafts
      When I call "GET /api/delivery/v1/preview/pages/banking/new-offer"
      Then I get the page JSON

  # Business benefit: All websites and apps show the same approved content from one source, cutting duplicate work across channels. Ready-to-use JSON and schemas shorten integration time and reduce rendering errors.
  @depends:US-09.01.1 @depends:US-03.05.1 @depends:US-06.02.1
  Rule: US-09.01.2 · Render pages straight from the JSON
    As a front-end developer
    I want page JSON with resolved values, image renditions, form references and meta, plus a JSON Schema for each model
    So that any channel can render the content without extra lookups or guesswork

    Scenario: Page JSON
      Then tokens are replaced with published entity values
      And images come with original, hero and card rendition addresses
      And forms come as an embed reference with their version
      And meta has the canonical address of the page

    Scenario: Schemas
      When I call "GET /api/delivery/v1/models/rate"
      Then I get a JSON Schema with the required fields and localised fields marked

  # Business benefit: Developers integrate new channels faster without waiting for separate documentation. Self-service exploration lowers support effort and time to market.
  @depends:US-09.01.1 @depends:US-09.01.2
  Rule: US-09.01.3 · Explore and try the API in the CMS
    As a front-end developer
    I want a screen that shows each page's address and JSON, the model schemas and all endpoints, with "Copy URL" and "Try it"
    So that I can integrate quickly without reading separate documentation

    Scenario: API & delivery screen
      When I open "API & delivery"
      Then I can pick a page and see its public or preview address, its JSON, "Copy URL" and "Try it"
      And see the JSON Schema of each model and a table of all endpoints
