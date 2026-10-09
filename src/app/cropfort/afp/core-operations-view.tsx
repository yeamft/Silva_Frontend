"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import {
  TablePagination,
  TableToolbar,
} from "@/components/cropfort/data-table";
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

const STEPS: { id: CoreOpsStep; label: string; short: string; mobile: string }[] = [
  { id: "setup", label: "Scope", short: "1", mobile: "Scope" },
  { id: "activities", label: "Activity lines", short: "2", mobile: "Lines" },
  { id: "calendar", label: "Schedule", short: "3", mobile: "Schedule" },
  { id: "review", label: "Review & submit", short: "4", mobile: "Submit" },
];

const ACTIVITY_PAGE_SIZES = [25, 50, 100];

type ActivityFilter = "all" | "included" | "excluded" | "no_rate";
type ScheduleFilter = "all" | "scheduled" | "unscheduled";
type PaintBrush = MonthIntensity | "cycle";

const SCHEDULE_PRESETS: {
  id: string;
  label: string;
  from: PlanMonth;
  to: PlanMonth;
  intensity: MonthIntensity;
}[] = [
  { id: "harvest", label: "Harvest peak", from: "oct", to: "dec", intensity: "peak" },
  { id: "grow", label: "Growing season", from: "mar", to: "jun", intensity: "active" },
  { id: "year-light", label: "Full year light", from: "oct", to: "sep", intensity: "light" },
  { id: "clear", label: "Clear year", from: "oct", to: "sep", intensity: "none" },
];

function activityMatchesQuery(act: CoreOpsActivity, q: string) {
  if (!q) return true;
  const hay = `${act.activityName} ${act.activityCode} ${act.category} ${act.uom}`.toLowerCase();
  return hay.includes(q);
}

