# EP-02 · Pages

| | |
|---|---|
| **Epic** | EP-02 · Pages |
| **Business benefit** | Pages are found, created and reorganised without broken links, lost work or accidental deletions, which protects customers from dead ends. Archive-before-delete and impact warnings remove a whole class of costly publishing incidents. |
| **Scope** | The site tree and safe page operations: find, create, organise, lock, archive and delete pages without breaking anything. |
| **Stories** | 8 |
| **Jira** | Issue type Epic · Team WPB Digital Browser: Tools |

## Stories in this epic

| # | Story | Persona | Depends on |
|---|---|---|---|
| 1 | [US-02.01 · Find any page in the market](#us-0201--find-any-page-in-the-market) | content author | US-01.07 |
| 2 | [US-02.02 · Create pages and folders from on-brand templates](#us-0202--create-pages-and-folders-from-on-brand-templates) | content author | US-02.01, US-06.03 |
| 3 | [US-02.03 · Know what an action will change before it happens](#us-0203--know-what-an-action-will-change-before-it-happens) | content author | — |
| 4 | [US-02.04 · Move and copy pages without breaking or overwriting anything](#us-0204--move-and-copy-pages-without-breaking-or-overwriting-anything) | content author | US-02.03, US-02.02 |
| 5 | [US-02.05 · Lock a page while I work on it](#us-0205--lock-a-page-while-i-work-on-it) | content author | US-02.03 |
| 6 | [US-02.06 · Override someone else's lock](#us-0206--override-someone-elses-lock) 🛡 | site admin | US-02.05 |
| 7 | [US-02.07 · Archive pages instead of deleting them](#us-0207--archive-pages-instead-of-deleting-them) | content author | — |
| 8 | [US-02.08 · See everything affected before deleting permanently](#us-0208--see-everything-affected-before-deleting-permanently) | content author | US-02.07, US-06.04, US-03.15 |

🛡 site-admin story · ⏭ planned, not built yet · 🧪 runs on a stand-in today (mock)

---

## US-02.01 · Find any page in the market

| | |
|---|---|
| **Story** | US-02.01 · Find any page in the market |
| **Business benefit** | Authors find the right page in seconds, which saves time on every task across all markets. Fewer duplicate pages get created because existing ones are easy to find. |
| **Persona** | content author |
| **Depends on** | US-01.07 |
| **Jira** | Issue type Story · Story type Functional · Sprint TBD · Team WPB Digital Browser: Tools |

**User story**

> As a content author  
> I want to browse the folder tree and search the whole market  
> So that I quickly find the page I need to work on  

**Acceptance criteria**

**Background** · applies to every scenario below

```gherkin
Given I am signed in to the "HSBC UK" market in "Production"
```

**Scenario 1 · Browsing folders**

```gherkin
When I open Pages
Then I see the folder tree on the left and the pages of the current folder in a table
And the table shows Name, Status, URL, Template and Updated
And translated pages show their locale and a "Source:" link
```

**Scenario 2 · Search across the market**

```gherkin
When I type "isa" into "Find a page by title or URL"
Then pages from every folder that match are listed
```

**Scenario 3 · Long folders load in parts**

```gherkin
Given a folder has 120 pages
Then 50 are shown with "Show 50 more"
```

---

## US-02.02 · Create pages and folders from on-brand templates

| | |
|---|---|
| **Story** | US-02.02 · Create pages and folders from on-brand templates |
| **Business benefit** | Every new page starts on-brand and market-appropriate, reducing rework and brand-compliance findings in review. Folder permissions keep teams from cluttering areas they do not own. |
| **Persona** | content author |
| **Depends on** | US-02.01, US-06.03 |
| **Jira** | Issue type Story · Story type Functional · Sprint TBD · Team WPB Digital Browser: Tools |

**User story**

> As a content author  
> I want to create folders and new pages from a template allowed in my market, where I have Edit  
> So that the site structure stays tidy and every page starts on-brand  

**Acceptance criteria**

**Background** · applies to every scenario below

```gherkin
Given I am signed in to the "HSBC UK" market in "Production"
```

**Scenario 1 · Creating a page**

```gherkin
When I click "New page"
And I enter the title "Regular saver"
Then the URL name becomes "regular-saver"
When I choose the "Product page" template and click "Create and open"
Then the page builder opens with the template's components
And the masthead heading says "Regular saver"
And I am the first author of the page
```

**Scenario 2 · Templates limited to other markets are not offered**

```gherkin
Given the "Rates page" template is for Hong Kong only
When I click "New page" in the UK market
Then "Rates page" is not in the template list
```

**Scenario 3 · Starting from the template library**

```gherkin
When I click "Use template" on "Campaign landing"
Then the New page dialog opens with "Campaign landing" chosen
```

**Scenario 4 · Creating a folder**

```gherkin
When I click "New folder" and enter "Insurance"
Then the folder "Insurance" appears in the tree
```

**Scenario 5 · Read-only folder**

```gherkin
Given I don't have Edit on "Borrowing"
Then the folder shows "Read-only in this folder"
And there is no "New page" or "New folder"
```

---

## US-02.03 · Know what an action will change before it happens

| | |
|---|---|
| **Story** | US-02.03 · Know what an action will change before it happens |
| **Business benefit** | Clear impact warnings prevent accidental changes to live pages and the customer complaints they cause. Showing only allowed actions also reduces support requests and permission errors. |
| **Persona** | content author |
| **Depends on** | — |
| **Jira** | Issue type Story · Story type Functional · Sprint TBD · Team WPB Digital Browser: Tools |

**User story**

> As a content author  
> I want to see only the actions I may take and a confirmation that explains their impact  
> So that I never change pages by accident  

**Acceptance criteria**

**Background** · applies to every scenario below

```gherkin
Given I am signed in with Edit on the "Banking" folder
```

**Scenario 1 · Confirmation with impact** *(one run per row of the table)*

```gherkin
When I choose "<action>" for "Cash ISA"
Then a confirmation explains "<impact>"

Examples:
  | action    | impact                                                                  |
  | Move      | the address changes and old bookmarks of live pages break               |
  | Copy      | copies are created as drafts with the same components                   |
  | Duplicate | a copy called "Cash ISA (copy)" appears in the same folder as a draft   |
  | Lock      | only you and site admins can change, move or delete it                  |
  | Restore   | each page goes back to its last saved version; the current one is kept  |
```

**Scenario 2 · Selection bar**

```gherkin
When I tick several pages
Then the bar offers Translate, Publish, Lock, Copy, Restore, Compare, Move, Archive and Delete with icons
And without Edit on every selected item only Translate and Publish are offered
```

---

## US-02.04 · Move and copy pages without breaking or overwriting anything

| | |
|---|---|
| **Story** | US-02.04 · Move and copy pages without breaking or overwriting anything |
| **Business benefit** | Reorganising the site no longer produces broken links that harm customer experience and search ranking. Colleagues' pages are never overwritten, avoiding lost work and rework. |
| **Persona** | content author |
| **Depends on** | US-02.03, US-02.02 |
| **Jira** | Issue type Story · Story type Functional · Sprint TBD · Team WPB Digital Browser: Tools |

**User story**

> As a content author  
> I want moves to update the links that point to a page and copies never to replace an existing page  
> So that reorganising the site never breaks links or someone else's work  

**Acceptance criteria**

**Background** · applies to every scenario below

```gherkin
Given I am signed in with Edit on the "Banking" folder
```

**Scenario 1 · Pages that link here are updated**

```gherkin
Given 2 pages link to "Cash ISA"
When I move "Cash ISA" to "Savings"
Then the confirmation lists the 2 pages
And "Update their links to the new address" is ticked
And after moving, their links point to the new address
```

**Scenario 2 · A folder cannot move into itself**

```gherkin
When I move "Banking" into "Banking/Savings"
Then that destination is not offered
```

**Scenario 3 · Moving to the same folder**

```gherkin
When I move pages to the folder they are already in
Then I see "They are already in that folder"
```

**Scenario 4 · Copying into the same folder**

```gherkin
When I copy "Cash ISA" into its own folder
Then the copy is called "cash-isa-copy" and titled "Cash ISA (copy)"
```

**Scenario 5 · Folders are not copied**

```gherkin
When I copy a selection that contains a folder
Then I see "Folders are not copied · pick pages"
```

---

## US-02.05 · Lock a page while I work on it

| | |
|---|---|
| **Story** | US-02.05 · Lock a page while I work on it |
| **Business benefit** | Locks prevent conflicting edits on sensitive pages while they are being prepared. Reviews and publishing continue, so the lock never delays time-critical releases. |
| **Persona** | content author |
| **Depends on** | US-02.03 |
| **Jira** | Issue type Story · Story type Functional · Sprint TBD · Team WPB Digital Browser: Tools |

**User story**

> As a content author  
> I want a page I locked to be changeable only by me or a site admin  
> So that nobody edits, moves or deletes it while it is mine  

**Acceptance criteria**

**Background** · applies to every scenario below

```gherkin
Given I am signed in with Edit on the "Banking" folder
```

**Scenario 1 · Someone else tries to edit a locked page**

```gherkin
Given "rachel.hughes" locked "Cash ISA"
When I edit, move or delete it
Then I see "Locked by Rachel Hughes" and "Ask them or a site admin to unlock it in Pages"
But reviews and publishing of the page still go on
```

**Scenario 2 · Unlocking someone else's lock**

```gherkin
When I try to unlock "Cash ISA" locked by "rachel.hughes"
Then I see "Cash ISA is locked by Rachel Hughes"
```

---

## US-02.06 · Override someone else's lock

*🛡*

| | |
|---|---|
| **Story** | US-02.06 · Override someone else's lock |
| **Business benefit** | Work is never blocked by an absent colleague, which protects deadlines for campaigns and regulatory updates. Keeping the override with site admins keeps it controlled and accountable. |
| **Persona** | site admin |
| **Depends on** | US-02.05 |
| **Jira** | Issue type Story · Story type Functional · Sprint TBD · Team WPB Digital Browser: Tools |

**User story**

> As a site admin  
> I want to change or unlock a page that someone else locked  
> So that work is not blocked when the person who locked it is unavailable  

**Acceptance criteria**

**Background** · applies to every scenario below

```gherkin
Given I am signed in with Edit on the "Banking" folder
```

**Scenario · A site admin unlocks someone else's lock**

```gherkin
Given "rachel.hughes" locked "Cash ISA"
And I am a site admin
When I unlock "Cash ISA" in Pages
Then the page is unlocked and can be changed, moved or deleted again
```

---

## US-02.07 · Archive pages instead of deleting them

| | |
|---|---|
| **Story** | US-02.07 · Archive pages instead of deleting them |
| **Business benefit** | Making archive the default removes the risk of permanently losing content that may be needed again or for record-keeping. Restoring is quick, saving the cost of rebuilding pages. |
| **Persona** | content author |
| **Depends on** | — |
| **Jira** | Issue type Story · Story type Functional · Sprint TBD · Team WPB Digital Browser: Tools |

**User story**

> As a content author  
> I want to archive pages I no longer need and restore them later  
> So that nothing is lost by mistake  

**Acceptance criteria**

**Background** · applies to every scenario below

```gherkin
Given I am signed in with Edit on the folder
```

**Scenario 1 · Delete always offers Archive first**

```gherkin
When I choose "Delete" for "Old offer"
Then I am asked "Archive “Old offer” instead of deleting?"
And "Archive" is the main button and "No, delete permanently…" the alternative
```

**Scenario 2 · Archiving a page**

```gherkin
When I archive "Old offer"
Then it leaves the page list, My tasks and search
And if it was live it goes offline
And it appears in "Archive · 1" at the bottom of the folder with who archived it and when
```

**Scenario 3 · Restoring from the archive**

```gherkin
When I click "Restore" on "Old offer" in the archive
Then it is back in the list as a draft
```

**Scenario 4 · Locked pages cannot be archived by others**

```gherkin
Given another person locked "Old offer"
When I archive it
Then I see that it is locked by them
```

---

## US-02.08 · See everything affected before deleting permanently

| | |
|---|---|
| **Story** | US-02.08 · See everything affected before deleting permanently |
| **Business benefit** | Showing every affected link and file before deletion prevents broken customer journeys and orphaned documents. Permanent deletion becomes a deliberate, documented decision. |
| **Persona** | content author |
| **Depends on** | US-02.07, US-06.04, US-03.15 |
| **Jira** | Issue type Story · Story type Functional · Sprint TBD · Team WPB Digital Browser: Tools |

**User story**

> As a content author  
> I want to see links, linked content, files and pages inside before I delete for good  
> So that broken links are visible before they happen  

**Acceptance criteria**

**Background** · applies to every scenario below

```gherkin
Given I am signed in with Edit on the folder
```

**Scenario 1 · References are checked**

```gherkin
Given 3 pages link to "Old offer"
And it shows the entity "ISA rates 2026" that is also on 2 other pages
And it uses the file "offer.pdf" that no other page uses
When I choose "No, delete permanently…"
Then I see "3 pages link here" with the list of pages
And "Linked content" says the entity is not deleted and is also on 2 other pages
And "Files used only here" lets me tick "offer.pdf" to delete it too
```

**Scenario 2 · Deleting a folder deletes the pages inside**

```gherkin
When I delete the folder "Campaigns 2025" with 4 pages, 1 of them live
Then I see "Everything inside is deleted too: 4 pages" and "1 live page goes offline"
And I must type "delete" to confirm
```

---

Source (Gherkin): [`gherkin/02-pages.feature`](gherkin/02-pages.feature) · Generated with `python3 tools/story-map.py` — edit the Gherkin file, then regenerate.
