# First-Party SEO Executive UI Design

Date: 2026-08-31
Status: Approved in chat; awaiting written-spec review
Branch: `docs/first-party-seo-executive-ui-design`

## 1. Purpose

Turn OpenSEO's existing first-party backend into a focused SEO intelligence product that helps an SEO executive understand Google data and decide what to work on next.

The product does not replace Google Search Console (GSC) or Google Analytics 4 (GA4). GSC and GA4 remain the source of truth. The product interprets first-party data, surfaces opportunities, prioritizes actions, and lets the existing OpenSEO agent explain the evidence.

Core data flow:

```text
GSC (required)
  +
GA4 (optional, recommended)
  +
First-party Site Audit
  ↓
Existing OpenSEO services / MCP / agent intelligence
  ↓
Overview
Search Opportunities
Search Console
Analytics
Site Audit
Ask SEO
```

## 2. Design principles

1. **Action before reporting.** Overview answers “What should I work on today?” before showing raw KPIs.
2. **First-party evidence only in `first_party` mode.** Do not fabricate or imply unavailable market data.
3. **Preserve OpenSEO intelligence.** Reuse existing GSC, GA4, audit, MCP, agent, context, and SearchOpportunityService logic.
4. **Do not create a second SEO scoring brain.** GSC-only movement views use transparent comparisons; GA4-enriched opportunity scoring continues to use the existing OpenSEO service.
5. **Simple SEO language.** Prefer familiar terms such as Clicks, Impressions, CTR, Average Position, Ranking Improved, and Ranking Dropped.
6. **Neutral product styling.** Use a shadcn-like charcoal/graphite/gray/off-white visual system with subtle borders and restrained charts.
7. **No hidden paid-provider execution.** Disabled features must not generate background DataForSEO requests.
8. **GSC is the activation gate.** GA4 enhances the product but does not unlock it.
9. **Unknown is not zero.** Missing, unjoined, or unavailable source data is displayed as unavailable, not converted into a fabricated numeric zero.

## 3. Product modes and capabilities

Use a small server-owned capability layer derived from `SEO_DATA_MODE`. The client receives product capabilities, not raw environment variables or credentials.

Conceptual first-party capabilities:

```text
gsc: enabled
ga4: enabled
siteAudit: enabled
searchOpportunities: enabled
askSeo: enabled

keywordResearch: disabled
savedKeywords: disabled
rankTracking: disabled
domainResearch: disabled
backlinks: disabled
brandLookup: disabled
promptExplorer: disabled
dataForSeoSetup: disabled
```

The capability object is the single source of truth for:

- sidebar navigation;
- route guards;
- onboarding;
- dashboard data requests;
- setup banners/modals;
- paid-provider background requests.

In `full` mode, the existing paid-provider capabilities and routes remain enabled. The first-party route restrictions in this specification apply only to `first_party` mode.

## 4. First-party navigation

The first-party sidebar is:

```text
Overview
Search Opportunities
Search Console
Analytics
Site Audit
Ask SEO

Settings
└── Integrations
```

The following current OpenSEO destinations are hidden in first-party mode:

- Keyword Research
- Saved Keywords
- Rank Tracking
- Domain Overview
- Backlinks
- Brand Lookup
- Prompt Explorer

The order is intentional: interpretation and action come before raw reporting.

## 5. Route behavior

Allowed first-party destinations:

- Overview
- Search Opportunities
- Search Console
- Analytics
- Site Audit
- Ask SEO
- Settings / Integrations

Direct navigation to a disabled paid-provider route redirects to Overview and shows a small neutral message:

> This feature isn't available in first-party mode.

Do not show a hard DataForSEO error, missing credential state, or blank screen.

## 6. DataForSEO UI and execution boundary

In `SEO_DATA_MODE=first_party`, the product shows none of the following:

- DataForSEO API key modal;
- DataForSEO setup banner;
- missing-key warning;
- onboarding requirement;
- paid-provider CTA.

