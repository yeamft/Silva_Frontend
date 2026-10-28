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
  type MonthlyWorkOrderDto,
} from "@/lib/api/monthly-work-orders";
import { queryKeys } from "@/lib/query/keys";
import { moveRowStatus, restoreSnapshot } from "@/lib/query/optimistic-status";
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => submitMonthlyWorkOrder(id),
    onMutate: (id) =>
      moveRowStatus<MonthlyWorkOrderDto>(qc, queryKeys.monthlyWorkOrders.all, id, "draft", { status: "submitted" }),
    onError: (_err, _id, snapshot) => restoreSnapshot(qc, snapshot),
    onSettled: () => invalidate(),
  });
}

export function useDecideMonthlyWorkOrder() {
  const invalidate = useInvalidate();
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
    }) => decideMonthlyWorkOrder(id, decision, comment),
    // Leaves the approvals queue the moment the button is pressed
    onMutate: ({ id, decision }) =>
      moveRowStatus<MonthlyWorkOrderDto>(qc, queryKeys.monthlyWorkOrders.all, id, "submitted", {
        status: decision === "approve" ? "approved" : "returned",
      }),
    onError: (_err, _vars, snapshot) => restoreSnapshot(qc, snapshot),
    onSettled: () => invalidate(),
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
