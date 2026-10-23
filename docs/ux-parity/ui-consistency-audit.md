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

> **Resolved** — see Phase 2. Every case below is fixed, along with 17 more of the same kinds
> found in the same sweep. 94 uses → 70, all of them machine values.

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

## 7a. Hard-coded colour: current state

Re-audited after the token work. **108 hex uses in our code → 22**, and the CSS side is clean:

| Where | Hex | Verdict |
|---|---|---|
| `globals.css` `:root` / `.dark` | 39 | correct — this is where definitions belong; +13 are the dark status steps (see §7b) |
| `globals.css` chrome **rules** | **0** | was 2, both tokenised |
| `globals.css` site layer (line 158+) | 107 | correct — replicates hsbc.co.uk, out of scope |
| `app/bdl/theme.css`, `tokens.css` | 118 | correct — these *are* the definitions |
| `app/bdl/*` other 10 layers | 0 | pure `var()` |
| `components/shadcn/*` | 0 | pure tokens |
| hard-coded **font faces** anywhere | 0 | `next/font` is the single source |

What was fixed: the dark surface (`#0F1013`, 23 uses across 16 files) became `bg-foreground` /
`text-background` — the inversion idiom the source project uses, which also fixed a latent bug
where a literal dark toast would have stayed dark in dark mode. Then ~50 swaps onto tokens that
already existed, the `ModelMap` relationship diagram (21 literals), and the stragglers in
`Icons`, `Avatar`, `AssetLibrary`, `PublishDialog`, `TemplatePreview`, `QualityChecklist`,
`bits`, `PageComments`, `Builder` and `Login`.

### 7b. The dark theme had no status ramp at all

Three separate reports, one root cause: the status and BDL colours were only ever defined for
light mode, and `.dark` overrode none of them.

| Symptom | Cause | Fix |
|---|---|---|
| Badges render as a pale block with white text | `.bdl-badge-*` sets a pale `background-color` in the components layer; shadcn's `text-foreground` utility outranks it and goes white in dark | Ported the source project's `.dark .bdl-badge-*` tints (`src/routes/layout.css:338`), plus its unlayered `border-color` rules so the RAG border survives `border-border` |
| `bdl-chip` unreadable on hover | `.bdl-chip:hover` sets `color: var(--color-bdl-charcoal)` — `#333` on a `#151d2a` surface | `.dark` chip rules. Our addition; the source project has no dark chip treatment because it does not use chips in dark |
| "Scheduled" looks like a gap in the status bar | `--sched: #1b1c1f` on a `#151d2a` card — **1.01:1**, mathematically invisible | Dark steps for all seven status tokens |

The status steps use the source project's own technique for lifting a RAG colour into dark —
`color-mix(in srgb, <base> 55%, white)`, as it does for `.ucp-ok` — with the results written out
as hex so they can be validated. All seven now clear 3:1 against the dark card where three
previously failed. `--sched` inverts rather than lightens: near-black in light, near-grey in
dark, keeping it stronger than `--neutral` in both, which is the relationship light mode has.

The `-soft` halves had to move with them: they are used as `bg-X-soft text-X` pairs in ten
places, so lifting only the foreground would have produced the same white-on-pale bug the badges
had. The dark badge tints now reference `--good-soft` / `--warn-soft` / `--crit-soft` /
`--info-soft` rather than repeating those hexes, which keeps the rules hex-free and stops a
badge drifting from the utility beside it.

One check still fails and is accepted: `--info` ↔ `--review` sit 3.0 ΔE apart. They are nearly
as close in light mode (5.9 ΔE) — nine workflow statuses share six hues by design, exactly as
the badges do — and every row in the viz carries a text label, a count and a percentage, which
is the secondary encoding that makes a shared hue legible. Worth revisiting only if the status
set itself is ever reduced.

`Icons.tsx` is worth a note: the plan said "convert to `currentColor`", and that was wrong.
These are illustrative two-tone icons — an amber folder, a white page with a grey outline and
red rule lines — so `currentColor` would have flattened them to one colour. They were tokenised
instead, which keeps the design and still follows the theme.

### The 22 that remain, deliberately

