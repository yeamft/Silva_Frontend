import type { Schedule3Band } from "@/types/fieldOs";

/** Schedule 3 authorization bands (USD). */
export function schedule3Band(amountUsd: number): Schedule3Band {
  if (amountUsd <= 5000) return "A";
  if (amountUsd <= 20000) return "B";
  if (amountUsd <= 50000) return "C";
  return "D";
}

export function bandRequiresOwnerApproval(band: Schedule3Band): boolean {
  return band === "C" || band === "D";
}

export function bandLabel(band: Schedule3Band): string {
  const map: Record<Schedule3Band, string> = {
    A: "Band A · ≤ $5,000 · SPX decide",
    B: "Band B · $5,001–20,000 · SPX issue; Silva may object",
    C: "Band C · $20,001–50,000 · Silva approve before issue",
    D: "Band D · > $50,000 · Silva approve before issue",
  };
  return map[band];
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
