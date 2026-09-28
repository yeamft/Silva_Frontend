"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateMonthlyWorkOrder,
  addMonthlyOutOfPlanLine,
  createMonthlyWorkOrder,
  decideMonthlyWorkOrder,
  listMonthlyWorkOrders,
  setMonthlyWorkOrderLoop,
  submitMonthlyWorkOrder,
} from "@/lib/api/monthly-work-orders";
import { queryKeys } from "@/lib/query/keys";
import type { ProcessLoop } from "@/types/agronomic-cycle";

export function useMonthlyWorkOrders(enabled = true, status?: string) {
  return useQuery({
    queryKey: queryKeys.monthlyWorkOrders.list(status),
    queryFn: () => listMonthlyWorkOrders(status ? { status } : undefined),
    enabled,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.monthlyWorkOrders.all });
  };
}

export function useCreateMonthlyWorkOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: createMonthlyWorkOrder,
    onSuccess: () => invalidate(),
  });
}

export function useSubmitMonthlyWorkOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => submitMonthlyWorkOrder(id),
    onSuccess: () => invalidate(),
  });
}

export function useDecideMonthlyWorkOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      comment,
    }: {
      id: string;
      decision: "approve" | "return";
      comment?: string;
    }) => decideMonthlyWorkOrder(id, decision, comment),
    onSuccess: () => invalidate(),
  });
}

export function useActivateMonthlyWorkOrder() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => activateMonthlyWorkOrder(id),
    onSuccess: () => invalidate(),
  });
}

export function useSetMonthlyWorkOrderLoop() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, loop }: { id: string; loop: ProcessLoop | string }) =>
      setMonthlyWorkOrderLoop(id, loop),
    onSuccess: () => invalidate(),
  });
}

export function useAddMonthlyOutOfPlanLine() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      activityName: string;
      activityCode?: string;
      activityId?: string;
      blockId?: string;
      blockCode?: string;
      plannedQty: number;
      unit?: string;
      etb: number;
      manualsRef?: string;
      reason: string;
    }) => addMonthlyOutOfPlanLine(id, input),
    onSuccess: () => invalidate(),
  });
}
