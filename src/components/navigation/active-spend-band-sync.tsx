"use client";

import { useEffect, useMemo, useRef } from "react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { canManagePrograms } from "@/lib/cropfortAccess";
import { usePrograms } from "@/lib/query";
import { useSpendBandStore } from "@/store/spendBandStore";

type BandProgram = {
  id: string;
  name: string;
  cropfortAfeBandAMaxEtb?: number;
  cropfortAfeBandBMaxEtb?: number;
  cropfortAfeBandCMaxEtb?: number;
};

/**
 * Keeps FE spend-band resolution aligned with program API A/B/C ETB caps.
 */
export function ActiveSpendBandSync() {
  const { user, activeProgram, programs: sessionPrograms } = useCropfortAuth();
  const canAdminList = canManagePrograms(user.role);
  const programsQuery = usePrograms(canAdminList);
  const hydrateFromPrograms = useSpendBandStore((s) => s.hydrateFromPrograms);

  const source = useMemo((): BandProgram[] => {
    const api = programsQuery.data ?? [];
    if (api.length > 0) return api;
    if (sessionPrograms.length > 0) return sessionPrograms;
    if (activeProgram) {
      return [
        {
          id: activeProgram.id,
          name: activeProgram.name,
          cropfortAfeBandAMaxEtb: activeProgram.cropfortAfeBandAMaxEtb,
          cropfortAfeBandBMaxEtb: activeProgram.cropfortAfeBandBMaxEtb,
          cropfortAfeBandCMaxEtb: activeProgram.cropfortAfeBandCMaxEtb,
        },
      ];
    }
    return [];
  }, [programsQuery.data, sessionPrograms, activeProgram]);

  const sourceRef = useRef(source);
  sourceRef.current = source;

  // Primitive dep only — `source` is a new array reference whenever auth
  // context rebuilds `programs`, which used to re-fire hydrate every render.
  const hydrateKey = useMemo(
    () =>
      source
        .map(
          (p) =>
            `${p.id}:${p.name}:${p.cropfortAfeBandAMaxEtb ?? ""}:${p.cropfortAfeBandBMaxEtb ?? ""}:${p.cropfortAfeBandCMaxEtb ?? ""}`,
        )
        .join("|") + `|active:${activeProgram?.id ?? ""}`,
    [source, activeProgram?.id],
  );

  useEffect(() => {
    const current = sourceRef.current;
    if (!current.length) return;
    hydrateFromPrograms(current, activeProgram?.id ?? null);
  }, [hydrateKey, activeProgram?.id, hydrateFromPrograms]);

  return null;
}
