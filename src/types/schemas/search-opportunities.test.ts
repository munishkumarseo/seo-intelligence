import { describe, expect, it } from "vitest";
import {
  SEARCH_OPPORTUNITY_TABS,
  searchOpportunitiesInputSchema,
  searchOpportunityQueriesInputSchema,
} from "./search-opportunities";

describe("search opportunities schemas", () => {
  it("locks the approved tab values and table defaults", () => {
    expect(SEARCH_OPPORTUNITY_TABS).toEqual([
      "improved",
      "new",
      "dropped",
      "improve",
    ]);
    expect(searchOpportunitiesInputSchema.parse({ tab: "improved" })).toEqual({
      tab: "improved",
      dateRange: "last_28_days",
      limit: 100,
    });
  });

  it("accepts approved filters and normalizes the GSC country code", () => {
    expect(
      searchOpportunitiesInputSchema.parse({
        tab: "improve",
        dateRange: "last_7_days",
        device: "MOBILE",
        country: "CAN",
        search: " dental crown ",
        limit: 25,
      }),
    ).toEqual({
      tab: "improve",
      dateRange: "last_7_days",
      device: "MOBILE",
      country: "can",
      search: "dental crown",
      limit: 25,
    });
  });

  it("rejects unknown tabs, devices, ranges, countries, and limits over 100", () => {
    expect(
      searchOpportunitiesInputSchema.safeParse({ tab: "stable" }).success,
    ).toBe(false);
    expect(
      searchOpportunitiesInputSchema.safeParse({
        tab: "improved",
        device: "PHONE",
      }).success,
    ).toBe(false);
    expect(
      searchOpportunitiesInputSchema.safeParse({
        tab: "improved",
        dateRange: "last_12_months",
      }).success,
    ).toBe(false);
    expect(
      searchOpportunitiesInputSchema.safeParse({
        tab: "improved",
        country: "CA",
      }).success,
    ).toBe(false);
    expect(
      searchOpportunitiesInputSchema.safeParse({
        tab: "improved",
        limit: 101,
      }).success,
    ).toBe(false);
  });

  it("requires a page for the query drawer and shares the same GSC filters", () => {
    expect(
      searchOpportunityQueriesInputSchema.parse({
        page: "https://example.com/dental-crowns/",
        device: "DESKTOP",
        country: "USA",
      }),
    ).toEqual({
      page: "https://example.com/dental-crowns/",
      dateRange: "last_28_days",
      device: "DESKTOP",
      country: "usa",
    });
    expect(searchOpportunityQueriesInputSchema.safeParse({}).success).toBe(
      false,
    );
    expect(
      searchOpportunityQueriesInputSchema.safeParse({ page: "   " }).success,
    ).toBe(false);
  });
});
