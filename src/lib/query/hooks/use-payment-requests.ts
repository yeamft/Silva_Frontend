"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  authorizeSettlement,
  createPaymentRequest,
  listPaymentRequests,
  listSettlements,
  markSettlementSettled,
  returnPaymentRequest,
  verifyPaymentRequest,
} from "@/lib/api/payment-requests";
import { queryKeys } from "@/lib/query/keys";

const LIVE_POLL_MS = 5_000;

export function usePaymentRequests(enabled = true, status?: string) {
  return useQuery({
    queryKey: queryKeys.paymentRequests.list(status),
    queryFn: () => listPaymentRequests(status ? { status } : undefined),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: enabled ? LIVE_POLL_MS : false,
  });
}

export function useSettlements(enabled = true) {
  return useQuery({
    queryKey: queryKeys.paymentRequests.settlements(),
    queryFn: () => listSettlements(),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: enabled ? LIVE_POLL_MS : false,
  });
}

function useInvalidateCommercial() {
  const qc = useQueryClient();
  return async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.paymentRequests.all });
    void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
  };
}

export function useCreatePaymentRequest() {
  const invalidate = useInvalidateCommercial();
  return useMutation({
    mutationFn: (fieldTicketId: string) => createPaymentRequest(fieldTicketId),
    onSuccess: () => invalidate(),
  });
}

export function useVerifyPaymentRequest() {
  const invalidate = useInvalidateCommercial();
  return useMutation({
    mutationFn: (id: string) => verifyPaymentRequest(id),
    onSuccess: () => invalidate(),
  });
}

export function useReturnPaymentRequest() {
  const invalidate = useInvalidateCommercial();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      returnPaymentRequest(id, comment),
    onSuccess: () => invalidate(),
  });
}

export function useAuthorizeSettlement() {
  const invalidate = useInvalidateCommercial();
  return useMutation({
    mutationFn: ({
      paymentRequestId,
      narrative,
    }: {
      paymentRequestId: string;
      narrative?: string;
    }) => authorizeSettlement(paymentRequestId, narrative),
    onSuccess: () => invalidate(),
  });
}

export function useMarkSettlementSettled() {
  const invalidate = useInvalidateCommercial();
  return useMutation({
    mutationFn: (id: string) => markSettlementSettled(id),
    onSuccess: () => invalidate(),
  });
}
