# First-Party SEO Executive UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the merged first-party backend into an action-first SEO executive UI driven by GSC, optional GA4, Site Audit, and the existing OpenSEO agent, while preventing DataForSEO UI/background execution in `first_party` mode.

**Architecture:** Add one small server-owned product-capability contract derived from `SEO_DATA_MODE`, then make navigation, route access, onboarding, and dashboard reads obey it. Add a transparent GSC movement service for page/query position comparisons; keep `SearchOpportunityService` unchanged for GA4-enriched prioritization. Reuse the existing Search Performance, GA4 reporting, Site Audit, and SAM agent foundations instead of duplicating them.

**Tech Stack:** TypeScript 5.9, React 19, TanStack Start/Router/Query, Zod, Vitest, Tailwind 4/DaisyUI, Recharts, Cloudflare Workers, existing GSC/GA4 services.

**Spec:** `docs/superpowers/specs/2026-08-31-first-party-seo-executive-ui-design.md`

## Global Constraints

- `SEO_DATA_MODE=first_party` remains the default; `full` retains existing paid-provider capabilities.
- GSC is required to enter the main first-party product; GA4 is optional and must never block GSC-only use.
- Do not modify the production `SearchOpportunityService` scoring formula or weights.
- Do not create a second proprietary SEO score.
- GSC movement labels use a transparent absolute threshold of exactly `1.0` average-position point.
- Pages to Improve in GSC-only mode require current average position `4.0 <= position <= 20.0` and current impressions `> 0`.
- Default comparison is `last_28_days` versus the immediately preceding equivalent period; also support `last_7_days` and `last_3_months`.
- Missing/unjoined/unavailable GA4 data is unavailable (`—`), never fabricated as numeric zero.
- UI copy uses simple SEO terms: Ranking Improved, Newly Ranking, Ranking Dropped, Pages to Improve, Clicks, Impressions, CTR, Average Position, Position Change.
- First-party UI uses neutral shadcn-like charcoal/graphite/gray/off-white styling; no gradients, neon KPI cards, or bright red/green card backgrounds.
- No DataForSEO API-key modal/banner/warning/CTA and no paid-provider background request may run in `first_party` mode.
- Ask SEO reuses the existing OpenSEO/SAM agent; first-party prompts must not claim unsupported KD, external volume, CPC, backlink estimates, competitor rankings, or traffic estimates.

---

## File Structure Lock

### New shared/product files
- `src/shared/product-capabilities.ts` — pure capability contract derived from `SeoDataMode`.
- `src/shared/product-capabilities.test.ts` — mode/capability regression tests.
- `src/client/features/product/productCapabilitiesQuery.ts` — cached query options for `getProductCapabilities`.
- `src/client/navigation/routeAccess.ts` — pure first-party route classification/access decisions.
- `src/client/navigation/routeAccess.test.ts` — paid-route and GSC-gate tests.

### New GSC opportunity files
- `src/server/features/seo/pageIdentity.ts` — shared page-key normalization extracted unchanged from `SearchOpportunityService`.
- `src/server/features/seo/pageIdentity.test.ts` — URL identity regression tests.
- `src/server/features/gsc/services/SearchMovementService.ts` — current/previous GSC page movement and query drill-down.
- `src/server/features/gsc/services/SearchMovementService.test.ts` — classification, threshold, truncation, filters, sorting tests.
- `src/types/schemas/search-opportunities.ts` — Zod inputs reusing Search Performance ranges/devices.
- `src/serverFunctions/searchOpportunities.ts` — project-scoped Search Opportunities endpoints.
- `src/client/features/search-opportunities/SearchOpportunitiesPage.tsx` — tabs/table/filters/empty states.
- `src/client/features/search-opportunities/SearchOpportunityDrawer.tsx` — URL detail and keyword rows.
- `src/client/features/search-opportunities/searchOpportunityViewModel.ts` — display mapping/safe unknown formatting.
- `src/client/features/search-opportunities/searchOpportunityViewModel.test.ts` — display-semantic tests.
- `src/routes/_project/p/$projectId/search-opportunities.tsx` — route.

### New first-party overview/analytics files
- `src/server/features/dashboard/services/FirstPartyOverviewService.ts` — first-party-only aggregate; never imports paid-provider clients.
- `src/server/features/dashboard/services/FirstPartyOverviewService.test.ts` — no-paid-source and composition tests.
- `src/client/features/dashboard/FirstPartyDashboardPage.tsx` — action-first Overview.
- `src/server/features/ga4/services/Ga4SeoAnalyticsService.ts` — SEO-focused organic summary + landing pages composed from existing GA4 report layer.
- `src/server/features/ga4/services/Ga4SeoAnalyticsService.test.ts` — optional/missing metric semantics.
- `src/client/features/analytics/AnalyticsPage.tsx` — organic-only analytics view.
- `src/routes/_project/p/$projectId/analytics.tsx` — route.

### Existing files modified
- `src/serverFunctions/config.ts`
- `src/client/layout/AppShell.tsx`
- `src/client/navigation/items.ts`
- `src/client/components/Sidebar.tsx`
- `src/routes/_project/p/$projectId/route.tsx`
- `src/routes/_authenticated.onboarding.index.tsx`
- `src/client/features/onboarding/PostSignupOnboarding.tsx`
- `src/client/features/onboarding/SearchConsoleOnboardingStep.tsx`
- `src/server/features/ga4/services/SearchOpportunityService.ts` — only import shared page normalizer; scoring body stays byte-for-byte equivalent in behavior.
- `src/serverFunctions/dashboard.ts`
- `src/client/features/dashboard/DashboardPage.tsx`
- `src/client/features/search-performance/SearchPerformancePage.tsx`
- `src/routes/_project/p/$projectId/search-performance.tsx`
- `src/serverFunctions/ga4.ts`
- `src/routes/_project/p/$projectId/sam.tsx`
- `src/client/features/sam/SamChat.tsx`
- `src/client/features/sam/SamConversation.tsx`
- `05-IMPLEMENTATION-STATUS.md` — correct stale PR #1 reference to merged PR #2 while touching milestone docs.

