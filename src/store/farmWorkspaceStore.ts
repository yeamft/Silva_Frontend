"use client";

import { useCallback } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useCropfortAuth } from "@/components/navigation/auth-context";

type FarmWorkspaceState = {
  /** Selected farm area per workspace (program id); missing = all farm areas. */
  farmByProgram: Record<string, string>;
  setFarm: (programId: string, farmId: string | null) => void;
};

export const useFarmWorkspaceStore = create<FarmWorkspaceState>()(
  persist(
    (set) => ({
      farmByProgram: {},
      setFarm: (programId, farmId) =>
        set((state) => {
          const next = { ...state.farmByProgram };
          if (farmId) next[programId] = farmId;
          else delete next[programId];
          return { farmByProgram: next };
        }),
    }),
    { name: "cropfort.farm-workspace.v1" },
  ),
);

/** The farm area chosen in the top bar for this workspace, or null for all farm areas. */
export function useActiveFarmId(): string | null {
  const { activeProgram } = useCropfortAuth();
  return useFarmWorkspaceStore((s) => (activeProgram?.id ? s.farmByProgram[activeProgram.id] ?? null : null));
}

/**
 * A `select` for list queries: keeps only rows of the chosen farm area. Stable per farm, so
 * TanStack Query only re-filters when the data or the farm changes.
 */
export function useFarmScopedSelect<T>(farmOf: (row: T) => string | null | undefined) {
  const farmId = useActiveFarmId();
  // farmOf is a fixed field accessor at each call site
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((rows: T[]) => (farmId ? rows.filter((r) => farmOf(r) === farmId) : rows), [farmId]);
}
