import { apiFetch } from "@/lib/api/http";
import { ApiError } from "@/lib/api/types";

export type AppNotification = {
  id: string;
  programId: string | null;
  triggerType: string;
  entityType: string;
  entityId: string;
  message: string;
  acknowledged: boolean;
  sentAt: string | null;
  href: string | null;
};

function asError(err: unknown): Error {
  if (err instanceof ApiError) return new Error(err.message);
  if (err instanceof Error) return err;
  return new Error("Request failed");
}

export async function getNotifications(): Promise<AppNotification[]> {
  try {
    return await apiFetch<AppNotification[]>("/notifications");
  } catch (err) {
    throw asError(err);
  }
}

export async function acknowledgeNotification(id: string): Promise<AppNotification> {
  try {
    return await apiFetch<AppNotification>(`/notifications/${id}/acknowledge`, {
      method: "POST",
      body: {},
    });
  } catch (err) {
    throw asError(err);
  }
}

export async function acknowledgeAllNotifications(): Promise<void> {
  try {
    await apiFetch("/notifications/acknowledge-all", { method: "POST", body: {} });
  } catch (err) {
    throw asError(err);
  }
}