The client must also avoid paid-provider requests. In particular, the existing dashboard backlink snapshot refresh must not run in first-party mode.

The backend DataForSEO hard kill switch remains the final safety boundary; the frontend capability system prevents the requests from being attempted in normal first-party UX.

## 7. Onboarding

The required flow is intentionally short:

```text
1. Create Project
2. Connect Search Console — required
3. Select verified GSC property — required
4. Connect Google Analytics — recommended, skippable
5. Select GA4 property — only if connected
6. Enter Overview
```

Remove the current required profile/marketing questions from the first-party activation path:

- tasks that matter most;
- who the user does SEO for;
- how the user found OpenSEO;
- country/language fields that exist primarily for paid SERP/keyword tooling.

### 7.1 GSC activation gate

A project without a selected GSC property cannot enter the main product. This applies to both new and existing projects.

The connection state explains that GSC powers:

- clicks;
- impressions;
- CTR;
- average position;
- position changes;
- search opportunities.

### 7.2 GA4 is optional

Users may skip GA4 and use the product with GSC only.

GA4 messaging should be non-blocking:

> Connect Google Analytics to understand which search opportunities also drive business results.

GA4 adds:

- organic sessions;
- organic users;
- engagement;
- key events / conversions;
- revenue where available;
- organic landing-page performance.

## 8. Overview — action-first dashboard

The Overview page answers “What should I work on today?”

Recommended content order:

1. Ranking Dropped
2. Pages to Improve
3. Important Site Audit Issues
4. Ranking Improved
5. Newly Ranking
6. Search Performance snapshot
7. Organic Performance snapshot when GA4 is connected
8. Site Audit summary
9. Ask SEO shortcut

Do not expose a new mysterious priority score in V1.

### 8.1 Ranking Dropped card

Show:

- URL;
- previous average position;
- current average position;
- position change;
- impressions;
- clicks;
- CTR;
- View Keywords;
- Ask SEO.

### 8.2 Pages to Improve card

In GSC-only mode, candidates are pages with current average position from **4.0 through 20.0 inclusive** and at least one current-period impression. Sort candidates by current-period impressions descending so pages with more observed search visibility appear first.

When GA4 is connected, the existing `SearchOpportunityService` may enrich prioritization with business value. Its production scoring logic remains unchanged.

UI explanation:

> This page already ranks in Google and may have room to move higher.

Do not expose “striking distance,” percentile demand, reachability, or internal scoring components.

### 8.3 Ranking Improved card

Show URLs whose average position improved by at least **1.0 position** versus the comparison period. Within the section, sort by position improvement descending, then current-period impressions descending.

### 8.4 Newly Ranking card

Show pages with current-period GSC impressions greater than zero and no previous-period impressions for the same normalized page key under identical dimensions and filters.

Treat this as a visibility signal, not proof of a precise first ranking date. If result truncation or retrieval limits prevent a reliable previous-period comparison, do not apply the Newly Ranking label.

### 8.5 Performance snapshots

GSC snapshot:

- Clicks
- Impressions
- CTR
- Average Position
- period-over-period change

GA4 snapshot when connected:

- Organic Sessions
- Organic Users
- Key Events
- Revenue where available

If GA4 is not connected, show a small optional connection card instead of a warning.

## 9. Search Opportunities

The page has four simple tabs:

```text
Ranking Improved
Newly Ranking
Ranking Dropped
Pages to Improve
```

Avoid jargon such as “striking distance.”

### 9.1 Default URL table

Core GSC columns:

- URL
- Average Position
- Position Change
- Impressions
- Clicks
- CTR

GA4-connected optional columns:

- Organic Sessions
- Engagement
- Key Events
- Revenue

If GA4 is connected but a specific GSC URL cannot be joined to a GA4 landing page, show the GA4 cells as unavailable (`—` or equivalent), not `0`. A numeric zero is shown only when GA4 actually reports zero for that metric.

