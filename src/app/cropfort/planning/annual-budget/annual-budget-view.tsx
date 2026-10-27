"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { canCreateProgrammePlan } from "@/lib/cropfort/platform-access";
import { fmtEtb } from "@/lib/cropfort/planning-helpers";
import { getAnnualPlanBenchmarks } from "@/lib/api/annual-plan-benchmarks";
import {
  BUDGET_SCENARIOS,
  METRIC_DEFINITIONS,
  PLAN_CATEGORIES,
  PLAN_MONTH_NAMES,
  SCENARIO_LABELS,
  defaultAnnualPlanBudget,
  resolveMetrics,
  resolveSettings,
  summarizeAnnualBudget,
  summarizeCategories,
  summarizeMonthlyPlan,
  monthlyTasks,
  toQuarters,
  type AnnualPlanActivityInput,
  type AnnualPlanBudgetData,
  type AnnualPlanMetrics,
  type AnnualPlanSettings,
  type PlanBasis,
  type PlanCategory,
} from "@/lib/annual-plan-budget";
import { cn } from "@/lib/utils";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
import { usePlanningContextStore } from "@/store/planningContextStore";
import { useQuery } from "@tanstack/react-query";

function currentData(planData: AnnualPlanBudgetData | null | undefined, version?: string | null) {
  return {
    ...defaultAnnualPlanBudget(version || ""),
    ...planData,
    benchmarkVersion: planData?.benchmarkVersion || version || "",
    settings: { ...planData?.settings },
    planBasis: { ...planData?.planBasis },
    categoryMetrics: { ...planData?.categoryMetrics },
    activityInputs: { ...planData?.activityInputs },
  };
}

const fmtNum = (n: number, digits = 1) => n.toLocaleString(undefined, { maximumFractionDigits: digits });

