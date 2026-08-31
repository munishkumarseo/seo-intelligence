import type { ProductCapabilities } from "@/shared/product-capabilities";

export type ProjectRouteDecision =
  | { kind: "allow" }
  | { kind: "redirect-overview" }
  | { kind: "redirect-gsc-setup" };

const FIRST_PARTY_DISABLED_SUFFIXES = [
  "/keywords",
  "/saved",
  "/rank-tracking",
  "/domain",
  "/backlinks",
  "/brand-lookup",
  "/prompt-explorer",
] as const;

function matchesDisabledSuffix(pathname: string) {
  return FIRST_PARTY_DISABLED_SUFFIXES.some(
    (suffix) => pathname.endsWith(suffix) || pathname.includes(`${suffix}/`),
  );
}

function isGscSetupExempt(pathname: string) {
  return pathname.includes("/settings");
}

export function getProjectRouteDecision(
  pathname: string,
  capabilities: ProductCapabilities,
  hasGsc: boolean,
): ProjectRouteDecision {
  if (capabilities.dataMode !== "first_party") {
    return { kind: "allow" };
  }

  if (matchesDisabledSuffix(pathname)) {
    return { kind: "redirect-overview" };
  }

  if (!hasGsc && !isGscSetupExempt(pathname)) {
    return { kind: "redirect-gsc-setup" };
  }

  return { kind: "allow" };
}
