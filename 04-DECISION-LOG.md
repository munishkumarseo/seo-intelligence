# Decision Log

## D-001 — Use OpenSEO as Foundation
**Status:** Approved

## D-002 — Use Existing OpenSEO Backend
**Status:** Approved

## D-003 — No User-Funded Paid SEO APIs
**Status:** Approved

Core product must work without DataForSEO or comparable paid SEO-data APIs.

## D-004 — Core Data Sources
**Status:** Approved

GSC, GA4, and first-party site audit/crawl.

## D-005 — Preserve OpenSEO Intelligence
**Status:** Approved

No competing custom scoring engine in V1.

## D-006 — Keep DataForSEO Code but Disable Its Capabilities
**Status:** Approved

Do not mass-delete it initially.

## D-007 — GSC and GA4 Stay Source of Truth
**Status:** Approved

The product interprets and prioritizes their data.

## D-008 — Agent Is Part of Product
**Status:** Approved direction

Agent orchestrates existing backend tools and explains evidence.

## D-009 — Preserve SearchOpportunityService
**Status:** Approved

Existing GSC+GA4 scoring remains unchanged initially.

## D-010 — Add First-Party Capability Mode
**Status:** Approved and implemented on the backend feature branch; verification status is tracked separately.

Default: `SEO_DATA_MODE=first_party`.
