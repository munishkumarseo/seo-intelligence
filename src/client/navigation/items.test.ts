import { describe, expect, it } from "vitest";
import { getProjectNavGroups } from "@/client/navigation/items";
import { getProductCapabilitiesForMode } from "@/shared/product-capabilities";

function flattenLabels(groups: ReturnType<typeof getProjectNavGroups>) {
  return groups.flatMap((group) => group.items.map((item) => item.label));
}

describe("getProjectNavGroups", () => {
  it("shows the exact first-party SEO executive navigation", () => {
    const firstParty = getProductCapabilitiesForMode("first_party");

    expect(flattenLabels(getProjectNavGroups("p1", firstParty))).toEqual([
      "Overview",
      "Search Opportunities",
      "Search Console",
      "Analytics",
      "Site Audit",
      "Ask SEO",
    ]);
  });

  it("uses the registered Search Opportunities project route", () => {
    const firstParty = getProductCapabilitiesForMode("first_party");
    const workspace = getProjectNavGroups("p1", firstParty).find(
      (group) => group.label === "SEO Workspace",
    );

    expect(workspace).toBeDefined();
    if (!workspace || workspace.label !== "SEO Workspace") {
      throw new Error(
        "Expected the first-party SEO Workspace navigation group",
      );
    }

    const searchOpportunities = workspace.items.find(
      (item) => item.label === "Search Opportunities",
    );

    expect(searchOpportunities).toMatchObject({
      to: "/p/$projectId/search-opportunities",
      params: { projectId: "p1" },
    });
    expect(searchOpportunities).not.toHaveProperty("href");
  });

  it("keeps paid-provider navigation available in full mode", () => {
    const full = getProductCapabilitiesForMode("full");
    const labels = flattenLabels(getProjectNavGroups("p1", full));

    expect(labels).toContain("Keyword Research");
    expect(labels).toContain("Rank Tracking");
    expect(labels).toContain("Backlinks");
  });
});
