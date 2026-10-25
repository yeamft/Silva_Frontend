import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AnnualFarmPlan,
  AuthorizationForExpenditure,
  FieldTicket,
  Organization,
  OwnerSettlement,
  PaymentRequest,
  Program,
  SeasonEvent,
  SpxRevenueEntry,
  VendorProfile,
  WorkOrder,
} from "@/types/fieldOs";
import { bandRequiresOwnerApproval, schedule3Band } from "@/lib/schedule3";

const ORGS: Organization[] = [
  { id: "org-silva", kind: "silva", name: "Silva Holdings", shortName: "Silva" },
  { id: "org-spx", kind: "spx", name: "SPX Operations", shortName: "SPX" },
  { id: "org-bagro", kind: "vendor", name: "B-Agro Field Services", shortName: "B-Agro" },
];

const PROGRAM: Program = {
  id: "prog-shecha",
  code: "SHECHA",
  name: "Shecha Estate Turnaround",
  estateName: "Shecha Coffee Estate",
  hectares: 220,
  currency: "USD",
  memberOrgIds: ["org-silva", "org-spx", "org-bagro"],
};

const VENDORS: VendorProfile[] = [
  {
    id: "vnd-bagro",
    orgId: "org-bagro",
    name: "B-Agro Field Services",
    insuranceOnFile: true,
    insuranceExpiresOn: "2027-06-30",
    score: 86,
    active: true,
  },
];

const today = () => new Date().toISOString().slice(0, 10);

interface FieldOsState {
  organizations: Organization[];
  program: Program;
  vendors: VendorProfile[];
  afps: AnnualFarmPlan[];
  afes: AuthorizationForExpenditure[];
  workOrders: WorkOrder[];
  fieldTickets: FieldTicket[];
  paymentRequests: PaymentRequest[];
  settlements: OwnerSettlement[];
  revenueLedger: SpxRevenueEntry[];
  seasonEvents: SeasonEvent[];

  approveAfp: (afpId: string) => boolean;
  approveAfe: (afeId: string, role: string) => { ok: boolean; error?: string };
  issueAfe: (afeId: string) => { ok: boolean; error?: string };
  issueWorkOrder: (afeId: string) => { ok: boolean; error?: string; woId?: string };
  submitFieldTicket: (input: {
    workOrderId: string;
    description: string;
    laborHours: number;
    amountUsd: number;
    submittedBy: string;
  }) => { ok: boolean; error?: string };
  validateFieldTicket: (ticketId: string, validatedBy: string) => { ok: boolean; error?: string };
  submitPaymentRequest: (ticketId: string, submittedBy: string) => { ok: boolean; error?: string };
  approvePaymentRequest: (prId: string, approvedBy: string) => { ok: boolean; error?: string };
  releaseSettlement: (prId: string, narrative: string) => { ok: boolean; error?: string };
  createAfe: (input: {
    afpLineId: string;
    title: string;
    amountUsd: number;
    vendorOrgId: string;
  }) => AuthorizationForExpenditure | null;
}