| File | Hex | Why it stays |
|---|---|---|
| `lib/ui/celebrate.ts` | 11 | Confetti is painted to a **canvas**, and `ctx.fillStyle` cannot read `var()`. The half of that file injected as CSS *was* tokenised. |
| `components/ui/JiraChip.tsx` | 4 | `#0052CC` is **Jira's** brand blue. A third-party brand colour is not a BDL token and should not become one. |
| `lib/markets.ts` | 4 | The environment identity colours (dev / test / stage / prod) are **data**, consumed as `style={{ background: env.color }}`. Candidates for BDL RAG colours, but that is a product decision, not a cleanup. |
| `lib/blocks/Render.tsx` | 2 | Part of the hsbc.co.uk render layer — brand colours of the **published page**, same exemption as `globals.css` line 158+. |
| `components/shell/Login.tsx` | 1 | One gradient stop on the sign-in art. |

## 8a. How the CSS is actually layered

Worth knowing before touching any more of it, because it decides which rule wins.

One stylesheet reaches the browser: `app/globals.css`, imported once by `app/layout.tsx`. Its
import order is:

1. `@import "tailwindcss"` — declares the layers and fills `theme`, `base`, `utilities`
2. `@import "./bdl.css"` — tokens, theme, then the BDL component layers, all in `@layer components`
3. `@import "tw-animate-css"` and `@import "shadcn/tailwind.css"` — keyframes and animation utilities
4. this file's own rules

But **import order is not precedence**. The compiled bundle emits real cascade layers, and the
winner is decided by layer, not position:

| Where | What lives there | Precedence |
|---|---|---|
| `@layer theme` | token definitions | lowest |
| `@layer base` | Tailwind preflight, and the ported base layer (`svg.lucide`, `* { border-color }`) | |
| `@layer components` | **every BDL layer** — `.alert`, `.bdl-chip`, `.bdl-tab`, `icon--ph--*` | |
| `@layer utilities` | **all Tailwind utility classes** | |
| *unlayered* | **this app's `.btn`, `.pill`, `.site`, `.cblk`, `.hs-*`, `.s-*`** | **highest** |

Verified in the bundle: the last `@layer` block closes at byte ~137,600 of ~231,600, and `.btn`,
`.pill` and `.site` are all emitted after it.

