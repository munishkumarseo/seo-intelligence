import { beforeEach, describe, expect, it, vi } from "vitest";
import { Ga4ReportError } from "@/server/lib/ga4Errors";
import { GscNotConnectedError } from "@/server/lib/gscErrors";

const mocks = vi.hoisted(() => ({
  getPageMovements: vi.fn(),
  getPerformance: vi.fn(),
  getOpportunities: vi.fn(),
}));

vi.mock("@/server/features/gsc/services/SearchMovementService", () => ({
  SearchMovementService: { getPageMovements: mocks.getPageMovements },
}));

vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscService: { getPerformance: mocks.getPerformance },
  isExpectedGrantFailure: () => false,
}));

vi.mock("@/server/features/ga4/services/SearchOpportunityService", () => ({
  SearchOpportunityService: { getOpportunities: mocks.getOpportunities },
}));

import { SearchOpportunitiesPageService } from "@/server/features/gsc/services/SearchOpportunitiesPageService";

const basePages = [
  {
    page: "https://example.com/services/implants/",
    normalizedPage: "example.com/services/implants",
    clicks: 10,
    impressions: 500,
    ctr: 0.02,
    averagePosition: 8,
    previousAveragePosition: 10,
    positionChange: 2,
    category: "improved" as const,
    isPageToImprove: true,
  },
  {
    page: "https://example.com/pricing/",
    normalizedPage: "example.com/pricing",
    clicks: 5,
    impressions: 200,
    ctr: 0.025,
    averagePosition: 12,
    previousAveragePosition: 9,
    positionChange: -3,
    category: "dropped" as const,
    isPageToImprove: true,
  },
];

function ga4Result() {
  return {
    status: "ok" as const,
    source: {
      searchConsoleSiteUrl: "sc-domain:example.com",
      googleAnalyticsPropertyId: "123",
      googleAnalyticsPropertyDisplayName: "Example",
    },
    request: {
      dateRange: { startDate: "2026-08-01", endDate: "2026-08-28" },
      limit: 100,
      searchConsoleTimeZone: "America/Los_Angeles",
      googleAnalyticsTimeZone: "America/Los_Angeles",
    },
    rowCount: 1,
    totalCandidateRows: 2,
    rows: [
      {
        page: "https://example.com/services/implants/",
        normalizedPage: "example.com/services/implants",
        clicks: 10,
        impressions: 500,
        ctr: 0.02,
        position: 8,
        joinStatus: "joined" as const,
        ga4: {
          sessions: 100,
          activeUsers: 80,
          engagedSessions: 70,
          engagementRate: 0.7,
          keyEvents: 8,
          sessionKeyEventRate: 0.08,
          transactions: 2,
          purchaseRevenue: 500,
        },
        score: 91,
        scoreComponents: {
          demand: 1,
          businessValue: 0.8,
          reachability: 0.75,
        },
      },
    ],
    scoring: {
      formula:
        "round(100 * (0.5 * demand + 0.3 * businessValue + 0.2 * reachability))",
      businessValueMetric: "sessionKeyEventRate" as const,
      engagementFallback: false,
      scoreDataLimited: false,
    },
    coverage: {
      gscRowsConsidered: 2,
      ga4RowsConsidered: 2,
      matchedRows: 1,
      unmatchedGscRows: 1,
      unmatchedGa4Rows: 1,
    },
    truncated: { gsc: false, ga4: false, candidates: false },
    warnings: [],
    reportMetadata: { hasLimitedData: false },
    quota: null,
  };
}

