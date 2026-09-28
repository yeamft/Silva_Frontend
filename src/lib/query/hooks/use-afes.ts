"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAfe,
  decideAfe,
  listAfes,
  submitAfe,
} from "@/lib/api/afes";
import { queryKeys } from "@/lib/query/keys";

export function useAfes(enabled = true, status?: string) {
  return useQuery({
    queryKey: queryKeys.afes.list(status),
    queryFn: () => listAfes(status ? { status } : undefined),
    enabled,
  });
}

export function useCreateAfe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAfe,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.afes.all });
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useSubmitAfe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitAfe(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.afes.all });
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useDecideAfe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      comment,
    }: {
      id: string;
      decision: "approve" | "return";
      comment?: string;
    }) => decideAfe(id, decision, comment),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.afes.all });
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
