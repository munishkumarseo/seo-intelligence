import { SearchOpportunityService } from "@/server/features/ga4/services/SearchOpportunityService";
import { SearchMovementService } from "@/server/features/gsc/services/SearchMovementService";
import {
  GscService,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import {
  buildQueryMatchedPageKeys,
  filterSearchOpportunityPages,
} from "@/server/features/gsc/searchOpportunityFiltering";
import { resolveDateRange } from "@/server/features/gsc/searchAnalytics";
import { Ga4ReportError } from "@/server/lib/ga4Errors";
import { GscNotConnectedError } from "@/server/lib/gscErrors";
import type { SearchOpportunitiesInput } from "@/types/schemas/search-opportunities";

const SOURCE_ROW_LIMIT = 1_000;
const GA4_ENRICHMENT_LIMIT = 100;

type Ga4Availability =
  | "connected"
  | "not_connected"
  | "reconnect_required"
  | "property_inaccessible";

type PageMovementResult = Awaited<
  ReturnType<typeof SearchMovementService.getPageMovements>
>;
type PageMovementRow = PageMovementResult["rows"][number];
type Ga4OpportunityResult = Awaited<
  ReturnType<typeof SearchOpportunityService.getOpportunities>
>;
type Ga4OpportunityRow = Ga4OpportunityResult["rows"][number];

type EnrichedPageToImprove = PageMovementRow & {
  ga4: Ga4OpportunityRow["ga4"] | null;
  opportunityScore: number | null;
  scoreComponents: Ga4OpportunityRow["scoreComponents"] | null;
  joinStatus: Ga4OpportunityRow["joinStatus"] | "not_enriched";
};

function ga4AvailabilityFromError(error: unknown): Ga4Availability | null {
  if (!(error instanceof Ga4ReportError)) return null;
  if (error.code === "ga4_not_connected") return "not_connected";
  if (error.code === "ga4_reconnect_required") return "reconnect_required";
  if (error.code === "ga4_property_inaccessible") {
    return "property_inaccessible";
  }
  return null;
}

function enrichPagesToImprove(
  rows: PageMovementRow[],
  ga4Result: Ga4OpportunityResult | null,
): EnrichedPageToImprove[] {
  const byPage = new Map<string, Ga4OpportunityRow>();
  const rank = new Map<string, number>();
  ga4Result?.rows.forEach((row, index) => {
    if (!row.normalizedPage) return;
    byPage.set(row.normalizedPage, row);
    rank.set(row.normalizedPage, index);
  });

  const enriched = rows.map((row) => {
    const candidate = byPage.get(row.normalizedPage);
    return {
      ...row,
      ga4: candidate?.ga4 ?? null,
      opportunityScore: candidate?.score ?? null,
      scoreComponents: candidate?.scoreComponents ?? null,
      joinStatus: candidate?.joinStatus ?? "not_enriched",
    } satisfies EnrichedPageToImprove;
  });

  if (!ga4Result) return enriched;
  return enriched.toSorted((a, b) => {
    const aRank = rank.get(a.normalizedPage) ?? Number.MAX_SAFE_INTEGER;
    const bRank = rank.get(b.normalizedPage) ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank;
  });
}

function warningList(input: {
  ga4Availability: Ga4Availability;
  currentPagesTruncated: boolean;
  previousPagesTruncated: boolean;
  queryPagesTruncated: boolean;
  ga4Result: Ga4OpportunityResult | null;
}): string[] {
  const warnings = [...(input.ga4Result?.warnings ?? [])];
  if (input.ga4Availability !== "connected") {
    warnings.push(`ga4_${input.ga4Availability}`);
  }
  if (input.currentPagesTruncated) warnings.push("gsc_pages_truncated");
  if (input.previousPagesTruncated) {
    warnings.push("gsc_previous_pages_truncated");
  }
  if (input.queryPagesTruncated) warnings.push("gsc_query_pages_truncated");
  return [...new Set(warnings)];
}

async function getReport(input: SearchOpportunitiesInput) {
  const dates = resolveDateRange({ dateRange: input.dateRange });

  let movement: PageMovementResult;
  let queryPageRows: Awaited<ReturnType<typeof GscService.getPerformance>> | null;
  try {
    [movement, queryPageRows] = await Promise.all([
      SearchMovementService.getPageMovements({
        projectId: input.projectId,
        dateRange: input.dateRange,
      }),
      input.search
        ? GscService.getPerformance({
            projectId: input.projectId,
            startDate: dates.startDate,
            endDate: dates.endDate,
            dimensions: ["query", "page"],
            rowLimit: SOURCE_ROW_LIMIT,
            startRow: 0,
            type: "web",
            dataState: "final",
          })
        : Promise.resolve(null),
    ]);
  } catch (error) {
    if (
      error instanceof GscNotConnectedError ||
      isExpectedGrantFailure(error)
    ) {
      return {
        status: "gsc_not_connected" as const,
        connections: {
          gsc: "not_connected" as const,
          ga4: "unknown" as const,
        },
      };
    }
    throw error;
  }

  let ga4Result: Ga4OpportunityResult | null = null;
  let ga4Availability: Ga4Availability = "connected";
  try {
    ga4Result = await SearchOpportunityService.getOpportunities({
      projectId: input.projectId,
      startDate: dates.startDate,
      endDate: dates.endDate,
      limit: GA4_ENRICHMENT_LIMIT,
    });
  } catch (error) {
    if (
      error instanceof GscNotConnectedError ||
      isExpectedGrantFailure(error)
    ) {
      return {
        status: "gsc_not_connected" as const,
        connections: {
          gsc: "not_connected" as const,
          ga4: "unknown" as const,
        },
      };
    }
    const availability = ga4AvailabilityFromError(error);
    if (!availability) throw error;
    ga4Availability = availability;
  }

  const queryMatchedPageKeys = buildQueryMatchedPageKeys(
    queryPageRows?.rows ?? [],
    input.search,
  );
  const filteredPages = filterSearchOpportunityPages(
    movement.rows,
    input.search,
    queryMatchedPageKeys,
  );
  const pagesToImproveAll = enrichPagesToImprove(
    filteredPages.filter((row) => row.isPageToImprove),
    ga4Result,
  );
  const winnersAll = filteredPages.filter((row) => row.category === "improved");
  const losersAll = filteredPages.filter((row) => row.category === "dropped");
  const currentPagesTruncated = movement.rows.length >= SOURCE_ROW_LIMIT;
  const queryPagesTruncated =
    queryPageRows !== null && queryPageRows.rows.length >= SOURCE_ROW_LIMIT;

  return {
    status: "ok" as const,
    connections: {
      gsc: "connected" as const,
      ga4: ga4Availability,
    },
    source: {
      searchConsoleSiteUrl: ga4Result?.source.searchConsoleSiteUrl ?? null,
      googleAnalyticsPropertyId:
        ga4Result?.source.googleAnalyticsPropertyId ?? null,
      sourceCompleteness: "top-rows-limited" as const,
    },
    request: {
      dateRange: dates,
      preset: input.dateRange,
      search: input.search ?? null,
      limit: input.limit,
    },
    sections: {
      pagesToImprove: pagesToImproveAll.slice(0, input.limit),
      winners: winnersAll.slice(0, input.limit),
      losers: losersAll.slice(0, input.limit),
    },
    counts: {
      matchedPages: filteredPages.length,
      pagesToImprove: pagesToImproveAll.length,
      winners: winnersAll.length,
      losers: losersAll.length,
    },
    scoring: ga4Result?.scoring ?? null,
    coverage: {
      gscPageRowsConsidered: movement.rows.length,
      gscQueryPageRowsConsidered: queryPageRows?.rows.length ?? 0,
      ga4CandidateRowsReturned: ga4Result?.rowCount ?? 0,
      ga4TotalCandidateRows: ga4Result?.totalCandidateRows ?? null,
    },
    truncated: {
      source: {
        gscPages: currentPagesTruncated,
        gscPreviousPages: movement.previousTruncated,
        gscQueryPages: queryPagesTruncated,
        ga4: ga4Result?.truncated ?? null,
      },
      results: {
        pagesToImprove: pagesToImproveAll.length > input.limit,
        winners: winnersAll.length > input.limit,
        losers: losersAll.length > input.limit,
      },
    },
    warnings: warningList({
      ga4Availability,
      currentPagesTruncated,
      previousPagesTruncated: movement.previousTruncated,
      queryPagesTruncated,
      ga4Result,
    }),
  };
}

export const SearchOpportunitiesPageService = { getReport };
