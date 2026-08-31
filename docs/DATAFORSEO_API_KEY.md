# DataForSEO API Key Setup

DataForSEO is **optional in this fork**. The default `SEO_DATA_MODE=first_party` uses Google Search Console, Google Analytics 4, project context, and first-party site-audit data without calling DataForSEO.

Configure DataForSEO only when you intentionally switch to:

```env
SEO_DATA_MODE=full
```

`full` mode retains upstream-compatible paid-provider features such as external keyword metrics, SERP data, backlink data, competitor research, local SEO datasets, and paid rank tracking.

DataForSEO is a pay-as-you-go third-party service unaffiliated with this project. Its metrics are not synthesized or substituted when the provider is disabled.

## Get your API key for full mode

1. Go to [DataForSEO API Access](https://app.dataforseo.com/api-access?aff=255379) and create/sign in to an account.
2. Obtain your API credentials.
3. Copy the Base64 credentials representing your DataForSEO login and API password in `email:password` form.

## Where to set it

Set the value as `DATAFORSEO_API_KEY` **only with `SEO_DATA_MODE=full`**:

- **Docker self-hosting:** in `.env` (see [`SELF_HOSTING_DOCKER.md`](./SELF_HOSTING_DOCKER.md)).
- **Cloudflare self-hosting:** in `.env.selfhost` (see [`SELF_HOSTING_CLOUDFLARE.md`](./SELF_HOSTING_CLOUDFLARE.md)).
- **Local development:** in `.env.local` (see [`LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md)).

Example:

```env
SEO_DATA_MODE=full
DATAFORSEO_API_KEY=<base64-login-password>
```

## First-party mode

For the core product, keep:

```env
SEO_DATA_MODE=first_party
```

`DATAFORSEO_API_KEY` may be omitted entirely. The central DataForSEO transport fails closed in first-party mode before credential lookup or network access, and paid-provider MCP tools and scheduled paid rank tracking are disabled separately.