---

### Task 1: Product capability contract and server exposure

**Files:**
- Create: `src/shared/product-capabilities.ts`
- Create: `src/shared/product-capabilities.test.ts`
- Modify: `src/serverFunctions/config.ts`
- Create: `src/client/features/product/productCapabilitiesQuery.ts`

**Interfaces:**
- Consumes: `resolveSeoDataMode(env.SEO_DATA_MODE)` from `src/shared/seo-data-mode.ts`.
- Produces:
  - `type ProductCapabilities`
  - `getProductCapabilitiesForMode(mode: SeoDataMode): ProductCapabilities`
  - server function `getProductCapabilities()`
  - `productCapabilitiesQueryOptions()` for React Query consumers.

- [ ] **Step 1: Write the failing capability tests**

```ts
import { describe, expect, it } from "vitest";
import { getProductCapabilitiesForMode } from "@/shared/product-capabilities";

describe("getProductCapabilitiesForMode", () => {
  it("exposes only first-party product features in first_party mode", () => {
    const result = getProductCapabilitiesForMode("first_party");
    expect(result.dataMode).toBe("first_party");
    expect(result.features).toMatchObject({
      gsc: true,
      ga4: true,
      siteAudit: true,
      searchOpportunities: true,
      askSeo: true,
      keywordResearch: false,
      savedKeywords: false,
      rankTracking: false,
      domainResearch: false,
      backlinks: false,
      brandLookup: false,
      promptExplorer: false,
      dataForSeoSetup: false,
    });
  });

  it("keeps paid-provider features enabled in full mode", () => {
    const result = getProductCapabilitiesForMode("full");
    expect(result.dataMode).toBe("full");
    expect(result.features.dataForSeoSetup).toBe(true);
    expect(result.features.backlinks).toBe(true);
    expect(result.features.keywordResearch).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm exec vitest run src/shared/product-capabilities.test.ts`

Expected: FAIL because `@/shared/product-capabilities` does not exist.

- [ ] **Step 3: Implement the pure contract**

Create `src/shared/product-capabilities.ts` with a readonly shape. Keep mode conversion pure and explicit:

```ts
import type { SeoDataMode } from "@/shared/seo-data-mode";

export type ProductCapabilities = {
  dataMode: SeoDataMode;
  features: {
    gsc: boolean;
    ga4: boolean;
    siteAudit: boolean;
    searchOpportunities: boolean;
    askSeo: boolean;
    keywordResearch: boolean;
    savedKeywords: boolean;
    rankTracking: boolean;
    domainResearch: boolean;
    backlinks: boolean;
    brandLookup: boolean;
    promptExplorer: boolean;
    dataForSeoSetup: boolean;
  };
};

export function getProductCapabilitiesForMode(
  dataMode: SeoDataMode,
): ProductCapabilities {
  const paid = dataMode === "full";
  return {
    dataMode,
    features: {
      gsc: true,
      ga4: true,
      siteAudit: true,
      searchOpportunities: true,
      askSeo: true,
      keywordResearch: paid,
      savedKeywords: paid,
      rankTracking: paid,
      domainResearch: paid,
      backlinks: paid,
      brandLookup: paid,
      promptExplorer: paid,
      dataForSeoSetup: paid,
    },
  };
}
```

Expose it in `src/serverFunctions/config.ts` without returning raw env values:

```ts
export const getProductCapabilities = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(() =>
    getProductCapabilitiesForMode(resolveSeoDataMode(env.SEO_DATA_MODE)),
  );
```

Add cached client query options:

```ts
export const productCapabilitiesQueryOptions = () =>
  queryOptions({
    queryKey: ["productCapabilities"],
    queryFn: () => getProductCapabilities(),
    staleTime: Infinity,
  });
```

- [ ] **Step 4: Run focused tests and typecheck**

Run:
- `pnpm exec vitest run src/shared/product-capabilities.test.ts`
- `pnpm typecheck`

Expected: PASS / exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/shared/product-capabilities.ts src/shared/product-capabilities.test.ts src/serverFunctions/config.ts src/client/features/product/productCapabilitiesQuery.ts
git commit -m "feat: expose product capabilities by data mode"
```

---

### Task 2: First-party navigation, AppShell suppression, and centralized route access

**Files:**
- Modify: `src/client/navigation/items.ts`
- Create: `src/client/navigation/items.test.ts`
- Create: `src/client/navigation/routeAccess.ts`
- Create: `src/client/navigation/routeAccess.test.ts`
- Modify: `src/client/components/Sidebar.tsx`
- Modify: `src/client/layout/AppShell.tsx`
- Modify: `src/routes/_project/p/$projectId/route.tsx`

**Interfaces:**
- Consumes: `ProductCapabilities` and `productCapabilitiesQueryOptions()` from Task 1.
- Produces:
  - `getProjectNavGroups(projectId, capabilities)`
  - `getProjectRouteDecision(pathname, capabilities, hasGsc)` returning `allow | redirect-overview | redirect-gsc-setup`.

- [ ] **Step 1: Write failing navigation/access tests**

Test the exact first-party labels/order and paid-route behavior:

```ts
const firstParty = getProductCapabilitiesForMode("first_party");
expect(flattenNav(getProjectNavGroups("p1", firstParty))).toEqual([
  "Overview",
  "Search Opportunities",
  "Search Console",
  "Analytics",
  "Site Audit",
  "Ask SEO",
]);