### 9.2 Date comparison

Default:

**Last 28 days vs previous 28 days**

Available ranges:

- 7 days
- 28 days
- 3 months

Each range compares with the immediately preceding equivalent period using identical dimensions and filters.

### 9.3 Position-change calculation

For a comparable URL or query:

```text
positionChange = previousAveragePosition - currentAveragePosition
```

Example:

```text
11.4 → 6.8 = +4.6 positions improved
4.8 → 9.1 = -4.3 positions dropped
```

A lower GSC average-position number is better.

Important product wording: this is **GSC average-position movement**, not a dedicated daily rank tracker. Page-level movement can be affected by query mix, device, country, and impression distribution. The query drill-down exists to explain the page-level signal.

### 9.4 Page and query identity

Reuse OpenSEO's existing first-party page normalization/join behavior where available, especially the normalization already used by `SearchOpportunityService`. Do not introduce a second incompatible URL normalization scheme for Search Opportunities.

Current and comparison-period GSC rows must use the same normalized identity rules before movement classification.

### 9.5 Meaningful movement

V1 uses a transparent **1.0-position absolute-change threshold** for Ranking Improved and Ranking Dropped:

- `positionChange >= +1.0` → Ranking Improved;
- `positionChange <= -1.0` → Ranking Dropped;
- `-1.0 < positionChange < +1.0` → treated as stable and omitted from those two movement tabs.

This threshold is only noise control. It is not an SEO score and is not shown as a proprietary ranking model.

### 9.6 Ranking Improved

Definition:

> Pages whose GSC average position improved by at least 1.0 position versus the previous period.

Default sorting:

1. Position Change descending;
2. current-period Impressions descending.

### 9.7 Ranking Dropped

Definition:

> Pages whose GSC average position declined by at least 1.0 position versus the previous period.

Default sorting:

1. Position Change ascending so the largest declines appear first;
2. current-period Impressions descending.

This keeps the rule transparent. The UI may explain that a visible page dropping from 4 → 9 deserves attention, but V1 does not invent or expose a custom risk score.

### 9.8 Newly Ranking

Definition:

> Pages with current-period impressions greater than zero and previous-period impressions equal to zero or absent for the same normalized page key under identical dimensions and filters.

Show:

- URL;
- Average Position;
- Impressions;
- Clicks;
- number of ranking queries where available.

Default sort: current-period Impressions descending.

Do not claim this is the page's exact first ranking date. If the underlying result set is truncated such that previous-period absence cannot be trusted, omit the Newly Ranking classification rather than guess.

### 9.9 Pages to Improve

GSC-only candidates use transparent first-party rules:

- current average position from 4.0 through 20.0 inclusive;
- current-period impressions greater than zero.

Default sort in GSC-only mode: current-period Impressions descending.

When GA4 is connected, reuse the existing `SearchOpportunityService` to enrich prioritization. Its production formula remains unchanged and is not duplicated in the client.

### 9.10 Filters

Keep V1 filters limited:

- date range;
- device;
- country;
- search by URL or keyword.

Sortable columns:

- Position Change
- Average Position
- Impressions
- Clicks
- CTR

### 9.11 URL detail drawer

Clicking a URL opens a right-side drawer so users keep their current table/filter context.

Drawer summary:

- URL;
- previous/current average position;
- position change;
- clicks;
- impressions;
- CTR;
- GA4 metrics when available.

Then show **Keywords for this page** with:

- Keyword
- Average Position
- Previous Position
- Position Change
- Impressions
- Clicks
- CTR

The same 1.0-position movement threshold may be used for movement labels in the query list, while the drawer may still show stable queries for context.

This answers both:

- Which URLs are moving?
- Which queries explain the movement?

## 10. Search Console page

Reuse the existing Search Performance/GSC experience rather than rebuild GSC.

The page remains the deeper evidence view for:

