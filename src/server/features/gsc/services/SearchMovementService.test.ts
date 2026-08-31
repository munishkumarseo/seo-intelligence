import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPerformance: vi.fn(),
}));

vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscService: {
    getPerformance: mocks.getPerformance,
  },
}));

type MovementRow = {
  page: string;
  normalizedPage: string;
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
  previousAveragePosition: number | null;
  positionChange: number | null;
  category: "improved" | "new" | "dropped" | "stable";
  isPageToImprove: boolean;
};

type QueryMovementRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
  previousAveragePosition: number | null;
  positionChange: number | null;
  category: "improved" | "new" | "dropped" | "stable";
};

type MovementInput = {
  projectId: string;
  dateRange?: "last_7_days" | "last_28_days" | "last_3_months";
  device?: "DESKTOP" | "MOBILE" | "TABLET";
  country?: string;
};

type SearchMovementModule = {
  SearchMovementService: {
    getPageMovements: (input: MovementInput) => Promise<{
      rows: MovementRow[];
      previousTruncated: boolean;
    }>;
    getPageQueries: (input: MovementInput & { page: string }) => Promise<{
      rows: QueryMovementRow[];
      previousTruncated: boolean;
    }>;
  };
};

function isSearchMovementModule(value: unknown): value is SearchMovementModule {
  if (typeof value !== "object" || value === null) return false;
  if (!("SearchMovementService" in value)) return false;
  const service = value.SearchMovementService;
  return (
    typeof service === "object" &&
    service !== null &&
    "getPageMovements" in service &&
    typeof service.getPageMovements === "function" &&
    "getPageQueries" in service &&
    typeof service.getPageQueries === "function"
  );
}

async function loadService(): Promise<
  SearchMovementModule["SearchMovementService"]
> {
  const modulePath = ["./SearchMovement", "Service"].join("");
  const loaded = (await import(modulePath)) as unknown;
  if (!isSearchMovementModule(loaded)) {
    throw new Error("SearchMovementService module is unavailable");
  }
  return loaded.SearchMovementService;
}

function gscRow(key: string, position: number, impressions = 100, clicks = 10) {
  return {
    keys: [key],
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position,
  };
}

function result(rows: ReturnType<typeof gscRow>[]) {
  return {
    siteUrl: "https://example.com/",
    connectedBy: "seo@example.com",
    request: {},
    rows,
  };
}

