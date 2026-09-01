import { createFileRoute } from "@tanstack/react-router";
import { SearchOpportunitiesPage } from "@/client/features/search-opportunities/SearchOpportunitiesPage";

export const Route = createFileRoute(
  "/_project/p/$projectId/search-opportunities",
)({
  component: SearchOpportunitiesRoute,
});

function SearchOpportunitiesRoute() {
  const { projectId } = Route.useParams();
  return <SearchOpportunitiesPage projectId={projectId} />;
}
