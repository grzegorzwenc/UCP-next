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

- [ ] **Builder**: needs the backend's draft, component and catalogue APIs (backend stage 2). Today saving
      components or changing status answers `501` on this backend. Decide the preview: the server's own
      render in an iframe is recommended over the React block renderers, so there is one renderer.
- [ ] **Editing page metadata** (title, description) waits for a draft-aware `PATCH` in the backend.
- [ ] **Assets, Content models, Entities, Templates, Users, Audit, Tasks**: empty on this backend. They
      store data as generic JCR nodes, which the ContentLIBRE adapter does not bridge yet (backend stage 3
      proposes the Repository Manager API as that bridge).
- [ ] Use the page document's `permissions` for per-page actions instead of role defaults.
- [ ] Environment switcher: one ContentLIBRE instance is one environment.
- [ ] Branding: HSBC logos and wording are still the mock's.
- [ ] Pre-existing lint error in the folder tree component (`react-hooks/set-state-in-effect`), not
      introduced by this branch.