function fmtEtb(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function intensityLetter(i: MonthIntensity): string {
  if (i === "peak") return "P";
  if (i === "active") return "A";
  if (i === "light") return "L";
  return "·";
}

function intensityClass(i: MonthIntensity): string {
  if (i === "peak") return "bg-foreground text-background";
  if (i === "active") return "bg-muted-foreground/30 text-foreground";
  if (i === "light") return "bg-muted text-muted-foreground";
  return "bg-transparent text-muted-foreground hover:bg-muted";
}

function nextStep(step: CoreOpsStep): CoreOpsStep | null {
  const i = STEPS.findIndex((s) => s.id === step);
  return STEPS[i + 1]?.id ?? null;
}

function prevStep(step: CoreOpsStep): CoreOpsStep | null {
  const i = STEPS.findIndex((s) => s.id === step);
  return STEPS[i - 1]?.id ?? null;
}

export default function CoreOperationsView({ planId }: { planId?: string } = {}) {
  const { user, activeProgram, programs: authPrograms, switchProgram } = useCropfortAuth();
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
  const setActivitiesPlannedQty = useCoreOpsPlanStore((s) => s.setActivitiesPlannedQty);
  const setBlockAllocations = useCoreOpsPlanStore((s) => s.setBlockAllocations);
  const cycleMonthIntensity = useCoreOpsPlanStore((s) => s.cycleMonthIntensity);
  const setMonthIntensity = useCoreOpsPlanStore((s) => s.setMonthIntensity);
  const applyScheduleToActivities = useCoreOpsPlanStore((s) => s.applyScheduleToActivities);
  const planCompletion = useCoreOpsPlanStore((s) => s.planCompletion);
  const reviewIssues = useCoreOpsPlanStore((s) => s.reviewIssues);
  const saveDraft = useCoreOpsPlanStore((s) => s.saveDraft);
  const finalize = useCoreOpsPlanStore((s) => s.finalize);
  const submitToAfps = useCoreOpsPlanStore((s) => s.submitToAfps);
  const categories = useCoreOpsPlanStore((s) => s.categories);
  const blocksForPlan = useCoreOpsPlanStore((s) => s.blocksForPlan);

  const canEdit =
    canCreateProgrammePlan(user.role) && plan?.status !== "submitted";
  const canApprovePlan =
    canApproveOperations(user.role) && plan?.status === "submitted";

  const [moreSetup, setMoreSetup] = useState(false);
  const [splitId, setSplitId] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [activityQuery, setActivityQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [activityCategory, setActivityCategory] = useState<string>("all");
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [assignQtyOpen, setAssignQtyOpen] = useState(false);
  const [assignQtyValue, setAssignQtyValue] = useState("");
  const [assignScheduleOpen, setAssignScheduleOpen] = useState(false);
  const [bulkFrom, setBulkFrom] = useState<PlanMonth>("oct");
  const [bulkTo, setBulkTo] = useState<PlanMonth>("dec");
  const [bulkIntensity, setBulkIntensity] = useState<MonthIntensity>("active");
  const [scheduleQuery, setScheduleQuery] = useState("");
  const [scheduleCategory, setScheduleCategory] = useState("all");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [schedulePage, setSchedulePage] = useState(1);
  const [schedulePageSize, setSchedulePageSize] = useState(25);
  const [scheduleSelectedIds, setScheduleSelectedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [paintBrush, setPaintBrush] = useState<PaintBrush>("active");
  const paintingRef = useRef(false);

  useEffect(() => {
    if (!canView) return;
    void (async () => {
      await loadContext();
      if (planId) {
        await loadPlanById(planId);
      }
    })();
  }, [canView, activeProgram?.id, planId, loadContext, loadPlanById]);

  const bandForEtb = useSpendBandStore((s) => s.bandForEtb);
  const bandAutoApproves = useSpendBandStore((s) => s.bandAutoApproves);
  const ensureBandProgram = useSpendBandStore((s) => s.ensureProgram);
  const getActiveBandSet = useSpendBandStore((s) => s.getActiveSet);
  const setActiveBandProgram = useSpendBandStore((s) => s.setActiveProgram);
  const bandSets = useSpendBandStore((s) => s.sets);

  const programOptions = useMemo(() => {
    if (authPrograms.length > 0) {
      return authPrograms.map((p) => ({ id: p.id, name: p.name }));
    }
    if (activeProgram) {
      return [{ id: activeProgram.id, name: activeProgram.name }];
    }
    return [];
  }, [authPrograms, activeProgram]);

  const programBandOptions = useMemo(() => {
    const pid = activeProgram?.id;
    const forProgram = pid
      ? bandSets.filter((s) => s.programId === pid)
      : bandSets;
    return forProgram.length > 0 ? forProgram : bandSets;
  }, [bandSets, activeProgram?.id]);

  useEffect(() => {
    if (!activeProgram?.id) return;
    ensureBandProgram(activeProgram.id, activeProgram.name);
  }, [activeProgram?.id, activeProgram?.name, ensureBandProgram]);

  useEffect(() => {
    if (!plan) return;
    const active = getActiveBandSet();
    if (!active) return;
    if (!plan.programBandSetId) {
      updatePlanMeta({ programBandSetId: active.id });
    }
  }, [plan?.id, plan?.programBandSetId, bandSets, getActiveBandSet, updatePlanMeta]);

  const onProgramChange = async (programId: string) => {
    const name =
      programOptions.find((p) => p.id === programId)?.name || programId;
    try {
      if (authPrograms.some((p) => p.id === programId)) {
        const res = await switchProgram(programId);
        if (!res.ok) {
          toast.error(res.error || "Could not switch program");
          return;
        }
      }
      const setRow = ensureBandProgram(programId, name);
      setActiveBandProgram(programId);
      updatePlanMeta({ programBandSetId: setRow.id });
      void loadContext();
      toast.success(`Program · ${name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Program switch failed");
    }
  };

  const completion = planCompletion();
  const issues = reviewIssues();
  const blockingIssues = issues.filter((i) => i.severity === "block");
  const cats = categories();
  const planBlocks = blocksForPlan();
  const activeBandSet = getActiveBandSet();

  const yearOptions = useMemo(() => {
    const y = plan?.budgetYearGc ?? new Date().getFullYear();
    return [y - 1, y, y + 1, y + 2];
  }, [plan?.budgetYearGc]);

  const farmEligibleCount = useMemo(
    () =>
      plan
        ? eligible.filter((e) => e.farmEstateId === plan.farmEstateId).length
        : 0,
    [eligible, plan],
  );

  const farmBlocksAll = useMemo(() => {
    if (!plan) return blocks;
    const forFarm = blocks.filter(
      (b) => !b.farmAreaId || b.farmAreaId === plan.farmEstateId,
    );
    return forFarm.length > 0 ? forFarm : blocks;
  }, [blocks, plan]);

  const allPlanActivities = useMemo(() => {
    if (!plan) return [] as CoreOpsActivity[];
    return plan.activityIds
      .map((id) => plan.activities[id])
      .filter((a): a is CoreOpsActivity => Boolean(a));
  }, [plan]);

  const filteredActivities = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    return allPlanActivities.filter((act) => {
      if (activityCategory !== "all" && act.category !== activityCategory) return false;
      if (activityFilter === "included" && !act.included) return false;
      if (activityFilter === "excluded" && act.included) return false;
      if (activityFilter === "no_rate" && act.agreedRate) return false;
      return activityMatchesQuery(act, q);
    });
  }, [allPlanActivities, activityCategory, activityFilter, activityQuery]);

  const activityPageCount = Math.max(
    1,
    Math.ceil(filteredActivities.length / activityPageSize),
  );

  const pagedActivities = useMemo(() => {
    const start = (activityPage - 1) * activityPageSize;
    return filteredActivities.slice(start, start + activityPageSize);
  }, [filteredActivities, activityPage, activityPageSize]);

  useEffect(() => {
    setActivityPage(1);
  }, [activityQuery, activityFilter, activityCategory, activityPageSize, plan?.id]);

  useEffect(() => {
    if (activityPage > activityPageCount) setActivityPage(activityPageCount);
  }, [activityPage, activityPageCount]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [plan?.id, activityQuery, activityFilter, activityCategory]);

  const selectedOnPage = useMemo(
    () => pagedActivities.filter((a) => selectedIds.has(a.id)),
    [pagedActivities, selectedIds],
  );

  const allPageSelected =
    pagedActivities.length > 0 && selectedOnPage.length === pagedActivities.length;

  const somePageSelected =
    selectedOnPage.length > 0 && selectedOnPage.length < pagedActivities.length;

  const toggleSelected = (id: string, next?: boolean) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      const shouldSelect = next ?? !copy.has(id);
      if (shouldSelect) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  };

  const toggleSelectPage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const copy = new Set(prev);
      for (const act of pagedActivities) {
        if (checked) copy.add(act.id);
        else copy.delete(act.id);
      }
      return copy;
    });
  };

  const selectFiltered = () => {
    setSelectedIds(new Set(filteredActivities.map((a) => a.id)));
  };

  const includedActivities = useMemo(
    () => allPlanActivities.filter((a) => a.included),
    [allPlanActivities],
  );

  const filteredScheduleActivities = useMemo(() => {
    const q = scheduleQuery.trim().toLowerCase();
    return includedActivities.filter((act) => {
      if (scheduleCategory !== "all" && act.category !== scheduleCategory) return false;
      const status = scheduleStatusOf(act);
      if (scheduleFilter === "scheduled" && status !== "scheduled") return false;
      if (scheduleFilter === "unscheduled" && status !== "not_scheduled") return false;
      return activityMatchesQuery(act, q);
    });
  }, [includedActivities, scheduleCategory, scheduleFilter, scheduleQuery]);

  const schedulePageCount = Math.max(
    1,
    Math.ceil(filteredScheduleActivities.length / schedulePageSize),
  );

  const pagedScheduleActivities = useMemo(() => {
    const start = (schedulePage - 1) * schedulePageSize;
    return filteredScheduleActivities.slice(start, start + schedulePageSize);
  }, [filteredScheduleActivities, schedulePage, schedulePageSize]);

  useEffect(() => {
    setSchedulePage(1);
  }, [scheduleQuery, scheduleFilter, scheduleCategory, schedulePageSize, plan?.id]);

  useEffect(() => {
    if (schedulePage > schedulePageCount) setSchedulePage(schedulePageCount);
  }, [schedulePage, schedulePageCount]);

  useEffect(() => {
    setScheduleSelectedIds(new Set());
  }, [plan?.id, scheduleQuery, scheduleFilter, scheduleCategory]);

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

  const scheduleSelectedOnPage = useMemo(
    () => pagedScheduleActivities.filter((a) => scheduleSelectedIds.has(a.id)),
    [pagedScheduleActivities, scheduleSelectedIds],
  );

  const allSchedulePageSelected =
    pagedScheduleActivities.length > 0 &&
    scheduleSelectedOnPage.length === pagedScheduleActivities.length;

  const someSchedulePageSelected =
    scheduleSelectedOnPage.length > 0 &&
    scheduleSelectedOnPage.length < pagedScheduleActivities.length;

  const toggleScheduleSelected = (id: string, next?: boolean) => {
    setScheduleSelectedIds((prev) => {
      const copy = new Set(prev);
      const shouldSelect = next ?? !copy.has(id);
      if (shouldSelect) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  };

  const toggleScheduleSelectPage = (checked: boolean) => {
    setScheduleSelectedIds((prev) => {
      const copy = new Set(prev);
      for (const act of pagedScheduleActivities) {
        if (checked) copy.add(act.id);
        else copy.delete(act.id);
      }
      return copy;
    });
  };

  const applyCellIntensity = (activityId: string, month: PlanMonth) => {
    if (!canEdit) return;
    if (paintBrush === "cycle") {
      cycleMonthIntensity(activityId, month);
      return;
    }
    setMonthIntensity(activityId, month, paintBrush);
  };

  const applyPresetToTargets = (
    from: PlanMonth,
    to: PlanMonth,
    intensity: MonthIntensity,
  ) => {
    const targets =
      scheduleSelectedIds.size > 0
        ? [...scheduleSelectedIds]
        : filteredScheduleActivities.map((a) => a.id);
    if (targets.length === 0) {
      toast.error("Include activity lines first, or select rows to schedule");
      return;
    }
    const n = applyScheduleToActivities(targets, from, to, intensity);
    toast.success(
      n > 0
        ? `Schedule applied to ${n} line${n === 1 ? "" : "s"}`
        : "No lines updated",
    );
  };

  const band = bandForEtb(completion.budgetEtb);

  if (!canView) return <NotAuthorized title="Programme" />;

  const goNext = () => {
    if (step === "setup" && !plan && !planId && farms[0]) {
      void ensurePlan(farms[0].id);
    }
    const n = nextStep(step);
    if (n) setStep(n);
  };
  const goBack = () => {
    const p = prevStep(step);
    if (p) setStep(p);
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Workspace"}
        title={plan?.name || "Programme plan"}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Planning" },
          { label: "Programme Plans", href: CROPFORT_ROUTES.programmePlans },
          { label: plan?.name || "Editor" },
        ]}
        meta={
          plan ? (
            <>
              <StatusBadge status={plan.status} label={(plan.statusRaw || plan.status).replace(/_/g, " ")} />
              <span className="text-xs text-muted-foreground">{plan.farmName}</span>
              <span className="text-xs text-muted-foreground">
                {plan.planningCycleLabel || plan.budgetYearLabel}
              </span>
              <span className="text-xs font-medium tabular-nums">
                {fmtEtb(completion.budgetEtb)}
              </span>
            </>
          ) : null
        }
      />

      {/* Steps */}
      <nav aria-label="Programme steps" className="cf-tab-scroll -mx-1 border-b border-border px-1">
        {STEPS.map((s, index) => {
          const active = step === s.id;
          const locked = !plan && s.id !== "setup";
          return (
            <button
              key={s.id}
              type="button"
              disabled={locked}
              aria-current={active ? "step" : undefined}
              onClick={() => setStep(s.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-2 px-3 py-2.5 text-[13px] font-medium touch-manipulation transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                locked && "cursor-not-allowed opacity-40",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {s.short}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.mobile}</span>
              {active ? (
                <span
                  className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
              <span className="sr-only">
                Step {index + 1} of {STEPS.length}: {s.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Completion strip */}
      {plan ? (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Included</p>
            <p className="font-medium tabular-nums">
              {completion.includedCount} of {completion.eligibleCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rates OK</p>
            <p className="font-medium tabular-nums">
              {completion.ratesOkCount} of {completion.eligibleCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
            <p className="font-medium tabular-nums">
              {completion.scheduledCount} of {completion.includedCount || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="font-medium tabular-nums">{fmtEtb(completion.budgetEtb)}</p>
          </div>
        </div>
      ) : null}

      {/* ——— SETUP ——— */}
      {step === "setup" ? (
        <SectionCard title="Scope">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Workspace"
              required
              render={() => (
                <Select
                  value={activeProgram?.id || programOptions[0]?.id || ""}
                  onValueChange={(id) => void onProgramChange(id)}
                  disabled={!canEdit || Boolean(planId)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {programOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              label="Programme plan name"
              required
              render={(props) => (
                <Input
                  {...props}
                  value={plan?.name || ""}
                  onChange={(e) => updatePlanMeta({ name: e.target.value })}
                  disabled={!canEdit}
                  placeholder="e.g. Annual Coffee Operations"
                />
              )}
            />
            <FormField
              label="Planning cycle"
              render={(props) => (
                <Input
                  {...props}
                  value={plan?.planningCycleLabel || ""}
                  onChange={(e) => updatePlanMeta({ planningCycleLabel: e.target.value })}
                  disabled={!canEdit}
                  placeholder="e.g. 2027 Programme"
                />
              )}
            />
            <FormField
              label="Budget year"
              required
              render={() => (
                <Select
                  value={String(plan?.budgetYearGc || new Date().getFullYear())}
                  onValueChange={(v) => {
                    const y = Number(v);
                    if (plan) {
                      updatePlanMeta({
                        budgetYearGc: y,
                        budgetYearLabel: budgetYearLabel(y).label,
                        planningCycleLabel: plan.planningCycleLabel || `${y} Programme`,
                      });
                    }
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
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
            <FormField
              label="Farm area / estate"
              required
              render={() => (
                <Select
                  value={plan?.farmEstateId || ""}
                  onValueChange={(id) => {
                    if (planId) {
                      const farm = farms.find((f) => f.id === id);
                      if (farm) {
                        updatePlanMeta({
                          farmEstateId: farm.id,
                          farmName: farm.name,
                        });
                      }
                      return;
                    }
                    void ensurePlan(id, plan?.budgetYearGc);
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select farm" />
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
              label="Program band"
              required
              render={() => {
                const a = activeBandSet?.bands.find((b) => b.band === "A");
                const b = activeBandSet?.bands.find((x) => x.band === "B");
                const c = activeBandSet?.bands.find((x) => x.band === "C");
                const value =
                  plan?.programBandSetId ||
                  activeBandSet?.id ||
                  programBandOptions[0]?.id ||
                  "";
                return (
                  <div className="space-y-2">
                    <Select
                      value={value}
                      disabled={!canEdit || programBandOptions.length === 0}
                      onValueChange={(id) => {
                        const row = bandSets.find((s) => s.id === id);
                        if (row) setActiveBandProgram(row.programId);
                        updatePlanMeta({ programBandSetId: id });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select program band" />
                      </SelectTrigger>
                      <SelectContent>
                        {programBandOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.programName} · {s.effectiveYear}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {a && b && c
                        ? `A ≤ ETB ${a.maxEtb?.toLocaleString()} · B ≤ ETB ${b.maxEtb?.toLocaleString()} · C/D Silva gate`
                        : "Create bands under Administration → Spend Bands"}
                      {" · "}
                      <Link
                        href={CROPFORT_ROUTES.spendBands}
                        className="underline-offset-2 hover:underline"
                      >
                        Manage
                      </Link>
                    </p>
                  </div>
                );
              }}
            />
            <FormField
              label="Plan status"
              render={() => (
                <div className="flex h-10 items-center">
                  {plan ? (
                    <StatusBadge status={plan.status} />
                  ) : (
                    <span className="text-sm text-muted-foreground">No plan yet</span>
                  )}
                </div>
              )}
            />
          </div>

          {plan ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {loading
                ? "Loading rates…"
                : `${farmEligibleCount} approved rates · ${farmBlocksAll.length} blocks`}
            </p>
          ) : null}
          {error ? (
            <p className="mt-2 text-xs text-muted-foreground">{error}</p>
          ) : null}

          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
            onClick={() => setMoreSetup((v) => !v)}
          >
            {moreSetup ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            More
          </button>

          {moreSetup && plan ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                    value={plan.totalHa || ""}
                    disabled={!canEdit}
                    onChange={(e) =>
                      updatePlanMeta({ totalHa: Number(e.target.value) || 0 })
                    }
                  />
                )}
              />
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-medium">Applicable blocks</p>
                <div className="flex flex-wrap gap-3">
                  {farmBlocksAll.map((b) => {
                    const checked = plan.applicableBlockIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className="inline-flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={!canEdit}
                          onCheckedChange={(v) => {
                            const on = Boolean(v);
                            const next = on
                              ? [...new Set([...plan.applicableBlockIds, b.id])]
                              : plan.applicableBlockIds.filter((id) => id !== b.id);
                            updatePlanMeta({ applicableBlockIds: next });
                          }}
                        />
                        {b.code}
                      </label>
                    );
                  })}
                  {farmBlocksAll.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      No blocks on file — activities can still use farm-level qty.
                    </span>
                  ) : null}
                </div>
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
        </SectionCard>
      ) : null}

      {/* ——— ACTIVITY LINES ——— */}
      {step === "activities" && plan ? (
        <SectionCard
          title="Activity lines"
          description={`${filteredActivities.length.toLocaleString()} of ${allPlanActivities.length.toLocaleString()} lines · ${completion.includedCount} included · ${fmtEtb(completion.budgetEtb)}`}
          flush
          action={
            canEdit && filteredActivities.length > 0 ? (
              <Button size="sm" variant="outline" onClick={selectFiltered}>
                Select filtered
              </Button>
            ) : null
          }
        >
          <div className="space-y-2 border-b border-border px-4 py-2.5 sm:px-5">
            <TableToolbar
              className="gap-2"
              search={activityQuery}
              onSearchChange={setActivityQuery}
              searchPlaceholder="Search code, name, or category…"
              activeFilterCount={
                (activityFilter !== "all" ? 1 : 0) + (activityCategory !== "all" ? 1 : 0)
              }
              onClearFilters={() => {
                setActivityFilter("all");
                setActivityCategory("all");
                setActivityQuery("");
              }}
              filters={
                <Select
                  value={activityFilter}
                  onValueChange={(v) => setActivityFilter(v as ActivityFilter)}
                >
                  <SelectTrigger className="h-8 w-auto min-w-[7.5rem] shrink-0" aria-label="Line status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All lines</SelectItem>
                    <SelectItem value="included">Included</SelectItem>
                    <SelectItem value="excluded">Not included</SelectItem>
                    <SelectItem value="no_rate">Missing rate</SelectItem>
                  </SelectContent>
                </Select>
              }
            />

            {cats.length > 0 ? (
              <div
                className="flex flex-wrap items-center gap-1"
                role="tablist"
                aria-label="Categories"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activityCategory === "all"}
                  onClick={() => setActivityCategory("all")}
                  className={cn(
                    "shrink-0 rounded-md px-2 py-1 text-xs font-medium touch-manipulation",
                    activityCategory === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  All ({allPlanActivities.length})
                </button>
                {cats.map((cat) => {
                  const count = allPlanActivities.filter((a) => a.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={activityCategory === cat}
                      onClick={() => setActivityCategory(cat)}
                      className={cn(
                        "shrink-0 rounded-md px-2 py-1 text-xs font-medium touch-manipulation",
                        activityCategory === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            ) : null}

            {selectedIds.size > 0 && canEdit ? (
              <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center">
                <p className="text-sm font-medium tabular-nums">
                  {selectedIds.size.toLocaleString()} selected
                </p>
                <div className="flex flex-wrap gap-1.5 sm:ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      const n = setActivitiesIncluded([...selectedIds], true);
                      toast.success(
                        n > 0
                          ? `Included ${n} line${n === 1 ? "" : "s"}`
                          : "No lines could be included (missing rate)",
                      );
                    }}
                  >
                    Include
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      const n = setActivitiesIncluded([...selectedIds], false);
                      toast.success(`Excluded ${n} line${n === 1 ? "" : "s"}`);
                    }}
                  >
                    Exclude
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      setAssignQtyValue("");
                      setAssignQtyOpen(true);
                    }}
                  >
                    Assign qty
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setAssignScheduleOpen(true)}
                  >
                    Assign schedule
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="cf-table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-3">
                    <Checkbox
                      checked={
                        allPageSelected ? true : somePageSelected ? "indeterminate" : false
                      }
                      disabled={!canEdit || pagedActivities.length === 0}
                      aria-label="Select all on this page"
                      onCheckedChange={(v) => toggleSelectPage(Boolean(v))}
                    />
                  </TableHead>
                  <TableHead className="w-10 px-2">
                    <span className="sr-only">In plan</span>
                  </TableHead>
                  <TableHead className="min-w-[12rem]">Activity</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="w-28">Qty</TableHead>
                  <TableHead className="hidden sm:table-cell w-28">Rate</TableHead>
                  <TableHead className="w-28">Cost</TableHead>
                  <TableHead className="hidden lg:table-cell w-28">Schedule</TableHead>
                  <TableHead className="w-24">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedActivities.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      {allPlanActivities.length === 0
                        ? "No Tier 1 activities with approved rates on this farm yet."
                        : "No lines match these filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedActivities.map((act) => {
                    const focused = focusActivityId === act.id;
                    const splitting = splitId === act.id;
                    const hasRate = Boolean(act.agreedRate);
                    const selected = selectedIds.has(act.id);
                    return (
                      <Fragment key={act.id}>
                        <TableRow
                          id={`act-${act.id}`}
                          data-state={selected ? "selected" : undefined}
                          className={cn(
                            selected && "bg-accent/40",
                            focused && "bg-muted/40",
                            !hasRate && "opacity-80",
                          )}
                        >
                          <TableCell className="px-3">
                            <Checkbox
                              checked={selected}
                              disabled={!canEdit}
                              aria-label={`Select ${act.activityName}`}
                              onCheckedChange={(v) => toggleSelected(act.id, Boolean(v))}
                            />
                          </TableCell>
                          <TableCell className="px-2">
                            <Checkbox
                              checked={act.included}
                              disabled={!canEdit || !hasRate}
                              aria-label={`Include ${act.activityName} in plan`}
                              onCheckedChange={(v) =>
                                setActivityIncluded(act.id, Boolean(v))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{act.activityName}</p>
                              <p className="truncate font-mono text-[11px] text-muted-foreground">
                                {act.activityCode} · {act.uom}
                                {act.scope === "off_block" ? " · Nursery" : ""}
                              </p>
                              {!hasRate ? (
                                <p className="mt-0.5 text-[11px] text-destructive">
                                  No rate —{" "}
                                  <Link
                                    className="underline"
                                    href={CROPFORT_ROUTES.rateCardProposals}
                                  >
                                    Rate cards
                                  </Link>
                                </p>
                              ) : null}
                              <p className="mt-0.5 text-[11px] text-muted-foreground md:hidden">
                                {act.category}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                            {act.category}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              inputMode="decimal"
                              className="h-8 w-[5.5rem]"
                              value={act.plannedQty || ""}
                              disabled={!canEdit || !act.included}
                              aria-label={`Planned quantity for ${act.activityName}`}
                              onChange={(e) =>
                                setPlannedQty(act.id, Number(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell className="hidden tabular-nums text-sm sm:table-cell">
                            {hasRate
                              ? `${fmtEtb(act.agreedRate!.unitRateEtb)}/${act.uom}`
                              : "—"}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm font-medium">
                            {fmtEtb(act.plannedCost)}
                          </TableCell>
                          <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                            {act.included
                              ? scheduleStatusOf(act) === "scheduled"
                                ? scheduleLabel(act)
                                : "Not set"
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {act.included && canEdit ? (
                              <div className="flex items-center justify-end gap-0.5">
                                {act.scope === "block" && planBlocks.length > 0 ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2"
                                    onClick={() =>
                                      setSplitId(splitting ? null : act.id)
                                    }
                                  >
                                    {splitting ? "Hide" : "Split"}
                                  </Button>
                                ) : null}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  title="Open schedule"
                                  aria-label={`Schedule ${act.activityName}`}
                                  onClick={() => {
                                    setFocusActivityId(act.id);
                                    setStep("calendar");
                                  }}
                                >
                                  <CalendarRange className="h-4 w-4" aria-hidden />
                                </Button>
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                        {splitting && act.scope === "block" ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={9} className="bg-muted/20 px-4 py-3">
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {planBlocks.map((b) => {
                                  const alloc = act.blockAllocations.find(
                                    (a) => a.blockId === b.id,
                                  );
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
                                            const others = act.blockAllocations.filter(
                                              (a) => a.blockId !== b.id,
                                            );
                                            setBlockAllocations(act.id, [
                                              ...others,
                                              {
                                                blockId: b.id,
                                                blockCode: b.code,
                                                qty,
                                              },
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
          </div>

          <div className="px-3 sm:px-4">
            <TablePagination
              page={activityPage}
              pageCount={activityPageCount}
              total={filteredActivities.length}
              pageSize={activityPageSize}
              onPageChange={setActivityPage}
              pageSizeOptions={ACTIVITY_PAGE_SIZES}
              onPageSizeChange={setActivityPageSize}
            />
          </div>
        </SectionCard>
      ) : null}

      {/* ——— SCHEDULE ——— */}
      {step === "calendar" && plan ? (
        <SectionCard
          title="Schedule"
          description={`${filteredScheduleActivities.length.toLocaleString()} of ${includedActivities.length.toLocaleString()} included lines · ${completion.scheduledCount} scheduled`}
          flush
          action={
            canEdit && filteredScheduleActivities.length > 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setScheduleSelectedIds(
                    new Set(filteredScheduleActivities.map((a) => a.id)),
                  )
                }
              >
                Select filtered
              </Button>
            ) : null
          }
        >
          <div className="space-y-3 border-b border-border px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Legend</span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-foreground text-[10px] text-background">
                  P
                </span>
                Peak
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-muted-foreground/30 text-[10px]">
                  A
                </span>
                Active
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px]">
                  L
                </span>
                Light
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-dashed border-border text-[10px] text-muted-foreground">
                  ·
                </span>
                Off
              </span>
            </div>

            {canEdit ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Paint brush</p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Schedule paint brush">
                  {(
                    [
                      ["active", "Active"],
                      ["peak", "Peak"],
                      ["light", "Light"],
                      ["none", "Clear"],
                      ["cycle", "Cycle"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={paintBrush === value}
                      onClick={() => setPaintBrush(value)}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-xs font-medium touch-manipulation transition-colors",
                        paintBrush === value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Click or drag across months to paint. Cycle advances blank → L → A → P → blank.
                </p>
              </div>
            ) : null}

            <TableToolbar
              search={scheduleQuery}
              onSearchChange={setScheduleQuery}
              searchPlaceholder="Search included lines…"
              activeFilterCount={
                (scheduleFilter !== "all" ? 1 : 0) +
                (scheduleCategory !== "all" ? 1 : 0)
              }
              onClearFilters={() => {
                setScheduleFilter("all");
                setScheduleCategory("all");
                setScheduleQuery("");
              }}
              filters={
                <>
                  <Select
                    value={scheduleFilter}
                    onValueChange={(v) => setScheduleFilter(v as ScheduleFilter)}
                  >
                    <SelectTrigger className="h-9 w-[10rem] shrink-0" aria-label="Schedule status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All included</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="unscheduled">Not scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={scheduleCategory} onValueChange={setScheduleCategory}>
                    <SelectTrigger className="h-9 w-[10rem] shrink-0" aria-label="Category">
                      <SelectValue placeholder="Category" />
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
                </>
              }
            />

            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2">
                {SCHEDULE_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0"
                    onClick={() =>
                      applyPresetToTargets(preset.from, preset.to, preset.intensity)
                    }
                  >
                    {preset.label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  onClick={() => {
                    setBulkFrom("oct");
                    setBulkTo("dec");
                    setBulkIntensity("active");
                    setAssignScheduleOpen(true);
                    if (scheduleSelectedIds.size === 0) {
                      setScheduleSelectedIds(
                        new Set(filteredScheduleActivities.map((a) => a.id)),
                      );
                    }
                  }}
                >
                  Custom range…
                </Button>
              </div>
            ) : null}

            {scheduleSelectedIds.size > 0 && canEdit ? (
              <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center">
                <p className="text-sm font-medium tabular-nums">
                  {scheduleSelectedIds.size.toLocaleString()} selected
                </p>
                <div className="flex flex-wrap gap-1.5 sm:ml-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      setBulkFrom("oct");
                      setBulkTo("dec");
                      setBulkIntensity("active");
                      setAssignScheduleOpen(true);
                    }}
                  >
                    Assign range
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() =>
                      applyPresetToTargets("oct", "sep", "none")
                    }
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => setScheduleSelectedIds(new Set())}
                  >
                    Deselect
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="cf-table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-[1] w-10 bg-card px-3">
                    <Checkbox
                      checked={
                        allSchedulePageSelected
                          ? true
                          : someSchedulePageSelected
                            ? "indeterminate"
                            : false
                      }
                      disabled={!canEdit || pagedScheduleActivities.length === 0}
                      aria-label="Select all on this page"
                      onCheckedChange={(v) => toggleScheduleSelectPage(Boolean(v))}
                    />
                  </TableHead>
                  <TableHead className="sticky left-10 z-[1] min-w-[11rem] bg-card">
                    Activity
                  </TableHead>
                  {PLAN_MONTHS.map((m) => (
                    <TableHead key={m} className="px-1 text-center text-[11px]">
                      {PLAN_MONTH_LABELS[m]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedScheduleActivities.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={14} className="py-12 text-center text-sm text-muted-foreground">
                      {includedActivities.length === 0
                        ? "No included activity lines yet. Include lines on the previous step."
                        : "No lines match these schedule filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedScheduleActivities.map((act) => {
                    const selected = scheduleSelectedIds.has(act.id);
                    return (
                      <TableRow
                        key={act.id}
                        id={`sched-${act.id}`}
                        className={cn(
                          selected && "bg-accent/40",
                          focusActivityId === act.id && "bg-muted/40",
                        )}
                      >
                        <TableCell className="sticky left-0 z-[1] bg-card px-3">
                          <Checkbox
                            checked={selected}
                            disabled={!canEdit}
                            aria-label={`Select ${act.activityName}`}
                            onCheckedChange={(v) =>
                              toggleScheduleSelected(act.id, Boolean(v))
                            }
                          />
                        </TableCell>
                        <TableCell className="sticky left-10 z-[1] bg-card">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{act.activityName}</p>
                            <p className="truncate font-mono text-[10px] text-muted-foreground">
                              {act.activityCode} · {act.category}
                            </p>
                          </div>
                        </TableCell>
                        {PLAN_MONTHS.map((m) => (
                          <TableCell key={m} className="p-0.5 text-center">
                            <button
                              type="button"
                              disabled={!canEdit}
                              title={`${PLAN_MONTH_LABELS[m]} · ${act.intensities[m]}`}
                              aria-label={`${act.activityName} ${PLAN_MONTH_LABELS[m]} ${act.intensities[m]}`}
                              className={cn(
                                "inline-flex h-8 w-8 items-center justify-center rounded text-[10px] font-medium touch-manipulation select-none",
                                intensityClass(act.intensities[m]),
                                !canEdit && "cursor-default",
                              )}
                              onMouseDown={(e) => {
                                if (!canEdit || e.button !== 0) return;
                                e.preventDefault();
                                paintingRef.current = true;
                                applyCellIntensity(act.id, m);
                              }}
                              onMouseEnter={() => {
                                if (!paintingRef.current || !canEdit) return;
                                applyCellIntensity(act.id, m);
                              }}
                              onTouchStart={(e) => {
                                if (!canEdit) return;
                                e.preventDefault();
                                paintingRef.current = true;
                                applyCellIntensity(act.id, m);
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
          </div>

          <div className="px-3 sm:px-4">
            <TablePagination
              page={schedulePage}
              pageCount={schedulePageCount}
              total={filteredScheduleActivities.length}
              pageSize={schedulePageSize}
              onPageChange={setSchedulePage}
              pageSizeOptions={ACTIVITY_PAGE_SIZES}
              onPageSizeChange={setSchedulePageSize}
            />
          </div>
        </SectionCard>
      ) : null}

      {/* ——— REVIEW ——— */}
      {step === "review" && plan ? (
        <div className="space-y-4">
          <SectionCard title="Review">
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-lg font-medium tabular-nums">
                  {fmtEtb(completion.budgetEtb)}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">Band</p>
                <p className="font-medium">
                  {band}
                  {bandAutoApproves(band) ? " · auto" : " · approval"}
                </p>
              </div>
            </div>

            {canApprovePlan ? (
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                Pending decision —{" "}
                <Link href={CROPFORT_ROUTES.approvals} className="font-medium underline-offset-4 hover:underline">
                  Approvals
                </Link>
              </div>
            ) : null}

            {issues.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Ready
              </div>
            ) : (
              <ul className="space-y-2">
                {issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    {issue.severity === "block" ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />
                    )}
                    <span className="flex-1">{issue.message}</span>
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
                Last promotion: Band {plan.promotions[0].band} · {plan.promotions[0].note}
              </p>
            ) : null}
          </SectionCard>
        </div>
      ) : null}

      {/* Persistent action bar */}
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur">
        <Button
          size="sm"
          variant="outline"
          disabled={!plan}
          onClick={() => {
            void (async () => {
              try {
                await saveDraft();
                toast.success("Draft saved");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Save failed");
              }
            })();
          }}
        >
          Save draft
        </Button>
        {prevStep(step) ? (
          <Button size="sm" variant="outline" onClick={goBack}>
            Back
          </Button>
        ) : null}
        <div className="sm:ml-auto" />
        {step !== "review" ? (
          <Button size="sm" disabled={!plan} onClick={goNext}>
            Continue
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={!plan || !canEdit || blockingIssues.length > 0}
              onClick={() => {
                void (async () => {
                  try {
                    await finalize();
                    toast.success("Plan finalized");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Finalize failed");
                  }
                })();
              }}
            >
              Finalize
            </Button>
            <Button
              size="sm"
              disabled={
                !plan ||
                !canEdit ||
                blockingIssues.length > 0 ||
                completion.budgetEtb <= 0
              }
              onClick={() => setSubmitOpen(true)}
            >
              Submit → AFPs
            </Button>
          </>
        )}
      </div>

      <Dialog open={assignQtyOpen} onOpenChange={setAssignQtyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign quantity to {selectedIds.size.toLocaleString()} line
              {selectedIds.size === 1 ? "" : "s"}
            </DialogTitle>
          </DialogHeader>
          <FormField
            label="Planned quantity"
            required
            render={(props) => (
              <Input
                {...props}
                type="number"
                inputMode="decimal"
                value={assignQtyValue}
                onChange={(e) => setAssignQtyValue(e.target.value)}
                placeholder="e.g. 10"
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            Same quantity is applied to every selected line. Include those lines if they are not
            already in the plan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignQtyOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const qty = Number(assignQtyValue);
                if (!Number.isFinite(qty) || qty < 0) {
                  toast.error("Enter a valid quantity");
                  return;
                }
                const ids = [...selectedIds];
                setActivitiesIncluded(ids, true);
                const n = setActivitiesPlannedQty(ids, qty);
                toast.success(`Assigned qty ${qty} to ${n} line${n === 1 ? "" : "s"}`);
                setAssignQtyOpen(false);
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignScheduleOpen} onOpenChange={setAssignScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign schedule to {selectedIds.size.toLocaleString()} line
              {selectedIds.size === 1 ? "" : "s"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField
              label="From"
              render={() => (
                <Select value={bulkFrom} onValueChange={(v) => setBulkFrom(v as PlanMonth)}>
                  <SelectTrigger>
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
              render={() => (
                <Select value={bulkTo} onValueChange={(v) => setBulkTo(v as PlanMonth)}>
                  <SelectTrigger>
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
              render={() => (
                <Select
                  value={bulkIntensity}
                  onValueChange={(v) => setBulkIntensity(v as MonthIntensity)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="peak">Peak</SelectItem>
                    <SelectItem value="none">Clear</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const targets =
                  scheduleSelectedIds.size > 0
                    ? [...scheduleSelectedIds]
                    : [...selectedIds];
                if (targets.length === 0) {
                  toast.error("Select activity lines first");
                  return;
                }
                const n = applyScheduleToActivities(
                  targets,
                  bulkFrom,
                  bulkTo,
                  bulkIntensity,
                );
                toast.success(
                  n > 0
                    ? `Schedule assigned to ${n} line${n === 1 ? "" : "s"}`
                    : "No lines with rates to schedule",
                );
                setAssignScheduleOpen(false);
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit to AFPs</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {fmtEtb(completion.budgetEtb)} · Band {band}
            {bandAutoApproves(band) ? " · auto" : " · approval"}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void (async () => {
                  try {
                    const promo = await submitToAfps();
                    toast.success(`Promoted · Band ${promo.band}`, {
                      action: {
                        label: "Open AFP",
                        onClick: () => {
                          window.location.href = CROPFORT_ROUTES.afpRegister;
                        },
                      },
                    });
                    setSubmitOpen(false);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Submit failed");
                  }
                })();
              }}
            >
              Submit → AFPs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
