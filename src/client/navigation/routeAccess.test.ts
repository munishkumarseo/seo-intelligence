import { describe, expect, it } from "vitest";
import { getProjectRouteDecision } from "@/client/navigation/routeAccess";
import { getProductCapabilitiesForMode } from "@/shared/product-capabilities";

const firstParty = getProductCapabilitiesForMode("first_party");
const full = getProductCapabilitiesForMode("full");

describe("getProjectRouteDecision", () => {
  it("redirects paid-provider project routes in first-party mode", () => {
    const decision = getProjectRouteDecision(
      "/p/p1/backlinks",
      firstParty,
      true,
    );

    expect(decision).toEqual({ kind: "redirect-overview" });
  });

  it("allows settings and integrations before GSC activation", () => {
    const decision = getProjectRouteDecision(
      "/p/p1/settings/integrations",
      firstParty,
      false,
    );

    expect(decision).toEqual({ kind: "allow" });
  });

  it("requires GSC for normal first-party product routes", () => {
    const decision = getProjectRouteDecision(
      "/p/p1/search-opportunities",
      firstParty,
      false,
    );

    expect(decision).toEqual({ kind: "redirect-gsc-setup" });
  });

  it("allows paid-provider routes in full mode", () => {
    const decision = getProjectRouteDecision("/p/p1/backlinks", full, true);

    expect(decision).toEqual({ kind: "allow" });
  });
});
