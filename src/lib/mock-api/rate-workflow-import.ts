/**
 * Client mock: annual Benchmark Survey + Labor/Material/Outsourced Services Rate Card CSV import.
 * Preview → commit (same UX pattern as catalog import).
 */
import { mockDelay } from "@/lib/mock-api/delay";
import {
  WORKFLOW_ACTIVITIES,
  createBenchmarkSurvey,
  createRateCardFromImport,
} from "@/lib/mock-api/rate-card-workflow";
import type { StandingKind, WorkflowContextFilters } from "@/types/rate-card-workflow";

export type RateImportKind =
  | "benchmark_survey"
  | "labor_rate_card"
  | "material_rate_card"
  | "service_rate_card";

export type RateImportPreviewRow = {
  rowNumber: number;
  status: "new" | "error";
  reason?: string;
  label: string;
  detail: string;
  payload?: Record<string, unknown>;
};

export type RateImportPreview = {
  kind: RateImportKind;
  summary: { valid: number; errors: number };
  validRows: RateImportPreviewRow[];
  errorRows: RateImportPreviewRow[];
};

const TEMPLATES: Record<RateImportKind, { filename: string; headers: string[] }> = {
  benchmark_survey: {
    filename: "benchmark-rate-survey-annual.csv",
    headers: [
      "activity_id",
      "activity_name",
      "unit",
      "neighbor_farm_1_name",
      "neighbor_farm_1_rate",
      "neighbor_farm_2_name",
      "neighbor_farm_2_rate",
      "proposed_rate",
      "valid_until",
      "status_source",
    ],
  },
  labor_rate_card: {
    filename: "labor-rate-card.csv",
    headers: [
      "activity_id",
      "activity_name",
      "unit",
      "labor_norm",
      "wage_rate",
      "final_labor_cost",
      "status_source",
    ],
  },
  material_rate_card: {
    filename: "material-rate-card.csv",
    headers: ["material_id", "material_name", "unit", "rate", "status_source"],
  },
  service_rate_card: {
    filename: "outsourced-services-rate-card.csv",
    headers: [
      "Service ID",
      "Service Name",
      "Unit",
      "Indicative Rate (ETB / unit)",
      "Status / Source",
    ],
  },
};

function normalizeHeader(h: string) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[()/]/g, "")
    .replace(/_+/g, "_");
}

function headerAlias(h: string): string {
  const n = normalizeHeader(h);
  const map: Record<string, string> = {
    activity_id: "activity_id",
    activityid: "activity_id",
    activity_name: "activity_name",
    unit: "unit",
    neighbor_farm_1_name: "neighbor_farm_1_name",
    neighbor_1_name: "neighbor_farm_1_name",
    neighbor1_name: "neighbor_farm_1_name",
    neighbor_farm_1_rate: "neighbor_farm_1_rate",
    neighbor_1_rate: "neighbor_farm_1_rate",
    neighbor1_rate: "neighbor_farm_1_rate",
    neighbor_farm_2_name: "neighbor_farm_2_name",
    neighbor_2_name: "neighbor_farm_2_name",
    neighbor2_name: "neighbor_farm_2_name",
    neighbor_farm_2_rate: "neighbor_farm_2_rate",
    neighbor_2_rate: "neighbor_farm_2_rate",
    neighbor2_rate: "neighbor_farm_2_rate",
    proposed_rate: "proposed_rate",
    valid_until: "valid_until",
    status_source: "status_source",
    status: "status_source",
    source: "status_source",
    labor_norm: "labor_norm",
    labor_norm_manday_unit: "labor_norm",
    norm: "labor_norm",
    wage_rate: "wage_rate",
    wage_rate_etb_manday: "wage_rate",
    wage: "wage_rate",
    final_labor_cost: "final_labor_cost",
    final_labor_cost_unit: "final_labor_cost",
    material_id: "material_id",
    material_name: "material_name",
    rate: "rate",
    rate_etb_unit: "rate",
    service_id: "service_id",
    service_name: "service_name",
    indicative_rate: "indicative_rate",
    indicative_rate_etb_unit: "indicative_rate",
    outsourced_service_id: "service_id",
    outsourced_service_name: "service_name",
  };
  return map[n] || n;
}

