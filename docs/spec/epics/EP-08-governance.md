# EP-08 · Governance

| | |
|---|---|
| **Epic** | EP-08 · Governance |
| **Business benefit** | Every change is recorded with who, what and when, giving the bank evidence for auditors and regulators on demand. A shared dashboard shows bottlenecks early, so managers act before deadlines are missed. |
| **Scope** | Proof and overview: the audit trail of every change and the dashboard of what needs attention. |
| **Stories** | 3 |
| **Jira** | Issue type Epic · Team WPB Digital Browser: Tools |

## Stories in this epic

| # | Story | Persona | Depends on |
|---|---|---|---|
| 1 | [US-08.01 · Search and export a full audit trail](#us-0801--search-and-export-a-full-audit-trail) 🛡 | site admin | US-01.07 |
| 2 | [US-08.02 · See my own activity](#us-0802--see-my-own-activity) | content author | US-08.01 |
| 3 | [US-08.03 · See what needs attention](#us-0803--see-what-needs-attention) | content author | US-08.01, US-04.16 |

🛡 site-admin story · ⏭ planned, not built yet · 🧪 runs on a stand-in today (mock)

---

## US-08.01 · Search and export a full audit trail

*🛡*

| | |
|---|---|
| **Story** | US-08.01 · Search and export a full audit trail |
| **Business benefit** | The bank can answer auditors and regulators with complete evidence of who changed what and when. Fast search and CSV export cut the cost of compliance reviews. |
| **Persona** | site admin |
| **Depends on** | US-01.07 |
| **Jira** | Issue type Story · Story type Functional · Sprint TBD · Team WPB Digital Browser: Tools |

**User story**

> As a site admin  
> I want every change recorded with who, what, when and a request id, and to search and export everyone's events  
> So that the bank can prove who did what to auditors and regulators  

**Acceptance criteria**

**Scenario 1 · Audit entries**

```gherkin
When anyone saves, sends for review, reviews, signs off, publishes, archives, deletes or changes permissions
Then the audit log gets a line with the person, the action, the page and a request id
```

**Scenario 2 · Finding events**

```gherkin
Then I can filter by Content, Publishing, Permissions or System
And search by person, page, action or request id
And choose All time, Today or Last 2 days
And export the result to CSV
```

---

## US-08.02 · See my own activity

| | |
|---|---|
| **Story** | US-08.02 · See my own activity |
| **Business benefit** | Staff can check their own work without seeing colleagues' activity, respecting need-to-know access. Fewer support requests to admins lowers operating cost. |
| **Persona** | content author |
| **Depends on** | US-08.01 |
| **Jira** | Issue type Story · Story type Functional · Sprint TBD · Team WPB Digital Browser: Tools |

**User story**

> As a content author  
> I want to see a log of my own actions only  
> So that I can check what I did without seeing other people's activity  

**Acceptance criteria**

**Scenario · Admins see everyone, others see themselves**

```gherkin
Given I am not a site admin
When I open the audit log
Then it is titled "My activity" and shows only my actions
```

---

## US-08.03 · See what needs attention

| | |
|---|---|
| **Story** | US-08.03 · See what needs attention |
| **Business benefit** | Waiting reviews and failed publishes are spotted early, so content reaches customers on time. Managers get a quick view of throughput without manual reporting. |
| **Persona** | content author |
| **Depends on** | US-08.01, US-04.16 |
| **Jira** | Issue type Story · Story type Functional · Sprint TBD · Team WPB Digital Browser: Tools |

**User story**

> As a content author  
> I want a dashboard that summarises waiting reviews, how much of the site is live, failed publishes, my tasks and recent activity  
> So that I see at a glance where work stands and what to do next  

**Acceptance criteria**

**Scenario 1 · Dashboard tiles**

```gherkin
When I open the dashboard
Then I see how many pages wait for review and how old the oldest is
And the share of the site that is live
And failed publishes as "N failed · A publish failed and needs action"
And my top 5 tasks with overdue ones in red
And the latest 5 activity lines
```

**Scenario 2 · Nothing waiting**

```gherkin
Given no page waits for review
Then the tile says "Nothing waiting. Nice."
```

---

Source (Gherkin): [`gherkin/08-governance.feature`](gherkin/08-governance.feature) · Generated with `python3 tools/story-map.py` — edit the Gherkin file, then regenerate.
