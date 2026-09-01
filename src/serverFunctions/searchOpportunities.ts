import { createServerFn } from "@tanstack/react-start";
import { SearchOpportunitiesPageService } from "@/server/features/gsc/services/SearchOpportunitiesPageService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { searchOpportunitiesInputSchema } from "@/types/schemas/search-opportunities";

/**
 * Authenticated, project-scoped Search Opportunities API. The middleware is the
 * authorization boundary; the service uses only GSC and optional GA4 evidence.
 */
export const getSearchOpportunitiesReport = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(searchOpportunitiesInputSchema)
  .handler(({ data, context }) =>
    SearchOpportunitiesPageService.getReport({
      ...data,
      projectId: context.projectId,
    }),
  );
