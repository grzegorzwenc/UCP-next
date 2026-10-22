# UI consistency audit

Audit of the authoring UI as it stands on `main` at `8c6265b`, written for the `UX-Parity` branch.

The product logic, the repository port and the workflow rules are sound (see [../spec/README.md](../spec/README.md)).
This document is only about the **presentation layer**, where the same decision was made several times
in several places and never reconciled. Each finding is a measurement, not an opinion: section 9 lists the
command that produced every number so they can be re-run after a fix.

Targets are not invented. They are measured from `hsbc-ucpmock`, the SvelteKit UX prototype of the same
product, which is used throughout as the benchmark — see section 2.

**One sentence:** a complete design-token system exists and is then bypassed by components that were
built independently of it.

## 1. The numbers

| Measure | This repo | `hsbc-ucpmock` | Target |
|---|---|---|---|
| Distinct font sizes (`text-[Npx]`) | 23 — including 9.5 / 10.5 / 11.5 / 12.5 / 13.5 / 14.5px | **3** (10, 11, 13px) | 6 |
| Files containing hard-coded hex | 28 (139 occurrences) | **1** — and it is the style-guide screen, which displays the swatches | 0 outside the site-render layer |
| `cursor-pointer` vs `onClick` handlers | 26 + 7 CSS rules vs 434 | **432 vs 370** | every clickable |
| `:active` press states | 0 | **39** | all pressable elements |
| `hover:` classes behind `@media (hover: hover)` | 0 of 210 | — not measured | all of them |
| Accent-edge treatments | 4 (1px, 2px, 3px, 5px; border and inset shadow) | — not measured | 1 |
| Monospace usages | 110 across 32 files | **62** | ~15 (paths, routes, tokens, request ids) |
| `✨` emoji | 14 | **0** | 0 |
| Hand-rolled modal overlays | 14 independent re-implementations | 13 files, but 2 are `dialog-overlay` / `sheet-overlay` primitives everything else composes | 1 primitive |
| `z-index` tiers | 16 (`z-[4]` … `z-[90]`) | — not measured | 5 named layers |
| Status → label maps | 6, with drifting wording | — not measured | 1 |
| Swallowed errors (`.catch(() => {})`, `catch {}`) | 31 | — not measured | reviewed case by case |
| Lines over 300 / 500 characters | 762 / 148 (longest 1,754) | **127 / 19** | — |

### Withdrawn finding

An earlier draft counted `·` used as a copy separator (350 occurrences) as a defect. `hsbc-ucpmock`
contains **419** — more, in a smaller surface — so it is house style, not drift. Removed.

## 2. Benchmark: what `hsbc-ucpmock` proves

`/Users/leon/Git/hsbc-ucpmock` is a SvelteKit 2 / Svelte 5 prototype of the same product: ~40,000 lines
of `src`, a broader feature surface (email template builder, experience fragments, taxonomy types, SSG
admin, operation log, entitlement wizard, global search, guided tours), real HSBC Univers Next fonts and
10,616 lines of i18n messages.

Its presentation layer scores an order of magnitude better on every metric above, and the cause is
structural rather than a matter of care:

| It has | This repo has |
|---|---|
| `src/bdl/` — 15 tokenised CSS files (tokens, base, buttons, cards, forms, modals, tables, tabs, badges, alerts, animations, icons, utilities, fonts) plus `ICONS.md` | one 209-line `app/globals.css` |
| `shadcn-svelte` + `bits-ui` — 155 vendored primitives, 7 HSBC-specific | no primitive library; every component hand-rolled |
| A `/bdl` style-guide route that renders the system, making drift visible | no style guide |
| `tailwind-variants` enforcing variants per component | ad-hoc class strings |

**The lesson is layer discipline, not framework choice.** `hsbc-ucpmock` has the same disease in a
different layer: its own `docs/consistency-review-findings.md` records two PRNG families duplicated
6× and 5×, `slug()` 4×, `pick()` 9× with signature drift, nine files declaring their own people roster
with conflicting staff IDs, 18 stale hardcoded counts, and three label maps for one concept. Its data
layer is undisciplined and its UI is not; here it is the other way round.

### Why staying on React is still right

`hsbc-ucpmock/docs/ucp-real-architecture.md` documents the **real** HSBC platform built by the Hong
Kong team: `uce-service` (Java 21 / Spring Boot / DocumentDB / S3) behind `uce-ui` — **React 19 +
MUI + Redux Toolkit + Vite**. This prototype's React stack is closer to the real frontend than the
Svelte prototype is; what it lacks is the design system, which is portable. That is this plan.

## 3. Colour

`app/globals.css` declares 30 tokens and maps them into Tailwind through `@theme inline`. TSX then
hard-codes past them, including values that are near-duplicates of the tokens themselves.