export const useFieldOsStore = create<FieldOsState>()(
  persist(
    (set, get) => ({
      organizations: ORGS,
      program: PROGRAM,
      vendors: VENDORS,
      afps: [],
      afes: [],
      workOrders: [],
      fieldTickets: [],
      paymentRequests: [],
      settlements: [],
      revenueLedger: [],
      seasonEvents: [
        {
          id: "cal-1",
          programId: PROGRAM.id,
          title: "Main harvest window",
          startDate: "2026-10-01",
          endDate: "2026-12-15",
          kind: "harvest",
        },
        {
          id: "cal-2",
          programId: PROGRAM.id,
          title: "Pruning campaign",
          startDate: "2026-04-01",
          endDate: "2026-05-15",
          kind: "pruning",
        },
        {
          id: "cal-3",
          programId: PROGRAM.id,
          title: "Fertilizer program",
          startDate: "2026-03-01",
          endDate: "2026-03-31",
          kind: "fertilizer",
        },
      ],

      approveAfp: (afpId) => {
        const afp = get().afps.find((a) => a.id === afpId);
        if (!afp || (afp.status !== "submitted" && afp.status !== "draft")) return false;
        set({
          afps: get().afps.map((a) =>
            a.id === afpId ? { ...a, status: "approved", approvedAt: today() } : a
          ),
        });
        return true;
      },

      approveAfe: (afeId, role) => {
        if (role !== "silva_owner") return { ok: false, error: "Only Silva can approve Band C/D AFEs" };
        const afe = get().afes.find((a) => a.id === afeId);
        if (!afe) return { ok: false, error: "AFE not found" };
        if (!bandRequiresOwnerApproval(afe.band)) {
          return { ok: false, error: "Band A/B do not require Silva approval" };
        }
        if (afe.status !== "pending_owner" && afe.status !== "recommended") {
          return { ok: false, error: "AFE is not awaiting owner approval" };
        }
        set({
          afes: get().afes.map((a) =>
            a.id === afeId ? { ...a, status: "approved", ownerApprovedAt: today() } : a
          ),
        });
        return { ok: true };
      },

      issueAfe: (afeId) => {
        const afe = get().afes.find((a) => a.id === afeId);
        if (!afe) return { ok: false, error: "AFE not found" };
        if (bandRequiresOwnerApproval(afe.band) && afe.status !== "approved") {
          return { ok: false, error: "Band C/D require Silva approval before issue" };
        }
        if (!bandRequiresOwnerApproval(afe.band) && !["recommended", "draft", "approved"].includes(afe.status)) {
          if (afe.status === "issued") return { ok: false, error: "Already issued" };
        }
        set({
          afes: get().afes.map((a) =>
            a.id === afeId ? { ...a, status: "issued", issuedAt: today() } : a
          ),
          revenueLedger: [
            ...get().revenueLedger,
            {
              id: `rev-${Date.now()}`,
              programId: afe.programId,
              afeId: afe.id,
              principalAmountUsd: afe.amountUsd,
              feeAmountUsd: Math.round(afe.amountUsd * 0.15),
              note: `SPX principal fee — ${afe.title}`,
              createdAt: today(),
            },
          ],
        });
        return { ok: true };
      },

      issueWorkOrder: (afeId) => {
        const afe = get().afes.find((a) => a.id === afeId);
        if (!afe || afe.status !== "issued") {
          return { ok: false, error: "AFE must be issued before WO" };
        }
        const vendor = get().vendors.find((v) => v.orgId === afe.vendorOrgId);
        if (!vendor?.insuranceOnFile) {
          return { ok: false, error: "Schedule 4: vendor insurance not on file" };
        }
        if (vendor.insuranceExpiresOn < today()) {
          return { ok: false, error: "Schedule 4: vendor insurance expired" };
        }
        const existing = get().workOrders.find((w) => w.afeId === afeId && w.status !== "completed");
        if (existing) return { ok: false, error: "Open work order already exists for this AFE" };

        const wo: WorkOrder = {
          id: `wo-${Date.now()}`,
          programId: afe.programId,
          afeId: afe.id,
          vendorOrgId: afe.vendorOrgId!,
          title: `${afe.title} — WO`,
          status: "issued",
          issuedAt: today(),
          insuranceGatePassed: true,
        };
        set({ workOrders: [wo, ...get().workOrders] });
        return { ok: true, woId: wo.id };
      },

      submitFieldTicket: ({ workOrderId, description, laborHours, amountUsd, submittedBy }) => {
        const wo = get().workOrders.find((w) => w.id === workOrderId);
        if (!wo) return { ok: false, error: "Work order not found" };
        if (wo.status !== "issued" && wo.status !== "in_progress") {
          return { ok: false, error: "Work order not open for tickets" };
        }
        const ticket: FieldTicket = {
          id: `ft-${Date.now()}`,
          programId: wo.programId,
          workOrderId: wo.id,
          vendorOrgId: wo.vendorOrgId,
          date: today(),
          description,
          laborHours,
          amountUsd,
          status: "submitted",
          submittedBy,
        };
        set({
          fieldTickets: [ticket, ...get().fieldTickets],
          workOrders: get().workOrders.map((w) =>
            w.id === workOrderId ? { ...w, status: "in_progress" } : w
          ),
        });
        return { ok: true };
      },

      validateFieldTicket: (ticketId, validatedBy) => {
        const ticket = get().fieldTickets.find((t) => t.id === ticketId);
        if (!ticket || ticket.status !== "submitted") {
          return { ok: false, error: "Ticket not awaiting validation" };
        }
        if (ticket.submittedBy === validatedBy) {
          return { ok: false, error: "Maker–checker: cannot validate own submission" };
        }
        set({
          fieldTickets: get().fieldTickets.map((t) =>
            t.id === ticketId
              ? { ...t, status: "validated", validatedAt: today(), validatedBy }
              : t
          ),
        });
        return { ok: true };
      },

      submitPaymentRequest: (ticketId, submittedBy) => {
        const ticket = get().fieldTickets.find((t) => t.id === ticketId);
        if (!ticket || ticket.status !== "validated") {
          return { ok: false, error: "Only validated tickets can bill" };
        }
        const exists = get().paymentRequests.some((p) => p.fieldTicketId === ticketId);
        if (exists) return { ok: false, error: "Payment request already exists" };
        const pr: PaymentRequest = {
          id: `pr-${Date.now()}`,
          programId: ticket.programId,
          fieldTicketId: ticket.id,
          vendorOrgId: ticket.vendorOrgId,
          amountUsd: ticket.amountUsd,
          status: "submitted",
          submittedBy,
        };
        set({ paymentRequests: [pr, ...get().paymentRequests] });
        return { ok: true };
      },

      approvePaymentRequest: (prId, approvedBy) => {
        const pr = get().paymentRequests.find((p) => p.id === prId);
        if (!pr || pr.status !== "submitted") return { ok: false, error: "PR not awaiting approval" };
        if (pr.submittedBy === approvedBy) {
          return { ok: false, error: "Maker–checker: cannot approve own payment request" };
        }
        set({
          paymentRequests: get().paymentRequests.map((p) =>
            p.id === prId ? { ...p, status: "approved", approvedAt: today(), approvedBy } : p
          ),
        });
        return { ok: true };
      },

      releaseSettlement: (prId, narrative) => {
        const pr = get().paymentRequests.find((p) => p.id === prId);
        if (!pr || pr.status !== "approved") return { ok: false, error: "PR must be approved" };
        if (get().settlements.some((s) => s.paymentRequestId === prId)) {
          return { ok: false, error: "Settlement already exists" };
        }
        const stl: OwnerSettlement = {
          id: `stl-${Date.now()}`,
          programId: pr.programId,
          paymentRequestId: pr.id,
          amountUsd: pr.amountUsd,
          status: "released",
          releasedAt: today(),
          narrative,
        };
        set({
          settlements: [stl, ...get().settlements],
          paymentRequests: get().paymentRequests.map((p) =>
            p.id === prId ? { ...p, status: "settled" } : p
          ),
        });
        return { ok: true };
      },

      createAfe: ({ afpLineId, title, amountUsd, vendorOrgId }) => {
        const afp = get().afps.find((plan) =>
          plan.lines.some((line) => line.id === afpLineId)
        );
        if (!afp) return null;
        const band = schedule3Band(amountUsd);
        const afe: AuthorizationForExpenditure = {
          id: `afe-${Date.now()}`,
          programId: PROGRAM.id,
          afpId: afp.id,
          afpLineId,
          title,
          amountUsd,
          band,
          status: bandRequiresOwnerApproval(band) ? "pending_owner" : "recommended",
          vendorOrgId,
          recommendedByOrgId: "org-spx",
        };
        set({ afes: [afe, ...get().afes] });
        return afe;
      },
    }),
    {
      name: "coffee-field-os-v1",
      version: 2,
      migrate: (persistedState, version) => {
        if (
          version < 2 &&
          persistedState !== null &&
          typeof persistedState === "object"
        ) {
          return Object.assign({}, persistedState, {
            afps: [],
            afes: [],
            workOrders: [],
            fieldTickets: [],
            paymentRequests: [],
            settlements: [],
            revenueLedger: [],
          });
        }
        return persistedState;
      },
    }
  )
);
