"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeAllNotifications,
  acknowledgeNotification,
  getNotifications,
} from "@/lib/api/notifications";
import { queryKeys } from "@/lib/query/keys";

const LIVE_POLL_MS = 5_000;

export function useNotifications(
  enabled = true,
  options?: { refetchInterval?: number | false },
) {
  const interval =
    options?.refetchInterval === undefined ? LIVE_POLL_MS : options.refetchInterval;

  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: getNotifications,
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: enabled ? interval : false,
  });
}

export function useAcknowledgeNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acknowledgeNotification(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useAcknowledgeAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => acknowledgeAllNotifications(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
