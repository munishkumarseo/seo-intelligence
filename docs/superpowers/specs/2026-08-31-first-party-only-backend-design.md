# OpenSEO First-Party-Only Backend Design

**Status:** Approved architecture; implementation verification tracked in `05-IMPLEMENTATION-STATUS.md`.

## Objective

Adapt the existing OpenSEO backend so the core product works from GSC, GA4, first-party site audit/crawl data, and local project context without requiring users to fund a paid SEO-data provider.

## Key Decisions

- Keep the existing OpenSEO backend and intelligence.
- Keep GSC + GA4 integrations and `SearchOpportunityService` unchanged initially.
- Keep DataForSEO source code for upstream compatibility, but gate it behind an explicit data mode.
- Default to `SEO_DATA_MODE=first_party`; retain `full` as opt-in upstream compatibility.
- Never fabricate missing third-party metrics.
- Apply capability gating end-to-end: transport, MCP tools, schedules, health/preflight, deployment config, and later UI/onboarding.

## First-Party Data Flow

```text
GSC + GA4 + first-party site audit
              ↓
      Existing OpenSEO backend
              ↓
      Existing services / MCP
              ↓
    Existing OpenSEO intelligence
              ↓
       Agent / SEO-executive UI
```

## Backend Enforcement

1. Pure `SEO_DATA_MODE` parser defaults unset values to `first_party` and rejects invalid values.
2. Central DataForSEO authenticated transport throws before credential lookup or network access in first-party mode.
3. Self-host preflight and health treat DataForSEO as intentionally disabled in first-party mode and retain existing validation in full mode.
4. MCP registration explicitly classifies every current tool as first-party or paid-provider and excludes paid-provider tools from first-party servers.
5. Scheduled paid rank tracking returns before repository/billing/workflow activity in first-party mode.
6. Existing SearchOpportunityService production logic is not changed; regression tests pin its current formula.
7. Docker and Cloudflare/Alchemy deployment paths must not require `DATAFORSEO_API_KEY` in first-party mode.

## SearchOpportunityService Preservation

Existing formula remains:

```text
round(100 * (0.5 * demand + 0.3 * businessValue + 0.2 * reachability))
```

No production scoring rewrite is part of this milestone.

## Out of Scope for This Backend Milestone

- UI redesign
- onboarding simplification
- paid-feature navigation cleanup
- replacing OpenSEO's scoring engine
- creating a second backend
- inventing substitutes for market-wide third-party metrics

## Exit Criteria

- GSC, GA4, existing search opportunities, project context, and site audit remain available.
- DataForSEO network calls are impossible in first-party mode.
- Paid MCP tools are not registered in first-party mode.
- Scheduled paid rank checks do no work in first-party mode.
- DataForSEO credentials are not required for first-party deployment.
- Full compatibility behavior remains available behind `SEO_DATA_MODE=full`.
- Repository tests/typecheck/lint/format checks provide verification evidence.
