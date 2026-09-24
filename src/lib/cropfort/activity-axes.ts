/**
 * Dual axes for activities (frontend). API `tier` = operational area until backend split.
 */
export type OperationalArea = "core_ops" | "project" | "intervention";
export type CostKind = "labor" | "materials" | "services";

export function operationalAreaFromLegacyTier(tier: number): OperationalArea {
  if (tier === 2) return "project";
  if (tier === 3) return "intervention";
  return "core_ops";
}

export function operationalAreaLabel(area: OperationalArea): string {
  if (area === "core_ops") return "Core Operations";
  if (area === "project") return "Projects";
  return "Interventions";
}

export function resolveCostKind(input: {
  id: string;
  category?: string | null;
  name?: string | null;
  costKind?: string | null;
}): CostKind {
  if (input.costKind === "labor" || input.costKind === "materials" || input.costKind === "services") {
    return input.costKind;
  }
  const blob = `${input.category ?? ""} ${input.name ?? ""}`.toLowerCase();
  if (/\b(material|fertiliz|chemical|input|supply)\b/.test(blob)) return "materials";
  if (/\b(service|outsourc|contract|transport|haulage)\b/.test(blob)) return "services";
  return "labor";
}

export function enrichActivityAxes(row: {
  id: string;
  tier: number;
  category?: string | null;
  name?: string | null;
  costKind?: string | null;
}) {
  return {
    operationalArea: operationalAreaFromLegacyTier(row.tier),
    costKind: resolveCostKind(row),
    legacyTier: row.tier,
  };
}
