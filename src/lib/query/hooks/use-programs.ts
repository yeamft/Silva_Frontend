"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveProgram,
  createProgram,
  getPrograms,
  updateProgram,
} from "@/lib/api/programs";
import { queryKeys } from "@/lib/query/keys";

export function usePrograms(enabled = true) {
  return useQuery({
    queryKey: queryKeys.programs.list(),
    queryFn: getPrograms,
    enabled,
  });
}

function useInvalidatePrograms() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.programs.all });
}

export function useCreateProgram() {
  const invalidate = useInvalidatePrograms();
  return useMutation({
    mutationFn: (input: { name: string; slug?: string; status?: "active" | "archived" }) =>
      createProgram(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateProgram() {
  const invalidate = useInvalidatePrograms();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: {
        name?: string;
        slug?: string;
        status?: "active" | "archived";
        cropfortAfeBandAMaxEtb?: number;
        cropfortAfeBandBMaxEtb?: number;
        cropfortAfeBandCMaxEtb?: number;
      };
    }) => updateProgram(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useArchiveProgram() {
  const invalidate = useInvalidatePrograms();
  return useMutation({
    mutationFn: (id: string) => archiveProgram(id),
    onSuccess: () => invalidate(),
  });
}
