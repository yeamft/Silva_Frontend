/**
 * Server audit trail — `GET /api/v1/audit-log`.
 */
import { apiFetch } from "@/lib/api/http";

export type AuditLogEntry = {
  id: string;
  programId: string;
  at: string;
  actorUserId: string | null;
  actorName: string | null;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  detail: string;
};

export function listAuditLog(params?: {
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.entityType) q.set("entityType", params.entityType);
  if (params?.entityId) q.set("entityId", params.entityId);
  if (params?.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiFetch<AuditLogEntry[]>(`/audit-log${qs ? `?${qs}` : ""}`);
}
