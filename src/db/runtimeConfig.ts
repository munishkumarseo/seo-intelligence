export type OpenSeoRuntime = "cloudflare" | "node";
export type DatabaseProvider = "d1" | "postgres";

export interface RuntimeConfigInput {
  runtime: OpenSeoRuntime;
  databaseProvider?: string;
  databaseUrl?: string;
  hyperdriveConnectionString?: string;
}

export type ResolvedDatabaseConfig =
  | {
      runtime: "cloudflare";
      databaseProvider: "d1";
    }
  | {
      runtime: OpenSeoRuntime;
      databaseProvider: "postgres";
      postgresConnectionString: string;
    };

export function resolveDatabaseConfig(
  input: RuntimeConfigInput,
): ResolvedDatabaseConfig {
  const provider =
    input.databaseProvider?.trim() ||
    (input.runtime === "cloudflare" ? "d1" : "postgres");

  if (input.runtime === "node") {
    if (provider !== "postgres") {
      throw new Error("D1 is not supported on the Node/Vercel runtime.");
    }

    const databaseUrl = input.databaseUrl?.trim();
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_PROVIDER=postgres on Node/Vercel requires DATABASE_URL.",
      );
    }

    return {
      runtime: "node",
      databaseProvider: "postgres",
      postgresConnectionString: databaseUrl,
    };
  }

  if (provider === "d1") {
    return {
      runtime: "cloudflare",
      databaseProvider: "d1",
    };
  }

  if (provider !== "postgres") {
    throw new Error(
      `Unsupported DATABASE_PROVIDER "${provider}". Expected "d1" or "postgres".`,
    );
  }

  const hyperdriveConnectionString = input.hyperdriveConnectionString?.trim();
  if (!hyperdriveConnectionString) {
    throw new Error(
      "DATABASE_PROVIDER=postgres on Cloudflare requires a HYPERDRIVE binding.",
    );
  }

  return {
    runtime: "cloudflare",
    databaseProvider: "postgres",
    postgresConnectionString: hyperdriveConnectionString,
  };
}
