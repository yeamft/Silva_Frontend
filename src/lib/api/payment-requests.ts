/**
 * Payment requests & settlements — `/api/v1/payment-requests`.
 */
import { apiFetch } from "@/lib/api/http";
import type { OwnerSettlement, PaymentRequest } from "@/types/cropfort-commercial";

export type PaymentRequestDto = PaymentRequest;
export type SettlementDto = OwnerSettlement;

export function listPaymentRequests(params?: { status?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  const qs = q.toString();
  return apiFetch<PaymentRequestDto[]>(`/payment-requests${qs ? `?${qs}` : ""}`);
}

export function createPaymentRequest(fieldTicketId: string) {
  return apiFetch<PaymentRequestDto>("/payment-requests", {
    method: "POST",
    body: { fieldTicketId },
  });
}

export function verifyPaymentRequest(id: string) {
  return apiFetch<PaymentRequestDto>(`/payment-requests/${id}/verify`, { method: "POST" });
}

export function returnPaymentRequest(id: string, comment?: string) {
  return apiFetch<PaymentRequestDto>(`/payment-requests/${id}/return`, {
    method: "POST",
    body: { comment },
  });
}

export function authorizeSettlement(paymentRequestId: string, narrative?: string) {
  return apiFetch<SettlementDto>(`/payment-requests/${paymentRequestId}/authorize-settlement`, {
    method: "POST",
    body: { narrative },
  });
}

export function listSettlements() {
  return apiFetch<SettlementDto[]>("/payment-requests/settlements");
}

export function markSettlementSettled(id: string) {
  return apiFetch<SettlementDto>(`/payment-requests/settlements/${id}/settle`, {
    method: "POST",
  });
}
