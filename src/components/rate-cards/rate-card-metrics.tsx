"use client";

import { MetricCard } from "@/components/cropfort/page-shell";

export type RateCardMetricSummary = {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  returned: number;
  flagged: number;
};

export function RateCardMetrics({
  summary,
  showEditorMetrics,
}: {
  summary: RateCardMetricSummary;
  showEditorMetrics: boolean;
}) {
  return (
    <section aria-label="Rate card metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <MetricCard label="Active rates" value={String(summary.total)} emphasis />
      {showEditorMetrics ? <MetricCard label="In draft" value={String(summary.draft)} /> : null}
      <MetricCard label="Pending approval" value={String(summary.submitted)} />
      <MetricCard label="Approved" value={String(summary.approved)} />
      {showEditorMetrics ? <MetricCard label="Returned" value={String(summary.returned)} /> : null}
      {showEditorMetrics ? <MetricCard label="Flagged" value={String(summary.flagged)} /> : null}
    </section>
  );
}
