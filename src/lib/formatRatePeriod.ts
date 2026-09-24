/** Format a rate-card effective window. Open-ended when endDate is null. */
export function formatRatePeriod(effectiveDate: string, endDate?: string | null): string {
  if (!endDate) return `${effectiveDate} → open`;
  return `${effectiveDate} → ${endDate}`;
}

/** True when today falls within [effective, end] (open end = still active). */
export function isRatePeriodCurrent(effectiveDate: string, endDate?: string | null, today = new Date()): boolean {
  const day = today.toISOString().slice(0, 10);
  if (day < effectiveDate) return false;
  if (!endDate) return true;
  return day <= endDate;
}