expect(
  getProjectRouteDecision("/p/p1/backlinks", firstParty, true),
).toEqual({ kind: "redirect-overview" });
expect(
  getProjectRouteDecision("/p/p1/settings/integrations", firstParty, false),
).toEqual({ kind: "allow" });
expect(
  getProjectRouteDecision("/p/p1/search-opportunities", firstParty, false),
).toEqual({ kind: "redirect-gsc-setup" });
```

Also assert `full` mode keeps existing paid labels/routes available.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm exec vitest run src/client/navigation/items.test.ts src/client/navigation/routeAccess.test.ts`

Expected: FAIL because capability-aware APIs do not exist.

- [ ] **Step 3: Implement capability-aware nav**

Keep the first-party navigation exactly:

```text
Overview
Search Opportunities
Search Console
Analytics
Site Audit
Ask SEO
```

Map Search Console to the existing `/p/$projectId/search-performance` route and Ask SEO to existing `/p/$projectId/sam`; do not rename physical routes merely for display copy.

In `Sidebar.tsx`, read the cached capability query and pass the result into navigation construction. Preserve full-mode Browse/Chat behavior unless it conflicts with the first-party top-level Ask SEO item; in first-party mode the visible Browse list must contain Ask SEO exactly once.

- [ ] **Step 4: Suppress DataForSEO setup reads/UI at source**

In `AppShell.tsx`, fetch product capabilities first and gate the existing `getSeoApiKeyStatus` query with React Query `enabled: capabilities.features.dataForSeoSetup`. Render `MissingSeoSetupModal` and `SeoApiStatusBanners` only when that capability is true.

Required invariant:

```ts
const shouldLoadPaidSetup = capabilities.features.dataForSeoSetup;
// first_party => false, so getSeoApiKeyStatus is not called at all.
```

Do not merely hide the modal after the request runs.

- [ ] **Step 5: Implement centralized project-route decision**

`routeAccess.ts` must classify these first-party-disabled suffixes:

```ts
[
  "/keywords",
  "/saved",
  "/rank-tracking",
  "/domain",
  "/backlinks",
  "/brand-lookup",
  "/prompt-explorer",
]
```

Settings and integrations remain accessible without GSC. The project layout may use a client effect/query, matching the existing non-blocking access-redirect pattern, but must not loop from GSC setup back into itself.

When redirecting a paid route, navigate to `/p/$projectId` with a short-lived search/toast state whose visible copy is exactly: `This feature isn't available in first-party mode.`

When GSC is absent, redirect normal product pages to the GSC setup/onboarding destination, but exempt Settings/Integrations and auth/setup routes needed to connect GSC.

- [ ] **Step 6: Run focused tests and typecheck**

Run:
- `pnpm exec vitest run src/client/navigation/items.test.ts src/client/navigation/routeAccess.test.ts`
- `pnpm typecheck`

Expected: PASS / exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/client/navigation src/client/components/Sidebar.tsx src/client/layout/AppShell.tsx src/routes/_project/p/'$projectId'/route.tsx
git commit -m "feat: gate first-party navigation and paid routes"
```

---

### Task 3: Replace required onboarding with GSC-first, GA4-optional activation

**Files:**
- Modify: `src/routes/_authenticated.onboarding.index.tsx`
- Modify: `src/client/features/onboarding/PostSignupOnboarding.tsx`
- Modify: `src/client/features/onboarding/SearchConsoleOnboardingStep.tsx`
- Create: `src/client/features/onboarding/FirstPartyActivation.tsx`
- Create: `src/client/features/onboarding/firstPartyActivation.test.ts`
- Reuse without duplicating: `src/client/features/ga4/GoogleAnalyticsConnectionCard.tsx`
- Reuse without duplicating: `src/client/features/ga4/Ga4PropertyPicker.tsx`

**Interfaces:**
- Consumes: product capabilities, existing GSC connection/property flow, existing GA4 connection/property flow.
- Produces: `getFirstPartyActivationStep({ hasGscProperty, ga4Choice, hasGa4Property })` and a first-party activation component.

- [ ] **Step 1: Write failing activation-state tests**

```ts
expect(getFirstPartyActivationStep({
  hasGscProperty: false,
  ga4Choice: "undecided",
  hasGa4Property: false,
})).toBe("gsc");

expect(getFirstPartyActivationStep({
  hasGscProperty: true,
  ga4Choice: "undecided",
  hasGa4Property: false,
})).toBe("ga4");

