import { describe, expect, it } from "vitest";
import { normalizePageKey } from "./pageIdentity";

describe("normalizePageKey", () => {
  it("normalizes host casing and trailing slashes", () => {
    expect(normalizePageKey("https://Example.com/foo/")).toBe(
      "example.com/foo",
    );
  });

  it("drops default ports", () => {
    expect(normalizePageKey("http://example.com:80/foo")).toBe(
      "example.com/foo",
    );
  });

  it("keeps non-default ports", () => {
    expect(normalizePageKey("https://example.com:8443/foo/")).toBe(
      "example.com:8443/foo",
    );
  });

  it("rejects unavailable page values", () => {
    expect(normalizePageKey("(not set)")).toBeNull();
  });
});
