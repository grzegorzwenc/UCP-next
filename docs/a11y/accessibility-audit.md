# Accessibility audit

Assessment of UCP-next as of 2026-10-29, on branch `UX-Parity`. Nothing in this document has been
fixed yet; it is a scope and a plan.

The central argument: **accessibility here splits into two tracks that fail differently, are owned
by different people, and need different tools.** Treating them as one list is why issues have been
surfacing one screen at a time.

| | Track A — Presentation | Track B — Semantics |
|---|---|---|
| What | Contrast, target size, focus visibility, motion, reflow, colour-as-only-signal | Names, roles, headings, landmarks, keyboard, state announcement, language |
| Lives in | `app/bdl/*.css`, `app/bdl/theme.css`, `app/globals.css` | Component markup and JS |
| Owned by | The design system | Whoever writes the component |
| Fails | Globally — one token, every screen | Per instance — each component on its own |
| Can be measured | **Yes, by computation** — see §6 | Only partly; the rest needs a browser and a person |
| Fix economics | Fix once, everything benefits | Fix n times, and it regresses as the app grows |

That asymmetry sets the priority order in §5.

## 1. Method, and what it does not cover

Static analysis of the 151 changed code files on this branch, plus the whole of `app/bdl/`:

- the `jsx-a11y` rules `eslint-config-next` enables, and hand-written pattern checks for the ones
  it does not (see §4 — this matters more than it sounds)
- computed WCAG 2.x contrast on every colour pair BDL declares and every pair this branch
  introduced (`docs/a11y/tools/`)
- computed target sizes from the declared padding and line-height

**Not covered.** No axe run, no focus-order walk, no screen-reader pass, no zoom/reflow check at
400%. The Playwright suite's one a11y spec covers the command palette and the sidebar only, and was
not run here (it spawns a dev server on :3100 in this directory, which Next 16 refuses alongside a
running one). Everything below is therefore a floor, not a ceiling: the categories that need a
browser are the ones most likely to hold further issues.

## 2. BDL is a faithful clone — and that is the finding

Worth settling first, because it determines who fixes what.

All **58 BDL tokens are byte-identical** to `hsbc-ucpmock/src/bdl/tokens.css`. The only value that
differs is the font-family name, which was renamed deliberately. The per-file diffs are the comment
stripping, nothing more. `app/bdl/theme.css` exists only here, but its values match their
`src/routes/layout.css` exactly — including their own note, which shows the ramp was chosen with
contrast in mind:

```css
--muted-foreground: #767676; /* BDL grey-4: 4.54:1 on white (AA); #7b7b7b was 4.23 */
```

So BDL is not drifting, and the contrast failures in §3a are **inherited, not introduced**. They
exist in the source project too and should be raised with whoever owns BDL rather than patched here.

**The structural finding: BDL ships no dark mode.** Zero `.dark` rules across all twelve files.
Every dark-mode behaviour in this app comes from `theme.css`'s `.dark` token block plus overrides
accumulated in `app/globals.css` — added reactively, one bug report at a time. That is the root
cause of the dark-mode defects found over the last week (badges rendering white-on-white, chips
unreadable on hover, "Scheduled" invisible against the card, the bulk bar in §3b). Each was a
symptom of the same absence. Until BDL has a dark layer of its own, the next one is already waiting.

## 3. Track A — presentation

### 3a. Inherited from BDL

| Measured | Where | Requirement |
|---|---|---|
| **4.09:1** | `app/bdl/tables.css:10` — `thead`, `#767676` on `#f3f3f3` | 4.5:1 (1.4.3) |
| **~1.65:1** | `app/bdl/alerts.css:48` — `.alert-warning .alert-icon`, amber `#ffbb33` on the alert's own `#fff8ea` | 3:1 as a meaningful graphic (1.4.11) |
| **No designed focus indicator** | `buttons.css`, `badges.css`, `tabs.css` | 2.4.7 |

On the third: only text inputs get a real ring (`outline: 2px solid var(--color-bdl-focus-blue)`,
`forms.css:24`). Buttons, chips and tabs define `:focus` as *a repeat of the hover colour*, which
is not an indicator — a keyboard user cannot tell focus from hover. It is also `:focus` rather than
`:focus-visible`, so a mouse click leaves the state stuck on. Nothing sets `outline: none`
anywhere, so the browser's own ring still draws and 2.4.7 is arguably met by accident; the point is
that it is by accident.

