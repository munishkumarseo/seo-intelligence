import { z } from "zod";
import { SEARCH_PERFORMANCE_RANGES } from "@/types/schemas/search-performance";

export const SEARCH_OPPORTUNITIES_DEFAULT_LIMIT = 50;
export const SEARCH_OPPORTUNITIES_MAX_LIMIT = 100;

const optionalSearchSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => (value ? value : undefined));

export const searchOpportunitiesInputSchema = z.object({
  projectId: z.string().min(1),
  dateRange: z.enum(SEARCH_PERFORMANCE_RANGES).default("last_28_days"),
  search: optionalSearchSchema,
  limit: z
    .number()
    .int()
    .min(1)
    .max(SEARCH_OPPORTUNITIES_MAX_LIMIT)
    .default(SEARCH_OPPORTUNITIES_DEFAULT_LIMIT),
});

export type SearchOpportunitiesInput = z.infer<
  typeof searchOpportunitiesInputSchema
>;
