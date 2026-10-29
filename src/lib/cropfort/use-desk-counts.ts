"use client";

import { useMemo } from "react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { useMonthlyWorkOrders } from "@/lib/query/hooks/use-monthly-work-orders";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { mapWorkOrderDto, useWorkOrders } from "@/lib/query/hooks/use-work-orders";

/**
 * What's waiting on the SPX Account Manager, shared by the sidebar badges and the home page.
 * The three lists are the same cached queries the pages use, so this adds no extra requests.
 */
export function useDeskCounts() {
  const { activeProgram } = useCropfortAuth();
  const enabled = Boolean(activeProgram?.id);
  const plansQuery = useProgrammePlans(enabled, {});
  const monthlyQuery = useMonthlyWorkOrders(enabled);
  const woQuery = useWorkOrders(enabled);

  return useMemo(() => {
    const plans = (plansQuery.data || []).filter((p) => p.statusRaw !== "archived");
    const monthly = monthlyQuery.data || [];
    const workOrders = (woQuery.data || []).map(mapWorkOrderDto);
    const draftPlans = plans.filter((p) => !p.statusRaw || p.statusRaw === "draft" || p.statusRaw === "ready_for_review");
    const returnedPlans = plans.filter((p) => p.statusRaw === "returned");
    const waitingPlans = plans.filter((p) => p.statusRaw === "submitted");
    const monthsToActivate = monthly.filter((m) => m.status === "approved");
    const workToReview = workOrders.filter((w) => w.status === "complete" && !w.spxApproved);
    const workToIssue = workOrders.filter((w) => w.status === "draft");
    return {
      loading: plansQuery.isLoading || monthlyQuery.isLoading || woQuery.isLoading,
      plans,
      monthly,
      workOrders,
      draftPlans,
      returnedPlans,
      waitingPlans,
      monthsToActivate,
      workToReview,
      workToIssue,
      /** Badge numbers for the sidebar. */
      badges: {
        plans: draftPlans.length,
        returned: returnedPlans.length,
        monthly: monthsToActivate.length,
        workOrders: workToReview.length + workToIssue.length,
      },
    };
  }, [plansQuery.data, plansQuery.isLoading, monthlyQuery.data, monthlyQuery.isLoading, woQuery.data, woQuery.isLoading]);
}
