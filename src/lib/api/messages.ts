import { apiFetch } from "@/lib/api/http";
import type { CommMessage, CommThread } from "@/store/communicationsStore";

export type CommThreadDto = CommThread & { messages?: CommMessage[] };

export function listMessageThreads() {
  return apiFetch<CommThreadDto[]>("/message-threads");
}

export function createMessageThread(input: {
  subject: string;
  counterparty: "vendor" | "site_owner" | "asset_owner";
  relatedType?: string;
  relatedCode?: string | null;
  body: string;
}) {
  return apiFetch<CommThreadDto>("/message-threads", { method: "POST", body: input });
}

export function postThreadMessage(threadId: string, body: string) {
  return apiFetch<CommMessage>(`/message-threads/${threadId}/messages`, {
    method: "POST",
    body: { body },
  });
}

export function closeMessageThread(threadId: string) {
  return apiFetch<CommThreadDto>(`/message-threads/${threadId}/close`, { method: "POST" });
}

export function reopenMessageThread(threadId: string) {
  return apiFetch<CommThreadDto>(`/message-threads/${threadId}/reopen`, { method: "POST" });
}
