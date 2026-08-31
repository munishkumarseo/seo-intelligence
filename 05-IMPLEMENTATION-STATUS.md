# Implementation Status

This file prevents AI from confusing design, code presence, and verified completion.

## Current Phase

**Backend milestone: VERIFIED on branch `feat/first-party-backend` / PR #1.**

The first-party backend enforcement milestone has completed repository verification. The verified implementation head before this status-only update is:

```text
2371db429a1bedae9c1970110b0aed153b98fa67
```

GitHub Actions run `33388032445` completed successfully for that commit.

This verification applies to backend enforcement and regression coverage. It does **not** mean the separate UI/onboarding milestone is complete, and it does not substitute for a live production smoke test against a real GSC/GA4 property after deployment.

## Approved Architecture

- use OpenSEO as the base and existing backend;
- use GSC and GA4 as core sources;
- preserve existing intelligence;
- keep site audit;
- keep DataForSEO source code initially;
- disable paid-provider-dependent capabilities in first-party mode;
- retain agent/MCP around allowed sources.

## Verified Upstream Capabilities Preserved

- GSC OAuth/integration and reporting
- GSC URL Inspection
- GA4 OAuth/integration and reporting
- GSC/GA4 project property mappings
- `SearchOpportunityService`
- MCP infrastructure
- agent/skills infrastructure
- site audit/crawler

## Verified Backend Enforcement

The following behavior is implemented and covered by repository tests/CI on the verified head:

- `SEO_DATA_MODE` supports `first_party` and `full`, defaults to `first_party` when unset, and rejects invalid values;
- the central DataForSEO transport checks data mode before credential lookup or network access;
- in `first_party` mode, DataForSEO requests fail closed with `FORBIDDEN` and tests assert that neither the DataForSEO credential lookup nor global `fetch` is reached;
- self-host preflight and setup/health behavior is first-party aware;
- MCP tool registration explicitly classifies tools as `first_party` or `paid_provider`;
- in `first_party` mode, GSC, GA4, search opportunities, site audit, project context, and allowed local tools remain registered while paid-provider tools are omitted;
- in `full` mode, paid-provider MCP tools remain available for upstream compatibility;
- scheduled paid rank tracking returns before repository, billing, claim, or workflow work in `first_party` mode;
- `SearchOpportunityService.ts` production logic is unchanged by this PR, while regression coverage locks the existing scoring formula and business-value metric behavior;
- environment examples and deployment/self-host configuration default to `SEO_DATA_MODE=first_party` and treat DataForSEO credentials as optional unless `full` mode is selected.

## Verification Evidence

Verified implementation commit:

```text
2371db429a1bedae9c1970110b0aed153b98fa67
```

GitHub Actions run:

```text
33388032445
```

Successful jobs and gates:

```text
ci                           SUCCESS
  install dependencies       SUCCESS
  ci:check                   SUCCESS
    prettier --check         SUCCESS
    knip                     SUCCESS
    tsc --noEmit             SUCCESS
    badseo typecheck         SUCCESS
    oxlint --type-aware      SUCCESS
    plugin skill sync guard  SUCCESS
  vitest                     SUCCESS — 135 test files / 1127 tests
  worker production build    SUCCESS
  website typecheck          SUCCESS
  website production build   SUCCESS

docker-build                 SUCCESS
  self-host Docker image     SUCCESS
```

Repository verification therefore satisfies the implementation plan's automated unit/type/lint/format/build/CI requirement for the backend milestone.

## Requirement Check

```text
GSC                              AVAILABLE through preserved first-party stack/MCP
GA4                              AVAILABLE through preserved first-party stack/MCP
GSC + GA4 opportunities          AVAILABLE through SearchOpportunityService/MCP
Site audit                       AVAILABLE through first-party MCP tools
Project context                  AVAILABLE through first-party MCP tools
Allowed MCP/agent tools          AVAILABLE in first_party mode

DataForSEO network calls         BLOCKED before credential/fetch in first_party mode
Paid MCP tools                   NOT REGISTERED in first_party mode
Scheduled paid rank checks       NO-OP before repository/billing/workflow work
DataForSEO key                   NOT REQUIRED for first_party mode

SearchOpportunityService logic   UNCHANGED in production file
Full-mode compatibility          RETAINED and regression tested
Unit/type/lint/format/CI checks  PASS
```

## Relevant Feature-Branch Commits

```text
20eb94d  feat: add first-party SEO data mode
785bf69  feat: block DataForSEO calls in first-party mode
53e726d  feat: make setup checks first-party aware
380a40f  feat: expose only first-party MCP tools by default
ceac5ea  feat: skip paid rank schedules in first-party mode
05b37e8  test: lock existing first-party opportunity scoring
1ff4fbf  feat: make first-party mode deployable without DataForSEO
a949b24  docs: make first-party data mode the default
5a9c4d9  test: make first-party regression fixtures type-safe
2371db4  test: run paid-provider compatibility suites in full mode
```

## Still Planned / Separate Milestones

- first-party onboarding simplification;
- product navigation and paid-feature UI hiding;
- SEO-executive-focused Overview/dashboard;
- agent-first UX/tool-policy refinement beyond backend MCP gating;
- live deployed smoke testing with real GSC/GA4 properties;
- any future intelligence change supported by evidence and explicit approval.

## Completion Rule Going Forward

The **backend enforcement milestone is verified**. Do not extend that status to later UI, onboarding, deployment, or intelligence milestones unless those milestones receive their own implementation and verification evidence.
