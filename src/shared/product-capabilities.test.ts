import { describe, expect, it } from "vitest";
import { getProductCapabilitiesForMode } from "@/shared/product-capabilities";

describe("getProductCapabilitiesForMode", () => {
  it("exposes only first-party product features in first_party mode", () => {
    const result = getProductCapabilitiesForMode("first_party");

    expect(result.dataMode).toBe("first_party");
    expect(result.features).toMatchObject({
      gsc: true,
      ga4: true,
      siteAudit: true,
      searchOpportunities: true,
      askSeo: true,
      keywordResearch: false,
      savedKeywords: false,
      rankTracking: false,
      domainResearch: false,
      backlinks: false,
      brandLookup: false,
      promptExplorer: false,
      dataForSeoSetup: false,
    });
  });

  it("keeps paid-provider features enabled in full mode", () => {
    const result = getProductCapabilitiesForMode("full");

    expect(result.dataMode).toBe("full");
    expect(result.features.dataForSeoSetup).toBe(true);
    expect(result.features.backlinks).toBe(true);
    expect(result.features.keywordResearch).toBe(true);
  });
});
