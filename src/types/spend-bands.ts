import type { AfeBand } from "@/lib/cropfort/ethiopian-year";

export type SpendBandAuthority = {
  spx: string;
  silva: string;
};

export type ProgramSpendBand = {
  band: AfeBand;
  /** Inclusive lower bound in ETB (CropFort operating currency). */
  minEtb: number;
  /** Inclusive upper bound in ETB; null = open-ended (Band D). */
  maxEtb: number | null;
  /** Schedule 3 USD bounds (governance schedule). */
  minUsd: number;
  maxUsd: number | null;
  spxAuthority: string;
  silvaAuthority: string;
  /** Band C/D require Silva before issue. */
  requiresSilvaApproval: boolean;
  /** Band A/B auto-route into AFP / issue without Silva gate. */
  autoApprove: boolean;
};

export type ProgramBandSet = {
  id: string;
  programId: string;
  programName: string;
  effectiveYear: number;
  currency: "ETB";
  bands: ProgramSpendBand[];
  /** Schedule 9 reserved-matter gates (beyond A–D ETB bands). */
  reservedMatters?: {
    procurementAboveBand: boolean;
    permanentHire: boolean;
    relatedParty: boolean;
    landDisposition: boolean;
    financing: boolean;
  };
  updatedAt: string;
};

/** Schedule 3 authority matrix (SCOPE) + CropFort ETB operating caps. */
export const DEFAULT_SPEND_BANDS: ProgramSpendBand[] = [
  {
    band: "A",
    minEtb: 0,
    maxEtb: 500_000,
    minUsd: 0,
    maxUsd: 5_000,
    spxAuthority: "Decide",
    silvaAuthority: "Informed (monthly)",
    requiresSilvaApproval: false,
    autoApprove: true,
  },
  {
    band: "B",
    minEtb: 500_001,
    maxEtb: 2_000_000,
    minUsd: 5_001,
    maxUsd: 20_000,
    spxAuthority: "Issue; inform",
    silvaAuthority: "May object (window)",
    requiresSilvaApproval: false,
    autoApprove: true,
  },
  {
    band: "C",
    minEtb: 2_000_001,
    maxEtb: 5_000_000,
    minUsd: 20_001,
    maxUsd: 50_000,
    spxAuthority: "Recommend",
    silvaAuthority: "Approve before issue",
    requiresSilvaApproval: true,
    autoApprove: false,
  },
  {
    band: "D",
    minEtb: 5_000_001,
    maxEtb: null,
    minUsd: 50_001,
    maxUsd: null,
    spxAuthority: "Recommend",
    silvaAuthority: "Approve before issue",
    requiresSilvaApproval: true,
    autoApprove: false,
  },
];

export function bandRangeLabel(band: ProgramSpendBand, unit: "ETB" | "USD" = "ETB"): string {
  if (unit === "USD") {
    if (band.maxUsd == null) return `> $${band.minUsd.toLocaleString()}`;
    if (band.minUsd <= 0) return `≤ $${band.maxUsd.toLocaleString()}`;
    return `$${band.minUsd.toLocaleString()}–$${band.maxUsd.toLocaleString()}`;
  }
  if (band.maxEtb == null) return `> ETB ${band.minEtb.toLocaleString()}`;
  if (band.minEtb <= 0) return `≤ ETB ${band.maxEtb.toLocaleString()}`;
  return `ETB ${band.minEtb.toLocaleString()}–${band.maxEtb.toLocaleString()}`;
}

export function resolveBandFromEtb(
  amountEtb: number,
  bands: ProgramSpendBand[] = DEFAULT_SPEND_BANDS,
): AfeBand {
  const sorted = [...bands].sort((a, b) => a.minEtb - b.minEtb);
  for (const row of sorted) {
    if (amountEtb < row.minEtb) continue;
    if (row.maxEtb == null || amountEtb <= row.maxEtb) return row.band;
  }
  return "D";
}

export function resolveBandFromUsd(
  amountUsd: number,
  bands: ProgramSpendBand[] = DEFAULT_SPEND_BANDS,
): AfeBand {
  const sorted = [...bands].sort((a, b) => a.minUsd - b.minUsd);
  for (const row of sorted) {
    if (amountUsd < row.minUsd) continue;
    if (row.maxUsd == null || amountUsd <= row.maxUsd) return row.band;
  }
  return "D";
}

export function validateBandSet(bands: ProgramSpendBand[]): string | null {
  if (bands.length !== 4) return "Exactly four bands (A–D) are required";
  const order: AfeBand[] = ["A", "B", "C", "D"];
  const byBand = new Map(bands.map((b) => [b.band, b]));
  for (const id of order) {
    if (!byBand.has(id)) return `Missing band ${id}`;
  }
  for (let i = 0; i < order.length; i++) {
    const cur = byBand.get(order[i])!;
    if (cur.minEtb < 0 || cur.minUsd < 0) return `Band ${cur.band}: minimums cannot be negative`;
    if (cur.maxEtb != null && cur.maxEtb < cur.minEtb) {
      return `Band ${cur.band}: ETB max must be ≥ min`;
    }
    if (cur.maxUsd != null && cur.maxUsd < cur.minUsd) {
      return `Band ${cur.band}: USD max must be ≥ min`;
    }
    if (i < order.length - 1) {
      const next = byBand.get(order[i + 1])!;
      if (cur.maxEtb == null) return `Band ${cur.band}: only Band D may be open-ended in ETB`;
      if (next.minEtb !== cur.maxEtb + 1) {
        return `Band ${next.band} ETB min must be ${cur.maxEtb + 1} (contiguous)`;
      }
      if (cur.maxUsd == null) return `Band ${cur.band}: only Band D may be open-ended in USD`;
      if (next.minUsd !== cur.maxUsd + 1) {
        return `Band ${next.band} USD min must be ${cur.maxUsd + 1} (contiguous)`;
      }
    } else if (cur.maxEtb != null || cur.maxUsd != null) {
      return "Band D must be open-ended (no max)";
    }
  }
  return null;
}