| Token | Hard-coded near-duplicates found in `.tsx` |
|---|---|
| `--accent: #DB0011` | `#DB0011` ×20, `#AF000D`, `#A8000B`, `#83000A` |
| `--good: #00847F` | `#0F8A7E`, `#3FBDB7`, `#7FD1A8` |
| `--warn: #E9A23B` | `#F5B544`, `#F9CC5C`, `#F5B82E`, `#F5A623`, `#B7791F`, `#B35900`, `#8A5A00` |
| `--ink-4: #9DA1AC` | `#8A9096`, `#8A8F99`, `#6B6F7A`, `#D7D8DC`, `#DFE3EA`, `#B8BFCC`, `#E9E9EC`, `#E6E8EA` |
| `--review: #376798` | `#376798` hard-coded in both CSS and TSX |

Seven ambers exist where one token is defined.

Worst offenders by count: `components/models/ModelMap.tsx` (35), `lib/ui/celebrate.ts` (15),
`components/ui/Icons.tsx` (11), `components/shell/TopBar.tsx` (10), `components/builder/Builder.tsx` (8).

**Root cause for the icons:** `components/ui/Icons.tsx` bakes `stroke="#8A9096"` and `fill="#fff"` *inside*
the SVG paths, so an icon cannot be recoloured by its context. Every screen that needed a different
icon colour hard-coded one instead.

### Out of scope — deliberate, do not "fix"

`app/globals.css` lines 65–158 (`.site`, `.hs-*`, `.s-*`, `.cardv`) replicate the rendered
hsbc.co.uk page inside the builder canvas. Those raw hex values are HSBC brand colours of the
**published site**, not CMS chrome, and must not be swapped for CMS theme tokens. Keeping the two
colour universes separate is correct; the defect is leakage out of the site layer into the chrome.

## 4. Typography

23 distinct font sizes, set with Tailwind arbitrary values rather than a scale:

```
234 × text-[13px]     170 × text-[12.5px]   138 × text-[12px]
101 × text-[11.5px]    83 × text-[11px]      73 × text-[13.5px]
 45 × text-[10.5px]    23 × text-[15px]      18 × text-[14px]
 … plus 9px, 9.5px, 10px, 14.5px, 16px, 17px, 18px, 20px, 22px, 26px, 28px, 34px, 40px, 44px
```

`globals.css` adds 12.5px, 11.5px, 13.5px, 10.5px and a 6px rule of its own.

The half-pixel steps are the tell: nothing distinguishes 12.5px from 13px to a reader, so the two
coexist only because they were chosen in separate sittings. `hsbc-ucpmock` ships the same product
surface on three sizes.

The radius scale has the same problem — `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`,
`rounded-xl`, `rounded-2xl`, `rounded-[2px]` and `rounded-[10px]` are all in use, plus eight radius
values in CSS.

## 5. Monospace

IBM Plex Mono is loaded in `app/layout.tsx` and used 110 times across 32 files. It earns its place for
JCR paths, API routes, `{{alias.field}}` tokens and request ids. These uses do not:

| Mono applied to | Location |
|---|---|
| Audit-log timestamps | `components/audit/AuditLog.tsx:63` |
| A field **count** in a table cell | `components/models/Models.tsx:145` |
| Version numbers (`v3`) | `components/models/Models.tsx:230` |
| A character counter | `components/entities/EntityEditor.tsx:72` |
| A drag-handle glyph | `components/models/FieldEditor.tsx:52` |
| The work e-mail input | `components/users/Users.tsx:122` |
| Folder-name input | `components/assets/AssetLibrary.tsx:167` |
| Image dimensions (`1200×630`) | `components/assets/AssetLibrary.tsx:147` |
| Every input in the Translate dialog | `components/builder/TranslateModal.tsx:12` |

Monospace reads as "this is a machine value you may need to copy exactly". Applied to a count or a
name field it says the opposite of what is true, and it costs legibility at 11px.

## 6. Accent edges

Four different treatments for one idea — "this element is the active or accented one":

| Treatment | Where |
|---|---|
| `box-shadow: inset 0 -3px 0 var(--accent)` | `app/globals.css:58` (`.btn.on`) |
| `border-l-[5px] border-l-accent` | `app/(cms)/[market]/[env]/dashboard/page.tsx:61` |
| `border-l-2 border-accent` | `components/builder/PageComments.tsx:41` |
| `box-shadow: inset 0 -1px 0 rgba(55,103,152,.55)` | `app/globals.css:96` (`.tok`) |

Three widths, two mechanisms, two sides. Tab underlines in `components/models/Models.tsx:197`,
`components/api/ApiExplorer.tsx:49` and `components/tasks/Tasks.tsx:226` add further variants.

## 7. Motion and interaction

Measured against the press / hover / easing expectations of a polished UI.

