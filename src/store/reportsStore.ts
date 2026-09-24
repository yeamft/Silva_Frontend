import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ReportActivityLine,
  ReportAttentionItem,
  ReportBlockLine,
  ReportGeneratedPayload,
  ReportMetrics,
} from "@/lib/cropfort/report-builder";
import type { MissCause } from "@/lib/cropfort/miss-cause";

const STORAGE_KEY = "cropfort.reports.v3";

export type ReportCadence = "monthly" | "six_month" | "annual";
export type ReportStatus = "draft" | "submitted" | "released" | "returned";

export type ReportMissAttribution = {
  cause: MissCause;
  detail: string;
  kpiLabel: string;
};

export type ReportEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
};

export type OpsReport = {
  id: string;
  code: string;
  title: string;
  cadence: ReportCadence;
  periodLabel: string;
  status: ReportStatus;
  farmName: string;
  programName: string;
  authorName: string;
  summary: string;
  highlights: string;
  risks: string;
  recommendations: string;
  outlook: string;
  planEtb: number;
  actualEtb: number;
  variancePct: number;
  metrics: ReportMetrics;
  activityLines: ReportActivityLine[];
  blockLines: ReportBlockLine[];
  attentionItems: ReportAttentionItem[];
  missAttributions: ReportMissAttribution[];
  events: ReportEvent[];
  createdAt: string;
  updatedAt: string;
  releasedAt: string | null;
  releasedTo: string | null;
};

type EditableFields = Partial<
  Pick<
    OpsReport,
    | "title"
    | "summary"
    | "highlights"
    | "risks"
    | "recommendations"
    | "outlook"
    | "periodLabel"
  >
>;

