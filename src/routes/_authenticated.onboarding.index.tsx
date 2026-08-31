import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FirstPartyActivation } from "@/client/features/onboarding/FirstPartyActivation";
import { OnboardingAccountMenu } from "@/client/features/onboarding/OnboardingAccountMenu";
import { PostSignupOnboarding } from "@/client/features/onboarding/PostSignupOnboarding";
import {
  buildOnboardingPayload,
  ONBOARDING_LAST_STEP,
  type OnboardingAnswers,
  onboardingAnswersQueryOptions,
  restoreOnboardingAnswers,
} from "@/client/features/onboarding/onboardingModel";
import { productCapabilitiesQueryOptions } from "@/client/features/product/productCapabilitiesQuery";
import { captureClientEvent } from "@/client/lib/posthog";
import { queryClient } from "@/client/tanstack-db";
import { useSession } from "@/lib/auth-client";
import { saveOnboardingAnswers } from "@/serverFunctions/onboarding";

const ONBOARDING_EXISTING_USER_CUTOFF = "2026-05-27T00:00:00.000Z";

const clampStep = (step: number) =>
  Math.min(Math.max(0, Math.trunc(step)), ONBOARDING_LAST_STEP);

export const Route = createFileRoute("/_authenticated/onboarding/")({
  // The app renders inside ClientOnly, and this guard reads account-scoped data
  // through a module-scoped query client. Keep it out of server requests so one
  // worker isolate cannot reuse another account's cached onboarding state.
  ssr: false,
  // Step lives in the URL so it survives refresh and works with back/forward.
  validateSearch: (search: Record<string, unknown>): { step: number } => {
    const raw = Number(search.step);
    return { step: Number.isFinite(raw) ? clampStep(raw) : 0 };
  },
  beforeLoad: async () => {
    const [data, capabilities] = await Promise.all([
      queryClient.ensureQueryData(onboardingAnswersQueryOptions()),
      queryClient.ensureQueryData(productCapabilitiesQueryOptions()),
    ]);

    // Full mode keeps the existing completed-onboarding behavior. First-party
    // mode still enters activation so a selected GSC property can be enforced
    // even for accounts that completed the legacy questionnaire previously.
    if (data.completedAt && capabilities.dataMode === "full") {
      throw redirect({ to: "/", replace: true });
    }
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { data: session } = useSession();
  const onboardingQuery = useQuery(onboardingAnswersQueryOptions());
  const capabilitiesQuery = useQuery(productCapabilitiesQueryOptions());

  if (!onboardingQuery.data || !capabilitiesQuery.data) {
    return null;
  }

  const initialAnswers = restoreOnboardingAnswers(onboardingQuery.data.answers);

  if (capabilitiesQuery.data.dataMode === "first_party") {
    return (
      <FirstPartyOnboardingFlow
        onboardingCompleted={Boolean(onboardingQuery.data.completedAt)}
        initialAnswers={initialAnswers}
        email={session?.user?.email}
      />
    );
  }

  const userCreatedAt = onboardingQuery.data.userCreatedAt
    ? Date.parse(onboardingQuery.data.userCreatedAt)
    : Date.now();
  const isExistingUser =
    userCreatedAt < Date.parse(ONBOARDING_EXISTING_USER_CUTOFF);
  const firstName = session?.user?.name?.split(" ")[0] || "";

  return (
    <OnboardingFlow
      firstName={firstName}
      isExistingUser={isExistingUser}
      initialAnswers={initialAnswers}
      email={session?.user?.email}
    />
  );
}

function FirstPartyOnboardingFlow({
  onboardingCompleted,
  initialAnswers,
  email,
}: {
  onboardingCompleted: boolean;
  initialAnswers: OnboardingAnswers;
  email: string | undefined;
}) {
  const navigate = useNavigate();
  const saveMutation = useMutation({
    mutationFn: () =>
      saveOnboardingAnswers({
        data: buildOnboardingPayload(initialAnswers, ONBOARDING_LAST_STEP, {
          completed: true,
        }),
      }),
    onError: (error) => {
      console.error("Failed to complete first-party activation", error);
    },
  });

  const handleComplete = async (projectId: string) => {
    if (!onboardingCompleted) {
      try {
        await saveMutation.mutateAsync();
        await queryClient.invalidateQueries({
          queryKey: ["onboardingAnswers"],
        });
      } catch {
        // The connection state is already saved by the Google integrations.
        // Do not strand the user on activation if the profile write fails.
      }
    }

    captureClientEvent("onboarding:completed", {
      data_mode: "first_party",
    });
    void navigate({
      to: "/p/$projectId",
      params: { projectId },
      replace: true,
    });
  };

  return (
    <FirstPartyActivation
      onboardingCompleted={onboardingCompleted}
      onComplete={(projectId) => void handleComplete(projectId)}
      isCompleting={saveMutation.isPending}
      accountMenu={<OnboardingAccountMenu email={email} />}
    />
  );
}

function OnboardingFlow({
  firstName,
  isExistingUser,
  initialAnswers,
  email,
}: {
  firstName: string;
  isExistingUser: boolean;
  initialAnswers: OnboardingAnswers;
  email: string | undefined;
}) {
  const navigate = useNavigate();
  const { step } = Route.useSearch();
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers);

  const saveMutation = useMutation({
    mutationFn: (extra: { completed?: boolean }) =>
      saveOnboardingAnswers({
        data: buildOnboardingPayload(answers, step, extra),
      }),
    onError: (error) => {
      console.error("Failed to save onboarding answers", error);
    },
  });

  const goToStep = (next: number) =>
    void navigate({ to: "/onboarding", search: { step: clampStep(next) } });

  const handleNext = () => {
    if (step === 0) {
      captureClientEvent("onboarding:interests_selected", {
        interests: answers.selectedInterests,
        interest_other: answers.interestOther.trim() || undefined,
      });
    }
    saveMutation.mutate({});
    goToStep(step + 1);
  };

  const handleSkip = () => {
    saveMutation.mutate({});
    captureClientEvent("onboarding:step_skipped", { step });
    goToStep(step + 1);
  };

  const handleFinish = async () => {
    try {
      await saveMutation.mutateAsync({ completed: true });
      // Refresh the shared cache so the destination's onboarding-redirect guard
      // sees the completed state and doesn't bounce the user back here.
      await queryClient.invalidateQueries({ queryKey: ["onboardingAnswers"] });
    } catch {
      // Already logged by the mutation's onError; still navigate the user on.
    }
    captureClientEvent("onboarding:completed", {
      interests: answers.selectedInterests,
      work_for: answers.workFor,
      source: answers.source,
    });
    // The dashboard's onboarding checklist owns MCP coaching now.
    void navigate({ to: "/", replace: true });
  };

  return (
    <PostSignupOnboarding
      firstName={firstName}
      title={isExistingUser ? "Tell us about your work" : undefined}
      helperText={
        isExistingUser
          ? "A little context helps us decide where to focus. You can also reach me anytime at ben@openseo.so."
          : undefined
      }
      step={step}
      answers={answers}
      onAnswersChange={setAnswers}
      onNext={handleNext}
      onBack={() => goToStep(step - 1)}
      onSkip={handleSkip}
      onFinish={handleFinish}
      isSaving={saveMutation.isPending}
      accountMenu={<OnboardingAccountMenu email={email} />}
    />
  );
}
