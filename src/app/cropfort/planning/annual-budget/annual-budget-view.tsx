"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  SCENARIO_LABELS,
  defaultAnnualPlanBudget,
  summarizeAnnualBudget,
  type AnnualPlanActivityInput,
  type AnnualPlanBudgetData,
  type AnnualPlanMetrics,
  type BudgetScenario,
  type PlanBasis,
  type PlanCategory,
} from "@/lib/annual-plan-budget";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
import { usePlanningContextStore } from "@/store/planningContextStore";
import { useQuery } from "@tanstack/react-query";

function currentData(planData: AnnualPlanBudgetData | null | undefined, version?: string | null) {
  return {
    ...defaultAnnualPlanBudget(version || ""),
    ...planData,
    benchmarkVersion: planData?.benchmarkVersion || version || "",
    planBasis: { ...planData?.planBasis },
    categoryMetrics: { ...planData?.categoryMetrics },
    activityInputs: { ...planData?.activityInputs },
  };
}

function scenarioTotal(
  rows: ReturnType<typeof summarizeAnnualBudget>,
  category: PlanCategory,
  scenario: BudgetScenario,
) {
  const included = rows.filter(
    (row) =>
      row.activity.category === category &&
      row.included &&
      row.quantityPerRound != null &&
      row.quantityPerRound > 0,
  );
  if (!included.length) return null;
  let total = 0;
  for (const row of included) {
    const actualScenario = row.hasIndustryRate ? scenario : "expert_input";
    const cost = row.scenarios[actualScenario].totalBudget;
    if (cost == null) return null;
    total += cost;
  }
  return total;
}

