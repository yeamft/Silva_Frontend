"use client";

import {
  archiveProgrammePlan,
  createProgrammePlan,
  createWorkOrdersFromPlan,
  decideProgrammePlan,
  duplicateProgrammePlan,
  getProgrammePlan,
  listProgrammePlans,
  submitProgrammePlan,
  type ProgrammePlanDto,
} from "@/lib/api/programme-plans";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
import { useFarmScopedSelect } from "@/store/farmWorkspaceStore";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { queryKeys } from "@/lib/query/keys";
import { moveRowStatus, restoreSnapshot } from "@/lib/query/optimistic-status";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useProgrammePlans(
  enabled = true,
  params?: {
    status?: string;
    farmEstateId?: string;
    planYear?: number;
    q?: string;
    includeArchived?: boolean;
  },
) {
  const { activeProgram } = useCropfortAuth();
  const programId = activeProgram?.id ?? null;
  const listParams = {
    ...params,
    // Default: exclude archived so every consumer shares one cache entry.
    includeArchived: params?.includeArchived ?? false,
    programId,
  };
  // Only the farm area chosen in the top bar (all when none is chosen)
  const select = useFarmScopedSelect<ProgrammePlanDto>((p) => p.farmEstateId);
  return useQuery({
    queryKey: queryKeys.programmePlans.list(listParams),
    queryFn: () =>
      listProgrammePlans({
        status: params?.status,
        farmEstateId: params?.farmEstateId,
        planYear: params?.planYear,
        q: params?.q,
        includeArchived: listParams.includeArchived,
      }),
    select,
    enabled: enabled && Boolean(programId),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.programmePlans.all });
    void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
  };
}

export function useCreateProgrammePlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: createProgrammePlan,
    onSuccess: () => invalidate(),
  });
}

export function useDuplicateProgrammePlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => duplicateProgrammePlan(id),
    onSuccess: () => invalidate(),
  });
}

export function useArchiveProgrammePlan() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => archiveProgrammePlan(id),
    onSuccess: () => invalidate(),
  });
}

export function useSubmitProgrammePlanMutation() {
  const invalidate = useInvalidate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: Pick<ProgrammePlanDto, "id" | "updatedAt">) => {
      // Edits made in the plan editor that haven't reached the server yet go with the submit.
      const local = useCoreOpsPlanStore.getState().plan;
      const hasNewerLocal =
        local?.id === row.id && Date.parse(local.updatedAt) > Date.parse(row.updatedAt);
      return submitProgrammePlan(row.id, hasNewerLocal ? local : undefined);
    },
    onMutate: (row) =>
      moveRowStatus<ProgrammePlanDto>(qc, queryKeys.programmePlans.all, row.id, "draft", {
        statusRaw: "submitted",
      }),
    onError: (_err, _row, snapshot) => restoreSnapshot(qc, snapshot),
    onSettled: () => invalidate(),
  });
}

export function useCreateWorkOrdersFromPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, months }: { id: string; months?: string[] }) => createWorkOrdersFromPlan(id, months),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.monthlyWorkOrders.all });
    },
  });
}

/** One plan with every line (the list only carries counts). */
export function useProgrammePlan(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.programmePlans.detail(id ?? ""),
    queryFn: () => getProgrammePlan(id!),
    enabled: Boolean(id),
  });
}

export function useDecideProgrammePlan() {
  const invalidate = useInvalidate();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      comment,
      removeLineIds,
    }: {
      id: string;
      decision: "approve" | "return";
      comment?: string;
      removeLineIds?: string[];
    }) => decideProgrammePlan(id, decision, comment, removeLineIds),
    // Leaves the approvals queue the moment the button is pressed
    onMutate: ({ id, decision }) =>
      moveRowStatus<ProgrammePlanDto>(qc, queryKeys.programmePlans.all, id, "submitted", {
        statusRaw: decision === "approve" ? "approved" : "returned",
      }),
    onError: (_err, _vars, snapshot) => restoreSnapshot(qc, snapshot),
    onSettled: () => invalidate(),
  });
}