| Issue | Evidence | Fix |
|---|---|---|
| No press feedback anywhere | 0 `:active` states against 434 `onClick` handlers (`hsbc-ucpmock` has 39) | `.btn:active { transform: scale(.97) }`, 160ms `ease-out` |
| Hover sticks on touch | 210 `hover:` classes, 0 `@media (hover: hover) and (pointer: fine)` guards | wrap hover rules in the media query |
| Pointer cursor missing off `.btn` | Tailwind v4 preflight (`node_modules/tailwindcss/preflight.css:377`) sets `appearance: button` but **not** `cursor: pointer`. `.btn` has it; every clickable row, card, tab and tree node does not | `cursor-pointer` at source on every interactive element |
| No easing curves | `transition: transform .15s` and `transition: opacity .15s` carry no easing; `transition-all` used 3× | name the curve, e.g. `cubic-bezier(0.23, 1, 0.32, 1)`; never animate `all` |
| Over-long animation | `animation: cmt-flash 1.4s` (`app/globals.css:179`) | ≤300ms for UI feedback |
| Two durations for one concept | `cmt-card-in` declared at `.2s` (`:190`) and `.22s` (`:197`) | one token |
| `prefers-reduced-motion` partly honoured | `app/globals.css:198` covers `cmt-card-in`; `cmt-flash` (`:178`) is not. The confetti in `lib/ui/celebrate.ts:10` does check it correctly | cover `cmt-flash` too |

Adopting Radix primitives (section 10, Phase 0) resolves rows 1, 3 and most of 2 as a side effect,
because the primitives own press, focus and pointer behaviour.

## 8. Duplication and structure

**Byte-identical code in two files.** `STATUS_WORD` is the same map, same strings, in
`components/models/UsedOn.tsx:8` and `components/assets/AssetLibrary.tsx:45`.

**One vocabulary, six encodings,** with wording that has drifted between them:

| Map | File |
|---|---|
| `LABEL` | `components/ui/Pill.tsx:1` |
| `STATUS_WORD` | `components/models/UsedOn.tsx:8` |
| `STATUS_WORD` | `components/assets/AssetLibrary.tsx:45` |
| `STATUS_TEXT` | `app/api/repo/[...op]/route.ts:31` |
| `STAGE_LABEL` | `lib/server/ucp.ts:265` |
| `STEPS` | `components/builder/Builder.tsx:58` |

This is why 25 of 194 commits are re-wordings of copy set in an earlier commit.

**Helpers redefined rather than shared:** `slug` in 5 files, `cls` in 5, `inputCls` in 4, `str` in 4,
`initials` in 2, `fmt` in 2, `lbl` in 2.

**`components/models/ModalShell.tsx` exists**, and 13 other components still hand-roll their own
`fixed inset-0` overlay: `shell/Palette`, `shell/SideNav`, `explorer/Explorer`, `review/DecisionOverlay`,
`users/Users`, `templates/TemplateLibrary`, `builder/VersionHistory`, `builder/SendForReview`,
`builder/TranslateModal`, `builder/Authors`, `builder/AssetPicker`, `assets/AssetLibrary`,
`pages/CompareView`. Each brings its own z-index, backdrop, focus handling and escape key.

**Emoji in a codebase with an icon system:** `✨` 14× (`components/builder/Builder.tsx` ×9,
`components/shell/Palette.tsx` ×3, `components/builder/TranslateModal.tsx`) and `📁` at
`components/explorer/Explorer.tsx:313`, which sits next to an unused `<FolderIcon />`.

**`components/builder/Builder.tsx`**: 841 lines, ~50 `useState` calls, several of which exist only to
suppress an effect (`shellSeen`, `lockedSeen`, `reviewSeen`, `previewed`, `previewCheck`). It was
touched in 88 of the repository's 194 commits — 45% of all work lands in one file.

## 9. Reproducing the measurements

Run from the repository root; re-run after each phase to check progress. The same commands run
against `hsbc-ucpmock` with `--include='*.svelte'` produce the benchmark column in section 1.

```bash
# font sizes
grep -rhoE 'text-\[[0-9.]+px\]' --include='*.tsx' app components | sort | uniq -c | sort -rn

# hard-coded hex in TSX
grep -rhoE '#[0-9a-fA-F]{6}\b' --include='*.tsx' --include='*.ts' app components lib \
  | tr 'a-f' 'A-F' | sort | uniq -c | sort -rn

# clickables vs pointer cursor
grep -rho 'onClick=' --include='*.tsx' app components | wc -l
grep -rho 'cursor-pointer' --include='*.tsx' app components | wc -l

# press states and hover guards
grep -rn ':active' --include='*.tsx' --include='*.css' app components | wc -l
grep -c '@media (hover' app/globals.css

# monospace usage
grep -rco 'font-mono' --include='*.tsx' app components | grep -v ':0' | sort -t: -k2 -rn

# modal overlays and z-index tiers
grep -rc 'fixed inset-0' --include='*.tsx' app components | grep -v ':0'
grep -rhoE 'z-\[?[0-9]+\]?' --include='*.tsx' app components | sort | uniq -c | sort -rn

# line density
awk 'length>300 {c++} END {print c}' $(find app components lib -name '*.tsx' -o -name '*.ts')
```

## 10. Remediation plan

