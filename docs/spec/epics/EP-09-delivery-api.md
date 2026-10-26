# EP-09 · Delivery API

**Epic:** EP-09 · Delivery API

**Business benefit:** Every website and app reads the same approved content from one API, so the bank stops duplicating content per channel. Clear contracts and schemas let development teams integrate quickly and with fewer defects.

**Scope:** Approved content as JSON for every HSBC website and app.

**Stories (3):**

1. [US-09.01 · Get only approved content, and preview drafts separately](#us-0901--get-only-approved-content-and-preview-drafts-separately)
2. [US-09.02 · Render pages straight from the JSON](#us-0902--render-pages-straight-from-the-json)
3. [US-09.03 · Explore and try the API in the CMS](#us-0903--explore-and-try-the-api-in-the-cms)

---

## US-09.01 · Get only approved content, and preview drafts separately

**Business benefit:** Only approved content can reach customers through any channel, reducing the risk of leaking unreleased offers. Separate previews let teams test upcoming pages without affecting live sites.

**User story:**

As a front-end developer  
I want the public API to return only published pages, with a separate preview address for drafts  
So that customers only ever see approved content while I can still test upcoming pages  

**Persona:** front-end developer · **Depends on:** US-05.01

**Acceptance criteria:**

**Scenario 1 · List of published pages**

```gherkin
When I call "GET /api/delivery/v1/pages?market=uk"
Then I get only published pages with route, title, template, updatedAt and a link
```

**Scenario 2 · A draft page is not public**

```gherkin
When I call "GET /api/delivery/v1/pages/banking/new-offer" for a page that is not published
Then I get 404 "Not published" pointing to the preview address
```

**Scenario 3 · Preview includes drafts**

```gherkin
When I call "GET /api/delivery/v1/preview/pages/banking/new-offer"
Then I get the page JSON
```


---

## US-09.02 · Render pages straight from the JSON

**Business benefit:** All websites and apps show the same approved content from one source, cutting duplicate work across channels. Ready-to-use JSON and schemas shorten integration time and reduce rendering errors.

**User story:**

As a front-end developer  
I want page JSON with resolved values, image renditions, form references and meta, plus a JSON Schema for each model  
So that any channel can render the content without extra lookups or guesswork  

**Persona:** front-end developer · **Depends on:** US-09.01, US-03.15, US-06.04

**Acceptance criteria:**

**Scenario 1 · Page JSON**

```gherkin
Then tokens are replaced with published entity values
And images come with original, hero and card rendition addresses
And forms come as an embed reference with their version
And meta has the canonical address of the page
```

**Scenario 2 · Schemas**

```gherkin
When I call "GET /api/delivery/v1/models/rate"
Then I get a JSON Schema with the required fields and localised fields marked
```


---

## US-09.03 · Explore and try the API in the CMS

**Business benefit:** Developers integrate new channels faster without waiting for separate documentation. Self-service exploration lowers support effort and time to market.

**User story:**

As a front-end developer  
I want a screen that shows each page's address and JSON, the model schemas and all endpoints, with "Copy URL" and "Try it"  
So that I can integrate quickly without reading separate documentation  

**Persona:** front-end developer · **Depends on:** US-09.01, US-09.02

**Acceptance criteria:**

**Scenario 1 · API & delivery screen**

```gherkin
When I open "API & delivery"
Then I can pick a page and see its public or preview address, its JSON, "Copy URL" and "Try it"
And see the JSON Schema of each model and a table of all endpoints
```