expect(getFirstPartyActivationStep({
  hasGscProperty: true,
  ga4Choice: "skipped",
  hasGa4Property: false,
})).toBe("complete");
```

- [ ] **Step 2: Run focused test and verify RED**

Run: `pnpm exec vitest run src/client/features/onboarding/firstPartyActivation.test.ts`

Expected: FAIL because activation helper does not exist.

- [ ] **Step 3: Implement the first-party activation flow**

In first-party mode the required flow is only:

```text
Create project → Connect GSC → select verified property → GA4 recommended/skippable → select GA4 property if connected → Overview
```

Do not render the existing required task/profile/referral questions in first-party mode. Remove country/language copy that claims it powers paid keyword/SERP/domain tooling from the first-party path.

GSC step copy must mention Clicks, Impressions, CTR, Average Position, Position Changes, Search Opportunities. GA4 step copy must explain Organic Sessions, Engagement, Key Events/Conversions, Revenue, Landing Pages and include `Skip for now`.

- [ ] **Step 4: Preserve full-mode onboarding**

Branch by product capability/data mode at the onboarding route/component boundary. The existing profile/marketing onboarding remains reachable in `full` mode so this milestone does not silently redesign the full product.

- [ ] **Step 5: Run focused test + existing onboarding tests + typecheck**

Run:
- `pnpm exec vitest run src/client/features/onboarding/firstPartyActivation.test.ts`
- `pnpm typecheck`

Expected: PASS / exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/routes/_authenticated.onboarding.index.tsx src/client/features/onboarding
git commit -m "feat: add first-party Google activation flow"
```

---

### Task 4: Extract page identity and build transparent GSC movement engine

**Files:**
- Create: `src/server/features/seo/pageIdentity.ts`
- Create: `src/server/features/seo/pageIdentity.test.ts`
- Modify: `src/server/features/ga4/services/SearchOpportunityService.ts`
- Create: `src/server/features/gsc/services/SearchMovementService.ts`
- Create: `src/server/features/gsc/services/SearchMovementService.test.ts`

**Interfaces:**
- Produces:
  - `normalizePageKey(value: string): string | null`
  - `SearchMovementService.getPageMovements(input)`
  - `SearchMovementService.getPageQueries(input)`
- Consumes: `resolveDateRange`, `previousPeriod`, `GscService.getPerformance`, existing `GscPerformanceFilter`.

- [ ] **Step 1: Lock current URL normalization with tests**

Tests must cover:

```ts
expect(normalizePageKey("https://Example.com/foo/")).toBe("example.com/foo");
expect(normalizePageKey("http://example.com:80/foo")).toBe("example.com/foo");
expect(normalizePageKey("https://example.com:8443/foo/")).toBe("example.com:8443/foo");
expect(normalizePageKey("(not set)")).toBeNull();
```

- [ ] **Step 2: Run page identity test and verify RED**

Run: `pnpm exec vitest run src/server/features/seo/pageIdentity.test.ts`

Expected: FAIL because shared normalizer does not exist.

- [ ] **Step 3: Move the existing normalizer without changing scoring behavior**

Copy the current `normalizePageKey` implementation from `SearchOpportunityService.ts` into `pageIdentity.ts`; import it back into `SearchOpportunityService.ts`. Do not edit candidate filters, score components, weights, sort, truncation, or warnings.

Run the existing SearchOpportunityService regression test after the extraction.

- [ ] **Step 4: Write failing movement-service tests**

Use mocked GSC rows to verify exact semantics:

```ts
// improved
previous position 11.4, current 6.8 => positionChange 4.6, category "improved"
// dropped
previous 4.8, current 9.1 => -4.3, category "dropped"
// stable
previous 8.1, current 8.0 => omitted from improved/dropped
// pages to improve
current position 4.0 and 20.0 with impressions > 0 => included
position 3.9 or 20.1 => excluded
// newly ranking
current impressions > 0 + no previous normalized page => "new"
// truncation safety
previous fetch length reaches row limit => do not classify absent page as "new"
```

Also test identical device/country filters are used on both current and previous calls.

- [ ] **Step 5: Implement page movement reads**

Use `SEARCH_PERFORMANCE_RANGES` semantics and `resolveDateRange({ dateRange })`, then `previousPeriod(startDate, endDate)`.

Fetch page rows for current and previous with:

```ts
{
  dimensions: ["page"],
  filters,
  rowLimit: 1000,
  type: "web",
  dataState: "final",
}
```

Return a typed row containing:

```ts
{
  page: string;
  normalizedPage: string;
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
  previousAveragePosition: number | null;
  positionChange: number | null;
  category: "improved" | "new" | "dropped" | "improve" | "stable";
}
```

A page may satisfy Pages to Improve independently of movement; model `isPageToImprove: boolean` rather than forcing mutually exclusive categories if that makes the implementation clearer. Tabs are projections over the same evidence, not competing labels.

- [ ] **Step 6: Implement query drill-down**

For one selected page, make current/previous GSC calls with `dimensions: ["query"]` and an exact page filter:

```ts
{ dimension: "page", operator: "equals", expression: input.page }
```

Add selected device/country filters identically to both periods. Compare query keys exactly as returned by GSC. Return Average Position, Previous Position, Position Change, Impressions, Clicks, CTR. Stable queries may remain visible; movement label uses the same 1.0 threshold.

- [ ] **Step 7: Run focused + scoring regression tests**

Run:
- `pnpm exec vitest run src/server/features/seo/pageIdentity.test.ts src/server/features/gsc/services/SearchMovementService.test.ts`
- `pnpm exec vitest run src/server/features/ga4/services/SearchOpportunityService.test.ts`
- `pnpm typecheck`

Expected: PASS / exit 0. If the existing SearchOpportunityService test filename differs, locate the co-located test containing the locked formula and run that exact file before committing.

- [ ] **Step 8: Commit**

```bash
git add src/server/features/seo src/server/features/gsc/services/SearchMovementService.ts src/server/features/gsc/services/SearchMovementService.test.ts src/server/features/ga4/services/SearchOpportunityService.ts
git commit -m "feat: add first-party GSC ranking movement intelligence"
```

---

### Task 5: Search Opportunities API and URL/keyword search semantics

