# EP-07 · Translations

**Epic:** EP-07 · Translations

**Business benefit:** Language versions are produced in minutes instead of being rebuilt by hand, so local markets launch at the same time as the original. Every translation goes through the same review, so speed never bypasses compliance.

**Scope:** Language versions of pages, created in a few steps and approved through the same workflow.

**Stories (2):**

1. [US-07.01 · Create translated copies of pages in a few steps](#us-0701--create-translated-copies-of-pages-in-a-few-steps)
2. [US-07.02 · Review every language version before it goes live](#us-0702--review-every-language-version-before-it-goes-live)

---

## US-07.01 · Create translated copies of pages in a few steps

**Business benefit:** Pages reach every language of a market far faster than copying them by hand, shortening time to market. Wider language coverage improves access for customers and supports local language requirements.

**User story:**

As a content author  
I want to choose the languages, how the text is translated and where the copies go, then check and create them in one flow  
So that I can offer pages in every language of my market without copying them by hand  

**Persona:** content author · **Depends on:** US-02.01

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given I selected "Cash ISA" and "Fixed rate bonds" in the UK market
```

**Scenario 1 · Four steps**

```gherkin
When I click "Translate"
Then I go through "Languages", "How", "Where" and "Check"
```

**Scenario 2 · Languages**

```gherkin
Then the market's own languages are shown first, then other markets' languages
And I see "1 language × 2 pages = 2 translations" when I pick Welsh
And a language every selected page already has is disabled with "already translated"
```

**Scenario 3 · How**

```gherkin
Then I can choose "AI draft now" or "Send to the translation vendor"
```

**Scenario 4 · Where**

```gherkin
Then I can put each translation next to its source page as "cy-cash-isa"
And I can instead put all of them into one folder
```

**Scenario 5 · Check and create**

```gherkin
Given "cy-cash-isa" already exists
Then the check step marks it "already exists · skipped"
When I click "Create 1 translation"
Then the new page waits in the review Backlog
And it shows "Source: /banking/savings/fixed-rate-bonds" in the page list
```


---

## US-07.02 · Review every language version before it goes live

**Business benefit:** Translations get the same checks as originals, so no unverified wording about products or terms reaches customers. This keeps the bank compliant in every language it publishes.

**User story:**

As a business owner  
I want every translated page to go through the same author's review and business review as the original  
So that no unchecked translation reaches customers  

**Persona:** business owner · **Depends on:** US-07.01, US-04.01

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given I selected "Cash ISA" and "Fixed rate bonds" in the UK market
```

**Scenario 1 · Translations always go through the workflow**

```gherkin
Then every translated page is created at "Waiting for author's review assignment"
And it needs the author's review and the business review before it can be published
```
