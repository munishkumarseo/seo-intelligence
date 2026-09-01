import { z } from "zod";
import {
  GSC_DEVICES,
  SEARCH_PERFORMANCE_RANGES,
} from "@/types/schemas/search-performance";

export const SEARCH_OPPORTUNITY_TABS = [
  "improved",
  "new",
  "dropped",
  "improve",
] as const;

const searchOpportunityFilterShape = {
  dateRange: z.enum(SEARCH_PERFORMANCE_RANGES).default("last_28_days"),
  device: z.enum(GSC_DEVICES).optional(),
  country: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toLowerCase())
    .optional(),
};

export const searchOpportunitiesInputSchema = z.object({
  ...searchOpportunityFilterShape,
  tab: z.enum(SEARCH_OPPORTUNITY_TABS),
  search: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(100).default(100),
});

export const searchOpportunityQueriesInputSchema = z.object({
  ...searchOpportunityFilterShape,
  page: z.string().trim().min(1),
});

export type SearchOpportunitiesInput = z.infer<
  typeof searchOpportunitiesInputSchema
>;
export type SearchOpportunityQueriesInput = z.infer<
  typeof searchOpportunityQueriesInputSchema
>;
