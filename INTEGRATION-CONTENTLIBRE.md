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

- Publish dialog (builder and page list) publishes each page's **approved draft** through
  `content/v1/drafts/publish`; **Schedule** is refused per page with a reason (no backend support yet),
  and scheduled pages are never polled (`publishDue` is a no-op there).
- **Remind reviewer** works; the 15-minute limit reads the audit trail (the review lives on the draft,
  where this app has nowhere to write).
- **Task assignment** is read-only on the Tasks screen and `task/assign` / `review/assign` answer `501`.
- The Repository Manager link moved to API & delivery.

Still to do on this side:

- [ ] `ClBuilder`: Remind button, "Ready to publish" wording, the publish dialog instead of the plain
      Publish button, and hiding **Schedule** while the backend cannot do it.
- [ ] Rich text in `ClBuilder` once components declare a rich-text field.
- [ ] Re-run the Playwright suite and a mock-mode pass after the merge (only type check and lint were run).
