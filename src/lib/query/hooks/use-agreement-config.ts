"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import {
  getAgreementConfig,
  putAgreementConfig,
  type AgreementConfigDto,
} from "@/lib/api/agreement-config";
import { queryKeys } from "@/lib/query/keys";
import { useAgreementConfigStore } from "@/store/agreementConfigStore";
import {
  DEFAULT_PROCESS_CALENDAR,
  DEFAULT_SCHEDULE5,
  DEFAULT_SCHEDULE7,
  type EstablishmentPhase,
  type ProcessCalendarItem,
  type ReservedMatterFlags,
  type Schedule5Config,
  type Schedule7Dependency,
  type SixMonthReview,
} from "@/types/agronomic-cycle";

export function useAgreementConfigQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.agreementConfig.current(),
    queryFn: getAgreementConfig,
    enabled,
  });
}

export function useSaveAgreementConfig() {
  const qc = useQueryClient();
  const markClean = useAgreementConfigStore((s) => s.markClean);
  return useMutation({
    mutationFn: (body: Partial<AgreementConfigDto>) => putAgreementConfig(body),
    onSuccess: (data) => {
      markClean();
      void qc.setQueryData(queryKeys.agreementConfig.current(), data);
    },
  });
}

/** Hydrate local agreement store from API once per workspace. */
export function useAgreementConfigSync(enabled = true) {
  const { activeProgram } = useCropfortAuth();
  const programId = activeProgram?.id;
  const query = useAgreementConfigQuery(enabled && Boolean(programId));
  const hydrate = useAgreementConfigStore((s) => s.hydrateFromRemote);
  const hydratedProgramId = useAgreementConfigStore((s) => s.hydratedProgramId);

  useEffect(() => {
    if (!enabled || !programId || !query.data) return;
    if (hydratedProgramId === programId) return;
    hydrate(query.data, programId);
  }, [enabled, programId, query.data, hydratedProgramId, hydrate]);

  return query;
}

export function buildAgreementPayloadFromStore(): Partial<AgreementConfigDto> {
  const s = useAgreementConfigStore.getState();
  return {
    schedule5: s.schedule5,
    schedule7: s.schedule7,
    processCalendar: s.processCalendar,
    reservedMatters: s.reservedMatters,
    establishment: s.establishment,
    sixMonthReviews: s.sixMonthReviews,
    directInstructionValueEtb: s.directInstructionValueEtb,
  };
}

export function defaultsFromRemote(data: AgreementConfigDto) {
  return {
    schedule5: (data.schedule5 as Schedule5Config) || { ...DEFAULT_SCHEDULE5 },
    schedule7: (Array.isArray(data.schedule7)
      ? data.schedule7
      : DEFAULT_SCHEDULE7.map((d) => ({ ...d }))) as Schedule7Dependency[],
    processCalendar: (Array.isArray(data.processCalendar)
      ? data.processCalendar
      : DEFAULT_PROCESS_CALENDAR.map((c) => ({ ...c }))) as ProcessCalendarItem[],
    reservedMatters: (data.reservedMatters as ReservedMatterFlags) || {
      procurementAboveBand: true,
      permanentHire: true,
      relatedParty: true,
      landDisposition: true,
      financing: true,
    },
    establishment: (data.establishment as EstablishmentPhase | null) ?? null,
    sixMonthReviews: (Array.isArray(data.sixMonthReviews)
      ? data.sixMonthReviews
      : []) as SixMonthReview[],
    directInstructionValueEtb: data.directInstructionValueEtb ?? 50_000,
  };
}
