# Implementation Status

This file prevents AI from confusing design, code presence, and verified completion.

## Current Phase

First-party backend enforcement implementation on branch `feat/first-party-backend` / PR #1.

GitHub Actions has now been enabled for the fork. A fresh branch update is being used to trigger pull-request CI; verification remains pending until those checks produce evidence.

## Approved Architecture

- use OpenSEO as the base and existing backend;
- use GSC and GA4 as core sources;
- preserve existing intelligence;
- keep site audit;
- keep DataForSEO source code initially;
- disable paid-provider-dependent capabilities in first-party mode;
- retain agent/MCP around allowed sources.

## Verified Upstream Capabilities

- GSC OAuth/integration and reporting
- GSC URL Inspection
- GA4 OAuth/integration and reporting
- GSC/GA4 project property mappings
- `SearchOpportunityService`
- MCP infrastructure
- agent/skills infrastructure
- site audit/crawler

## Code Present on Feature Branch — Verification Pending

The following changes have code and regression tests on `feat/first-party-backend`, but must not be called fully verified until repository CI/typecheck/lint evidence is green:

- `SEO_DATA_MODE` with `first_party` default and `full` compatibility;
- central DataForSEO network/credential kill switch in first-party mode;
- first-party-aware self-host preflight and health status;
- paid-provider MCP tools excluded in first-party mode;
- scheduled paid rank tracking exits before repository/billing/workflow work;
- regression assertion locking the existing SearchOpportunityService formula;
- Docker/Cloudflare/Alchemy env wiring no longer requires DataForSEO in first-party mode;
- first-party-mode documentation and environment examples.

Relevant feature-branch commits include:

```text
20eb94d  feat: add first-party SEO data mode
785bf69  feat: block DataForSEO calls in first-party mode
53e726d  feat: make setup checks first-party aware
380a40f  feat: expose only first-party MCP tools by default
ceac5ea  feat: skip paid rank schedules in first-party mode
05b37e8  test: lock existing first-party opportunity scoring
1ff4fbf  feat: make first-party mode deployable without DataForSEO
a949b24  docs: make first-party data mode the default
```

## Still Planned / Separate Milestones

- first-party onboarding simplification;
- product navigation and paid-feature UI hiding;
- SEO-executive-focused Overview/dashboard;
- agent-first UX/tool-policy refinement beyond backend MCP gating;
- any future intelligence change supported by evidence and explicit approval.

## Completion Rule

Do not mark the backend milestone fully implemented/verified until:

1. code exists in the writable fork;
2. focused tests pass;
3. full test/type/lint/format/CI verification passes or any exceptions are documented;
4. this file is updated with the verification evidence.
