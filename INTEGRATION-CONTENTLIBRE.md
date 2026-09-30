# ContentLIBRE backend integration — status and remaining work

Branch `TB-FE-plus-BE`, in this repository and in
[ContentLIBRE/prototype](https://github.com/ContentLIBRE/prototype) (its `docs/FE-INTEGRATION.md` is
the backend's half of this file and holds the full remaining-work list). Started 26 September 2026.

## How it fits together

This app is the CMS front end; ContentLIBRE is the backend. The Next.js server is a BFF and calls
ContentLIBRE's Management API **as the signed-in person** (`lib/server/contentlibre.ts`):

- `/login` posts user name and password to the BFF, which signs in at ContentLIBRE's
  `j_security_check` and keeps the `sling.formauth` token in the httpOnly cookie `ucp-cl-session`.
  The browser never sees a backend credential.
- Every backend call replays that token; writes fetch a CSRF token first (`X-CSRF-Token`).
- `CONTENTLIBRE_USER`/`CONTENTLIBRE_PASSWORD` are a development fallback only (every visitor becomes that
  account). Leave them unset where people share an instance.

Configuration: `.env.example`.

```sh
UCP_BACKEND=contentlibre CONTENTLIBRE_URL=http://localhost:6727 npm run dev -- -p 3100
```

## Done — stage 1

| Area | With `UCP_BACKEND=contentlibre` |
|---|---|
| Sign-in | User name + password against ContentLIBRE; sign-out ends the backend session too; an expired backend session sends you back to `/login` |
| Markets | The backend's sites (`content/v1/sites`) replace the HSBC market list: `lib/server/markets.ts` on the server, `MarketsProvider`/`useMarket` (`components/shell/Markets.tsx`) in client components. `MOCK_MARKETS` is the mock's list only |
| Pages | Explorer on `content/v1`: list, create from a template, delete, move. A ContentLIBRE page can have child pages — it stays a page and carries `hasChildren`, with an extra **Open** button |
| Status | Real publication state; new status `modified` ("Changes pending": live with an open draft) |
| Dashboard | Real counts; the synthetic delivery-uptime tile and activity chart are replaced (no data behind them on this backend) |
| Role | From `identity/v1/me`: administrator → admin, `content-authors` → author, otherwise viewer |
| Repository (JCR), API & delivery | Link to ContentLIBRE's Repository Manager and Swagger instead of re-implementing them |

`UCP_BACKEND=mock` behaves as before.

## Remaining work (front end side)

- [x] **Builder on ContentLIBRE** (stage 2, 26.09): `components/builder/ClBuilder.tsx` + BFF `app/api/cl`. The preview is
      the backend's own render of the open draft in an iframe (one renderer, a `<base>` points assets at the backend).
      Structure, allowed components and fields come from the backend's `.libre-model.json`; insert / edit / move /
      remove use the same Sling POST contracts as ContentLIBRE's `/edit`, so its validator decides every write.
      **Edit** opens a draft, **Publish** / **Discard draft** end it; a stale publish offers **Publish anyway**.
- [x] **Editing page metadata** (title, description, navigation) goes into the draft through `content/v1`.
- [ ] Builder: drag and drop, clipboard, history panel (restore an archived publication: `POST drafts {from}` exists),
      field widgets beyond text/number/checkbox, and nested slots deeper than one level in the outline.
- [x] **Assets, Content models, Entities, Templates, Audit** (stage 3, 26.09): generic nodes go through Sling's own
      contracts in `lib/repo/adapters/contentlibre.ts`. Logical paths stay as they are; the adapter maps them to the
      backend's roots (`/conf/hsbc` → `/conf/ucp`, `/content/entities` → `/var/ucp/entities`,
      `/var/audit/ucp` → `/var/ucp/audit`, `/content/dam` unchanged) and refuses any other node path. AEM types the
      backend does not have are stored as `nt:unstructured` + `ucp:primaryType`. The backend's ACLs enforce what
      the role checks here predict (models/templates: admins; audit: append-only for authors).
- [x] **Page history** on this backend is the publication archive; restore opens a draft from it.
- [x] **Review workflow** (stage 4): Send for review / Approve / Request changes in the builder; Publish explains
      what blocks it. Tasks come from the review (Review, Fix, Publish) and builder actions are written to the
      audit trail.
- [x] **Users & roles** lists the backend's accounts with the role their groups give (admin, reviewer, author,
      viewer); changing membership stays in the ContentLIBRE console for now.
- [x] **Dashboard activity** is drawn from the audit trail; the environment switcher is a label (one instance).
- [ ] Use the page document's `permissions` for per-page actions instead of role defaults.
- [ ] Environment switcher: one ContentLIBRE instance is one environment.
- [ ] Branding: HSBC logos and wording are still the mock's.
- [ ] Pre-existing lint error in the folder tree component (`react-hooks/set-state-in-effect`), not
      introduced by this branch.

## Upstream update (28.09)

`main` (46 commits: publish dialog with scheduling, review reminders, task assignment, rich text,
content picker, phone layout, no Repository screen) is merged. On `UCP_BACKEND=contentlibre`:

