"use client";

import type { QueryClient } from "@tanstack/react-query";

type Row = { id: string };
type Snapshot = [readonly unknown[], unknown][];

/** True when a list's query key filters on this status (e.g. ["…", "list", "submitted"] or { status }). */
function keyFiltersOn(key: readonly unknown[], status: string) {
  return key.some(
    (part) =>
      part === status ||
      (typeof part === "object" && part !== null && (part as { status?: unknown }).status === status),
  );
}

/**
 * Moves one row to a new status in every cached list under `rootKey` straight away: it leaves the
 * lists filtered on `fromStatus` (e.g. the approvals queue) and is patched in the others.
 * Returns a snapshot for rolling back if the server refuses.
 */
export async function moveRowStatus<T extends Row>(
  qc: QueryClient,
  rootKey: readonly unknown[],
  id: string,
  fromStatus: string,
  patch: Partial<T>,
): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: rootKey });
  const previous = qc.getQueriesData({ queryKey: rootKey });
  for (const [key, data] of previous) {
    if (!Array.isArray(data)) continue;
    const rows = data as T[];
    qc.setQueryData(
      key,
      keyFiltersOn(key, fromStatus)
        ? rows.filter((row) => row.id !== id)
        : rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }
  return previous;
}

export function restoreSnapshot(qc: QueryClient, snapshot?: Snapshot) {
  for (const [key, data] of snapshot ?? []) qc.setQueryData(key, data);
}
