import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GoogleAnalyticsConnectionCard } from "@/client/features/ga4/GoogleAnalyticsConnectionCard";
import { SearchConsoleConnectionCard } from "@/client/features/gsc/SearchConsoleConnectionCard";
import {
  getFirstPartyActivationStep,
  type Ga4ActivationChoice,
} from "@/client/features/onboarding/firstPartyActivation";
import { getGa4Connection } from "@/serverFunctions/ga4";
import { getGscConnection } from "@/serverFunctions/gsc";
import { getProjects } from "@/serverFunctions/projects";

export function FirstPartyActivation({
  onboardingCompleted,
  onComplete,
  isCompleting,
  accountMenu,
}: {
  onboardingCompleted: boolean;
  onComplete: (projectId: string) => void;
  isCompleting: boolean;
  accountMenu: ReactNode;
}) {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });
  const project = projectsQuery.data?.[0];
  const projectId = project?.id;
  const [ga4Choice, setGa4Choice] = useState<Ga4ActivationChoice>(
    onboardingCompleted ? "skipped" : "undecided",
  );
  const completionRequested = useRef(false);

  const gscConnectionQuery = useQuery({
    queryKey: ["gscConnection", projectId],
    queryFn: () => getGscConnection({ data: { projectId: projectId! } }),
    enabled: Boolean(projectId),
  });
  const ga4ConnectionQuery = useQuery({
    queryKey: ["ga4Connection", projectId],
    queryFn: () => getGa4Connection({ data: { projectId: projectId! } }),
    enabled: Boolean(projectId),
  });

  const step = getFirstPartyActivationStep({
    hasGscProperty: Boolean(gscConnectionQuery.data?.connected),
    ga4Choice,
    hasGa4Property: Boolean(ga4ConnectionQuery.data?.connected),
  });

  useEffect(() => {
    if (step !== "complete" || !projectId || completionRequested.current) {
      return;
    }
    completionRequested.current = true;
    onComplete(projectId);
  }, [onComplete, projectId, step]);

  if (projectsQuery.isLoading || !projectId) {
    return (
      <ActivationFrame accountMenu={accountMenu}>
        <div className="flex items-center justify-center py-12 text-sm text-base-content/55">
          <span className="loading loading-spinner loading-sm mr-2" />
          Preparing your SEO workspace…
        </div>
      </ActivationFrame>
    );
  }

  if (step === "gsc") {
    return (
      <ActivationFrame accountMenu={accountMenu} stepLabel="Step 1 of 2">
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Connect Search Console</h2>
            <p className="mt-2 text-sm leading-relaxed text-base-content/65">
              Search Console is the required first-party source. It gives us
              Clicks, Impressions, CTR, Average Position, Position Changes, and
              the evidence used to surface Search Opportunities.
            </p>
          </div>
          <SearchConsoleConnectionCard projectId={projectId} />
          <p className="text-xs leading-relaxed text-base-content/50">
            Select a verified property to continue. We use Google&apos;s own
            data as the source of truth.
          </p>
        </div>
      </ActivationFrame>
    );
  }

  if (step === "ga4") {
    return (
      <ActivationFrame accountMenu={accountMenu} stepLabel="Step 2 of 2">
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Add Google Analytics</h2>
              <span className="badge badge-ghost badge-sm">Recommended</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-base-content/65">
              GA4 adds Organic Sessions, Engagement, Key Events/Conversions,
              Revenue, and Landing Page outcomes so opportunities can reflect
              business value as well as search demand.
            </p>
          </div>
          <GoogleAnalyticsConnectionCard projectId={projectId} />
          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={isCompleting}
              onClick={() => setGa4Choice("skipped")}
            >
              Skip for now
            </button>
          </div>
        </div>
      </ActivationFrame>
    );
  }

  return (
    <ActivationFrame accountMenu={accountMenu}>
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <h2 className="text-lg font-semibold">Your SEO workspace is ready</h2>
        <p className="text-sm text-base-content/60">
          Opening your first-party Overview…
        </p>
        {isCompleting ? (
          <span className="loading loading-spinner loading-sm" />
        ) : null}
      </div>
    </ActivationFrame>
  );
}

function ActivationFrame({
  accountMenu,
  stepLabel,
  children,
}: {
  accountMenu: ReactNode;
  stepLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      {accountMenu}
      <div className="space-y-3 text-center">
        <img
          src="/transparent-logo.png"
          alt="OpenSEO"
          className="mx-auto size-10 rounded-lg"
        />
        {stepLabel ? (
          <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">
            {stepLabel}
          </p>
        ) : null}
        <h1 className="text-xl font-semibold">Connect your Google SEO data</h1>
        <p className="text-sm text-base-content/60">
          Start with Search Console. Add Analytics when you want richer
          business-value context.
        </p>
      </div>
      <div className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
        {children}
      </div>
    </div>
  );
}
