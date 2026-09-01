import { describe, expect, it } from "vitest";
import { getFirstPartyActivationStep } from "@/client/features/onboarding/firstPartyActivation";

describe("getFirstPartyActivationStep", () => {
  it("requires a selected GSC property before anything else", () => {
    expect(
      getFirstPartyActivationStep({
        hasGscProperty: false,
        ga4Choice: "undecided",
        hasGa4Property: false,
      }),
    ).toBe("gsc");
  });

  it("offers GA4 after GSC is activated", () => {
    expect(
      getFirstPartyActivationStep({
        hasGscProperty: true,
        ga4Choice: "undecided",
        hasGa4Property: false,
      }),
    ).toBe("ga4");
  });

  it("allows GA4 to be skipped", () => {
    expect(
      getFirstPartyActivationStep({
        hasGscProperty: true,
        ga4Choice: "skipped",
        hasGa4Property: false,
      }),
    ).toBe("complete");
  });

  it("keeps the GA4 step open after choosing connect until a property exists", () => {
    expect(
      getFirstPartyActivationStep({
        hasGscProperty: true,
        ga4Choice: "connect",
        hasGa4Property: false,
      }),
    ).toBe("ga4");
  });

  it("completes once a GA4 property is selected", () => {
    expect(
      getFirstPartyActivationStep({
        hasGscProperty: true,
        ga4Choice: "connect",
        hasGa4Property: true,
      }),
    ).toBe("complete");
  });
});
