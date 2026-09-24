/** CropFort commercial control — payment requests & owner settlements (ETB). */

export type PaymentRequestStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "returned"
  | "settled";

export type SettlementStatus = "draft" | "authorized" | "settled";

export type PaymentRequestType = "field_ticket" | "milestone" | "other";

export type SettlementType = "vendor_pay" | "owner_recharge" | "other";

export type PaymentRequest = {
  id: string;
  code: string;
  programId: string;
  workOrderId: string;
  workOrderCode: string;
  fieldTicketId: string;
  fieldTicketCode: string;
  ticketTitle: string;
  block: string;
  vendor: string;
  type: PaymentRequestType;
  amountEtb: number;
  status: PaymentRequestStatus;
  requestedByUserId: string;
  requestedByName: string;
  submittedAt: string | null;
  verifiedByUserId: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  returnComment: string | null;
  settlementId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OwnerSettlement = {
  id: string;
  code: string;
  programId: string;
  workOrderId: string;
  paymentRequestId: string;
  paymentRequestCode: string;
  type: SettlementType;
  payee: string;
  amountEtb: number;
  status: SettlementStatus;
  narrative: string;
  /** Raw ticket payload withheld from Silva views. */
  ticketSummary: string;
  authorizedByUserId: string | null;
  authorizedByName: string | null;
  authorizedAt: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