type Store = {
  reports: OpsReport[];
  create: (input: {
    cadence: ReportCadence;
    periodLabel: string;
    payload: ReportGeneratedPayload;
  }) => OpsReport;
  refreshFromLive: (id: string, payload: ReportGeneratedPayload) => void;
  updateDraft: (id: string, patch: EditableFields) => void;
  submit: (id: string, actor?: string) => void;
  release: (id: string, to?: string, actor?: string) => void;
  returnReport: (id: string, actor?: string) => void;
  remove: (id: string) => void;
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function codeFor(cadence: ReportCadence, n: number) {
  if (cadence === "monthly") return `MR-${2600 + n}`;
  if (cadence === "six_month") return `SMR-${100 + n}`;
  return `AR-${2026 + (n % 10)}`;
}

function titleFor(cadence: ReportCadence, period: string) {
  if (cadence === "monthly") return `Monthly operations report — ${period}`;
  if (cadence === "six_month") return `Six-month review — ${period}`;
  return `Annual programme report — ${period}`;
}

function pushEvent(
  events: ReportEvent[],
  actor: string,
  action: string,
): ReportEvent[] {
  return [
    {
      id: uid("re"),
      at: new Date().toISOString(),
      actor,
      action,
    },
    ...events,
  ];
}

function emptyMetrics(): ReportMetrics {
  return {
    planEtb: 0,
    committedEtb: 0,
    actualEtb: 0,
    forecastEtb: 0,
    varianceEtb: 0,
    variancePct: 0,
    spendPct: 0,
    woOpen: 0,
    woComplete: 0,
    woProgressAvg: 0,
    ticketsOpen: 0,
    ticketsClosed: 0,
    ticketClosePct: 0,
    dfrPending: 0,
    dfrValidated: 0,
    dfrAvgVariancePct: 0,
    weeklyActive: 0,
    weeklySubmitted: 0,
    attentionCount: 0,
  };
}

const DEMO: OpsReport[] = [
  {
    id: "rpt-1",
    code: "MR-2609",
    title: "Monthly operations report — Meskerem 2019",
    cadence: "monthly",
    periodLabel: "Meskerem 2019",
    status: "released",
    farmName: "Sheka Estate",
    programName: "Chaka Buna Estate",
    authorName: "SPX Account Manager",
    summary:
      "Pruning and weeding progressed on SH-01 and SH-04. Stumping riverside remains the main open WO. Ticket close rate improved after site-check cadence settled.",
    highlights:
      "5 of 8 riverside tickets closed · Fertilizer pass 1 on ridge completed · WO progress avg 48%",
    risks: "WO-2409 weeding overdue · Insurance hold on WO-2412",
    recommendations:
      "Clear insurance hold on WO-2412 before further issue. Accelerate site checks on submitted tickets.",
    outlook: "Forecast remains under plan headroom if overdue weeding is closed this week.",
    planEtb: 180000,
    actualEtb: 142400,
    variancePct: -20.9,
    metrics: {
      ...emptyMetrics(),
      planEtb: 180000,
      committedEtb: 165000,
      actualEtb: 142400,
      forecastEtb: 168000,
      varianceEtb: -37600,
      variancePct: -20.9,
      spendPct: 79,
      woOpen: 8,
      woComplete: 2,
      woProgressAvg: 48,
      ticketsOpen: 6,
      ticketsClosed: 5,
      ticketClosePct: 45,
      attentionCount: 2,
    },
    activityLines: [
      {
        activity: "Rehabilitation",
        planned: 61200,
        actual: 39168,
        variancePct: -36,
        woCount: 1,
      },
      {
        activity: "Nutrition",
        planned: 44000,
        actual: 30800,
        variancePct: -30,
        woCount: 2,
      },
    ],
    blockLines: [
      {
        block: "SH-04 Riverside",
        progress: 64,
        tickets: 8,
        ticketsClosed: 5,
        spend: 39168,
        planned: 61200,
      },
      {
        block: "SH-01 Ridge",
        progress: 45,
        tickets: 9,
        ticketsClosed: 2,
        spend: 27612,
        planned: 78200,
      },
    ],
    attentionItems: [
      { code: "WO-2409", title: "Weeding cycle 3", reason: "Overdue" },
      { code: "WO-2412", title: "Infill hole digging", reason: "Insurance hold" },
    ],
    missAttributions: [
      {
        cause: "bagro",
        kpiLabel: "DFR-0912 · Selective pruning",
        detail: "B-Agro · variance -6.7% · MWO-2609",
      },
    ],
    events: [
      {
        id: "re-1",
        at: "2026-09-14T12:00:00.000Z",
        actor: "SPX Account Manager",
        action: "Released to Silva / Chaka Buna",
      },
      {
        id: "re-0",
        at: "2026-09-12T09:00:00.000Z",
        actor: "SPX Account Manager",
        action: "Submitted for release",
      },
    ],
    createdAt: "2026-09-10T08:00:00.000Z",
    updatedAt: "2026-09-14T12:00:00.000Z",
    releasedAt: "2026-09-14T12:00:00.000Z",
    releasedTo: "Silva / Chaka Buna",
  },
];

export const useReportsStore = create<Store>()(
  persist(
    (set, get) => ({
      reports: DEMO,

      create: ({ cadence, periodLabel, payload }) => {
        const now = new Date().toISOString();
        const n = get().reports.length + 1;
        const row: OpsReport = {
          id: uid("rpt"),
          code: codeFor(cadence, n),
          title: titleFor(cadence, periodLabel),
          cadence,
          periodLabel,
          status: "draft",
          farmName: payload.farmName,
          programName: payload.programName,
          authorName: payload.authorName,
          summary: payload.summary,
          highlights: payload.highlights,
          risks: payload.risks,
          recommendations: payload.recommendations,
          outlook: payload.outlook,
          planEtb: payload.metrics.planEtb,
          actualEtb: payload.metrics.actualEtb,
          variancePct: payload.metrics.variancePct,
          metrics: payload.metrics,
          activityLines: payload.activityLines,
          blockLines: payload.blockLines,
          attentionItems: payload.attentionItems,
          missAttributions: payload.missAttributions ?? [],
          events: [
            {
              id: uid("re"),
              at: now,
              actor: payload.authorName,
              action: "Draft created from live snapshot",
            },
          ],
          createdAt: now,
          updatedAt: now,
          releasedAt: null,
          releasedTo: null,
        };
        set({ reports: [row, ...get().reports] });
        return row;
      },

      refreshFromLive: (id, payload) => {
        set({
          reports: get().reports.map((r) => {
            if (r.id !== id) return r;
            if (r.status !== "draft" && r.status !== "returned") return r;
            const now = new Date().toISOString();
            return {
              ...r,
              farmName: payload.farmName,
              programName: payload.programName,
              summary: payload.summary,
              highlights: payload.highlights,
              risks: payload.risks,
              recommendations: payload.recommendations,
              outlook: payload.outlook,
              planEtb: payload.metrics.planEtb,
              actualEtb: payload.metrics.actualEtb,
              variancePct: payload.metrics.variancePct,
              metrics: payload.metrics,
              activityLines: payload.activityLines,
              blockLines: payload.blockLines,
              attentionItems: payload.attentionItems,
              missAttributions: payload.missAttributions ?? [],
              events: pushEvent(r.events, payload.authorName, "Refreshed from live ops"),
              updatedAt: now,
            };
          }),
        });
      },

      updateDraft: (id, patch) => {
        set({
          reports: get().reports.map((r) =>
            r.id === id && (r.status === "draft" || r.status === "returned")
              ? { ...r, ...patch, updatedAt: new Date().toISOString() }
              : r,
          ),
        });
      },

      submit: (id, actor = "SPX") => {
        set({
          reports: get().reports.map((r) =>
            r.id === id && (r.status === "draft" || r.status === "returned")
              ? {
                  ...r,
                  status: "submitted",
                  events: pushEvent(r.events, actor, "Submitted for release"),
                  updatedAt: new Date().toISOString(),
                }
              : r,
          ),
        });
      },

      release: (id, to = "Silva / Chaka Buna", actor = "SPX") => {
        const now = new Date().toISOString();
        set({
          reports: get().reports.map((r) =>
            r.id === id && (r.status === "submitted" || r.status === "draft")
              ? {
                  ...r,
                  status: "released",
                  releasedAt: now,
                  releasedTo: to,
                  events: pushEvent(r.events, actor, `Released to ${to}`),
                  updatedAt: now,
                }
              : r,
          ),
        });
      },

      returnReport: (id, actor = "Silva") => {
        set({
          reports: get().reports.map((r) =>
            r.id === id && r.status === "submitted"
              ? {
                  ...r,
                  status: "returned",
                  events: pushEvent(r.events, actor, "Returned for revision"),
                  updatedAt: new Date().toISOString(),
                }
              : r,
          ),
        });
      },

      remove: (id) => {
        set({
          reports: get().reports.filter(
            (r) => r.id !== id || (r.status !== "draft" && r.status !== "returned"),
          ),
        });
      },
    }),
    { name: STORAGE_KEY },
  ),
);
