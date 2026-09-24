"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeAllNotifications,
  acknowledgeNotification,
  getNotifications,
} from "@/lib/api/notifications";
import { queryKeys } from "@/lib/query/keys";

export function useNotifications(
  enabled = true,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: getNotifications,
    enabled,
    refetchInterval: options?.refetchInterval,
  });
}

export function useAcknowledgeNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acknowledgeNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}

export function useAcknowledgeAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => acknowledgeAllNotifications(),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}
