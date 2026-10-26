## Creating these stories in Jira

Use these settings for **every** story in this map:

| Jira field | Value |
|---|---|
| Issue type | **Story** |
| Story type | **Functional** |
| Sprint | **TBD** |
| Team | **WPB Digital Browser: Tools** |
| Summary | Story ID and name, e.g. `US-03.01.4 · Never lose my work` |
| Description | Three parts, in this order: **Business benefit** (the two sentences), **User story** (As a / I want / So that), **Acceptance criteria** (the scenarios) |
| Acceptance criteria | **Only** the acceptance criteria (the Given / When / Then scenarios of the story) |

**Description template**

```
Business benefit
<the two sentences from "# Business benefit:">

User story
As a <persona>
I want <capability>
So that <value>

Acceptance criteria
Scenario: …
  Given …
  When …
  Then …
```

**Acceptance criteria field template**

```
Scenario: …
  Given …
  When …
  Then …
```

Notes
- Copy the acceptance criteria exactly from the `.feature` file of the story (linked under each feature below); `Scenario Outline` tables go in as they are.
- Create the stories in the order of this map; record each `Depends on` as an issue link "is blocked by" to the story it names.
- Keep the story ID at the start of the Summary, so Jira tickets and the `.feature` files can always be matched.
