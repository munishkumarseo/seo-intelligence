import { describe, expect, it } from "vitest";
import {
  buildQueryMatchedPageKeys,
  filterSearchOpportunityPages,
} from "@/server/features/gsc/searchOpportunityFiltering";
import type { GscSearchAnalyticsRow } from "@/server/lib/gscClient";

const pageRows = [
  {
    page: "https://Example.com/Services/Dental-Implants/",
    normalizedPage: "example.com/services/dental-implants",
  },
  {
    page: "https://example.com/pricing/",
    normalizedPage: "example.com/pricing",
  },
];

function queryPageRow(query: string, page: string): GscSearchAnalyticsRow {
  return {
    keys: [query, page],
    clicks: 1,
    impressions: 10,
    ctr: 0.1,
    position: 8,
  };
}

describe("search opportunity filtering", () => {
  it("matches URL/path text case-insensitively", () => {
    expect(
      filterSearchOpportunityPages(pageRows, "DENTAL-IMPLANTS", new Set()),
    ).toEqual([pageRows[0]]);
  });

  it("matches pages through actual GSC query text", () => {
    const queryMatches = buildQueryMatchedPageKeys(
      [
        queryPageRow(
          "best implant dentist montreal",
          "https://example.com/services/dental-implants/",
        ),
      ],
      "implant dentist",
    );

    expect(
      filterSearchOpportunityPages(pageRows, "implant dentist", queryMatches),
    ).toEqual([pageRows[0]]);
  });

  it("does not infer keyword matches from unrelated pages", () => {
    const queryMatches = buildQueryMatchedPageKeys(
      [
        queryPageRow(
          "dental insurance",
          "https://example.com/services/dental-implants/",
        ),
      ],
      "invisalign",
    );

    expect(
      filterSearchOpportunityPages(pageRows, "invisalign", queryMatches),
    ).toEqual([]);
  });

  it("returns the original page set when no search is active", () => {
    expect(filterSearchOpportunityPages(pageRows, undefined, new Set())).toBe(
      pageRows,
    );
  });
});
