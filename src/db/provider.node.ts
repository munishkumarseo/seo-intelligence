import { resolveDatabaseConfig } from "./runtimeConfig";

function getConfig() {
  return resolveDatabaseConfig({
    runtime: "node",
    databaseProvider: process.env.DATABASE_PROVIDER,
    databaseUrl: process.env.DATABASE_URL,
  });
}

export function getDatabaseProvider() {
  return getConfig().databaseProvider;
}

export function getPostgresConnectionString() {
  const config = getConfig();
  if (config.databaseProvider !== "postgres") {
    throw new Error("Node/Vercel runtime requires Postgres.");
  }
  return config.postgresConnectionString;
}
