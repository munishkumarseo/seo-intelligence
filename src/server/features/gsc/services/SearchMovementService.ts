import { GscService } from "@/server/features/gsc/services/GscService";
import {
  resolveDateRange,
  type GscPerformanceFilter,
} from "@/server/features/gsc/searchAnalytics";
import { previousPeriod } from "@/server/features/gsc/searchPerformanceReport";
import { normalizePageKey } from "@/server/features/seo/pageIdentity";
import type { GscSearchAnalyticsRow } from "@/server/lib/gscClient";
import type {
  SearchPerformanceDateRange,
  SearchPerformanceDevice,
} from "@/types/schemas/search-performance";

const MOVEMENT_THRESHOLD = 1;
const PAGE_TO_IMPROVE_MIN_POSITION = 4;
const PAGE_TO_IMPROVE_MAX_POSITION = 20;
const ROW_LIMIT = 1_000;

type MovementCategory = "improved" | "new" | "dropped" | "stable";

type SearchMovementInput = {
  projectId: string;
  dateRange?: SearchPerformanceDateRange;
  device?: SearchPerformanceDevice;
  country?: string;
};

type PageMovementRow = {
  page: string;
  normalizedPage: string;
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
  previousAveragePosition: number | null;
  positionChange: number | null;
  category: MovementCategory;
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
  category: MovementCategory;
};

function buildFilters(input: SearchMovementInput): GscPerformanceFilter[] {
  const filters: GscPerformanceFilter[] = [];
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
  return filters;
}

function roundPositionChange(value: number): number {
  return Math.round(value * 10) / 10;
}

function classifyMovement(
  currentImpressions: number,
  currentPosition: number,
  previousPosition: number | null,
  previousTruncated: boolean,
): {
  previousAveragePosition: number | null;
  positionChange: number | null;
  category: MovementCategory;
} {
  if (previousPosition === null) {
    return {
      previousAveragePosition: null,
      positionChange: null,
      category:
        currentImpressions > 0 && !previousTruncated ? "new" : "stable",
    };
  }

  const positionChange = roundPositionChange(
    previousPosition - currentPosition,
  );
  const category: MovementCategory =
    positionChange >= MOVEMENT_THRESHOLD
      ? "improved"
      : positionChange <= -MOVEMENT_THRESHOLD
        ? "dropped"
        : "stable";
  return {
    previousAveragePosition: previousPosition,
    positionChange,
    category,
  };
}

function isPageToImprove(row: GscSearchAnalyticsRow): boolean {
  return (
    row.impressions > 0 &&
    row.position >= PAGE_TO_IMPROVE_MIN_POSITION &&
    row.position <= PAGE_TO_IMPROVE_MAX_POSITION
  );
}

function buildPreviousPageMap(
  rows: GscSearchAnalyticsRow[],
): Map<string, number> {
  const previousByPage = new Map<string, number>();
  for (const row of rows) {
    const page = row.keys?.[0];
    if (!page) continue;
    const normalizedPage = normalizePageKey(page);
    if (!normalizedPage) continue;
    previousByPage.set(normalizedPage, row.position);
  }
  return previousByPage;
}

function buildPreviousQueryMap(
  rows: GscSearchAnalyticsRow[],
): Map<string, number> {
  const previousByQuery = new Map<string, number>();
  for (const row of rows) {
    const query = row.keys?.[0];
    if (!query) continue;
    previousByQuery.set(query, row.position);
  }
  return previousByQuery;
}

async function getPageMovements(input: SearchMovementInput): Promise<{
  rows: PageMovementRow[];
  previousTruncated: boolean;
}> {
  const currentRange = resolveDateRange({
    dateRange: input.dateRange ?? "last_28_days",
  });
  const previousRange = previousPeriod(
    currentRange.startDate,
    currentRange.endDate,
  );
  const filters = buildFilters(input);

  const [current, previous] = await Promise.all([
    GscService.getPerformance({
      projectId: input.projectId,
      startDate: currentRange.startDate,
      endDate: currentRange.endDate,
      dimensions: ["page"],
      filters,
      rowLimit: ROW_LIMIT,
      type: "web",
      dataState: "final",
    }),
    GscService.getPerformance({
      projectId: input.projectId,
      startDate: previousRange.startDate,
      endDate: previousRange.endDate,
      dimensions: ["page"],
      filters,
      rowLimit: ROW_LIMIT,
      type: "web",
      dataState: "final",
    }),
  ]);

  const previousTruncated = previous.rows.length >= ROW_LIMIT;
  const previousByPage = buildPreviousPageMap(previous.rows);
  const rows: PageMovementRow[] = [];

  for (const row of current.rows) {
    const page = row.keys?.[0];
    if (!page) continue;
    const normalizedPage = normalizePageKey(page);
    if (!normalizedPage) continue;
    const movement = classifyMovement(
      row.impressions,
      row.position,
      previousByPage.get(normalizedPage) ?? null,
      previousTruncated,
    );
    rows.push({
      page,
      normalizedPage,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      averagePosition: row.position,
      ...movement,
      isPageToImprove: isPageToImprove(row),
    });
  }

  return { rows, previousTruncated };
}

async function getPageQueries(
  input: SearchMovementInput & { page: string },
): Promise<{
  rows: QueryMovementRow[];
  previousTruncated: boolean;
}> {
  const currentRange = resolveDateRange({
    dateRange: input.dateRange ?? "last_28_days",
  });
  const previousRange = previousPeriod(
    currentRange.startDate,
    currentRange.endDate,
  );
  const filters: GscPerformanceFilter[] = [
    {
      dimension: "page",
      operator: "equals",
      expression: input.page,
    },
    ...buildFilters(input),
  ];

  const [current, previous] = await Promise.all([
    GscService.getPerformance({
      projectId: input.projectId,
      startDate: currentRange.startDate,
      endDate: currentRange.endDate,
      dimensions: ["query"],
      filters,
      rowLimit: ROW_LIMIT,
      type: "web",
      dataState: "final",
    }),
    GscService.getPerformance({
      projectId: input.projectId,
      startDate: previousRange.startDate,
      endDate: previousRange.endDate,
      dimensions: ["query"],
      filters,
      rowLimit: ROW_LIMIT,
      type: "web",
      dataState: "final",
    }),
  ]);

  const previousTruncated = previous.rows.length >= ROW_LIMIT;
  const previousByQuery = buildPreviousQueryMap(previous.rows);
  const rows: QueryMovementRow[] = [];

  for (const row of current.rows) {
    const query = row.keys?.[0];
    if (!query) continue;
    const movement = classifyMovement(
      row.impressions,
      row.position,
      previousByQuery.get(query) ?? null,
      previousTruncated,
    );
    rows.push({
      query,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      averagePosition: row.position,
      ...movement,
    });
  }

  return { rows, previousTruncated };
}

export const SearchMovementService = {
  getPageMovements,
  getPageQueries,
};
