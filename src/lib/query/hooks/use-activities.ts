"use client";

import { useQuery } from "@tanstack/react-query";
import { getActivity, listActivities, type ListActivitiesParams } from "@/lib/api/activities";
import { queryKeys } from "@/lib/query/keys";

export function useActivities(params: ListActivitiesParams = {}, enabled = true) {
  return useQuery({
    queryKey: queryKeys.activities.list(params),
    queryFn: () => listActivities(params),
    enabled,
  });
}

export function useActivity(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.activities.detail(id || ""),
    queryFn: () => getActivity(id!),
    enabled: Boolean(id) && enabled,
  });
}