**Files:**
- Create: `src/types/schemas/search-opportunities.ts`
- Create: `src/serverFunctions/searchOpportunities.ts`
- Create: `src/server/features/gsc/services/SearchOpportunityQueryFilter.ts`
- Create: `src/server/features/gsc/services/SearchOpportunityQueryFilter.test.ts`

**Interfaces:**
- Consumes: `SearchMovementService`, `SearchOpportunityService`, `SEARCH_PERFORMANCE_RANGES`, `GSC_DEVICES`.
- Produces:
  - `getSearchOpportunities`
  - `getSearchOpportunityQueries`
  - input schema with `dateRange`, optional `device`, optional `country`, `tab`, optional `search`, `limit`.

- [ ] **Step 1: Write failing keyword-search filter tests**

The table search must support URL or keyword without deriving page metrics from query rows. Test that URL-looking input filters normalized page results directly; keyword input uses a GSC `query contains` call to find matching page identities, then intersects those identities with page-level movement rows.

```ts
expect(classifyOpportunitySearch("/dental-crowns")).toBe("page");
expect(classifyOpportunitySearch("dental crown montreal")).toBe("query");
```

Use a deterministic rule: inputs containing `/`, `://`, or `.` with no spaces are treated as page search; other non-empty inputs are query search.

- [ ] **Step 2: Run focused test and verify RED**

Run: `pnpm exec vitest run src/server/features/gsc/services/SearchOpportunityQueryFilter.test.ts`

Expected: FAIL because filter helper does not exist.

- [ ] **Step 3: Implement schemas and server functions**

Use these exact tab values:

```ts
["improved", "new", "dropped", "improve"] as const
```

Default date range: `last_28_days`; default `limit`: 100; maximum: 100.

`getSearchOpportunities` flow:
1. get GSC movement evidence;
2. project rows for requested tab;
3. apply URL/keyword search semantics;
4. if tab is `improve` and GA4 is connected, call existing `SearchOpportunityService.getOpportunities` with the same resolved current dates and merge its `score`/GA4 payload by `normalizePageKey`;
5. sort GSC-only Pages to Improve by impressions descending; when an existing OpenSEO score is available, score-desc ordering may lead; never expose score components by default;
6. keep unjoined GA4 fields `null`.

`getSearchOpportunityQueries` delegates to the movement service and returns the drawer payload.

- [ ] **Step 4: Verify server behavior**

Run:
- `pnpm exec vitest run src/server/features/gsc/services/SearchOpportunityQueryFilter.test.ts src/server/features/gsc/services/SearchMovementService.test.ts`
- `pnpm typecheck`

