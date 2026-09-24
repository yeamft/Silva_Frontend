import { create } from "zustand";
import { persist } from "zustand/middleware";
import { computeVariancePct, validateDfr } from "@/lib/schedule5";
import type { MissCause } from "@/lib/cropfort/miss-cause";
import { useCropfortOpsStore } from "@/store/cropfortOpsStore";
import { useWeeklyPlanStore } from "@/store/weeklyPlanStore";
import type {
  DailyFieldRecord,
  DfrEntrySource,
  DfrStatus,
  ProcessLoop,
  Schedule5Config,
} from "@/types/agronomic-cycle";
import { DEFAULT_SCHEDULE5 } from "@/types/agronomic-cycle";

const STORAGE_KEY = "cropfort.dfr.v2";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function pctDoneOf(planned: number, actual: number): number {
  if (planned <= 0) return actual > 0 ? 100 : 0;
  return Math.round((actual / planned) * 1000) / 10;
}

type Store = {
  records: DailyFieldRecord[];
  createFromWeeklyLine: (input: {
    weeklyPlanId: string;
    weeklyPlanLineId: string;
    date?: string;
    actualQty?: number;
    laborHours?: number;
    notes?: string;
    materialsUsed?: string[];
    entrySource?: DfrEntrySource;
  }) => DailyFieldRecord;
  updateDraft: (
    id: string,
    patch: Partial<
      Pick<
        DailyFieldRecord,
        "actualQty" | "laborHours" | "notes" | "materialsUsed" | "date" | "missCause"
      >
    >,
  ) => void;
  submit: (id: string) => void;
  siteCheck: (id: string, note?: string, qualityScore?: number) => void;
  validate: (
    id: string,
    note?: string,
    config?: Schedule5Config,
    opts?: { qualityScore?: number; missCause?: MissCause | null },
  ) => void;
  /** RB04.8 — never overwrite: create a new version from a returned record. */
  correctAsNewVersion: (
    id: string,
    patch: Partial<
      Pick<DailyFieldRecord, "actualQty" | "laborHours" | "notes" | "materialsUsed" | "date">
    >,
  ) => DailyFieldRecord;
  returnRecord: (id: string, note: string, failedCriteria?: string[]) => void;
  queueForValidation: () => DailyFieldRecord[];
  /** Latest version only (hide superseded drafts in lists). */
  latestRecords: () => DailyFieldRecord[];
};

const DEMO: DailyFieldRecord[] = [
  {
    id: "dfr-demo-1",
    code: "DFR-0912",
    weeklyPlanId: "wp-demo-1",
    weeklyPlanLineId: "wl-1",
    monthlyWoId: "mwo-demo-1",
    monthlyWoCode: "MWO-2609",
    monthlyLineId: "ml-1",
    workOrderId: "wo-08",
    date: "2026-09-12",
    blockId: "blk-sh01",
    blockCode: "SH-01",
    activityId: "act-prune",
    activityCode: "LAB-PRN",
    activityName: "Selective pruning",
    plannedQty: 1.5,
    actualQty: 1.4,
    unit: "ha",
    laborHours: 18,
    materialsUsed: ["Pruning saws"],
    notes: "",
    status: "submitted",
    variancePct: -6.7,
    linkedTicketId: null,
    pctDone: 93.3,
    qualityScore: null,
    version: 1,
    supersedesId: null,
    failedCriteria: [],
    entrySource: "bagro_platform",
    missCause: null,
    loop: "none",
    createdAt: "2026-09-12T16:00:00.000Z",
    updatedAt: "2026-09-12T16:30:00.000Z",
    validationNotes: "",
  },
];

