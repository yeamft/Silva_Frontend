"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmDirectInstruction,
  issueDirectInstruction,
  listDirectInstructions,
  listPendingDirectInstructions,
} from "@/lib/api/direct-instructions";
import { queryKeys } from "@/lib/query/keys";

export function useDirectInstructions(
  enabled = true,
  params?: { status?: string; monthlyWoId?: string },
) {
  return useQuery({
    queryKey: queryKeys.directInstructions.list(params),
    queryFn: () => listDirectInstructions(params),
    enabled,
  });
}

export function usePendingDirectInstructions(monthlyWoId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.directInstructions.pending(monthlyWoId || ""),
    queryFn: () => listPendingDirectInstructions(monthlyWoId!),
    enabled: enabled && Boolean(monthlyWoId),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.directInstructions.all });
  };
}

export function useIssueDirectInstruction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: issueDirectInstruction,
    onSuccess: () => invalidate(),
  });
}

export function useConfirmDirectInstruction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => confirmDirectInstruction(id),
    onSuccess: () => invalidate(),
  });
}
