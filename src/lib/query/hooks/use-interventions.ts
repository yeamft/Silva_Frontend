"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeIntervention,
  createIntervention,
  decideIntervention,
  linkInterventionAfe,
  listInterventions,
  startIntervention,
  submitIntervention,
  toggleInterventionStep,
} from "@/lib/api/interventions";
import { queryKeys } from "@/lib/query/keys";

export function useInterventions(enabled = true, status?: string) {
  return useQuery({
    queryKey: queryKeys.interventions.list(status),
    queryFn: () => listInterventions(status ? { status } : undefined),
    enabled,
  });
}

function useInvalidateInterventions() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.interventions.all });
  };
}

export function useCreateIntervention() {
  const invalidate = useInvalidateInterventions();
  return useMutation({
    mutationFn: createIntervention,
    onSuccess: () => invalidate(),
  });
}

export function useStartIntervention() {
  const invalidate = useInvalidateInterventions();
  return useMutation({
    mutationFn: (id: string) => startIntervention(id),
    onSuccess: () => invalidate(),
  });
}

export function useSubmitIntervention() {
  const invalidate = useInvalidateInterventions();
  return useMutation({
    mutationFn: (id: string) => submitIntervention(id),
    onSuccess: () => invalidate(),
  });
}

export function useDecideIntervention() {
  const invalidate = useInvalidateInterventions();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      comment,
    }: {
      id: string;
      decision: "approve" | "return";
      comment?: string;
    }) => decideIntervention(id, decision, comment),
    onSuccess: () => invalidate(),
  });
}

export function useCompleteIntervention() {
  const invalidate = useInvalidateInterventions();
  return useMutation({
    mutationFn: (id: string) => completeIntervention(id),
    onSuccess: () => invalidate(),
  });
}

export function useToggleInterventionStep() {
  const invalidate = useInvalidateInterventions();
  return useMutation({
    mutationFn: ({ id, stepId }: { id: string; stepId: string }) =>
      toggleInterventionStep(id, stepId),
    onSuccess: () => invalidate(),
  });
}

export function useLinkInterventionAfe() {
  const invalidate = useInvalidateInterventions();
  return useMutation({
    mutationFn: ({ id, cropfortAfeId }: { id: string; cropfortAfeId: string }) =>
      linkInterventionAfe(id, cropfortAfeId),
    onSuccess: () => invalidate(),
  });
}
