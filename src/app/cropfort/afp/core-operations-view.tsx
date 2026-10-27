"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { TablePagination, TableToolbar } from "@/components/cropfort/data-table";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { canViewRateCard } from "@/lib/cropfortAccess";
import { canCreateProgrammePlan, canApproveOperations } from "@/lib/cropfort/platform-access";
import {
  PLAN_MONTHS,
  PLAN_MONTH_LABELS,
  budgetYearLabel,
  type PlanMonth,
} from "@/lib/cropfort/ethiopian-year";
import { cn } from "@/lib/utils";
import {
  scheduleLabel,
  scheduleStatusOf,
  useCoreOpsPlanStore,
} from "@/store/coreOpsPlanStore";
import { useSpendBandStore } from "@/store/spendBandStore";
import type { CoreOpsActivity, CoreOpsStep, MonthIntensity } from "@/types/core-ops";

const STEPS: { id: CoreOpsStep; label: string }[] = [
  { id: "setup", label: "Details" },
  { id: "activities", label: "Activities" },
  { id: "calendar", label: "Schedule" },
  { id: "review", label: "Review" },
];

const PAGE_SIZES = [25, 50, 100];

type ActivityFilter = "all" | "included" | "excluded" | "no_rate";
type ScheduleFilter = "all" | "scheduled" | "unscheduled";

/** Brushes double as the legend for the month grid. */
const BRUSHES: { value: MonthIntensity; label: string; letter: string }[] = [
  { value: "light", label: "Light", letter: "L" },
  { value: "active", label: "Active", letter: "A" },
  { value: "peak", label: "Peak", letter: "P" },
  { value: "none", label: "Clear", letter: "·" },
];

function activityMatchesQuery(act: CoreOpsActivity, q: string) {
  if (!q) return true;
  return `${act.activityName} ${act.activityCode} ${act.category} ${act.uom}`.toLowerCase().includes(q);
}

