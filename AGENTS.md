# AI Instructions — Read Before Changing Code

This repository is a fork/adaptation of OpenSEO for a first-party SEO intelligence product.

## Mandatory Read Order

Before planning, coding, refactoring, or answering architecture questions, read:

1. `00-PROJECT-NORTH-STAR.md`
2. `01-NON-GOALS-AND-BOUNDARIES.md`
3. `02-VERIFIED-OPENSEO-FACTS.md`
4. `03-ARCHITECTURE-GUARDRAILS.md`
5. `04-DECISION-LOG.md`
6. `05-IMPLEMENTATION-STATUS.md`

Then read the relevant source files and tests.

## Hard Rules

- Use the existing OpenSEO backend. Do not create a second backend.
- Preserve OpenSEO's existing first-party intelligence unless an explicitly approved change says otherwise.
- Core product data sources are GSC, GA4, and first-party site audit/crawl data.
- Users must not need DataForSEO or another paid SEO-data API.
- Keep DataForSEO code initially, but disable paid-provider-dependent capabilities in first-party mode.
- Never invent unavailable metrics such as search volume, keyword difficulty, CPC, backlink counts, or competitor rankings.
- Distinguish **verified fact**, **approved plan**, and **assumption**.
- Do not treat planned behavior as implemented behavior.
- Verify existing repository code before creating new services or changing architecture.
- The agent explains and orchestrates structured backend evidence; it is not the source of truth for raw SEO metrics.
- If canonical documents conflict with a new request, surface the conflict before making an architectural or destructive change.

## Hallucination Prevention

When uncertain:

1. inspect code;
2. inspect tests/docs;
3. mark unknown if still unresolved;
4. do not fill gaps with guesses.

A confident guess is still a guess.
