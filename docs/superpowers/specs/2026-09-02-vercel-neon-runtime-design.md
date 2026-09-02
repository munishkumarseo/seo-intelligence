# Vercel + Neon Runtime Architecture Design

Date: 2026-09-02
Branch: `arch/vercel-neon-runtime`
Status: Proposed design for review

## Goal

Run OpenSEO on Vercel for preview/runtime testing while using Neon PostgreSQL for durable application data, without rewriting the existing product logic or removing the existing Cloudflare deployment path.

The first deployment target is a safe preview environment for validating the existing first-party SEO flows (GSC, GA4, Search Opportunities, project scoping, auth and site-audit behavior). Browser IndexedDB is intentionally deferred to a later phase and will be used only for large non-secret working/cache data.

## Non-negotiable product constraints

- Preserve `SEO_DATA_MODE=first_party` behavior.
- Do not introduce DataForSEO into first-party surfaces.
- Do not fabricate search volume, KD, CPC, backlink or competitor metrics.
- Preserve existing SearchOpportunityService scoring and project authorization semantics.
- Keep Google OAuth credentials and refresh-token-related data server-side.
- Do not store privileged credentials in localStorage or IndexedDB.
- Keep the current Cloudflare/D1/Hyperdrive deployment path functional.
- Treat Vercel as an additional runtime target, not a forked application.

## Current-state findings

1. `vite.config.ts` loads `@cloudflare/vite-plugin` unconditionally, so the current build is Cloudflare-runtime-oriented.
2. `src/db/provider.ts` imports `env` from `cloudflare:workers`.
3. PostgreSQL currently resolves through a Cloudflare Hyperdrive binding. Direct `DATABASE_URL` access is intentionally not supported by that provider.
4. The repo already contains PostgreSQL schemas/migrations and a `db:migrate:pg` command, so the data model does not need to be reinvented.
5. The existing hosted production configuration already uses `AUTH_MODE=hosted`, `DATABASE_PROVIDER=postgres`, Better Auth, and Google OAuth concepts.

## Approaches considered

### A. Runtime adapter with dual hosting support — selected

Add a small runtime/environment abstraction. Cloudflare continues using Worker bindings/Hyperdrive. Vercel/Node uses normal server environment variables and a direct Neon PostgreSQL connection string.

Benefits:
- smallest architectural change;
- preserves upstream-compatible Cloudflare behavior;
- reuses existing Postgres schema and Drizzle code;
- lets Vercel and Neon be tested independently;
- avoids a permanent Vercel-specific fork of business logic.

Cost:
- runtime/environment access must be isolated from Cloudflare-only imports;
- any other Worker-only modules reached by the Vercel request graph must be adapted or conditionally excluded.

### B. Remove Cloudflare support and convert the app fully to Vercel/Node

Rejected for this phase. It creates unnecessary migration risk, increases diff size, and removes an already-working deployment target.

### C. Deploy only the frontend on Vercel and keep the backend on Cloudflare

Rejected for this phase. It would create two origins, cross-runtime auth/cookie complexity, and would not achieve the goal of testing a Cloudflare-independent OpenSEO runtime.

## Selected architecture

```text
Browser
  |
  v
Vercel / TanStack Start
  |
  +-- React routes and UI
  +-- existing server functions
  +-- Better Auth (hosted mode)
  +-- Google OAuth callbacks
  +-- GSC / GA4 server-side clients
  +-- existing SEO services
  |
  v
Runtime environment adapter
  |
  +-- Vercel/Node -> process environment -> DATABASE_URL
  |
  +-- Cloudflare -> Worker bindings -> Hyperdrive/D1
  |
  v
Database provider
  |
  +-- PostgreSQL -> Neon in Vercel previews
  +-- PostgreSQL/Hyperdrive or D1 -> existing Cloudflare deployments
```

## Database responsibilities

Neon/PostgreSQL remains the durable source of truth for:

- users, sessions and auth data;
- organizations/workspaces and projects;
- project context and permissions;
- GSC integration metadata/state;
- GA4 integration metadata/state;
- encrypted/persistent OAuth-related records already represented by the app;
- audit records;
- report metadata and other data the existing schema already treats as persistent.

