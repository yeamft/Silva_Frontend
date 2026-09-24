import type { DailyFieldRecord, Schedule5Config } from "@/types/agronomic-cycle";
import { DEFAULT_SCHEDULE5 } from "@/types/agronomic-cycle";

export type Schedule5Issue = {
  code: string;
  message: string;
  blocking: boolean;
};

export function computeVariancePct(plannedQty: number, actualQty: number): number {
  if (plannedQty <= 0) return actualQty === 0 ? 0 : 100;
  return Math.round(((actualQty - plannedQty) / plannedQty) * 1000) / 10;
}

/** Sch. 5 Daily Field Record validation criteria. */
export function validateDfr(
  record: Pick<
    DailyFieldRecord,
    | "actualQty"
    | "plannedQty"
    | "unit"
    | "laborHours"
    | "blockId"
    | "notes"
    | "activityId"
    | "weeklyPlanLineId"
  > & { expectedBlockId?: string },
  config: Schedule5Config = DEFAULT_SCHEDULE5,
): Schedule5Issue[] {
  const issues: Schedule5Issue[] = [];
  const variance = computeVariancePct(record.plannedQty, record.actualQty);

  if (!record.weeklyPlanLineId) {
    issues.push({ code: "missing_line", message: "DFR must link to a weekly plan line", blocking: true });
  }
  if (!record.activityId) {
    issues.push({ code: "missing_activity", message: "Activity is required", blocking: true });
  }
  if (!record.unit?.trim()) {
    issues.push({ code: "missing_unit", message: "Unit of measure is required", blocking: true });
  }
  if (record.actualQty < 0) {
    issues.push({ code: "qty_negative", message: "Actual quantity cannot be negative", blocking: true });
  }
  if (config.requireLaborHours && record.laborHours <= 0) {
    issues.push({ code: "labor_hours", message: "Labor hours are required", blocking: true });
  }
  if (config.requireBlockMatch && record.expectedBlockId && record.blockId !== record.expectedBlockId) {
    issues.push({
      code: "block_mismatch",
      message: "Block does not match the weekly plan line",
      blocking: true,
    });
  }
  if (Math.abs(variance) > config.qtyVariancePctMax) {
    issues.push({
      code: "qty_variance",
      message: `Quantity variance ${variance}% exceeds ±${config.qtyVariancePctMax}%`,
      blocking: true,
    });
    if (config.requireNotesIfVariance && !record.notes.trim()) {
      issues.push({
        code: "variance_notes",
        message: "Notes are required when variance exceeds threshold",
        blocking: true,
      });
    }
  }
  return issues;
}

export function dfrCanValidate(
  record: Parameters<typeof validateDfr>[0],
  config?: Schedule5Config,
): boolean {
  return validateDfr(record, config).filter((i) => i.blocking).length === 0;
}
