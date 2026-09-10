import { describe, expect, it } from "vitest";
import { resolveDatabaseConfig } from "./runtimeConfig";

describe("resolveDatabaseConfig", () => {
  it("requires postgres on the Node runtime", () => {
    expect(() =>
      resolveDatabaseConfig({ runtime: "node", databaseProvider: "d1" }),
    ).toThrow(/D1 is not supported/i);
  });

  it("requires DATABASE_URL for Node postgres", () => {
    expect(() =>
      resolveDatabaseConfig({ runtime: "node", databaseProvider: "postgres" }),
    ).toThrow(/DATABASE_URL/i);
  });

  it("accepts Node postgres via DATABASE_URL", () => {
    expect(
      resolveDatabaseConfig({
        runtime: "node",
        databaseProvider: "postgres",
        databaseUrl: "postgresql://example.invalid/db",
      }),
    ).toEqual({
      runtime: "node",
      databaseProvider: "postgres",
      postgresConnectionString: "postgresql://example.invalid/db",
    });
  });

  it("preserves Cloudflare D1 as the default", () => {
    expect(resolveDatabaseConfig({ runtime: "cloudflare" })).toEqual({
      runtime: "cloudflare",
      databaseProvider: "d1",
    });
  });

  it("requires Hyperdrive for Cloudflare postgres", () => {
    expect(() =>
      resolveDatabaseConfig({
        runtime: "cloudflare",
        databaseProvider: "postgres",
      }),
    ).toThrow(/HYPERDRIVE/i);
  });

  it("rejects an unknown database provider", () => {
    expect(() =>
      resolveDatabaseConfig({
        runtime: "cloudflare",
        databaseProvider: "mysql",
      }),
    ).toThrow(/Unsupported DATABASE_PROVIDER/i);
  });
});