The plan is **adopt a system that already works**, not invent one. `shadcn/ui` supplies the primitives,
`hsbc-ucpmock/src/bdl` supplies the tokens.

### Phase 0 — shadcn/ui (precondition for everything else)

`shadcn/ui` is the **original React** library; `shadcn-svelte` in `hsbc-ucpmock` is the community port
of it. Both descend from the same designs: the React side sits on Radix UI, the Svelte side on
`bits-ui`. Moving here is moving upstream, not switching ecosystems.

| `hsbc-ucpmock` | Here |
|---|---|
| `shadcn-svelte` | `shadcn/ui` |
| `bits-ui` | `@radix-ui/*` |
| `tailwind-variants` | `class-variance-authority` |
| `@lucide/svelte` | `lucide-react` |
| `@tanstack/table-core` | `@tanstack/react-table` |
| `tailwind-merge` + `clsx` | identical packages |

This repo already satisfies every precondition: Tailwind v4, React 19, the `@/*` alias in
`tsconfig.json`, and `globals.css` is already written with `@theme inline`. Only `components.json`
is missing, which `init` creates. Per the shadcn docs, Tailwind v4 + React 19 support is complete and
was shipped as a non-breaking change.

**Done.** Installed with `shadcn@latest init --base base --preset nova --pointer --css-variables`,
then `add sidebar dropdown-menu` (which pulled button, input, separator, sheet, skeleton, tooltip
and `hooks/use-mobile.ts`). Three things worth recording:

1. **`init` is destructive on an existing themed project — review its diff.** It rewrote
   `app/layout.tsx` to load **Geist** as `--font-sans`, undoing the Univers Next switch, and it
   **overwrote `--accent`** — HSBC red `#DB0011` — with its own `oklch(0.97 0 0)`, a near-white
   hover grey. 301 call sites depend on that token being red (`bg-accent` 70, `text-accent` 39,
   `border-accent` 28, `var(--accent)` 28, `.btn-primary` 71, `.btn-next` 21, `accent-soft` 46,
   `accent-hover` 19). Both edits were reverted; everything else from `init` was kept.
