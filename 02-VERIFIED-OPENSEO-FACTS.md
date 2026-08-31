# Verified OpenSEO Facts

These facts were verified against `every-app/open-seo` and this fork's upstream baseline.

## Repository

Upstream: `every-app/open-seo`

License: MIT

## GSC Integration Exists

Verified paths include:

```text
src/shared/gsc.ts
src/server/lib/gscClient.ts
src/server/features/gsc/services/GscService.ts
src/server/mcp/tools/search-console-tools.ts
```

Verified scope: `https://www.googleapis.com/auth/webmasters.readonly`

Verified behavior includes OAuth, encrypted token storage, property discovery/mapping, Search Analytics, and URL Inspection.

## GA4 Integration Exists

Verified paths include:

```text
src/shared/ga4.ts
src/server/lib/ga4Client.ts
src/server/features/ga4/services/Ga4Service.ts
```

Verified scope: `https://www.googleapis.com/auth/analytics.readonly`

Verified behavior includes OAuth, property discovery/mapping, property metadata, and Analytics Data API reporting.

## SearchOpportunityService Exists

Path: `src/server/features/ga4/services/SearchOpportunityService.ts`

Verified behavior:

- requires GSC and GA4 connections;
- uses GSC page-level performance and GA4 organic landing-page data;
- normalizes URLs for joining;
- considers GSC positions 4–20;
- calculates an opportunity score.

Verified formula:

```text
round(100 * (0.5 * demand + 0.3 * businessValue + 0.2 * reachability))
```

`demand` is relative GSC impression strength; `businessValue` is GA4 session key-event rate with engagement-rate fallback; `reachability` is ranking-position based relative opportunity.

## Site Audit / MCP / Agent Infrastructure

OpenSEO has first-party site crawling/audit functionality and existing MCP + agent/skills infrastructure.

## Fact Status Vocabulary

- **Verified** — observed in code/tests/docs.
- **Approved plan** — agreed but not necessarily implemented.
- **Unknown** — not verified.