**Tailwind v4 gotcha, learned the hard way:** an `@layer components { … }` block written
*inline in the entry stylesheet* — the file that holds `@import "tailwindcss"` — is **silently
dropped from the build**. No error, build passes, the rules simply never reach the bundle
(`.pill` went to 0 occurrences, only BDL's `.btn` rules survived). The identical block in a
separate file, imported the way the BDL layers are, emits correctly. So custom
`@layer components` CSS lives in `app/ucp-components.css`, never in `app/globals.css`.

Two consequences:

- **BDL component CSS can never override this app's own classes.** Anything in `@layer components`
  loses to an unlayered rule of the same specificity. That is why `buttons.css` had to be adopted
  by value rather than imported.
- **Tailwind utilities lose to `.btn` too.** `className="btn text-crit"` does not turn the label
  red — `.btn`'s `color` is unlayered and outranks `@layer utilities`. Six call sites currently
  attempt exactly that and are silently ineffective.

The fix for both is to move this app's remaining bespoke classes into `@layer components`, which
would put them on equal footing with BDL and below Tailwind utilities. That is a Tier 3 change in
its own right, and it is what would make the six broken overrides start working.

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

- [x] Keep mono for: JCR paths, API routes, `{{tokens}}`, request ids, JSON viewers, `kbd`
- [x] Remove it from the nine cases in section 5 and anywhere else that is prose, a count or a name field

Done in two passes: **94 → 70** by category (below), then **70 → 0** by removing the font face
itself (see "Then it came back"). The monospace face is not loaded anywhere in the app.

Removed, by category:

| Category | Replaced with | Sites |
|---|---|---|
| Counts (fields, children, folder items, filter chips, row numbers) | `tabular-nums` where the figure is aligned in a column | 9 |
| Dates and times (audit timestamps, sign-in times) | nothing | 2 |
| Character counters (entity fields, alt text) | `tabular-nums` | 2 |
| Glyphs and icons (drag handle `⋮⋮`, field-type icons) | nothing — an icon is not a value | 3 |
| Prose (folder summary line, user detail line, template id line, "required") | nothing | 4 |
| Name and e-mail inputs (invite e-mail, every Translate-dialog input) | nothing | 2 |
| Version numbers, image dimensions, version deltas, chart tooltip values | `tabular-nums` | 4 |

The Pages screen now has mono only on paths, the URL-slug input and the locale code. `FolderTree`
and `FolderList` are mono-free. One date fix travelled with it: the Updated column was printing a
raw ISO `slice(0, 10)`, so it now goes through `ukDate` like the dashboard.

#### Then it came back, so the face itself is gone

The first pass kept 70 uses on the grounds that the source project keeps 61 of its own —
`kbd` chips, API routes, JCR paths. That reasoning was wrong, not because the facts were wrong but
because it re-opened a decision Leon had already given three times. The Pages rebuild then put
mono back on the URL sub-line, reasoning from `name-cell.svelte`, and that was the third time.

So it is now settled at the root rather than per call site:

- **IBM Plex Mono is no longer loaded.** `next/font/google` import, the `plexMono` instance and the
  `--font-plex-mono` variable are all out of `app/layout.tsx`.
- **`--font-mono` points at the sans stack**, identical to `--font-sans`. The line is kept rather
  than deleted on purpose: removing it would let Tailwind's default monospace stack back in the
  moment anyone writes `font-mono` again, whereas this makes the utility a permanent no-op.
- **All 66 remaining `font-mono` classes removed**, plus the three places that referenced
  `var(--font-mono)` directly (`ModelMap`'s SVG label, `Render`'s forms placeholder, `.tok-raw`),
  which now reference `var(--font-sans)`.

`grep -rn font-mono app components lib` returns exactly one line: the token definition.

#### The one that was never a class

Removing the classes was not enough, and would not have been. Tailwind's preflight styles the
elements themselves:

```css
code, kbd, samp, pre { font-family: var(--default-mono-font-family, ui-monospace, …, monospace); }
```

So every `<kbd>` (six of them — the palette and the top bar), the JSON viewer's `<pre>` and the
entity editor's `<code>` rendered in a real monospace face no matter what classes they carried.
`--default-mono-font-family` derives from `--font-mono`, which this repo overrides, so it does in
fact resolve to Univers — but that is a two-step inference through a Tailwind internal, so it is
now also stated outright in `@layer base`, after the import, where it outranks preflight:

```css
@layer base { code, kbd, samp, pre { font-family: var(--font-sans); … } }
```

Two independent guarantees, either of which is sufficient.

`--font-serif` is pinned to the same stack for the same reason, and its one user is gone:
`RichTextEditor`'s italic button drew its "I" with `font-serif`, which rendered in
Georgia/Times — not a monospace, but not Univers either.

**Verified against the compiled stylesheet, not the source.** Every `font-family` value Tailwind
emits is now one of: `univers`, `univers Fallback`, `var(--font-sans)`,
`var(--font-univers), Arial, Helvetica, sans-serif`, or a `var(--default-*-font-family, …)`
whose variable resolves to that same stack. No `.font-serif` utility is emitted at all. A
`.font-mono` utility still is — Tailwind's scanner finds the string in this very document — and it
compiles to `font-family: var(--font-univers), Arial, Helvetica, sans-serif`, so even that is
Univers.

```
grep -ho 'font-family:[^;}]*' .next/static/chunks/*.css | sort -u
```

is the check to re-run; it is the only one that accounts for preflight and for the theme
indirection.

Reversible in one line if a JSON viewer or a `kbd` chip ever wants it back, and that would then be
a deliberate choice rather than a leftover.

Worth recording for next time: the strip script's first version used a global
`/ +"/g → '"'` rule to tidy whitespace after removing the token. That rewrote every
`space-before-quote` in the file — turning `=== "x"` into `==="x"`, `from "x"` into `from"x"`, and,
functionally, `.join(" · ")` into `.join(" ·")`. It type-checked and built clean, which is exactly
why it was dangerous. Token-only replacement, never whitespace normalisation.

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

- [x] **Buttons — done, by adopting BDL's values rather than importing `buttons.css`.**
      That file could not go in as-is: its `.btn` is a base that requires a variant and carries
      ~2x this app's padding, while this app uses **bare `.btn` 553 times** as a complete
      outlined button (`className="btn"` 50, `"btn btn-sm"` 47, `"btn btn-primary"` 43 …).
      The literal alternative was rewriting ~700 class strings.
      **Correction to an earlier claim in this document:** importing it would *not* have
      "silently restyled every button". BDL's component layers sit in `@layer components`, while
      this app's `.btn`, `.pill` and `.site` rules are **unlayered** — and unlayered styles
      outrank every cascade layer regardless of source order. `buttons.css` would therefore have
      lost to the existing `.btn` and shipped as dead weight. Same conclusion, different reason.
      The button block in `app/globals.css` now carries BDL's values instead: square corners,
      BDL greys and reds (`red` → `red-dark` on hover → `red-error` on press), BDL's
      `160ms var(--ease-out)` transition, its `scale(0.97)` press feedback and its disabled
      treatment. `.btn` here is therefore equivalent to BDL's `.btn btn-sm btn-secondary`, which
      is the pairing the source project actually uses (`btn-sm` 130, `btn-secondary` 76,
      `btn-primary` 53). The three variants BDL has no equivalent for — `.btn-next` (the step
      arrow), `.btn-quiet` (BDL's ghost) and `.btn.on` (toggled view switches, applied through
      template strings) — are kept and expressed in the same vocabulary.
- [x] **`bdl/animations.css` enabled.** Its only `.btn` rules sit inside a
      `prefers-reduced-motion` block (`:active { transform: none !important }`), which guards the
      new press feedback rather than restyling anything — so it was additive after all. It also
      supplies BDL's easing tokens: `--ease-out: cubic-bezier(.23, 1, .32, 1)` and
      `--ease-in-out: cubic-bezier(.77, 0, .175, 1)`, replacing Tailwind's weaker defaults
      everywhere `ease-out` is used.
- Side effect worth recording: **§7's "0 `:active` press states" is now closed** — the app had
      press feedback on nothing at all; every `.btn` now scales to 0.97 on press, and 0.9 for
      icon buttons.
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

### Global search

`components/shell/Palette.tsx` restyled against `hsbc-ucpmock`'s
`src/lib/components/command-palette.svelte`. Behaviour is untouched — ⌘K, the `ucp:palette`
event, the combobox/listbox semantics, the focus trap and the 150 ms debounce all stayed.

| Was | Now (theirs) |
|---|---|
| Flex-centred overlay, `pt-[12vh]`, backdrop `bg-black/45`, no blur | Backdrop and panel are siblings; panel pinned `top-[12vh]`, `max-w-2xl`, `max-h-[70vh]`; backdrop `bg-black/40 backdrop-blur-sm` |
| `bg-surface`, no border | `border bg-popover text-popover-foreground shadow-2xl` |
| `⌕` / `✨` glyph, input `text-base`, `py-3` | lucide `Search` at `size-6`, input `h-16 py-5` |
| Row: title with a right-aligned hint column | Row: `size-7` bordered icon tile, title over a `text-xs` subtitle, `CornerDownLeft` on the active row |
| Selected row `bg-brand-soft text-brand-hover` (HSBC red) | `bg-accent text-accent-foreground`, `hover:bg-accent/50` |
| Section heading `text-xs tracking-[.1em]` | `text-[11px] font-medium tracking-wide uppercase` |
| Footer as plain text | `kbd` chips at `text-[11px]` — Navigate / Open / Search |
| Empty state: one grey line | Centred icon, `No results for “{q}”`, and a hint line |
| Input had no `type`, so BDL never styled it | `type="text"` — `bdl/forms.css` targets `input[type="text"]` and supplies the 1px outline |
| Opening state listed 6 pages + all 11 nav items (17 rows) | "Recently viewed" + up to 6 "Suggestions", and every group capped at 6 |

The icon tile needs a per-row icon, which their entries carry as a `group`; ours carry a section
string, so `SECTION_ICON` maps the four sections onto Sparkles / Blocks / FileText / Compass —
the same four their `groupIcon` uses for the equivalent groups.

Three deliberate differences:

- **`z-[60]`, not their `z-50`.** 35 shadcn components here already sit at `z-50`; the palette has
  to clear them. No visual difference.
- **Enter animation only** (backdrop fade 120 ms, panel fade + 8px slide, 160 ms, both ease-out).
  Close is instant: ⌘K is pressed tens of times a day, and an exit transition on a frequently
  keyed action reads as lag.
- **The status `Pill` stayed** on page rows, as a trailing badge rather than inline in the title.
  Their palette has no status concept; dropping ours would have removed information rather than
  restyled it.

Two of the three reported mismatches had the same shape — something of theirs that was never
brought across, not a judgement call:

- **The input outline** is BDL's, not the palette's. `bdl/forms.css` styles
  `input[type="text"]`, and their input declares `type="text"` while ours had no `type`
  attribute at all, so the selector could never match. One attribute restored it. Their
  `data-slot="input"` came across with it: it carries no styling here, but it is the hook their
  dark-mode retint rule uses, so porting that rule later will just work.
- **The height** was the opening state. Theirs offers recents and a handful of suggestions;
  ours listed six pages plus all eleven nav items. `lib/search/recents.ts` ports their
  `recents.svelte.ts` — same `ucp:` key idiom, same cap of 6, most-recent-first with dedupe,
  clear-all and per-row remove — and every group is now capped at `PER_GROUP = 6`.

Their recents store ids and resolve them against a static entry list. Ours cannot: pages come
from the API, so an id alone has no title. The label is stored alongside the id, and only
route-shaped entries (`go:` and `pg:`) are recorded — an AI prompt or a block insertion only
means something inside the builder it was invoked from. Pages are no longer prefetched on open
either, which removes a request per open.

Still not ported: the detail strip above the footer. It needs a second description field per
entry, and ours carry one secondary line, already used as the subtitle.

### Pages

Rebuilt against `hsbc-ucpmock`'s `src/lib/components/library/library-browser.svelte`,
`tree/tree.svelte`, `library/item-card.svelte`, `library/columns.ts` and
`pages/create-page-dialog.svelte`.

| Was | Now (theirs) |
|---|---|
| Full-height 260px `<aside>` beside the content, no page header | A page header (`h1 text-3xl font-light`) above a `lg:grid-cols-[16rem_minmax(0,1fr)]` pair of cards, each scrolling internally |
| New folder / New page buttons beside the folder title, mid-page | Primary actions on the far right of the page header; New folder also as an icon button in the Folders card header |
| Root row had a chevron and a flag emoji; its children indented from a chevron that did nothing | Root is `collapsible: false` — no chevron, always open, children start at the same level. No emoji |
| No counts in the tree | Pages beneath each folder, right-aligned in `tabular-nums` |
| Folder icons were the two-tone illustrative set, same colour always | lucide `Folder` / `FolderOpen`, `text-ink-3`, taking `text-brand` when the row is current — and on hover for the folder tiles |
| Selected row: `bg-brand-soft text-brand-hover` | `bg-(--sidebar-active)` with an `inset 2px` red bar, matching the app sidebar |
| One view: a table | Compact / grid / list, with folders as tiles above the cards in both card views |
| Columns: ☐ · Name · Status · **URL** · Template · Updated · *Edit page* + ⋮ | ☐ · Name (URL folded into a sub-line) · Language · Status · Template · Updated by · Updated on · ⋮ — their `pages/columns.ts` set, with their widths |
| No sorting | Every column sorts, default `updatedAt desc` as theirs sets. `SortHeader` ported: the glyph stays hidden until the column is sorted or hovered |
| No filters beyond the search box | Status multi-select with a count badge, an Updated-on range, a Language quick-chip row with per-value counts, and an active-filter row with a match count and Clear all |
| Dates dropped the year in the current year | `ukDate` always carries it, and Updated on uses their `formatDateTime` shape — `23 Oct 2026 14:05` |
| Native `<select>` of raw paths for "where should it live" | `LocationSelect` — a dropdown radio list, depth-indented, Layers icon for the root |
| Raw `<input type="checkbox">` | `.bdl-checkbox` with a new `.bdl-checkbox-sm` size and a dark-mode treatment |
| `⌕` glyph in a rounded search box | lucide `Search` inset in the field, with a clear `✕` once there is a query |

A second pass after review:

- **The page title is gone**, and with it the full-width header row. The top bar's breadcrumb
  already says Pages, so the `h1` repeated it — and once it went, the row held nothing but a button
  while still pushing *both* cards down. New page now sits above the content card only, inside the
  second column: the grid gains `lg:grid-rows-[auto_minmax(0,1fr)]` and the Folders panel takes
  `lg:row-span-2`, so the right-hand card starts lower while the folder tree still runs the full
  height. Done with rows rather than a nested wrapper, which keeps the card a direct grid child and
  avoids re-indenting it.
- **The screen sizes itself like theirs now.** It was `h-full p-4 md:p-6`, which depended on the
  parent grid handing a height down and left a top gutter under the navbar. It now uses their page
  root verbatim — `h-[calc(100svh-4rem)]`, `pt-0`, and
  `group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100svh-3rem)]` so it tracks the top bar
  shrinking to `h-12` in icon mode. The cards start flush under the navbar and the Folders panel
  fills the full height.
- **New folder lives only in the Folders card header**, where it belongs now that the card has one.
  Its hover is ported from their `tree/new-folder-button.svelte`: a folder-plus icon at rest whose
  label slides out on hover and focus (`max-w-0 → max-w-24` with opacity and margin, 200 ms
  ease-out, `motion-reduce:transition-none`), so the action names itself without costing a label.
- **The Folders panel is taller** — `max-h-96` below `lg`, unconstrained above it, where it fills
  the grid row the removed title gave back.
- **Every modal in the app got the better overlay.** `components/models/ModalShell.tsx` — the chrome
  behind ten call sites — and Pages' own local shell were both hand-rolled `<div>`s with a
  `bg-black/45` backdrop, no blur and no transition. Both now sit on shadcn's Dialog, and the
  Dialog itself was brought in line with theirs: overlay `bg-black/60` with
  `supports-backdrop-filter:backdrop-blur-sm` (was `bg-black/10` and `blur-xs`), content `gap-6 p-6
  sm:max-w-md` (was `gap-4 p-4 sm:max-w-sm`), and `DialogFooter` reduced to their plain
  `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end` instead of a bleeding grey bar sized for
  the old `p-4`. Focus trap, portal and Escape come with it.

  One wrinkle worth recording: every call site mounts its modal behind its own condition, so
  telling the parent to close ripped the popup out before it could animate — the open animation
  played and the exit never did. Both shells now hold a local `open` flag, flip that first so Base
  UI can play the fade-and-zoom out, and notify the caller 120 ms later, matching the Dialog's own
  `duration-100`.

Four things worth noting:

- **The URL column was the main source of confusion.** It repeated what the Name column already
  linked to, in mono, on every row. Their `name-cell.svelte` folds it into a quiet sub-line under
  the title instead, which is also the only place mono belongs (see Phase 2).
- **No table library.** Theirs runs on TanStack (`createSvelteTable`, `getSortedRowModel`,
  `ColumnFiltersState`); this does the same work in plain state, since the whole list is already
  client-side and the library would be ~15 KB for one screen. The parts worth testing —
  `inRange`, `rangeActive` and the sort comparator — live in `lib/pages-filter.ts` rather than in
  the component, and are covered by a headless check (19 cases: inclusive bounds both ways,
  missing dates, folders pinned above pages in both directions, stability on equal keys,
  no mutation, and the date formats).
- **The date range is two native date fields, not a calendar.** Theirs is a two-month range picker
  from `bits-ui` plus `@internationalized/date`; this keeps their exact `{ from, to }` shape and
  inclusive-day comparison without adding two dependencies for one filter.
- **The ⋯ menu is theirs, icons and all.** It was a hand-rolled dropdown with a `⋯` glyph and
  plain text rows; it is now shadcn's `DropdownMenu` laid out like their `pages/page-menu.svelte`
  — the three everyday actions, a separator, the structural ones, a separator, Delete on its own
  as `variant="destructive"` — each with its lucide icon. Edit/Preview/Copy URL/Duplicate/Move/
  Delete use their icons; Rename (`Type`) and Archive (`Archive`) are ours, as theirs has neither.
  Keyboard navigation, typeahead and click-away come with the component, replacing a hand-written
  `mousedown` listener.
- **The card views gained an "Up one level" tile.** They have no breadcrumb of their own — that
  lives in the list view's header — so the first folder tile is the way back, shown only below the
  market root and never while searching. Dashed border and muted text so it reads as navigation
  rather than as another folder.

- **The grid card carries their three actions** — Edit · Preview · URL, with the row dropped in
  compact view as theirs drops it. Two of them are more than theirs is:

  - **Preview** is a real deep link, not a stub. Theirs answers `onPreview` with a toast; here the
    builder already had an internal preview mode but no way to reach it by URL, so it now accepts
    `?preview=1` (`startInPreview`) and the action opens the page as a visitor sees it, in a new
    tab — which is what the external-link icon promises.
  - **URL** copies the address the delivery tier would serve, `https://{market domain}{path}`,
    and reports it in the existing toast. Theirs copies against a placeholder host
    (`https://www.hsbc.example`); ours has the real per-market domains already.

- **A drawn page preview replaces the file icon, in all three views.**
  `components/explorer/PageThumb.tsx` ports their `pages/page-thumb.svelte`: a white page with
  site chrome and neutral wireframe lines, laid out per template, so a product page looks like a
  product page. The same drawing serves the list row at `h-9 w-12` and the card's
  `aspect-[16/10]`, because every size in it is a percentage. Two things carried over on purpose:
  the page is white with literal neutral greys in both themes, since that is what a screenshot
  would look like, and the red accents are the CTA blocks.

  Theirs has 27 layout variants; ours has the five page templates that exist here — `product`,
  `rates`, `hub`, `campaign` and a quiet default for `blank` and anything unrecognised — with
  `product`, `hub` and `campaign` ported from theirs and `rates` composed from their `comparison`
  and `c-rates` drawings. Theirs also fills the image areas with a real photo through `photoSrc`;
  there is no photo service here, so those are flat neutral blocks. At 48×36 in a table row the
  shape is what reads, not the picture.

- **Folders are not rows in the list view at all**, as theirs has none. They live in the tree and,
  in the two card views, as tiles. Consequence to be aware of: in list view a subfolder is reached
  from the tree only, so the tiles would be the thing to add back if that ever bites. Select-all
  covers the pages on screen, and the three folder branches in the row markup went with it.
- **Column visibility is a container query, not a viewport one.** This was a real bug:
  the table lives in the viewport minus the app sidebar *and* the folder tree — roughly 860px on a
  1440px window — but `xl:` asked about the viewport, so at 1280px+ every column switched on and
  `table-fixed` squeezed Name down to its icon. The card is now an `@container` (their toolbar uses
  the same idiom) and the columns appear at `@2xl` / `@3xl` / `@4xl` / `@5xl`, measured against the
  pane. Verified in the compiled CSS: four `@container (min-width: …)` blocks and
  `container-type: inline-size`.
- **Status labels were too long for their column.** "Waiting for a reviewer", "In author's review"
  and "In business review" overflowed `w-28` and ran over the column beside them. They are now
  "Awaiting review", "Author review", "Business review" and "Ready"; the column is `w-32`; and
  `Pill` carries `max-w-full truncate` with a `title`, so no label can spill out of a fixed cell
  again whatever its wording.
- **The language filter needed the market, not the rows.** It was built from the locales actually
  present, and every mock page is `en-GB`, so the one-option guard hid the whole row. It now takes
  the market's declared locales and counts rows against them — zeros included — which is how
  theirs does it, so UK shows `en-GB` and `cy-GB`.
- **The per-row "Edit page" / "Open folder" button is gone.** The name is already a link to the
  same place and the ⋮ menu still carries Open, so the button was a third route to one
  destination; their table has only the ⋮. That is what frees the row for Updated by.
- **Updated by needed data.** `lastModifiedBy` holds an id, so the route now resolves the ids to
  names server-side with `userName`, once per request, the way the dashboard does for the audit
  feed.
- **The view choice is in local storage, not the URL.** Theirs uses `?view=`; here that would
  re-run a dynamic server component on every toggle, so it uses the same `ucp-` local-storage
  idiom the folder tree already uses on this screen, read through `useSyncExternalStore` so the
  first paint and the server agree.

`pages/loading.tsx` had to be rewritten with it: the shared `SectionSkeleton sidebar` variant
mirrors the old aside-and-body layout, which would now jump on swap. That variant stays, because
Assets and Templates still use it.

### Favicon and tab titles

- **The favicon is theirs** — `src/lib/assets/favicon.svg`, the HSBC hexagon, copied verbatim to
  `app/icon.svg`, which is the App Router's icon convention. Next's default `app/favicon.ico` went
  with it.

  A matching `.ico` sits beside it, because `/favicon.ico` is still requested directly by
  bookmarks, RSS readers and older browsers that never look at the `<link>` tags. It is generated
  from the *same* polygon coordinates as the SVG rather than traced by hand, so the two are one
  drawing — `docs/ux-parity/mkico.py` is the generator, and needs only Pillow.
  Rendered at 16× and downsampled with LANCZOS, packed as six PNG frames (16–256px). Verified by
  decoding it back: exact `#DB0011` in all three red caps, pure white chevrons, transparent
  outside the mark, at every frame size. Both `/favicon.ico` and `/icon.svg` appear in
  `app-path-routes-manifest.json`, and the served body is byte-identical to the source file.
- **The tab title follows the section**, as every one of their routes sets its own. The root
  layout holds `title: { default: "Unified Content Platform", template: "%s · Unified Content
  Platform" }` and each route supplies just its own name, so the tab reads
  `Pages · Unified Content Platform` — their exact wording.

  Eleven section routes carry a static title taken from the sidebar's own label, so the tab and
  the nav cannot drift. Two are generated: the page builder names the page being edited and the
  template editor the template, both through `generateMetadata`. Three routes already had titles
  with the product name written into them, which the template would have doubled; they now carry
  only their own name.

### Workspace customisation

Beyond parity: the "Your workspace" cards can be reordered and hidden per person
(`components/ui/Workspace.tsx`, state in `lib/dashboard-layout.ts`).

The decisions worth recording:

- **A cookie, not localStorage.** The server reads the layout and renders it on the first paint.
  localStorage is only readable after hydration, so it would paint the default layout and then
  rearrange it — the third instance of the jitter already fixed twice on this screen.
- **Reordering is confined to a row.** A chart and a list panel are different shapes and heights,
  so a mixed row reads as a mistake. A cross-row drag simply never calls `preventDefault`, so the
  browser's own "no drop" cursor explains the rule without a message.
- **The charts row keeps one card; the lists row can empty.** The floor lives in the row
  definition (`min`) and is enforced twice: the hide button disables at the floor, and
  `reconcileRow` re-shows cards if a hand-edited cookie claims otherwise.
- **Hiding is reversible and visibly so.** A hidden card still exists; a `bdl-chip` next to the
  title reads "N cards hidden" and opens the editor, because a card that vanishes with no trace
  gets reported as lost data.
- **Edit mode shows every card**, hidden ones at reduced opacity, so you arrange against the full
  set rather than remembering what is missing. Card content is `pointer-events-none` while
  editing, which both prevents a stray navigation mid-drag and keeps links from swallowing drags.
- **No drag-and-drop dependency.** Native HTML5 drag plus arrow-key reordering on the handle, with
  an `aria-live` announcement. `@dnd-kit` would have been ~30 KB for one screen.
- `reconcileRow` drops unknown ids and appends new ones, so adding a card to the dashboard later
  appears for people who already have a saved layout instead of being silently absent.

The layout codec, the floor and the reconcile rules are covered by a headless check (11 cases,
all passing); the drag interaction itself was verified in the browser by Leon, not by a test —
an e2e spec for it is still outstanding.

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
