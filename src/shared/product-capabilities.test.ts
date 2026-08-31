import { describe, expect, it } from "vitest";

type DataMode = "first_party" | "full";

type ProductCapabilitiesModule = {
  getProductCapabilitiesForMode: (dataMode: DataMode) => {
    dataMode: DataMode;
    features: {
      gsc: boolean;
      ga4: boolean;
      siteAudit: boolean;
      searchOpportunities: boolean;
      askSeo: boolean;
      keywordResearch: boolean;
      savedKeywords: boolean;
      rankTracking: boolean;
      domainResearch: boolean;
      backlinks: boolean;
      brandLookup: boolean;
      promptExplorer: boolean;
      dataForSeoSetup: boolean;
    };
  };
};

function isProductCapabilitiesModule(
  value: unknown,
): value is ProductCapabilitiesModule {
  if (typeof value !== "object" || value === null) return false;
  if (!("getProductCapabilitiesForMode" in value)) return false;
  return typeof value.getProductCapabilitiesForMode === "function";
}

async function loadProductCapabilities(): Promise<ProductCapabilitiesModule> {
  const modulePath = ["@/shared", "product-capabilities"].join("/");
  const loaded: unknown = await import(modulePath);
  if (!isProductCapabilitiesModule(loaded)) {
    throw new Error("Invalid product capabilities module");
  }
  return loaded;
}

describe("getProductCapabilitiesForMode", () => {
  it("exposes only first-party product features in first_party mode", async () => {
    const { getProductCapabilitiesForMode } = await loadProductCapabilities();
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

  it("keeps paid-provider features enabled in full mode", async () => {
    const { getProductCapabilitiesForMode } = await loadProductCapabilities();
    const result = getProductCapabilitiesForMode("full");

    expect(result.dataMode).toBe("full");
    expect(result.features.dataForSeoSetup).toBe(true);
    expect(result.features.backlinks).toBe(true);
    expect(result.features.keywordResearch).toBe(true);
  });
});
