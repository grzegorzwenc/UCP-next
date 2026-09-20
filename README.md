# UCP Next — HSBC Content Management on Next.js

Next.js (App Router) implementation of the UCP authoring UI. The UI talks only to a **ContentRepository port**
(`lib/repo/types.ts`) shaped after JCR/Sling: pages are nodes with `jcr:content`, components are child nodes under
`jcr:content/root` carrying `sling:resourceType`. Three adapters implement the port:

| `UCP_BACKEND` | Adapter | Talks to |
|---|---|---|
| `mock` (default) | `lib/repo/adapters/mock.ts` | in-memory JCR-like tree with HSBC demo content |
| `contentlibre` | `lib/repo/adapters/contentlibre.ts` | ContentLIBRE Management API (`content-v1`, `identity-v1`) |
| `sling` | `lib/repo/adapters/sling.ts` | Apache Sling on Oak/JCR: GET `<path>.infinity.json`, Sling POST servlet |

The Next.js server is a backend-for-frontend (`/api/repo/*`): credentials for the backend never reach the browser.

## Run

```bash
npm install
cp .env.example .env.local   # CONTENTLIBRE_MODE=mock works without any API access
npm run dev -- -p 3100
```

Set `UCP_BACKEND=contentlibre` (+ `CONTENTLIBRE_*`) or `UCP_BACKEND=sling` (+ `SLING_URL`, `SLING_USER`, `SLING_PASSWORD`) to use a real backend.

## Structure

- `app/(cms)/[market]/[env]/…` — dashboard, pages explorer, page builder, section pages
- `app/api/repo/[...op]/route.ts` — BFF over the port (page, children, pages, components, move, me)
- `lib/repo/*` — port, JCR mapping (`mapping.ts`: blocks ⇄ component nodes, node tree ⇄ PageView), adapters
- `lib/api/*` — browser client mirroring the port
- `lib/blocks/*` — HSBC block registry (schemas, defaults, React renderers) shared by the builder
- `lib/server/*` — server-side data access and the mock store
- `components/*` — shell, explorer, builder, UI primitives

## Notes

- Workflow status lives on `jcr:content` as `ucp:status`; the ContentLIBRE adapter sends it as `ucp:status` /
  `ucp:components` in the merge patch until the Management API exposes those fields.
- Sling resource types are namespaced `hsbc/components/<block>`; templates under `/conf/hsbc/settings/wcm/templates/<id>`.