- Clicks
- Impressions
- CTR
- Average Position
- Queries
- Pages
- device/country/date filtering
- export where already supported

Position it in the product as **Search Console**, while Search Opportunities remains the interpreted/actionable layer.

## 11. Analytics page

Analytics answers one question:

> What business results is organic search generating?

It is not a GA4 replacement.

### 11.1 KPI row

Show only organic-search metrics:

- Organic Sessions
- Organic Users
- Engagement Rate
- Key Events
- Revenue where available
- previous-period comparison

### 11.2 Trends

SEO-relevant organic trends only, such as:

- sessions over time;
- key events over time;
- revenue over time where available.

### 11.3 Top Organic Landing Pages

Columns:

- URL
- Sessions
- Users
- Engagement
- Key Events
- Revenue

Landing-page rows should link into the corresponding Search Opportunity URL context when practical.

If GA4 does not provide a metric for the selected property/report, hide the optional column or show it as unavailable. Do not substitute zero for missing data.

### 11.4 Explicit non-goals

Do not add broad GA4 replacement sections such as:

- Paid Search
- Direct
- Referral
- Social
- campaign reporting
- demographics
- attribution modeling
- realtime users

## 12. Ask SEO

Keep the existing OpenSEO agent foundation and present it as **Ask SEO**.

Ask SEO should reason over available first-party sources:

- GSC;
- GA4 when connected;
- Site Audit;
- Project Context.

Suggested questions include:

- Which pages lost rankings?
- Which URLs are improving?
- Which pages should I improve first?
- Why did organic traffic drop?
- Which technical issues matter most?
- Which pages get traffic but few conversions?

### 12.1 Evidence-first answer structure

Where useful, separate:

**What the data shows**

from

**What to check / what to do next**

This prevents an SEO hypothesis from being presented as if GSC or GA4 proved the cause.

### 12.2 Unsupported metrics

In first-party mode, Ask SEO must not invent:

- keyword difficulty;
- external search volume;
- CPC;
- backlink estimates;
- competitor rankings;
- traffic estimates.

If asked, it should explain that those metrics are not available from connected first-party Google data and offer supported alternatives.

### 12.3 Context actions

Rows/cards may include **Ask SEO**. The action should pass the selected URL and visible first-party metrics into the existing agent context so users do not manually copy data.

Optional neutral source labels may show which evidence was used, such as Search Console, Google Analytics, and Site Audit.

## 13. Empty, loading, and error states

### 13.1 No GSC

Redirect to required Search Console onboarding/setup.

### 13.2 No GA4

Show a non-blocking connection state. Do not disable the rest of the product.

### 13.3 No major ranking movement

Example:

> No major position changes found. Your average positions were relatively stable during the selected period. Try another date range.

### 13.4 No audit

Offer to run the first site audit.

### 13.5 Error language

Do not expose internal service terminology such as join failures. Prefer user-facing categories:

- connection issue;
- permission issue;
- no data for selected period;
- API temporarily unavailable.

### 13.6 Data freshness

Where useful, show a small neutral freshness indicator such as:

- `Last updated: 2 hours ago`
- `Search Console data through Aug 28`

Do not imply GSC is real-time.

## 14. Visual system

Use a restrained shadcn-like neutral system:

- near-white / very light gray page background;
- white or soft-gray cards;
- charcoal / near-black primary text;
- graphite / medium-gray secondary text;
- subtle neutral borders;
- charcoal primary buttons;
- gray secondary controls;
- restrained grayscale charts;
- provider logos may remain recognizable while surrounding UI stays neutral.

Do not use:

- gradients;
- neon or saturated KPI cards;
- bright green/red card backgrounds for movement;
- Semrush/Ahrefs-style rainbow dashboard treatment.

Ranking direction is primarily communicated by arrow/icon, label, and typography:

- `↑ Improved 4.7`
- `↓ Dropped 3.8`

