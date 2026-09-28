"use client";

import { useEffect, useRef } from "react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import {
  putAgreementConfig,
  type AgreementConfigDto,
} from "@/lib/api/agreement-config";
import { useAgreementConfigQuery } from "@/lib/query/hooks/use-agreement-config";
import { queryKeys } from "@/lib/query/keys";
import { useQueryClient } from "@tanstack/react-query";
import { useAgreementConfigStore } from "@/store/agreementConfigStore";

const SAVE_DEBOUNCE_MS = 900;

/**
 * Hydrates agreement / Schedule config for the whole Cropfort shell,
 * and auto-persists dirty edits to the active workspace.
 */
export function ActiveAgreementConfigSync() {
  const { activeProgram } = useCropfortAuth();
  const programId = activeProgram?.id;
  const query = useAgreementConfigQuery(Boolean(programId));
  const hydrateFromRemote = useAgreementConfigStore((s) => s.hydrateFromRemote);
  const hydratedProgramId = useAgreementConfigStore((s) => s.hydratedProgramId);
  const revision = useAgreementConfigStore((s) => s.revision);
  const dirty = useAgreementConfigStore((s) => s.dirty);
  const markClean = useAgreementConfigStore((s) => s.markClean);
  const toRemotePayload = useAgreementConfigStore((s) => s.toRemotePayload);
  const qc = useQueryClient();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Hydrate once per workspace when API data arrives.
   * Re-hydrate when switching programs (hydratedProgramId changes).
   * Hydrate leaves dirty=false, so it never trips autosave.
   */
  useEffect(() => {
    if (!programId || !query.data) return;
    if (hydratedProgramId === programId) return;
    hydrateFromRemote(query.data, programId);
  }, [programId, query.data, hydratedProgramId, hydrateFromRemote]);

  // Debounced auto-save when local edits mark the store dirty.
  useEffect(() => {
    if (!programId || !dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const body = toRemotePayload() as Partial<AgreementConfigDto>;
      void putAgreementConfig(body)
        .then((saved) => {
          markClean();
          // Do not reset hydratedProgramId — setQueryData must not re-trigger hydrate.
          qc.setQueryData(queryKeys.agreementConfig.current(), saved);
        })
        .catch(() => {
          /* keep dirty; user can retry via Save on lifecycle page */
        });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [programId, dirty, revision, toRemotePayload, markClean, qc]);

  return null;
}
