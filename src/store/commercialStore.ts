import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  canAuthorizeSettlement,
  canCreatePaymentRequest,
  canSeePaymentRequests,
  canSeeSettlements,
  canVerifyPaymentRequest,
  silvaMaySeeSettlement,
} from "@/lib/cropfort/commercial-access";
import { isSilvaDesk } from "@/lib/cropfort/platform-access";
import { useCropfortOpsStore, type FieldTicket } from "@/store/cropfortOpsStore";
import type {
  OwnerSettlement,
  PaymentRequest,
  PaymentRequestStatus,
  SettlementStatus,
} from "@/types/cropfort-commercial";
import type { CropfortRole } from "@/types/cropfort";

const STORAGE_KEY = "cropfort.commercial.v1";

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

type Actor = {
  userId: string;
  name: string;
  role: CropfortRole | string;
};

type CommercialStore = {
  paymentRequests: PaymentRequest[];
  settlements: OwnerSettlement[];
  createPaymentRequest: (
    ticketId: string,
    actor: Actor,
    programId?: string,
  ) => PaymentRequest;
  submitPaymentRequest: (id: string, actor: Actor) => PaymentRequest;
  verifyPaymentRequest: (id: string, actor: Actor) => PaymentRequest;
  returnPaymentRequest: (id: string, comment: string, actor: Actor) => PaymentRequest;
  authorizeSettlement: (
    prId: string,
    narrative: string,
    actor: Actor,
  ) => OwnerSettlement;
  markSettlementSettled: (id: string, actor: Actor) => OwnerSettlement;
  listPaymentRequestsForRole: (role: CropfortRole | string) => PaymentRequest[];
  listSettlementsForRole: (role: CropfortRole | string) => OwnerSettlement[];
  settlementForSilva: (row: OwnerSettlement) => OwnerSettlement;
};

function ticketWorkOrderCode(ticket: FieldTicket): string {
  const wo = useCropfortOpsStore.getState().workOrders.find((w) => w.id === ticket.workOrderId);
  return wo?.code ?? ticket.workOrderId;
}