export default function AnnualBudgetView() {
  const { user, activeProgram } = useCropfortAuth();
  const canEdit = canCreateProgrammePlan(user.role);
  const plan = useCoreOpsPlanStore((state) => state.plan);
  const loading = useCoreOpsPlanStore((state) => state.loading);
  const loadPlanById = useCoreOpsPlanStore((state) => state.loadPlanById);
  const saveDraft = useCoreOpsPlanStore((state) => state.saveDraft);
  const updatePlanMeta = useCoreOpsPlanStore((state) => state.updatePlanMeta);
  const activePlanId = usePlanningContextStore((state) =>
    activeProgram?.id ? state.activePlanIdByProgram[activeProgram.id] : undefined,
  );
  const plansQuery = useProgrammePlans(Boolean(activeProgram?.id));
  const plans = plansQuery.data || [];
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(activePlanId || null);

  useEffect(() => {
    if (activePlanId && plans.some((item) => item.id === activePlanId)) {
      setSelectedPlanId(activePlanId);
      return;
    }
    if (!selectedPlanId && plans[0]) setSelectedPlanId(plans[0].id);
  }, [activePlanId, plans, selectedPlanId]);

  useEffect(() => {
    if (selectedPlanId && plan?.id !== selectedPlanId) void loadPlanById(selectedPlanId);
  }, [selectedPlanId, plan?.id, loadPlanById]);

  const benchmarkQuery = useQuery({
    queryKey: ["annual-plan-benchmarks", plan?.annualPlanData?.benchmarkVersion || "latest"],
    queryFn: () => getAnnualPlanBenchmarks(plan?.annualPlanData?.benchmarkVersion),
    enabled: Boolean(activeProgram?.id),
  });
  const benchmarkSet = benchmarkQuery.data;
  const data = useMemo(
    () => currentData(plan?.annualPlanData, benchmarkSet?.version),
    [plan?.annualPlanData, benchmarkSet?.version],
  );
  const rows = useMemo(
    () => summarizeAnnualBudget(data, benchmarkSet?.activities || []),
    [data, benchmarkSet?.activities],
  );

  const summary = useMemo(() => summarizeCategories(rows, data), [rows, data]);
  const monthlyPlan = useMemo(() => summarizeMonthlyPlan(rows, data), [rows, data]);
  const [monthlyView, setMonthlyView] = useState<"cost" | "manDays">("cost");
  const [taskMonth, setTaskMonth] = useState(0);
  const tasks = useMemo(() => monthlyTasks(rows, data, taskMonth), [rows, data, taskMonth]);

  const downloadTasksCsv = () => {
    const header = ["Month", "Category", "Code", "Activity", "Sub-group", "Unit", "Quantity", "Share %", "Man-days", "Workers", "Cost (birr)"];
    const lines = PLAN_MONTH_NAMES.flatMap((name, i) =>
      monthlyTasks(rows, data, i).map((t) => [
        name, t.category, t.code, t.activity, t.subgroup, t.unit,
        t.quantity.toFixed(2), t.sharePct.toFixed(0), t.manDays.toFixed(2), t.workers.toFixed(1),
        t.missingRate ? "" : t.cost.toFixed(2),
      ]),
    );
    const csv = [header, ...lines]
      .map((cells) => cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "monthly-tasks.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const settings = resolveSettings(data);
  const [phasingOpen, setPhasingOpen] = useState<string | null>(null);

  if (!canEdit && !plan) return <NotAuthorized title="Annual budget plan" />;

  const locked = !canEdit || plan?.status === "submitted";

  const updateData = (next: AnnualPlanBudgetData) => updatePlanMeta({ annualPlanData: next });
  const updateMetric = (category: PlanCategory, key: keyof AnnualPlanMetrics, value: string) => {
    const parsed = value.trim() === "" ? null : Number(value);
    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0)) return;
    updateData({
      ...data,
      categoryMetrics: {
        ...data.categoryMetrics,
        [category]: { ...data.categoryMetrics[category], [key]: parsed },
      },
    });
  };
  const updateSetting = <K extends keyof AnnualPlanSettings>(key: K, value: AnnualPlanSettings[K]) =>
    updateData({ ...data, settings: { ...data.settings, [key]: value } });
  const updatePercentSetting = (key: "band1Pct" | "band2Pct", value: string) => {
    const pct = Number(value);
    if (value.trim() === "" || !Number.isFinite(pct) || pct < 0) return;
    updateSetting(key, pct / 100);
  };
  const updatePhasing = (code: string, phasing: number[], month: number, value: string) => {
    const pct = value.trim() === "" ? 0 : Number(value);
    if (!Number.isFinite(pct) || pct < 0) return;
    const next = [...phasing];
    next[month] = pct / 100;
    updateData({
      ...data,
      activityInputs: { ...data.activityInputs, [code]: { ...data.activityInputs[code], phasing: next } },
    });
  };
  const updateActivity = (
    code: string,
    field: Exclude<keyof AnnualPlanActivityInput, "phasing" | "included">,
    value: string,
  ) => {
    const parsed = value.trim() === "" ? null : Number(value);
    if (typeof parsed === "number" && (!Number.isFinite(parsed) || parsed < 0)) return;
    updateData({
      ...data,
      activityInputs: {
        ...data.activityInputs,
        [code]: { ...data.activityInputs[code], [field]: parsed },
      },
    });
  };
  const updateBasis = (category: PlanCategory, basis: PlanBasis) =>
    updateData({ ...data, planBasis: { ...data.planBasis, [category]: basis } });
  const onSave = async () => {
    try {
      await saveDraft();
      const error = useCoreOpsPlanStore.getState().error;
      if (error) throw new Error(error);
      toast.success("Annual planning assumptions saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save annual planning data");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Planning"}
        title="Annual budget plan"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Planning", href: CROPFORT_ROUTES.programmePlans },
          { label: "Annual budget plan" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedPlanId || ""}
              onValueChange={(value) => setSelectedPlanId(value)}
            >
              <SelectTrigger className="h-9 w-[min(18rem,70vw)]" aria-label="Programme plan">
                <SelectValue placeholder="Select a programme plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name || item.farmName} · {item.budgetYearLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!plan || !canEdit || loading} onClick={() => void onSave()}>
              Save draft
            </Button>
          </div>
        }
      />

      {!plan ? (
        <SectionCard title="Choose a plan">
          <p className="text-sm text-muted-foreground">
            Create or select a Core Operations plan before entering annual assumptions.{" "}
            <Link className="underline underline-offset-2" href={CROPFORT_ROUTES.programmePlans}>
              Open programme plans
            </Link>
          </p>
        </SectionCard>
      ) : benchmarkQuery.isLoading ? (
        <SectionCard><p className="text-sm text-muted-foreground">Loading benchmark data…</p></SectionCard>
      ) : !benchmarkSet?.activities.length ? (
        <SectionCard title="Benchmark set unavailable">
          <p className="text-sm text-muted-foreground">
            Import the approved annual-plan workbook benchmark set before entering scenarios.
          </p>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="Settings" description="Values used across the plan, as on the template's Settings tab.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="grid gap-1 text-xs">
                <span className="text-muted-foreground">Farm</span>
                <Input
                  value={settings.farmName}
                  placeholder={plan.farmName || "Farm name"}
                  disabled={locked}
                  onChange={(e) => updateSetting("farmName", e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-muted-foreground">Plan year</span>
                <Input
                  value={settings.planYearLabel}
                  placeholder={plan.budgetYearLabel || "e.g. 2019 EFY (2026/27)"}
                  disabled={locked}
                  onChange={(e) => updateSetting("planYearLabel", e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-muted-foreground">Band 1 above industry (%)</span>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={fmtNum(settings.band1Pct * 100, 2)}
                  disabled={locked}
                  onChange={(e) => updatePercentSetting("band1Pct", e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-muted-foreground">Band 2 above industry (%)</span>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={fmtNum(settings.band2Pct * 100, 2)}
                  disabled={locked}
                  onChange={(e) => updatePercentSetting("band2Pct", e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-muted-foreground">Working days per month</span>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={settings.workingDaysPerMonth}
                  disabled={locked}
                  onChange={(e) => {
                    const days = Number(e.target.value);
                    if (Number.isInteger(days) && days > 0) updateSetting("workingDaysPerMonth", days);
                  }}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Bands raise the wage per man-day; man-days stay the same. The scenario labels stay &quot;+25%&quot; and &quot;+50%&quot; if you change them.
            </p>
          </SectionCard>

          <SectionCard title="Plan basis" description={`${benchmarkSet.sourceFile || "Benchmark source"} · ${benchmarkSet.version} · ${benchmarkSet.activities.length} activities`}>
            <p className="mb-3 text-sm text-muted-foreground">
              Sets the Chaka Buna plan row for every activity in the category. Activities with no industry-average rate always use Expert input. Benchmarks are B-Agro budgets, not actual costs.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {PLAN_CATEGORIES.map((category) => (
                <label key={category} className="grid gap-1.5 text-sm">
                  <span className="font-medium">{category}</span>
                  <Select
                    value={data.planBasis[category] || "industry_average"}
                    disabled={locked}
                    onValueChange={(value) => updateBasis(category, value as PlanBasis)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUDGET_SCENARIOS.map((scenario) => (
                        <SelectItem key={scenario} value={scenario}>{SCENARIO_LABELS[scenario]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Category metrics" description="Activity quantities link to these, as in the template's General information blocks.">
            <div className="grid gap-5 lg:grid-cols-2">
              {PLAN_CATEGORIES.map((category) => {
                const resolved = resolveMetrics(data, category);
                return (
                  <section key={category} className="min-w-0">
                    <h3 className="mb-2 text-sm font-semibold">{category}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {METRIC_DEFINITIONS.filter((metric) => metric.category === category).map((metric) => (
                        <label key={`${category}-${metric.key}`} className="grid gap-1 text-xs">
                          <span className="text-muted-foreground">
                            {metric.label} ({metric.unit})
                            {metric.derived ? <span className="ml-1 text-primary">· calculated</span> : null}
                          </span>
                          {metric.derived ? (
                            <p className="flex h-10 items-center rounded-md border border-dashed px-3 text-sm tabular-nums text-muted-foreground">
                              {resolved[metric.key] != null ? fmtNum(resolved[metric.key] as number, 2) : "—"}
                            </p>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              value={data.categoryMetrics[category]?.[metric.key] ?? ""}
                              disabled={locked}
                              onChange={(event) => updateMetric(category, metric.key, event.target.value)}
                            />
                          )}
                        </label>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Summary"
            description="Chaka Buna plan totals per category, with each scenario's budget for comparison."
            flush
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Plan basis</TableHead>
                    <TableHead className="text-right">Plan man-days</TableHead>
                    <TableHead className="text-right">Plan budget</TableHead>
                    {BUDGET_SCENARIOS.map((scenario) => (
                      <TableHead key={scenario} className="text-right">{SCENARIO_LABELS[scenario]}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.categories.map((c) => (
                    <TableRow key={c.category}>
                      <TableCell className="font-medium">
                        {c.category}
                        {c.missingRates ? (
                          <span className="ml-2 text-[11px] font-normal text-destructive">
                            {c.missingRates} without a rate
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs">{SCENARIO_LABELS[c.basis]}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.activityCount ? fmtNum(c.planManDays) : "—"}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{c.activityCount ? fmtEtb(c.planBudget) : "—"}</TableCell>
                      {BUDGET_SCENARIOS.map((scenario) => (
                        <TableCell key={scenario} className="text-right tabular-nums text-muted-foreground">
                          {c.activityCount ? fmtEtb(c.scenarioBudgets[scenario]) : "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell>Total – all field work</TableCell>
                    <TableCell />
                    <TableCell className="text-right tabular-nums">{fmtNum(summary.total.planManDays)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtEtb(summary.total.planBudget)}</TableCell>
                    {BUDGET_SCENARIOS.map((scenario) => (
                      <TableCell key={scenario} className="text-right tabular-nums">
                        {fmtEtb(summary.total.scenarioBudgets[scenario])}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </SectionCard>

          <SectionCard
            title="Monthly plan"
            action={
              <div className="flex rounded-md border border-border p-0.5 text-xs">
                {(["cost", "manDays"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setMonthlyView(view)}
                    className={cn(
                      "rounded px-2.5 py-1 font-medium",
                      monthlyView === view ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {view === "cost" ? "Cost (birr)" : "Labour (man-days)"}
                  </button>
                ))}
              </div>
            }
            flush
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background">Category</TableHead>
                    <TableHead className="text-right">Annual</TableHead>
                    {PLAN_MONTH_NAMES.map((name) => (
                      <TableHead key={name} className="text-right">{name}</TableHead>
                    ))}
                    {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                      <TableHead key={q} className="bg-muted/40 text-right">{q}</TableHead>
                    ))}
                    <TableHead className="text-right">Check</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ...monthlyPlan.categories.map((c) => ({
                      label: c.category,
                      annual: monthlyView === "cost" ? c.annualCost : c.annualManDays,
                      months: monthlyView === "cost" ? c.cost : c.manDays,
                      total: false,
                    })),
                    {
                      label: monthlyView === "cost" ? "Total field activities" : "Total man-days",
                      annual: monthlyView === "cost" ? monthlyPlan.annualCost : monthlyPlan.annualManDays,
                      months: monthlyView === "cost" ? monthlyPlan.totalCost : monthlyPlan.totalManDays,
                      total: true,
                    },
                  ].map((row) => {
                    const check = row.months.reduce((s, v) => s + v, 0) - row.annual;
                    return (
                      <TableRow key={row.label} className={cn(row.total && "border-t-2 font-semibold")}>
                        <TableCell className="sticky left-0 whitespace-nowrap bg-background font-medium">{row.label}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{fmtNum(row.annual, 0)}</TableCell>
                        {row.months.map((v, i) => (
                          <TableCell key={i} className={cn("text-right tabular-nums", !v && "text-muted-foreground")}>
                            {v ? fmtNum(v, 0) : "–"}
                          </TableCell>
                        ))}
                        {toQuarters(row.months).map((v, i) => (
                          <TableCell key={i} className="bg-muted/40 text-right tabular-nums">{v ? fmtNum(v, 0) : "–"}</TableCell>
                        ))}
                        <TableCell
                          className={cn("text-right tabular-nums", Math.abs(check) >= 1 ? "text-destructive" : "text-muted-foreground")}
                        >
                          {Math.abs(check) >= 1 ? fmtNum(check, 0) : "–"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="text-muted-foreground">
                    <TableCell className="sticky left-0 whitespace-nowrap bg-background">
                      {monthlyView === "cost" ? "Cumulative" : `Workers needed (÷ ${settings.workingDaysPerMonth} days)`}
                    </TableCell>
                    <TableCell />
                    {(monthlyView === "cost" ? monthlyPlan.cumulativeCost : monthlyPlan.workers).map((v, i) => (
                      <TableCell key={i} className="text-right tabular-nums">{v ? fmtNum(v, 0) : "–"}</TableCell>
                    ))}
                    <TableCell colSpan={5} />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </SectionCard>

          <SectionCard
            title="Monthly tasks"
            action={
              <Button size="sm" variant="outline" onClick={downloadTasksCsv} disabled={!monthlyPlan.annualCost && !monthlyPlan.annualManDays}>
                <Download className="mr-1.5 h-4 w-4" aria-hidden />
                Download all months
              </Button>
            }
          >
            <div className="flex flex-wrap gap-1.5">
              {PLAN_MONTH_NAMES.map((name, i) => {
                const count = monthlyTasks(rows, data, i).length;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setTaskMonth(i)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium",
                      taskMonth === i
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {name}
                    <span className="ml-1 opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            {tasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No work planned in {PLAN_MONTH_NAMES[taskMonth]}.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                      <TableHead className="text-right">Man-days</TableHead>
                      <TableHead className="text-right">Workers</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PLAN_CATEGORIES.map((category) => {
                      const group = tasks.filter((t) => t.category === category);
                      if (!group.length) return null;
                      return (
                        <Fragment key={category}>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableCell colSpan={6} className="py-1.5 text-xs font-semibold">{category}</TableCell>
                          </TableRow>
                          {group.map((t) => (
                            <TableRow key={t.code}>
                              <TableCell>
                                <span className="block font-medium">{t.activity}</span>
                                <span className="font-mono text-[11px] text-muted-foreground">{t.code}</span>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-right tabular-nums">
                                {fmtNum(t.quantity, 1)} <span className="text-xs text-muted-foreground">{t.unit}</span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-muted-foreground">{fmtNum(t.sharePct, 0)}%</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtNum(t.manDays, 0)}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtNum(t.workers, 0)}</TableCell>
                              <TableCell className={cn("text-right tabular-nums", t.missingRate && "text-destructive")}>
                                {t.missingRate ? "No rate" : fmtEtb(t.cost)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </Fragment>
                      );
                    })}
                    <TableRow className="border-t-2 font-semibold">
                      <TableCell>{tasks.length} tasks</TableCell>
                      <TableCell colSpan={2} />
                      <TableCell className="text-right tabular-nums">{fmtNum(tasks.reduce((s, t) => s + t.manDays, 0), 0)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(tasks.reduce((s, t) => s + t.workers, 0), 0)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtEtb(tasks.reduce((s, t) => s + t.cost, 0))}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </SectionCard>

          {PLAN_CATEGORIES.map((category) => {
            const categoryRows = rows.filter((row) => row.activity.category === category);
            const counted = categoryRows.filter((row) => row.counts).length;
            const phasingIssues = categoryRows.filter((row) => !row.phasingOk).length;
            return (
              <details key={category} open className="group border-b border-border">
                <summary className="cursor-pointer list-none py-3 text-sm font-semibold">
                  {category} activities
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {categoryRows.length} activities · {counted} with a quantity
                    {phasingIssues ? <span className="text-destructive"> · {phasingIssues} phasing not 100%</span> : null}
                  </span>
                </summary>
                <div className="overflow-x-auto pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Activity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Qty / round</TableHead>
                        <TableHead className="text-right">Industry cost / unit</TableHead>
                        <TableHead className="text-right">Expert MD / unit</TableHead>
                        <TableHead className="text-right">Expert wage / MD</TableHead>
                        <TableHead className="text-right">Expert freq.</TableHead>
                        <TableHead className="text-right">Plan cost / unit</TableHead>
                        <TableHead className="text-right">Plan total</TableHead>
                        <TableHead>Phasing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryRows.map((row) => {
                        const code = row.activity.code;
                        const activityInput = data.activityInputs[code] || {};
                        const expert = row.scenarios.expert_input;
                        const open = phasingOpen === code;
                        return (
                          <Fragment key={code}>
                            <TableRow className={cn(!row.counts && "text-muted-foreground")}>
                              <TableCell className="sticky left-0 min-w-[15rem] bg-background">
                                <span className="block font-medium text-foreground">{row.activity.activity}</span>
                                <span className="block font-mono text-[11px] text-muted-foreground">{code} · {row.activity.subgroup}</span>
                                <span className={cn("block text-[11px]", row.missingRate ? "text-destructive" : "text-muted-foreground")}>
                                  {row.hasIndustryRate
                                    ? `${row.industryFarmsWithRate} industry farms · plan uses ${SCENARIO_LABELS[row.selectedBasis]}`
                                    : row.sixFarmFallbackAvailable
                                      ? "No industry rate · Expert input pre-filled from six farms"
                                      : "No B-Agro rate · enter it on Expert input"}
                                </span>
                              </TableCell>
                              <TableCell>{row.activity.unit}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min={0}
                                  step="any"
                                  className={cn("ml-auto h-8 w-24 text-right", row.quantitySource === "metric" && "border-primary/40 bg-primary/[0.04]")}
                                  value={activityInput.quantityPerRound ?? ""}
                                  placeholder={row.quantitySource === "metric" ? fmtNum(row.quantityPerRound, 2) : "0"}
                                  disabled={locked}
                                  onChange={(event) => updateActivity(code, "quantityPerRound", event.target.value)}
                                  aria-label={`${code} quantity per round`}
                                />
                                {row.linkedMetric ? (
                                  <span className="mt-0.5 block text-[10px] text-primary">
                                    {row.quantitySource === "typed" ? "Overrides " : "From "}
                                    {row.linkedMetric.label.toLowerCase()}
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.scenarios.industry_average.costPerUnit == null ? "—" : fmtEtb(row.scenarios.industry_average.costPerUnit)}
                              </TableCell>
                              <TableCell>
                                <Input type="number" min={0} step="any" className="h-8 w-24 text-right" value={activityInput.expertManDaysPerUnit ?? expert.manDaysPerUnit ?? ""} disabled={locked} onChange={(event) => updateActivity(code, "expertManDaysPerUnit", event.target.value)} aria-label={`${code} expert man-days per unit`} />
                              </TableCell>
                              <TableCell>
                                <Input type="number" min={0} step="any" className="h-8 w-28 text-right" value={activityInput.expertWagePerManDay ?? expert.wagePerManDay ?? ""} disabled={locked} onChange={(event) => updateActivity(code, "expertWagePerManDay", event.target.value)} aria-label={`${code} expert wage per man-day`} />
                              </TableCell>
                              <TableCell>
                                <Input type="number" min={0} step={1} className="h-8 w-20 text-right" value={activityInput.expertFrequency ?? expert.frequency ?? ""} disabled={locked} onChange={(event) => updateActivity(code, "expertFrequency", event.target.value)} aria-label={`${code} expert frequency`} />
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {row.selected.costPerUnit == null ? "—" : fmtEtb(row.selected.costPerUnit)}
                              </TableCell>
                              <TableCell className="text-right font-semibold tabular-nums">
                                {row.counts ? (row.selected.totalBudget == null ? "—" : fmtEtb(row.selected.totalBudget)) : "—"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={cn("h-8 px-2 text-xs tabular-nums", !row.phasingOk && "text-destructive")}
                                  aria-expanded={open}
                                  onClick={() => setPhasingOpen(open ? null : code)}
                                >
                                  {fmtNum(row.phasingTotal * 100, 0)}%
                                </Button>
                              </TableCell>
                            </TableRow>
                            {open ? (
                              <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={10} className="bg-muted/20 px-4 py-3">
                                  <p className="mb-2 text-xs text-muted-foreground">
                                    Share of {code}&apos;s annual total per month (pre-filled from B-Agro&apos;s seasonal timing).{" "}
                                    <span className={cn("font-medium", row.phasingOk ? "text-foreground" : "text-destructive")}>
                                      Total {fmtNum(row.phasingTotal * 100, 1)}%{row.phasingOk ? "" : " — must add up to 100%"}
                                    </span>
                                  </p>
                                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
                                    {PLAN_MONTH_NAMES.map((name, month) => (
                                      <label key={name} className="grid gap-1 text-[11px]">
                                        <span className="text-muted-foreground">{name}</span>
                                        <Input
                                          type="number"
                                          min={0}
                                          max={100}
                                          step="any"
                                          className="h-8 text-right"
                                          value={row.phasing[month] ? fmtNum(row.phasing[month] * 100, 2) : ""}
                                          placeholder="0"
                                          disabled={locked}
                                          onChange={(e) => updatePhasing(code, row.phasing, month, e.target.value)}
                                          aria-label={`${code} ${name} phasing %`}
                                        />
                                      </label>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </details>
            );
          })}
        </>
      )}
    </PageContainer>
  );
}