function parseCsv(text: string): { rows: Record<string, string>[] } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [] };

  const split = (line: string) => {
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === "," && !inQ) {
        cells.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };

  const rawHeaders = split(lines[0]).map(headerAlias);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = split(lines[i]);
    if (cells.every((c) => !c)) continue;
    const row: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return { rows };
}

function findActivity(codeOrId: string, kind?: StandingKind) {
  const key = codeOrId.trim().toLowerCase();
  return WORKFLOW_ACTIVITIES.find((a) => {
    if (kind === "labor" && a.tier !== 1) return false;
    if (kind === "materials" && a.tier !== 2) return false;
    if (kind === "services" && a.tier !== 3) return false;
    return (
      a.id.toLowerCase() === key ||
      a.code.toLowerCase() === key ||
      a.name.toLowerCase() === key
    );
  });
}

function num(v: string | undefined): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function downloadRateImportTemplate(kind: RateImportKind) {
  const t = TEMPLATES[kind];
  const csv = `${t.headers.join(",")}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = t.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function previewRateImport(
  kind: RateImportKind,
  file: File,
  ctx: WorkflowContextFilters & { farmAreaId: string },
): Promise<RateImportPreview> {
  await mockDelay(120);
  if (ctx.farmAreaId === "all" || !ctx.farmAreaId) {
    throw new Error("Select a farm area before importing");
  }
  const text = await file.text();
  const { rows } = parseCsv(text);
  if (rows.length === 0) {
    return { kind, summary: { valid: 0, errors: 0 }, validRows: [], errorRows: [] };
  }

  const validRows: RateImportPreviewRow[] = [];
  const errorRows: RateImportPreviewRow[] = [];

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    try {
      if (kind === "benchmark_survey") {
        const code = row.activity_id || "";
        const act = findActivity(code);
        if (!act) throw new Error(`Unknown activity_id: ${code || "(empty)"}`);
        const n1 = num(row.neighbor_farm_1_rate);
        const n2 = num(row.neighbor_farm_2_rate);
        if (n1 == null || n2 == null || n1 < 0 || n2 < 0) {
          throw new Error("Neighbor rates must be non-negative numbers");
        }
        if (!row.neighbor_farm_1_name?.trim() || !row.neighbor_farm_2_name?.trim()) {
          throw new Error("Both neighbor names are required");
        }
        const kindMap: StandingKind =
          act.tier === 1 ? "labor" : act.tier === 2 ? "materials" : "services";
        const proposed = num(row.proposed_rate) ?? Math.round(((n1 + n2) / 2) * 100) / 100;
        validRows.push({
          rowNumber,
          status: "new",
          label: `${act.code} · ${act.name}`,
          detail: `N1 ${n1} / N2 ${n2} → proposed ${proposed}`,
          payload: {
            kind: kindMap,
            activityId: act.id,
            neighbor1Name: row.neighbor_farm_1_name.trim(),
            neighbor2Name: row.neighbor_farm_2_name.trim(),
            neighbor1Rate: n1,
            neighbor2Rate: n2,
            proposedRate: proposed,
            availableTo: row.valid_until?.trim() || null,
            sourceEvidence: row.status_source?.trim() || "Benchmark survey import",
            notes: "",
          },
        });
        return;
      }

      if (kind === "labor_rate_card") {
        const act = findActivity(row.activity_id || "", "labor");
        if (!act) throw new Error(`Unknown labor activity_id: ${row.activity_id || "(empty)"}`);
        const norm = num(row.labor_norm);
        const wage = num(row.wage_rate);
        if (norm == null || wage == null || norm < 0 || wage < 0) {
          throw new Error("labor_norm and wage_rate required");
        }
        const computed = Math.round(norm * wage * 100) / 100;
        const finalCost = num(row.final_labor_cost) ?? computed;
        validRows.push({
          rowNumber,
          status: "new",
          label: `${act.code} · ${act.name}`,
          detail: `${norm} × ${wage} = ${computed}; final ${finalCost}`,
          payload: {
            kind: "labor" as StandingKind,
            activityId: act.id,
            norm,
            wage,
            proposedRate: finalCost,
            sourceBasis: row.status_source?.trim() || "Labor rate card import",
          },
        });
        return;
      }

      if (kind === "material_rate_card") {
        const act = findActivity(row.material_id || row.activity_id || "", "materials");
        if (!act) throw new Error(`Unknown material_id: ${row.material_id || "(empty)"}`);
        const rate = num(row.rate);
        if (rate == null || rate < 0) throw new Error("rate must be a non-negative number");
        validRows.push({
          rowNumber,
          status: "new",
          label: `${act.code} · ${act.name}`,
          detail: `ETB ${rate} / ${act.uom}`,
          payload: {
            kind: "materials" as StandingKind,
            activityId: act.id,
            proposedRate: rate,
            sourceBasis: row.status_source?.trim() || "Material rate card import",
          },
        });
        return;
      }

      const act = findActivity(row.service_id || row.activity_id || "", "services");
      if (!act) throw new Error(`Unknown service_id: ${row.service_id || "(empty)"}`);
      const rate = num(row.indicative_rate ?? row.rate);
      if (rate == null || rate < 0) throw new Error("indicative_rate must be a non-negative number");
      validRows.push({
        rowNumber,
        status: "new",
        label: `${act.code} · ${act.name}`,
        detail: `ETB ${rate} / ${act.uom}`,
        payload: {
          kind: "services" as StandingKind,
          activityId: act.id,
          proposedRate: rate,
          sourceBasis: row.status_source?.trim() || "Outsourced services rate card import",
        },
      });
    } catch (err) {
      errorRows.push({
        rowNumber,
        status: "error",
        reason: err instanceof Error ? err.message : "Invalid row",
        label: row.activity_id || row.material_id || row.service_id || `Row ${rowNumber}`,
        detail: "",
      });
    }
  });

  return {
    kind,
    summary: { valid: validRows.length, errors: errorRows.length },
    validRows,
    errorRows,
  };
}

export async function commitRateImport(
  kind: RateImportKind,
  ctx: WorkflowContextFilters & { farmAreaId: string },
  validRows: RateImportPreviewRow[],
  party: "spx" = "spx",
): Promise<{ created: number }> {
  await mockDelay(180);
  if (ctx.farmAreaId === "all" || !ctx.farmAreaId) {
    throw new Error("Select a farm area before importing");
  }
  let created = 0;
  const day = new Date().toISOString().slice(0, 10);

  for (const row of validRows) {
    const p = row.payload;
    if (!p) continue;

    if (kind === "benchmark_survey") {
      await createBenchmarkSurvey(
        {
          programId: ctx.programId,
          budgetYearId: ctx.budgetYearId,
          farmAreaId: ctx.farmAreaId,
          activityId: String(p.activityId),
          kind: p.kind as StandingKind,
          neighbor1Name: String(p.neighbor1Name),
          neighbor2Name: String(p.neighbor2Name),
          neighbor1Rate: Number(p.neighbor1Rate),
          neighbor2Rate: Number(p.neighbor2Rate),
          surveyDate: day,
          sourceEvidence: String(p.sourceEvidence || ""),
          notes: String(p.notes || ""),
          availableTo: (p.availableTo as string | null) ?? null,
        },
        party,
      );
      created += 1;
      continue;
    }

    await createRateCardFromImport(
      {
        programId: ctx.programId,
        budgetYearId: ctx.budgetYearId,
        farmAreaId: ctx.farmAreaId,
        activityId: String(p.activityId),
        kind: p.kind as StandingKind,
        proposedRate: Number(p.proposedRate),
        norm: p.norm != null ? Number(p.norm) : null,
        sourceBasis: String(p.sourceBasis || ""),
        availableFrom: day,
      },
      party,
    );
    created += 1;
  }

  return { created };
}
