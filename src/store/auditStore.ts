import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuditLogEntry } from "@/types/org";

interface AuditStore {
  logs: AuditLogEntry[];
  log: (entry: Omit<AuditLogEntry, "id" | "createdAt" | "immutable" | "userName"> & { userName?: string }) => void;
  getLogs: (filters?: {
    organizationId?: string;
    branchId?: string;
    module?: string;
    entityType?: string;
    userId?: string;
    limit?: number;
  }) => AuditLogEntry[];
}

export const useAuditStore = create<AuditStore>()(
  persist(
    (set, get) => ({
      logs: [],

      log: (entry) => {
        const row: AuditLogEntry = {
          ...entry,
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userName: entry.userName ?? entry.userId,
          createdAt: Date.now(),
          immutable: true,
        };
        set((s) => ({ logs: [row, ...s.logs].slice(0, 5000) }));
      },

      getLogs: (filters) => {
        let rows = get().logs;
        if (filters?.organizationId) rows = rows.filter((l) => l.organizationId === filters.organizationId);
        if (filters?.branchId) rows = rows.filter((l) => l.branchId === filters.branchId);
        if (filters?.module) rows = rows.filter((l) => l.module === filters.module);
        if (filters?.entityType) rows = rows.filter((l) => l.entityType === filters.entityType);
        if (filters?.userId) rows = rows.filter((l) => l.userId === filters.userId);
        return rows.slice(0, filters?.limit ?? 200);
      },
    }),
    { name: "hestia-pharmacy-audit" }
  )
);
