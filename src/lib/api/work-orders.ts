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

export type CompletionItemStatus = "completed" | "partial" | "not_done";

export type CompletionItem = {
  label: string;
  plannedQty: number | null;
  unit: string;
  doneQty: number | null;
  status: CompletionItemStatus;
  /** Required when the item isn't completed. */
  reason: string;
  /** Optional note on the activity. */
  remark?: string;
  /** Actual − planned (set by the server). */
  variance?: number | null;
};

/** Vendor's report when sending a work order for review. */
export type CompletionReport = {
  narrative: string;
  startedOn: string | null;
  finishedOn: string | null;
  items: CompletionItem[];
  /** Labour, materials and services: planned for the job and actually used. */
  resources?: { kind: "labour" | "material" | "service"; name: string; unit: string; planned: number | null; actual: number | null }[];
  workers: number | null;
  mandays: number | null;
  materialsUsed: string;
  /** Hired services: tractor, transport, spraying contractor… */
  servicesUsed?: string;
  issues: string;
  safety: string;
  nextSteps: string;
  submittedBy?: string | null;
  submittedAt?: string;
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
  vendorOutcome?: "done" | "partial" | "not_done" | "returned" | null;
  vendorNote?: string;
  vendorReportedAt?: string | null;
  completionReport?: CompletionReport | null;
  plannedQty?: number | null;
  unit?: string | null;
  activityId?: string | null;
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

/** Vendor reports an issued order: "done" completes it, "not_done" keeps it open with a reason. */
export function reportWorkOrderOutcome(id: string, outcome: "done" | "not_done", note?: string) {
  return apiFetch<WorkOrderDto>(`/work-orders/${id}/vendor-report`, {
    method: "POST",
    body: note ? { outcome, note } : { outcome },
  });
}

/** Vendor sends the completion report; the work order goes to SPX for review. */
export function submitWorkOrderCompletion(
  id: string,
  report: Omit<CompletionReport, "submittedBy" | "submittedAt" | "startedOn" | "finishedOn"> & {
    startedOn?: string;
    finishedOn?: string;
  },
) {
  return apiFetch<WorkOrderDto>(`/work-orders/${id}/completion-report`, { method: "POST", body: report });
}

/** SPX reviews work sent by the vendor: approve closes it, return sends it back with a comment. */
export function reviewWorkOrder(id: string, decision: "approve" | "return", comment?: string) {
  return apiFetch<WorkOrderDto>(`/work-orders/${id}/review`, {
    method: "POST",
    body: comment ? { decision, comment } : { decision },
  });
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
