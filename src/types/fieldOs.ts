/** Coffee Field OS — domain types (AFP → Settlement chain) */

export type OrgKind = "silva" | "spx" | "vendor";

export type FieldUserRole =
  | "silva_owner"
  | "spx_principal"
  | "vendor_lead";

export type Schedule3Band = "A" | "B" | "C" | "D";

export type InstrumentStatus =
  | "draft"
  | "submitted"
  | "recommended"
  | "pending_owner"
  | "approved"
  | "issued"
  | "in_progress"
  | "validated"
  | "completed"
  | "settled"
  | "released"
  | "rejected"
  | "objected";

export interface Organization {
  id: string;
  kind: OrgKind;
  name: string;
  shortName: string;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  estateName: string;
  hectares: number;
  currency: "USD";
  memberOrgIds: string[];
}

export interface VendorProfile {
  id: string;
  orgId: string;
  name: string;
  insuranceOnFile: boolean;
  insuranceExpiresOn: string;
  score: number;
  active: boolean;
}

export interface AfpLine {
  id: string;
  code: string;
  description: string;
  budgetUsd: number;
  actualUsd: number;
}

export interface AnnualFarmPlan {
  id: string;
  programId: string;
  year: number;
  title: string;
  status: InstrumentStatus;
  lines: AfpLine[];
  authoredByOrgId: string;
  approvedAt?: string;
}

export interface AuthorizationForExpenditure {
  id: string;
  programId: string;
  afpId: string;
  afpLineId: string;
  title: string;
  amountUsd: number;
  band: Schedule3Band;
  status: InstrumentStatus;
  vendorOrgId?: string;
  recommendedByOrgId: string;
  ownerApprovedAt?: string;
  issuedAt?: string;
}

export interface WorkOrder {
  id: string;
  programId: string;
  afeId: string;
  vendorOrgId: string;
  title: string;
  status: InstrumentStatus;
  issuedAt?: string;
  insuranceGatePassed: boolean;
}

export interface FieldTicket {
  id: string;
  programId: string;
  workOrderId: string;
  vendorOrgId: string;
  date: string;
  description: string;
  laborHours: number;
  amountUsd: number;
  status: InstrumentStatus;
  submittedBy: string;
  validatedAt?: string;
  validatedBy?: string;
}

export interface PaymentRequest {
  id: string;
  programId: string;
  fieldTicketId: string;
  vendorOrgId: string;
  amountUsd: number;
  status: InstrumentStatus;
  submittedBy: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface OwnerSettlement {
  id: string;
  programId: string;
  paymentRequestId: string;
  amountUsd: number;
  status: InstrumentStatus;
  releasedAt?: string;
  narrative?: string;
}

export interface SpxRevenueEntry {
  id: string;
  programId: string;
  afeId: string;
  principalAmountUsd: number;
  feeAmountUsd: number;
  note: string;
  createdAt: string;
}

export interface SeasonEvent {
  id: string;
  programId: string;
  title: string;
  startDate: string;
  endDate: string;
  kind: "harvest" | "pruning" | "fertilizer" | "other";
}
