import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CropfortRole } from "@/types/cropfort";

export type CommParty = "vendor" | "site_owner" | "asset_owner" | "spx";

export type CommMessage = {
  id: string;
  threadId: string;
  at: string;
  authorId: string;
  authorName: string;
  authorParty: CommParty;
  body: string;
};

export type CommThread = {
  id: string;
  subject: string;
  /** Counterparty desk (always paired with SPX — no vendor↔asset direct). */
  counterparty: Exclude<CommParty, "spx">;
  relatedType: "general" | "ticket" | "work_order" | "afe" | "project" | "intervention";
  relatedCode: string | null;
  createdAt: string;
  updatedAt: string;
  createdByParty: CommParty;
  createdByName: string;
  closed: boolean;
};

type Store = {
  threads: CommThread[];
  messages: CommMessage[];
  createThread: (input: {
    subject: string;
    counterparty: Exclude<CommParty, "spx">;
    relatedType?: CommThread["relatedType"];
    relatedCode?: string | null;
    authorId: string;
    authorName: string;
    authorParty: CommParty;
    body: string;
  }) => CommThread;
  postMessage: (input: {
    threadId: string;
    authorId: string;
    authorName: string;
    authorParty: CommParty;
    body: string;
  }) => CommMessage | null;
  closeThread: (id: string, party: CommParty) => void;
  reopenThread: (id: string, party: CommParty) => void;
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function partyFromRole(role: CropfortRole): CommParty {
  if (role === "bagro_office") return "vendor";
  if (role === "field_supervisor") return "site_owner";
  if (role === "farm_owner") return "asset_owner";
  return "spx";
}

export const COMM_PARTY_LABEL: Record<CommParty, string> = {
  vendor: "Vendor",
  site_owner: "Site owner",
  asset_owner: "Asset owner",
  spx: "SPX",
};

/** Desks this party may open or participate in (SPX hub — no vendor↔Silva direct). */
export function allowedCounterparties(party: CommParty): Exclude<CommParty, "spx">[] {
  if (party === "spx") return ["vendor", "site_owner", "asset_owner"];
  if (party === "vendor") return ["vendor"];
  if (party === "site_owner") return ["site_owner"];
  return ["asset_owner"];
}

export function canAccessThread(thread: CommThread, party: CommParty): boolean {
  if (party === "spx") return true;
  return thread.counterparty === party;
}

const SEED_THREADS: CommThread[] = [
  {
    id: "cth-1",
    subject: "WO-2412 insurance hold — access note",
    counterparty: "vendor",
    relatedType: "work_order",
    relatedCode: "WO-2412",
    createdAt: "2026-09-18T08:00:00.000Z",
    updatedAt: "2026-09-20T11:20:00.000Z",
    createdByParty: "spx",
    createdByName: "SPX Account Manager",
    closed: false,
  },
  {
    id: "cth-2",
    subject: "Site check clarification — SH-04",
    counterparty: "site_owner",
    relatedType: "ticket",
    relatedCode: "TKT-118",
    createdAt: "2026-09-19T09:30:00.000Z",
    updatedAt: "2026-09-19T14:00:00.000Z",
    createdByParty: "site_owner",
    createdByName: "Hana Mekonnen",
    closed: false,
  },
  {
    id: "cth-3",
    subject: "AFE Band B — nursery expansion review",
    counterparty: "asset_owner",
    relatedType: "afe",
    relatedCode: "AFE-132",
    createdAt: "2026-09-17T10:00:00.000Z",
    updatedAt: "2026-09-21T08:15:00.000Z",
    createdByParty: "asset_owner",
    createdByName: "Chaka Buna reviewer",
    closed: false,
  },
];

const SEED_MESSAGES: CommMessage[] = [
  {
    id: "cmsg-1",
    threadId: "cth-1",
    at: "2026-09-18T08:00:00.000Z",
    authorId: "spx-1",
    authorName: "SPX Account Manager",
    authorParty: "spx",
    body: "Insurance hold remains on WO-2412. Please confirm wet-season access before we re-issue.",
  },
  {
    id: "cmsg-2",
    threadId: "cth-1",
    at: "2026-09-20T11:20:00.000Z",
    authorId: "ven-1",
    authorName: "Abebe Bekele",
    authorParty: "vendor",
    body: "Access note attached via site lead. Ready to resume when hold clears.",
  },
  {
    id: "cmsg-3",
    threadId: "cth-2",
    at: "2026-09-19T09:30:00.000Z",
    authorId: "site-1",
    authorName: "Hana Mekonnen",
    authorParty: "site_owner",
    body: "Ticket TKT-118 missed two rows on the riverside pass — please advise before site OK.",
  },
  {
    id: "cmsg-4",
    threadId: "cth-2",
    at: "2026-09-19T14:00:00.000Z",
    authorId: "spx-1",
    authorName: "SPX Account Manager",
    authorParty: "spx",
    body: "Return to vendor for correction; we will re-queue once they resubmit.",
  },
  {
    id: "cmsg-5",
    threadId: "cth-3",
    at: "2026-09-17T10:00:00.000Z",
    authorId: "asset-1",
    authorName: "Chaka Buna reviewer",
    authorParty: "asset_owner",
    body: "Need shade-house specs before Band B approval on AFE-132.",
  },
  {
    id: "cmsg-6",
    threadId: "cth-3",
    at: "2026-09-21T08:15:00.000Z",
    authorId: "spx-1",
    authorName: "SPX Account Manager",
    authorParty: "spx",
    body: "Specs uploaded to the AFE pack. Ready for your review in Approvals.",
  },
];

export const useCommunicationsStore = create<Store>()(
  persist(
    (set, get) => ({
      threads: SEED_THREADS,
      messages: SEED_MESSAGES,

      createThread: ({
        subject,
        counterparty,
        relatedType = "general",
        relatedCode = null,
        authorId,
        authorName,
        authorParty,
        body,
      }) => {
        const allowed = allowedCounterparties(authorParty);
        if (!allowed.includes(counterparty)) {
          throw new Error("That channel is not allowed for your desk");
        }
        // Non-SPX can only open threads on their own counterparty lane (with SPX).
        if (authorParty !== "spx" && counterparty !== authorParty) {
          throw new Error("Messages go through SPX only");
        }
        const now = new Date().toISOString();
        const thread: CommThread = {
          id: uid("cth"),
          subject: subject.trim(),
          counterparty,
          relatedType,
          relatedCode: relatedCode?.trim() || null,
          createdAt: now,
          updatedAt: now,
          createdByParty: authorParty,
          createdByName: authorName,
          closed: false,
        };
        const message: CommMessage = {
          id: uid("cmsg"),
          threadId: thread.id,
          at: now,
          authorId,
          authorName,
          authorParty,
          body: body.trim(),
        };
        set({
          threads: [thread, ...get().threads],
          messages: [...get().messages, message],
        });
        return thread;
      },

      postMessage: ({ threadId, authorId, authorName, authorParty, body }) => {
        const thread = get().threads.find((t) => t.id === threadId);
        if (!thread || thread.closed) return null;
        if (!canAccessThread(thread, authorParty)) return null;
        const text = body.trim();
        if (!text) return null;
        const now = new Date().toISOString();
        const message: CommMessage = {
          id: uid("cmsg"),
          threadId,
          at: now,
          authorId,
          authorName,
          authorParty,
          body: text,
        };
        set({
          messages: [...get().messages, message],
          threads: get().threads.map((t) =>
            t.id === threadId ? { ...t, updatedAt: now } : t,
          ),
        });
        return message;
      },

      closeThread: (id, party) => {
        const thread = get().threads.find((t) => t.id === id);
        if (!thread || !canAccessThread(thread, party)) return;
        set({
          threads: get().threads.map((t) =>
            t.id === id ? { ...t, closed: true, updatedAt: new Date().toISOString() } : t,
          ),
        });
      },

      reopenThread: (id, party) => {
        if (party !== "spx") return;
        set({
          threads: get().threads.map((t) =>
            t.id === id ? { ...t, closed: false, updatedAt: new Date().toISOString() } : t,
          ),
        });
      },
    }),
    { name: "cropfort.communications.v1" },
  ),
);