export const useDailyFieldRecordStore = create<Store>()(
  persist(
    (set, get) => ({
      records: DEMO,

      latestRecords: () => {
        const all = get().records;
        const superseded = new Set(
          all.map((r) => r.supersedesId).filter(Boolean) as string[],
        );
        // Keep records that are not themselves superseded by a newer version pointing at them
        // or show highest version per lineage root.
        const byRoot = new Map<string, DailyFieldRecord>();
        for (const r of all) {
          let root = r.id;
          let cur: DailyFieldRecord | undefined = r;
          const seen = new Set<string>();
          while (cur?.supersedesId && !seen.has(cur.supersedesId)) {
            seen.add(cur.supersedesId);
            root = cur.supersedesId;
            cur = all.find((x) => x.id === cur!.supersedesId);
          }
          // Prefer walking forward: for each code lineage use max version
          const key = r.supersedesId
            ? `${r.code.split("-v")[0]}`
            : r.code;
          const prev = byRoot.get(key);
          if (!prev || r.version >= prev.version) byRoot.set(key, r);
        }
        void superseded;
        return Array.from(byRoot.values()).sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        );
      },

      createFromWeeklyLine: ({
        weeklyPlanId,
        weeklyPlanLineId,
        date,
        actualQty,
        laborHours,
        notes,
        materialsUsed,
        entrySource = "bagro_platform",
      }) => {
        const wp = useWeeklyPlanStore.getState().plans.find((p) => p.id === weeklyPlanId);
        if (!wp) throw new Error("Weekly plan not found");
        if (wp.status !== "active") throw new Error("Weekly plan must be active");
        const line = wp.lines.find((l) => l.id === weeklyPlanLineId);
        if (!line) throw new Error("Weekly plan line not found");

        const bridgedWo =
          useCropfortOpsStore
            .getState()
            .workOrders.find(
              (w) =>
                w.weeklyPlanLineId === weeklyPlanLineId ||
                (w.weeklyPlanId === weeklyPlanId && w.monthlyLineId === line.monthlyLineId),
            ) ?? null;

        const qty = actualQty ?? line.qty;
        const now = new Date().toISOString();
        const n = 900 + get().records.length;
        const row: DailyFieldRecord = {
          id: uid("dfr"),
          code: `DFR-${n}`,
          weeklyPlanId,
          weeklyPlanLineId,
          monthlyWoId: wp.monthlyWoId,
          monthlyWoCode: wp.monthlyWoCode,
          monthlyLineId: line.monthlyLineId,
          workOrderId: bridgedWo?.id ?? null,
          date: date ?? now.slice(0, 10),
          blockId: line.blockId,
          blockCode: line.blockCode,
          activityId: line.activityId,
          activityCode: line.activityCode,
          activityName: line.activityName,
          plannedQty: line.qty,
          actualQty: qty,
          unit: line.unit,
          laborHours: laborHours ?? 8,
          materialsUsed: materialsUsed ?? (line.materials ? [line.materials] : []),
          notes: notes ?? "",
          status: "draft",
          variancePct: computeVariancePct(line.qty, qty),
          linkedTicketId: null,
          pctDone: pctDoneOf(line.qty, qty),
          qualityScore: null,
          version: 1,
          supersedesId: null,
          failedCriteria: [],
          entrySource,
          missCause: null,
          loop: "none",
          createdAt: now,
          updatedAt: now,
          validationNotes: "",
        };
        set({ records: [row, ...get().records] });
        return row;
      },

      updateDraft: (id, patch) => {
        const row = get().records.find((r) => r.id === id);
        if (!row || (row.status !== "draft" && row.status !== "returned")) return;
        const actualQty = patch.actualQty ?? row.actualQty;
        set({
          records: get().records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...patch,
                  actualQty,
                  variancePct: computeVariancePct(r.plannedQty, actualQty),
                  pctDone: pctDoneOf(r.plannedQty, actualQty),
                  updatedAt: new Date().toISOString(),
                }
              : r,
          ),
        });
      },

      submit: (id) => {
        const row = get().records.find((r) => r.id === id);
        if (!row) return;
        set({
          records: get().records.map((r) =>
            r.id === id
              ? { ...r, status: "submitted" as DfrStatus, updatedAt: new Date().toISOString() }
              : r,
          ),
        });
      },

      siteCheck: (id, note, qualityScore) => {
        const row = get().records.find((r) => r.id === id);
        if (!row || row.status !== "submitted") throw new Error("DFR must be submitted");
        set({
          records: get().records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "site_checked" as DfrStatus,
                  qualityScore:
                    typeof qualityScore === "number" ? qualityScore : r.qualityScore,
                  validationNotes: note?.trim() || r.validationNotes,
                  updatedAt: new Date().toISOString(),
                }
              : r,
          ),
        });
      },

      validate: (id, note, config = DEFAULT_SCHEDULE5, opts) => {
        const row = get().records.find((r) => r.id === id);
        if (!row || row.status !== "site_checked") {
          throw new Error("DFR must be site-checked before validation");
        }
        const issues = validateDfr(
          { ...row, expectedBlockId: row.blockId },
          config,
        );
        const blocking = issues.filter((i) => i.blocking);
        if (blocking.length) {
          throw new Error(blocking.map((i) => i.message).join("; "));
        }
        const quality =
          typeof opts?.qualityScore === "number"
            ? opts.qualityScore
            : row.qualityScore ?? 90;
        set({
          records: get().records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "validated" as DfrStatus,
                  loop: "none",
                  pctDone: pctDoneOf(r.plannedQty, r.actualQty),
                  qualityScore: quality,
                  missCause: opts?.missCause !== undefined ? opts.missCause : r.missCause,
                  failedCriteria: [],
                  validationNotes: note?.trim() || r.validationNotes,
                  updatedAt: new Date().toISOString(),
                }
              : r,
          ),
        });
      },

      correctAsNewVersion: (id, patch) => {
        const row = get().records.find((r) => r.id === id);
        if (!row) throw new Error("DFR not found");
        if (row.status !== "returned" && row.status !== "draft") {
          throw new Error("Only returned or draft DFRs can be corrected as a new version");
        }
        const actualQty = patch.actualQty ?? row.actualQty;
        const now = new Date().toISOString();
        const next: DailyFieldRecord = {
          ...row,
          id: uid("dfr"),
          code: `${row.code.split("-v")[0]}-v${row.version + 1}`,
          version: row.version + 1,
          supersedesId: row.id,
          status: "draft",
          actualQty,
          laborHours: patch.laborHours ?? row.laborHours,
          notes: patch.notes ?? row.notes,
          materialsUsed: patch.materialsUsed ?? row.materialsUsed,
          date: patch.date ?? row.date,
          variancePct: computeVariancePct(row.plannedQty, actualQty),
          pctDone: pctDoneOf(row.plannedQty, actualQty),
          qualityScore: null,
          failedCriteria: [],
          loop: "none",
          validationNotes: "",
          createdAt: now,
          updatedAt: now,
        };
        set({ records: [next, ...get().records] });
        return next;
      },

      returnRecord: (id, note, failedCriteria = []) => {
        set({
          records: get().records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "returned" as DfrStatus,
                  loop: "F_dfr_correction" as ProcessLoop,
                  validationNotes: note.trim(),
                  failedCriteria,
                  updatedAt: new Date().toISOString(),
                }
              : r,
          ),
        });
      },

      queueForValidation: () =>
        get().records.filter(
          (r) => r.status === "submitted" || r.status === "site_checked",
        ),
    }),
    { name: STORAGE_KEY },
  ),
);
