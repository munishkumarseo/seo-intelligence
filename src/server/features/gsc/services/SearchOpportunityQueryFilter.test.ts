import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPerformance: vi.fn(),
}));

vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscService: { getPerformance: mocks.getPerformance },
}));

type TestOpportunityRow = {
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

type SearchOpportunityQueryFilterModule = {
  classifyOpportunitySearch: (value: string) => "page" | "query" | null;
  filterSearchOpportunityRows: (input: {
    projectId: string;
    dateRange?: "last_7_days" | "last_28_days" | "last_3_months";
    device?: "DESKTOP" | "MOBILE" | "TABLET";
    country?: string;
    search?: string;
    rows: TestOpportunityRow[];
  }) => Promise<{
    rows: TestOpportunityRow[];
    queryLookupTruncated: boolean;
  }>;
};

function isFilterModule(
  value: unknown,
): value is SearchOpportunityQueryFilterModule {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.classifyOpportunitySearch === "function" &&
    typeof candidate.filterSearchOpportunityRows === "function"
  );
}

async function loadFilterModule(): Promise<SearchOpportunityQueryFilterModule> {
  const modulePath = "./SearchOpportunityQueryFilter";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as unknown;
  if (!isFilterModule(loaded)) {
    throw new Error("SearchOpportunityQueryFilter module has the wrong shape.");
  }
  return loaded;
}

const rows: TestOpportunityRow[] = [
  {
    page: "https://example.com/dental-crowns/",
    normalizedPage: "example.com/dental-crowns",
    clicks: 20,
    impressions: 1_000,
    ctr: 0.02,
    averagePosition: 6.8,
    previousAveragePosition: 11.4,
    positionChange: 4.6,
    category: "improved",
    isPageToImprove: true,
  },
  {
    page: "https://example.com/implants/",
    normalizedPage: "example.com/implants",
    clicks: 10,
    impressions: 500,
    ctr: 0.02,
    averagePosition: 9.1,
    previousAveragePosition: 4.8,
    positionChange: -4.3,
    category: "dropped",
    isPageToImprove: true,
  },
];

describe("SearchOpportunityQueryFilter", () => {
  beforeEach(() => {
    mocks.getPerformance.mockReset();
  });

  it("classifies deterministic page-looking and keyword searches", async () => {
    const { classifyOpportunitySearch } = await loadFilterModule();

    expect(classifyOpportunitySearch("/dental-crowns")).toBe("page");
    expect(classifyOpportunitySearch("https://example.com/dental-crowns")).toBe(
      "page",
    );
    expect(classifyOpportunitySearch("example.com")).toBe("page");
    expect(classifyOpportunitySearch("dental crown montreal")).toBe("query");
    expect(classifyOpportunitySearch("dental.crown montreal")).toBe("query");
    expect(classifyOpportunitySearch("   ")).toBeNull();
  });

  it("filters page-looking searches locally using normalized page identity", async () => {
    const { filterSearchOpportunityRows } = await loadFilterModule();

    const result = await filterSearchOpportunityRows({
      projectId: "project_1",
      search: "/DENTAL-CROWNS",
      rows,
    });

    expect(result.rows.map((row) => row.normalizedPage)).toEqual([
      "example.com/dental-crowns",
    ]);
    expect(result.queryLookupTruncated).toBe(false);
    expect(mocks.getPerformance).not.toHaveBeenCalled();
  });

  it("uses actual GSC query matches to intersect page-level opportunity rows", async () => {
    mocks.getPerformance.mockResolvedValue({
      siteUrl: "https://example.com/",
      request: {},
      rows: [
        {
          keys: ["https://example.com/dental-crowns/"],
          clicks: 5,
          impressions: 200,
          ctr: 0.025,
          position: 7,
        },
        {
          keys: ["https://example.com/not-an-opportunity/"],
          clicks: 1,
          impressions: 25,
          ctr: 0.04,
          position: 30,
        },
      ],
    });
    const { filterSearchOpportunityRows } = await loadFilterModule();

    const result = await filterSearchOpportunityRows({
      projectId: "project_1",
      dateRange: "last_28_days",
      device: "MOBILE",
      country: "can",
      search: "dental crown montreal",
      rows,
    });

    expect(mocks.getPerformance).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        dimensions: ["page"],
        filters: [
          {
            dimension: "query",
            operator: "contains",
            expression: "dental crown montreal",
          },
          { dimension: "device", operator: "equals", expression: "MOBILE" },
          { dimension: "country", operator: "equals", expression: "can" },
        ],
        rowLimit: 1_000,
        type: "web",
        dataState: "final",
      }),
    );
    expect(result.rows.map((row) => row.normalizedPage)).toEqual([
      "example.com/dental-crowns",
    ]);
    expect(result.queryLookupTruncated).toBe(false);
  });

  it("preserves query lookup truncation instead of implying complete search coverage", async () => {
    mocks.getPerformance.mockResolvedValue({
      siteUrl: "https://example.com/",
      request: {},
      rows: Array.from({ length: 1_000 }, (_, index) => ({
        keys: [
          index === 0
            ? "https://example.com/dental-crowns/"
            : `https://example.com/archive/${index}`,
        ],
        clicks: 0,
        impressions: 1,
        ctr: 0,
        position: 50,
      })),
    });
    const { filterSearchOpportunityRows } = await loadFilterModule();

    const result = await filterSearchOpportunityRows({
      projectId: "project_1",
      search: "dental crown",
      rows,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.queryLookupTruncated).toBe(true);
  });
});
