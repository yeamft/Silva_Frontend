"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { listFarmAssessments } from "@/lib/api/farm-assessments";
import { useAfes } from "@/lib/query/hooks/use-afes";
import { useMonthlyWorkOrders } from "@/lib/query/hooks/use-monthly-work-orders";
import { useOpsReports } from "@/lib/query/hooks/use-ops-reports";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";

/**
 * What's waiting on the asset owner, shared by the sidebar badges and the home page.
 * Same queries (and keys) as the Approvals page, so it adds no extra requests.
 */
export function useOwnerCounts() {
  const { activeProgram } = useCropfortAuth();
  const enabled = Boolean(activeProgram?.id);
  const assessmentsQuery = useQuery({
    queryKey: ["farm-assessments-owner", activeProgram?.id],
    queryFn: () => listFarmAssessments({ status: "submitted" }),
    enabled,
    refetchInterval: 15_000,
  });
  const plansQuery = useProgrammePlans(enabled, { status: "submitted" });
  const monthlyQuery = useMonthlyWorkOrders(enabled, "submitted");
  const afesQuery = useAfes(enabled, "submitted");
  const reportsQuery = useOpsReports(enabled, "submitted");

  return useMemo(() => {
    const assessments = assessmentsQuery.data || [];
    const plans = plansQuery.data || [];
    const monthly = monthlyQuery.data || [];
    const afes = afesQuery.data || [];
    const reports = reportsQuery.data || [];
    return {
      loading:
        assessmentsQuery.isLoading || plansQuery.isLoading || monthlyQuery.isLoading || afesQuery.isLoading || reportsQuery.isLoading,
      error: assessmentsQuery.isError || plansQuery.isError || monthlyQuery.isError || afesQuery.isError || reportsQuery.isError,
      assessments,
      plans,
      monthly,
      afes,
      reports,
      /** Badge numbers for the sidebar. */
      badges: {
        approvals: plans.length + monthly.length + afes.length + reports.length,
        assessments: assessments.length,
        reports: reports.length,
      },
    };
  }, [
    assessmentsQuery.data, assessmentsQuery.isLoading, assessmentsQuery.isError,
    plansQuery.data, plansQuery.isLoading, plansQuery.isError,
    monthlyQuery.data, monthlyQuery.isLoading, monthlyQuery.isError,
    afesQuery.data, afesQuery.isLoading, afesQuery.isError,
    reportsQuery.data, reportsQuery.isLoading, reportsQuery.isError,
  ]);
}