function fmtEtb(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function intensityLetter(i: MonthIntensity): string {
  return BRUSHES.find((b) => b.value === i)?.letter ?? "·";
}

function intensityClass(i: MonthIntensity): string {
  if (i === "peak") return "bg-primary text-primary-foreground";
  if (i === "active") return "bg-primary/45 text-foreground";
  if (i === "light") return "bg-primary/15 text-foreground";
  return "bg-transparent text-muted-foreground hover:bg-muted";
}

function stepIndex(step: CoreOpsStep) {
  return STEPS.findIndex((s) => s.id === step);
}

export default function CoreOperationsView({ planId }: { planId?: string } = {}) {
  const { user, activeProgram } = useCropfortAuth();
  const canView = canViewRateCard(user.role);

  const farms = useCoreOpsPlanStore((s) => s.farms);
  const blocks = useCoreOpsPlanStore((s) => s.blocks);
  const eligible = useCoreOpsPlanStore((s) => s.eligible);
  const loading = useCoreOpsPlanStore((s) => s.loading);
  const error = useCoreOpsPlanStore((s) => s.error);
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const step = useCoreOpsPlanStore((s) => s.step);
  const focusActivityId = useCoreOpsPlanStore((s) => s.focusActivityId);
  const loadContext = useCoreOpsPlanStore((s) => s.loadContext);
  const loadPlanById = useCoreOpsPlanStore((s) => s.loadPlanById);
  const ensurePlan = useCoreOpsPlanStore((s) => s.ensurePlan);
  const setStep = useCoreOpsPlanStore((s) => s.setStep);
  const setFocusActivityId = useCoreOpsPlanStore((s) => s.setFocusActivityId);
  const updatePlanMeta = useCoreOpsPlanStore((s) => s.updatePlanMeta);
  const setActivityIncluded = useCoreOpsPlanStore((s) => s.setActivityIncluded);
  const setActivitiesIncluded = useCoreOpsPlanStore((s) => s.setActivitiesIncluded);
  const setPlannedQty = useCoreOpsPlanStore((s) => s.setPlannedQty);
  const setBlockAllocations = useCoreOpsPlanStore((s) => s.setBlockAllocations);
  const setMonthIntensity = useCoreOpsPlanStore((s) => s.setMonthIntensity);
  const applyScheduleToActivities = useCoreOpsPlanStore((s) => s.applyScheduleToActivities);
  const planCompletion = useCoreOpsPlanStore((s) => s.planCompletion);
  const reviewIssues = useCoreOpsPlanStore((s) => s.reviewIssues);
  const saveDraft = useCoreOpsPlanStore((s) => s.saveDraft);
  const submitToAfps = useCoreOpsPlanStore((s) => s.submitToAfps);
  const categories = useCoreOpsPlanStore((s) => s.categories);
  const blocksForPlan = useCoreOpsPlanStore((s) => s.blocksForPlan);

  const canEdit = canCreateProgrammePlan(user.role) && plan?.status !== "submitted";
  const canApprovePlan = canApproveOperations(user.role) && plan?.status === "submitted";

  const [moreDetails, setMoreDetails] = useState(false);
  const [splitId, setSplitId] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [activityQuery, setActivityQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [activityCategory, setActivityCategory] = useState("all");
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(25);

  const [scheduleQuery, setScheduleQuery] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [schedulePage, setSchedulePage] = useState(1);
  const [schedulePageSize, setSchedulePageSize] = useState(25);
  const [scheduleSelectedIds, setScheduleSelectedIds] = useState<Set<string>>(() => new Set());
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState<PlanMonth>("oct");
  const [rangeTo, setRangeTo] = useState<PlanMonth>("dec");
  const [rangeIntensity, setRangeIntensity] = useState<MonthIntensity>("active");
  const [brush, setBrush] = useState<MonthIntensity>("active");
  const paintingRef = useRef(false);

  useEffect(() => {
    if (!canView) return;
    void (async () => {
      await loadContext();
      if (planId) await loadPlanById(planId);
    })();
  }, [canView, activeProgram?.id, planId, loadContext, loadPlanById]);

  // Spend band: assigned automatically from the active program's band set
  const bandForEtb = useSpendBandStore((s) => s.bandForEtb);
  const ensureBandProgram = useSpendBandStore((s) => s.ensureProgram);
  const getActiveBandSet = useSpendBandStore((s) => s.getActiveSet);
  const bandSets = useSpendBandStore((s) => s.sets);

  useEffect(() => {
    if (!activeProgram?.id) return;
    ensureBandProgram(activeProgram.id, activeProgram.name);
  }, [activeProgram?.id, activeProgram?.name, ensureBandProgram]);

  useEffect(() => {
    if (!plan) return;
    const active = getActiveBandSet();
    if (active && !plan.programBandSetId) updatePlanMeta({ programBandSetId: active.id });
  }, [plan?.id, plan?.programBandSetId, bandSets, getActiveBandSet, updatePlanMeta]);

  const completion = planCompletion();
  const issues = reviewIssues();
  const blockingIssues = issues.filter((i) => i.severity === "block");
  const cats = categories();
  const planBlocks = blocksForPlan();
  const band = bandForEtb(completion.budgetEtb);

  const yearOptions = useMemo(() => {
    const y = plan?.budgetYearGc ?? new Date().getFullYear();
    return [y - 1, y, y + 1, y + 2];
  }, [plan?.budgetYearGc]);

  const farmEligibleCount = useMemo(
    () => (plan ? eligible.filter((e) => e.farmEstateId === plan.farmEstateId).length : 0),
    [eligible, plan],
  );

  const farmBlocks = useMemo(() => {
    if (!plan) return blocks;
    const forFarm = blocks.filter((b) => !b.farmAreaId || b.farmAreaId === plan.farmEstateId);
    return forFarm.length > 0 ? forFarm : blocks;
  }, [blocks, plan]);

  const allActivities = useMemo(() => {
    if (!plan) return [] as CoreOpsActivity[];
    return plan.activityIds
      .map((id) => plan.activities[id])
      .filter((a): a is CoreOpsActivity => Boolean(a));
  }, [plan]);

  // ——— Activities step ———
  const filteredActivities = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    return allActivities.filter((act) => {
      if (activityCategory !== "all" && act.category !== activityCategory) return false;
      if (activityFilter === "included" && !act.included) return false;
      if (activityFilter === "excluded" && act.included) return false;
      if (activityFilter === "no_rate" && act.agreedRate) return false;
      return activityMatchesQuery(act, q);
    });
  }, [allActivities, activityCategory, activityFilter, activityQuery]);

  const activityPageCount = Math.max(1, Math.ceil(filteredActivities.length / activityPageSize));
  const pagedActivities = filteredActivities.slice(
    (activityPage - 1) * activityPageSize,
    activityPage * activityPageSize,
  );

  useEffect(() => {
    setActivityPage(1);
  }, [activityQuery, activityFilter, activityCategory, activityPageSize, plan?.id]);

  const includableFiltered = filteredActivities.filter((a) => a.agreedRate);
  const includedFilteredCount = includableFiltered.filter((a) => a.included).length;
  const allFilteredIncluded = includableFiltered.length > 0 && includedFilteredCount === includableFiltered.length;

  // ——— Schedule step ———
  const includedActivities = useMemo(() => allActivities.filter((a) => a.included), [allActivities]);

  const filteredSchedule = useMemo(() => {
    const q = scheduleQuery.trim().toLowerCase();
    return includedActivities.filter((act) => {
      const status = scheduleStatusOf(act);
      if (scheduleFilter === "scheduled" && status !== "scheduled") return false;
      if (scheduleFilter === "unscheduled" && status !== "not_scheduled") return false;
      return activityMatchesQuery(act, q);
    });
  }, [includedActivities, scheduleFilter, scheduleQuery]);

  const schedulePageCount = Math.max(1, Math.ceil(filteredSchedule.length / schedulePageSize));
  const pagedSchedule = filteredSchedule.slice(
    (schedulePage - 1) * schedulePageSize,
    schedulePage * schedulePageSize,
  );

  useEffect(() => {
    setSchedulePage(1);
    setScheduleSelectedIds(new Set());
  }, [scheduleQuery, scheduleFilter, schedulePageSize, plan?.id]);

  useEffect(() => {
    const stopPaint = () => {
      paintingRef.current = false;
    };
    window.addEventListener("mouseup", stopPaint);
    window.addEventListener("touchend", stopPaint);
    return () => {
      window.removeEventListener("mouseup", stopPaint);
      window.removeEventListener("touchend", stopPaint);
    };
  }, []);

  const pageScheduleSelected = pagedSchedule.filter((a) => scheduleSelectedIds.has(a.id)).length;

  const toggleScheduleRow = (id: string, on: boolean) =>
    setScheduleSelectedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const paint = (activityId: string, month: PlanMonth) => {
    if (canEdit) setMonthIntensity(activityId, month, brush);
  };

  if (!canView) return <NotAuthorized title="Core Operations" />;

  const currentIndex = stepIndex(step);
  const goTo = (index: number) => {
    const target = STEPS[index];
    if (!target) return;
    if (step === "setup" && !plan && !planId && farms[0]) void ensurePlan(farms[0].id);
    setStep(target.id);
  };

  const onSave = async () => {
    try {
      await saveDraft();
      toast.success("Draft saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const promo = await submitToAfps();
      toast.success(`Submitted to the asset owner · Band ${promo.band}`);
      setSubmitOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={plan?.name || "Core Operations plan"}
        description={
          plan
            ? [plan.farmName, budgetYearLabel(plan.budgetYearGc).label].filter(Boolean).join(" · ")
            : undefined
        }
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Core Operations plans", href: CROPFORT_ROUTES.programmePlans },
          { label: plan?.name || "Plan" },
        ]}
        actions={plan ? <StatusBadge status={plan.status} /> : null}
      />

      {/* Steps + running totals */}
      <div className="rounded-xl border border-border bg-card">
        <ol className="flex overflow-x-auto border-b border-border" aria-label="Plan steps">
          {STEPS.map((s, index) => {
            const active = step === s.id;
            const done = index < currentIndex;
            const locked = !plan && s.id !== "setup";
            return (
              <li key={s.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  disabled={locked}
                  aria-current={active ? "step" : undefined}
                  onClick={() => setStep(s.id)}
                  className={cn(
                    "cf-focus flex w-full items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      active
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {done ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {plan ? (
          <dl className="grid grid-cols-2 gap-3 px-4 py-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Activities included</dt>
              <dd className="font-medium tabular-nums">
                {completion.includedCount} of {completion.eligibleCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Scheduled</dt>
              <dd className="font-medium tabular-nums">
                {completion.scheduledCount} of {completion.includedCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Budget</dt>
              <dd className="font-medium tabular-nums">{fmtEtb(completion.budgetEtb)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Approval band</dt>
              <dd className="font-medium">
                {band} · goes to the asset owner
              </dd>
            </div>
          </dl>
        ) : null}
      </div>

      {/* ——— DETAILS ——— */}
      {step === "setup" ? (
        <SectionCard title="Plan details">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Plan name"
              required
              render={(props) => (
                <Input
                  {...props}
                  value={plan?.name || ""}
                  onChange={(e) => updatePlanMeta({ name: e.target.value })}
                  disabled={!canEdit || !plan}
                  placeholder={plan ? "e.g. Annual Coffee Operations" : "Select a farm area first"}
                />
              )}
            />
            <FormField
              label="Farm area"
              required
              render={({ id }) => (
                <Select
                  value={plan?.farmEstateId || ""}
                  onValueChange={(farmId) => {
                    if (planId) {
                      const farm = farms.find((f) => f.id === farmId);
                      if (farm) updatePlanMeta({ farmEstateId: farm.id, farmName: farm.name });
                      return;
                    }
                    void ensurePlan(farmId, plan?.budgetYearGc);
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="Select farm area" />
                  </SelectTrigger>
                  <SelectContent>
                    {farms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              label="Budget year"
              required
              render={({ id }) => (
                <Select
                  value={String(plan?.budgetYearGc || new Date().getFullYear())}
                  onValueChange={(v) => {
                    const y = Number(v);
                    if (plan) {
                      updatePlanMeta({
                        budgetYearGc: y,
                        budgetYearLabel: budgetYearLabel(y).label,
                        planningCycleLabel: `${y} Core Operations`,
                      });
                    }
                  }}
                  disabled={!canEdit || !plan}
                >
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {budgetYearLabel(y).label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Workspace</p>
              <p className="flex h-10 items-center text-sm text-muted-foreground">{activeProgram?.name || "—"}</p>
            </div>
          </div>

          {plan ? (
            <p className="mt-4 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {loading
                ? "Loading rates…"
                : `${farmEligibleCount} activities with approved rates · ${farmBlocks.length} blocks on this farm`}
            </p>
          ) : null}
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

          {plan ? (
            <>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                onClick={() => setMoreDetails((v) => !v)}
              >
                {moreDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                More details (optional)
              </button>

              {moreDetails ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Vendor / operator"
                    render={(props) => (
                      <Input
                        {...props}
                        value={plan.vendorLabel}
                        disabled={!canEdit}
                        placeholder="e.g. B-AGRO"
                        onChange={(e) => updatePlanMeta({ vendorLabel: e.target.value })}
                      />
                    )}
                  />
                  <FormField
                    label="Total farm area (ha)"
                    render={(props) => (
                      <Input
                        {...props}
                        type="number"
                        inputMode="decimal"
                        value={plan.totalHa || ""}
                        disabled={!canEdit}
                        onChange={(e) => updatePlanMeta({ totalHa: Number(e.target.value) || 0 })}
                      />
                    )}
                  />
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-sm font-medium">Blocks in this plan</p>
                    {farmBlocks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No blocks on file — quantities stay at farm level.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {farmBlocks.map((b) => {
                          const selected = plan.applicableBlockIds.includes(b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              disabled={!canEdit}
                              aria-pressed={selected}
                              onClick={() =>
                                updatePlanMeta({
                                  applicableBlockIds: selected
                                    ? plan.applicableBlockIds.filter((id) => id !== b.id)
                                    : [...plan.applicableBlockIds, b.id],
                                })
                              }
                              className={cn(
                                "cf-focus inline-flex h-8 items-center gap-1 rounded-full border px-3 font-mono text-xs transition-colors",
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background hover:border-primary/40",
                              )}
                            >
                              {selected ? <Check className="h-3 w-3" aria-hidden /> : null}
                              {b.code}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <FormField
                      label="Notes"
                      render={(props) => (
                        <Textarea
                          {...props}
                          value={plan.notes}
                          disabled={!canEdit}
                          rows={2}
                          onChange={(e) => updatePlanMeta({ notes: e.target.value })}
                        />
                      )}
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </SectionCard>
      ) : null}

      {/* ——— ACTIVITIES ——— */}
      {step === "activities" && plan ? (
        <SectionCard
          title="Activities"
          description="Tick the activities in this plan and enter how much of each is needed."
          flush
        >
          <div className="space-y-3 border-b border-border px-4 py-3 sm:px-5">
            <TableToolbar
              search={activityQuery}
              onSearchChange={setActivityQuery}
              searchPlaceholder="Search code, name or category"
              activeFilterCount={(activityFilter !== "all" ? 1 : 0) + (activityCategory !== "all" ? 1 : 0)}
              onClearFilters={() => {
                setActivityFilter("all");
                setActivityCategory("all");
              }}
              filters={
                <>
                  <Select value={activityFilter} onValueChange={(v) => setActivityFilter(v as ActivityFilter)}>
                    <SelectTrigger className="h-8 w-[9.5rem]" aria-label="Show">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All activities</SelectItem>
                      <SelectItem value="included">Included</SelectItem>
                      <SelectItem value="excluded">Not included</SelectItem>
                      <SelectItem value="no_rate">Missing rate</SelectItem>
                    </SelectContent>
                  </Select>
                  {cats.length > 1 ? (
                    <Select value={activityCategory} onValueChange={setActivityCategory}>
                      <SelectTrigger className="h-8 w-[11rem]" aria-label="Category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {cats.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </>
              }
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 px-3">
                  <Checkbox
                    checked={allFilteredIncluded ? true : includedFilteredCount > 0 ? "indeterminate" : false}
                    disabled={!canEdit || includableFiltered.length === 0}
                    aria-label="Include all listed activities"
                    title={allFilteredIncluded ? "Remove all listed activities" : "Include all listed activities"}
                    onCheckedChange={() => {
                      const n = setActivitiesIncluded(
                        includableFiltered.map((a) => a.id),
                        !allFilteredIncluded,
                      );
                      if (n) toast.success(`${allFilteredIncluded ? "Removed" : "Included"} ${n} activities`);
                    }}
                  />
                </TableHead>
                <TableHead className="min-w-[14rem]">Activity</TableHead>
                <TableHead className="w-28">Quantity</TableHead>
                <TableHead className="hidden w-32 text-right sm:table-cell">Rate</TableHead>
                <TableHead className="w-32 text-right">Cost</TableHead>
                <TableHead className="w-20">
                  <span className="sr-only">Split</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedActivities.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    {allActivities.length === 0
                      ? "No activities with approved rates on this farm yet."
                      : "No activities match these filters."}
                  </TableCell>
                </TableRow>
              ) : (
                pagedActivities.map((act) => {
                  const hasRate = Boolean(act.agreedRate);
                  const splitting = splitId === act.id;
                  return (
                    <Fragment key={act.id}>
                      <TableRow
                        id={`act-${act.id}`}
                        data-state={act.included ? "selected" : undefined}
                        className={cn(focusActivityId === act.id && "bg-muted/40")}
                      >
                        <TableCell className="px-3">
                          <Checkbox
                            checked={act.included}
                            disabled={!canEdit || !hasRate}
                            aria-label={`Include ${act.activityName}`}
                            onCheckedChange={(v) => setActivityIncluded(act.id, Boolean(v))}
                          />
                        </TableCell>
                        <TableCell>
                          <p className={cn("truncate text-sm font-medium", !act.included && "text-muted-foreground")}>
                            {act.activityName}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            <span className="font-mono">{act.activityCode}</span> · {act.category}
                            {act.scope === "off_block" ? " · Nursery" : ""}
                          </p>
                          {!hasRate ? (
                            <p className="mt-0.5 text-[11px] text-destructive">
                              No approved rate —{" "}
                              <Link className="underline" href={CROPFORT_ROUTES.rateCardProposals}>
                                add one in Rate cards
                              </Link>
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              className="h-8 w-20"
                              value={act.plannedQty || ""}
                              disabled={!canEdit || !hasRate}
                              aria-label={`Quantity for ${act.activityName}`}
                              onChange={(e) => {
                                const qty = Number(e.target.value) || 0;
                                // Entering a quantity puts the activity in the plan
                                if (qty > 0 && !act.included) setActivityIncluded(act.id, true);
                                setPlannedQty(act.id, qty);
                              }}
                            />
                            <span className="text-xs text-muted-foreground">{act.uom}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-right text-sm tabular-nums text-muted-foreground sm:table-cell">
                          {hasRate ? fmtEtb(act.agreedRate!.unitRateEtb) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium tabular-nums">
                          {act.included ? fmtEtb(act.plannedCost) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {act.included && canEdit && act.scope === "block" && planBlocks.length > 1 ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              title="Split the quantity across blocks"
                              onClick={() => setSplitId(splitting ? null : act.id)}
                            >
                              {splitting ? "Done" : "By block"}
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                      {splitting ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="bg-muted/20 px-4 py-3">
                            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                              {planBlocks.map((b) => {
                                const alloc = act.blockAllocations.find((a) => a.blockId === b.id);
                                return (
                                  <FormField
                                    key={b.id}
                                    label={`${b.code} (${act.uom})`}
                                    render={(props) => (
                                      <Input
                                        {...props}
                                        type="number"
                                        className="h-8"
                                        value={alloc?.qty ?? ""}
                                        onChange={(e) => {
                                          const qty = Number(e.target.value) || 0;
                                          const others = act.blockAllocations.filter((a) => a.blockId !== b.id);
                                          setBlockAllocations(act.id, [
                                            ...others,
                                            { blockId: b.id, blockCode: b.code, qty },
                                          ]);
                                        }}
                                      />
                                    )}
                                  />
                                );
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="px-3 sm:px-4">
            <TablePagination
              page={activityPage}
              pageCount={activityPageCount}
              total={filteredActivities.length}
              pageSize={activityPageSize}
              onPageChange={setActivityPage}
              pageSizeOptions={PAGE_SIZES}
              onPageSizeChange={setActivityPageSize}
            />
          </div>
        </SectionCard>
      ) : null}

      {/* ——— SCHEDULE ——— */}
      {step === "calendar" && plan ? (
        <SectionCard
          title="Schedule"
          description="Mark the months each activity runs. Pick a brush, then click or drag across months."
          flush
        >
          <div className="space-y-3 border-b border-border px-4 py-3 sm:px-5">
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Brush">
                  {BRUSHES.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      aria-pressed={brush === b.value}
                      onClick={() => setBrush(b.value)}
                      className={cn(
                        "cf-focus inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
                        brush === b.value ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded text-[10px]",
                          b.value === "none" ? "border border-dashed border-border" : intensityClass(b.value),
                        )}
                        aria-hidden
                      >
                        {b.letter}
                      </span>
                      {b.label}
                    </button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 sm:ml-auto"
                  disabled={scheduleSelectedIds.size === 0}
                  title={scheduleSelectedIds.size === 0 ? "Tick rows first" : undefined}
                  onClick={() => setRangeOpen(true)}
                >
                  Set months{scheduleSelectedIds.size ? ` for ${scheduleSelectedIds.size}` : ""}…
                </Button>
              </div>
            ) : null}

            <TableToolbar
              search={scheduleQuery}
              onSearchChange={setScheduleQuery}
              searchPlaceholder="Search included activities"
              activeFilterCount={scheduleFilter !== "all" ? 1 : 0}
              onClearFilters={() => setScheduleFilter("all")}
              filters={
                <Select value={scheduleFilter} onValueChange={(v) => setScheduleFilter(v as ScheduleFilter)}>
                  <SelectTrigger className="h-8 w-[9.5rem]" aria-label="Show">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All included</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="unscheduled">Not scheduled</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-[1] w-10 bg-card px-3">
                  <Checkbox
                    checked={
                      pagedSchedule.length > 0 && pageScheduleSelected === pagedSchedule.length
                        ? true
                        : pageScheduleSelected > 0
                          ? "indeterminate"
                          : false
                    }
                    disabled={!canEdit || pagedSchedule.length === 0}
                    aria-label="Select all on this page"
                    onCheckedChange={(v) =>
                      setScheduleSelectedIds((prev) => {
                        const next = new Set(prev);
                        for (const a of pagedSchedule) {
                          if (v) next.add(a.id);
                          else next.delete(a.id);
                        }
                        return next;
                      })
                    }
                  />
                </TableHead>
                <TableHead className="sticky left-10 z-[1] min-w-[11rem] bg-card">Activity</TableHead>
                {PLAN_MONTHS.map((m) => (
                  <TableHead key={m} className="px-1 text-center text-[11px]">
                    {PLAN_MONTH_LABELS[m]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedSchedule.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={14} className="py-12 text-center text-sm text-muted-foreground">
                    {includedActivities.length === 0
                      ? "No activities included yet — tick some on the Activities step."
                      : "No activities match these filters."}
                  </TableCell>
                </TableRow>
              ) : (
                pagedSchedule.map((act) => {
                  const selected = scheduleSelectedIds.has(act.id);
                  return (
                    <TableRow
                      key={act.id}
                      id={`sched-${act.id}`}
                      className={cn(selected && "bg-accent/40", focusActivityId === act.id && "bg-muted/40")}
                    >
                      <TableCell className="sticky left-0 z-[1] bg-card px-3">
                        <Checkbox
                          checked={selected}
                          disabled={!canEdit}
                          aria-label={`Select ${act.activityName}`}
                          onCheckedChange={(v) => toggleScheduleRow(act.id, Boolean(v))}
                        />
                      </TableCell>
                      <TableCell className="sticky left-10 z-[1] bg-card">
                        <p className="truncate text-sm font-medium">{act.activityName}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {scheduleStatusOf(act) === "scheduled" ? scheduleLabel(act) : "Not scheduled"}
                        </p>
                      </TableCell>
                      {PLAN_MONTHS.map((m) => (
                        <TableCell key={m} className="p-0.5 text-center">
                          <button
                            type="button"
                            disabled={!canEdit}
                            title={`${PLAN_MONTH_LABELS[m]} · ${act.intensities[m]}`}
                            aria-label={`${act.activityName} ${PLAN_MONTH_LABELS[m]} ${act.intensities[m]}`}
                            className={cn(
                              "inline-flex h-8 w-8 select-none items-center justify-center rounded text-[10px] font-medium touch-manipulation",
                              intensityClass(act.intensities[m]),
                              !canEdit && "cursor-default",
                            )}
                            onMouseDown={(e) => {
                              if (!canEdit || e.button !== 0) return;
                              e.preventDefault();
                              paintingRef.current = true;
                              paint(act.id, m);
                            }}
                            onMouseEnter={() => {
                              if (paintingRef.current) paint(act.id, m);
                            }}
                            onTouchStart={(e) => {
                              if (!canEdit) return;
                              e.preventDefault();
                              paintingRef.current = true;
                              paint(act.id, m);
                            }}
                          >
                            {intensityLetter(act.intensities[m])}
                          </button>
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="px-3 sm:px-4">
            <TablePagination
              page={schedulePage}
              pageCount={schedulePageCount}
              total={filteredSchedule.length}
              pageSize={schedulePageSize}
              onPageChange={setSchedulePage}
              pageSizeOptions={PAGE_SIZES}
              onPageSizeChange={setSchedulePageSize}
            />
          </div>
        </SectionCard>
      ) : null}

      {/* ——— REVIEW ——— */}
      {step === "review" && plan ? (
        <SectionCard title="Review">
          {canApprovePlan ? (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              Waiting for your decision —{" "}
              <Link href={CROPFORT_ROUTES.approvals} className="font-medium underline-offset-4 hover:underline">
                open Approvals
              </Link>
            </div>
          ) : null}

          {issues.length === 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              Everything looks good — ready to submit.
            </div>
          ) : (
            <ul className="space-y-2">
              {issues.map((issue) => (
                <li
                  key={issue.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <AlertTriangle
                    className={cn("h-4 w-4", issue.severity === "block" ? "text-destructive" : "text-muted-foreground")}
                    aria-hidden
                  />
                  <span className="flex-1">{issue.message}</span>
                  {issue.severity !== "block" ? (
                    <span className="text-xs text-muted-foreground">Optional</span>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (issue.activityId) setFocusActivityId(issue.activityId);
                      setStep(issue.step);
                    }}
                  >
                    Fix
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {plan.promotions[0] ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Last submission: Band {plan.promotions[0].band}
              {plan.promotions[0].note ? ` · ${plan.promotions[0].note}` : ""}
            </p>
          ) : null}
        </SectionCard>
      ) : null}

      {/* Action bar */}
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
        {canEdit ? (
          <Button size="sm" variant="outline" disabled={!plan} onClick={() => void onSave()}>
            Save draft
          </Button>
        ) : null}
        {currentIndex > 0 ? (
          <Button size="sm" variant="ghost" onClick={() => goTo(currentIndex - 1)}>
            Back
          </Button>
        ) : null}
        <div className="sm:ml-auto" />
        {step !== "review" ? (
          <Button size="sm" disabled={!plan} onClick={() => goTo(currentIndex + 1)}>
            Continue
          </Button>
        ) : canEdit ? (
          <Button
            size="sm"
            disabled={!plan || blockingIssues.length > 0 || completion.budgetEtb <= 0}
            title={blockingIssues.length ? "Fix the issues above first" : undefined}
            onClick={() => setSubmitOpen(true)}
          >
            Submit for approval
          </Button>
        ) : null}
      </div>

      <Dialog open={rangeOpen} onOpenChange={setRangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Set months for {scheduleSelectedIds.size} activit{scheduleSelectedIds.size === 1 ? "y" : "ies"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField
              label="From"
              render={({ id }) => (
                <Select value={rangeFrom} onValueChange={(v) => setRangeFrom(v as PlanMonth)}>
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_MONTHS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PLAN_MONTH_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              label="To"
              render={({ id }) => (
                <Select value={rangeTo} onValueChange={(v) => setRangeTo(v as PlanMonth)}>
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_MONTHS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PLAN_MONTH_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              label="Intensity"
              render={({ id }) => (
                <Select value={rangeIntensity} onValueChange={(v) => setRangeIntensity(v as MonthIntensity)}>
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRUSHES.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRangeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const n = applyScheduleToActivities([...scheduleSelectedIds], rangeFrom, rangeTo, rangeIntensity);
                toast.success(n > 0 ? `Updated ${n} activit${n === 1 ? "y" : "ies"}` : "Nothing to update");
                setRangeOpen(false);
                setScheduleSelectedIds(new Set());
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit plan for approval?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {completion.includedCount} activities · {fmtEtb(completion.budgetEtb)} · Band {band} — goes to
            the Silva asset owner for approval. No AFE is needed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={() => void onSubmit()} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
