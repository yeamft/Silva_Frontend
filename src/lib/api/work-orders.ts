/**
 * Work orders + field tickets — `/api/v1/work-orders`.
 */
import { apiFetch } from "@/lib/api/http";

export type WorkOrderStatus = "draft" | "issued" | "in_progress" | "complete" | "closed";

export type FieldTicketStatus =
  | "draft"
  | "submitted"
  | "vendor_reviewed"
  | "validated"
  | "rejected";

export type FieldTicketDto = {
  id: string;
  programId: string;
  workOrderId: string;
  submittedByUserId: string;
  submittedByName: string | null;
  activityRecorded: string;
  areaHa: number;
  laborCount: number;
  materialsUsed: string;
  actualQuantity: number | null;
  actualMandays: number | null;
  actualCostEtb: number | null;
  ticketDate: string;
  status: FieldTicketStatus;
  signedOff: boolean;
  signedOffAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkOrderDto = {
  id: string;
  programId: string;
  afeId: string | null;
  code: string;
  title: string;
  category: string;
  activity: string;
  tier: string;
  weekStart: number;
  weekEnd: number;
  week: string;
  plannedCostEtb: number;
  farmEstateId: string | null;
  farmName: string | null;
  instructions: string;
  assignedVendorId: string | null;
  vendorName: string | null;
  insuranceOnFile?: boolean | null;
  insuranceExpiry?: string | null;
  insuranceGatePassed?: boolean;
  attention?: "insurance" | null;
  status: WorkOrderStatus;
  statusRaw: string;
  blocks: { blockId: string; blockCode: string | null; blockName: string | null }[];
  block: string | null;
  ticketsDone: number;
  ticketsTotal: number;
  tickets: FieldTicketDto[];
  createdAt: string;
  updatedAt: string;
};

export function listWorkOrders(params?: { status?: string; farmEstateId?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.farmEstateId) q.set("farmEstateId", params.farmEstateId);
  const qs = q.toString();
  return apiFetch<WorkOrderDto[]>(`/work-orders${qs ? `?${qs}` : ""}`);
}

export function getWorkOrder(id: string) {
  return apiFetch<WorkOrderDto>(`/work-orders/${id}`);
}

export function createWorkOrder(input: {
  title?: string;
  activity?: string;
  category?: string;
  weekStart?: number;
  weekEnd?: number;
  plannedCostEtb?: number;
  farmEstateId?: string | null;
  assignedVendorId?: string | null;
  afeId?: string | null;
  cropfortAfeId?: string | null;
  blockIds?: string[];
  instructions?: string;
}) {
  return apiFetch<WorkOrderDto>("/work-orders", { method: "POST", body: input });
}

export function updateWorkOrder(id: string, input: Record<string, unknown>) {
  return apiFetch<WorkOrderDto>(`/work-orders/${id}`, { method: "PATCH", body: input });
}

export function transitionWorkOrder(id: string, status: WorkOrderStatus) {
  return apiFetch<WorkOrderDto>(`/work-orders/${id}/transition`, {
    method: "POST",
    body: { status },
  });
}

export function createFieldTicket(
  workOrderId: string,
  input: {
    activityRecorded?: string;
    areaHa?: number;
    laborCount?: number;
    materialsUsed?: string;
    actualQuantity?: number | null;
    actualMandays?: number | null;
    unitRateEtb?: number | null;
    ticketDate?: string;
    vendorUserId?: string | null;
  },
) {
  return apiFetch<FieldTicketDto>(`/work-orders/${workOrderId}/tickets`, {
    method: "POST",
    body: input,
  });
}

export function transitionFieldTicket(
  ticketId: string,
  status: FieldTicketStatus,
  comment?: string,
) {
  return apiFetch<FieldTicketDto>(`/work-orders/tickets/${ticketId}/transition`, {
    method: "POST",
    body: { status, comment },
  });
}

export function listFieldTickets(params?: { workOrderId?: string; status?: string }) {
  const q = new URLSearchParams();
  if (params?.workOrderId) q.set("workOrderId", params.workOrderId);
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return apiFetch<FieldTicketDto[]>(`/work-orders/tickets${qs ? `?${qs}` : ""}`);
}
