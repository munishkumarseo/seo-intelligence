import { normalizePageKey } from "@/server/features/seo/pageIdentity";
import type { GscSearchAnalyticsRow } from "@/server/lib/gscClient";

type SearchablePageRow = {
  page: string;
  normalizedPage: string;
};

function normalizeNeedle(search: string | undefined): string | null {
  const value = search?.trim().toLocaleLowerCase();
  return value ? value : null;
}

/**
 * Returns page identity keys whose real GSC query text matches the user's
 * search. `queryPageRows` must come from dimensions:["query", "page"] in that
 * order. This keeps keyword search grounded in Search Console evidence rather
 * than guessing keywords from URL slugs.
 */
export function buildQueryMatchedPageKeys(
  queryPageRows: GscSearchAnalyticsRow[],
  search: string | undefined,
): Set<string> {
  const needle = normalizeNeedle(search);
  const matched = new Set<string>();
  if (!needle) return matched;

  for (const row of queryPageRows) {
    const query = row.keys?.[0];
    const page = row.keys?.[1];
    if (!query || !page || !query.toLocaleLowerCase().includes(needle)) {
      continue;
    }
    const key = normalizePageKey(page);
    if (key) matched.add(key);
  }
  return matched;
}

/** Case-insensitive partial match against the displayed URL/path or any actual
 * GSC query associated with the page. Source rows are returned unchanged. */
export function filterSearchOpportunityPages<T extends SearchablePageRow>(
  rows: T[],
  search: string | undefined,
  queryMatchedPageKeys: ReadonlySet<string>,
): T[] {
  const needle = normalizeNeedle(search);
  if (!needle) return rows;

  return rows.filter(
    (row) =>
      row.page.toLocaleLowerCase().includes(needle) ||
      row.normalizedPage.toLocaleLowerCase().includes(needle) ||
      queryMatchedPageKeys.has(row.normalizedPage),
  );
}
