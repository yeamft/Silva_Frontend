/** All Cropfort monetary displays are Birr / ETB — no FX, no currency toggle. */
export function formatAmount(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatBirr(value: number): string {
  return `${formatAmount(value)} Birr`;
}

export function formatPct(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