2. **The `--accent` clash is resolved by scoping, not renaming.** UCP means HSBC red by it, shadcn
   means "subtle hover background". Red keeps the global name; shadcn's meaning is scoped in
   `app/globals.css` to `[data-slot^="dropdown-menu"]`, the only installed component that uses
   `bg-accent`. Custom properties inherit, so portalled menu content is covered. A proper rename
   (UCP's brand token → `--brand`) stays available later but was not needed to unblock this.
3. **shadcn's OKLCH defaults are not used.** A bridge block in `app/globals.css` maps its semantic
   tokens (`--background`, `--muted`, `--border`, `--sidebar*`, `--radius`, …) onto the existing UCP
   and BDL values, so one palette drives both and the sidebar inherits HSBC colour. `--primary` is
   HSBC red. `@theme inline` substitutes these directly into utilities, which is why
   `--color-sidebar-*` never appears in the built CSS while `.bg-sidebar{background-color:var(--sidebar)}`
   does — that is correct, not a broken import.

- [x] **Avoided the filename collision.** The working filesystem is
      case-insensitive (verified: creating `Avatar.tsx` then `avatar.tsx` yields one file), and
      `components/ui/` already holds `Avatar.tsx` and `Skeleton.tsx`. `components.json` therefore sets
      `"aliases": { "ui": "@/components/shadcn" }`, so the two systems stay visibly separate and
      nothing was overwritten.
- [ ] Remember that `shadcn add` **overwrites local edits** when re-run on an existing component.
      Treat every added file as owned by this repo from the moment it lands.

Coverage check against `hsbc-ucpmock`: every `ui/` component it uses exists upstream, **including
`sidebar` and the TanStack-based `data-table`**. The one exception is `range-calendar`, which is a
`bits-ui` component — React uses `<Calendar mode="range">` backed by `react-day-picker` instead of
`@internationalized/date`.

### Phase 1 — Clone the BDL library

BDL is framework-agnostic: plain CSS plus Tailwind v4 `@theme`. It clones with almost no edits, so
files under `app/bdl/` are kept as close to `hsbc-ucpmock/src/bdl/` as possible — prefer changing
them there and re-cloning over editing in place. `hsbc-ucpmock` is read-only in this work.

**One deliberate divergence.** In the source the UI face is declared as `'Bapi Sans'`, a label
inherited from the HSBC FQDN Scanner project that BDL was first written for. The files are
Univers Next for HSBC — confirmed by parsing the woff name tables: `Univers Next for HSBC W01
Rg/Md/Bd/Lt` with `usWeightClass` 400/500/700/300. `app/bdl/fonts.css` and `app/bdl/tokens.css`
therefore name the family `'Univers Next for HSBC'`. A re-clone will reintroduce the old label;
keep the rename. The weight classes also independently confirm there is **no 600 face**.

**Stage A — done.** Additive only, verified to change nothing visually:

- [x] `app/bdl/tokens.css` and `app/bdl/fonts.css` cloned, plus `ICONS.md` as reference. Only the
      font-family rename above differs from source
- [x] The four Univers Next woff files cloned to `public/fonts/`. BDL's `fonts.css` already
      references `/fonts/…` — SvelteKit serves that from `static/`, Next from `public/` — so the
      stylesheet needed **no path edits**
- [x] `app/bdl.css` added as the staged entry, mirroring `hsbc-ucpmock/src/bdl.css`, with the other
      twelve layers listed but commented out
- [x] Imported from `app/globals.css` immediately after `@import "tailwindcss"`
- [x] **Univers Next is live.** Google Archivo removed from `app/layout.tsx` and the `--font-sans`
      override deleted from `app/globals.css`, so the app renders the real HSBC face. Verified in
      the production bundle: `--font-sans: "Univers Next for HSBC", "Univers", Arial, Helvetica,
      sans-serif`, one `@font-face` family, all four woff files referenced, no Archivo anywhere,
      `tsc --noEmit` clean

**Two findings from Stage A, both load-bearing for later stages:**

1. **Tailwind v4 tree-shakes `@theme` variables, and the shaking is `var()`-aware.** With only
   tokens imported, **zero** `--color-bdl-*` variables reach the bundle, because nothing references
   them yet. Probing with `base.css` enabled emitted exactly the 7 tokens it uses via `var()` and no
   others. So plain `@theme` is correct and `@theme static` is unnecessary — but do not read an absent
   variable in the built CSS as a broken import.
2. **There is no 600 weight, and `font-semibold` is used 199 times.** The face ships 300/400/500/700
   (`usWeightClass` confirmed from the files). Per the CSS font-matching algorithm, a target weight
   ≥ 600 checks weights ≥ target in ascending order first, so `font-weight: 600` resolves to the real
   **700 Bold** face — it is *not* synthesised faux-bold. The consequence is therefore cosmetic
   rather than broken: 199 places render heavier than intended, against 65 `font-medium`, 17
   `font-bold` and 1 `font-light`.

**Theme — done.** `app/bdl/theme.css` is cloned from `hsbc-ucpmock/src/routes/layout.css`
(lines 6–141): the `dark` custom variant, the light `:root` set and the `.dark` set, plus the
`@theme inline` mappings. It supersedes the bridge block that was hand-written during Phase 0.
What came with it:

- `--radius: 0` — BDL is square-cornered. Note the mismatch this exposes: `app/globals.css`
  still hard-codes `border-radius: 8px` on `.btn`, so hand-rolled buttons are rounded while
  shadcn components are square. Pick one during Phase 4.
- Sidebar tokens shadcn does not define: `--sidebar-footer`, `--sidebar-active`,
  `--sidebar-active-hover`, `--sidebar-active-bar`. The selected-row idiom (2px red inset bar,
  faint red tint, medium weight, deeper tint on hover, tint-only when collapsed) is ported into
  `app/globals.css`. One adaptation: Base UI marks boolean state by attribute presence
  (`data-active=""`) where the Svelte build used `data-active="true"`; the `data-sidebar` hooks
  are identical, so the selectors otherwise port verbatim.
- The footer user strip uses `bg-(--sidebar-footer)`, as in the source.

**Theme switcher — done.** It lives in the sidebar's user menu (Sun/Moon), exactly where
`hsbc-ucpmock/src/lib/components/nav-user.svelte` puts it: toggles `.dark` on
`document.documentElement` and writes `localStorage.theme`. A blocking inline script in
`app/layout.tsx` applies the saved theme before first paint so dark never flashes light — the
Next equivalent of the source project's `app.html` head script. `<html>` carries
`suppressHydrationWarning` because that script mutates it before React hydrates.

**Shell alignment pass.** Laid out like the source project's app header: sidebar trigger, a
vertical rule, then the breadcrumb, with search on the right.

- `lib/nav.ts` is now the single list of sections. The sidebar renders it and the breadcrumb
  resolves labels from it; before this the labels existed twice and would have drifted.
- The HSBC mark in the sidebar header is the **hexagon only** (`public/hsbc-hexagon.svg`, cloned
  from the source project) — `public/hsbc-logo.svg` is the full masterbrand lockup, whose wordmark
  is unreadable at 32px. The mark is no longer repeated in the top bar.
- Environment moved into the user menu, as its second line with the colour dot, so it is still
  readable at a glance without occupying a top-bar slot.
- Search is a fixed ~18rem field instead of stretching to fill the bar.
- **Sidebar border fix:** the installed `sidebar.tsx` applies `group-data-[side=left]:border-r`
  with no colour class, so Tailwind falls back to `currentColor` and the right edge rendered as a
  near-black stroke against `#333` text. `app/globals.css` sets
  `border-color: var(--sidebar-border)` (#d7d8d6) on the container — done in CSS, not in the
  component, so `shadcn add` cannot overwrite it.

**Top bar is now light**, on `bg-background` with a `border-b`, matching the source project's
header. Every `#0F1013` / `text-white` / `bg-white/10` class in `TopBar.tsx` is gone; the unread
badge keeps `bg-accent` (HSBC red) with white text on purpose. Search and notifications now sit
together on the right, and search is ~16rem rather than stretching.

**The dashboard's market/environment box is removed** (flag, domain, locales, status pill, and the
"Publishing here goes live for customers." line). That copy now lives as data on each environment
(`note` on `Env` in `lib/markets.ts`, so it is no longer an inline ternary) and surfaces as a
tooltip on the environment line in the sidebar's user menu, plus `title` text on each environment
in that menu. `TooltipProvider` is mounted in the CMS layout — the collapsed-rail tooltips needed
it too.

**One delta from the source project remains:** the header is a fixed 52px rather than `h-16`
shrinking to `h-12` with the sidebar.

**Dark mode is defined but inert.** The tokens and the `dark` variant are in place, but nothing
in this app adds the `.dark` class — there is no theme switcher. Wiring one (and deciding whether
it follows `prefers-color-scheme` or is an explicit preference) is a separate piece of work.

**Load jitter — fixed.** The UI face was declared with BDL's plain `@font-face` and
`font-display: swap`, with no preload, so the page painted in Arial and every line reflowed when
Univers arrived. `app/layout.tsx` now loads it through `next/font/local` with
`adjustFontFallback: "Arial"`, which emits a metric-matched fallback (verified:
`size-adjust: 105.83%`) so the swap no longer changes metrics, and preloads the file in
production. `app/bdl/fonts.css` is therefore **not imported** — importing both would fetch the
same four files under a second family name — and `--font-sans` points at the generated family.
This is the one place where diverging from the clone was worth it.

**`components/ui/ActionCard.tsx`** extracts the "start something" card (icon tile, wiggle on
hover, "Explore →" reveal, optional filled-red `primary`) so section landings can reuse it
instead of the markup living inline in the dashboard.

**Stage B — remaining:**

- [ ] Sweep the 199 `font-semibold` uses. Default to `font-medium` (500) for UI text — table headers,
      card titles, labels — and keep `font-bold` (700) only where genuine emphasis is wanted. Doing
      nothing leaves them at 700, which is legible but heavy
- [ ] Consider `next/font/local` instead of the cloned `@font-face`: it adds automatic preloading and
      avoids the swap-induced layout shift (`font-display: swap` is set today), at the cost of
      diverging further from the source file
- [ ] Enable the component layers one at a time, with the screens that adopt them. `base.css` is the
      disruptive one — it sets body background and size, restyles `h1`–`h4`, underlines every `<a>`
      and restyles scrollbars, so it needs a screen-by-screen pass, not a flip. It also carries the
      global `button, [role=button], select, summary { cursor: pointer }` rule that closes most of §7
- [ ] Watch for class-name collisions as each layer lands: BDL owns `.btn`, `.card` and friends, and
      `app/globals.css` already defines `.btn`, `.btn-primary`, `.btn-next`, `.pill` and others
- [ ] Map the existing 30 tokens onto BDL equivalents and delete the originals
- [ ] Decide once whether to convert BDL's hex to **OKLCH** (shadcn's own defaults are OKLCH) or keep
      hex and reference it unchanged. Either is fine; mixing is not