Phase 1 will not redesign existing persistence boundaries merely to reduce database usage.

## Browser storage boundary

IndexedDB is phase 2, after the Vercel + Neon runtime is verified.

Good future candidates:
- large temporary GSC/GA4 result caches;
- crawl working sets;
- report result caches;
- filters and local UI state;
- local report snapshots that can be regenerated.

Never store there:
- Google client secret;
- OAuth refresh tokens;
- Better Auth secret;
- privileged API secrets;
- database credentials.

## Runtime environment abstraction

Introduce a focused environment module with explicit APIs rather than spreading `process.env` conditionals across the codebase.

Conceptual interface:

```text
getRuntimeKind() -> cloudflare | node
getRuntimeValue(name)
getDatabaseProvider()
getPostgresConnectionString()
```

Behavior:

- Cloudflare:
  - preserve existing Worker binding reads;
  - preserve Hyperdrive connection behavior;
  - D1 remains available.
- Vercel/Node:
  - `DATABASE_PROVIDER=postgres` is required;
  - `DATABASE_URL` provides the Neon connection string;
  - D1 is not supported on this runtime;
  - missing database configuration fails explicitly rather than silently falling back.

The adapter must not expose server secrets to the browser bundle.

## Build/runtime separation

The Vite configuration should select the Cloudflare Vite plugin only for the Cloudflare build target. A Vercel/Node build must not import or initialize the Cloudflare plugin in the SSR runtime.

Use an explicit build target environment value rather than hostname heuristics.

Proposed value:

```text
OPENSEO_RUNTIME=cloudflare | node
```

Defaults should preserve existing behavior for current Cloudflare workflows. Vercel sets `OPENSEO_RUNTIME=node`.

## Vercel environment

Initial preview configuration:

```text
OPENSEO_RUNTIME=node
DATABASE_PROVIDER=postgres
DATABASE_URL=<Neon pooled/serverless connection URL>
SEO_DATA_MODE=first_party
AUTH_MODE=hosted
BETTER_AUTH_URL=https://<vercel-deployment-domain>
BETTER_AUTH_SECRET=<server secret>
GOOGLE_CLIENT_ID=<server secret when OAuth testing begins>
GOOGLE_CLIENT_SECRET=<server secret when OAuth testing begins>
```

Optional integrations remain unset until their corresponding test phase.

`AUTH_MODE=local_noauth` must not be used on an internet-accessible Vercel deployment.

## Neon layout

Create one Neon project for OpenSEO.

Initial branches:

- `main`: durable baseline database;
- preview/development branches may be created for schema experiments when necessary.

Before application testing:

1. create Neon project;
2. obtain server connection string through the integration/tooling rather than sharing it in chat;
3. run the repo's existing PostgreSQL migrations against Neon;
4. verify schema parity using existing tests/migration tooling;
5. perform a read/write smoke test.

No schema redesign is part of the Vercel compatibility work unless an existing migration proves incompatible.

## Authentication and Google OAuth

Use the app's existing Better Auth hosted-mode path.

For the public Vercel preview:

- generate/configure a strong `BETTER_AUTH_SECRET` in Vercel;
- set `BETTER_AUTH_URL` to the stable testing URL;
- register the exact GSC and GA4 callback URLs with Google;
- user completes interactive Google consent;
- OAuth tokens remain server-side/persistent according to the existing integration design.

Use a stable Vercel domain for OAuth testing rather than ephemeral per-commit URLs when callback stability matters.

Expected callbacks:

```text
https://<stable-test-domain>/api/gsc/oauth/callback
https://<stable-test-domain>/api/ga4/oauth/callback
```

## Compatibility work scope

Phase 1 implementation should be limited to runtime portability required to boot and exercise the existing product:

1. runtime/env abstraction;
2. Postgres direct-connection path for Node/Vercel;
3. conditional Cloudflare Vite plugin/runtime wiring;
4. Vercel-compatible build configuration if required by TanStack Start;
5. Vercel environment documentation;
6. tests for provider selection and secret-safe behavior;
7. preview deployment and runtime smoke tests.