Two results that look like failures and are not: `.btn:disabled` at 3.64:1 (disabled controls are
exempt) and a white-on-white toggle label, which was the scanner missing the coloured track behind
it. Both are recorded here so they are not re-reported.

### 3b. Ours

| Measured | Where | Note |
|---|---|---|
| **1.10:1** | `components/explorer/Explorer.tsx:455` | The bulk-action bar hardcodes `color:#fff` on its buttons. The bar is `bg-foreground text-background`, so in dark mode the background becomes `#f1f4f8` and every button goes invisible. Separator 1.04:1, read-only note 1.06:1 |
| **1.61:1** | 18 uses of `border-line-2` across `components/explorer/*` | Wrong token. `--input` (`#929292`, **3.11:1**) is the one meant for control borders and is what shadcn's `Input` uses; `--border` (`#cccccc`) is a decorative divider. Affects the Pages search field, both date fields, the location trigger and the view toggle |
| **18px** | `app/globals.css:1284` — `.bdl-checkbox-sm` | Below the 24px minimum (2.5.8). BDL's own `.bdl-checkbox` is exactly 24px; this variant was added to fit a table row and undershot |
| **4.31:1** | `--ink-3` on `--surface-2`, 7 places in Explorer | Table header band and card headers. Same grey-on-grey pattern as §3a |
| **3.19:1** | `--ink-4`, 4 uses | Count numerals in `FolderList` and `ContentPicker` |

Everything else passes: `.btn-sm` 30px, `.btn-icon` 24px, `.bdl-chip` 26px, `.bdl-checkbox` 24px,
and all dark-mode steps of the status ramp (validated when they were chosen).

## 4. Track B — semantics

Twelve concerns, of which alt text is one. Status is what the checks in §6 can show.

