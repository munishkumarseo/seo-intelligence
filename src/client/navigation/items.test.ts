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

  it("keeps paid-provider navigation available in full mode", () => {
    const full = getProductCapabilitiesForMode("full");
    const labels = flattenLabels(getProjectNavGroups("p1", full));

    expect(labels).toContain("Keyword Research");
    expect(labels).toContain("Rank Tracking");
    expect(labels).toContain("Backlinks");
  });
});
