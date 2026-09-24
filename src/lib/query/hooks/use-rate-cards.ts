"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addRateCardLineItem,
  approveRateCard,
  archiveRateCard,
  createRateCard,
  deleteRateCardLineItem,
  getRateCard,
  getRateCards,
  getRateCardsSummary,
  publishRateCard,
  rejectRateCard,
  restoreRateCard,
  submitRateCard,
  updateRateCard,
  updateRateCardLineItem,
} from "@/lib/api/rate-cards";
import { queryKeys } from "@/lib/query/keys";

export function useRateCards(status?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rateCards.list(status),
    queryFn: () => getRateCards(status),
    enabled,
  });
}

export function useRateCardsSummary(enabled = true) {
  return useQuery({
    queryKey: queryKeys.rateCards.summary(),
    queryFn: getRateCardsSummary,
    enabled,
  });
}

export function useRateCard(id: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.rateCards.detail(id || ""),
    queryFn: () => getRateCard(id!),
    enabled: Boolean(id) && enabled,
  });
}

function useInvalidateRateCards() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.rateCards.all });
}

export function useCreateRateCard() {
  const invalidate = useInvalidateRateCards();
  return useMutation({
    mutationFn: createRateCard,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateRateCard() {
  const invalidate = useInvalidateRateCards();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateRateCard>[1] }) =>
      updateRateCard(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useAddRateCardLineItem() {
  const invalidate = useInvalidateRateCards();
  return useMutation({
    mutationFn: ({
      cardId,
      input,
    }: {
      cardId: string;
      input: Parameters<typeof addRateCardLineItem>[1];
    }) => addRateCardLineItem(cardId, input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateRateCardLineItem() {
  const invalidate = useInvalidateRateCards();
  return useMutation({
    mutationFn: ({
      cardId,
      lineId,
      input,
    }: {
      cardId: string;
      lineId: string;
      input: Record<string, unknown>;
    }) => updateRateCardLineItem(cardId, lineId, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteRateCardLineItem() {
  const invalidate = useInvalidateRateCards();
  return useMutation({
    mutationFn: ({ cardId, lineId }: { cardId: string; lineId: string }) =>
      deleteRateCardLineItem(cardId, lineId),
    onSuccess: () => invalidate(),
  });
}

export function useSubmitRateCard() {
  const invalidate = useInvalidateRateCards();
  return useMutation({
    mutationFn: submitRateCard,
    onSuccess: () => invalidate(),
  });
}

export function useApproveRateCardDoc() {
  const invalidate = useInvalidateRateCards();
  return useMutation({
    mutationFn: approveRateCard,
    onSuccess: () => invalidate(),
  });
}

export function useRejectRateCard() {
  const invalidate = useInvalidateRateCards();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => rejectRateCard(id, comment),
    onSuccess: () => invalidate(),
  });
}

export function usePublishRateCard() {
  const invalidate = useInvalidateRateCards();
  return useMutation({
    mutationFn: publishRateCard,
    onSuccess: () => invalidate(),
  });
}

export function useArchiveRateCardDoc() {
  const invalidate = useInvalidateRateCards();
  return useMutation({
    mutationFn: archiveRateCard,
    onSuccess: () => invalidate(),
  });
}

export function useRestoreRateCard() {
  const invalidate = useInvalidateRateCards();
  return useMutation({
    mutationFn: restoreRateCard,
    onSuccess: () => invalidate(),
  });
}
