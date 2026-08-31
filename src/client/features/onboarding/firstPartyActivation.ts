type FirstPartyActivationStep = "gsc" | "ga4" | "complete";
export type Ga4ActivationChoice = "undecided" | "connect" | "skipped";

export function getFirstPartyActivationStep({
  hasGscProperty,
  ga4Choice,
  hasGa4Property,
}: {
  hasGscProperty: boolean;
  ga4Choice: Ga4ActivationChoice;
  hasGa4Property: boolean;
}): FirstPartyActivationStep {
  if (!hasGscProperty) return "gsc";
  if (hasGa4Property || ga4Choice === "skipped") return "complete";
  return "ga4";
}
