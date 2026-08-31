import { describe, expect, it } from "vitest";
import {
  isPaidSeoDataEnabled,
  resolveSeoDataMode,
} from "@/shared/seo-data-mode";

describe("resolveSeoDataMode", () => {
  it("defaults to first_party when unset", () => {
    expect(resolveSeoDataMode(undefined)).toBe("first_party");
  });

  it("accepts first_party", () => {
    expect(resolveSeoDataMode("first_party")).toBe("first_party");
  });

  it("accepts full", () => {
    expect(resolveSeoDataMode("full")).toBe("full");
  });

  it("rejects invalid values instead of guessing", () => {
    expect(() => resolveSeoDataMode("paid-ish")).toThrow(
      'Invalid SEO_DATA_MODE "paid-ish"',
    );
  });

  it("only enables paid SEO data in full mode", () => {
    expect(isPaidSeoDataEnabled("first_party")).toBe(false);
    expect(isPaidSeoDataEnabled("full")).toBe(true);
  });
});
