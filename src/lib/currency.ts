/**
 * Cropfort is Birr-only. Every monetary value in the Cropfort modules is ETB;
 * there is no FX, no currency selector, and no second currency in the UI.
 *
 * Note: the legacy Field OS program data (src/types/fieldOs.ts) still carries
 * USD amounts. Those screens are out of scope here and are left untouched.
 */

const BIRR_FORMAT = new Intl.NumberFormat("en-ET", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BIRR_COMPACT = new Intl.NumberFormat("en-ET", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** `1234567.5` → `"1,234,567.50 Birr"` */
export function formatBirr(value: number): string {
  return `${BIRR_FORMAT.format(value)} Birr`;
}

/** Digits only, for table cells that already carry a "Birr" column header. */
export function formatBirrAmount(value: number): string {
  return BIRR_FORMAT.format(value);
}

/** `1234567` → `"1.2M Birr"`, for KPI tiles where space is tight. */
export function formatBirrCompact(value: number): string {
  return `${BIRR_COMPACT.format(value)} Birr`;
}

/** Parses user input, tolerating thousands separators. Returns NaN if unparseable. */
export function parseBirr(input: string): number {
  const cleaned = input.replace(/[,\s]/g, "").replace(/birr/gi, "");
  if (cleaned === "") return Number.NaN;
  return Number(cleaned);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`;
}
