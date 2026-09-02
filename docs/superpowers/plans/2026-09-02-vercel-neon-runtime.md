# Vercel + Neon Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make OpenSEO run as a Vercel-hosted TanStack Start application backed by Neon PostgreSQL while preserving the existing Cloudflare/D1/Hyperdrive deployment path and all first-party SEO behavior.

**Architecture:** Introduce a small runtime abstraction so server-side configuration can come from Cloudflare Worker bindings or Node/Vercel environment variables without spreading runtime checks through product code. Use Vercel's supported TanStack Start + Nitro path for Node deployments, use Neon through the existing Postgres/Drizzle schema, and keep Google OAuth/server secrets on the server.

**Tech Stack:** TypeScript, TanStack Start, Vite 7, Nitro, React 19, Drizzle ORM, postgres.js, Neon PostgreSQL, Vercel, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-02-vercel-neon-runtime-design.md`

## Global Constraints

- Preserve `SEO_DATA_MODE=first_party` behavior.
- Do not introduce DataForSEO into first-party surfaces.
- Do not fabricate search volume, KD, CPC, backlink or competitor metrics.
- Preserve existing `SearchOpportunityService` scoring and project authorization semantics.
- Keep Google OAuth credentials and refresh-token-related data server-side.
- Do not store privileged credentials in localStorage or IndexedDB.
- Keep the current Cloudflare/D1/Hyperdrive deployment path functional.
- Vercel is an additional runtime target, not a forked application.
- `AUTH_MODE=local_noauth` must never be used on an internet-accessible Vercel deployment.

---

## File Structure

- Create `src/db/runtimeConfig.ts` — runtime-neutral selection/validation logic with no Cloudflare import and no browser-exported secret values.
- Create `src/db/runtimeConfig.test.ts` — Vitest coverage for Node and Cloudflare config selection.
- Create `src/db/cloudflareRuntimeEnv.ts` — the only DB configuration module that imports `cloudflare:workers`.
- Create `src/db/nodeRuntimeEnv.ts` — Node/Vercel environment reader using `process.env`.
- Modify `src/db/provider.ts` — delegate provider and connection-string lookup to runtime-specific config instead of importing `cloudflare:workers` directly.
- Modify `src/db/pg/client.ts` — preserve request scoping, but make connection teardown/runtime behavior explicit for Node vs Worker.
- Modify `vite.config.ts` — select Cloudflare plugin for `OPENSEO_RUNTIME=cloudflare` and Nitro for `OPENSEO_RUNTIME=node`.
- Modify `package.json` / lockfile — add the Nitro package required by Vercel's supported TanStack Start deployment path and add explicit Node build/check scripts.
- Create `.env.vercel.example` — non-secret Vercel/Neon environment contract.
- Create `docs/VERCEL_NEON_TESTING.md` — exact smoke-test matrix and OAuth callback setup.
- Reuse existing `src/db/pg/schema.ts`, Postgres migrations, `src/start.ts`, server functions, GSC/GA4 services, and Search Opportunities code without product-logic changes.

---

### Task 1: Runtime-neutral database configuration

**Files:**
- Create: `src/db/runtimeConfig.ts`
- Create: `src/db/runtimeConfig.test.ts`
- Create: `src/db/cloudflareRuntimeEnv.ts`
- Create: `src/db/nodeRuntimeEnv.ts`
- Modify: `src/db/provider.ts`

**Interfaces:**
- Produces: `type OpenSeoRuntime = "cloudflare" | "node"`
- Produces: `resolveDatabaseConfig(input: RuntimeConfigInput): ResolvedDatabaseConfig`
- Produces: `getDatabaseProvider(): "d1" | "postgres"`
- Produces: `getPostgresConnectionString(): string`
- Consumes later: `vite.config.ts` uses the same `OPENSEO_RUNTIME` values.

- [ ] **Step 1: Write failing runtime-config tests**

Add Vitest cases proving the pure resolver behaves as required:

```ts
import { describe, expect, it } from "vitest";
import { resolveDatabaseConfig } from "./runtimeConfig";

