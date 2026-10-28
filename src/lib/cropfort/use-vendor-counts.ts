"use client";

import { useMemo } from "react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { mapWorkOrderDto, useWorkOrders } from "@/lib/query/hooks/use-work-orders";

/**
 * What's waiting on the vendor, shared by the field desk sidebar badge and the home page.
 * Uses the same cached work orders query as the Work orders page, so it adds no requests.
 */
export function useVendorCounts() {
  const { activeProgram } = useCropfortAuth();
  const woQuery = useWorkOrders(Boolean(activeProgram?.id));

  return useMemo(() => {
    const workOrders = (woQuery.data || []).map(mapWorkOrderDto);
    const open = workOrders.filter((w) => w.status === "issued" || w.status === "in_progress");
    // SPX sent these back with a comment; they come first
    const returned = open.filter((w) => w.vendorOutcome === "returned");
    const toDo = open.filter((w) => w.vendorOutcome !== "returned");
    const inReview = workOrders.filter((w) => w.status === "complete" && !w.spxApproved);
    const approved = workOrders.filter((w) => w.spxApproved);
    return {
      loading: woQuery.isLoading,
      workOrders,
      open,
      returned,
      toDo,
      inReview,
      approved,
      /** Badge number for the sidebar: everything the vendor still has to do. */
      badge: open.length,
    };
  }, [woQuery.data, woQuery.isLoading]);
}