describe("SearchMovementService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-06T12:00:00Z"));
    mocks.getPerformance.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("classifies improved, dropped, stable, new, and pages to improve", async () => {
    mocks.getPerformance
      .mockResolvedValueOnce(
        result([
          gscRow("https://example.com/improved/", 6.8, 1_000, 50),
          gscRow("https://example.com/dropped", 9.1, 800, 30),
          gscRow("https://example.com/stable", 8.0, 600, 20),
          gscRow("https://example.com/min", 4.0, 100, 4),
          gscRow("https://example.com/max", 20.0, 100, 2),
          gscRow("https://example.com/below", 3.9, 100, 8),
          gscRow("https://example.com/above", 20.1, 100, 1),
          gscRow("https://example.com/new", 15.0, 250, 5),
        ]),
      )
      .mockResolvedValueOnce(
        result([
          gscRow("https://example.com/improved", 11.4),
          gscRow("https://example.com/dropped/", 4.8),
          gscRow("https://example.com/stable", 8.1),
          gscRow("https://example.com/min", 4.0),
          gscRow("https://example.com/max", 20.0),
          gscRow("https://example.com/below", 3.9),
          gscRow("https://example.com/above", 20.1),
        ]),
      );

    const service = await loadService();
    const response = await service.getPageMovements({
      projectId: "project_1",
      dateRange: "last_28_days",
      device: "MOBILE",
      country: "usa",
    });

    const byPage = new Map(
      response.rows.map((row) => [row.normalizedPage, row]),
    );
    expect(byPage.get("example.com/improved")).toMatchObject({
      averagePosition: 6.8,
      previousAveragePosition: 11.4,
      positionChange: 4.6,
      category: "improved",
      isPageToImprove: true,
    });
    expect(byPage.get("example.com/dropped")).toMatchObject({
      previousAveragePosition: 4.8,
      positionChange: -4.3,
      category: "dropped",
      isPageToImprove: true,
    });
    expect(byPage.get("example.com/stable")).toMatchObject({
      positionChange: 0.1,
      category: "stable",
      isPageToImprove: true,
    });
    expect(byPage.get("example.com/new")).toMatchObject({
      previousAveragePosition: null,
      positionChange: null,
      category: "new",
      isPageToImprove: true,
    });
    expect(byPage.get("example.com/min")?.isPageToImprove).toBe(true);
    expect(byPage.get("example.com/max")?.isPageToImprove).toBe(true);
    expect(byPage.get("example.com/below")?.isPageToImprove).toBe(false);
    expect(byPage.get("example.com/above")?.isPageToImprove).toBe(false);

    expect(mocks.getPerformance).toHaveBeenCalledTimes(2);
    const currentCall = mocks.getPerformance.mock.calls[0]?.[0];
    const previousCall = mocks.getPerformance.mock.calls[1]?.[0];
    expect(currentCall).toMatchObject({
      projectId: "project_1",
      dimensions: ["page"],
      filters: [
        { dimension: "device", operator: "equals", expression: "MOBILE" },
        { dimension: "country", operator: "equals", expression: "usa" },
      ],
      rowLimit: 1_000,
      type: "web",
      dataState: "final",
    });
    expect(previousCall).toMatchObject({
      projectId: "project_1",
      dimensions: ["page"],
      filters: currentCall.filters,
      rowLimit: 1_000,
      type: "web",
      dataState: "final",
    });
    expect(previousCall.endDate).toBeLessThan(currentCall.startDate);
  });

  it("does not call an absent page newly ranking when previous data is truncated", async () => {
    const previousRows = Array.from({ length: 1_000 }, (_, index) =>
      gscRow(`https://example.com/previous-${index}`, 10),
    );
    mocks.getPerformance
      .mockResolvedValueOnce(
        result([gscRow("https://example.com/candidate", 12)]),
      )
      .mockResolvedValueOnce(result(previousRows));

    const service = await loadService();
    const response = await service.getPageMovements({
      projectId: "project_1",
      dateRange: "last_28_days",
    });

    expect(response.previousTruncated).toBe(true);
    expect(response.rows[0]).toMatchObject({
      normalizedPage: "example.com/candidate",
      previousAveragePosition: null,
      positionChange: null,
      category: "stable",
    });
  });

  it("compares page queries across the same filtered periods", async () => {
    mocks.getPerformance
      .mockResolvedValueOnce(
        result([
          gscRow("dental crown montreal", 4.2, 5_400, 310),
          gscRow("stable query", 8.0, 500, 20),
          gscRow("new query", 12.0, 100, 3),
        ]),
      )
      .mockResolvedValueOnce(
        result([
          gscRow("dental crown montreal", 8.9, 4_000, 180),
          gscRow("stable query", 8.2, 450, 18),
        ]),
      );

    const service = await loadService();
    const response = await service.getPageQueries({
      projectId: "project_1",
      page: "https://example.com/dental-crowns",
      dateRange: "last_28_days",
      device: "DESKTOP",
      country: "can",
    });

    expect(response.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          query: "dental crown montreal",
          averagePosition: 4.2,
          previousAveragePosition: 8.9,
          positionChange: 4.7,
          category: "improved",
          impressions: 5_400,
          clicks: 310,
        }),
        expect.objectContaining({
          query: "stable query",
          positionChange: 0.2,
          category: "stable",
        }),
        expect.objectContaining({
          query: "new query",
          previousAveragePosition: null,
          category: "new",
        }),
      ]),
    );

    const expectedFilters = [
      {
        dimension: "page",
        operator: "equals",
        expression: "https://example.com/dental-crowns",
      },
      { dimension: "device", operator: "equals", expression: "DESKTOP" },
      { dimension: "country", operator: "equals", expression: "can" },
    ];
    expect(mocks.getPerformance).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        dimensions: ["query"],
        filters: expectedFilters,
        rowLimit: 1_000,
        type: "web",
        dataState: "final",
      }),
    );
    expect(mocks.getPerformance).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        dimensions: ["query"],
        filters: expectedFilters,
        rowLimit: 1_000,
        type: "web",
        dataState: "final",
      }),
    );
  });
});
