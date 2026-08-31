# Local Development

## Prerequisites

- Node.js 20+
- [Corepack](https://nodejs.org/api/corepack.html) (bundled through Node.js 24; install it separately on Node.js 25+)
- No paid SEO-data API is required for the default first-party development mode.

## Local Development Workflow

```sh
# Activates the exact pnpm version declared in package.json.
corepack enable
pnpm install --frozen-lockfile

# Run once per fresh local DB
pnpm run db:migrate:local
```

Verify that `pnpm --version` reports the version declared by the `packageManager` field in `package.json`.

Configure `.env.local`:

1. `cp .env.example .env.local`
2. Keep the default:

   ```env
   SEO_DATA_MODE=first_party
   ```

3. Set `AUTH_MODE=local_noauth` for normal local development.
4. Add Google OAuth variables when testing GSC or GA4 integrations.

You do **not** need `DATAFORSEO_API_KEY` for first-party development.

If you intentionally need upstream paid-provider compatibility, use:

```env
SEO_DATA_MODE=full
DATAFORSEO_API_KEY=<base64-login-password>
```

See [`DATAFORSEO_API_KEY.md`](./DATAFORSEO_API_KEY.md).

Run locally:

```sh
# Option 1
pnpm run dev

# Option 2 (Recommended)
mkdir .logs
touch .logs/dev-server.log
pnpm dev:agents
```

`pnpm dev:agents` runs through [portless](https://github.com/vercel-labs/portless) at `http://open-seo.localhost:1355` by default.

When using a git worktree, portless prefixes the branch name, for example `http://feature-name.open-seo.localhost:1355`.

## Database Commands

Generate migration:

```sh
pnpm run db:generate
```

Migrate local DB:

```sh
pnpm run db:migrate:local
```

## Postgres backend (optional)

D1 (SQLite) is the default. To run against Postgres locally instead, see [`LOCAL_POSTGRES.md`](./LOCAL_POSTGRES.md).

## Auth Modes

- `AUTH_MODE=cloudflare_access` (default): validates Cloudflare Access JWTs using `TEAM_DOMAIN` + `POLICY_AUD`.
- `AUTH_MODE=local_noauth`: local trusted mode, no auth check, injects `admin@localhost`.
- `AUTH_MODE=hosted`: Better Auth-backed email/password mode. Requires Better Auth schema generation plus `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.

Dev scripts do not set `AUTH_MODE`, so you can test another mode by changing it in `.env.local`.

## SEO data modes

- `first_party` (default): GSC, GA4, project context, site audit, and first-party MCP tools; DataForSEO transport is blocked.
- `full`: retains upstream paid-provider features and requires valid DataForSEO credentials for those calls.

For Cloudflare deployments, use the self-host guide rather than copying local `AUTH_MODE` assumptions into production.
