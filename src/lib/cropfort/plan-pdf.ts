import { PLAN_MONTHS, PLAN_MONTH_LABELS, type PlanMonth } from "@/lib/cropfort/ethiopian-year";
import { monthShareOf } from "@/lib/cropfort/month-shares";
import { planPeriodLabel, planPeriodOf } from "@/lib/cropfort/plan-period";
import type { FarmAssessmentSummary } from "@/lib/api/farm-assessments";
import type { AfpPromotion, CoreOpsActivity, CoreOpsPlan } from "@/types/core-ops";

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const etb = (n: number) => `ETB ${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;
const day = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

type PdfExtras = {
  assessments?: FarmAssessmentSummary[];
  /** Plan checks still open (empty = all passed). */
  issues?: string[];
  showBand?: boolean;
};

/**
 * Opens a print-ready copy of a Core Operations plan in a new tab — cover facts, budget by
 * category, every activity with its months, the monthly spend and an approval block. The
 * browser's print dialog saves it as PDF.
 */
export function openPlanPdf(
  plan: CoreOpsPlan,
  promotion: AfpPromotion,
  included: CoreOpsActivity[],
  { assessments = [], issues = [], showBand = false }: PdfExtras = {},
): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;

  const title = plan.name || "Core Operations plan";
  const total = included.reduce((s, a) => s + (a.plannedCost || 0), 0) || promotion.totalEtb;
  const yearOf = (i: number) => plan.budgetYearGc - (i <= 2 ? 1 : 0);
  const monthName = (m: PlanMonth, i: number) => `${PLAN_MONTH_LABELS[m]} ${yearOf(i)}`;

  // Spend per month across the plan
  const monthCost = PLAN_MONTHS.map((m) => included.reduce((s, a) => s + a.plannedCost * monthShareOf(a, m), 0));
  const activeMonths = PLAN_MONTHS.filter((_, i) => monthCost[i] > 0.5);
  const peak = Math.max(...monthCost, 1);

  // Budget by category
  const categories = new Map<string, CoreOpsActivity[]>();
  for (const a of included) categories.set(a.category || "Other", [...(categories.get(a.category || "Other") ?? []), a]);
  const catRows = [...categories.entries()]
    .map(([name, acts]) => ({ name, acts, cost: acts.reduce((s, a) => s + a.plannedCost, 0) }))
    .sort((a, b) => b.cost - a.cost);

  const facts: [string, string][] = [
    ["Farm area", plan.farmName || "—"],
    ["Budget year", plan.budgetYearLabel || String(plan.budgetYearGc)],
    ["Period", planPeriodLabel(planPeriodOf(plan))],
    ["Area", plan.totalHa ? `${plan.totalHa.toLocaleString()} ha` : "—"],
    ["Vendor", plan.vendorLabel || "—"],
    ["Plan code", plan.code || "—"],
    ["Submitted", day(promotion.createdAt)],
    ...(showBand ? ([["Spend band", promotion.band]] as [string, string][]) : []),
  ];

  const monthsOf = (a: CoreOpsActivity) =>
    PLAN_MONTHS.map((m, i) => ({ m, i, share: monthShareOf(a, m) }))
      .filter((x) => x.share > 0)
      .map((x) => `${PLAN_MONTH_LABELS[x.m]} ${Math.round(x.share * 100)}%`)
      .join(" · ") || "Not scheduled";

  const blocksOf = (a: CoreOpsActivity) =>
    a.blockAllocations?.length
      ? a.blockAllocations.map((b) => b.blockCode).filter(Boolean).join(", ")
      : a.scope === "off_block"
        ? "Nursery"
        : "";

  let n = 0;
  const activityRows = catRows
    .map(
      (c) => `
      <tr class="cat"><td colspan="5">${esc(c.name)}</td><td class="n">${etb(c.cost)}</td></tr>
      ${c.acts
        .map((a) => {
          n += 1;
          const blocks = blocksOf(a);
          return `<tr>
            <td class="idx">${n}</td>
            <td><div class="name">${esc(a.activityName)}</div><div class="sub">${esc(a.activityCode)}${blocks ? ` · ${esc(blocks)}` : ""}</div></td>
            <td class="n">${esc(a.plannedQty.toLocaleString())} <span class="unit">${esc(a.uom)}</span></td>
            <td class="n">${a.agreedRate ? etb(a.agreedRate.unitRateEtb) : "—"}</td>
            <td class="months">${esc(monthsOf(a))}</td>
            <td class="n strong">${etb(a.plannedCost)}</td>
          </tr>`;
        })
        .join("")}`,
    )
    .join("");

  const matrixRows = included
    .map(
      (a) => `<tr><td class="name">${esc(a.activityName)}</td>${PLAN_MONTHS.map((m) => {
        const s = monthShareOf(a, m);
        return `<td class="c${s > 0 ? " on" : ""}">${s > 0 ? `${Math.round(s * 100)}%` : ""}</td>`;
      }).join("")}</tr>`,
    )
    .join("");

  const assessmentRows = assessments.length
    ? assessments
        .map(
          (a) => `<tr><td><div class="name">${esc(a.title)}</div><div class="sub">${esc(
            [a.assessmentDate ? day(a.assessmentDate) : null, a.assessedAreaHa ? `${a.assessedAreaHa} ha` : null]
              .filter(Boolean)
              .join(" · "),
          )}</div></td><td>${esc(a.status.replace(/_/g, " "))}</td><td class="n">${a.findingsCount}</td><td class="n">${a.recommendationsCount}</td><td>${esc(a.reportName || "—")}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="5" class="muted">No farm assessment attached.</td></tr>`;

  win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm 18mm; @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 9px system-ui, sans-serif; color: #777; } }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font: 11px/1.5 "IBM Plex Sans", "Segoe UI", system-ui, sans-serif; color: #1c2420; margin: 0; }
  .bar { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #2f6b3a; padding-bottom: 10px; }
  .brand { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #2f6b3a; }
  h1 { font-size: 22px; line-height: 1.2; margin: 4px 0 0; }
  .doc { text-align: right; font-size: 10px; color: #5b665f; }
  .doc b { display: block; font-size: 12px; color: #1c2420; }
  h2 { font-size: 13px; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #dfe5e0; color: #2f6b3a; text-transform: uppercase; letter-spacing: .06em; }
  .facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 18px; margin-top: 14px; }
  .facts dt { font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: #6b766f; }
  .facts dd { margin: 2px 0 0; font-weight: 600; font-size: 12px; }
  .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
  .tile { border: 1px solid #dfe5e0; border-radius: 8px; padding: 10px 12px; background: #f6f8f6; }
  .tile span { font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: #6b766f; }
  .tile b { display: block; font-size: 17px; margin-top: 2px; }
  .tile.main { background: #2f6b3a; border-color: #2f6b3a; color: #fff; }
  .tile.main span { color: #d8e8db; }
  .check { margin-top: 12px; padding: 7px 10px; border-radius: 6px; font-weight: 600; }
  .check.ok { background: #e8f3ea; color: #24572e; }
  .check.warn { background: #fdf3e1; color: #8a5a00; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .06em; color: #5b665f; background: #f1f4f1; padding: 6px 8px; border-bottom: 1px solid #cfd8d1; }
  td { padding: 6px 8px; border-bottom: 1px solid #e7ece8; vertical-align: top; }
  tr { break-inside: avoid; }
  .n { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .strong { font-weight: 700; }
  .idx { width: 22px; color: #8a948d; }
  .name { font-weight: 600; }
  .sub, .unit, .muted { color: #6b766f; font-size: 10px; }
  .months { font-size: 10px; color: #37413b; }
  tr.cat td { background: #eef3ef; font-weight: 700; color: #2f6b3a; border-bottom: 1px solid #cfd8d1; }
  tfoot td { font-weight: 700; font-size: 12px; border-top: 2px solid #2f6b3a; border-bottom: none; }
  .barcell { width: 45%; }
  .barbg { height: 9px; background: #edf1ee; border-radius: 5px; overflow: hidden; }
  .barfill { height: 100%; background: #4f8f5b; border-radius: 5px; }
  .matrix td, .matrix th { text-align: center; padding: 4px 2px; font-size: 9px; }
  .matrix td.name { text-align: left; font-size: 10px; padding-left: 6px; }
  .matrix td.c.on { background: #dcebdf; color: #24572e; font-weight: 700; }
  .page-break { break-before: page; }
  .sign { display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px; margin-top: 10px; }
  .sign .box { border: 1px solid #dfe5e0; border-radius: 8px; padding: 12px; }
  .sign .role { font-size: 9px; text-transform: uppercase; letter-spacing: .08em; color: #6b766f; }
  .sign .line { border-bottom: 1px solid #9aa59e; height: 28px; margin-top: 8px; }
  .sign .lbl { font-size: 9px; color: #6b766f; margin-top: 3px; }
  .foot { margin-top: 20px; font-size: 9px; color: #8a948d; text-align: center; }
  @media screen { body { max-width: 900px; margin: 24px auto; padding: 0 20px; } }
</style></head><body>

<div class="bar">
  <div><div class="brand">Cropfort · Core Operations plan</div><h1>${esc(title)}</h1></div>
  <div class="doc"><b>${esc(promotion.status === "approved" ? "Approved" : "Submitted for approval")}</b>Printed ${esc(day(new Date()))}</div>
</div>

<dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>

<div class="tiles">
  <div class="tile main"><span>Plan total</span><b>${etb(total)}</b></div>
  <div class="tile"><span>Activities</span><b>${included.length}</b></div>
  <div class="tile"><span>Months with work</span><b>${activeMonths.length} of ${PLAN_MONTHS.length}</b></div>
  <div class="tile"><span>Cost per hectare</span><b>${plan.totalHa ? etb(total / plan.totalHa) : "—"}</b></div>
</div>

<div class="check ${issues.length ? "warn" : "ok"}">${issues.length ? `To check: ${esc(issues.join(" · "))}` : "All plan checks passed"}</div>

<h2>Budget by category</h2>
<table>
  <thead><tr><th>Category</th><th class="n">Activities</th><th class="n">Cost</th><th class="n">Share</th><th class="barcell"></th></tr></thead>
  <tbody>${catRows
    .map(
      (c) => `<tr><td class="name">${esc(c.name)}</td><td class="n">${c.acts.length}</td><td class="n">${etb(c.cost)}</td><td class="n">${pct(total ? (c.cost / total) * 100 : 0)}</td>
      <td class="barcell"><div class="barbg"><div class="barfill" style="width:${total ? (c.cost / total) * 100 : 0}%"></div></div></td></tr>`,
    )
    .join("")}</tbody>
  <tfoot><tr><td>Total</td><td class="n">${included.length}</td><td class="n">${etb(total)}</td><td class="n">100%</td><td></td></tr></tfoot>
</table>

<h2>Activities</h2>
<table>
  <thead><tr><th>#</th><th>Activity</th><th class="n">Quantity</th><th class="n">Rate</th><th>Months</th><th class="n">Cost</th></tr></thead>
  <tbody>${activityRows}</tbody>
  <tfoot><tr><td></td><td colspan="4">Total · ${included.length} activities</td><td class="n">${etb(total)}</td></tr></tfoot>
</table>

<h2>Monthly spend</h2>
<table>
  <thead><tr><th>Month</th><th class="n">Cost</th><th class="n">Share</th><th class="barcell"></th></tr></thead>
  <tbody>${PLAN_MONTHS.map(
    (m, i) => `<tr><td class="name">${esc(monthName(m, i))}</td><td class="n">${monthCost[i] > 0.5 ? etb(monthCost[i]) : "—"}</td><td class="n">${monthCost[i] > 0.5 ? pct(total ? (monthCost[i] / total) * 100 : 0) : ""}</td>
    <td class="barcell"><div class="barbg"><div class="barfill" style="width:${(monthCost[i] / peak) * 100}%"></div></div></td></tr>`,
  ).join("")}</tbody>
</table>

<div class="page-break"></div>
<h2>Schedule — share of each activity per month</h2>
<table class="matrix">
  <thead><tr><th style="text-align:left">Activity</th>${PLAN_MONTHS.map((m, i) => `<th>${esc(PLAN_MONTH_LABELS[m])}<br>${yearOf(i)}</th>`).join("")}</tr></thead>
  <tbody>${matrixRows}</tbody>
</table>

<h2>Farm assessment</h2>
<table>
  <thead><tr><th>Assessment</th><th>Status</th><th class="n">Findings</th><th class="n">Recommendations</th><th>Report file</th></tr></thead>
  <tbody>${assessmentRows}</tbody>
</table>

<h2>Approval</h2>
<div class="sign">
  <div class="box"><div class="role">Prepared by · SPX Account Manager</div><div class="line"></div><div class="lbl">Name &amp; signature</div><div class="line"></div><div class="lbl">Date</div></div>
  <div class="box"><div class="role">Approved by · Asset owner</div><div class="line"></div><div class="lbl">Name &amp; signature</div><div class="line"></div><div class="lbl">Date</div></div>
</div>

<div class="foot">${esc(title)} · ${esc(plan.farmName || "")} · ${esc(plan.budgetYearLabel || "")} · generated by Cropfort</div>
<script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`);
  win.document.close();
  win.focus();
  return true;
}