function scenarioManDays(
  rows: ReturnType<typeof summarizeAnnualBudget>,
  category: PlanCategory,
  scenario: BudgetScenario,
) {
  const included = rows.filter(
    (row) =>
      row.activity.category === category &&
      row.included &&
      row.quantityPerRound != null &&
      row.quantityPerRound > 0,
  );
  if (!included.length) return null;
  let total = 0;
  for (const row of included) {
    const actualScenario = row.hasIndustryRate ? scenario : "expert_input";
    const days = row.scenarios[actualScenario].totalManDays;
    if (row.scenarios[actualScenario].manDaysPerUnit == null || days == null) return null;
    total += days;
  }
  return total;
}

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

  if (!canEdit && !plan) return <NotAuthorized title="Annual budget plan" />;

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
  const updateActivity = (
    code: string,
    field: keyof AnnualPlanActivityInput,
    value: string | boolean,
  ) => {
    const parsed =
      typeof value === "boolean" ? value : value.trim() === "" ? null : Number(value);
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
          <SectionCard title="Benchmark and plan basis" description={`${benchmarkSet.sourceFile || "Benchmark source"} · ${benchmarkSet.version} · ${benchmarkSet.activities.length} activities`}>
            <p className="mb-3 text-sm text-muted-foreground">
              Benchmarks are historical B-Agro budgets, not actual costs. Zero observations remain distinct from missing observations. Activities without an industry rate always use Expert input.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PLAN_CATEGORIES.map((category) => (
                <label key={category} className="grid gap-1.5 text-sm">
                  <span className="font-medium">{category} basis</span>
                  <Select
                    value={data.planBasis[category] || "industry_average"}
                    disabled={!canEdit || plan.status === "submitted"}
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

          <SectionCard title="Category metrics" description="Farm and production assumptions for the plan year.">
            <div className="grid gap-5 lg:grid-cols-2">
              {PLAN_CATEGORIES.map((category) => (
                <section key={category} className="min-w-0">
                  <h3 className="mb-2 text-sm font-semibold">{category}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {METRIC_DEFINITIONS.filter((metric) => metric.category === category).map((metric) => (
                      <label key={`${category}-${metric.key}-${metric.label}`} className="grid gap-1 text-xs">
                        <span className="text-muted-foreground">{metric.label} ({metric.unit})</span>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={data.categoryMetrics[category]?.[metric.key] ?? ""}
                          disabled={!canEdit || plan.status === "submitted"}
                          onChange={(event) => updateMetric(category, metric.key, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Budget by scenario" flush>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Basis</TableHead>
                    <TableHead className="text-right">Industry avg</TableHead>
                    <TableHead className="text-right">+25%</TableHead>
                    <TableHead className="text-right">+50%</TableHead>
                    <TableHead className="text-right">Expert input</TableHead>
                    <TableHead className="text-right">Selected MD</TableHead>
                    <TableHead className="text-right">Selected budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PLAN_CATEGORIES.map((category) => {
                    const basis = data.planBasis[category] || "industry_average";
                    const categoryRows = rows.filter((row) => row.activity.category === category);
                    return (
                      <TableRow key={category}>
                        <TableCell className="font-medium">{category}</TableCell>
                        <TableCell className="text-right text-xs">{SCENARIO_LABELS[basis]}</TableCell>
                        {BUDGET_SCENARIOS.map((scenario) => (
                          <TableCell key={scenario} className="text-right tabular-nums">
                            {scenarioTotal(rows, category, scenario) == null
                              ? "—"
                              : fmtEtb(scenarioTotal(rows, category, scenario))}
                          </TableCell>
                        ))}
                        <TableCell className="text-right tabular-nums">
                          {scenarioManDays(rows, category, basis) == null ? "—" : scenarioManDays(rows, category, basis)?.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {scenarioTotal(rows, category, basis) == null ? "—" : fmtEtb(scenarioTotal(rows, category, basis))}
                        </TableCell>
                        <TableCell className="sr-only">{categoryRows.length} benchmark lines</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell>Total – All field work</TableCell>
                    <TableCell />
                    {BUDGET_SCENARIOS.map((scenario) => {
                      const totals = PLAN_CATEGORIES.map((category) => scenarioTotal(rows, category, scenario));
                      return (
                        <TableCell key={scenario} className="text-right tabular-nums">
                          {totals.some((value) => value == null) ? "—" : fmtEtb(totals.reduce<number>((sum, value) => sum + (value || 0), 0))}
                        </TableCell>
                      );
                    })}
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </SectionCard>

          {PLAN_CATEGORIES.map((category) => (
            <details key={category} open className="group border-b border-border">
              <summary className="cursor-pointer list-none py-3 text-sm font-semibold">
                {category} activity rates <span className="ml-2 text-xs font-normal text-muted-foreground">{rows.filter((row) => row.activity.category === category).length} activities</span>
              </summary>
              <div className="overflow-x-auto pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background">Include · activity</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Qty / round</TableHead>
                      <TableHead className="text-right">Industry / unit</TableHead>
                      <TableHead className="text-right">Industry MD / unit</TableHead>
                      <TableHead className="text-right">Expert MD / unit</TableHead>
                      <TableHead className="text-right">Expert wage / MD</TableHead>
                      <TableHead className="text-right">Expert frequency</TableHead>
                      <TableHead className="text-right">Selected cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.filter((row) => row.activity.category === category).map((row) => {
                      const activityInput = data.activityInputs[row.activity.code] || {};
                      const expert = row.scenarios.expert_input;
                      return (
                        <TableRow key={row.activity.code}>
                          <TableCell className="sticky left-0 min-w-[15rem] bg-background">
                            <label className="flex items-start gap-2">
                              <Checkbox
                                checked={row.included}
                                disabled={!canEdit || plan.status === "submitted"}
                                aria-label={`Include ${row.activity.activity} in annual budget`}
                                onCheckedChange={(checked) => updateActivity(row.activity.code, "included", checked === true)}
                              />
                              <span className="min-w-0">
                                <span className="block font-medium">{row.activity.activity}</span>
                            <p className="font-mono text-[11px] text-muted-foreground">{row.activity.code} · {row.activity.subgroup}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {row.hasIndustryRate ? `${row.industryFarmsWithRate} industry farms` : row.sixFarmFallbackAvailable ? "Six-farm fallback" : "Expert rate required"}
                            </p>
                              </span>
                            </label>
                          </TableCell>
                          <TableCell>{row.activity.unit}</TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="any" className="h-8 w-24 text-right" value={activityInput.quantityPerRound ?? ""} disabled={!canEdit || plan.status === "submitted"} onChange={(event) => updateActivity(row.activity.code, "quantityPerRound", event.target.value)} aria-label={`${row.activity.code} quantity per round`} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.scenarios.industry_average.costPerUnit == null ? "—" : fmtEtb(row.scenarios.industry_average.costPerUnit)}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.scenarios.industry_average.manDaysPerUnit?.toFixed(3) ?? "—"}</TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="any" className="h-8 w-24 text-right" value={activityInput.expertManDaysPerUnit ?? expert.manDaysPerUnit ?? ""} disabled={!canEdit || plan.status === "submitted"} onChange={(event) => updateActivity(row.activity.code, "expertManDaysPerUnit", event.target.value)} aria-label={`${row.activity.code} expert man-days per unit`} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="any" className="h-8 w-28 text-right" value={activityInput.expertWagePerManDay ?? expert.wagePerManDay ?? ""} disabled={!canEdit || plan.status === "submitted"} onChange={(event) => updateActivity(row.activity.code, "expertWagePerManDay", event.target.value)} aria-label={`${row.activity.code} expert wage per man-day`} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="any" className="h-8 w-20 text-right" value={activityInput.expertFrequency ?? expert.frequency ?? ""} disabled={!canEdit || plan.status === "submitted"} onChange={(event) => updateActivity(row.activity.code, "expertFrequency", event.target.value)} aria-label={`${row.activity.code} expert frequency`} />
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{row.selected.costPerUnit == null ? "—" : fmtEtb(row.selected.costPerUnit)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </details>
          ))}
        </>
      )}
    </PageContainer>
  );
}