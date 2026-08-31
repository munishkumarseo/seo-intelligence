import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envMocks = vi.hoisted(() => ({
  getOptionalEnvValue: vi.fn(),
  getRequiredEnvValue: vi.fn(),
}));

vi.mock("@/server/lib/runtime-env", () => envMocks);

import { onPageApi } from "@/server/lib/dataforseo/core";

beforeEach(() => {
  envMocks.getOptionalEnvValue.mockResolvedValue("full");
  envMocks.getRequiredEnvValue.mockResolvedValue("encoded-credentials");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("DataForSEO OnPage transport", () => {
  it("does not retry a Lighthouse HTTP 5xx response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("upstream failure", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(onPageApi().lighthouseLiveJson([])).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(envMocks.getOptionalEnvValue).toHaveBeenCalledWith("SEO_DATA_MODE");
    expect(envMocks.getRequiredEnvValue).toHaveBeenCalledWith(
      "DATAFORSEO_API_KEY",
    );
  });

  it("blocks DataForSEO before credential lookup or network access in first-party mode", async () => {
    envMocks.getOptionalEnvValue.mockResolvedValue("first_party");
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(onPageApi().lighthouseLiveJson([])).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "DataForSEO features are disabled in first-party mode.",
    });
    expect(envMocks.getRequiredEnvValue).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
