# First-Party Backend Enforcement Implementation Plan

**Goal:** Make the OpenSEO fork operate safely in first-party-only mode using GSC, GA4, site audit, and local project data, while preserving OpenSEO's existing intelligence and preventing DataForSEO spend.

**Architecture:** Add an explicit `SEO_DATA_MODE` with `first_party` as the default and `full` as opt-in compatibility. Enforce the mode at the central DataForSEO client, MCP tool registration, scheduled rank tracking, setup/preflight, and deployment configuration. Keep GSC, GA4, `SearchOpportunityService`, site audit, auth, project context, and existing agent/MCP architecture unchanged.

## Global Constraints

- existing OpenSEO backend only;
- preserve existing first-party intelligence;
- SearchOpportunityService scoring unchanged;
- GSC + GA4 + first-party site audit are core sources;
- no user-required paid SEO-data API;
- keep DataForSEO code, disable execution in first-party mode;
- unknown metrics remain unknown;
- first-party mode fails closed;
- Google OAuth security/scopes remain unchanged.

## Tasks

1. Add `src/shared/seo-data-mode.ts`, tests, and env typing.
2. Add a central DataForSEO kill switch before credential lookup/network access.
3. Make self-host preflight and runtime health first-party aware.
4. Gate MCP tools by explicit first-party vs paid-provider classification and propagate mode through transport.
5. Stop scheduled paid rank tracking before database/billing/workflow work.
6. Add regression assertions locking existing GSC + GA4 opportunity scoring without changing production logic.
7. Make env examples, Docker, Cloudflare/Alchemy deploy configuration, and self-host docs default to first-party mode with DataForSEO optional.
8. Run focused and full verification; update implementation status with evidence.

## Verification Targets

```text
GSC                              AVAILABLE
GA4                              AVAILABLE
GSC + GA4 opportunities          AVAILABLE
Site audit                       AVAILABLE
Project context                  AVAILABLE
Allowed MCP/agent tools          AVAILABLE

DataForSEO network calls         IMPOSSIBLE in first_party mode
Paid MCP tools                   NOT REGISTERED in first_party mode
Scheduled paid rank checks       NO-OP in first_party mode
DataForSEO key                   NOT REQUIRED in first_party mode

SearchOpportunityService logic   UNCHANGED
Full-mode compatibility          RETAINED
Unit/type/lint/format/CI checks  PASS or exceptions documented
```

UI/onboarding/product-surface work is a separate plan after this backend milestone is verified.
