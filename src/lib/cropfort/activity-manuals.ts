/**
 * Resolve operating manuals for activities (RB03.6 / RB09.3).
 * Prefer activity library fields; fall back to stable code-based refs.
 */
import {
  enrichActivityAxes,
  type OperationalArea,
} from "@/lib/cropfort/activity-axes";

export type ActivityManualSource = {
  id?: string;
  code?: string | null;
  name?: string | null;
  category?: string | null;
  tier?: number;
  manualRef?: string | null;
  manualTitle?: string | null;
  serviceType?: OperationalArea | string | null;
};

const CODE_MANUALS: Record<string, string> = {
  "LAB-PRN": "Canopy Manual §4 — Selective pruning",
  "LAB-WED": "Weeding SOP §2",
  "LAB-HAR": "Harvest Manual §1",
  "MAT-FER": "Fertiliser Application Manual §3",
  "SVC-SCO": "Scouting & Monitoring Manual §2",
};

export function resolveManualRef(activity: ActivityManualSource): string {
  const explicit = (activity.manualRef || activity.manualTitle || "").trim();
  if (explicit) return explicit;
  const code = (activity.code || "").toUpperCase();
  if (code && CODE_MANUALS[code]) return CODE_MANUALS[code];
  const name = (activity.name || "Activity").trim();
  return `${name} — Operating Manual`;
}

export function resolveServiceType(activity: ActivityManualSource): OperationalArea {
  if (
    activity.serviceType === "core_ops" ||
    activity.serviceType === "project" ||
    activity.serviceType === "intervention"
  ) {
    return activity.serviceType;
  }
  if (typeof activity.tier === "number") {
    return enrichActivityAxes({
      id: activity.id || "",
      tier: activity.tier,
      name: activity.name,
    }).operationalArea;
  }
  const blob = `${activity.category ?? ""} ${activity.name ?? ""}`.toLowerCase();
  if (/\b(project|replant|capital)\b/.test(blob)) return "project";
  if (/\b(intervention|emergency|outbreak)\b/.test(blob)) return "intervention";
  return "core_ops";
}

/** Gate: selected activities need a non-empty manual before plan submit (RB09.3). */
export function activitiesMissingManuals(
  activities: ActivityManualSource[],
): ActivityManualSource[] {
  return activities.filter((a) => !resolveManualRef(a));
}
