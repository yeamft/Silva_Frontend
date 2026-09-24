import type { Schedule3Band } from "@/types/fieldOs";
import {
  DEFAULT_SPEND_BANDS,
  resolveBandFromUsd,
} from "@/types/spend-bands";
import { useSpendBandStore } from "@/store/spendBandStore";

/** Schedule 3 authorization bands (USD) — uses Program bands when configured. */
export function schedule3Band(amountUsd: number): Schedule3Band {
  const set = useSpendBandStore.getState().getActiveSet();
  return resolveBandFromUsd(amountUsd, set?.bands ?? DEFAULT_SPEND_BANDS);
}

export function bandRequiresOwnerApproval(band: Schedule3Band): boolean {
  const set = useSpendBandStore.getState().getActiveSet();
  const row = (set?.bands ?? DEFAULT_SPEND_BANDS).find((b) => b.band === band);
  return row?.requiresSilvaApproval ?? (band === "C" || band === "D");
}

export function bandLabel(band: Schedule3Band): string {
  const set = useSpendBandStore.getState().getActiveSet();
  const row = (set?.bands ?? DEFAULT_SPEND_BANDS).find((b) => b.band === band);
  if (!row) {
    const map: Record<Schedule3Band, string> = {
      A: "Band A · ≤ $5,000 · SPX decide",
      B: "Band B · $5,001–20,000 · SPX issue; Silva may object",
      C: "Band C · $20,001–50,000 · Silva approve before issue",
      D: "Band D · > $50,000 · Silva approve before issue",
    };
    return map[band];
  }
  const usd =
    row.maxUsd == null
      ? `> $${row.minUsd.toLocaleString()}`
      : row.minUsd <= 0
        ? `≤ $${row.maxUsd.toLocaleString()}`
        : `$${row.minUsd.toLocaleString()}–$${row.maxUsd.toLocaleString()}`;
  return `Band ${band} · ${usd} · SPX ${row.spxAuthority}; Silva ${row.silvaAuthority}`;
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
