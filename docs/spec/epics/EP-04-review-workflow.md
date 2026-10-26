# EP-04 · Review workflow

**Epic:** EP-04 · Review workflow

**Business benefit:** Every page is checked by separate people for content and for business sign-off before it goes live, which builds the four-eyes control regulators expect into the tool itself. Clear hand-offs, tasks and reminders remove idle time between teams and make delays visible.

**Scope:** The four-eyes approval chain: the author hands the page to a peer reviewer, then to the business, with comments, review links, My tasks and notifications.

**Stories (26):**

1. [US-04.01 · Send for review: put the page in the shared review Backlog with a note and due date](#us-0401--send-for-review-put-the-page-in-the-shared-review-backlog-with-a-note-and-due-date)
2. [US-04.02 · Pre-send check: 'Does everything look right?' with insights and required-field check](#us-0402--pre-send-check-does-everything-look-right-with-insights-and-required-field-check)
3. [US-04.03 · Read-only in review: lock editing during review and reopen as a draft on purpose](#us-0403--read-only-in-review-lock-editing-during-review-and-reopen-as-a-draft-on-purpose)
4. [US-04.04 · Backlog claim: reviewer assigns a review to themselves or puts it back](#us-0404--backlog-claim-reviewer-assigns-a-review-to-themselves-or-puts-it-back)
5. [US-04.05 · Peer review decision: mark Reviewed, then send to business review or Reauthor](#us-0405--peer-review-decision-mark-reviewed-then-send-to-business-review-or-reauthor)
6. [US-04.06 · Review reminders: author reminds the reviewer, at most every 15 minutes](#us-0406--review-reminders-author-reminds-the-reviewer-at-most-every-15-minutes)
7. [US-04.07 · Review admin: site admin reassigns the peer reviewer or acts on their behalf](#us-0407--review-admin-site-admin-reassigns-the-peer-reviewer-or-acts-on-their-behalf)
8. [US-04.08 · Business review claim: business owner takes a page waiting for business review](#us-0408--business-review-claim-business-owner-takes-a-page-waiting-for-business-review)
9. [US-04.09 · Business sign-off: sign off or Reauthor, also from full screen](#us-0409--business-sign-off-sign-off-or-reauthor-also-from-full-screen)
10. [US-04.10 · Share for business review: give access to a person, a review group or a link](#us-0410--share-for-business-review-give-access-to-a-person-a-review-group-or-a-link)
11. [US-04.11 · Business review admin: fixed reviewers, site admin can sign off on behalf](#us-0411--business-review-admin-fixed-reviewers-site-admin-can-sign-off-on-behalf)
12. [US-04.12 · Guest review link: read the page and comment without a UCP account](#us-0412--guest-review-link-read-the-page-and-comment-without-a-ucp-account)
13. [US-04.13 · Guest decision: invited guests sign off or Reauthor through the link](#us-0413--guest-decision-invited-guests-sign-off-or-reauthor-through-the-link)
14. [US-04.14 · Targeted comments: comment on a specific text, image or component](#us-0414--targeted-comments-comment-on-a-specific-text-image-or-component)
15. [US-04.15 · Comment handling: jump to the commented part, resolve with undo, pin, delete own](#us-0415--comment-handling-jump-to-the-commented-part-resolve-with-undo-pin-delete-own)
16. [US-04.16 · My tasks: one task per page in stage tabs with people and due dates](#us-0416--my-tasks-one-task-per-page-in-stage-tabs-with-people-and-due-dates)
17. [US-04.17 · My tasks (author): follow my own pages and who has them](#us-0417--my-tasks-author-follow-my-own-pages-and-who-has-them)
18. [US-04.18 · My tasks (reviewer / publisher): the next action for my step on each row](#us-0418--my-tasks-reviewer--publisher-the-next-action-for-my-step-on-each-row)
19. [US-04.19 · My tasks (admin): all tasks, split by assignee, with reviewer reassign](#us-0419--my-tasks-admin-all-tasks-split-by-assignee-with-reviewer-reassign)
20. [US-04.20 · Notifications: bell alerts when a page is handed to me](#us-0420--notifications-bell-alerts-when-a-page-is-handed-to-me)
21. [US-04.21 · Notification actions: overdue items highlighted, click opens the page](#us-0421--notification-actions-overdue-items-highlighted-click-opens-the-page)
22. [US-04.22 · End-to-end hand-off: author → peer reviewer → business → publisher, one person per step](#us-0422--end-to-end-hand-off-author--peer-reviewer--business--publisher-one-person-per-step)
23. [US-04.23 · Reauthor loop: any reviewer sends the page back to the author with comments](#us-0423--reauthor-loop-any-reviewer-sends-the-page-back-to-the-author-with-comments)
24. [US-04.24 · Four-eyes rule: author, peer reviewer and business reviewer must be different people](#us-0424--four-eyes-rule-author-peer-reviewer-and-business-reviewer-must-be-different-people)
25. [US-04.25 · Admin walk-through: site admin performs any step, recorded as 'on behalf of'](#us-0425--admin-walk-through-site-admin-performs-any-step-recorded-as-on-behalf-of)
26. [US-04.26 · Publish request: author asks for a publish date and is told when the page is live](#us-0426--publish-request-author-asks-for-a-publish-date-and-is-told-when-the-page-is-live)

---

## US-04.01 · Send for review: put the page in the shared review Backlog with a note and due date

**Business benefit:** A shared Backlog lets the first free reviewer start, so pages do not queue behind one person's calendar. Due dates and audit entries make review turnaround measurable from day one.

**User story:**

As a content author  
I want to send the page to a Backlog that every reviewer sees, with a note  
So that the first free reviewer can take it and I don't have to chase one person  

**Persona:** content author · **Depends on:** US-03.04, US-01.07

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given I am signed in as "content.author" with Edit on the folder of the page
And the page "Cash ISA" is at the "Build the page" stage
```

**Scenario 1 · Sending the page for review**

```gherkin
When I click "Send to author's review"
And I add the note "Rates changed on 1 Oct" for the reviewer
And I click "Send to the Backlog"
Then the page status is "Waiting for author's review assignment"
And nobody is assigned to review it
And the review is due in 3 days
And the audit log says "sent Cash ISA for review · open to all reviewers in the Backlog"
And I see "Sent for review · it is in the Backlog, any reviewer can take it"
```

**Scenario 2 · Nobody can review the folder**

```gherkin
Given no user has "Review & approve" on the folder of the page
When I send the page for review
Then I see "Nobody can review this page"
And I am told "Ask a site admin to grant Review & approve on this folder"
```


---

## US-04.02 · Pre-send check: 'Does everything look right?' with insights and required-field check

**Business benefit:** Catching missing fields and quality problems before hand-off avoids wasted review cycles. Fewer round trips mean faster delivery and lower review cost.

**User story:**

As a content author  
I want a last check of the page, with any problems Page insights found  
So that I only send pages that are complete  

**Persona:** content author · **Depends on:** US-04.01, US-03.10

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given I am signed in as "content.author" with Edit on the folder of the page
And the page "Cash ISA" is at the "Build the page" stage
```

**Scenario 1 · Leaving the preview asks whether the page looks right**

```gherkin
Given I am on the "Preview" step
When I leave the preview
Then I see the dialog "Does everything look right?"
And I can choose "No, keep editing" or "Yes, send for review"
```

**Scenario 2 · Page insights warn about problems but do not block sending**

```gherkin
Given Page insights found 2 things to fix on the page
When I leave the preview
Then the dialog says "Page insights found 2 things to fix. You can still send it"
```

**Scenario 3 · Required fields are missing**

```gherkin
Given 3 required component fields are empty
When I click "Send to author's review"
Then I see "Fill in 3 required fields first"
And the first incomplete component opens in Configure
```


---

## US-04.03 · Read-only in review: lock editing during review and reopen as a draft on purpose

**Business benefit:** Reviewers approve exactly the version that will be published, which protects the integrity of the four-eyes check. It prevents silent changes after approval that could expose the bank to conduct risk.

**User story:**

As a content author  
I want the page to be read-only during review, with a clear way to take it back  
So that reviewers check exactly what I sent  

**Persona:** content author · **Depends on:** US-04.01

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given I am signed in as "content.author" with Edit on the folder of the page
And the page "Cash ISA" is at the "Build the page" stage
```

**Scenario 1 · The page is read-only in review**

```gherkin
Given the page was sent for review
When I open it in the page builder
Then the page is shown as a preview
And the component and AI panels say "Editing takes it out of the review queue"
```

**Scenario 2 · Taking the page back for editing**

```gherkin
Given the page was sent for review
When I click "Edit the page"
And I confirm "Reopen this page for editing? It will leave the review queue."
Then the page is back at "Build the page"
```


---

## US-04.04 · Backlog claim: reviewer assigns a review to themselves or puts it back

**Business benefit:** Reviews start as soon as any reviewer is free, so pages do not wait for one person. Each review has one named owner, which makes delays visible.

**User story:**

As a peer reviewer  
I want to assign a waiting page to myself and return it if I cannot do it  
So that every review has exactly one owner and nothing gets stuck with me  

**Persona:** peer reviewer · **Depends on:** US-04.01

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the page "Cash ISA" was sent for review by "content.author"
And "rachel.hughes" has "Review & approve" on the page
```

**Scenario 1 · A reviewer assigns the page to themselves**

```gherkin
Given I am signed in as "rachel.hughes"
When I click "Assign to me" on "Cash ISA" in the Backlog
Then I am the peer reviewer of the page
And the stepper shows "Assigned to reviewer"
And I see "Cash ISA is yours · find it in Ready for review"
```

**Scenario 2 · Two reviewers try to take the same page**

```gherkin
Given "aisha.khan" already took "Cash ISA"
When I try to take it as "rachel.hughes"
Then I see "Already assigned to Aisha Khan"
```

**Scenario 3 · Someone without Review cannot take it**

```gherkin
Given I am signed in as "tunde.boateng" who only has Read
Then the "Assign to me" button is disabled
And I see "Only reviewers can take it · you don't have Review & approve here"
```

**Scenario 4 · Back to backlog before the review starts** *(one run per row of the table)*

```gherkin
Given "rachel.hughes" took "Cash ISA" but has not started the review
And I am signed in as "<who>"
When I click "Back to backlog"
Then <outcome>

Examples:
  | who           | outcome                                                                            |
  | rachel.hughes | nobody is assigned and the page is in the Backlog again                           |
  | aisha.khan    | I see "Only the assigned reviewer or a site admin can put it back in the Backlog" |
```

**Scenario 5 · A started review cannot go back**

```gherkin
Given the review of "Cash ISA" has started
When the reviewer clicks "Back to backlog"
Then they see "The review has already started"
```


---

## US-04.05 · Peer review decision: mark Reviewed, then send to business review or Reauthor

**Business benefit:** A single decision point moves the page on or back without extra meetings or e-mails. Only the assigned reviewer can approve, which keeps the peer check accountable and auditable.

**User story:**

As a peer reviewer  
I want to finish my review with one decision: business review or back to the author  
So that the page moves on without extra hand-offs  

**Persona:** peer reviewer · **Depends on:** US-04.04

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the page "Cash ISA" was sent for review by "content.author"
And "rachel.hughes" has "Review & approve" on the page
```

**Scenario 1 · Starting the review**

```gherkin
Given I am signed in as "rachel.hughes" and I am assigned to "Cash ISA"
When I click "Start review"
Then the page status is "In author's review"
```

**Scenario 2 · Only the assigned reviewer decides**

```gherkin
Given "rachel.hughes" is assigned to "Cash ISA"
When "aisha.khan" marks it reviewed
Then she sees "Only the assigned reviewer can approve this page"
```

**Scenario 3 · Finishing the review opens a choice**

```gherkin
Given the review of "Cash ISA" is in progress and I am the reviewer
When I click "Reviewed"
Then I see "Author's review done · what next?"
And I can choose "Send to business review" or "Reauthor"
```

**Scenario 4 · Sending to the business review**

```gherkin
When I choose "Send to business review"
Then the page status is "In business review"
And the stepper shows "Waiting for business review assignment"
And the "Share for review" dialog opens as the next step
```

**Scenario 5 · Sending the page back to the author**

```gherkin
When I choose "Reauthor"
And I confirm "Send it back to the author?"
Then the page is back at "Build the page"
And the peer reviewer, the business reviewer and the review groups are cleared
```


---

## US-04.06 · Review reminders: author reminds the reviewer, at most every 15 minutes

**Business benefit:** Rate-limited reminders keep pages moving without manual chasing or noisy escalation. Shorter waiting times bring content to market faster.

**User story:**

As a content author  
I want to remind the reviewer, but not more often than every 15 minutes  
So that my page keeps moving without spamming anyone  

**Persona:** content author · **Depends on:** US-04.04

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the page "Cash ISA" was sent for review by "content.author"
And "rachel.hughes" has "Review & approve" on the page
```

**Scenario 1 · Sending a reminder**

```gherkin
Given I am signed in as "content.author" and the review is waiting
When I click "Remind"
Then the reviewer gets the notification "Reminder: Content Author is waiting for your review of Cash ISA"
```

**Scenario 2 · Reminder rate limit**

```gherkin
Given a reminder was sent 5 minutes ago
When I click "Remind" again
Then I see "A reminder was sent a few minutes ago"
```


---

## US-04.07 · Review admin: site admin reassigns the peer reviewer or acts on their behalf

**Business benefit:** Admins can rebalance workload and unblock stuck reviews, which protects launch dates. Every intervention is logged on behalf of the reviewer, so oversight never weakens the audit trail.

**User story:**

As a site admin  
I want to reassign reviewers and act for them when needed  
So that reviews never get stuck, and everyone can see that I stepped in  

**Persona:** site admin · **Depends on:** US-04.04, US-04.05 · **Note:** site admin only

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the page "Cash ISA" was sent for review by "content.author"
And "rachel.hughes" has "Review & approve" on the page
```

**Scenario 1 · Reassigning the peer reviewer**

```gherkin
Given I am signed in as "super.admin"
When I click the pencil next to the peer reviewer in My tasks
And I choose "aisha.khan"
Then "aisha.khan" is the peer reviewer
And the audit log says "reassigned the review of Cash ISA from Rachel Hughes to Aisha Khan"
```

**Scenario 2 · Assigning automatically**

```gherkin
When I choose "Assign automatically"
Then the reviewer with the fewest open reviews is assigned
But never the person who sent the page
```

**Scenario 3 · Putting any review back in the Backlog**

```gherkin
Given "rachel.hughes" took "Cash ISA" but has not started the review
When I click "Back to backlog" as "super.admin"
Then nobody is assigned and the page is in the Backlog again
```

**Scenario 4 · Marking it reviewed for the reviewer**

```gherkin
Given "rachel.hughes" is the reviewer
When I click "Reviewed for Rachel Hughes" as "super.admin"
Then the audit line ends with "(on behalf of Rachel Hughes)"
```


---

## US-04.08 · Business review claim: business owner takes a page waiting for business review

**Business benefit:** Each business decision has one named owner, which gives clear accountability for customer-facing messages. Blocking the peer reviewer from also signing off enforces four-eyes separation.

**User story:**

As a business owner  
I want to take a page that waits for business review  
So that it is clear who decides on it  

**Persona:** business owner · **Depends on:** US-04.05

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the author's review of "Cash ISA" was done by "rachel.hughes"
And the page was sent to the business review
```

**Scenario 1 · Waiting for a business reviewer**

```gherkin
Then the stepper shows "Waiting for business review assignment"
And My tasks lists the page under "Ready for business review"
```

**Scenario 2 · A business owner takes it**

```gherkin
Given I am signed in as "david.clarke" with Review on the page
When I click "Assign to me"
Then I am the business reviewer
And the stepper shows "In business review"
```

**Scenario 3 · The peer reviewer cannot also do the business review**

```gherkin
Given I am signed in as "rachel.hughes"
When I try to take the business review
Then I see "You did the author's review · someone else does the business review"
```


---

## US-04.09 · Business sign-off: sign off or Reauthor, also from full screen

**Business benefit:** Nothing reaches customers without explicit business approval, which reduces conduct and mis-selling risk. Deciding on the page as customers see it lowers the chance of costly post-launch corrections.

**User story:**

As a business owner  
I want to sign the page off or send it back to the author, also from full screen  
So that I decide while looking at the page as customers will see it  

**Persona:** business owner · **Depends on:** US-04.08

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the author's review of "Cash ISA" was done by "rachel.hughes"
And the page was sent to the business review
```

**Scenario 1 · Signing off**

```gherkin
Given I am the assigned business reviewer
When I click "Sign off"
Then the page status is "Ready to publish"
And the publishers see it under "Ready to publish" in My tasks
And the author sees it under "Ready to publish" with "Waiting for a publisher"
```

**Scenario 2 · Someone else tries to sign off**

```gherkin
Given "david.clarke" is the business reviewer
When "maria.santos" signs it off
Then she sees "Only the assigned business reviewer can sign this page off"
```

**Scenario 3 · Sending it back**

```gherkin
When I click "Reauthor" and confirm
Then the page is back at "Build the page"
And both reviews start over
```

**Scenario 4 · Deciding in full screen**

```gherkin
Given I opened "Review & feedback" in full screen
When I choose "Sign off" in the "Decision" section
And I confirm "Yes, sign off"
Then a full-screen message says "Signed off" with my name and the time
```


---

## US-04.10 · Share for business review: give access to a person, a review group or a link

**Business benefit:** Getting the right stakeholders in early avoids late rejections and repeated review rounds. External partners can contribute without new UCP licences, which keeps cost down.

**User story:**

As a peer reviewer  
I want to share the page with a person, a review group or a link  
So that the right business owners see it, even without a UCP account  

**Persona:** peer reviewer · **Depends on:** US-04.08

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the author's review of "Cash ISA" was done by "rachel.hughes"
And the page was sent to the business review
```

**Scenario 1 · Share with a review group**

```gherkin
Given the "Share for review" dialog is open
When I give the "Savings & Mortgages board" group access
Then the members of the group see the page in My tasks
And I see "Savings & Mortgages board (3 people) now has access"
And the group is shown as a chip and cannot be added twice
```

**Scenario 2 · Share by e-mail with a UCP user**

```gherkin
When I send the review link to "maria.santos@hsbc.com"
Then Maria Santos is assigned as the business reviewer
And my mail app opens with the link
```

**Scenario 3 · Share by e-mail with someone outside UCP**

```gherkin
When I send the review link to "partner@example.com"
Then I see "partner@example.com can comment through the link"
```

**Scenario 4 · Invalid e-mail**

```gherkin
When I send the review link to "not-an-email"
Then I see "That e-mail address does not look right"
```


---

## US-04.11 · Business review admin: fixed reviewers, site admin can sign off on behalf

**Business benefit:** Keeping the business reviewer fixed protects the integrity of the business decision. Recorded on-behalf sign-off still lets urgent pages move without breaking the audit trail.

**User story:**

As a site admin  
I want people to stay fixed during the business review, but be able to sign off for the assignee  
So that the business decision is not changed behind its back, and urgent pages can still move  

**Persona:** site admin · **Depends on:** US-04.08, US-04.09 · **Note:** site admin only

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the author's review of "Cash ISA" was done by "rachel.hughes"
And the page was sent to the business review
```

**Scenario 1 · No reassigning in business review**

```gherkin
Given I am signed in as "super.admin"
Then there is no pencil next to the business reviewer in My tasks
```

**Scenario 2 · Signing off on behalf**

```gherkin
Given "david.clarke" is the business reviewer
When I click "Sign off for David Clarke"
Then I see "Signed off as site admin · ready to publish"
And the audit line ends with "(on behalf of David Clarke)"
```


---

## US-04.12 · Guest review link: read the page and comment without a UCP account

**Business benefit:** Stakeholders without a UCP account can give feedback, which saves licence cost and onboarding effort. Feedback lands on the page itself, so nothing is lost in e-mail threads.

**User story:**

As a guest reviewer  
I want to open a link, see the page full screen and comment on any part of it  
So that I can give feedback without learning the CMS  

**Persona:** guest reviewer · **Depends on:** US-04.10

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the page "Cash ISA" is in business review
And a review link was created for it
```

**Scenario 1 · Opening a valid link**

```gherkin
When I open the review link
Then I see the page full screen with a floating Comments panel
And search engines are told not to index it
```

**Scenario 2 · Commenting on a part of the page**

```gherkin
When I click a heading on the page
And I write "Is this rate still correct?"
And I enter my name and e-mail
Then the comment is saved against that heading
And it is marked "During the business review"
```

**Scenario 3 · Commenting without a name**

```gherkin
When I post a comment without my name or e-mail
Then I see "Add your name and e-mail so the team knows who commented"
```

**Scenario 4 · The stage is over**

```gherkin
Given the page has moved on to "Ready to publish"
When I open the review link
Then I see "This business review is finished. You can still read the page and the comments."
And I cannot comment or decide
```

**Scenario 5 · Unknown link**

```gherkin
When I open a review link with an unknown token
Then I see "This review link does not work"
```


---

## US-04.13 · Guest decision: invited guests sign off or Reauthor through the link

**Business benefit:** The business can approve without a UCP account, which speeds up sign-off for busy owners. Restricting decisions to invited addresses stops forwarded links from approving content, which limits fraud and compliance risk.

**User story:**

As a guest reviewer who was invited  
I want to sign off or send the page back from the link  
So that the business can decide without a UCP account, while a forwarded link cannot approve anything  

**Persona:** guest reviewer who was invited · **Depends on:** US-04.12

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the page "Cash ISA" is in business review
And a review link was created for it
```

**Scenario 1 · Who may sign off through the link** *(one run per row of the table)*

```gherkin
Given the link was <sent>
When a guest using "<email>" signs off
Then <outcome>

Examples:
  | sent                            | email                 | outcome                                                                          |
  | to "partner@example.com"        | partner@example.com   | the page is "Ready to publish" and approved by "guest:partner@example.com"      |
  | to "partner@example.com"        | other@example.com     | they see "This link was sent to partner@example.com. Use that e-mail to decide." |
  | to the "Business owners" group  | david.clarke@hsbc.com | the page is "Ready to publish"                                                   |
  | as a plain copied link          | anyone@example.com    | they see "Signing off is for the people the review was sent to."                |
```

**Scenario 2 · A business reviewer is already assigned**

```gherkin
Given "david.clarke" is the assigned business reviewer
When another invited person tries to decide
Then they see "David Clarke decides on this page."
```

**Scenario 3 · Reauthor through the link**

```gherkin
When the invited reviewer chooses "Reauthor" with a note
Then the page is back at "Build the page"
And the note is added as a comment
And a full-screen message says "Sent back to the author"
```


---

## US-04.14 · Targeted comments: comment on a specific text, image or component

**Business benefit:** Feedback pinned to the exact element removes ambiguity and reduces rework. Limiting who can comment keeps feedback relevant and the review record trustworthy.

**User story:**

As a peer reviewer or business owner  
I want to click a text, picture or component and comment on it  
So that the author knows exactly what to change  

**Persona:** peer reviewer or business owner · **Depends on:** US-04.05

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the page "Cash ISA" is in the author's review
And I am signed in as the reviewer
```

**Scenario 1 · Picking a target** *(one run per row of the table)*

```gherkin
When I click <target> on the page
Then the comment box shows "<label>"

Examples:
  | target                     | label                          |
  | the masthead heading       | “Your heading here” · Masthead |
  | the masthead photo         | Background image · Masthead    |
  | empty space in a component | Key facts                      |
```

**Scenario 2 · Invalid comments** *(one run per row of the table)*

```gherkin
When I post "<text>"
Then I see "<message>"

Examples:
  | text                     | message                              |
  |                          | Write a comment first                |
  | 2,001 characters of text | Keep comments under 2,000 characters |
```

**Scenario 3 · Only people working on the page can comment in UCP**

```gherkin
Given I am signed in as a viewer
When I post a comment
Then I see "Only people who edit or review this page can comment"
```

**Scenario 4 · Opening comments**

```gherkin
When I click the Comments icon in the right rail
Then the Comments panel opens with the number of open comments
And "Review & feedback" next to "1:1" opens the page full screen with floating comments
```


---

## US-04.15 · Comment handling: jump to the commented part, resolve with undo, pin, delete own

**Business benefit:** Authors see at a glance what is still open, so no requested change is missed before sign-off. Resolved comments never leak onto the published page, which protects the customer experience.

**User story:**

As a content author  
I want to jump to each comment's place, resolve it and undo by mistake  
So that I see what is still open and the published page stays clean  

**Persona:** content author · **Depends on:** US-04.14

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given the page "Cash ISA" is in the author's review
And I am signed in as the reviewer
```

**Scenario 1 · Components with open comments show a badge**

```gherkin
Given the "Key facts" component has 2 open comments
Then the component shows a badge with "2"
```

**Scenario 2 · Jumping to what a comment is about**

```gherkin
When I click the chip of a comment
Then the page scrolls to that part and flashes it
```

**Scenario 3 · The part was removed**

```gherkin
Given the commented text was deleted from the page
When I click the chip of the comment
Then I see "That part is not on the page any more"
```

**Scenario 4 · Resolving with undo**

```gherkin
When I resolve a comment
Then it moves to "Resolved · not shown on the page"
And its marker disappears from the page
And I can click "Undo" for 6 seconds
```

**Scenario 5 · Pinning**

```gherkin
When I pin a comment
Then it stays at the top of the list
```

**Scenario 6 · Deleting someone else's comment**

```gherkin
Given I am not a site admin
When I delete a comment written by someone else
Then I see "You can only delete your own comments"
```


---

## US-04.16 · My tasks: one task per page in stage tabs with people and due dates

**Business benefit:** One prioritised work list reduces time lost looking for pending work across tools. Due dates and overdue markers make bottlenecks visible to the team and management.

**User story:**

As anyone in the content team  
I want every page in the workflow as one task in the right tab  
So that I know what to do next without thinking  

**Persona:** As anyone in the content team · **Depends on:** US-04.01

**Acceptance criteria:**

**Scenario 1 · Task per stage** *(one run per row of the table)*

```gherkin
Given a page with status "<status>"
Then My tasks shows it in "<tab>" with the text "<text>"

Examples:
  | status    | tab                       | text                                              |
  | review    | Backlog                   | Waiting for author's review assignment · start it |
  | inreview  | In review                 | In author's review · finish and mark reviewed     |
  | reviewed  | Reviewed                  | Author's review done · send to business review    |
  | bizreview | Ready for business review | Business review · sign off before publishing      |
  | approved  | Ready to publish          | Business review done · ready to publish           |
  | scheduled | Ready to publish          | Check scheduled publish                           |
  | failed    | Ready to publish          | Fix failed publish                                |
```

**Scenario 2 · People and dates on every row**

```gherkin
Then each row shows the Content author, the Peer reviewer and the Business reviewer with full name and e-mail
And co-authors are listed under the Content author as "+ Name"
And a Jira chip is shown next to the title when the page has a ticket
And the due date shows "N days overdue", "Due today", "Due tomorrow" or the date
```

**Scenario 3 · Filters and markers**

```gherkin
Then I can search by page or person
And I can tick "Only assigned to me"
And I can sort by newest or by due date
And new tasks have a red dot until I have seen them
And the header says "N assigned to you · M new"
```


---

## US-04.17 · My tasks (author): follow my own pages and who has them

**Business benefit:** Authors can track their pages without asking around, which reduces status meetings. Hiding review actions on their own work enforces four-eyes separation in the interface.

**User story:**

As a content author  
I want to see where each of my pages is and who has it, without review buttons for my own work  
So that I know whom to remind and when the page comes back to me  

**Persona:** content author · **Depends on:** US-04.16

**Acceptance criteria:**

**Scenario 1 · My page waits for a reviewer**

```gherkin
Given I sent "Cash ISA" for review
Then "Cash ISA" is not in my Backlog
And it is under "Ready for review" with "Waiting for a reviewer to take it"
```

**Scenario 2 · My actions on my own page** *(one run per row of the table)*

```gherkin
Given my page is in "<tab>"
Then I see "<actions>"

Examples:
  | tab              | actions                 |
  | In review        | Remind                  |
  | Ready to publish | Waiting for a publisher |
  | Published        | Open                    |
```


---

## US-04.18 · My tasks (reviewer / publisher): the next action for my step on each row

**Business benefit:** Taking and finishing work from one list shortens cycle time for every hand-off. Showing only the permitted action reduces errors and unauthorised steps.

**User story:**

As a peer reviewer, business owner or publisher  
I want the action for my step right on the row  
So that I can take and finish work from one list  

**Persona:** peer reviewer, business owner or publisher · **Depends on:** US-04.16

**Acceptance criteria:**

**Scenario 1 · The Backlog is a shared bucket**

```gherkin
Given I am signed in as a reviewer
Then each Backlog row has "Assign to me" instead of "Open"
```

**Scenario 2 · Row actions** *(one run per row of the table)*

```gherkin
Given a task in "<tab>"
And I am "<who>"
Then I see "<actions>"

Examples:
  | tab                       | who                   | actions                       |
  | Backlog                   | a reviewer            | Assign to me                  |
  | Ready for review          | the assigned reviewer | Back to backlog, Start review |
  | In review                 | the assigned reviewer | Reviewed                      |
  | Ready for business review | a business owner      | Assign to me                  |
  | Business review           | the business reviewer | Reauthor, Sign off            |
  | Ready to publish          | a publisher           | Publish                       |
```


---

## US-04.19 · My tasks (admin): all tasks, split by assignee, with reviewer reassign

**Business benefit:** Admins can balance workload across reviewers, which protects delivery dates. Restricting reassignment once a page is ready to publish keeps late changes under control.

**User story:**

As a site admin  
I want to see all tasks, split by who has them, and change the peer reviewer  
So that I can balance work and unblock pages  

**Persona:** site admin · **Depends on:** US-04.16, US-04.18 · **Note:** site admin only

**Acceptance criteria:**

**Scenario 1 · Admin view**

```gherkin
Given I am signed in as "super.admin"
Then tasks are split into "Assigned to me" and "Assigned to others"
And a pencil next to the Peer reviewer lets me change the person while the page is in review
```

**Scenario 2 · No reassigning at Ready to publish**

```gherkin
Then rows in "Ready to publish" have no pencil and no "Assign to anyone"
```


---

## US-04.20 · Notifications: bell alerts when a page is handed to me

**Business benefit:** People learn immediately when it is their turn, which removes idle time between hand-offs. Faster hand-offs shorten time to market for every page.

**User story:**

As anyone in the content team  
I want a notification when it is my turn on a page  
So that I don't have to keep checking My tasks  

**Persona:** As anyone in the content team · **Depends on:** US-04.16

**Acceptance criteria:**

**Scenario 1 · The bell polls and shows unread items**

```gherkin
Given I am signed in
Then the bell checks for news every 60 seconds
And shows a badge with the number of unread items
And "Mark all as read" clears the badge
```

**Scenario 2 · What I am told** *(one run per row of the table)*

```gherkin
Given <event>
Then my bell shows "<message>"

Examples:
  | event                                    | message                                                                |
  | the author reminds me about a review     | Reminder: Content Author is waiting for your review of Cash ISA       |
  | I was assigned a review                  | Super Admin assigned you to review Cash ISA                           |
  | the author's review of my page is done   | finished the author's review of Cash ISA · send it to business review |
  | the page reached business review         | sent to business review: Cash ISA · business sign-off needed          |
  | the business signed off a page I publish | finished the business review of Cash ISA · ready to publish           |
  | my draft has not been sent               | Your draft of Cash ISA is waiting to be sent for review               |
```


---

## US-04.21 · Notification actions: overdue items highlighted, click opens the page

**Business benefit:** Overdue items stand out, so service levels and regulatory deadlines are met more reliably. One-click access cuts the time from notice to action.

**User story:**

As anyone in the content team  
I want urgent items to stand out and to open the page from the notification  
So that overdue work is handled first  

**Persona:** As anyone in the content team · **Depends on:** US-04.20

**Acceptance criteria:**

**Scenario 1 · Overdue work stands out**

```gherkin
Given a review assigned to me is overdue
Then its notification is marked critical
```

**Scenario 2 · Clicking a notification opens the page**

```gherkin
When I click a notification about "Cash ISA"
Then the page opens in the page builder
```


---

## US-04.22 · End-to-end hand-off: author → peer reviewer → business → publisher, one person per step

**Business benefit:** Every page passes through separate authoring, review, sign-off and publishing hands, which builds four-eyes control into the process itself. Clear hand-offs cut idle time between teams and shorten time to market.

**User story:**

As a content author  
I want to request each next step instead of doing it myself  
So that every page is checked by other people before customers see it  

**Persona:** content author · **Depends on:** US-04.01, US-04.05, US-04.09, US-05.01

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given these people work on the UK site
| person         | persona         | permissions on the folder           |
| content.author | content author  | Read, Edit                          |
| rachel.hughes  | peer reviewer   | Read, Edit, Review & approve        |
| david.clarke   | business owner  | Read, Review & approve              |
| jordan.mensah  | publisher       | Read, Review & approve, Publish     |
| super.admin    | site admin      | everything                          |
```

**Scenario 1 · The happy path, one person per step**

```gherkin
Given "content.author" built the page "Cash ISA"
When "content.author" sends it for review
Then it waits in the Backlog for any reviewer
When "rachel.hughes" takes it, reviews it and chooses "Send to business review"
Then it waits for a business reviewer
When "david.clarke" takes it and signs it off
Then it is "Ready to publish"
When "jordan.mensah" publishes it
Then it is "Published"
And "content.author" sees "Cash ISA" under "Published" in My tasks
```

**Scenario 2 · What the author can do at each stage** *(one run per row of the table)*

```gherkin
Given the page "Cash ISA" is at "<stage>"
And I am signed in as "content.author"
Then the next step for me is "<my action>"
And the step itself is done by "<who acts>"

Examples:
  | stage                                  | my action                         | who acts                       |
  | Build the page                         | Send to author's review           | me                             |
  | Waiting for author's review assignment | Wait · "Waiting for a reviewer"   | any reviewer except me         |
  | Assigned to reviewer                   | Remind                            | the assigned reviewer          |
  | In author's review                     | Remind                            | the assigned reviewer          |
  | Waiting for business review assignment | Wait                              | a business owner               |
  | In business review                     | Remind                            | the business reviewer or group |
  | Ready to publish                       | Wait · "Waiting for a publisher"  | a publisher                    |
  | Published                              | Edit to start a new version       | me                             |
```


---

## US-04.23 · Reauthor loop: any reviewer sends the page back to the author with comments

**Business benefit:** Rework goes back to one accountable author instead of being patched by reviewers, which keeps responsibility clear. Restarting both reviews after changes means no unchecked edit can reach customers.

**User story:**

As a content author  
I want any reviewer to send the page back to me with comments  
So that I fix it once and the whole check starts again  

**Persona:** content author · **Depends on:** US-04.22

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given these people work on the UK site
| person         | persona         | permissions on the folder           |
| content.author | content author  | Read, Edit                          |
| rachel.hughes  | peer reviewer   | Read, Edit, Review & approve        |
| david.clarke   | business owner  | Read, Review & approve              |
| jordan.mensah  | publisher       | Read, Review & approve, Publish     |
| super.admin    | site admin      | everything                          |
```

**Scenario 1 · Reauthor returns the page to the author** *(one run per row of the table)*

```gherkin
Given "<reviewer>" is reviewing "Cash ISA" at "<stage>"
When they choose "Reauthor" with comments
Then the page is back at "Build the page" for "content.author"
And the comments stay on the page
And both reviews start over when it is sent again

Examples:
  | reviewer      | stage              |
  | rachel.hughes | In author's review |
  | david.clarke  | In business review |
```


---

## US-04.24 · Four-eyes rule: author, peer reviewer and business reviewer must be different people

**Business benefit:** Segregation of duties is enforced by the system rather than by policy documents, which satisfies four-eyes compliance requirements. Auditors can rely on the platform instead of sampling manual evidence.

**User story:**

As the bank  
I want different people for authoring, peer review and business review  
So that the four-eyes principle holds on every page  

**Persona:** bank · **Depends on:** US-04.22

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given these people work on the UK site
| person         | persona         | permissions on the folder           |
| content.author | content author  | Read, Edit                          |
| rachel.hughes  | peer reviewer   | Read, Edit, Review & approve        |
| david.clarke   | business owner  | Read, Review & approve              |
| jordan.mensah  | publisher       | Read, Review & approve, Publish     |
| super.admin    | site admin      | everything                          |
```

**Scenario 1 · Four-eyes checks** *(one run per row of the table)*

```gherkin
Given "<person>" did "<earlier step>" on "Cash ISA"
When "<person>" tries to "<later step>"
Then they see "<message>"

Examples:
  | person         | earlier step      | later step                | message                                                              |
  | content.author | write the page    | take the author's review  | You wrote this page, so someone else reviews it                      |
  | rachel.hughes  | the peer review   | take the business review  | You did the author's review · someone else does the business review  |
  | rachel.hughes  | the peer review   | sign it off               | Someone else must do the business review                             |
```

**Scenario 2 · An author without Publish cannot put the page live**

```gherkin
Given "Cash ISA" is "Ready to publish"
And I am signed in as "content.author"
Then I see "Waiting for a publisher" instead of "Publish"
```


---

## US-04.25 · Admin walk-through: site admin performs any step, recorded as 'on behalf of'

**Business benefit:** Urgent regulatory or pricing changes can still go live when reviewers are unavailable, which reduces business risk. Every override is recorded as on behalf of a named person, so audit trails stay complete.

**User story:**

As a site admin  
I want to perform any step for the person who should do it  
So that I can demo the platform and unblock urgent pages  

**Persona:** site admin · **Depends on:** US-04.22, US-04.24 · **Note:** site admin only

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given these people work on the UK site
| person         | persona         | permissions on the folder           |
| content.author | content author  | Read, Edit                          |
| rachel.hughes  | peer reviewer   | Read, Edit, Review & approve        |
| david.clarke   | business owner  | Read, Review & approve              |
| jordan.mensah  | publisher       | Read, Review & approve, Publish     |
| super.admin    | site admin      | everything                          |
```

**Scenario 1 · Walking every step alone**

```gherkin
Given I am signed in as "super.admin"
Then every step on the stepper offers its action to me
And I can take my own page from the Backlog
```

**Scenario 2 · Acting on behalf is recorded**

```gherkin
Given "rachel.hughes" is the assigned peer reviewer
When I click "Reviewed for Rachel Hughes"
Then the audit line ends with "(on behalf of Rachel Hughes)"
```

**Scenario 3 · Ordinary users never see actions for other people**

```gherkin
Given I am signed in as "content.author"
Then no button on the stepper or in My tasks lets me act for someone else
```


---

## US-04.26 · Publish request: author asks for a publish date and is told when the page is live

**Business benefit:** Planned launch dates reduce last-minute coordination between marketing and publishers. Authors learn when a page is live without chasing anyone, which saves time and avoids missed campaign starts.

**User story:**

As a content author  
I want to request publishing at a date and be told when the page is live  
So that I can plan launches without chasing the publisher  

**Persona:** content author · **Depends on:** US-04.22 · **Note:** planned, not built yet

**Acceptance criteria:**

**Background** (applies to every scenario below)

```gherkin
Given these people work on the UK site
| person         | persona         | permissions on the folder           |
| content.author | content author  | Read, Edit                          |
| rachel.hughes  | peer reviewer   | Read, Edit, Review & approve        |
| david.clarke   | business owner  | Read, Review & approve              |
| jordan.mensah  | publisher       | Read, Review & approve, Publish     |
| super.admin    | site admin      | everything                          |
```

**Scenario 1 · Requesting publishing**

```gherkin
Given "Cash ISA" is "Ready to publish"
When I click "Request publishing" and choose 1 November at 09:00
Then the publishers get a task "Publish Cash ISA on 1 Nov 09:00"
```

**Scenario 2 · Live notification**

```gherkin
When the publisher publishes "Cash ISA"
Then I get the notification "Cash ISA is live"
```
