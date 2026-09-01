import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getProductCapabilitiesForMode } from "@/shared/product-capabilities";
import { resolveSeoDataMode } from "@/shared/seo-data-mode";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

export const getProductCapabilities = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(() =>
    getProductCapabilitiesForMode(resolveSeoDataMode(env.SEO_DATA_MODE)),
  );

export const getSeoApiKeyStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(() => {
    const configured = Boolean(env.DATAFORSEO_API_KEY?.trim());
    return { configured };
  });
