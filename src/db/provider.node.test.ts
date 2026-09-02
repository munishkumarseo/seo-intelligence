import { afterEach, beforeEach, describe, expect, it } from "vitest";

const originalDatabaseProvider = process.env.DATABASE_PROVIDER;
const originalDatabaseUrl = process.env.DATABASE_URL;

beforeEach(() => {
  process.env.DATABASE_PROVIDER = "postgres";
  process.env.DATABASE_URL = "postgresql://example.invalid/openseo";
});

afterEach(() => {
  if (originalDatabaseProvider === undefined) {
    delete process.env.DATABASE_PROVIDER;
  } else {
    process.env.DATABASE_PROVIDER = originalDatabaseProvider;
  }

  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("Node database provider", () => {
  it("uses Postgres with DATABASE_URL", async () => {
    const { getDatabaseProvider, getPostgresConnectionString } = await import(
      "./provider.node"
    );

    expect(getDatabaseProvider()).toBe("postgres");
    expect(getPostgresConnectionString()).toBe(
      "postgresql://example.invalid/openseo",
    );
  });

  it("rejects D1 on Node", async () => {
    process.env.DATABASE_PROVIDER = "d1";
    const { getDatabaseProvider } = await import("./provider.node");

    expect(() => getDatabaseProvider()).toThrow(/D1 is not supported/i);
  });

  it("requires DATABASE_URL", async () => {
    delete process.env.DATABASE_URL;
    const { getPostgresConnectionString } = await import("./provider.node");

    expect(() => getPostgresConnectionString()).toThrow(/DATABASE_URL/i);
  });
});
