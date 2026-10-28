"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFieldTicket,
  createWorkOrder,
  listWorkOrders,
  transitionFieldTicket,
  reportWorkOrderOutcome,
  reviewWorkOrder,
  transitionWorkOrder,
  updateWorkOrder,
  type FieldTicketDto,
  type FieldTicketStatus,
  type WorkOrderDto,
  type WorkOrderStatus,
} from "@/lib/api/work-orders";
import { queryKeys } from "@/lib/query/keys";
import type {
  Attention,
  FieldTicket,
  TicketStatus,
  WoStatus,
  WorkOrder,
} from "@/store/cropfortOpsStore";

/** Map API ticket status → OpsDesk UI ticket status. */
export function apiTicketToUi(status: FieldTicketStatus): TicketStatus {
  switch (status) {
    case "draft":
      return "assigned";
    case "submitted":
      return "submitted";
    case "vendor_reviewed":
      return "site_reviewed";
    case "validated":
      return "validated";
    case "rejected":
      return "returned";
    default:
      return "assigned";
  }
}

/** Map OpsDesk UI ticket status → API transition target. */
export function uiTicketToApi(status: TicketStatus): FieldTicketStatus | null {
  switch (status) {
    case "assigned":
    case "accepted":
    case "in_progress":
      return "draft";
    case "submitted":
      return "submitted";
    case "site_reviewed":
      return "vendor_reviewed";
    case "validated":
      return "validated";
    case "returned":
      return "rejected";
    default:
      return null;
  }
}

export function mapWorkOrderDto(dto: WorkOrderDto): WorkOrder {
  const progress =
    dto.ticketsTotal > 0 ? Math.round((dto.ticketsDone / dto.ticketsTotal) * 100) : 0;
  const status: WoStatus =
    dto.status === "closed" ? "complete" : (dto.status as WoStatus);
  return {
    id: dto.id,
    afeId: dto.afeId || "",
    code: dto.code,
    title: dto.title,
    activity: dto.activity,
    block: dto.block || "—",
    farm: dto.farmName || "—",
    vendor: dto.vendorName || "Unassigned",
    assignee: dto.vendorName || "Unassigned",
    initials: (dto.vendorName || "WO")
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    status,
    week: dto.week,
    etb: dto.plannedCostEtb,
    progress,
    ticketsDone: dto.ticketsDone,
    ticketsTotal: dto.ticketsTotal,
    afe: dto.afeId || "—",
    due: dto.week,
    attention: (dto.attention === "insurance" ? "insurance" : "none") as Attention,
    monthlyWoId: null,
    // Activation writes "From <monthly code>" into the instructions — the only link the API carries
    monthlyWoCode: /\bFrom (MWO-[A-Za-z0-9-]+)/.exec(dto.instructions || "")?.[1] ?? null,
    monthlyLineId: null,
    weeklyPlanId: null,
    weeklyPlanLineId: null,
    manualsRef: dto.instructions || "",
    vendorOutcome: dto.vendorOutcome ?? null,
    vendorNote: dto.vendorNote || "",
    spxApproved: dto.statusRaw === "closed",
  };
}

export function mapTicketDto(dto: FieldTicketDto, wo?: WorkOrderDto | null): FieldTicket {
  return {
    id: dto.id,
    code: dto.id.slice(0, 8).toUpperCase(),
    workOrderId: dto.workOrderId,
    title: dto.activityRecorded,
    description: dto.materialsUsed || "",
    block: wo?.block || "—",
    vendor: wo?.vendorName || dto.submittedByName || "—",
    vendorLead: dto.submittedByName || "—",
    siteOwner: "—",
    assetOwner: "—",
    assignedBy: dto.submittedByName || "—",
    status: apiTicketToUi(dto.status),
    hours: dto.actualMandays ?? 0,
    amountEtb: dto.actualCostEtb ?? 0,
    due: dto.ticketDate.slice(0, 10),
    createdAt: dto.createdAt,
    events: [],
  };
}

// Server push (LiveUpdates) refreshes these instantly; polling is only a fallback
const LIVE_POLL_MS = 60_000;

export function useWorkOrders(
  enabled = true,
  options?: { refetchIntervalMs?: number | false },
) {
  const interval =
    options?.refetchIntervalMs === false
      ? false
      : (options?.refetchIntervalMs ?? LIVE_POLL_MS);

  return useQuery({
    queryKey: queryKeys.workOrders.list(),
    queryFn: () => listWorkOrders(),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: enabled ? interval : false,
  });
}

function useInvalidateWorkOrders() {
  const qc = useQueryClient();
  return async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.workOrders.all });
    void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
  };
}

export function useCreateWorkOrder() {
  const invalidate = useInvalidateWorkOrders();
  return useMutation({
    mutationFn: createWorkOrder,
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useReportWorkOrderOutcome() {
  const invalidate = useInvalidateWorkOrders();
  return useMutation({
    mutationFn: ({ id, outcome, note }: { id: string; outcome: "done" | "not_done"; note?: string }) =>
      reportWorkOrderOutcome(id, outcome, note),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useReviewWorkOrder() {
  const invalidate = useInvalidateWorkOrders();
  return useMutation({
    mutationFn: ({ id, decision, comment }: { id: string; decision: "approve" | "return"; comment?: string }) =>
      reviewWorkOrder(id, decision, comment),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useTransitionWorkOrder() {
  const invalidate = useInvalidateWorkOrders();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkOrderStatus }) =>
      transitionWorkOrder(id, status),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useUpdateWorkOrder() {
  const invalidate = useInvalidateWorkOrders();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      updateWorkOrder(id, input),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useCreateFieldTicket() {
  const invalidate = useInvalidateWorkOrders();
  return useMutation({
    mutationFn: ({
      workOrderId,
      input,
    }: {
      workOrderId: string;
      input: Parameters<typeof createFieldTicket>[1];
    }) => createFieldTicket(workOrderId, input),
    onSuccess: async () => {
      await invalidate();
    },
  });
}

export function useTransitionFieldTicket() {
  const invalidate = useInvalidateWorkOrders();
  return useMutation({
    mutationFn: ({
      ticketId,
      status,
      comment,
    }: {
      ticketId: string;
      status: FieldTicketStatus;
      comment?: string;
    }) => transitionFieldTicket(ticketId, status, comment),
    onSuccess: async () => {
      await invalidate();
    },
  });
}
