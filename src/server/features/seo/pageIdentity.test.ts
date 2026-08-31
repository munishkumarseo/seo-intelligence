import { describe, expect, it } from "vitest";

type PageIdentityModule = {
  normalizePageKey: (value: string) => string | null;
};

async function loadPageIdentity(): Promise<PageIdentityModule> {
  const modulePath = ["./page", "Identity"].join("");
  const loaded = (await import(modulePath)) as unknown;

  if (
    typeof loaded !== "object" ||
    loaded === null ||
    !("normalizePageKey" in loaded) ||
    typeof loaded.normalizePageKey !== "function"
  ) {
    throw new Error("pageIdentity module does not expose normalizePageKey");
  }

  return loaded as PageIdentityModule;
}

describe("normalizePageKey", () => {
  it("normalizes host casing and trailing slashes", async () => {
    const { normalizePageKey } = await loadPageIdentity();
    expect(normalizePageKey("https://Example.com/foo/")).toBe(
      "example.com/foo",
    );
  });

  it("drops default ports", async () => {
    const { normalizePageKey } = await loadPageIdentity();
    expect(normalizePageKey("http://example.com:80/foo")).toBe(
      "example.com/foo",
    );
  });

  it("keeps non-default ports", async () => {
    const { normalizePageKey } = await loadPageIdentity();
    expect(normalizePageKey("https://example.com:8443/foo/")).toBe(
      "example.com:8443/foo",
    );
  });

  it("rejects unavailable page values", async () => {
    const { normalizePageKey } = await loadPageIdentity();
    expect(normalizePageKey("(not set)")).toBeNull();
  });
});