| | Concern | Status |
|---|---|---|
| 1 | **Text alternatives** — `alt`, `aria-label` on icon-only controls, `aria-hidden` on decorative art | **OK** — 7/7 `<img>` have `alt`; icon buttons labelled; `PageThumb` is `aria-hidden` |
| 2 | **Accessible names** on every control | **OK** — inputs named by their wrapping `<label>` |
| 3 | **Roles & valid ARIA ownership** | **Gaps** — the palette's `role="listbox"` owns non-options (section headings, Clear all, per-row remove); `<th>` has no `scope` (0 of 8) |
| 4 | **Headings & landmarks** | **Gaps** — Pages has **no `h1`** since the title was removed, so its heading order starts at `h2`; the **primary sidebar is not a `<nav>`** (shadcn's `Sidebar` renders divs), so the only navigation landmarks are secondary ones — the breadcrumb, the folder path, the builder panel rails; **no skip link**. `<main>` is present via `SidebarInset` |
| 5 | **Keyboard operability** | **Probably OK in the new code, one known gap** — drag-and-drop has arrow keys, the palette traps Tab and restores focus. But four `<nav>` elements carry `onClick` to collapse a panel (`Builder.tsx:607,613`, `TemplateEditor.tsx:95,121`); `<nav>` is not interactive, so that gesture is pointer-only. Each rail does contain real buttons, so nothing is unreachable — the shortcut just is not. Beyond that, needs a manual tab-through; cannot be settled statically |
| 6 | **State & change announcement** | **Gaps** — `aria-pressed`/`expanded`/`current` are in place and there are 6 live regions, but `aria-sort` is missing from the sortable columns, **toasts carry no `role="status"`** so every confirmation is silent, and **client-side route changes are not announced** |
| 7 | **Forms & errors** | **Gap** — labels fine, `aria-invalid` used in the model dialogs, but **no `autocomplete` on sign-in** (1.3.5) |
| 8 | **Dialogs & overlays** | **OK now** — moving both modal shells onto Base UI's Dialog brought the focus trap, initial and returned focus, `aria-modal` and labelling. The hand-rolled `<div>` versions had none |
| 9 | **Language of parts** | **Gap, and specific to this product** — only the root `<html lang="en">`. This is a multi-market CMS: `cy-GB`, `fr-FR` and `zh-HK` titles and paths render with no `lang`, so a screen reader voices them in English (3.1.2) |
| 10 | **Link purpose & new windows** | **Minor** — 6 `target="_blank"` with no notice; each table row has two adjacent links to the same destination (thumbnail and title), which doubles the link count for AT. The source project does the same |
| 11 | **Data tables** | **Gap** — see 3 |
| 12 | **Page titles** | **OK** — per-section titles with a shared template |

Two that straddle the tracks and should be assigned deliberately: **reduced motion** (a CSS media
query, but ours is partly JS in `ActivityChart`, and the new Dialog animations are not guarded at
all) and **reading order** (DOM order against the grid's visual placement — currently sane, but a
future grid reshuffle can break it with no visible symptom).

## 5. The tooling gap, and the priority it implies

Track A can be computed on demand. Track B currently has **almost no automation**:

- `eslint-config-next` enables only `alt-text`, `aria-props`, `aria-proptypes`,
  `aria-unsupported-elements` and the role checks. `click-events-have-key-events`,
  `no-static-element-interactions` and `label-has-associated-control` are **off**. That is why lint
  reported zero findings on a branch where this audit found several by hand.
- No axe anywhere. One Playwright a11y spec, covering the palette and the sidebar; nothing runs
  against Pages, the dashboard or the builder.

So the order below is not by severity — it is by how much each step stops the problem recurring.

1. **A dark layer for BDL.** One `.dark` block per file in `app/bdl/`, replacing the patches
   accumulating in `globals.css`. Converts "the next dark-mode bug you spot" into a finished piece
   of work, and is portable back to `hsbc-ucpmock` since BDL is shared.
2. **Wire up the tooling.** Full `jsx-a11y` recommended set, plus `@axe-core/playwright` with one
   assertion per route in the existing suite. Moves most of Track B from "someone greps for it" to
   "CI fails the PR" — the only thing that keeps these fixed as the prototype grows.
3. **Our own defects**, §3b and the Track B gaps: the bulk bar, the border token (18 sites),
   `.bdl-checkbox-sm`, `aria-sort`, the listbox ownership, `th scope`, the missing `h1`, `<nav>` and
   skip link, `role="status"` on toasts, `autocomplete` on sign-in, `lang` on localised content.
4. **Raise §3a with the BDL owners.** The `thead` pair and the amber alert icon affect both
   projects; changing them here alone would be drift.

## 6. Reproducing the measurements

```bash
# Track A — every colour pair BDL declares, plus focus, dark-mode and outline checks
node docs/a11y/tools/bdl-audit.js

# Track A — the specific pairs this branch introduced, light and dark
node docs/a11y/tools/contrast.js

# Track B — the checks eslint does not make
grep -rnE '<(div|span|li|td|tr|p|section)[^>]*onClick' components app --include='*.tsx'   # keyboard
grep -rn '<img' components app --include='*.tsx' | grep -vc 'alt='                        # alt text
grep -c 'scope=' components/explorer/Explorer.tsx                                         # table headers
grep -rn 'aria-live\|role="status"' components app | wc -l                                # announcements
grep -rn 'lang=' components app --include='*.tsx' | wc -l                                 # language of parts
grep -rn 'border-line-2' components/explorer/*.tsx | wc -l                                # wrong border token
grep -rn '<nav' components app --include='*.tsx'                                            # navigation landmarks
grep -rn '<nav[^>]*onClick' components --include='*.tsx'                                     # handlers on non-interactive elements

# what eslint is actually checking for a11y
npx eslint app components lib 2>/dev/null | grep -iE 'a11y|aria|alt-text|role'
```

`bdl-audit.js` parses `tokens.css` and `theme.css` into a resolvable variable map, then walks each
BDL component file for rules that set both a colour and a background, resolves the `var()` chains
and computes the ratio. Rules that set only a colour are evaluated against the page surface, which
is why the toggle false positive in §3a appears — read its output with that in mind.

## 7. Caveats

- Contrast is computed from declared values. Anything composited at runtime — opacity, blend modes,
  an image behind text — is not covered. The `PageThumb` wireframes draw neutral greys on white by
  design and were not assessed as content.
- Target sizes are computed from padding and line-height, not measured in a browser. Line-height
  rounding can move them a pixel either way; the 18px and 24px figures are far enough from the
  threshold to stand.
- Track B status is "what the checks can see". Items 5 and 6 in §4 in particular need a real
  screen-reader pass before being called done.