- [ ] Collapse the type scale to the 6 sizes BDL implies, and the radius scale to 3 plus `rounded-full`

### Phase 2 — Monospace

- [ ] Keep mono for: JCR paths, API routes, `{{tokens}}`, request ids, JSON viewers, `kbd`
- [ ] Remove it from the nine cases in section 5 and anywhere else that is prose, a count or a name field

### Phase 3 — Interaction feel

Radix covers most of this once Phase 0 lands; these are the gaps it does not close.

- [ ] `.btn:active { transform: scale(.97) }` with a 160ms `ease-out` transition
- [ ] Wrap remaining hover rules in `@media (hover: hover) and (pointer: fine)`
- [ ] `cursor-pointer` on every non-`.btn`, non-primitive clickable (rows, cards, tree nodes)
- [ ] Name the easing curves; replace `transition-all`; cap UI animation at 300ms; extend
      `prefers-reduced-motion` to `cmt-flash` (`lib/ui/celebrate.ts` already handles it)

### Phase 4 — Accent, icons, emoji

- [ ] One accent-edge treatment everywhere (recommend a 2px inset bottom for active state; keep the
      5px left border only for the page-level banner)
- [ ] Replace `components/ui/Icons.tsx` with `lucide-react`, or convert it to `currentColor` and delete
      the baked `stroke` / `fill` hex
- [ ] Replace the 14 `✨` and the `📁` with icons from that set
- [ ] Replace hard-coded hex in CMS chrome with BDL tokens — add a token if one is genuinely missing
      rather than inventing a seventh amber

### Phase 5 — Retire the hand-rolled overlays

