# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> keyboard and shell >> command palette: combobox semantics, arrows, Escape restores focus
- Location: tests/e2e/a11y.spec.ts:7:7

# Error details

```
ReferenceError: CSS is not defined
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - link "Content Management" [ref=e4] [cursor=pointer]:
        - /url: /uk/prod/dashboard
      - combobox "Market" [ref=e7]:
        - option "🇬🇧 HSBC UK" [selected]
        - option "🇭🇰 HSBC Hong Kong"
        - option "🇸🇬 HSBC Singapore"
        - option "🇫🇷 HSBC France"
        - option "🇩🇪 HSBC Germany"
        - option "🇲🇽 HSBC Mexico"
        - option "🇦🇪 HSBC UAE"
      - combobox "Environment" [ref=e10]:
        - option "Development"
        - option "Test"
        - option "Staging"
        - option "Production" [selected]
      - generic [ref=e12]:
        - generic [ref=e13]: ⌕
        - textbox "Search" [ref=e14]:
          - /placeholder: Search pages, assets, people…
        - button "Open command palette" [ref=e15]: ⌘K
      - generic [ref=e16]:
        - button "Notifications, 6 unread" [ref=e18]:
          - generic [ref=e21]: "6"
        - 'button "Account: Jordan Mensah" [ref=e23]': JM
    - dialog "Command palette" [ref=e25]:
      - generic [ref=e26]:
        - generic [aria-hidden] [ref=e27]: ⌕
        - combobox "Command" [expanded] [active] [ref=e28]
        - generic [ref=e29]: esc
      - listbox "Results" [ref=e30]:
        - generic [ref=e31]:
          - heading "Pages" [level=6] [ref=e32]
          - option "Published Home /home" [ref=e33]:
            - generic [ref=e35]:
              - generic [ref=e36]: Published
              - text: Home
            - generic [ref=e37]: /home
        - option "Published Current accounts /banking/current-accounts" [selected] [ref=e39]:
          - generic [ref=e41]:
            - generic [ref=e42]: Published
            - text: Current accounts
          - generic [ref=e43]: /banking/current-accounts
        - option "Approved Cash ISA /banking/savings/cash-isa" [ref=e45]:
          - generic [ref=e47]:
            - generic [ref=e48]: Approved
            - text: Cash ISA
          - generic [ref=e49]: /banking/savings/cash-isa
        - option "Draft Fixed rate bonds /banking/savings/fixed-rate-bonds" [ref=e51]:
          - generic [ref=e53]:
            - generic [ref=e54]: Draft
            - text: Fixed rate bonds
          - generic [ref=e55]: /banking/savings/fixed-rate-bonds
        - option "Published Easy access saver /banking/savings/easy-access" [ref=e57]:
          - generic [ref=e59]:
            - generic [ref=e60]: Published
            - text: Easy access saver
          - generic [ref=e61]: /banking/savings/easy-access
        - option "Published Credit cards /borrowing/credit-cards/overview" [ref=e63]:
          - generic [ref=e65]:
            - generic [ref=e66]: Published
            - text: Credit cards
          - generic [ref=e67]: /borrowing/credit-cards/overview
        - generic [ref=e68]:
          - heading "Go to" [level=6] [ref=e69]
          - option "Dashboard" [ref=e70]
        - option "Pages" [ref=e73]
        - option "Assets" [ref=e76]
        - option "Content models" [ref=e79]
        - option "Templates" [ref=e82]
        - option "My tasks" [ref=e85]
        - option "API & delivery" [ref=e88]
        - option "Users & roles" [ref=e91]
        - option "Audit log" [ref=e94]
        - option "Repository (JCR)" [ref=e97]
      - generic [ref=e99]:
        - generic [ref=e100]: ↑↓ move
        - generic [ref=e101]: ↵ run
        - generic [ref=e102]: esc close
        - generic [ref=e103]: ⌘K toggles
    - generic [ref=e104]:
      - navigation "Main" [ref=e105]:
        - button "Collapse menu" [expanded] [ref=e106]
        - generic [ref=e109]:
          - heading "Content" [level=6] [ref=e110]
          - link "Dashboard" [ref=e111] [cursor=pointer]:
            - /url: /uk/prod/dashboard
          - link "Pages" [ref=e115] [cursor=pointer]:
            - /url: /uk/prod/pages
          - link "Assets" [ref=e119] [cursor=pointer]:
            - /url: /uk/prod/assets
          - link "Content models" [ref=e123] [cursor=pointer]:
            - /url: /uk/prod/models
          - link "Templates" [ref=e127] [cursor=pointer]:
            - /url: /uk/prod/templates
          - heading "Work" [level=6] [ref=e131]
          - link "My tasks" [ref=e132] [cursor=pointer]:
            - /url: /uk/prod/tasks
          - heading "Platform" [level=6] [ref=e136]
          - link "API & delivery" [ref=e137] [cursor=pointer]:
            - /url: /uk/prod/api
          - link "Users & roles" [ref=e141] [cursor=pointer]:
            - /url: /uk/prod/users
          - link "Audit log" [ref=e145] [cursor=pointer]:
            - /url: /uk/prod/audit
          - link "Repository (JCR)" [ref=e149] [cursor=pointer]:
            - /url: /uk/prod/repo
        - generic [ref=e153]:
          - generic [ref=e154]: 🇬🇧 HSBC UK
          - text: Production · en-GB, cy-GB
      - main [ref=e155]:
        - generic [ref=e156]:
          - generic [ref=e157]:
            - generic [aria-hidden] [ref=e158]: 🇬🇧
            - generic [ref=e159]:
              - heading "HSBC UK" [level=1] [ref=e160]
              - generic [ref=e161]:
                - generic [ref=e162]: hsbc.co.uk
                - text: · en-GB, cy-GB ·
                - generic [ref=e163]: Live on UCP
            - generic [ref=e164]:
              - generic [ref=e165]: Production
              - generic [ref=e167]: Publishing here goes live for customers.
              - generic [ref=e168]: "Backend: mock"
          - heading "What do you want to do?" [level=2] [ref=e169]
          - generic [ref=e170]:
            - link "＋ Create a page Pick a folder and a template. Takes under a minute." [ref=e171] [cursor=pointer]:
              - /url: /uk/prod/pages?new=1
              - generic [ref=e172]: ＋
              - generic [ref=e173]: Create a page
              - generic [ref=e174]: Pick a folder and a template. Takes under a minute.
            - link "▤ Edit a page Browse HSBC UK or search by title or URL." [ref=e175] [cursor=pointer]:
              - /url: /uk/prod/pages
              - generic [ref=e176]: ▤
              - generic [ref=e177]: Edit a page
              - generic [ref=e178]: Browse HSBC UK or search by title or URL.
            - link "✓ Review and approve 2 waiting for review, 1 ready to publish." [ref=e179] [cursor=pointer]:
              - /url: /uk/prod/tasks
              - generic [ref=e180]: ✓
              - generic [ref=e181]: Review and approve
              - generic [ref=e182]: 2 waiting for review, 1 ready to publish.
            - link "↑ Upload images or files Drag and drop, then use them on any page." [ref=e183] [cursor=pointer]:
              - /url: /uk/prod/assets
              - generic [ref=e184]: ↑
              - generic [ref=e185]: Upload images or files
              - generic [ref=e186]: Drag and drop, then use them on any page.
          - generic [ref=e187]:
            - link "Pages on HSBC UK 19 12 published · 3 in draft View pages ›" [ref=e188] [cursor=pointer]:
              - /url: /uk/prod/pages
              - generic [ref=e189]: Pages on HSBC UK
              - generic [ref=e190]: "19"
              - generic [ref=e191]: 12 published · 3 in draft
              - generic [ref=e192]: View pages ›
            - link "Waiting for review 2 Oldest waiting 0 days Open reviews ›" [ref=e193] [cursor=pointer]:
              - /url: /uk/prod/tasks?kind=Review
              - generic [ref=e194]: Waiting for review
              - generic [ref=e195]: "2"
              - generic [ref=e196]: Oldest waiting 0 days
              - generic [ref=e197]: Open reviews ›
            - link "Published 12 63% of the site is live See published pages ›" [ref=e198] [cursor=pointer]:
              - /url: /uk/prod/pages
              - generic [ref=e199]: Published
              - generic [ref=e200]: "12"
              - generic [ref=e201]: 63% of the site is live
              - generic [ref=e202]: See published pages ›
            - link "Delivery · Production 1 failed A publish failed and needs action Delivery details ›" [ref=e203] [cursor=pointer]:
              - /url: /uk/prod/api
              - generic [ref=e204]: Delivery · Production
              - generic [ref=e205]: 1 failed
              - generic [ref=e206]: A publish failed and needs action
              - generic [ref=e207]: Delivery details ›
          - generic [ref=e208]:
            - generic [ref=e209]:
              - heading "Content by status" [level=3] [ref=e210]
              - generic [ref=e211]:
                - img "Share of pages by status" [ref=e212]:
                  - 'generic "Published: 12" [ref=e213]'
                  - 'generic "Approved: 1" [ref=e214]'
                  - 'generic "In review: 2" [ref=e215]'
                  - 'generic "Scheduled: 1" [ref=e216]'
                  - 'generic "Draft: 2" [ref=e217]'
                  - 'generic "Publish failed: 1" [ref=e218]'
                - generic [ref=e219]: 19 pages in total
                - list [ref=e220]:
                  - listitem [ref=e221]:
                    - generic [ref=e223]: Published
                    - generic [ref=e226]: "12"
                    - generic [ref=e227]: 63%
                  - listitem [ref=e228]:
                    - generic [ref=e230]: Approved
                    - generic [ref=e233]: "1"
                    - generic [ref=e234]: 5%
                  - listitem [ref=e235]:
                    - generic [ref=e237]: In review
                    - generic [ref=e240]: "2"
                    - generic [ref=e241]: 11%
                  - listitem [ref=e242]:
                    - generic [ref=e244]: Scheduled
                    - generic [ref=e247]: "1"
                    - generic [ref=e248]: 5%
                  - listitem [ref=e249]:
                    - generic [ref=e251]: Draft
                    - generic [ref=e254]: "2"
                    - generic [ref=e255]: 11%
                  - listitem [ref=e256]:
                    - generic [ref=e258]: Publish failed
                    - generic [ref=e261]: "1"
                    - generic [ref=e262]: 5%
            - generic [ref=e263]:
              - heading "Content activity Last 30 days" [level=3] [ref=e264]:
                - text: Content activity
                - generic [ref=e265]: Last 30 days
              - generic [ref=e266]:
                - generic [ref=e267]:
                  - generic [ref=e268]:
                    - text: Pages published
                    - generic [ref=e270]: 1,482
                  - generic [ref=e271]:
                    - text: Pages created
                    - generic [ref=e273]: "502"
                  - generic [ref=e274]:
                    - text: Content updated
                    - generic [ref=e276]: "600"
                - img "Content activity over the last 30 days" [ref=e277]:
                  - generic [ref=e278]: "0"
                  - generic [ref=e280]: "50"
                  - generic [ref=e282]: "100"
                  - generic [ref=e284]: 25 Aug
                  - generic [ref=e285]: 1 Sept
                  - generic [ref=e286]: 8 Sept
                  - generic [ref=e287]: 15 Sept
                  - generic [ref=e288]: 22 Sept
                  - 'generic "Day 1: 47 published · 34 created · 18 updated" [ref=e297]'
                  - 'generic "Day 2: 47 published · 30 created · 20 updated" [ref=e302]'
                  - 'generic "Day 3: 52 published · 25 created · 18 updated" [ref=e307]'
                  - 'generic "Day 4: 49 published · 21 created · 22 updated" [ref=e312]'
                  - 'generic "Day 5: 52 published · 17 created · 22 updated" [ref=e317]'
                  - 'generic "Day 6: 47 published · 15 created · 18 updated" [ref=e322]'
                  - 'generic "Day 7: 47 published · 15 created · 20 updated" [ref=e327]'
                  - 'generic "Day 8: 52 published · 15 created · 18 updated" [ref=e332]'
                  - 'generic "Day 9: 49 published · 15 created · 22 updated" [ref=e337]'
                  - 'generic "Day 10: 52 published · 15 created · 22 updated" [ref=e342]'
                  - 'generic "Day 11: 47 published · 15 created · 18 updated" [ref=e347]'
                  - 'generic "Day 12: 47 published · 15 created · 20 updated" [ref=e352]'
                  - 'generic "Day 13: 52 published · 15 created · 18 updated" [ref=e357]'
                  - 'generic "Day 14: 49 published · 15 created · 22 updated" [ref=e362]'
                  - 'generic "Day 15: 52 published · 15 created · 22 updated" [ref=e367]'
                  - 'generic "Day 16: 47 published · 15 created · 18 updated" [ref=e372]'
                  - 'generic "Day 17: 47 published · 15 created · 20 updated" [ref=e377]'
                  - 'generic "Day 18: 52 published · 15 created · 18 updated" [ref=e382]'
                  - 'generic "Day 19: 49 published · 15 created · 22 updated" [ref=e387]'
                  - 'generic "Day 20: 52 published · 15 created · 22 updated" [ref=e392]'
                  - 'generic "Day 21: 47 published · 15 created · 18 updated" [ref=e397]'
                  - 'generic "Day 22: 47 published · 15 created · 20 updated" [ref=e402]'
                  - 'generic "Day 23: 52 published · 15 created · 18 updated" [ref=e407]'
                  - 'generic "Day 24: 49 published · 15 created · 22 updated" [ref=e412]'
                  - 'generic "Day 25: 52 published · 15 created · 22 updated" [ref=e417]'
                  - 'generic "Day 26: 47 published · 15 created · 18 updated" [ref=e422]'
                  - 'generic "Day 27: 47 published · 15 created · 20 updated" [ref=e427]'
                  - 'generic "Day 28: 52 published · 15 created · 18 updated" [ref=e432]'
                  - 'generic "Day 29: 49 published · 15 created · 22 updated" [ref=e437]'
                  - 'generic "Day 30: 52 published · 15 created · 22 updated" [ref=e442]'
          - generic [ref=e446]:
            - generic [ref=e447]:
              - heading "Pages by section" [level=3] [ref=e448]
              - list [ref=e449]:
                - listitem [ref=e450]:
                  - link "Borrowing 8" [ref=e451] [cursor=pointer]:
                    - /url: /uk/prod/pages/borrowing
                    - generic [ref=e452]: Borrowing
                    - generic [ref=e455]: "8"
                - listitem [ref=e456]:
                  - link "Banking 4" [ref=e457] [cursor=pointer]:
                    - /url: /uk/prod/pages/banking
                    - generic [ref=e458]: Banking
                    - generic [ref=e461]: "4"
                - listitem [ref=e462]:
                  - link "Investing 2" [ref=e463] [cursor=pointer]:
                    - /url: /uk/prod/pages/investing
                    - generic [ref=e464]: Investing
                    - generic [ref=e467]: "2"
                - listitem [ref=e468]:
                  - link "Help 2" [ref=e469] [cursor=pointer]:
                    - /url: /uk/prod/pages/help
                    - generic [ref=e470]: Help
                    - generic [ref=e473]: "2"
                - listitem [ref=e474]:
                  - link "Insurance 1" [ref=e475] [cursor=pointer]:
                    - /url: /uk/prod/pages/insurance
                    - generic [ref=e476]: Insurance
                    - generic [ref=e479]: "1"
                - listitem [ref=e480]:
                  - link "Campaigns 1" [ref=e481] [cursor=pointer]:
                    - /url: /uk/prod/pages/campaigns
                    - generic [ref=e482]: Campaigns
                    - generic [ref=e485]: "1"
            - generic [ref=e486]:
              - heading [level=3] [ref=e487]:
                - text: Your tasks
                - link "All tasks · 2 overdue" [ref=e488] [cursor=pointer]:
                  - /url: /uk/prod/tasks
              - list [ref=e489]:
                - listitem [ref=e490]:
                  - generic [ref=e491]: Publish
                  - 'link "Publish approved page: Cash ISA" [ref=e492] [cursor=pointer]':
                    - /url: /uk/prod/page/banking/savings/cash-isa
                  - generic [ref=e493]: 2 days overdue
                - listitem [ref=e494]:
                  - generic [ref=e495]: Check
                  - 'link "Check scheduled publish: Autumn rates campaign" [ref=e496] [cursor=pointer]':
                    - /url: /uk/prod/page/campaigns/autumn-rates
                  - generic [ref=e497]: 1 day overdue
                - listitem [ref=e498]:
                  - generic [ref=e499]: Finish
                  - 'link "Finish draft and send for review: Fixed rate bonds" [ref=e500] [cursor=pointer]':
                    - /url: /uk/prod/page/banking/savings/fixed-rate-bonds
                  - generic [ref=e501]: Due today
                - listitem [ref=e502]:
                  - generic [ref=e503]: Finish
                  - 'link "Finish draft and send for review: Credit-builder credit cards" [ref=e504] [cursor=pointer]':
                    - /url: /uk/prod/page/borrowing/credit-cards/credit-builder
                  - generic [ref=e505]: Due today
                - listitem [ref=e506]:
                  - generic [ref=e507]: Fix
                  - 'link "Fix failed publish: Mortgage rates" [ref=e508] [cursor=pointer]':
                    - /url: /uk/prod/page/borrowing/mortgages/rates
                  - generic [ref=e509]: Due today
          - generic [ref=e510]:
            - generic [ref=e511]:
              - heading [level=3] [ref=e512]:
                - text: Latest activity
                - link "Audit log" [ref=e513] [cursor=pointer]:
                  - /url: /uk/prod/audit
              - list [ref=e514]:
                - listitem [ref=e515]:
                  - generic [aria-hidden] [ref=e516]: JM
                  - generic [ref=e517]: Jordan Mensah signed in (SSO stand-in)
                  - generic [ref=e518]: 0 min ago
                - listitem [ref=e519]:
                  - generic [aria-hidden] [ref=e520]: JM
                  - generic [ref=e521]: Jordan Mensah edited 9 blocks on Rewards credit cards
                  - generic [ref=e522]: 0 min ago
                - listitem [ref=e523]:
                  - generic [aria-hidden] [ref=e524]: JM
                  - generic [ref=e525]: Jordan Mensah signed in (SSO stand-in)
                  - generic [ref=e526]: 1 min ago
                - listitem [ref=e527]:
                  - generic [aria-hidden] [ref=e528]: JM
                  - generic [ref=e529]: Jordan Mensah signed in (SSO stand-in)
                  - generic [ref=e530]: 1 min ago
                - listitem [ref=e531]:
                  - generic [aria-hidden] [ref=e532]: JM
                  - generic [ref=e533]: Jordan Mensah signed in (SSO stand-in)
                  - generic [ref=e534]: 1 min ago
            - generic [ref=e535]:
              - heading [level=3] [ref=e536]:
                - text: Recently edited on HSBC UK
                - link "All pages" [ref=e537] [cursor=pointer]:
                  - /url: /uk/prod/pages
              - list [ref=e538]:
                - listitem [ref=e539]:
                  - generic [ref=e540]: Published
                  - link "Home insurance" [ref=e541] [cursor=pointer]:
                    - /url: /uk/prod/page/insurance/home-insurance
                  - generic [ref=e542]: /insurance/home-insurance
                  - generic [ref=e543]: 2027-09-18
                - listitem [ref=e544]:
                  - generic [ref=e545]: Published
                  - link "Personal loans" [ref=e546] [cursor=pointer]:
                    - /url: /uk/prod/page/borrowing/loans/overview
                  - generic [ref=e547]: /borrowing/loans/overview
                  - generic [ref=e548]: 2027-09-18
                - listitem [ref=e549]:
                  - generic [ref=e550]: Published
                  - link "Credit cards" [ref=e551] [cursor=pointer]:
                    - /url: /uk/prod/page/borrowing/credit-cards/overview
                  - generic [ref=e552]: /borrowing/credit-cards/overview
                  - generic [ref=e553]: 2027-09-16
                - listitem [ref=e554]:
                  - generic [ref=e555]: Published
                  - link "Balance transfer credit cards" [ref=e556] [cursor=pointer]:
                    - /url: /uk/prod/page/borrowing/credit-cards/balance-transfer
                  - generic [ref=e557]: /borrowing/credit-cards/balance-transfer
                  - generic [ref=e558]: 2027-09-15
                - listitem [ref=e559]:
                  - generic [ref=e560]: Published
                  - link "Mortgages" [ref=e561] [cursor=pointer]:
                    - /url: /uk/prod/page/borrowing/mortgages/overview
                  - generic [ref=e562]: /borrowing/mortgages/overview
                  - generic [ref=e563]: 2027-09-14
                - listitem [ref=e564]:
                  - generic [ref=e565]: Publish failed
                  - link "Mortgage rates" [ref=e566] [cursor=pointer]:
                    - /url: /uk/prod/page/borrowing/mortgages/rates
                  - generic [ref=e567]: /borrowing/mortgages/rates
                  - generic [ref=e568]: 2027-09-12
  - button "Open Next.js Dev Tools" [ref=e574] [cursor=pointer]
  - alert [ref=e578]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { login, BASE } from "./helpers";
  3  | 
  4  | test.describe("keyboard and shell", () => {
  5  |   test.beforeEach(async ({ page }) => { await login(page, "jordan.mensah"); });
  6  | 
  7  |   test("command palette: combobox semantics, arrows, Escape restores focus", async ({ page }) => {
  8  |     await page.goto(`${BASE}/dashboard`);
  9  |     const opener = page.getByRole("link", { name: "Edit a page" });
  10 |     await opener.focus();
  11 |     await page.keyboard.press("Control+k");
  12 |     const box = page.getByRole("combobox", { name: "Command" });
  13 |     await expect(box).toBeFocused();
  14 |     const first = await box.getAttribute("aria-activedescendant");
  15 |     expect(first).toBeTruthy();
  16 |     await page.keyboard.press("ArrowDown");
  17 |     const second = await box.getAttribute("aria-activedescendant");
  18 |     expect(second).not.toBe(first);
> 19 |     await expect(page.locator(`#${CSS.escape(second!)}`)).toHaveAttribute("aria-selected", "true");
     |                                   ^ ReferenceError: CSS is not defined
  20 |     // Tab stays inside the dialog
  21 |     await page.keyboard.press("Tab");
  22 |     await expect(page.getByRole("dialog", { name: "Command palette" }).locator(":focus")).toHaveCount(1);
  23 |     await page.keyboard.press("Escape");
  24 |     await expect(page.getByRole("dialog", { name: "Command palette" })).toHaveCount(0);
  25 |     await expect(opener).toBeFocused();
  26 |   });
  27 | 
  28 |   test("side nav toggle exposes aria-expanded and collapses on tablet widths", async ({ page }) => {
  29 |     await page.goto(`${BASE}/dashboard`);
  30 |     const nav = page.getByRole("navigation", { name: "Main" });
  31 |     const toggle = nav.getByRole("button", { name: /Collapse menu|Expand menu/ });
  32 |     await expect(toggle).toHaveAttribute("aria-expanded", "true");
  33 |     await toggle.click();
  34 |     await expect(toggle).toHaveAttribute("aria-expanded", "false");
  35 |     await expect(nav).toHaveClass(/w-16/);
  36 |     await toggle.click();
  37 |     await expect(nav).toHaveClass(/w-\[264px\]/);
  38 |     await page.setViewportSize({ width: 1000, height: 800 });
  39 |     await expect(nav).toHaveClass(/w-16/);
  40 |     await expect(toggle).toHaveCount(0);
  41 |     await page.setViewportSize({ width: 1280, height: 800 });
  42 |     await expect(nav).toHaveClass(/w-\[264px\]/);
  43 |   });
  44 | 
  45 |   test("repository row menu is a keyboard-operable ARIA menu", async ({ page }) => {
  46 |     await page.goto(`${BASE}/repo`);
  47 |     const trigger = page.getByRole("button", { name: "⋯" }).first();
  48 |     await trigger.focus();
  49 |     await page.keyboard.press("ArrowDown");
  50 |     const menu = page.getByRole("menu");
  51 |     await expect(menu).toBeVisible();
  52 |     await expect(trigger).toHaveAttribute("aria-expanded", "true");
  53 |     await expect(menu.getByRole("menuitem", { name: "Copy path" })).toBeFocused();
  54 |     await page.keyboard.press("End");
  55 |     await expect(menu.getByRole("menuitem", { name: "Open in builder" })).toBeFocused();
  56 |     await page.keyboard.press("Home");
  57 |     await expect(menu.getByRole("menuitem", { name: "Copy path" })).toBeFocused();
  58 |     await page.keyboard.press("Escape");
  59 |     await expect(menu).toHaveCount(0);
  60 |     await expect(trigger).toBeFocused();
  61 |     await page.keyboard.press("Enter");
  62 |     await expect(page.getByRole("menu")).toBeVisible();
  63 |     await page.mouse.click(5, 5);
  64 |     await expect(page.getByRole("menu")).toHaveCount(0);
  65 |   });
  66 | });
  67 | 
```