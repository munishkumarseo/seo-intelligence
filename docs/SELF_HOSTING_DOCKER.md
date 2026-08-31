# Docker Self-Hosting

Run OpenSEO locally with Docker.

In Docker mode, OpenSEO uses `AUTH_MODE=local_noauth` (no app-level auth checks, local admin user `admin@localhost`). Only expose it behind your own auth-protected reverse proxy, tunnel, or private network.

The default `compose.yaml` uses the published GHCR image unless you override `OPEN_SEO_IMAGE`. When testing this fork before publishing your own image, build the image locally as described below.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- No DataForSEO API key is required for the default `first_party` mode.

For useful first-party search intelligence, configure Google Search Console and Google Analytics using the existing Google OAuth integration. DataForSEO is only required if you explicitly choose `SEO_DATA_MODE=full`.

## Quickstart

```bash
cp .env.example .env
```

The copied file defaults to:

```env
SEO_DATA_MODE=first_party
```

Start OpenSEO:

```bash
docker compose up -d
```

Open `http://localhost:<PORT>` (default `3001`). Follow startup progress with `docker compose logs -f`.

Optional env values include:

- `PORT` (defaults to `3001`)
- `ALLOWED_HOST` (single reverse-proxy hostname to allow in Vite preview)
- `OPEN_SEO_IMAGE`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `BETTER_AUTH_SECRET` for Google integrations
- `OPENROUTER_API_KEY` for optional AI-agent features
- `SEO_DATA_MODE=full` plus `DATAFORSEO_API_KEY` only when paid-provider features are intentionally enabled

If you put Docker behind a reverse proxy or temporary tunnel, remember that Docker self-hosting runs with app auth disabled. Only expose it behind your own protected reverse proxy, tunnel, or private network, and add the public hostname before restarting:

```bash
ALLOWED_HOST=yourdomain.com docker compose up -d
```

You can also persist it in `.env`.

## Full paid-provider compatibility mode

To enable the upstream DataForSEO-backed toolset intentionally:

```env
SEO_DATA_MODE=full
DATAFORSEO_API_KEY=<base64-login-password>
```

See [`DATAFORSEO_API_KEY.md`](./DATAFORSEO_API_KEY.md).

## Telemetry

OpenSEO can collect anonymized telemetry for core usage events. Follow the existing telemetry documentation for the exact data and cadence used by your deployed version.

To disable telemetry, set `OPENSEO_TELEMETRY_DISABLED=1` (or `DO_NOT_TRACK=1`) in `.env`, then recreate the container.

## Build your own image locally

For this fork's changes, build and run a local tag:

```bash
docker build -f Dockerfile.selfhost -t seo-intelligence:local .
OPEN_SEO_IMAGE=seo-intelligence:local docker compose up -d
```

## Common commands

Restart after env changes:

```bash
docker compose up -d open-seo
```

Stop:

```bash
docker compose down
```

## Health and troubleshooting

Startup checks appear in `docker compose logs`. Once running, `/api/health` reports configuration and database status.

To confirm Docker Compose is using the expected variables:

```bash
docker compose config
```

In default mode verify:

```text
SEO_DATA_MODE=first_party
DATAFORSEO_API_KEY=
```

An empty DataForSEO value is expected in first-party mode. If health reports a DataForSEO requirement, check that `SEO_DATA_MODE` was not set to `full`.

If you changed `.env`, recreate the container so Compose reapplies it:

```bash
docker compose up -d --force-recreate open-seo
```