**Sidebar: done.** `components/shell/SideNav.tsx` (the 57-line hand-rolled nav) is deleted and
replaced by `components/shell/AppSidebar.tsx` on the shadcn Sidebar. The 11 items and 4 group
labels are unchanged; what went away is the machinery:

| Removed | Now |
|---|---|
| `useShellMode()` with 3 media queries + `useSyncExternalStore` | `useSidebar()` |
| `localStorage["ucp-navmini"]` | `sidebar_state` cookie, read in the layout so first paint matches |
| `openDrawer()` + a bespoke `fixed inset-0` phone drawer | built-in Sheet via `openMobile` |
| `w-[60px]` mini rail + hand-written collapse button and aria | `collapsible="icon"` + `SidebarRail` + `SidebarTrigger`, and **⌘B** for free |
| 11 inline SVG path strings | `lucide-react` icons |

Also in that change: the market switcher moved to the sidebar header with instances (EMEA/APAC/NA)
as the dropdown's group labels, so the separate instance `<select>` is gone — three top-bar
selectors became one plus the environment, which stays in the top bar where its colour is visible
even when the sidebar is collapsed. The account menu moved to the sidebar footer, which also
deleted 7 hard-coded avatar hexes from `TopBar.tsx`.

The viewport hook survives as `components/shell/useShellMode.ts` (phone/tablet only) because
`Builder.tsx` and `TemplateEditor.tsx` use it for their own layouts, not for the nav.

