import { describe, expect, it } from "vitest";
import { productCapabilitiesQueryOptions } from "@/client/features/product/productCapabilitiesQuery";
import {
  getProductCapabilitiesForMode,
  type ProductCapabilities,
} from "@/shared/product-capabilities";

describe("getProductCapabilitiesForMode", () => {
  it("exposes only first-party product features in first_party mode", () => {
    const result: ProductCapabilities =
      getProductCapabilitiesForMode("first_party");

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

  it("caches the authenticated capability query for the session", () => {
    const options = productCapabilitiesQueryOptions();

    expect(options.queryKey).toEqual(["productCapabilities"]);
    expect(options.staleTime).toBe(Infinity);
    expect(typeof options.queryFn).toBe("function");
  });
});
