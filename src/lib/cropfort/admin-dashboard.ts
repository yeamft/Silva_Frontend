import type { WorkOrderDto } from "@/lib/api/work-orders";
import type { ProgrammePlanDto } from "@/lib/api/programme-plans";
import { PLAN_MONTHS, PLAN_MONTH_LABELS } from "@/lib/cropfort/ethiopian-year";

/** Bucket actual creation dates, including empty months and year boundaries. */
export function dashboardExecution(workOrders: WorkOrderDto[], months: number, now: Date) {
  const buckets = Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - months + index + 1, 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: date.toLocaleDateString("en", { month: "short" }),
      period: date.toLocaleDateString("en", { month: "long", year: "numeric" }),
      workOrders: 0,
      tickets: 0,
    };
  });
  const byMonth = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const add = (iso: string, kind: "workOrders" | "tickets") => {
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime()) || date > now) return;
    const bucket = byMonth.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket[kind] += 1;
  };
  for (const order of workOrders) {
    add(order.createdAt, "workOrders");
    for (const ticket of order.tickets || []) add(ticket.createdAt, "tickets");
  }
  return buckets;
}

/** Plans specify months, not days. Keep that precision in the dashboard. */
export function dashboardSchedule(plans: ProgrammePlanDto[], now: Date) {
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return plans.filter((plan) => !plan.archivedAt).flatMap((plan) => {
    if (!Number.isInteger(plan.budgetYearGc)) return [];
    return Object.values(plan.activities || {}).filter((activity) => activity.included).flatMap((activity) =>
      PLAN_MONTHS.flatMap((month, index) => {
        const intensity = activity.intensities?.[month];
        if (!intensity || intensity === "none") return [];
        // A budget year labelled 2027 covers Oct 2026 through Sep 2027.
        const date = new Date(plan.budgetYearGc - (index < 3 ? 1 : 0), (index + 9) % 12, 1);
        if (date.getTime() < thisMonth) return [];
        return [{
          id: `${plan.id}-${activity.id}-${month}`,
          planId: plan.id,
          title: activity.activityName,
          detail: [plan.farmName, activity.blockAllocations?.map((block) => block.blockCode).filter(Boolean).join(", ")].filter(Boolean).join(" · "),
          month: PLAN_MONTH_LABELS[month],
          year: date.getFullYear(),
          date: date.getTime(),
          intensity,
        }];
      }),
    );
  }).sort((a, b) => a.date - b.date || a.title.localeCompare(b.title));
}

export function dashboardProgress(workOrders: WorkOrderDto[]) {
  const completed = workOrders.filter((order) => order.status === "complete" || order.status === "closed").length;
  return {
    completed,
    total: workOrders.length,
    open: workOrders.length - completed,
    percent: workOrders.length ? Math.round(completed / workOrders.length * 100) : null,
  };
}