**Not reinstated:** the old nav force-collapsed itself inside the page builder ("the builder needs
the room"). That needs either a controlled `open` on `SidebarProvider` or a `setOpen(false)` on the
builder route, and `setOpen` writes the preference cookie — so it would clobber the user's choice.
Left out deliberately rather than implemented fragilely; ⌘B still works.

- [ ] Migrate the remaining 12 ad-hoc `fixed inset-0` overlays onto shadcn `Dialog` / `Sheet`; delete
      `components/models/ModalShell.tsx` once empty
- [ ] Replace 16 `z-index` tiers with 5 named layers (`--z-nav`, `--z-dropdown`, `--z-overlay`,
      `--z-dialog`, `--z-toast`); Radix portals remove most of the need
- [ ] Each migrated screen should lose its bespoke focus-trap and escape handling, not keep both

### Phase 6 — Shared vocabulary and helpers

- [ ] One `lib/ucp/labels.ts` exporting the status vocabulary; delete the other five maps
- [ ] One `cva` button/input variant set replacing `inputCls` / `lbl` / `cls`; one `slug`;
      one `initials`; one `fmt`
- [ ] Review the 31 swallowed errors; keep the deliberate ones with a comment, surface the rest

### Unification, staged by risk

Staged by **what can break**, not by subject. Each tier ends green (build + `tsc` + 19 Playwright
tests) and is its own commit, so any tier can be reverted without unpicking the others.

House rule for all of it: **no arbitrary size classes** — sizes come from the Tailwind scale or a
BDL token. Current debt: 904 `text-[Npx]` (22 distinct), 136 `w-/h-[Npx]` (65 distinct), 37
`max-w/h-[Npx]`, 20 `z-[N]` (8 distinct).

#### Tier 1 — Won't break (mechanical, machine-verified, no visual change)

Nothing here alters a rendered value; it renames and adds.

- [ ] **`--accent` → `--brand`** across 156 call sites. Value stays HSBC red, so zero visual
      delta — but it frees `accent` for shadcn's meaning, which is what stops every copied class
      from your project needing hand-translation. **This is the unlock; do it first.**
- [ ] Alias the pairs that already share a value: `--surface`→`--background` (both `#fff`),
      `--crit`→`--destructive` (both `#db0011`).
- [ ] Enable the BDL layers that collide with **nothing**: `cards`, `forms`, `tables`, `badges`,
      `tabs`, `modals`, `icons` — all namespaced `bdl-*` / `icon--ph--*`. Verified: 0 collisions.
- [ ] `shadcn add` the remaining primitives without wiring them in yet.
- Verified by: `next build`, `tsc --noEmit`, `grep` for leftover old names, tests stay green.

#### Tier 2 — Might break (visual change, no functional risk; needs eyes)

The values genuinely differ, so screens will shift. That is the point, but nothing automated
catches it.

- [x] **Colour ramps repointed at BDL — done, and without touching the 1,387 call sites.** The
      eight UCP steps are now defined as references rather than their own hex, so one edit moved
      every screen. The ramp is kept at full depth because the app leans on it (secondary text
      144 sites, zebra rows 107, two border weights 410/146), with every step BDL-sourced:
      `--ink`→`--foreground` · `--ink-2`→`bdl-grey-dark` · `--ink-3`→`--muted-foreground` ·
      `--ink-4`→`bdl-grey-light` · `--surface-2`→`bdl-grey-zebra` · `--surface-3`→`--muted` ·
      `--line`→`bdl-grey-border` · `--line-2`→`--border`.
      Four of those targets are flat BDL greys with no dark counterpart, so a `.dark` block
      collapses the ramp by one step in dark (`--ink-2`→`--foreground`, `--ink-4`→
      `--muted-foreground`, `--surface-2`→`--card`, `--line`→`--border`) rather than inventing
      dark values.
- [ ] Optional tidy-up: rename the `*-ink`/`*-line`/`*-surface` **class names** to the shadcn
      ones. No longer needed for the colour match — purely so copied markup reads consistently.
- [ ] The 904 `text-[Npx]` → 6 scale steps; 65 distinct `w-/h-[Npx]` → scale or token
- [ ] 186 `font-semibold` → `font-medium` / `font-bold` (Univers has no 600, so they render 700)
- [ ] Reconcile `--radius: 0` against `.btn`'s hard-coded `8px`
- [ ] 20 `z-[N]` → 5 named layers
- Verified by: tests for structure, then a screen-by-screen look. Budget a pass per screen group.

#### Tier 3 — Will break (behavioural; per-screen testing required)

- [ ] **`bdl/buttons.css`** — collides head-on: it defines `.btn`, `.btn-primary`, `.btn-danger`,
      `.btn-icon`, `.btn-sm`, all of which `app/globals.css` already defines and 170+ call sites
      use. Enabling it silently restyles every button in the app. Either migrate buttons to the
      shadcn `Button` first, or diff the two definitions and merge deliberately.
      `bdl/animations.css` touches the same three classes in its reduced-motion block.
- [ ] **`bdl/base.css`** — body font-size 16px vs the current 14px, underlines every `<a>`,
      restyles `h1`–`h4` and scrollbars. Changes every screen at once. It also carries the global
      `button, [role=button], select, summary { cursor: pointer }` rule that closes most of §7, so
      it is worth doing — just not in one flip.
- [ ] **13 hand-rolled overlays → `Dialog` / `Sheet`** — focus traps, escape, scroll lock and
      nested state. The suite covers roughly 4 of the 13 flows; the other 9 need manual checks.
- [ ] Retire the duplicate `components/ui/*` (`Menu`, `Confirm`, `MoveDialog`, `NameDialog`,
      `Pill`, `Steps`) as shadcn equivalents land — each is used across several screens.
- [ ] `bdl/utilities.css` redefines `.sr-only`, which Tailwind also provides. Low stakes, but
      check which wins before enabling.

#### Before starting any tier

`npx playwright install chromium` is required — the browser binary was missing, so the suite could
not run at all until it was installed. Three tests also had to be rewritten against the new shell
(the sidebar's `data-state` contract, the welcome `h1`, the market living in the sidebar).

### Not in this plan

- **The BDL style-guide page.** `hsbc-ucpmock` has a `/bdl` route rendering every token, size, radius
  and component (`src/routes/bdl/+page.svelte` plus a 565-line `style-guide-content.svelte`). It was
  deliberately **not** cloned, and should stay that way. Only `tokens.css`, `fonts.css`, `ICONS.md`
  and the four woff files came across.
  Trade-off to be aware of rather than solve here: that page is what makes drift visible in the other
  prototype, and it is also the one file there that legitimately holds hard-coded hex (it displays the
  swatches). Without it, the guard against section 1 regressing is re-running the greps in section 9,
  not a screen.

- `components/builder/Builder.tsx` decomposition. It is the right call eventually, but it is a
  behaviour-risk change, it is the most-edited file in the repo, and it should not be mixed into a
  visual-consistency pass. File it separately.
- i18n. `hsbc-ucpmock` has 10,616 lines of messages and this repo has none. Retrofitting it across
  110 components is a project of its own, not a parity pass.
- Anything in `app/globals.css` lines 65–158 (the hsbc.co.uk render layer) — see section 3.

## 11. Caveats

- Counts come from static greps over `app/`, `components/` and `lib/`; a class built by string
  concatenation at runtime will not appear in them, so the figures are lower bounds.
- Four benchmark cells are marked "not measured": `hsbc-ucpmock` was measured for the metrics where
  the grep ports cleanly to `.svelte`. Do not read a blank as a zero.
- `shadcn/ui` is a copy-in, not a dependency. The CLI writes files into this repo and they become
  this repo's code — that is why the Svelte port was possible at all, and why `add` overwrites.
- `tsc --noEmit` is clean at `8c6265b`. It should stay clean after every phase; none of this work
  requires a type change.

## 12. Sources

- `shadcn/ui` Next.js installation — https://ui.shadcn.com/docs/installation/next
- `shadcn/ui` Tailwind v4 and React 19 — https://ui.shadcn.com/docs/tailwind-v4
- `shadcn-svelte` about / credits (names the original and Radix) — https://shadcn-svelte.com/docs/about
- `hsbc-ucpmock` — `docs/consistency-review-findings.md`, `docs/code-review-findings.md`,
  `docs/ucp-real-architecture.md`
