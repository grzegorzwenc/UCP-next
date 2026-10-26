# EP-01 · Access & navigation

**Epic:** EP-01 · Access & navigation

**Business benefit:** Only identified staff with the right permissions can change customer-facing content, which closes the door to anonymous or unauthorised changes. One platform for every market and environment replaces separate country tools and cuts licence and support cost.

**Scope:** Who you are, where you are and what you may do: sign-in, markets and environments, navigation, roles and permissions.

**Stories (9):**

1. [US-01.01 · Sign in with the company account](#us-0101--sign-in-with-the-company-account)
2. [US-01.02 · Open a review link without an account](#us-0102--open-a-review-link-without-an-account)
3. [US-01.03 · Try the private demo as any person](#us-0103--try-the-private-demo-as-any-person)
4. [US-01.04 · Switch between markets](#us-0104--switch-between-markets)
5. [US-01.05 · Always know which environment I am in](#us-0105--always-know-which-environment-i-am-in)
6. [US-01.06 · Reach any screen quickly on any device](#us-0106--reach-any-screen-quickly-on-any-device)
7. [US-01.07 · Give each role and workflow step the right permissions](#us-0107--give-each-role-and-workflow-step-the-right-permissions)
8. [US-01.08 · Manage people and their permissions](#us-0108--manage-people-and-their-permissions)
9. [US-01.09 · Only site admins can change access](#us-0109--only-site-admins-can-change-access)

---

## US-01.01 · Sign in with the company account

**Business benefit:** Only identified staff can reach the CMS, which closes the door to anonymous changes on customer-facing pages. Every action is tied to a named person, giving auditors a reliable trail.

**User story:**

As a content author  
I want to sign in with my company account and land where I was going  
So that UCP knows who I am and only signed-in people reach the CMS  
Note: the prototype uses an SSO stand-in (pick an account, no password). Real SSO is on the roadmap.  

**Persona:** content author · **Depends on:** — · **Note:** runs on a stand-in (mock) today

**Acceptance criteria:**

**Scenario 1 · Opening a screen without a session**

```gherkin
Given I am not signed in
When I open "/uk/prod/pages"
Then I am sent to "/login?next=/uk/prod/pages"
```

**Scenario 2 · Sign in with company SSO**

```gherkin
Given I am on "/login?next=/uk/prod/pages"
When I click "Sign in with company SSO" and choose "Super admin"
Then I am on "/uk/prod/pages"
And the audit log says "signed in (SSO stand-in)"
```

**Scenario 3 · Only internal addresses are followed**

```gherkin
Given the login link says "next=//evil.example"
When I sign in
Then I am on "/uk/prod/dashboard"
```

**Scenario 4 · Sign out**

```gherkin
When I open the account menu and click "Sign out"
Then I am on the login screen
```

**Scenario 5 · Session length**

```gherkin
Then a session lasts 12 hours
```


---

## US-01.02 · Open a review link without an account

**Business benefit:** External and occasional reviewers can sign off pages without the bank buying and managing extra CMS licences. Reviews happen sooner because nobody waits for an account to be created.

**User story:**

As a guest reviewer  
I want to open a review link without signing in  
So that I can give feedback on a page without a CMS account  
Note: the prototype uses an SSO stand-in (pick an account, no password). Real SSO is on the roadmap.  

**Persona:** guest reviewer · **Depends on:** US-04.12 · **Note:** runs on a stand-in (mock) today

**Acceptance criteria:**

**Scenario 1 · Review links do not need a session**

```gherkin
When I open a review link "/review/<token>"
Then the page opens without signing in
```


---

## US-01.03 · Try the private demo as any person

**Business benefit:** Stakeholders can evaluate every role before the bank commits to a rollout, reducing the risk of a costly wrong choice. The demo stays private, so unfinished screens and sample data are never exposed publicly.

**User story:**

As a business owner  
I want the hosted demo kept behind a password and to try it as any demo person  
So that I can evaluate every role without exposing the demo to the public  
Note: the prototype uses an SSO stand-in (pick an account, no password). Real SSO is on the roadmap.  

**Persona:** business owner · **Depends on:** US-01.01 · **Note:** runs on a stand-in (mock) today

**Acceptance criteria:**

**Scenario 1 · The hosted demo is behind a password**

```gherkin
Given the demo password is configured
When I open any address of the demo without it
Then the browser asks for a user name and password
And search engines are told not to index the demo
```

**Scenario 2 · Demo accounts**

```gherkin
When I open "/login?demo=1"
Then every demo person is listed with their role and team
```


---

## US-01.04 · Switch between markets

**Business benefit:** One platform serves every market, so the bank runs and pays for a single CMS instead of one per country. Authors working across markets make fewer wrong-market edits.

**User story:**

As a content author  
I want to pick an instance and market and switch market without losing my place  
So that I can work across several countries on one platform without confusion  

**Persona:** content author · **Depends on:** —

**Acceptance criteria:**

**Scenario 1 · Instances** *(one run per row of the table)*

```gherkin
When I choose the instance "<instance>"
Then the market list shows <markets>

Examples:
  | instance | markets              |
  | EMEA     | UK, France, Germany, UAE |
  | APAC     | Hong Kong, Singapore |
  | NA       | Mexico               |
```

**Scenario 2 · Switching market keeps my place**

```gherkin
Given I am on Pages in the UK
When I switch to "HSBC France"
Then I am on Pages in France
```


---

## US-01.05 · Always know which environment I am in

**Business benefit:** Constant visibility of the environment prevents accidental publication to customers, a costly and reputationally damaging incident. Teams can test freely in staging with confidence.

**User story:**

As a publisher  
I want the environment and its consequences always visible  
So that I never publish to customers by mistake  

**Persona:** publisher · **Depends on:** —

**Acceptance criteria:**

**Scenario 1 · Environment note** *(one run per row of the table)*

```gherkin
When I choose "<environment>"
Then the dashboard says "<note>"

Examples:
  | environment | note                                              |
  | Production  | Publishing here goes live for customers.          |
  | Staging     | Nothing in this environment reaches customers.    |
```


---

## US-01.06 · Reach any screen quickly on any device

**Business benefit:** Authors spend less time hunting through menus, which raises daily output at no extra cost. The same tool works on laptops and small screens, so work does not stall away from the desk.

**User story:**

As a content author  
I want a command palette, a global search and a menu that fits my screen  
So that every page and section is a couple of keystrokes away  

**Persona:** content author · **Depends on:** —

**Acceptance criteria:**

**Scenario 1 · Command palette**

```gherkin
When I press ⌘ K
Then I can find pages and go to any section
And in the page builder I can ask AI or add a component from it
And Tab stays inside the palette and Esc returns focus to where I was
```

**Scenario 2 · Global search**

```gherkin
When I type "isa" into the top search
Then I see up to 8 pages, 5 assets, 4 people, 3 templates and 3 models
And Enter opens the first result
```

**Scenario 3 · Side menu** *(one run per row of the table)*

```gherkin
Given my screen is <width>
Then the side menu is <behaviour>

Examples:
  | width                 | behaviour                                   |
  | 1100 px or wider      | full, and I can collapse it to icons        |
  | 768 to 1099 px        | icons only                                  |
  | narrower than 768 px  | hidden behind ☰ and opens as a drawer       |
```


---

## US-01.07 · Give each role and workflow step the right permissions

**Business benefit:** Approval rights follow the bank's segregation-of-duties rules, which supports regulatory compliance. Sensible defaults also cut the admin effort of setting up each new person.

**User story:**

As a business owner  
I want each role to come with sensible defaults and each workflow step to need its permission  
So that only qualified people edit, approve and publish content  

**Persona:** business owner · **Depends on:** —

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the permissions are Read, Edit, Review & approve, Publish and Manage
And they are granted on the whole site or on a top-level folder
```

**Scenario 1 · Role defaults** *(one run per row of the table)*

```gherkin
Given a person with the role "<role>" and no individual grants
Then they can <permissions>

Examples:
  | role       | permissions                              |
  | Author     | read and edit                            |
  | Reviewer   | read, edit and review                    |
  | Publisher  | read, review and publish                 |
  | Site admin | do everything                            |
  | Viewer     | read                                     |
```

**Scenario 2 · Status changes** *(one run per row of the table)*

```gherkin
When someone moves a page to "<status>"
Then they need <permission>

Examples:
  | status                    | permission         |
  | Build the page (draft)    | Edit               |
  | Waiting for review        | Edit               |
  | In author's review        | Review & approve   |
  | Ready to publish          | Review & approve   |
  | Scheduled / Published     | Publish            |
```


---

## US-01.08 · Manage people and their permissions

**Business benefit:** Access can be tailored per folder, so teams work independently without over-privileged accounts. Every grant is logged, which makes access reviews and audits straightforward.

**User story:**

As a site admin  
I want to invite people and grant them permissions on the right folders  
So that everyone has exactly the access their job needs  

**Persona:** site admin · **Depends on:** US-01.07 · **Note:** site admin only

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the permissions are Read, Edit, Review & approve, Publish and Manage
And they are granted on the whole site or on a top-level folder
```

**Scenario 1 · Granting a permission**

```gherkin
Given I am a site admin on "Users & roles"
When I click "Edit" on the "Banking" row for "anna.kowalczyk"
Then she has Edit on Banking and also Read there
And the audit log says "gave Anna Kowalczyk Edit on Banking"
```

**Scenario 2 · Inherited permissions**

```gherkin
Given "rachel.hughes" has Review on the whole site
Then each folder row shows Review as "Inherited from whole site"
```

**Scenario 3 · Inviting a person**

```gherkin
When I invite "Sam Taylor" as an Author
Then the sign-in id is "sam.taylor"
And they get the Author permissions on the whole site
```


---

## US-01.09 · Only site admins can change access

**Business benefit:** Server-side enforcement closes a privilege-escalation risk that would otherwise undermine every other control. It gives security and audit teams evidence that access rules cannot be bypassed.

**User story:**

As a business owner  
I want only site admins to change users and permissions, enforced on screen and on the server  
So that nobody can grant themselves more than they should have  

**Persona:** business owner · **Depends on:** US-01.08

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the permissions are Read, Edit, Review & approve, Publish and Manage
And they are granted on the whole site or on a top-level folder
```

**Scenario 1 · Non-admins see only themselves**

```gherkin
Given I am signed in as "content.author"
When I open "Users & roles"
Then I see only my own profile
And "Only site admins can change users and permissions"
```

**Scenario 2 · The server refuses changes from non-admins**

```gherkin
Given I am a viewer
When I save components of a page or change a user
Then the answer is 403 with a request id
```
