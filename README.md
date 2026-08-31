# OpenSEO

> SEO intelligence built on your own Google data.

This fork of OpenSEO defaults to **first-party mode**: Google Search Console, Google Analytics 4, project context, and first-party site-audit data are the evidence layer. The product interprets and prioritizes that evidence instead of requiring users to buy a third-party SEO-data API.

> Turn Search Console and Analytics into SEO actions.

OpenSEO still exposes an MCP server and agent skills, so AI agents can work with the same structured evidence used by the application.

<img width="1385" height="794" alt="Image" src="https://github.com/user-attachments/assets/fd208249-44ea-4849-bb4b-5fc896aeab73" />

## Data modes

The fork has two explicit SEO data modes:

- `SEO_DATA_MODE=first_party` — the default. Uses connected GSC, GA4, project context, and first-party site-audit/crawl data. Paid-provider MCP tools and paid rank-tracking schedules are disabled.
- `SEO_DATA_MODE=full` — optional upstream-compatibility mode. Enables DataForSEO-backed keyword, SERP, backlink, local SEO, competitor, and rank-tracking capabilities and requires `DATAFORSEO_API_KEY`.

First-party mode does not invent unavailable search volume, keyword difficulty, CPC, backlink counts, competitor rankings, or other third-party metrics.

## Why use this fork?

- Uses GSC and GA4 as the source of truth for first-party search and business-performance evidence.
- Preserves OpenSEO's existing GSC + GA4 opportunity intelligence.
- Includes first-party technical site audits.
- Exposes first-party evidence through MCP for AI-agent workflows.
- Does not require DataForSEO or another paid SEO-data provider for the core product.
- Keeps optional `full` compatibility mode for teams that intentionally want paid-provider features.

## Core first-party workflows

- Search Console performance analysis
- URL Inspection
- Google Analytics reporting
- GSC + GA4 search opportunities
- Site audits
- Project context and saved-keyword workflows
- Agent explanations and recommendations over available evidence

Paid-provider workflows such as market-wide keyword metrics, external SERP datasets, backlinks, competitor datasets, and paid rank tracking are available only in `full` mode.

## OpenSEO MCP & Agent Skills

OpenSEO exposes an MCP server so AI agents can use project SEO evidence directly. In `first_party` mode the MCP server registers only tools backed by allowed first-party sources and local project data.

The agent should explain structured evidence and recommend next actions; it must not fabricate raw metrics that the connected sources do not provide.

## Self-Hosting

OpenSEO supports two self-hosting paths:

- **Docker** — for local/private use. See [`docs/SELF_HOSTING_DOCKER.md`](./docs/SELF_HOSTING_DOCKER.md).
- **Cloudflare** — for internet-facing self-hosting across multiple devices or with a team. See [`docs/SELF_HOSTING_CLOUDFLARE.md`](./docs/SELF_HOSTING_CLOUDFLARE.md).

Both paths default to:

```env
SEO_DATA_MODE=first_party
```

No DataForSEO key is required for first-party mode. Set `SEO_DATA_MODE=full` and configure `DATAFORSEO_API_KEY` only when you intentionally enable paid-provider features.

For useful first-party search intelligence, connect Google Search Console and Google Analytics using the existing Google OAuth integrations. Site-audit functionality can operate independently of those Google connections.

## Costs

First-party mode does not require a paid SEO-data API. Your hosting platform and any optional AI model provider may still have their own usage or infrastructure costs.

If you enable `full` mode, DataForSEO is a separate pay-as-you-go third-party service and its charges apply directly to that usage. See [`docs/DATAFORSEO_API_KEY.md`](./docs/DATAFORSEO_API_KEY.md).

## Local Development

See [`docs/LOCAL_DEVELOPMENT.md`](./docs/LOCAL_DEVELOPMENT.md).

## Upstream

This project is based on [`every-app/open-seo`](https://github.com/every-app/open-seo) and retains its MIT-licensed foundation. Keeping paid-provider code behind explicit capability gates reduces fork divergence and makes upstream updates easier to integrate.
