import {
  Bookmark,
  Bot,
  ClipboardCheck,
  Globe,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { linkOptions } from "@tanstack/react-router";
import { GoogleGlyphMuted } from "@/client/features/gsc/GoogleGlyph";
import type { ProductCapabilities } from "@/shared/product-capabilities";

const projectNavItems = [
  {
    to: "/p/$projectId" as const,
    label: "Dashboard",
    icon: LayoutDashboard,
    // Without exact matching, the index path is a prefix of every project
    // route and the Dashboard item would render active everywhere.
    activeOptions: { exact: true, includeSearch: false },
  },
  {
    to: "/p/$projectId/keywords" as const,
    label: "Keyword Research",
    icon: Search,
  },
  {
    to: "/p/$projectId/saved" as const,
    label: "Saved Keywords",
    icon: Bookmark,
  },
  {
    to: "/p/$projectId/rank-tracking" as const,
    label: "Rank Tracking",
    icon: TrendingUp,
  },
  {
    to: "/p/$projectId/search-performance" as const,
    label: "GSC Insights",
    icon: GoogleGlyphMuted,
  },
  {
    to: "/p/$projectId/domain" as const,
    label: "Domain Overview",
    icon: Globe,
  },
  {
    to: "/p/$projectId/backlinks" as const,
    label: "Backlinks",
    icon: Link2,
  },
  {
    to: "/p/$projectId/audit" as const,
    label: "Site Audit",
    icon: ClipboardCheck,
  },
  {
    to: "/p/$projectId/brand-lookup" as const,
    label: "Brand Lookup",
    icon: Sparkles,
  },
  {
    to: "/p/$projectId/prompt-explorer" as const,
    label: "Prompt Explorer",
    icon: MessageSquare,
  },
] as const;

const firstPartyProjectNavItems = [
  {
    to: "/p/$projectId" as const,
    label: "Overview",
    icon: LayoutDashboard,
    activeOptions: { exact: true, includeSearch: false },
  },
  {
    to: "/p/$projectId/search-opportunities" as const,
    label: "Search Opportunities",
    icon: TrendingUp,
  },
  {
    to: "/p/$projectId/search-performance" as const,
    label: "Search Console",
    icon: GoogleGlyphMuted,
  },
  {
    to: "/p/$projectId/analytics" as const,
    label: "Analytics",
    icon: Globe,
  },
  {
    to: "/p/$projectId/audit" as const,
    label: "Site Audit",
    icon: ClipboardCheck,
  },
  {
    to: "/p/$projectId/sam" as const,
    label: "Ask SEO",
    icon: Bot,
  },
] as const;

const aiNavItem = linkOptions({
  to: "/ai" as const,
  label: "AI & MCP",
  icon: Bot,
});

// Always-visible sidebar group for full mode. First-party mode exposes the
// existing SAM experience directly as Ask SEO instead of a second AI entry.
export const connectNavGroup = {
  label: "Connect",
  items: [aiNavItem],
};

function getProjectNavItems(projectId: string) {
  return linkOptions(
    projectNavItems.map((item) => ({
      ...item,
      params: { projectId },
      search: {},
    })),
  );
}

function getFirstPartyProjectNavItems(projectId: string) {
  return firstPartyProjectNavItems.map((item) => ({
    ...item,
    params: { projectId },
    search: {},
  }));
}

// Full mode keeps OpenSEO's existing information architecture. First-party
// mode intentionally presents one compact action-oriented workspace and hides
// all paid-provider destinations.
export function getProjectNavGroups(
  projectId: string,
  capabilities: ProductCapabilities,
) {
  if (capabilities.dataMode === "first_party") {
    return [
      {
        label: "SEO Workspace",
        items: getFirstPartyProjectNavItems(projectId),
      },
    ];
  }

  const all = getProjectNavItems(projectId);
  const byPath = (path: (typeof projectNavItems)[number]["to"]) =>
    all.find((i) => i.to === path)!;

  return [
    {
      label: "Overview",
      items: [byPath("/p/$projectId")],
    },
    {
      label: "Research",
      items: [
        byPath("/p/$projectId/keywords"),
        byPath("/p/$projectId/domain"),
        byPath("/p/$projectId/backlinks"),
        byPath("/p/$projectId/brand-lookup"),
        byPath("/p/$projectId/prompt-explorer"),
      ],
    },
    {
      label: "My Site",
      items: [
        byPath("/p/$projectId/search-performance"),
        byPath("/p/$projectId/rank-tracking"),
        byPath("/p/$projectId/saved"),
        byPath("/p/$projectId/audit"),
      ],
    },
  ];
}

export const dataforseoHelpLinkOptions = linkOptions({
  to: "/help/dataforseo-api-key",
});
