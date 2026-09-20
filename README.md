# UCP Next — HSBC Content Management on Next.js

Next.js (App Router) implementation of the UCP authoring UI, backed by the **ContentLIBRE Management API**
(`content-v1`, `identity-v1`). The Next.js server acts as a backend-for-frontend: the browser calls `/api/cl/*`,
the server adds HTTP Basic + `X-Requested-With: ContentLIBRE`. Credentials never reach the browser.

## Run

```bash
npm install
cp .env.example .env.local   # CONTENTLIBRE_MODE=mock works without any API access
npm run dev -- -p 3100
```

Set `CONTENTLIBRE_MODE=live` plus `CONTENTLIBRE_API_URL`, `CONTENTLIBRE_USER`, `CONTENTLIBRE_PASSWORD` to talk to the real API.

## Structure

- `app/(cms)/[market]/[env]/…` — dashboard, pages explorer, page builder, section pages
- `app/api/cl/[...path]/route.ts` — BFF proxy (live) / in-memory ContentLIBRE stand-in (mock)
- `lib/api/*` — typed client for the Management API (types transcribed from the Swagger spec)
- `lib/blocks/*` — HSBC block registry (schemas, defaults, React renderers) shared by the builder
- `lib/server/*` — server-side data access and the mock store
- `components/*` — shell, explorer, builder, UI primitives

## Notes

- Page `status` and `blocks` are a UCP extension the upstream page allowlist does not expose yet; the mock stores them,
  the live adapter will keep them in a sidecar until the API adds them.