Small accessible semantic accents may be used only where necessary for state recognition; the base design stays neutral.

## 15. Existing intelligence boundary

Do not modify the production `SearchOpportunityService` scoring formula as part of this milestone.

Do not:

- change scoring weights;
- duplicate the formula in the client;
- create a second proprietary score;
- replace existing MCP/agent reasoning.

GSC-only position movement is a transparent comparison feature, not a replacement for the existing GA4+GSC opportunity score.

## 16. Testing requirements

### 16.1 Capabilities

Verify in `first_party` mode:

- GSC enabled;
- GA4 enabled;
- Site Audit enabled;
- Search Opportunities enabled;
- Ask SEO enabled;
- paid-provider capabilities disabled.

Verify `full` mode keeps the existing paid-provider capabilities enabled.

### 16.2 Navigation

Verify first-party sidebar includes only the approved first-party destinations and hides all paid-provider destinations plus Saved Keywords.

### 16.3 Route guards

Verify disabled direct routes redirect to Overview with the unavailable message.

### 16.4 GSC activation

Verify:

- no GSC → onboarding/setup required;
- GSC connected → Overview accessible;
- GSC connected + GA4 skipped → Overview accessible.

### 16.5 DataForSEO safety

In `SEO_DATA_MODE=first_party`, rendering the shell/Overview must not:

- trigger DataForSEO setup UX;
- trigger backlink snapshot refresh;
- initiate another paid-provider request.

### 16.6 Position movement

Test:

- `11.4 → 6.8` = `+4.6`, Ranking Improved;
- `4.8 → 9.1` = `-4.3`, Ranking Dropped;
- changes below 1.0 absolute positions are treated as stable for movement tabs;
- missing previous-period data;
- Newly Ranking behavior, including safe handling when previous-period absence is unreliable because of truncation;
- consistent normalized page identity across both periods;
- URL-to-query drill-down;
- 7-day, 28-day, and 3-month comparisons.

### 16.7 GA4 optionality

Verify GSC-only pages render correctly with no GA4 columns or blocking errors, GA4 enrichment appears when connected, and missing joins remain unavailable rather than becoming zero.

### 16.8 Agent boundaries

Verify first-party Ask SEO does not claim unavailable paid-market metrics and preserves evidence-versus-advice language where applicable.

## 17. Implementation scope

This milestone includes:

1. central product capability layer;
2. first-party navigation;
3. paid-route protection;
4. removal of DataForSEO setup UX/background calls in first-party mode;
5. simplified GSC-required / GA4-optional onboarding;
6. action-first Overview;
7. Search Opportunities page;
8. URL-to-keyword right-side drawer;
9. SEO-focused Analytics page;
10. Ask SEO presentation and context actions;
11. neutral shadcn-style visual cleanup for touched product surfaces;
12. automated tests for the above behavior.

## 18. Explicit non-goals

This milestone does not add:

- a new crawler engine;
- a new AI model;
- a new SEO scoring brain;
- a new external SEO provider;
- competitor intelligence;
- a backlink database;
- an external search-volume database;
- a full GA4 replacement;
- a full GSC replacement.

## 19. Success criteria

The milestone is successful when a user can:

1. create a project and connect a verified GSC property;
2. optionally connect GA4 without being blocked if they skip it;
3. land on an action-first Overview with no DataForSEO setup pressure;
4. see which URLs improved, dropped, newly appeared, or are worth improving using familiar GSC metrics;
5. open a URL and understand which queries explain its movement;
6. inspect deeper GSC evidence in Search Console;
7. inspect organic business outcomes in Analytics when GA4 is connected;
8. run/view Site Audit information;
9. ask the existing OpenSEO agent questions about the user's first-party SEO data;
10. never encounter a normal first-party UI path that attempts paid-provider execution.

## 20. Written-spec review gate

This document captures the approved product design. No implementation plan or production code should be started until the user reviews and approves this written specification.
