import { describe, expect, it } from "vitest";
import { getProjectRouteDecision } from "@/client/navigation/routeAccess";
import { getProductCapabilitiesForMode } from "@/shared/product-capabilities";

const firstParty = getProductCapabilitiesForMode("first_party");
const full = getProductCapabilitiesForMode("full");

describe("getProjectRouteDecision", () => {
  it("redirects paid-provider project routes in first-party mode", () => {
    expect(
      getProjectRouteDecision("/p/p1/backlinks", firstParty, true),
    ).toEqual({ kind: "redirect-overview" });
  });

  it("allows settings and integrations before GSC activation", () => {
    expect(
      getProjectRouteDecision(
        "/p/p1/settings/integrations",
        firstParty,
        false,
      ),
    ).toEqual({ kind: "allow" });
  });

  it("requires GSC for normal first-party product routes", () => {
    expect(
      getProjectRouteDecision(
        "/p/p1/search-opportunities",
        firstParty,
        false,
      ),
    ).toEqual({ kind: "redirect-gsc-setup" });
  });

  it("allows paid-provider routes in full mode", () => {
    expect(getProjectRouteDecision("/p/p1/backlinks", full, true)).toEqual({
      kind: "allow",
    });
  });
});
