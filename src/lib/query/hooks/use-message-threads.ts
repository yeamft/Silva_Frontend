"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeMessageThread,
  createMessageThread,
  listMessageThreads,
  postThreadMessage,
  reopenMessageThread,
} from "@/lib/api/messages";
import { queryKeys } from "@/lib/query/keys";

export function useMessageThreads(enabled = true) {
  return useQuery({
    queryKey: queryKeys.messageThreads.list(),
    queryFn: listMessageThreads,
    enabled,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: queryKeys.messageThreads.all });
}

export function useCreateMessageThread() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: createMessageThread,
    onSuccess: invalidate,
  });
}

export function usePostThreadMessage() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ threadId, body }: { threadId: string; body: string }) =>
      postThreadMessage(threadId, body),
    onSuccess: invalidate,
  });
}

export function useCloseMessageThread() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (threadId: string) => closeMessageThread(threadId),
    onSuccess: invalidate,
  });
}

export function useReopenMessageThread() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (threadId: string) => reopenMessageThread(threadId),
    onSuccess: invalidate,
  });
}
