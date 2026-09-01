import {
  Outlet,
  createFileRoute,
  useLocation,
  useMatch,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { setLastProjectId } from "@/client/lib/active-project";
import { useHostedAuthRouteGuard } from "@/client/features/auth/useHostedAuthRouteGuard";
import { FreePlanBanner } from "@/client/features/billing/FreePlanBanner";
import { useOnboardingRedirect } from "@/client/features/onboarding/useOnboardingRedirect";
import { productCapabilitiesQueryOptions } from "@/client/features/product/productCapabilitiesQuery";
import { getProjectRouteDecision } from "@/client/navigation/routeAccess";
import { getErrorCode } from "@/client/lib/error-messages";
import { AuthenticatedAppLayout } from "@/client/layout/AppShell";
import {
  getCurrentAuthRedirectFromHref,
  getSignInSearch,
} from "@/lib/auth-redirect";
import { getGscConnection } from "@/serverFunctions/gsc";
import { getProjectAccess } from "@/serverFunctions/projects";

export const Route = createFileRoute("/_project/p/$projectId")({
  // Everything under this subtree fetches its data client-side with
  // react-query, so SSR would only render empty chrome.
  ssr: false,
  component: ProjectLayout,
});

// Redirect-only guard, deliberately NOT a blocking beforeLoad: the shell
// renders immediately while the access check runs in the background, and the
// browser only gets bounced if it lands on a project it can't see (stale
// last-project id, foreign URL). Real authorization is enforced on every data
// call; nothing sensitive renders from this check.
function useProjectAccessRedirect(projectId: string) {
  const navigate = useNavigate();
  const access = useQuery({
    queryKey: ["projectAccess", projectId],
    queryFn: () => getProjectAccess({ data: { projectId } }),
    // A failed check redirects away — retrying would just delay it.
    retry: false,
    // One check per project per tab; a revoked project still dead-ends at
    // every data call, so there's nothing to re-validate here.
    staleTime: Infinity,
  });
  const error = access.error;
  useEffect(() => {
    if (!error) return;
    if (getErrorCode(error) === "UNAUTHENTICATED") {
      void navigate({
        to: "/sign-in",
        search: getSignInSearch(
          getCurrentAuthRedirectFromHref(window.location.href),
        ),
        replace: true,
      });
      return;
    }
    void navigate({ to: "/", replace: true });
  }, [error, navigate]);
}

function useProductRouteRedirect(projectId: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const capabilitiesQuery = useQuery(productCapabilitiesQueryOptions());
  const capabilities = capabilitiesQuery.data;
  const needsGscState = capabilities?.dataMode === "first_party";
  const gscQuery = useQuery({
    queryKey: ["gscConnection", projectId],
    queryFn: () => getGscConnection({ data: { projectId } }),
    enabled: needsGscState,
    retry: false,
  });

  useEffect(() => {
    if (!capabilities) return;
    if (capabilities.dataMode === "first_party" && !gscQuery.isSuccess) return;

    const decision = getProjectRouteDecision(
      location.pathname,
      capabilities,
      Boolean(gscQuery.data?.connected),
    );

    if (decision.kind === "redirect-overview") {
      toast.info("This feature isn't available in first-party mode.");
      void navigate({
        to: "/p/$projectId",
        params: { projectId },
        replace: true,
      });
      return;
    }

    if (decision.kind === "redirect-gsc-setup") {
      void navigate({
        to: "/p/$projectId/settings/integrations",
        params: { projectId },
        replace: true,
      });
    }
  }, [
    capabilities,
    gscQuery.data?.connected,
    gscQuery.isSuccess,
    location.pathname,
    navigate,
    projectId,
  ]);
}

function ProjectLayout() {
  const { projectId } = Route.useParams();
  const authGate = useHostedAuthRouteGuard();
  useOnboardingRedirect();
  useProjectAccessRedirect(projectId);
  useProductRouteRedirect(projectId);

  // Remember this as the last-visited project for the landing redirect.
  // Settings and its sub-pages are excluded: editing another project's
  // settings is administration, not a context switch, so it shouldn't change
  // which project the app opens next time. (An explicit choice still counts:
  // the switcher and project creation set it themselves, settings page or not.)
  const isSettingsPage =
    useMatch({
      from: "/_project/p/$projectId/settings",
      shouldThrow: false,
      select: () => true,
    }) ?? false;
  useEffect(() => {
    if (isSettingsPage) return;
    setLastProjectId(projectId);
  }, [projectId, isSettingsPage]);

  if (!authGate.canRenderAuthenticatedContent) {
    return null;
  }

  return (
    <AuthenticatedAppLayout
      projectId={projectId}
      banner={authGate.isHostedMode ? <FreePlanBanner /> : undefined}
    >
      <Outlet />
    </AuthenticatedAppLayout>
  );
}
