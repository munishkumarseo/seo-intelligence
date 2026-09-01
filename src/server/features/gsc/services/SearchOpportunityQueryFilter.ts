import { GscService } from "@/server/features/gsc/services/GscService";
import {
  resolveDateRange,
  type GscPerformanceFilter,
} from "@/server/features/gsc/searchAnalytics";
import { normalizePageKey } from "@/server/features/seo/pageIdentity";
import type {
  SearchPerformanceDateRange,
  SearchPerformanceDevice,
} from "@/types/schemas/search-performance";

const ROW_LIMIT = 1_000;

type SearchablePageRow = {
  page: string;
  normalizedPage: string;
};

type OpportunitySearchKind = "page" | "query";

export function classifyOpportunitySearch(
  value: string,
): OpportunitySearchKind | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const containsSpaces = /\s/.test(trimmed);
  return trimmed.includes("/") ||
    trimmed.includes("://") ||
    (!containsSpaces && trimmed.includes("."))
    ? "page"
    : "query";
}

export async function filterSearchOpportunityRows<T extends SearchablePageRow>(
  input: {
    projectId: string;
    dateRange?: SearchPerformanceDateRange;
    device?: SearchPerformanceDevice;
    country?: string;
    search?: string;
    rows: T[];
  },
): Promise<{ rows: T[]; queryLookupTruncated: boolean }> {
  const search = input.search?.trim() ?? "";
  const searchKind = classifyOpportunitySearch(search);

  if (!searchKind) {
    return { rows: input.rows, queryLookupTruncated: false };
  }

  if (searchKind === "page") {
    const needle = search.toLowerCase();
    const normalizedNeedle = normalizePageKey(search)?.toLowerCase() ?? null;
    return {
      rows: input.rows.filter((row) => {
        const page = row.page.toLowerCase();
        const normalizedPage = row.normalizedPage.toLowerCase();
        return (
          page.includes(needle) ||
          normalizedPage.includes(needle) ||
          (normalizedNeedle !== null &&
            normalizedPage.includes(normalizedNeedle))
        );
      }),
      queryLookupTruncated: false,
    };
  }

  const dateRange = resolveDateRange({
    dateRange: input.dateRange ?? "last_28_days",
  });
  const filters: GscPerformanceFilter[] = [
    {
      dimension: "query",
      operator: "contains",
      expression: search,
    },
  ];
  if (input.device) {
    filters.push({
      dimension: "device",
      operator: "equals",
      expression: input.device,
    });
  }
  if (input.country) {
    filters.push({
      dimension: "country",
      operator: "equals",
      expression: input.country,
    });
  }

  const result = await GscService.getPerformance({
    projectId: input.projectId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    dimensions: ["page"],
    filters,
    rowLimit: ROW_LIMIT,
    type: "web",
    dataState: "final",
  });
  const matchedPages = new Set<string>();
  for (const row of result.rows) {
    const page = row.keys?.[0];
    if (!page) continue;
    const normalizedPage = normalizePageKey(page);
    if (normalizedPage) matchedPages.add(normalizedPage);
  }

  return {
    rows: input.rows.filter((row) => matchedPages.has(row.normalizedPage)),
    queryLookupTruncated: result.rows.length >= ROW_LIMIT,
  };
}
