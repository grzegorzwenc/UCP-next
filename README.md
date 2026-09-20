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

## Repository layout (what the Sling instance must contain)

| Path | Node type | Holds |
|---|---|---|
| `/content/<market>/…` | `cq:Page` → `jcr:content` → `root` → components | pages; workflow in `ucp:status`, `ucp:sentBy`, `ucp:sentAt`, `ucp:due`, translations via `jcr:language` + `ucp:sourcePath` |
| `/content/dam/<market>/<folder>/<file>` | `dam:Asset` | assets (`dam:type`, `dam:size`, `dam:width/height`, `ucp:data` inline for mock uploads) |
| `/home/users/<id>` | `rep:User` | users; role in `ucp:role`, per-folder grants as JSON in `ucp:perms` |
| `/conf/hsbc/models/<id>` | `nt:unstructured` | content models; fields as JSON in `ucp:fields`, `ucp:version` |
| `/conf/hsbc/settings/wcm/templates/<id>` | `cq:Template` | page templates (`ucp:blocks`, `ucp:folder`) |
| `/conf/hsbc/forms/<id>` | `nt:unstructured` | forms service registry |
| `/var/audit/ucp/<market>/<id>` | `nt:unstructured` | append-only audit trail (`ucp:time/type/who/text/target/level/requestId`) |

Everything above is defined once in `lib/ucp/paths.ts`. Tasks and notifications are derived from page workflow state; nothing else is stored.

## Structure

- `app/(cms)/[market]/[env]/…` — dashboard, pages explorer, page builder, assets, content models, templates, tasks, API & delivery, users & roles, audit log, repository (JCR) browser
- `app/api/repo/[...op]/route.ts` — BFF over the port: pages (page, children, pages, components, move) + generic nodes (node GET/POST/PATCH/DELETE, node/move) + me. Every mutation writes an audit event carrying the response `X-Request-Id`.
- `app/api/ucp/[...op]/route.ts` — market-scoped derived reads and actions: tasks, notifications, search, assets, log, upload (multipart), translate
- `app/api/delivery/v1/[...op]/route.ts` — public read-only delivery API (pages, preview/pages, models, assets, templates, markets)
- `lib/repo/*` — port, JCR mapping (`mapping.ts`), adapters (mock seed lives in `adapters/mock.ts`)
- `lib/ucp/*` — domain types, repository paths, demo seed constants (client-safe)
- `lib/server/ucp.ts` — domain services over the port (assets, users, models, templates, forms, audit, tasks, delivery JSON)
- `lib/api/*` — browser client (`repoApi`, `ucpApi`)
- `lib/blocks/*` — HSBC block registry (schemas, defaults, React renderers) shared by the builder, templates and models
- `lib/ai/mock.ts` — deterministic stand-in for block-scoped AI proposals (swap for a model-backed route)
- `components/*` — shell (top bar, side nav, palette), explorer, builder, per-section UIs, UI primitives

## Notes

- Workflow status lives on `jcr:content` as `ucp:status`; the ContentLIBRE adapter sends it as `ucp:status` /
  `ucp:components` in the merge patch until the Management API exposes those fields.
- Sling resource types are namespaced `hsbc/components/<block>`; templates under `/conf/hsbc/settings/wcm/templates/<id>`.
