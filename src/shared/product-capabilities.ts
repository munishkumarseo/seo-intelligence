import type { SeoDataMode } from "@/shared/seo-data-mode";

export type ProductCapabilities = {
  dataMode: SeoDataMode;
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

export function getProductCapabilitiesForMode(
  dataMode: SeoDataMode,
): ProductCapabilities {
  const paidProviderEnabled = dataMode === "full";

  return {
    dataMode,
    features: {
      gsc: true,
      ga4: true,
      siteAudit: true,
      searchOpportunities: true,
      askSeo: true,
      keywordResearch: paidProviderEnabled,
      savedKeywords: paidProviderEnabled,
      rankTracking: paidProviderEnabled,
      domainResearch: paidProviderEnabled,
      backlinks: paidProviderEnabled,
      brandLookup: paidProviderEnabled,
      promptExplorer: paidProviderEnabled,
      dataForSeoSetup: paidProviderEnabled,
    },
  };
}
