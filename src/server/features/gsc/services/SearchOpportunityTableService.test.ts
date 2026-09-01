import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPageMovements: vi.fn(),
  getPageQueries: vi.fn(),
  filterRows: vi.fn(),
  getGa4Connection: vi.fn(),
  getOpportunities: vi.fn(),
}));

vi.mock("./SearchMovementService", () => ({
  SearchMovementService: {
    getPageMovements: mocks.getPageMovements,
    getPageQueries: mocks.getPageQueries,
  },
}));

vi.mock("./SearchOpportunityQueryFilter", () => ({
  filterSearchOpportunityRows: mocks.filterRows,
}));

vi.mock("@/server/features/ga4/services/Ga4Service", () => ({
  Ga4Service: { getConnection: mocks.getGa4Connection },
}));

vi.mock("@/server/features/ga4/services/SearchOpportunityService", () => ({
  SearchOpportunityService: { getOpportunities: mocks.getOpportunities },
}));

type TableServiceModule = {
  SearchOpportunityTableService: {
    getRows: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
    getQueries: (
      input: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
  };
};

function isTableServiceModule(value: unknown): value is TableServiceModule {
  if (typeof value !== "object" || value === null) return false;
  if (!("SearchOpportunityTableService" in value)) return false;
  const service = value.SearchOpportunityTableService;
  return (
    typeof service === "object" &&
    service !== null &&
    "getRows" in service &&
    typeof service.getRows === "function" &&
    "getQueries" in service &&
    typeof service.getQueries === "function"
  );
}

async function loadService() {
  const modulePath = "./SearchOpportunityTableService";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as unknown;
  if (!isTableServiceModule(loaded)) {
    throw new Error("SearchOpportunityTableService module has the wrong shape.");
  }
  return loaded.SearchOpportunityTableService;
}

const improved = {
  page: "https://example.com/improved/",
  normalizedPage: "example.com/improved",
  clicks: 20,
  impressions: 1_000,
  ctr: 0.02,
  averagePosition: 6.8,
  previousAveragePosition: 11.4,
  positionChange: 4.6,
  category: "improved",
  isPageToImprove: true,
};

const dropped = {
  page: "https://example.com/dropped/",
  normalizedPage: "example.com/dropped",
  clicks: 10,
  impressions: 800,
  ctr: 0.0125,
  averagePosition: 9.1,
  previousAveragePosition: 4.8,
  positionChange: -4.3,
  category: "dropped",
  isPageToImprove: true,
};

const stable = {
  page: "https://example.com/stable/",
  normalizedPage: "example.com/stable",
  clicks: 15,
  impressions: 1_500,
  ctr: 0.01,
  averagePosition: 8,
  previousAveragePosition: 8.1,
  positionChange: 0.1,
  category: "stable",
  isPageToImprove: true,
};

const newlyRanking = {
  page: "https://example.com/new/",
  normalizedPage: "example.com/new",
  clicks: 3,
  impressions: 300,
  ctr: 0.01,
  averagePosition: 15,
  previousAveragePosition: null,
  positionChange: null,
  category: "new",
  isPageToImprove: true,
};

function movementResponse() {
  return {
    rows: [improved, dropped, stable, newlyRanking],
    previousTruncated: false,
  };
}

describe("SearchOpportunityTableService", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.getPageMovements.mockResolvedValue(movementResponse());
    mocks.filterRows.mockImplementation(async ({ rows }) => ({
      rows,
      queryLookupTruncated: false,
    }));
    mocks.getGa4Connection.mockResolvedValue(null);
  });

  it("keeps movement evidence primary and never touches GA4 outside Pages to Improve", async () => {
    const service = await loadService();
    const response = await service.getRows({
      projectId: "project_1",
      tab: "improved",
      dateRange: "last_28_days",
      limit: 100,
    });

    expect(response).toMatchObject({
      rows: [
        expect.objectContaining({
          normalizedPage: "example.com/improved",
          averagePosition: 6.8,
          previousAveragePosition: 11.4,
          positionChange: 4.6,
          score: null,
          ga4: null,
        }),
      ],
      meta: {
        movementRowsTruncated: false,
        previousPeriodTruncated: false,
        queryLookupTruncated: false,
        ga4Enriched: false,
      },
    });
    expect(mocks.getGa4Connection).not.toHaveBeenCalled();
    expect(mocks.getOpportunities).not.toHaveBeenCalled();
  });

  it("keeps Pages to Improve fully usable without GA4 and orders by GSC demand", async () => {
    const service = await loadService();
    const response = await service.getRows({
      projectId: "project_1",
      tab: "improve",
      limit: 2,
    });

    expect(mocks.getGa4Connection).toHaveBeenCalledWith("project_1");
    expect(mocks.getOpportunities).not.toHaveBeenCalled();
    expect(response.rows).toEqual([
      expect.objectContaining({
        normalizedPage: "example.com/stable",
        impressions: 1_500,
        score: null,
      }),
      expect.objectContaining({
        normalizedPage: "example.com/improved",
        impressions: 1_000,
        score: null,
      }),
    ]);
  });

  it("merges the existing GA4 scorer only for Pages to Improve without overwriting movement metrics", async () => {
    mocks.getGa4Connection.mockResolvedValue({ propertyId: "properties/123" });
    mocks.getOpportunities.mockResolvedValue({
      rows: [
        {
          page: "https://example.com/improved/",
          normalizedPage: "example.com/improved",
          score: 91,
          ga4: { sessions: 120, keyEvents: 9 },
        },
        {
          page: "https://example.com/stable/",
          normalizedPage: "example.com/stable",
          score: 72,
          ga4: { sessions: 300, keyEvents: 4 },
        },
      ],
      scoring: { formula: "existing-formula" },
      coverage: { matchedRows: 2 },
      truncated: { gsc: false, ga4: false, candidates: false },
      warnings: [],
    });

    const service = await loadService();
    const response = await service.getRows({
      projectId: "project_1",
      tab: "improve",
      dateRange: "last_28_days",
      limit: 100,
    });

    expect(mocks.getOpportunities).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        limit: 100,
        startDate: expect.any(String),
        endDate: expect.any(String),
      }),
    );
    expect(response.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          normalizedPage: "example.com/improved",
          averagePosition: 6.8,
          previousAveragePosition: 11.4,
          positionChange: 4.6,
          score: 91,
          ga4: { sessions: 120, keyEvents: 9 },
        }),
      ]),
    );
    expect(response.rows[0]).toEqual(
      expect.objectContaining({
        normalizedPage: "example.com/improved",
        score: 91,
      }),
    );
    expect(response.meta).toMatchObject({
      ga4Enriched: true,
      scoring: { formula: "existing-formula" },
      coverage: { matchedRows: 2 },
      scorerTruncated: { gsc: false, ga4: false, candidates: false },
      warnings: [],
    });
  });

  it("preserves query-search truncation and applies the requested limit after filtering", async () => {
    mocks.filterRows.mockResolvedValue({
      rows: [improved, newlyRanking],
      queryLookupTruncated: true,
    });

    const service = await loadService();
    const response = await service.getRows({
      projectId: "project_1",
      tab: "improve",
      search: "dental crown",
      limit: 1,
    });

    expect(mocks.filterRows).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        search: "dental crown",
      }),
    );
    expect(response.rows).toHaveLength(1);
    expect(response.meta).toMatchObject({ queryLookupTruncated: true });
  });

  it("delegates drawer query comparison to SearchMovementService and exposes truncation", async () => {
    mocks.getPageQueries.mockResolvedValue({
      rows: [
        {
          query: "dental crown montreal",
          clicks: 310,
          impressions: 5_400,
          ctr: 310 / 5_400,
          averagePosition: 4.2,
          previousAveragePosition: 8.9,
          positionChange: 4.7,
          category: "improved",
        },
      ],
      previousTruncated: true,
    });

    const service = await loadService();
    const response = await service.getQueries({
      projectId: "project_1",
      page: "https://example.com/dental-crowns/",
      dateRange: "last_28_days",
      device: "DESKTOP",
      country: "can",
    });

    expect(mocks.getPageQueries).toHaveBeenCalledWith({
      projectId: "project_1",
      page: "https://example.com/dental-crowns/",
      dateRange: "last_28_days",
      device: "DESKTOP",
      country: "can",
    });
    expect(response).toMatchObject({
      rows: [
        expect.objectContaining({
          query: "dental crown montreal",
          averagePosition: 4.2,
          previousAveragePosition: 8.9,
          positionChange: 4.7,
        }),
      ],
      meta: {
        currentRowsTruncated: false,
        previousPeriodTruncated: true,
      },
    });
  });
});