describe("SearchOpportunitiesPageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPageMovements.mockResolvedValue({
      rows: basePages,
      previousTruncated: false,
    });
    mocks.getPerformance.mockResolvedValue({
      rows: [],
      siteUrl: "sc-domain:example.com",
      connectedBy: "account-1",
      request: {},
    });
    mocks.getOpportunities.mockResolvedValue(ga4Result());
  });

  it("returns GSC-only sections when GA4 is not connected", async () => {
    mocks.getOpportunities.mockRejectedValue(
      new Ga4ReportError(
        "ga4_not_connected",
        "Google Analytics is not connected for this project.",
      ),
    );

    const result = await SearchOpportunitiesPageService.getReport({
      projectId: "project-1",
      dateRange: "last_28_days",
      search: undefined,
      limit: 50,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.connections.ga4).toBe("not_connected");
    expect(result.sections.pagesToImprove).toHaveLength(2);
    expect(result.sections.pagesToImprove[0]).toMatchObject({
      page: "https://example.com/services/implants/",
      opportunityScore: null,
      ga4: null,
    });
    expect(result.sections.winners).toHaveLength(1);
    expect(result.sections.losers).toHaveLength(1);
  });

  it("enriches only pages-to-improve with unchanged GA4 opportunity scoring", async () => {
    const result = await SearchOpportunitiesPageService.getReport({
      projectId: "project-1",
      dateRange: "last_28_days",
      search: undefined,
      limit: 50,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.sections.pagesToImprove[0]).toMatchObject({
      page: "https://example.com/services/implants/",
      opportunityScore: 91,
      scoreComponents: {
        demand: 1,
        businessValue: 0.8,
        reachability: 0.75,
      },
    });
    expect(result.sections.winners[0]).not.toHaveProperty("opportunityScore");
    expect(result.sections.losers[0]).not.toHaveProperty("opportunityScore");
    expect(result.scoring?.formula).toBe(
      "round(100 * (0.5 * demand + 0.3 * businessValue + 0.2 * reachability))",
    );
  });

  it("uses actual GSC query text for search filtering", async () => {
    mocks.getPerformance.mockResolvedValue({
      rows: [
        {
          keys: [
            "best implant dentist montreal",
            "https://example.com/services/implants/",
          ],
          clicks: 1,
          impressions: 20,
          ctr: 0.05,
          position: 7,
        },
      ],
      siteUrl: "sc-domain:example.com",
      connectedBy: "account-1",
      request: {},
    });

    const result = await SearchOpportunitiesPageService.getReport({
      projectId: "project-1",
      dateRange: "last_28_days",
      search: "implant dentist",
      limit: 50,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.counts.matchedPages).toBe(1);
    expect(result.sections.pagesToImprove).toHaveLength(1);
    expect(result.sections.pagesToImprove[0]?.page).toContain("/implants/");
    expect(mocks.getPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ dimensions: ["query", "page"] }),
    );
  });

  it("returns an explicit GSC connection state instead of calling GA4", async () => {
    mocks.getPageMovements.mockRejectedValue(
      new GscNotConnectedError("project-1"),
    );

    const result = await SearchOpportunitiesPageService.getReport({
      projectId: "project-1",
      dateRange: "last_28_days",
      search: undefined,
      limit: 50,
    });

    expect(result).toEqual({
      status: "gsc_not_connected",
      connections: { gsc: "not_connected", ga4: "unknown" },
    });
    expect(mocks.getOpportunities).not.toHaveBeenCalled();
  });

  it("reports source and result truncation independently", async () => {
    const manyPages = Array.from({ length: 1_000 }, (_, index) => ({
      ...basePages[index % basePages.length],
      page: `https://example.com/page-${index}`,
      normalizedPage: `example.com/page-${index}`,
      isPageToImprove: true,
    }));
    mocks.getPageMovements.mockResolvedValue({
      rows: manyPages,
      previousTruncated: true,
    });

    const result = await SearchOpportunitiesPageService.getReport({
      projectId: "project-1",
      dateRange: "last_28_days",
      search: undefined,
      limit: 25,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.truncated.source.gscPages).toBe(true);
    expect(result.truncated.source.gscPreviousPages).toBe(true);
    expect(result.truncated.results.pagesToImprove).toBe(true);
    expect(result.sections.pagesToImprove).toHaveLength(25);
  });
});