describe("resolveDatabaseConfig", () => {
  it("requires postgres and DATABASE_URL on node", () => {
    expect(() =>
      resolveDatabaseConfig({ runtime: "node", databaseProvider: "d1" }),
    ).toThrow(/D1 is not supported/i);

    expect(() =>
      resolveDatabaseConfig({ runtime: "node", databaseProvider: "postgres" }),
    ).toThrow(/DATABASE_URL/i);
  });

  it("accepts node postgres via DATABASE_URL", () => {
    expect(
      resolveDatabaseConfig({
        runtime: "node",
        databaseProvider: "postgres",
        databaseUrl: "postgresql://example.invalid/db",
      }),
    ).toEqual({
      runtime: "node",
      databaseProvider: "postgres",
      postgresConnectionString: "postgresql://example.invalid/db",
    });
  });

  it("preserves cloudflare d1 default", () => {
    expect(resolveDatabaseConfig({ runtime: "cloudflare" })).toEqual({
      runtime: "cloudflare",
      databaseProvider: "d1",
    });
  });

  it("requires hyperdrive for cloudflare postgres", () => {
    expect(() =>
      resolveDatabaseConfig({
        runtime: "cloudflare",
        databaseProvider: "postgres",
      }),
    ).toThrow(/HYPERDRIVE/i);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
pnpm vitest run src/db/runtimeConfig.test.ts
```

Expected: FAIL because `runtimeConfig.ts` does not yet exist.

- [ ] **Step 3: Implement the pure resolver**

`src/db/runtimeConfig.ts` must contain no `cloudflare:workers` import and no browser APIs. Define explicit inputs so tests do not mutate global environment state:

```ts
export type OpenSeoRuntime = "cloudflare" | "node";
export type DatabaseProvider = "d1" | "postgres";

export interface RuntimeConfigInput {
  runtime: OpenSeoRuntime;
  databaseProvider?: string;
  databaseUrl?: string;
  hyperdriveConnectionString?: string;
}

export type ResolvedDatabaseConfig =
  | { runtime: "cloudflare"; databaseProvider: "d1" }
  | {
      runtime: OpenSeoRuntime;
      databaseProvider: "postgres";
      postgresConnectionString: string;
    };

export function resolveDatabaseConfig(
  input: RuntimeConfigInput,
): ResolvedDatabaseConfig {
  const provider = input.databaseProvider?.trim() ||
    (input.runtime === "cloudflare" ? "d1" : "postgres");

  if (input.runtime === "node") {
    if (provider !== "postgres") {
      throw new Error("D1 is not supported on the Node/Vercel runtime.");
    }
    const databaseUrl = input.databaseUrl?.trim();
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_PROVIDER=postgres on Node/Vercel requires DATABASE_URL.",
      );
    }
    return {
      runtime: "node",
      databaseProvider: "postgres",
      postgresConnectionString: databaseUrl,
    };
  }

  if (provider === "d1") {
    return { runtime: "cloudflare", databaseProvider: "d1" };
  }
  if (provider !== "postgres") {
    throw new Error(
      `Unsupported DATABASE_PROVIDER "${provider}". Expected "d1" or "postgres".`,
    );
  }
  const hyperdrive = input.hyperdriveConnectionString?.trim();
  if (!hyperdrive) {
    throw new Error(
      "DATABASE_PROVIDER=postgres on Cloudflare requires a HYPERDRIVE binding.",
    );
  }
  return {
    runtime: "cloudflare",
    databaseProvider: "postgres",
    postgresConnectionString: hyperdrive,
  };
}
```

- [ ] **Step 4: Add runtime-specific environment readers and wire provider.ts**

`src/db/nodeRuntimeEnv.ts` reads only server-side Node variables:

```ts
import { resolveDatabaseConfig } from "./runtimeConfig";

export function readNodeDatabaseConfig() {
  return resolveDatabaseConfig({
    runtime: "node",
    databaseProvider: process.env.DATABASE_PROVIDER,
    databaseUrl: process.env.DATABASE_URL,
  });
}
```

`src/db/cloudflareRuntimeEnv.ts` contains the Cloudflare-only import and feeds the same resolver:

```ts
import { env } from "cloudflare:workers";
import { resolveDatabaseConfig } from "./runtimeConfig";

export function readCloudflareDatabaseConfig() {
  const hyperdrive = Reflect.get(env, "HYPERDRIVE") as
    | { connectionString?: string }
    | undefined;
  return resolveDatabaseConfig({
    runtime: "cloudflare",
    databaseProvider: Reflect.get(env, "DATABASE_PROVIDER") as
      | string
      | undefined,
    hyperdriveConnectionString: hyperdrive?.connectionString,
  });
}
```

Use build-time/runtime-specific module selection in `provider.ts` so the Node SSR graph never imports `cloudflare:workers`. Do not use a runtime `if` around a static Cloudflare import because the Node bundler may still resolve the module.

- [ ] **Step 5: Run focused tests**

```bash
pnpm vitest run src/db/runtimeConfig.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/db/runtimeConfig.ts src/db/runtimeConfig.test.ts src/db/cloudflareRuntimeEnv.ts src/db/nodeRuntimeEnv.ts src/db/provider.ts
git commit -m "feat: add runtime-neutral database config"
```

---

### Task 2: Vercel-supported TanStack Start Node build

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Test: existing TypeScript/Vite checks plus a Node-target build command.

**Interfaces:**
- Consumes: `OPENSEO_RUNTIME=cloudflare|node` from Task 1 design.
- Produces: an explicit `build:node` path used by Vercel.

- [ ] **Step 1: Add Nitro dependency required by current Vercel TanStack Start guidance**

Use the package version resolved by pnpm rather than manually editing the lockfile:

```bash
pnpm add nitro
```

- [ ] **Step 2: Make Vite plugin selection explicit**

Refactor `vite.config.ts` so:

```ts
const runtime = env.OPENSEO_RUNTIME === "node" ? "node" : "cloudflare";
```

Cloudflare builds include:

```ts
cloudflare({ inspectorPort: false, viteEnvironment: { name: "ssr" } })
```

Node/Vercel builds include:

```ts
nitro()
```

Do not initialize both plugins in the same build. Keep `tanstackStart()`, React, Tailwind, path aliases, route generation, and existing devtools behavior in both targets.

- [ ] **Step 3: Add explicit scripts**

Add scripts equivalent to:

```json
{
  "build:cloudflare": "OPENSEO_RUNTIME=cloudflare vite build && tsc --noEmit",
  "build:node": "OPENSEO_RUNTIME=node vite build && tsc --noEmit"
}
```

Keep the existing `build` command compatible with current CI unless the repo's existing workflow is intentionally migrated in the same commit.

- [ ] **Step 4: Prove Node build separately**

Run:

```bash
OPENSEO_RUNTIME=node DATABASE_PROVIDER=postgres DATABASE_URL=postgresql://example.invalid/db pnpm run build:node
```

Expected: build completes without `cloudflare:workers` or Cloudflare Vite-plugin resolution errors. No database connection should be attempted merely by building.

- [ ] **Step 5: Prove Cloudflare build remains valid**

Run:

```bash
OPENSEO_RUNTIME=cloudflare pnpm run build:cloudflare
```

Expected: existing Cloudflare build succeeds.

- [ ] **Step 6: Run regression checks**

```bash
pnpm test:ci
pnpm ci:check
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add vite.config.ts package.json pnpm-lock.yaml
git commit -m "feat: add Vercel Node build target"
```

---

### Task 3: Postgres client lifecycle on Node/Vercel

**Files:**
- Modify: `src/db/pg/client.ts`
- Create or modify: `src/db/pg/client.test.ts`

**Interfaces:**
- Consumes: `getPostgresConnectionString()` from Task 1.
- Produces: existing `withPgClient<T>(fn)` contract unchanged for callers.

- [ ] **Step 1: Add lifecycle tests**

Tests must verify:

```ts
it("does not create a postgres client in d1 mode", async () => {
  // existing fn runs directly
});

it("reuses an ambient postgres client for nested withPgClient calls", async () => {
  // nested call does not create a second client
});
```

Add a Node-runtime-specific test or injectable lifecycle helper proving a Vercel request can close/release the request-local postgres.js client after a non-streaming request while preserving current Worker behavior.

- [ ] **Step 2: Run the focused tests and confirm the new Node lifecycle case fails**

```bash
pnpm vitest run src/db/pg/client.test.ts
```

- [ ] **Step 3: Implement runtime-aware cleanup without changing caller API**

Preserve `AsyncLocalStorage`, `max: 1`, query retry behavior, and reentrancy. Cloudflare keeps current Hyperdrive lifecycle assumptions; Node/Vercel must not leak clients indefinitely across serverless invocations.

- [ ] **Step 4: Run focused and DB tests**

```bash
pnpm vitest run src/db/pg/client.test.ts src/db/schema-parity.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/db/pg/client.ts src/db/pg/client.test.ts
git commit -m "fix: support postgres lifecycle on node runtime"
```

---

### Task 4: Vercel/Neon environment contract and safe deployment defaults

**Files:**
- Create: `.env.vercel.example`
- Create: `docs/VERCEL_NEON_TESTING.md`
- Modify only if required: environment typings/config docs.

**Interfaces:**
- Produces deployment variables:
  - `OPENSEO_RUNTIME=node`
  - `DATABASE_PROVIDER=postgres`
  - `DATABASE_URL`
  - `SEO_DATA_MODE=first_party`
  - `AUTH_MODE=hosted`
  - `BETTER_AUTH_URL`
  - `BETTER_AUTH_SECRET`
  - optional Google OAuth variables for later test stage.

- [ ] **Step 1: Add non-secret Vercel example file**

Use:

```env
OPENSEO_RUNTIME=node
DATABASE_PROVIDER=postgres
DATABASE_URL=
SEO_DATA_MODE=first_party
AUTH_MODE=hosted
BETTER_AUTH_URL=
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Do not include actual credentials.

- [ ] **Step 2: Document the staged test matrix**

`docs/VERCEL_NEON_TESTING.md` must explicitly cover:

```text
Stage A: build only
Stage B: Neon migrations + SQL smoke test
Stage C: Vercel preview without Google
Stage D: GSC connected, GA4 disconnected
Stage E: GSC + GA4
```

Document exact expected behavior for Search Opportunities, including GSC-not-connected state, GSC-only degradation, no fabricated paid-provider metrics, query/path search behavior, and GA4 enrichment only where the existing service provides it.

- [ ] **Step 3: Run formatting**

```bash
pnpm prettier --check .env.vercel.example docs/VERCEL_NEON_TESTING.md
```

- [ ] **Step 4: Commit Task 4**

```bash
git add .env.vercel.example docs/VERCEL_NEON_TESTING.md
git commit -m "docs: add Vercel Neon test contract"
```

---

### Task 5: Provision Neon and verify the existing Postgres schema

**Infrastructure:**
- Neon organization: connected account.
- Create project: `open-seo`.
- Use default database unless the project provisions a different explicit name.

**Interfaces:**
- Consumes: existing repo Postgres migrations.
- Produces: a real Neon `DATABASE_URL` stored in deployment secrets, not chat or git.

- [ ] **Step 1: Create Neon project**

Create `open-seo` in the connected Neon free organization.

- [ ] **Step 2: Apply existing migrations**

Use the repo migration command against Neon from a trusted execution environment:

```bash
DATABASE_URL="$DATABASE_URL" pnpm run db:migrate:pg
```

Expected: all existing Postgres migrations apply without schema redesign.

- [ ] **Step 3: Verify tables and PostgreSQL version**

Run read-only SQL through Neon tooling:

```sql
SELECT version();
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;
```

Expected: application/auth/GSC/GA4/project-related tables represented by the existing schema are present.

- [ ] **Step 4: Run a non-destructive read/write smoke test in a temporary test table or Neon branch**

Do not write synthetic rows into production application tables merely to prove connectivity. Use a temporary/branch-safe smoke check and remove it after verification.

- [ ] **Step 5: Record verification evidence in the PR**

Include migration result and table/schema verification summary without exposing the connection string.

---

### Task 6: Create Vercel preview and run no-Google smoke tests

**Infrastructure:**
- Vercel project connected to the compatibility branch/repo.
- Preview environment uses Neon.

**Interfaces:**
- Consumes Task 2 Node build and Task 5 Neon DB.
- Produces a stable preview URL for later Google callbacks.

- [ ] **Step 1: Configure Vercel preview variables**

Set secret values in Vercel, not git:

```text
OPENSEO_RUNTIME=node
DATABASE_PROVIDER=postgres
DATABASE_URL=<Neon URL>
SEO_DATA_MODE=first_party
AUTH_MODE=hosted
BETTER_AUTH_SECRET=<strong secret>
BETTER_AUTH_URL=<stable preview/test URL>
```

Do not set Google OAuth variables yet.

- [ ] **Step 2: Deploy preview**

Build with the Node target. Expected: deployment reaches READY without Cloudflare Worker-binding errors.

- [ ] **Step 3: Inspect build logs**

Fail the milestone if logs contain any of:

```text
cloudflare:workers unresolved
HYPERDRIVE required on node
D1 binding missing
DATABASE_URL exposed to client bundle
local_noauth enabled publicly
```

- [ ] **Step 4: Fetch the deployed app and smoke-test routes**

Verify:

```text
home/app route returns successfully
hosted auth flow is active
project flow can reach Neon
Search Opportunities route renders
GSC-not-connected state is explicit
no volume/KD/CPC/backlink/competitor fabrication appears
```

- [ ] **Step 5: Inspect runtime logs after route requests**

Expected: no database connection-scope errors and no Cloudflare-binding errors.

---

### Task 7: Real GSC and GA4 validation

**Files:**
- No product-code changes expected unless testing finds a real compatibility defect.

**Interfaces:**
- Uses stable Vercel test URL and existing Google OAuth callback routes.

- [ ] **Step 1: Configure Google OAuth callbacks**

Register exact callbacks for the stable Vercel test domain:

```text
https://<stable-test-domain>/api/gsc/oauth/callback
https://<stable-test-domain>/api/ga4/oauth/callback
```

- [ ] **Step 2: User completes interactive Google authorization**

The user signs in and grants GSC access. Do not paste Google client secrets into chat.

- [ ] **Step 3: Test GSC-only Search Opportunities**

Verify:

```text
GSC connection persists across requests
Pages to Improve/Winners/Losers render from first-party evidence
GA4 unavailable state is explicit
actual Search Console query filtering works
URL/path filtering is case-insensitive
unrelated slug-derived keywords do not falsely match
no paid-provider metrics are invented
```

- [ ] **Step 4: Connect GA4 and retest**

Verify:

```text
GA4 connection persists
Pages to Improve receives the existing optional GA4 enrichment
Winners/Losers behavior stays unchanged
project authorization remains enforced
```

- [ ] **Step 5: Run final regression suite and CI**

```bash
pnpm test:ci
pnpm ci:check
OPENSEO_RUNTIME=node DATABASE_PROVIDER=postgres DATABASE_URL=postgresql://example.invalid/db pnpm run build:node
OPENSEO_RUNTIME=cloudflare pnpm run build:cloudflare
```

Expected: PASS.

- [ ] **Step 6: Open PR only after preview evidence is green**

PR must summarize:

```text
Cloudflare regression status
Node/Vercel build status
Neon migration/schema status
Vercel preview URL/status
GSC-only result
GSC+GA4 result
known optional Cloudflare-only features not yet portable, if any
```

Do not merge if the core first-party route still depends on a Cloudflare-only binding.
