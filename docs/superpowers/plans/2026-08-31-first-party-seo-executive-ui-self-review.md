# First-Party SEO Executive UI Plan Self-Review Amendments

Date: 2026-08-31
Status: Final self-review corrections

This document is an authoritative amendment to `docs/superpowers/plans/2026-08-31-first-party-seo-executive-ui.md`. Where this file conflicts with the original implementation plan, this file wins. All other tasks and constraints in the original plan remain unchanged.

The approved design is confirmed by `docs/superpowers/specs/2026-08-31-first-party-seo-executive-ui-design-approval.md`.

## Correction 1 — GSC property selection, not legacy onboarding completion, is the first-party activation gate

The original plan did not fully account for existing users whose old OpenSEO onboarding already has `completedAt` set. In `first_party` mode that legacy flag must not allow a project with no selected GSC property into the product.

### Task 2 interface correction

Replace:

```ts
getProjectRouteDecision(pathname, capabilities, hasGsc)
```

with:

```ts
getProjectRouteDecision(
  pathname: string,
  capabilities: ProductCapabilities,
  hasSelectedGscProperty: boolean,
):
  | { kind: "allow" }
  | { kind: "redirect-overview" }
  | { kind: "redirect-gsc-setup" };
```

For project routes, derive `hasSelectedGscProperty` from the existing project-scoped server function:

```ts
const connection = await getGscConnection({ data: { projectId } });
const hasSelectedGscProperty = connection.connected;
```

`getGscConnection().connected` is already `Boolean(connection)` and therefore means the project has a bound Search Console property, not merely an account-level OAuth grant.

The route-access regression must include:

```ts
expect(
  getProjectRouteDecision(
    "/p/p1/search-opportunities",
    getProductCapabilitiesForMode("first_party"),
    false,
  ),
).toEqual({ kind: "redirect-gsc-setup" });

expect(
  getProjectRouteDecision(
    "/p/p1/settings/integrations",
    getProductCapabilitiesForMode("first_party"),
    false,
  ),
).toEqual({ kind: "allow" });
```

Do not use `currentUserHasGrant` as the activation signal; a grant without a selected property is insufficient.

## Correction 2 — Task 3 must update the legacy redirect hook

Add this existing file to Task 3:

```text
Modify: src/client/features/onboarding/useOnboardingRedirect.ts
```

Create a pure helper in `src/client/features/onboarding/firstPartyActivation.ts` and test it from `firstPartyActivation.test.ts`:

```ts
export type OnboardingGateInput = {
  dataMode: "first_party" | "full";
  legacyCompleted: boolean;
  hasProject: boolean;
  hasSelectedGscProperty: boolean;
};

export function shouldRequireOnboarding(input: OnboardingGateInput): boolean {
  if (input.dataMode === "full") {
    return !input.legacyCompleted;
  }

  return !input.hasProject || !input.hasSelectedGscProperty;
}
```

Required tests:

```ts
expect(
  shouldRequireOnboarding({
    dataMode: "first_party",
    legacyCompleted: true,
    hasProject: true,
    hasSelectedGscProperty: false,
  }),
).toBe(true);

expect(
  shouldRequireOnboarding({
    dataMode: "first_party",
    legacyCompleted: false,
    hasProject: true,
    hasSelectedGscProperty: true,
  }),
).toBe(false);

expect(
  shouldRequireOnboarding({
    dataMode: "full",
    legacyCompleted: true,
    hasProject: true,
    hasSelectedGscProperty: false,
  }),
).toBe(false);
```

Update `useOnboardingRedirect.ts` so it loads product capabilities. In `first_party`, resolve the user's first/active project, query `getGscConnection({ data: { projectId } })`, and use `shouldRequireOnboarding(...)`. In `full`, preserve the current `completedAt` behavior.

The hook must still exempt `/onboarding` itself to prevent redirect loops.

### Onboarding route `beforeLoad` correction

The current `_authenticated.onboarding.index.tsx` redirects home whenever `completedAt` exists. Change that rule:

- `full`: keep the existing `completedAt` redirect.
- `first_party`: do not redirect solely because legacy onboarding is complete. Render `FirstPartyActivation`, which checks the first project connection and requires a selected GSC property.

After a project has a selected GSC property, the first-party activation may show the optional GA4 step. `Skip for now` immediately permits navigation to Overview. The skip does not need to become a new activation gate; GSC alone remains sufficient on future sessions.

Do not reintroduce country/language market fields into the first-party flow.

## Correction 3 — SearchOpportunityService regression path is known

In Task 4, remove the conditional instruction about locating a differently named formula test. The exact existing regression test is:

```text
src/server/features/ga4/services/SearchOpportunityService.test.ts
```

Run exactly:

```bash
pnpm exec vitest run src/server/features/ga4/services/SearchOpportunityService.test.ts
```

The `SearchOpportunityService.ts` production change remains limited to importing the extracted `normalizePageKey`; scoring filters, formula, weights, sorting, warnings, and truncation behavior must remain functionally unchanged.

## Correction 4 — FirstPartyOverviewService paid-source guard is deterministic

In Task 7, remove the conditional wording about whether the repository already has source-file guard tests.

`FirstPartyOverviewService.test.ts` must contain a deterministic source-import guard using Node's file APIs:

```ts
import { readFileSync } from "node:fs";

it("does not import paid-provider dashboard sources", () => {
  const source = readFileSync(
    new URL("./FirstPartyOverviewService.ts", import.meta.url),
    "utf8",
  );

  expect(source).not.toMatch(/dataforseo/i);
  expect(source).not.toMatch(/backlinks/i);
  expect(source).not.toMatch(/rank-tracking/i);
  expect(source).not.toMatch(/competitor/i);
});
```

This test supplements behavior mocks; it does not replace them.

## Correction 5 — Search Console presentation test has an exact file and implementation

The current `src/client/features/search-performance` directory has no co-located component-test harness. Task 8 must therefore create these files:

```text
Create: src/client/features/search-performance/searchConsolePresentation.ts
Create: src/client/features/search-performance/searchConsolePresentation.test.ts
Modify: src/client/features/search-performance/SearchPerformancePage.tsx
Modify: src/routes/_project/p/$projectId/search-performance.tsx
```

`searchConsolePresentation.ts` exports:

```ts
export const SEARCH_CONSOLE_PAGE_TITLE = "Search Console";

export const SEARCH_CONSOLE_CORE_METRICS = [
  "Clicks",
  "Impressions",
  "CTR",
  "Average Position",
] as const;
```

The failing test is explicit:

```ts
import { describe, expect, it } from "vitest";
import {
  SEARCH_CONSOLE_CORE_METRICS,
  SEARCH_CONSOLE_PAGE_TITLE,
} from "./searchConsolePresentation";

describe("Search Console presentation", () => {
  it("uses the approved product title and preserves core GSC metric labels", () => {
    expect(SEARCH_CONSOLE_PAGE_TITLE).toBe("Search Console");
    expect(SEARCH_CONSOLE_CORE_METRICS).toEqual([
      "Clicks",
      "Impressions",
      "CTR",
      "Average Position",
    ]);
  });
});
```

Run exactly:

```bash
pnpm exec vitest run src/client/features/search-performance/searchConsolePresentation.test.ts src/client/navigation/items.test.ts
```

`SearchPerformancePage.tsx` must consume `SEARCH_CONSOLE_PAGE_TITLE`; only presentation is changed. Existing GSC fetching, filters, tables, comparison logic, and export remain intact.

## Correction 6 — Task 11 file scope is explicit

Task 11 may edit only these already-planned surfaces unless a verification failure proves a directly related fix is required:

```text
05-IMPLEMENTATION-STATUS.md
src/shared/product-capabilities.ts
src/shared/product-capabilities.test.ts
src/client/features/product/productCapabilitiesQuery.ts
src/client/navigation/items.ts
src/client/navigation/items.test.ts
src/client/navigation/routeAccess.ts
src/client/navigation/routeAccess.test.ts
src/client/components/Sidebar.tsx
src/client/layout/AppShell.tsx
src/routes/_project/p/$projectId/route.tsx
src/routes/_authenticated.onboarding.index.tsx
src/client/features/onboarding/PostSignupOnboarding.tsx
src/client/features/onboarding/SearchConsoleOnboardingStep.tsx
src/client/features/onboarding/FirstPartyActivation.tsx
src/client/features/onboarding/firstPartyActivation.ts
src/client/features/onboarding/firstPartyActivation.test.ts
src/client/features/onboarding/useOnboardingRedirect.ts
src/server/features/seo/pageIdentity.ts
src/server/features/seo/pageIdentity.test.ts
src/server/features/gsc/services/SearchMovementService.ts
src/server/features/gsc/services/SearchMovementService.test.ts
src/server/features/gsc/services/SearchOpportunityQueryFilter.ts
src/server/features/gsc/services/SearchOpportunityQueryFilter.test.ts
src/server/features/ga4/services/SearchOpportunityService.ts
src/types/schemas/search-opportunities.ts
src/serverFunctions/searchOpportunities.ts
src/client/features/search-opportunities/SearchOpportunitiesPage.tsx
src/client/features/search-opportunities/SearchOpportunityDrawer.tsx
src/client/features/search-opportunities/searchOpportunityViewModel.ts
src/client/features/search-opportunities/searchOpportunityViewModel.test.ts
src/routes/_project/p/$projectId/search-opportunities.tsx
src/server/features/dashboard/services/FirstPartyOverviewService.ts
src/server/features/dashboard/services/FirstPartyOverviewService.test.ts
src/serverFunctions/dashboard.ts
src/client/features/dashboard/FirstPartyDashboardPage.tsx
src/client/features/dashboard/DashboardPage.tsx
src/client/features/search-performance/SearchPerformancePage.tsx
src/client/features/search-performance/searchConsolePresentation.ts
src/client/features/search-performance/searchConsolePresentation.test.ts
src/routes/_project/p/$projectId/search-performance.tsx
src/server/features/ga4/services/Ga4SeoAnalyticsService.ts
src/server/features/ga4/services/Ga4SeoAnalyticsService.test.ts
src/serverFunctions/ga4.ts
src/client/features/analytics/AnalyticsPage.tsx
src/client/features/analytics/analyticsViewModel.ts
src/client/features/analytics/analyticsViewModel.test.ts
src/routes/_project/p/$projectId/analytics.tsx
src/routes/_project/p/$projectId/sam.tsx
src/client/features/sam/SamChat.tsx
src/client/features/sam/SamConversation.tsx
src/client/features/sam/askSeoContext.ts
src/client/features/sam/askSeoContext.test.ts
```

If a verification command exposes an unrelated pre-existing failure, report it separately; do not broaden this milestone to repair unrelated code.

## Self-review result

### Spec coverage

All approved design sections have an implementation task:

- capability layer / DataForSEO UI boundary → Tasks 1–2 and 11;
- GSC activation / GA4 optional onboarding → Task 3 plus Corrections 1–2;
- transparent movement and page identity → Task 4;
- Search Opportunities API/search semantics → Task 5;
- four-tab UI and URL/query drawer → Task 6;
- action-first Overview and no paid reads → Task 7 plus Correction 4;
- existing GSC evidence repositioned as Search Console → Task 8 plus Correction 5;
- organic-only Analytics → Task 9;
- existing SAM agent presented as Ask SEO with first-party context → Task 10;
- styling, safety, full-mode regression, docs, and full verification → Task 11.

### Placeholder scan

No `TBD` or `TODO` remains in the original plan. The identified conditional instructions that would force the executor to make design decisions during implementation are resolved by Corrections 3–5 above.

### Type/name consistency

Use `hasSelectedGscProperty` consistently for the first-party product gate. Do not substitute account-level OAuth grant state for project activation.

## Execution handoff

The implementation contract is now:

1. approved design spec;
2. original 11-task implementation plan;
3. this self-review amendment, which wins on conflict.

Execution may begin only on an isolated feature branch/workspace, never directly on `main`.
