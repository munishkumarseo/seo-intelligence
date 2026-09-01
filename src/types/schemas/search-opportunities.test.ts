import { describe, expect, it } from "vitest";

type SearchOpportunitiesSchemaModule = {
  SEARCH_OPPORTUNITY_TABS: readonly [
    "improved",
    "new",
    "dropped",
    "improve",
  ];
  searchOpportunitiesInputSchema: {
    parse: (value: unknown) => unknown;
    safeParse: (value: unknown) => { success: boolean };
  };
  searchOpportunityQueriesInputSchema: {
    parse: (value: unknown) => unknown;
    safeParse: (value: unknown) => { success: boolean };
  };
};

function isSchemaModule(
  value: unknown,
): value is SearchOpportunitiesSchemaModule {
  if (typeof value !== "object" || value === null) return false;
  return (
    "SEARCH_OPPORTUNITY_TABS" in value &&
    Array.isArray(value.SEARCH_OPPORTUNITY_TABS) &&
    "searchOpportunitiesInputSchema" in value &&
    typeof value.searchOpportunitiesInputSchema === "object" &&
    value.searchOpportunitiesInputSchema !== null &&
    "searchOpportunityQueriesInputSchema" in value &&
    typeof value.searchOpportunityQueriesInputSchema === "object" &&
    value.searchOpportunityQueriesInputSchema !== null
  );
}

async function loadSchemaModule(): Promise<SearchOpportunitiesSchemaModule> {
  const modulePath = "./search-opportunities";
  const loaded = (await import(/* @vite-ignore */ modulePath)) as unknown;
  if (!isSchemaModule(loaded)) {
    throw new Error("Search opportunities schema module has the wrong shape.");
  }
  return loaded;
}

describe("search opportunities schemas", () => {
  it("locks the approved tab values and table defaults", async () => {
    const { SEARCH_OPPORTUNITY_TABS, searchOpportunitiesInputSchema } =
      await loadSchemaModule();

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

  it("accepts approved filters and normalizes the GSC country code", async () => {
    const { searchOpportunitiesInputSchema } = await loadSchemaModule();

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

  it("rejects unknown tabs, devices, ranges, countries, and limits over 100", async () => {
    const { searchOpportunitiesInputSchema } = await loadSchemaModule();

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

  it("requires a page for the query drawer and shares the same GSC filters", async () => {
    const { searchOpportunityQueriesInputSchema } = await loadSchemaModule();

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