- Publish dialog (builder and page list): **Publish now** publishes the approved draft, **Schedule** calls
  `content/v1/drafts/schedule` - the backend publishes it when it is due, as the person who scheduled - and
  **Cancel schedule** removes it. A scheduled page shows `scheduled` (a Check task); one the backend could not
  publish shows `failed` with the reason (a Fix task).
- **Remind reviewer** and **Change reviewer** go to the backend (`drafts/review/remind`, `drafts/review/assign`);
  the Tasks screen lets admins change the reviewer, other task kinds answer `501`.
- The Repository Manager link moved to API & delivery.

Still to do on this side:

- [x] `ClBuilder` (28.09): Remind reviewer, Change reviewer (list of people who may review), Schedule… / Change
      schedule (the publish dialog), banners for a schedule and for a failed one, "Publish now".
- [x] **Editable preview** (29.09): `components/builder/ClCanvas.tsx`. The preview is the backend's render in edit
      mode (`/api/cl/preview?…&edit=1` → `authoring=edit`), read through its markers: click selects a block
      (outline + name, the inspector opens), double-click on a marked text (`data-libre-field`) edits it in place -
      Enter (Ctrl+Enter in long and rich texts) or leaving the field saves, Esc cancels. The frame is sandboxed
      without scripts, so the site's JavaScript does not run while editing.
- [x] **Fields as the backend describes them** (29.09): label, widget (`text`, `textarea`, `richtext` with the
      mock's `RichField`, `select`, `image` with a thumbnail, `link`, `number`, `checkbox`, `lines`), required mark
      and hint. **Send for review** is refused while a required field anywhere on the page is empty. Nested
      components are selectable from their parent's panel.
- [x] **New page on ContentLIBRE** (29.09): the dialog offers the backend's templates for the chosen place
      (`/api/cl/templates` → `.libre-templates.json`, reloaded when the place changes; a template is named by its
      path), any page can be the place (there are no folders here, so **New folder** is hidden), and the body sent
      to `content/v1/pages` is exactly `{parentPath, name, template, title}` - it used to carry the mock's
      `components` and was refused with *components: unknown property*. At a site's root only a new language
      root (`home`) may be created, and the dialog says so.
- [ ] Duplicate on ContentLIBRE creates an empty page from the source's template (no content copy yet).
- [ ] Blur-to-save in the preview not tried in a focused browser (the in-app pane was hidden); drag and drop
      in the preview; an image picker.
- [ ] Re-run the Playwright suite and a mock-mode pass after the merge (only type check and lint were run).

## Second upstream update (30.09): the two-stage review, comments, locks

81 upstream commits merged (14 files in conflict). What they bring and where it stands on ContentLIBRE:

- [x] Markets stay the backend's: upstream's global `MARKETS` / `market()` are the mock's list again
      (`MOCK_MARKETS`), instances (EMEA / APAC / NA) are an optional field, and the instance switcher shows only
      when the markets have one - a backend's sites do not.
- [x] Statuses: upstream's `review` (waiting in the Backlog), `inreview`, `reviewed`, `bizreview`, plus our `modified`.
      A ContentLIBRE review maps to `review` without a named reviewer and `inreview` with one.
- [x] My tasks (rewritten upstream) across the backend's markets. Backlog → **Assign to me** and **Back to backlog**
      go to `drafts/review/assign`.
- [x] **The rest of it on ContentLIBRE** (30.09):
      - What the CMS keeps beside a page - comments, locks, the review stage, review links and groups - lives at
        `/var/ucp/pages<page>` (backend: `ucp-frontend.json`). The adapter writes a page's `ucp:*` there and merges
        it back on read; what the backend knows (who asked, who reviews, when, the schedule) always wins.
      - The two-stage review: `review` / `approved` / `draft` are the backend's (request, approve, request changes -
        it checks who may); `inreview`, `reviewed`, `bizreview` are the CMS's, stamped with the request they belong to.
        My tasks and the builder (`ClBuilder`: stage bar, Assign to me, Start review, Mark reviewed, Send to business
        review, Sign off, Reauthor) drive it; checked end to end, the sign-off leaves the draft APPROVED in the backend.
      - Comments and history in the builder (`PageComments`, `VersionHistory` - the backend's archived publications).
      - Locks: the CMS's routes and the builder's own writes (`/api/cl`) refuse a page locked by someone else (423).
      - Compare with live: `ClCompareView`, the live page and the open draft as the backend renders them, side by side.
      - Copy to folder and Duplicate: the backend's `content/v1/page/copy` - the source's template seeded with its
        published payload, as the new page's first draft.
      - A review link opens the backend's render of the draft for a signed-in person.
- [ ] A review link for someone without an account: the BFF reads the backend as the signed-in person, so a guest
      needs an identity for the BFF (a technical account with read on drafts and write on comments) - not decided.
- [ ] Comments on a text or component (picking in the preview) and the builder's Quality checklist on ContentLIBRE.

