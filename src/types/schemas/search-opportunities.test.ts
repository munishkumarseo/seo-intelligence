import { describe, expect, it } from "vitest";
import { searchOpportunitiesInputSchema } from "@/types/schemas/search-opportunities";

describe("searchOpportunitiesInputSchema", () => {
  it("defaults to the 28-day first-party view", () => {
    const result = searchOpportunitiesInputSchema.parse({
      projectId: "project-1",
    });

    expect(result).toMatchObject({
      projectId: "project-1",
      dateRange: "last_28_days",
      limit: 50,
    });
    expect(result.search).toBeUndefined();
  });

  it("trims a URL or keyword search value", () => {
    expect(
      searchOpportunitiesInputSchema.parse({
        projectId: "project-1",
        search: "  Dental Implants  ",
      }).search,
    ).toBe("Dental Implants");
  });

  it("treats a whitespace-only search as no filter", () => {
    expect(
      searchOpportunitiesInputSchema.parse({
        projectId: "project-1",
        search: "   ",
      }).search,
    ).toBeUndefined();
  });

  it("rejects result limits above the API contract", () => {
    expect(() =>
      searchOpportunitiesInputSchema.parse({
        projectId: "project-1",
        limit: 101,
      }),
    ).toThrow();
  });
});
