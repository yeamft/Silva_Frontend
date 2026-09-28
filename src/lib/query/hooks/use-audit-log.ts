"use client";

import { listAuditLog } from "@/lib/api/audit-log";
import { queryKeys } from "@/lib/query/keys";
import { useQuery } from "@tanstack/react-query";

export function useAuditLog(
  enabled = true,
  params?: { entityType?: string; entityId?: string; limit?: number },
) {
  return useQuery({
    queryKey: [...queryKeys.auditLog.list(params)],
    queryFn: () => listAuditLog(params),
    enabled,
  });
}
