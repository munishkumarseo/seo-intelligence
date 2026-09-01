import { queryOptions } from "@tanstack/react-query";
import { getProductCapabilities } from "@/serverFunctions/config";

export const productCapabilitiesQueryOptions = () =>
  queryOptions({
    queryKey: ["productCapabilities"],
    queryFn: () => getProductCapabilities(),
    staleTime: Infinity,
  });
