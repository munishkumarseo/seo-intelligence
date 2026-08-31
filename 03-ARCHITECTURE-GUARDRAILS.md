# Architecture Guardrails

## G1 — One Backend

Use OpenSEO's existing backend. Do not create a separate backend for GSC, GA4, opportunities, site audit, or agent orchestration.

## G2 — Preserve Existing Intelligence

Keep existing OpenSEO first-party scoring and reasoning in V1. Do not introduce a second competing scoring engine.

## G3 — First-Party Mode

`SEO_DATA_MODE=first_party` is the default.

Enabled: GSC connection/reports, URL Inspection, GA4 connection/reports, existing GSC+GA4 opportunity analysis, site audit/crawler, project context, local saved-keyword workflows, and MCP/agent features relying only on allowed sources.

Disabled/hidden: DataForSEO keyword metrics, paid SERP/backlink/competitor/local datasets, paid rank tracking, paid AI-search data, and other external paid-credit capabilities.

## G4 — Disable, Do Not Mass-Delete

Keep DataForSEO source code initially for upstream compatibility and lower fork divergence.

## G5 — Capability Gate Must Be End-to-End

Disabled paid features must not leak through onboarding, navigation, settings, dashboards, server/API functions, scheduled jobs, MCP registration, or agent tool lists.

## G6 — No Silent Paid Fallback

First-party mode must never silently call DataForSEO.

## G7 — Evidence Before Explanation

Prefer structured backend results containing source, date range, metrics, evidence, coverage/truncation, warnings, and result. The agent explains this evidence.

## G8 — Read-Only Google Connections

Keep GSC and GA4 read-only unless a future separately approved feature requires more.

## G9 — Token Security

Do not weaken encrypted OAuth-token handling.

## G10 — Upstream-Friendly Changes

Prefer feature/capability gates, isolated modules, existing service interfaces, and behavior tests. Avoid broad rewrites, deleting whole upstream feature trees, unrelated refactors, or unnecessary contract changes.
