# Non-Goals and Boundaries

## V1 Is Not

- a complete Semrush clone;
- a complete Ahrefs clone;
- a replacement for GSC;
- a replacement for GA4;
- a new independent backend;
- a market-wide keyword database;
- a backlink index;
- a paid rank tracker;
- a system that invents missing SEO metrics.

## Paid-Provider Features

Features that fundamentally require a paid external provider are not core V1 capabilities. In first-party mode these features should be hidden/disabled, not faked.

Examples include external keyword volume, keyword difficulty, third-party backlink counts, paid SERP snapshots, competitor keyword databases, paid rank tracking, and paid external AI-search datasets.

## Unknown Means Unknown

If the product does not possess a metric, return or display it as unavailable. Do not synthesize search volume, keyword difficulty, CPC, backlinks, or competitor rank.

## Source Boundaries

GSC can provide clicks, impressions, CTR, average position, query/page performance, and URL Inspection evidence. It cannot provide complete market-wide keyword demand, competitor rankings, full backlink data, or true keyword difficulty.

GA4 can provide sessions/users, engagement, landing-page behavior, key events, transactions, and revenue when configured. It cannot provide Google rankings, search impressions, keyword difficulty, or external competitor data.

Site Audit can provide first-party technical/crawl evidence. A site crawl does not prove Google visibility.

## Agent Boundary

The agent calls backend tools, combines structured evidence, explains results, and recommends next actions. It does not fabricate raw metrics.
