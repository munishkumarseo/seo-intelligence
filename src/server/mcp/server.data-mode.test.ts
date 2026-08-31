import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  registered: [] as string[],
  serverOptions: [] as Array<{ instructions?: string } | undefined>,
  tool: (name: string) => ({
    name,
    config: { inputSchema: {} },
    handler: vi.fn(),
  }),
}));

vi.mock("@modelcontextprotocol/server", () => ({
  McpServer: class {
    constructor(_info: unknown, options?: { instructions?: string }) {
      mocks.serverOptions.push(options);
    }
    registerTool(name: string) {
      mocks.registered.push(name);
    }
  },
}));

vi.mock("@/server/mcp/context", () => ({
  createMcpToolContext: vi.fn(),
}));
vi.mock("@/server/mcp/output-schemas", () => ({
  objectSchema: (value: unknown) => value ?? {},
}));
vi.mock("@/server/mcp/instrumentation", () => ({
  instrumentMcpToolHandler: (_name: string, _schema: unknown, handler: unknown) =>
    handler,
}));

vi.mock("@/server/mcp/tools/get-backlinks-overview", () => ({
  getBacklinksOverviewTool: mocks.tool("get_backlinks_overview"),
}));
vi.mock("@/server/mcp/tools/get-backlinks-profile", () => ({
  getBacklinksProfileTool: mocks.tool("get_backlinks_profile"),
}));
vi.mock("@/server/mcp/tools/get-domain-keyword-suggestions", () => ({
  getDomainKeywordSuggestionsTool: mocks.tool("get_domain_keyword_suggestions"),
}));
vi.mock("@/server/mcp/tools/get-domain-overview", () => ({
  getDomainOverviewTool: mocks.tool("get_domain_overview"),
}));
vi.mock("@/server/mcp/tools/add-rank-tracking-keywords", () => ({
  addRankTrackingKeywordsTool: mocks.tool("add_rank_tracking_keywords"),
}));
vi.mock("@/server/mcp/tools/create-rank-tracker", () => ({
  createRankTrackerTool: mocks.tool("create_rank_tracker"),
}));
vi.mock("@/server/mcp/tools/estimate-rank-tracker-cost", () => ({
  estimateRankTrackerCostTool: mocks.tool("estimate_rank_tracker_cost"),
}));
vi.mock("@/server/mcp/tools/get-rank-tracker", () => ({
  getRankTrackerTool: mocks.tool("get_rank_tracker"),
}));
vi.mock("@/server/mcp/tools/remove-rank-tracking-keywords", () => ({
  removeRankTrackingKeywordsTool: mocks.tool("remove_rank_tracking_keywords"),
}));
vi.mock("@/server/mcp/tools/run-rank-tracker", () => ({
  runRankTrackerTool: mocks.tool("run_rank_tracker"),
}));
vi.mock("@/server/mcp/tools/get-serp-results", () => ({
  getSerpResultsTool: mocks.tool("get_serp_results"),
}));
vi.mock("@/server/mcp/tools/google-analytics-tools", () => ({
  getGoogleAnalyticsAudienceBreakdownTool: mocks.tool(
    "get_google_analytics_audience_breakdown",
  ),
  getGoogleAnalyticsEcommercePerformanceTool: mocks.tool(
    "get_google_analytics_ecommerce_performance",
  ),
  getGoogleAnalyticsKeyEventsTool: mocks.tool("get_google_analytics_key_events"),
  getGoogleAnalyticsMeasurementHealthTool: mocks.tool(
    "get_google_analytics_measurement_health",
  ),
  getGoogleAnalyticsOrganicLandingPagesTool: mocks.tool(
    "get_google_analytics_organic_landing_pages",
  ),
  getGoogleAnalyticsOrganicOverviewTool: mocks.tool(
    "get_google_analytics_organic_overview",
  ),
  getGoogleAnalyticsPagePerformanceTool: mocks.tool(
    "get_google_analytics_page_performance",
  ),
  getGoogleAnalyticsSiteSearchTool: mocks.tool("get_google_analytics_site_search"),
  getGoogleAnalyticsTrafficAcquisitionTool: mocks.tool(
    "get_google_analytics_traffic_acquisition",
  ),
  getSearchOpportunitiesTool: mocks.tool("get_search_opportunities"),
}));
vi.mock("@/server/mcp/tools/create-project", () => ({
  createProjectTool: mocks.tool("create_project"),
}));
vi.mock("@/server/mcp/tools/list-projects", () => ({
  listProjectsTool: mocks.tool("list_projects"),
}));
vi.mock("@/server/mcp/tools/project-context", () => ({
  getProjectContextTool: mocks.tool("get_project_context"),
  updateProjectContextTool: mocks.tool("update_project_context"),
}));
vi.mock("@/server/mcp/tools/list-saved-keywords", () => ({
  listSavedKeywordsTool: mocks.tool("list_saved_keywords"),
}));
vi.mock("@/server/mcp/tools/dataforseo-research-tools", () => ({
  findSerpCompetitorsTool: mocks.tool("find_serp_competitors"),
  getGoogleBusinessQuestionsTool: mocks.tool("get_google_business_questions"),
  getKeywordMetricsTool: mocks.tool("get_keyword_metrics"),
  getLocalSerpResultsTool: mocks.tool("get_local_serp_results"),
  getRankedKeywordsTool: mocks.tool("get_ranked_keywords"),
  searchLocalBusinessesTool: mocks.tool("search_local_businesses"),
}));
vi.mock("@/server/mcp/tools/local-seo-tools", () => ({
  getBusinessProfileTool: mocks.tool("get_business_profile"),
  getBusinessReviewsTool: mocks.tool("get_business_reviews"),
  getBusinessUpdatesTool: mocks.tool("get_business_updates"),
  getLocalRankGridTool: mocks.tool("get_local_rank_grid"),
  listBusinessCategoriesTool: mocks.tool("list_business_categories"),
}));
vi.mock("@/server/mcp/tools/research-keywords", () => ({
  researchKeywordsTool: mocks.tool("research_keywords"),
}));
vi.mock("@/server/mcp/tools/save-keywords", () => ({
  saveKeywordsTool: mocks.tool("save_keywords"),
}));
vi.mock("@/server/mcp/tools/search-console-tools", () => ({
  getSearchConsolePerformanceTool: mocks.tool("get_search_console_performance"),
  inspectUrlsTool: mocks.tool("inspect_urls"),
}));
vi.mock("@/server/mcp/tools/site-audit-tools", () => ({
  getAuditIssuesTool: mocks.tool("get_audit_issues"),
  getAuditPagesTool: mocks.tool("get_audit_pages"),
  getAuditStatusTool: mocks.tool("get_audit_status"),
  runSiteAuditTool: mocks.tool("run_site_audit"),
}));
vi.mock("@/server/mcp/tools/whoami", () => ({
  whoamiTool: mocks.tool("whoami"),
}));

