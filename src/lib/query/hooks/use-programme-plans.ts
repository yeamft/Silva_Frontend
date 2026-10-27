"use client";

import {
  archiveProgrammePlan,
  createProgrammePlan,
  decideProgrammePlan,
  duplicateProgrammePlan,
  listProgrammePlans,
  submitProgrammePlan,
  type ProgrammePlanDto,
} from "@/lib/api/programme-plans";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { queryKeys } from "@/lib/query/keys";
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
  return useMutation({
    mutationFn: (row: Pick<ProgrammePlanDto, "id" | "updatedAt">) => {
      // Edits made in the plan editor that haven't reached the server yet go with the submit.
      const local = useCoreOpsPlanStore.getState().plan;
      const hasNewerLocal =
        local?.id === row.id && Date.parse(local.updatedAt) > Date.parse(row.updatedAt);
      return submitProgrammePlan(row.id, hasNewerLocal ? local : undefined);
    },
    onSuccess: () => invalidate(),
  });
}

export function useDecideProgrammePlan() {
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
    }) => decideProgrammePlan(id, decision, comment),
    onSuccess: () => invalidate(),
  });
}
