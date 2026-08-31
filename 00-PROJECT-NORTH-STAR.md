# OpenSEO First-Party SEO Intelligence — Project North Star

## Goal

Build an SEO intelligence product using OpenSEO as the foundation.

The product must help an SEO executive understand first-party Google data and decide what to do next.

## Core Product Statement

> Google Search Console and Google Analytics 4 remain the source of truth. Our product is the interpretation, prioritization, and action layer on top of them.

## Primary Users

SEO executives and practitioners who already use GSC and/or GA4 and need clearer priorities, explanations, and actionable opportunities without being forced to purchase paid SEO-data APIs.

## Hard Constraint

The core product must work without requiring the user to pay for DataForSEO, Ahrefs API, Semrush API, paid SERP APIs, paid backlink APIs, or paid keyword databases.

## Core Data Sources

- Google Search Console
- Google Analytics 4
- first-party site audit / crawler data produced by the product

## Backend Decision

Use OpenSEO's existing backend. Do not create a second backend.

Keep using OpenSEO for auth, projects/workspaces, database access, Google OAuth, GSC, GA4, MCP tools, agent infrastructure, site audit, and existing first-party opportunity logic.

## Intelligence Decision

Preserve OpenSEO's existing intelligence initially. Do not replace existing scoring/reasoning simply because a different formula seems attractive.

Any future intelligence change must identify current behavior, show the problem, provide evidence, add regression tests, and receive explicit approval.

## Product Data Flow

```text
Google Search Console
        +
Google Analytics 4
        +
First-party Site Audit
        ↓
Existing OpenSEO Backend
        ↓
Existing OpenSEO Services / MCP Tools
        ↓
Existing OpenSEO Intelligence
        ↓
Agent / Explanation Layer
        ↓
SEO Executive UI
```

## Positioning

V1 is not a free Semrush or Ahrefs clone.

Preferred positioning:

> Turn Search Console and Analytics into SEO actions.

> SEO intelligence built on your own Google data.
