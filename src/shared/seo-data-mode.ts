export const SEO_DATA_MODES = ["first_party", "full"] as const;

export type SeoDataMode = (typeof SEO_DATA_MODES)[number];

export function resolveSeoDataMode(
  value: string | undefined,
): SeoDataMode {
  const normalized = value?.trim();

  if (!normalized || normalized === "first_party") {
    return "first_party";
  }

  if (normalized === "full") {
    return "full";
  }

  throw new Error(
    `Invalid SEO_DATA_MODE "${normalized}". Expected first_party or full.`,
  );
}

export function isPaidSeoDataEnabled(mode: SeoDataMode): boolean {
  return mode === "full";
}
