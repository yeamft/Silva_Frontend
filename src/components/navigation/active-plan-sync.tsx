"use client";

import { useEffect, useMemo, useRef } from "react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
import { usePlanningContextStore } from "@/store/planningContextStore";

/**
 * Keeps coreOpsPlanStore.plan aligned with the workspace active programme plan
 * so Budget / Timeline / AFP Register / Performance read the selected plan.
 *
 * Must share the same programme-plans query as GlobalContextBar — divergent
 * caches previously caused setActivePlanId(null) ↔ setActivePlanId(preferred)
 * oscillation and "Maximum update depth exceeded".
 */
export function ActivePlanSync() {
  const { activeProgram } = useCropfortAuth();
  const programId = activeProgram?.id;
  const activePlanId = usePlanningContextStore((s) =>
    programId ? s.activePlanIdByProgram[programId] ?? null : null,
  );
  const setActivePlanId = usePlanningContextStore((s) => s.setActivePlanId);
  // Same default params as GlobalContextBar (includeArchived: false + programId key).
  const plansQuery = useProgrammePlans(Boolean(programId));
  const plans = useMemo(
    () => (plansQuery.data || []).filter((p) => p.statusRaw !== "archived"),
    [plansQuery.data],
  );
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const loadPlanById = useCoreOpsPlanStore((s) => s.loadPlanById);
  const loading = useCoreOpsPlanStore((s) => s.loading);
  const lastLoaded = useRef<string | null>(null);
  const loadInFlight = useRef<string | null>(null);

  // Prefer a remembered plan; otherwise pick latest non-archived from list.
  useEffect(() => {
    if (!programId || plansQuery.isLoading) return;
    if (activePlanId) {
      const stillThere = plans.some((p) => p.id === activePlanId);
      if (stillThere) return;
    }
    const preferred =
      plans.find((p) => p.statusRaw === "approved" || p.statusRaw === "active") ||
      plans.find((p) => p.statusRaw !== "archived") ||
      plans[0];
    if (preferred && preferred.id !== activePlanId) {
      setActivePlanId(programId, preferred.id);
    }
  }, [programId, activePlanId, plans, plansQuery.isLoading, setActivePlanId]);

  useEffect(() => {
    if (!activePlanId) return;
    if (plan?.id === activePlanId && lastLoaded.current === activePlanId) return;
    if (loading && lastLoaded.current === activePlanId) return;
    if (loadInFlight.current === activePlanId) return;
    lastLoaded.current = activePlanId;
    loadInFlight.current = activePlanId;
    void loadPlanById(activePlanId).finally(() => {
      if (loadInFlight.current === activePlanId) {
        loadInFlight.current = null;
      }
    });
  }, [activePlanId, plan?.id, loadPlanById, loading]);

  return null;
}