Expected: PASS / exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/types/schemas/search-opportunities.ts src/serverFunctions/searchOpportunities.ts src/server/features/gsc/services/SearchOpportunityQueryFilter.ts src/server/features/gsc/services/SearchOpportunityQueryFilter.test.ts
git commit -m "feat: expose first-party search opportunities"
```

---

### Task 6: Search Opportunities page and right-side URL drawer

**Files:**
- Create: `src/client/features/search-opportunities/SearchOpportunitiesPage.tsx`
- Create: `src/client/features/search-opportunities/SearchOpportunityDrawer.tsx`
- Create: `src/client/features/search-opportunities/searchOpportunityViewModel.ts`
- Create: `src/client/features/search-opportunities/searchOpportunityViewModel.test.ts`
- Create: `src/routes/_project/p/$projectId/search-opportunities.tsx`

**Interfaces:**
- Consumes: Task 5 server functions.
- Produces: first-party Search Opportunities UI and drawer.

- [ ] **Step 1: Write failing view-model tests**

```ts
expect(formatPositionChange(4.6)).toEqual({ label: "Improved 4.6", direction: "up" });
expect(formatPositionChange(-4.3)).toEqual({ label: "Dropped 4.3", direction: "down" });
expect(formatOptionalMetric(null)).toBe("—");
expect(formatOptionalMetric(0)).toBe("0");
```

Also test the visible tab labels exactly:
`Ranking Improved`, `Newly Ranking`, `Ranking Dropped`, `Pages to Improve`.

- [ ] **Step 2: Run focused test and verify RED**

Run: `pnpm exec vitest run src/client/features/search-opportunities/searchOpportunityViewModel.test.ts`

Expected: FAIL because view-model helpers do not exist.

- [ ] **Step 3: Build the page with the approved controls**

UI requirements:
- tab row with the four approved labels;
- date selector 7 days / 28 days / 3 months, default 28 days;
- Device and Country filters;
- one Search field for URL or keyword;
- sortable columns Position Change, Average Position, Impressions, Clicks, CTR;
- optional GA4 columns only when GA4 enrichment exists;
- neutral empty/error/freshness states;
- no “striking distance”, “reachability”, percentile, or score-component copy.

- [ ] **Step 4: Build the right-side drawer**

Clicking a URL must open `SearchOpportunityDrawer` without navigating away. Preserve current tab/filter/search state behind the drawer. Drawer shows page summary followed by `Keywords for this page` with Keyword, Average Position, Previous Position, Position Change, Impressions, Clicks, CTR.

Add `Ask SEO` action affordance but wire its context navigation in Task 10.

- [ ] **Step 5: Apply neutral visual system**

Use existing theme tokens (`bg-base-100`, `border-base-300`, restrained `text-base-content/*`) and charcoal/gray hierarchy. Do not introduce a new UI library dependency. Ranking direction uses arrow + words; avoid red/green filled cards.

- [ ] **Step 6: Run focused tests, typecheck, and production build**

Run:
- `pnpm exec vitest run src/client/features/search-opportunities/searchOpportunityViewModel.test.ts`
- `pnpm typecheck`
- `pnpm build`

Expected: PASS / exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/client/features/search-opportunities src/routes/_project/p/'$projectId'/search-opportunities.tsx
git commit -m "feat: add search opportunities workspace"
```

---

### Task 7: First-party action-first Overview with zero paid-provider reads

**Files:**
- Create: `src/server/features/dashboard/services/FirstPartyOverviewService.ts`
- Create: `src/server/features/dashboard/services/FirstPartyOverviewService.test.ts`
- Modify: `src/serverFunctions/dashboard.ts`
- Create: `src/client/features/dashboard/FirstPartyDashboardPage.tsx`
- Modify: `src/client/features/dashboard/DashboardPage.tsx`

**Interfaces:**
- Consumes: `SearchMovementService`, existing audit service/repository used by DashboardService, `Ga4OrganicOverviewService` when connected.
- Produces: `getFirstPartyOverview` server function and action-first first-party dashboard.

- [ ] **Step 1: Write failing service tests proving paid sources are absent**

Mock first-party collaborators only and assert returned sections contain:
- top dropped pages;
- Pages to Improve;
- audit summary;
- improved pages;
- newly ranking pages;
- GSC totals/comparison;
- optional GA4 organic summary.

The implementation file must not import DataForSEO, backlinks, rank-tracking, competitor, or paid-provider clients. Add a static regression assertion in the test that reads the service source text and rejects imports containing `/backlinks`, `dataforseo`, or `rank-tracking` if the repository already uses source-file guard tests; otherwise keep this as a code-review checklist plus behavior mocks.

- [ ] **Step 2: Run service test and verify RED**

Run: `pnpm exec vitest run src/server/features/dashboard/services/FirstPartyOverviewService.test.ts`

Expected: FAIL because service does not exist.

- [ ] **Step 3: Implement first-party overview composition**

Use the approved order:
1. Ranking Dropped
2. Pages to Improve
3. Important Site Audit Issues
4. Ranking Improved
5. Newly Ranking
6. Search Performance snapshot
7. Organic Performance snapshot if GA4 connected
8. Site Audit summary
9. Ask SEO shortcut

Keep this service separate from the existing `DashboardService.getOverview`, because that existing path includes rank tracking/backlink summaries.

- [ ] **Step 4: Make DashboardPage mode-aware before queries execute**

In `first_party`, render `FirstPartyDashboardPage` and do not create/enable the existing backlink snapshot refresh query/mutation. In `full`, preserve the current DashboardPage behavior.

No client-side pattern like “fetch old overview then hide backlink card” is allowed.

- [ ] **Step 5: Build the action-first neutral dashboard**

Use simple cards/rows with URL, Average Position movement, Impressions, Clicks, CTR, `View Keywords`, and `Ask SEO`. KPI snapshots come after action sections. If GA4 is absent, show a small optional `Connect Google Analytics` card linking to Settings → Integrations, not a warning.

- [ ] **Step 6: Run focused tests + typecheck + build**

Run:
- `pnpm exec vitest run src/server/features/dashboard/services/FirstPartyOverviewService.test.ts`
- `pnpm typecheck`
- `pnpm build`

Expected: PASS / exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/server/features/dashboard/services/FirstPartyOverviewService.ts src/server/features/dashboard/services/FirstPartyOverviewService.test.ts src/serverFunctions/dashboard.ts src/client/features/dashboard
git commit -m "feat: add action-first first-party overview"
```

---

### Task 8: Reposition existing Search Performance as Search Console

**Files:**
- Modify: `src/client/features/search-performance/SearchPerformancePage.tsx`
- Modify: `src/routes/_project/p/$projectId/search-performance.tsx`
- Test: existing Search Performance tests plus navigation test from Task 2.

**Interfaces:**
- Consumes: existing `getSearchPerformanceReport`, table/export functions.
- Produces: same route/data behavior with product-facing label `Search Console`.

- [ ] **Step 1: Add/adjust a failing copy regression test**

If the current page has a component test, assert heading `Search Console` and that raw metrics still include Clicks, Impressions, CTR, Average Position. If it does not have a component-test harness, add a pure exported `SEARCH_CONSOLE_PAGE_TITLE = "Search Console"` constant to the feature and test that constant together with nav label consistency.

- [ ] **Step 2: Verify RED**

Run the exact Search Performance/label test file.

Expected: FAIL because current title is `Search Performance`.

- [ ] **Step 3: Update presentation only**

Rename visible heading/copy from Search Performance/GSC Insights to Search Console where it represents the page. Preserve current queries, pages, current/previous totals, date/device/country filters, export, and existing connection-card behavior.

Do not create a new Search Console data implementation.

- [ ] **Step 4: Run tests + typecheck**

Run:
- Search Performance focused test(s)
- `pnpm exec vitest run src/client/navigation/items.test.ts`
- `pnpm typecheck`

Expected: PASS / exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/client/features/search-performance/SearchPerformancePage.tsx src/routes/_project/p/'$projectId'/search-performance.tsx src/client/navigation/items.test.ts
git commit -m "refactor: position search performance as Search Console"
```

---

### Task 9: SEO-focused Analytics page using existing GA4 reporting

**Files:**
- Create: `src/server/features/ga4/services/Ga4SeoAnalyticsService.ts`
- Create: `src/server/features/ga4/services/Ga4SeoAnalyticsService.test.ts`
- Modify: `src/serverFunctions/ga4.ts`
- Create: `src/client/features/analytics/AnalyticsPage.tsx`
- Create: `src/client/features/analytics/analyticsViewModel.ts`
- Create: `src/client/features/analytics/analyticsViewModel.test.ts`
- Create: `src/routes/_project/p/$projectId/analytics.tsx`

**Interfaces:**
- Consumes: `Ga4OrganicOverviewService`, `Ga4ReportingService.runReport({ kind: "landing_pages", channel: "organic_search" })`.
- Produces: `getGa4SeoAnalytics` returning organic KPI summary/comparison/trend plus organic landing pages.

- [ ] **Step 1: Write failing analytics-service tests**

Verify:
- GA4 disconnected maps to an explicit `connected: false`/expected connection state, not an app crash;
- current/previous organic summary is reused from `Ga4OrganicOverviewService`;
- landing page report is organic-only;
- missing `purchaseRevenue` remains `null`;
- an actual reported `0` remains `0`.

- [ ] **Step 2: Run service test and verify RED**

Run: `pnpm exec vitest run src/server/features/ga4/services/Ga4SeoAnalyticsService.test.ts`

Expected: FAIL because service does not exist.

- [ ] **Step 3: Implement service composition**

Do not write a second GA4 HTTP client. Compose:

```ts
const [overview, landingPages] = await Promise.all([
  Ga4OrganicOverviewService.getOrganicOverview(...),
  Ga4ReportingService.runReport({
    projectId,
    kind: "landing_pages",
    channel: "organic_search",
    startDate,
    endDate,
    limit: 100,
    offset: 0,
  }),
]);
```

Return only SEO-relevant data. Preserve report metadata/warnings needed for freshness/limited-data messaging.

- [ ] **Step 4: Write and pass view-model tests**

Test `formatAnalyticsMetric(null) === "—"`, `formatAnalyticsMetric(0) === "0"`, and that only organic KPI labels are exported by the view model.

- [ ] **Step 5: Build Analytics UI**

Sections:
- Organic Sessions, Organic Users, Engagement Rate, Key Events, Revenue when available;
- previous-period comparison;
- organic trend chart(s) using existing Recharts patterns;
- Top Organic Landing Pages table with URL, Sessions, Users, Engagement, Key Events, Revenue;
- when GA4 absent, a neutral Connect Google Analytics state linking to Integrations.

Do not add Paid Search, Direct, Referral, Social, campaigns, demographics, attribution, or realtime.

- [ ] **Step 6: Run focused tests + typecheck + build**

Run:
- `pnpm exec vitest run src/server/features/ga4/services/Ga4SeoAnalyticsService.test.ts src/client/features/analytics/analyticsViewModel.test.ts`
- `pnpm typecheck`
- `pnpm build`

Expected: PASS / exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/server/features/ga4/services/Ga4SeoAnalyticsService.ts src/server/features/ga4/services/Ga4SeoAnalyticsService.test.ts src/serverFunctions/ga4.ts src/client/features/analytics src/routes/_project/p/'$projectId'/analytics.tsx
git commit -m "feat: add organic SEO analytics view"
```

---

### Task 10: Present SAM as Ask SEO and support contextual actions

**Files:**
- Modify: `src/routes/_project/p/$projectId/sam.tsx`
- Modify: `src/client/features/sam/SamChat.tsx`
- Modify: `src/client/features/sam/SamConversation.tsx`
- Create: `src/client/features/sam/askSeoContext.ts`
- Create: `src/client/features/sam/askSeoContext.test.ts`
- Modify: `src/client/features/search-opportunities/SearchOpportunityDrawer.tsx`
- Modify: `src/client/features/dashboard/FirstPartyDashboardPage.tsx`

**Interfaces:**
- Consumes: existing SAM session creation/conversation and first-party row metrics.
- Produces: optional SAM route search param `q` for a prefilled first-party question/context payload, plus simple first-party suggestions.

- [ ] **Step 1: Write failing context-builder tests**

```ts
expect(buildAskSeoPagePrompt({
  page: "https://example.com/dental-crowns",
  averagePosition: 6.8,
  previousAveragePosition: 11.4,
  impressions: 12480,
  clicks: 620,
  ctr: 0.0497,
})).toContain("Average position: 11.4 → 6.8");
```

The builder must include only visible first-party metrics and must not add KD, volume, CPC, backlinks, competitor rank, or traffic estimates.

- [ ] **Step 2: Run focused test and verify RED**

Run: `pnpm exec vitest run src/client/features/sam/askSeoContext.test.ts`

Expected: FAIL because context builder does not exist.

- [ ] **Step 3: Extend SAM route search schema safely**

Keep existing `s` session id and add optional `q: z.string().max(4000).optional()`. `SamChat` may create/select a session as today; pass `q` to `SamConversation` only as a one-time suggested/prefilled prompt. Do not auto-send without user action unless existing chat behavior already has an explicit safe mechanism for it.

- [ ] **Step 4: Replace paid-provider-facing first-party copy**

In first-party mode, empty-state suggestions are exactly in this family:
- Which pages lost rankings?
- Which URLs are improving?
- Which pages should I improve first?
- Why did organic traffic drop?
- Which technical issues matter most?
- Which pages get traffic but few conversions?

Remove first-party claims that SAM can read SERP competitors, backlinks, paid keyword research, or rank tracking. Preserve those claims/suggestions in `full` mode where capability permits.

Visible first-party product name is `Ask SEO`; the physical route can remain `/sam`.

- [ ] **Step 5: Wire Ask SEO actions**

Dashboard cards and Search Opportunity drawer navigate to `/p/$projectId/sam?q=...` using `buildAskSeoPagePrompt`. Keep the prompt evidence-first: summarize what data shows, then ask the agent what to check next.

- [ ] **Step 6: Run focused tests + typecheck + build**

Run:
- `pnpm exec vitest run src/client/features/sam/askSeoContext.test.ts`
- `pnpm typecheck`
- `pnpm build`

Expected: PASS / exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/routes/_project/p/'$projectId'/sam.tsx src/client/features/sam src/client/features/search-opportunities/SearchOpportunityDrawer.tsx src/client/features/dashboard/FirstPartyDashboardPage.tsx
git commit -m "feat: present first-party agent as Ask SEO"
```

---

### Task 11: Cross-feature first-party safety, visual cleanup, docs, and full verification

**Files:**
- Modify as needed only within files touched by Tasks 1–10.
- Modify: `05-IMPLEMENTATION-STATUS.md`
- Test: all new tests plus existing SearchOpportunityService regression and existing mode/DataForSEO tests.

**Interfaces:**
- Consumes: every task above.
- Produces: verified milestone ready for code review/PR.

- [ ] **Step 1: Add a first-party regression matrix test where pure logic permits**

At minimum verify together:

```text
first_party:
  nav = approved six top-level product destinations
  paid routes = redirect Overview
  no GSC = setup redirect except integrations
  GA4 absent = allowed
  DataForSEO setup capability = false
full:
  paid-provider capabilities remain true
```

Use existing pure helpers from Tasks 1–3; do not create an end-to-end test that duplicates all unit assertions.

- [ ] **Step 2: Verify neutral styling and terminology by source scan**

Run targeted searches before full CI:

```bash
rg -n "striking distance|reachability|percentile demand|GSC Insights" src/client/features/search-opportunities src/client/features/dashboard/FirstPartyDashboardPage.tsx src/client/navigation/items.ts
rg -n "DataForSEO|backlink|competitor|rank tracking" src/client/features/dashboard/FirstPartyDashboardPage.tsx src/client/features/search-opportunities src/client/features/sam
```

Expected: no prohibited first-party user-facing terminology. Any technical reference that remains must be internal/test/full-mode-only and reviewed individually.

Also inspect new first-party components for gradients and saturated movement-card classes; ranking direction should be conveyed primarily with arrows/labels/typography.

- [ ] **Step 3: Correct the stale implementation-status PR reference**

Update `05-IMPLEMENTATION-STATUS.md` so the merged backend milestone references PR #2 and merge commit `f8c23085569a651aa932407c92a390dbaefa659b`, not closed PR #1. Do not rewrite unrelated historical notes.

- [ ] **Step 4: Run the complete verification suite**

Run in this order and read full output after each:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:worker:bundle
pnpm build
```

Expected: every command exits 0. Record actual Vitest file/test counts from this fresh run; do not reuse the backend milestone counts.

- [ ] **Step 5: Re-run critical safety/regression tests explicitly**

Run:

```bash
pnpm exec vitest run src/shared/product-capabilities.test.ts
pnpm exec vitest run src/client/navigation/routeAccess.test.ts
pnpm exec vitest run src/server/features/gsc/services/SearchMovementService.test.ts
pnpm exec vitest run src/server/features/dashboard/services/FirstPartyOverviewService.test.ts
pnpm exec vitest run src/server/features/ga4/services/Ga4SeoAnalyticsService.test.ts
```

Then run the existing tests that lock:
- `SEO_DATA_MODE` default/full behavior;
- central DataForSEO first-party hard kill switch;
- SearchOpportunityService formula.

Expected: all PASS.

- [ ] **Step 6: Manual browser smoke checklist**

In `first_party` mode, verify with a project that has GSC but no GA4:
- onboarding requires GSC and allows GA4 skip;
- Overview renders GSC actions without paid cards;
- Search Opportunities shows all four tabs and 28-day default;
- a URL drawer shows query rows;
- Search Console opens existing GSC evidence view;
- Analytics shows non-blocking GA4 connect state;
- Ask SEO opens with first-party copy;
- `/backlinks` and `/keywords` redirect to Overview;
- no DataForSEO setup modal/banner appears and browser network panel shows no DataForSEO-backed dashboard request.

Repeat with GSC + GA4 and verify GA4 enrichment appears without turning unknown joins into zero.

In `full` mode, smoke the existing paid navigation and DataForSEO setup UX to ensure capability gating did not remove them.

- [ ] **Step 7: Commit verification/docs cleanup**

```bash
git add 05-IMPLEMENTATION-STATUS.md src
git commit -m "chore: verify first-party SEO executive UI"
```

- [ ] **Step 8: Invoke completion workflow**

Before claiming completion, use `superpowers:verification-before-completion` with the fresh outputs above. Then use `superpowers:requesting-code-review` before merge/PR handoff. Do not merge directly to `main` without the normal review gate.

---

## Execution Order and Review Gates

Implement strictly Task 1 → Task 11. Each task ends in its own commit and can be independently reviewed. Do not start a later task if the previous task's focused tests/typecheck are red.

At execution time, first create an isolated worktree/feature branch using `superpowers:using-git-worktrees`; suggested branch name: `feat/first-party-seo-executive-ui` based on current `main`, then bring the approved spec and this plan into that worktree if they are not yet merged.

Recommended execution mode: `superpowers:subagent-driven-development` so each task receives fresh context and gets two-stage review. Inline execution is acceptable only through `superpowers:executing-plans` with checkpoints.