export const useCommercialStore = create<CommercialStore>()(
  persist(
    (set, get) => ({
      paymentRequests: [],
      settlements: [],

      createPaymentRequest: (ticketId, actor, programId = "prog-1") => {
        if (!canCreatePaymentRequest(actor.role)) {
          throw new Error("Only vendor / SPX can create payment requests");
        }
        const ticket = useCropfortOpsStore.getState().tickets.find((t) => t.id === ticketId);
        if (!ticket) throw new Error("Field ticket not found");
        if (ticket.status !== "validated") {
          throw new Error("Only validated tickets can bill");
        }
        if (get().paymentRequests.some((p) => p.fieldTicketId === ticketId && p.status !== "returned")) {
          throw new Error("A payment request already exists for this ticket");
        }
        const n = 9000 + get().paymentRequests.length;
        const now = nowIso();
        const row: PaymentRequest = {
          id: uid("pr"),
          code: `PR-${n}`,
          programId,
          workOrderId: ticket.workOrderId,
          workOrderCode: ticketWorkOrderCode(ticket),
          fieldTicketId: ticket.id,
          fieldTicketCode: ticket.code,
          ticketTitle: ticket.title,
          block: ticket.block,
          vendor: ticket.vendor,
          type: "field_ticket",
          amountEtb: ticket.amountEtb,
          status: "submitted",
          requestedByUserId: actor.userId,
          requestedByName: actor.name,
          submittedAt: now,
          verifiedByUserId: null,
          verifiedByName: null,
          verifiedAt: null,
          returnComment: null,
          settlementId: null,
          createdAt: now,
          updatedAt: now,
        };
        set({ paymentRequests: [row, ...get().paymentRequests] });
        return row;
      },

      submitPaymentRequest: (id, actor) => {
        if (!canCreatePaymentRequest(actor.role)) {
          throw new Error("Not allowed to submit payment requests");
        }
        const pr = get().paymentRequests.find((p) => p.id === id);
        if (!pr) throw new Error("Payment request not found");
        if (pr.status !== "draft" && pr.status !== "returned") {
          throw new Error("Only draft or returned PRs can be submitted");
        }
        const now = nowIso();
        const next: PaymentRequest = {
          ...pr,
          status: "submitted",
          submittedAt: now,
          returnComment: null,
          updatedAt: now,
          requestedByUserId: actor.userId,
          requestedByName: actor.name,
        };
        set({
          paymentRequests: get().paymentRequests.map((p) => (p.id === id ? next : p)),
        });
        return next;
      },

      verifyPaymentRequest: (id, actor) => {
        if (!canVerifyPaymentRequest(actor.role)) {
          throw new Error("Only SPX can verify payment requests");
        }
        const pr = get().paymentRequests.find((p) => p.id === id);
        if (!pr || pr.status !== "submitted") {
          throw new Error("PR not awaiting verification");
        }
        if (pr.requestedByUserId === actor.userId) {
          throw new Error("Maker–checker: cannot verify your own payment request");
        }
        const now = nowIso();
        const next: PaymentRequest = {
          ...pr,
          status: "verified",
          verifiedByUserId: actor.userId,
          verifiedByName: actor.name,
          verifiedAt: now,
          updatedAt: now,
        };
        set({
          paymentRequests: get().paymentRequests.map((p) => (p.id === id ? next : p)),
        });
        return next;
      },

      returnPaymentRequest: (id, comment, actor) => {
        if (!canVerifyPaymentRequest(actor.role)) {
          throw new Error("Only SPX can return payment requests");
        }
        const pr = get().paymentRequests.find((p) => p.id === id);
        if (!pr || (pr.status !== "submitted" && pr.status !== "verified")) {
          throw new Error("PR cannot be returned in this status");
        }
        const now = nowIso();
        const next: PaymentRequest = {
          ...pr,
          status: "returned",
          returnComment: comment.trim() || "Returned for correction",
          updatedAt: now,
        };
        set({
          paymentRequests: get().paymentRequests.map((p) => (p.id === id ? next : p)),
        });
        return next;
      },

      authorizeSettlement: (prId, narrative, actor) => {
        if (!canAuthorizeSettlement(actor.role)) {
          throw new Error("Only SPX can authorize settlements");
        }
        const pr = get().paymentRequests.find((p) => p.id === prId);
        if (!pr || pr.status !== "verified") {
          throw new Error("PR must be verified before settlement");
        }
        if (get().settlements.some((s) => s.paymentRequestId === prId)) {
          throw new Error("Settlement already exists for this PR");
        }
        const n = 7000 + get().settlements.length;
        const now = nowIso();
        const settlement: OwnerSettlement = {
          id: uid("stl"),
          code: `STL-${n}`,
          programId: pr.programId,
          workOrderId: pr.workOrderId,
          paymentRequestId: pr.id,
          paymentRequestCode: pr.code,
          type: "vendor_pay",
          payee: pr.vendor,
          amountEtb: pr.amountEtb,
          status: "authorized",
          narrative: narrative.trim() || `Settlement for ${pr.fieldTicketCode} · ${pr.ticketTitle}`,
          ticketSummary: `${pr.fieldTicketCode} · ${pr.block} · ${pr.amountEtb} ETB`,
          authorizedByUserId: actor.userId,
          authorizedByName: actor.name,
          authorizedAt: now,
          settledAt: null,
          createdAt: now,
          updatedAt: now,
        };
        const nextPr: PaymentRequest = {
          ...pr,
          status: "settled" as PaymentRequestStatus,
          settlementId: settlement.id,
          updatedAt: now,
        };
        set({
          settlements: [settlement, ...get().settlements],
          paymentRequests: get().paymentRequests.map((p) => (p.id === prId ? nextPr : p)),
        });
        return settlement;
      },

      markSettlementSettled: (id, actor) => {
        if (!canAuthorizeSettlement(actor.role) && !isSilvaDesk(actor.role)) {
          throw new Error("Not allowed to mark settlement settled");
        }
        const row = get().settlements.find((s) => s.id === id);
        if (!row || row.status !== "authorized") {
          throw new Error("Only authorized settlements can be marked settled");
        }
        const now = nowIso();
        const next: OwnerSettlement = {
          ...row,
          status: "settled" as SettlementStatus,
          settledAt: now,
          updatedAt: now,
        };
        set({
          settlements: get().settlements.map((s) => (s.id === id ? next : s)),
        });
        return next;
      },

      listPaymentRequestsForRole: (role) => {
        if (!canSeePaymentRequests(role)) return [];
        return get().paymentRequests;
      },

      listSettlementsForRole: (role) => {
        if (!canSeeSettlements(role)) return [];
        const rows = get().settlements;
        if (isSilvaDesk(role)) {
          return rows
            .filter((s) => silvaMaySeeSettlement(s.status))
            .map((s) => get().settlementForSilva(s));
        }
        return rows;
      },

      settlementForSilva: (row) => ({
        ...row,
        // Strip operational ticket identifiers beyond summary for Silva desk.
        ticketSummary: row.ticketSummary.replace(/\bFT-[A-Z0-9-]+\b/gi, "Ticket"),
      }),
    }),
    { name: STORAGE_KEY },
  ),
);
