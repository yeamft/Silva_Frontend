"use client";

import { useMemo } from "react";
import { useAfes } from "@/lib/query/hooks/use-afes";
import { useDailyFieldRecords } from "@/lib/query/hooks/use-daily-field-records";
import { useMonthlyWorkOrders } from "@/lib/query/hooks/use-monthly-work-orders";
import {
  mapTicketDto,
  mapWorkOrderDto,
  useWorkOrders,
} from "@/lib/query/hooks/use-work-orders";
import { useWeeklyPlans } from "@/lib/query/hooks/use-weekly-plans";
import type { DailyFieldRecord, MonthlyWorkOrder, WeeklyPlan } from "@/types/agronomic-cycle";

/** Live WO / ticket / AFE / weekly / monthly / DFR inputs for performance surfaces. */
export function usePerformanceLiveData(enabled = true) {
  const woQuery = useWorkOrders(enabled);
  const afesQuery = useAfes(enabled);
  const weeklyQuery = useWeeklyPlans(enabled);
  const monthlyQuery = useMonthlyWorkOrders(enabled);
  const dfrQuery = useDailyFieldRecords(enabled);

  const workOrders = useMemo(
    () => (woQuery.data || []).map(mapWorkOrderDto),
    [woQuery.data],
  );

  const tickets = useMemo(() => {
    const byId = new Map((woQuery.data || []).map((w) => [w.id, w]));
    return (woQuery.data || []).flatMap((wo) =>
      (wo.tickets || []).map((t) => mapTicketDto(t, byId.get(wo.id))),
    );
  }, [woQuery.data]);

  const afes = useMemo(() => afesQuery.data || [], [afesQuery.data]);
  const weekly: WeeklyPlan[] = useMemo(
    () => (weeklyQuery.data || []) as WeeklyPlan[],
    [weeklyQuery.data],
  );
  const monthly: MonthlyWorkOrder[] = useMemo(
    () => (monthlyQuery.data || []) as MonthlyWorkOrder[],
    [monthlyQuery.data],
  );
  const dfrs: DailyFieldRecord[] = useMemo(
    () => (dfrQuery.data || []) as DailyFieldRecord[],
    [dfrQuery.data],
  );

  const committedEtb = useMemo(
    () =>
      afes
        .filter((a) => a.status === "approved")
        .reduce((sum, a) => sum + (a.amountEtb || 0), 0),
    [afes],
  );

  return {
    workOrders,
    tickets,
    afes,
    weekly,
    monthly,
    dfrs,
    committedEtb,
    isLoading:
      woQuery.isLoading ||
      afesQuery.isLoading ||
      weeklyQuery.isLoading ||
      monthlyQuery.isLoading ||
      dfrQuery.isLoading,
    isError:
      woQuery.isError ||
      afesQuery.isError ||
      weeklyQuery.isError ||
      monthlyQuery.isError ||
      dfrQuery.isError,
  };
}