import { createOpenSeoMcpServer } from "@/server/mcp/server";

const authProps = {} as never;

beforeEach(() => {
  mocks.registered.length = 0;
  mocks.serverOptions.length = 0;
});

describe("OpenSEO MCP data-mode registration", () => {
  it("registers first-party evidence tools and excludes paid-provider tools", () => {
    createOpenSeoMcpServer(authProps, { seoDataMode: "first_party" });

    expect(mocks.registered).toEqual(
      expect.arrayContaining([
        "get_search_console_performance",
        "inspect_urls",
        "get_search_opportunities",
        "run_site_audit",
        "get_project_context",
      ]),
    );
    expect(mocks.registered).not.toEqual(
      expect.arrayContaining([
        "research_keywords",
        "get_keyword_metrics",
        "get_serp_results",
        "get_backlinks_profile",
        "create_rank_tracker",
      ]),
    );
    expect(mocks.serverOptions[0]?.instructions).toContain(
      "Do not invent unavailable market-wide keyword, backlink, or SERP metrics.",
    );
  });

  it("retains paid-provider tools in full compatibility mode", () => {
    createOpenSeoMcpServer(authProps, { seoDataMode: "full" });

    expect(mocks.registered).toEqual(
      expect.arrayContaining([
        "research_keywords",
        "get_keyword_metrics",
        "get_serp_results",
        "get_backlinks_profile",
        "create_rank_tracker",
      ]),
    );
  });
});
