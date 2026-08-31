# Cloudflare Self-Hosting

Host OpenSEO on Cloudflare for internet-facing self-hosting across multiple devices or with your team. One deploy command provisions the application infrastructure and Cloudflare Access login gate.

This fork defaults to `SEO_DATA_MODE=first_party`, so a DataForSEO account is not a prerequisite.

Related guides:

- [Operations](./SELF_HOSTING_CLOUDFLARE_OPERATIONS.md): connect the MCP server, telemetry.
- [Google Search Console](./SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md): connect first-party Search Console data.
- [Google Analytics](./SELF_HOSTING_GOOGLE_ANALYTICS.md): connect GA4 data.
- [DataForSEO](./DATAFORSEO_API_KEY.md): optional, only for `SEO_DATA_MODE=full`.
- [Legacy deployments](./SELF_HOSTING_CLOUDFLARE_LEGACY.md): maintenance for installs created with the retired Deploy-button or manual Wrangler flows.

## Prerequisites

- **Node 22.6 or newer** and **pnpm** (`corepack enable` sets it up).
- **A Cloudflare account with R2 enabled.** Activating R2 may require a payment method on file even when usage remains within its free tier.
- **No paid SEO-data provider is required for first-party mode.**

To use GSC/GA4 intelligence, configure the existing Google OAuth integration after deployment. To intentionally enable upstream DataForSEO-backed features, switch to `SEO_DATA_MODE=full` and follow [`DATAFORSEO_API_KEY.md`](./DATAFORSEO_API_KEY.md).

## 1) Clone your fork

```bash
git clone https://github.com/YOUR_GITHUB_USER/seo-intelligence.git
cd seo-intelligence
corepack enable
pnpm install
```

## 2) Log in to Cloudflare (once)

```bash
pnpm alchemy login                # answer yes to "Customize OAuth scopes?" and enable access:write
pnpm alchemy cloudflare bootstrap # deploys alchemy's state-store Worker to your account
```

Already logged in from before without the `access:write` scope? Run `pnpm alchemy login --configure` — a plain repeat login doesn't re-ask about scopes.

## 3) Create `.env.selfhost`

Copy the template:

```bash
cp .env.selfhost.example .env.selfhost
```

The default template contains:

```env
SEO_DATA_MODE=first_party
```

Set `ACCESS_ALLOWED_EMAILS` (or provide your own `TEAM_DOMAIN` + `POLICY_AUD`). No DataForSEO key is required in first-party mode.

For GSC and GA4 integrations, configure the Google OAuth variables documented in the Google integration guides. `BETTER_AUTH_SECRET` protects stored OAuth tokens and should remain a strong secret.

If you intentionally want paid-provider features instead:

```env
SEO_DATA_MODE=full
DATAFORSEO_API_KEY=<base64-login-password>
```

## 4) Deploy

```bash
pnpm deploy:selfhost --yes
```

The deploy preflight accepts first-party mode without `DATAFORSEO_API_KEY`. In `full` mode it fails early if the key is missing.

This provisions the D1 database, KV namespaces, and R2 bucket, applies database migrations, deploys the Worker, and creates the Cloudflare Access application protecting it (allowing exactly `ACCESS_ALLOWED_EMAILS`). If the account has no Zero Trust team yet, one can be provisioned during setup.

To manage the Access application yourself instead, set `TEAM_DOMAIN` (`https://your-team.cloudflareaccess.com`) and `POLICY_AUD` (the application's audience tag) in `.env.selfhost` — the deploy then provisions no Access resources.

## 5) Validate setup

1. Open the Worker URL printed at the end of the deploy.
2. Sign in with Cloudflare Access.
3. Check `https://<your-worker-hostname>/api/health`.
4. In first-party mode, the DataForSEO setup check should report that the provider is intentionally disabled rather than required.
5. Connect GSC and GA4 when you are ready to use their reports and search-opportunity intelligence.

## Updating

```bash
git pull
pnpm install
pnpm deploy:selfhost --yes
```

## Giving teammates access

Add the teammate to `ACCESS_ALLOWED_EMAILS` in `.env.selfhost` and redeploy. Dashboard edits to an automatically managed Access policy may be overwritten on the next deploy. If you manage the Access application yourself, edit its Allow policy in Zero Trust instead.

Everyone allowed through Cloudflare Access works in the deployment's shared workspace and sees the same projects.

## Troubleshooting

- Login fails: re-check `ACCESS_ALLOWED_EMAILS` in `.env.selfhost` and redeploy.
- Invalid `SEO_DATA_MODE`: use only `first_party` or `full`.
- `DATAFORSEO_API_KEY` is requested: confirm you did not set `SEO_DATA_MODE=full` unintentionally.
- `/api/health` reports runtime configuration checks and database status.
- For server errors, open Worker logs or run `pnpm exec wrangler tail`.

## Tearing it down

```bash
pnpm alchemy destroy --env-file .env.selfhost --stage selfhost
```

This deletes the stage resources according to the Alchemy removal policy. Review your Cloudflare resources before destructive teardown in any production environment.

## Next steps

See [Operations](./SELF_HOSTING_CLOUDFLARE_OPERATIONS.md) for connecting MCP clients and telemetry.
