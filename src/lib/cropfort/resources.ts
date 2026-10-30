"use client";

import { useMemo } from "react";
import type { ActivityResource, ActivityResourceKind } from "@/lib/api/activities";
import { useActivities } from "@/lib/query/hooks/use-activities";

/** One labour / material / service total: what's planned, and what was reported (when known). */
export type ResourceLine = {
  kind: ActivityResourceKind;
  name: string;
  unit: string;
  planned: number;
  actual?: number | null;
};

export const RESOURCE_KIND_LABEL: Record<ActivityResourceKind, string> = {
  labour: "Labour",
  material: "Materials",
  service: "Services",
};

const KIND_ORDER: ActivityResourceKind[] = ["labour", "material", "service"];

const round = (n: number) => Math.round(n * 100) / 100;

/** Labour is always counted in man-days. */
export const unitOf = (r: { kind: ActivityResourceKind; unit: string }) => (r.kind === "labour" ? "man-days" : r.unit);

/** What `qty` units of an activity need, from its per-unit labour, materials and services. */
export function resourcesFor(resources: ActivityResource[] | undefined, qty: number): ResourceLine[] {
  return (resources ?? [])
    .filter((r) => r.name && r.qty != null)
    .map((r) => ({ kind: r.kind, name: r.name, unit: unitOf(r), planned: round((r.qty ?? 0) * qty) }));
}

/** Adds lines with the same kind, name and unit together (planned and actual). */
export function sumResources(lines: ResourceLine[]): ResourceLine[] {
  const map = new Map<string, ResourceLine>();
  for (const l of lines) {
    const key = `${l.kind}|${l.name.trim().toLowerCase()}|${l.unit.trim().toLowerCase()}`;
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { ...l, planned: round(l.planned), actual: l.actual ?? null });
      continue;
    }
    cur.planned = round(cur.planned + l.planned);
    if (l.actual != null) cur.actual = round((cur.actual ?? 0) + l.actual);
  }
  return [...map.values()].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name),
  );
}

/** Per-unit needs of every activity, by activity id. */
export function useActivityResources() {
  const query = useActivities({ includeInactive: true });
  const byId = useMemo(
    () => new Map((query.data ?? []).map((a) => [a.id, a.resources ?? []] as const)),
    [query.data],
  );
  return { byId, loading: query.isLoading };
}

/** Totals for a set of planned activities (activity id + annual quantity). */
export function planResources(
  activities: { activityId: string; plannedQty: number; included?: boolean }[],
  byId: Map<string, ActivityResource[]>,
  share = (_a: { activityId: string }) => 1,
): ResourceLine[] {
  return sumResources(
    activities
      .filter((a) => a.included !== false)
      .flatMap((a) => resourcesFor(byId.get(a.activityId), (a.plannedQty || 0) * share(a))),
  );
}
