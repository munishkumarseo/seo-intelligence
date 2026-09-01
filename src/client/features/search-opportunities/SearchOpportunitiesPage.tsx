import { type FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { SearchConsoleConnectionCard } from "@/client/features/gsc/SearchConsoleConnectionCard";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { getSearchOpportunitiesReport } from "@/serverFunctions/searchOpportunities";
import {
  SEARCH_PERFORMANCE_RANGES,
  type SearchPerformanceDateRange,
} from "@/types/schemas/search-performance";

const RANGE_LABELS: Record<SearchPerformanceDateRange, string> = {
  last_7_days: "Last 7 days",
  last_28_days: "Last 28 days",
  last_3_months: "Last 3 months",
};

function isDateRange(value: string): value is SearchPerformanceDateRange {
  return SEARCH_PERFORMANCE_RANGES.some((option) => option === value);
}

export function SearchOpportunitiesPage({ projectId }: { projectId: string }) {
  const [range, setRange] =
    useState<SearchPerformanceDateRange>("last_28_days");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState<string | undefined>();

  const reportQuery = useQuery({
    queryKey: ["searchOpportunities", projectId, range, search ?? null],
    queryFn: () =>
      getSearchOpportunitiesReport({
        data: {
          projectId,
          dateRange: range,
          search,
          limit: 50,
        },
      }),
  });
  const report = reportQuery.data;

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = searchDraft.trim();
    setSearch(normalized || undefined);
  };

  return (
    <div className="overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Search Opportunities</h1>
          <p className="text-sm text-base-content/70">
            Prioritize pages using your Search Console evidence, with Analytics
            business-value signals when GA4 is connected.
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-base-300 bg-base-100 p-3 sm:flex-row sm:items-center">
          <form className="join flex-1" onSubmit={submitSearch}>
            <label className="input input-bordered input-sm join-item flex flex-1 items-center gap-2">
              <Search className="size-4 text-base-content/50" />
              <input
                className="min-w-0 flex-1"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Filter by page URL or Search Console query"
                aria-label="Search opportunities"
              />
            </label>
            <button className="btn btn-sm join-item" type="submit">
              Search
            </button>
          </form>
          <select
            className="select select-bordered select-sm w-full sm:w-40"
            value={range}
            onChange={(event) => {
              if (isDateRange(event.target.value)) {
                setRange(event.target.value);
              }
            }}
            aria-label="Date range"
          >
            {SEARCH_PERFORMANCE_RANGES.map((value) => (
              <option key={value} value={value}>
                {RANGE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        {reportQuery.isPending ? (
          <div className="flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 p-8 text-sm text-base-content/60">
            <Loader2 className="size-4 animate-spin" /> Loading opportunities…
          </div>
        ) : reportQuery.isError ? (
          <div className="alert alert-error">
            <span className="text-sm">
              {getStandardErrorMessage(reportQuery.error)}
            </span>
          </div>
        ) : report?.status === "gsc_not_connected" ? (
          <div className="max-w-2xl">
            <SearchConsoleConnectionCard projectId={projectId} />
          </div>
        ) : report?.status === "ok" ? (
          <>
            {report.connections.ga4 !== "connected" ? (
              <div className="alert">
                <span className="text-sm">
                  GA4 enrichment is unavailable ({report.connections.ga4}).
                  Search Console opportunities and movement are still shown.
                </span>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="stat rounded-xl border border-base-300 bg-base-100">
                <div className="stat-title">Pages to improve</div>
                <div className="stat-value text-2xl">
                  {report.counts.pagesToImprove}
                </div>
              </div>
              <div className="stat rounded-xl border border-base-300 bg-base-100">
                <div className="stat-title">Winners</div>
                <div className="stat-value text-2xl">
                  {report.counts.winners}
                </div>
              </div>
              <div className="stat rounded-xl border border-base-300 bg-base-100">
                <div className="stat-title">Losers</div>
                <div className="stat-value text-2xl">
                  {report.counts.losers}
                </div>
              </div>
            </div>

            <section className="overflow-hidden rounded-xl border border-base-300 bg-base-100">
              <div className="border-b border-base-300 px-4 py-3">
                <h2 className="font-semibold">Pages to improve</h2>
                <p className="text-xs text-base-content/60">
                  Pages in actionable Search Console positions, enriched with
                  the existing GA4 opportunity score when available.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th className="text-right">Impressions</th>
                      <th className="text-right">Position</th>
                      <th className="text-right">Change</th>
                      <th className="text-right">Opportunity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sections.pagesToImprove.map((row) => (
                      <tr key={row.normalizedPage}>
                        <td className="max-w-md truncate" title={row.page}>
                          {row.page}
                        </td>
                        <td className="text-right">
                          {row.impressions.toLocaleString()}
                        </td>
                        <td className="text-right">
                          {row.averagePosition.toFixed(1)}
                        </td>
                        <td className="text-right">
                          {row.positionChange === null
                            ? "—"
                            : row.positionChange.toFixed(1)}
                        </td>
                        <td className="text-right font-medium">
                          {row.opportunityScore ?? "GSC only"}
                        </td>
                      </tr>
                    ))}
                    {report.sections.pagesToImprove.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-base-content/60"
                        >
                          No matching pages to improve.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              {(
                [
                  ["Winners", report.sections.winners],
                  ["Losers", report.sections.losers],
                ] as const
              ).map(([label, rows]) => (
                <section
                  key={label}
                  className="overflow-hidden rounded-xl border border-base-300 bg-base-100"
                >
                  <div className="border-b border-base-300 px-4 py-3">
                    <h2 className="font-semibold">{label}</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Page</th>
                          <th className="text-right">Position</th>
                          <th className="text-right">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.normalizedPage}>
                            <td className="max-w-sm truncate" title={row.page}>
                              {row.page}
                            </td>
                            <td className="text-right">
                              {row.averagePosition.toFixed(1)}
                            </td>
                            <td className="text-right">
                              {row.positionChange === null
                                ? "—"
                                : row.positionChange.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                        {rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="py-8 text-center text-base-content/60"
                            >
                              No matching {label.toLowerCase()}.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>

            {report.warnings.length > 0 ? (
              <p className="text-xs text-base-content/50">
                Data notes: {report.warnings.join(", ")}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