If a Cloudflare-only feature such as Durable Objects/Workers-specific agent behavior blocks the core application, isolate that feature behind a capability check for the Vercel preview rather than rewriting unrelated subsystems. The first milestone is the first-party SEO product path, not full parity of every optional agent/runtime feature.

## Data flow for Search Opportunities

```text
Browser Search Opportunities page
  -> existing server function
  -> project context/authorization
  -> GSC service
  -> SearchMovementService
  -> existing SearchOpportunityService
  -> optional GA4 enrichment
  -> Neon-backed persistent integration/project state
  -> response metadata + Pages to Improve/Winners/Losers
  -> browser rendering
```

The scoring algorithm is not moved into the browser and is not changed in this migration.

## Error handling

The runtime adapter must make configuration failures explicit:

- Vercel + missing `DATABASE_URL` -> startup/request error naming the missing variable;
- Vercel + `DATABASE_PROVIDER=d1` -> clear unsupported-runtime error;
- Cloudflare + Postgres without Hyperdrive -> preserve existing explicit failure;
- missing Google OAuth config -> preserve the integration's existing reconnect/configuration failure behavior;
- GA4 unavailable -> preserve GSC-only degradation behavior in Search Opportunities.

No silent fallback from a requested Postgres database to an empty/local database is allowed in deployed environments.

## Testing strategy

### Unit tests

Add tests covering:

- runtime detection/config selection;
- Node Postgres connection-string resolution;
- Cloudflare Postgres behavior remains unchanged;
- invalid/missing provider configuration;
- no client-exposed `DATABASE_URL` path.

### Existing regression suite

Run:

```text
pnpm test:ci
pnpm ci:check
pnpm build
```

Existing Search Opportunities tests must stay green.

### Database smoke test

Against Neon:

- migrations succeed;
- expected tables exist;
- simple project/auth persistence works;
- app can reconnect on a fresh server invocation.

### Vercel smoke test

Before Google OAuth:

- deployment builds successfully;
- home/app route renders;
- hosted auth route does not expose local-noauth behavior;
- project flow boots against Neon;
- Search Opportunities correctly shows GSC-not-connected state;
- runtime logs contain no Worker-binding errors.

### GSC-only test

After user authorizes Google:

- GSC connection persists;
- Search Opportunities returns first-party GSC sections;
- GA4-disconnected warning is explicit;
- no invented paid-provider metrics appear.

### GSC + GA4 test

- GA4 property connection persists;
- Pages to Improve receives existing optional GA4 enrichment;
- Winners/Losers behavior remains unchanged;
- project scoping remains enforced.

## Deployment safety

- All compatibility code is developed on a feature branch.
- First deployments are Vercel Preview deployments.
- Neon schema experiments use branches when schema changes are required.
- No direct migration or compatibility commit lands on `main` until tests and preview runtime checks pass.
- Google secrets and Neon credentials are configured in provider secret stores, never committed.

## Rollout milestones

### Milestone 1 — runtime portability

The app builds for Node/Vercel while current Cloudflare builds still pass.

### Milestone 2 — Neon

Postgres migrations run and the app persists normal project/auth/integration state in Neon.

### Milestone 3 — Vercel smoke test

The app runs publicly in preview with first-party mode and no Google connection.

### Milestone 4 — real GSC

User authorizes Google; GSC-only Search Opportunities is validated.

### Milestone 5 — real GA4

User connects GA4; optional enrichment is validated.

### Milestone 6 — browser-local cache design

Only after runtime parity is stable, profile database/network usage and decide which large regenerative datasets should move to IndexedDB.

## Definition of done

The architecture is considered validated when:

1. Vercel preview builds and serves OpenSEO without Cloudflare Worker runtime errors.
2. Neon Postgres is the durable database for that preview.
3. Existing Cloudflare build/tests remain valid.
4. Hosted auth works; `local_noauth` is not exposed publicly.
5. GSC and GA4 OAuth can be connected through stable Vercel callbacks.
6. Search Opportunities passes the existing manual test matrix with real first-party data.
7. No DataForSEO or fabricated paid-provider metrics appear in first-party mode.
8. No privileged secret is stored in browser storage or committed to git.
