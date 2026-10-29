"use client";

import { SHOW_SPEND_BANDS } from "@/config/features";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Coffee,
  FileText,
  Leaf,
  ListChecks,
  MapPin,
  Minus,
  Plus,
  Shovel,
  Sprout,
  TreeDeciduous,
  Search,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FormField } from "@/components/cropfort/form-field";
import { BudgetYearPicker } from "@/components/cropfort/year-picker";
import { PlanAssessmentCard } from "@/components/cropfort/plan-assessment-card";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { TablePagination } from "@/components/cropfort/data-table";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useOptionalSidebar } from "@/components/ui/sidebar";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useActiveFarmId } from "@/store/farmWorkspaceStore";
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
  scheduleStatusOf,
  useCoreOpsPlanStore,
} from "@/store/coreOpsPlanStore";
import { sharesTotal } from "@/lib/cropfort/month-shares";
import { ScheduleActivityCard, ScheduleActivityRow } from "@/components/cropfort/schedule-activity-card";
import {
  PLAN_PERIOD_MONTH_NAMES,
  PLAN_PERIOD_KINDS,
  SIX_MONTH_COUNT,
  monthsForPeriod,
  monthsLabel,
  periodFromMonths,
  planPeriodLabel,
  planPeriodOf,
  sixMonthsFrom,
  type PlanPeriodKind,
} from "@/lib/cropfort/plan-period";
import { useCreateProgrammePlan } from "@/lib/query/hooks/use-programme-plans";
import { ActivityRateCardPanel } from "@/components/rate-cards/activity-rate-card-panel";
import { useSpendBandStore } from "@/store/spendBandStore";
import type { CoreOpsActivity, CoreOpsStep, MonthIntensity } from "@/types/core-ops";

const STEPS: { id: CoreOpsStep; label: string; hint: string }[] = [
  { id: "setup", label: "Details", hint: "Name the plan and choose the farm area." },
  { id: "activities", label: "Activities", hint: "Tick the activities this farm needs and enter how much of each." },
  { id: "calendar", label: "Schedule", hint: "Mark the months each activity runs." },
  { id: "review", label: "Review", hint: "Check the plan, then submit it to the asset owner." },
];

const PAGE_SIZES = [25, 50, 100];

const IN_PLAN = "__plan";
type ScheduleFilter = "all" | "todo" | "ready";

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

/** The box behind each plan step: a soft header with an icon, title and one line of help. */
function StepPanel({
  icon: Icon,
  title,
  description,
  flush,
  actions,
  children,
}: {
  icon: typeof ListChecks;
  title: string;
  description?: string;
  flush?: boolean;
  /** Step buttons (Back, Save, Continue…) in the card's footer. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      key={title}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,20,0.05)]"
    >
      <header className="flex items-center gap-2.5 border-b border-border/60 bg-muted/30 px-4 py-3.5 sm:px-6">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-foreground/70" aria-hidden>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </header>
      <div className={flush ? undefined : "p-4 sm:p-6"}>{children}</div>
      {actions ? (
        <footer className="border-t border-border/70 px-4 py-3 sm:px-6">{actions}</footer>
      ) : null}
    </motion.section>
  );
}

/** A simple picture for each activity category. */
function categoryIcon(category: string) {
  const c = category.toLowerCase();
  if (c.includes("nursery")) return Sprout;
  if (c.includes("young")) return Leaf;
  if (c.includes("matur")) return TreeDeciduous;
  if (c.includes("infill") || c.includes("plant")) return Shovel;
  if (c.includes("harvest")) return Coffee;
  return ListChecks;
}

function stepIndex(step: CoreOpsStep) {
  return STEPS.findIndex((s) => s.id === step);
}

export default function CoreOperationsView({ planId, isNew = false }: { planId?: string; isNew?: boolean } = {}) {
  const { user, activeProgram } = useCropfortAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canView = canViewRateCard(user.role);

  // Hide the shell's top bar while a plan is open (see .cf-plan-focus in globals.css)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("cf-plan-focus");
    return () => root.classList.remove("cf-plan-focus");
  }, []);

  // The plan editor needs the room: fold the sidebar while a plan is open, then put it back
  const sidebar = useOptionalSidebar();
  const sidebarRef = useRef(sidebar);
  sidebarRef.current = sidebar;
  useEffect(() => {
    const ctx = sidebarRef.current;
    if (!ctx || ctx.isMobile || !ctx.open) return;
    ctx.setOpen(false);
    return () => {
      // Leave it alone if the user opened it again themselves
      const now = sidebarRef.current;
      if (now && !now.open) now.setOpen(true);
    };
  }, [planId, isNew]);

  const farms = useCoreOpsPlanStore((s) => s.farms);
  const eligible = useCoreOpsPlanStore((s) => s.eligible);
  const loading = useCoreOpsPlanStore((s) => s.loading);
  const error = useCoreOpsPlanStore((s) => s.error);
  // A new plan has no saved plan yet: the editor shows only the Details step until it's created
  const storedPlan = useCoreOpsPlanStore((s) => s.plan);
  const storedStep = useCoreOpsPlanStore((s) => s.step);
  // Only show the stored plan when it is the one in the URL (the store keeps the last plan opened)
  const plan = isNew ? null : planId && storedPlan?.id !== planId ? null : storedPlan;
  const step: CoreOpsStep = isNew ? "setup" : storedStep;
  const focusActivityId = useCoreOpsPlanStore((s) => s.focusActivityId);
  const loadContext = useCoreOpsPlanStore((s) => s.loadContext);
  const syncActivitiesFromEligible = useCoreOpsPlanStore((s) => s.syncActivitiesFromEligible);

  // Rate card for a plan line, opened under its row: source farm rates, rate scenarios, plan rate
  const [rateCardFor, setRateCardFor] = useState<string | null>(null);
  const kindOf = (act: CoreOpsActivity): "labor" | "materials" | "services" => {
    // The cost type comes from the registered activity and isn't changed here
    const own = (
      eligible.find((e) => e.activityId === act.activityId && e.farmEstateId === plan?.farmEstateId)?.costKind ||
      act.agreedRate?.costKind ||
      "labor"
    ).split("+")[0];
    return own === "materials" || own === "services" ? own : "labor";
  };
  const openExpertInput = (act: CoreOpsActivity) => setRateCardFor(act.id);
  const setAgreedRate = useCoreOpsPlanStore((s) => s.setAgreedRate);
  /** Rate a line had before an instant rate change, to restore if the save fails. */
  const rateBeforeRef = useRef<{ id: string; rate: CoreOpsActivity["agreedRate"] } | null>(null);
  const rateCardTarget = rateCardFor && plan ? plan.activities[rateCardFor] ?? null : null;
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
  const setMonthShare = useCoreOpsPlanStore((s) => s.setMonthShare);
  const splitSharesEvenly = useCoreOpsPlanStore((s) => s.splitSharesEvenly);
  const setActivityMonths = useCoreOpsPlanStore((s) => s.setActivityMonths);
  const copySchedule = useCoreOpsPlanStore((s) => s.copySchedule);
  const applyScheduleToActivities = useCoreOpsPlanStore((s) => s.applyScheduleToActivities);
  const planCompletion = useCoreOpsPlanStore((s) => s.planCompletion);
  const reviewIssues = useCoreOpsPlanStore((s) => s.reviewIssues);
  const saveDraft = useCoreOpsPlanStore((s) => s.saveDraft);
  const submitToAfps = useCoreOpsPlanStore((s) => s.submitToAfps);
  const blocksForPlan = useCoreOpsPlanStore((s) => s.blocksForPlan);

  const canEdit = canCreateProgrammePlan(user.role) && plan?.status !== "submitted";
  const canApprovePlan = canApproveOperations(user.role) && plan?.status === "submitted";


  // ——— New plan (Details step before the plan exists) ———
  const createMut = useCreateProgrammePlan();
  const canCreatePlan = canCreateProgrammePlan(user.role);
  const [draft, setDraft] = useState({
    name: "",
    farmEstateId: "",
    year: String(new Date().getFullYear()),
    periodKind: "annual" as PlanPeriodKind,
    months: sixMonthsFrom("oct") as PlanMonth[],
    description: "",
  });
  const draftPeriod = draft.periodKind === "annual" ? "annual" : periodFromMonths(draft.months);
  const draftMonthsOk = draft.periodKind === "annual" || draft.months.length === SIX_MONTH_COUNT;
  const toggleDraftMonth = (m: PlanMonth) =>
    setDraft((d) => {
      if (d.months.includes(m)) return { ...d, months: d.months.filter((x) => x !== m) };
      if (d.months.length >= SIX_MONTH_COUNT) return d;
      return { ...d, months: [...d.months, m] };
    });
  // A new plan starts on the farm area chosen in the top bar (or the only one there is)
  const workspaceFarmId = useActiveFarmId();
  useEffect(() => {
    if (!isNew || draft.farmEstateId) return;
    const start = farms.find((f) => f.id === workspaceFarmId)?.id ?? (farms.length === 1 ? farms[0].id : "");
    if (start) setDraft((d) => ({ ...d, farmEstateId: start }));
  }, [isNew, farms, draft.farmEstateId, workspaceFarmId]);
  const onCreatePlan = async () => {
    if (!canCreatePlan) {
      toast.error("Only SPX can create Core Operations plans");
      return;
    }
    const year = Number(draft.year);
    try {
      const row = await createMut.mutateAsync({
        name: draft.name.trim(),
        farmEstateId: draft.farmEstateId,
        planYear: year,
        planPeriod: draftPeriod,
        planningCycleLabel:
          draftPeriod === "annual" ? `${year} Core Operations` : `${year} Core Operations · ${planPeriodLabel(draftPeriod)}`,
        budgetYearLabel: budgetYearLabel(year).label,
        description: draft.description.trim(),
        notes: "",
      });
      toast.success(`Created ${row.name}`);
      router.replace(`${CROPFORT_ROUTES.programmePlans}/${row.id}?step=activities`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create plan");
    }
  };
  const [splitId, setSplitId] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);

  const [activityQuery, setActivityQuery] = useState("");
  /** Activities step shows one category at a time ("" = none chosen yet, IN_PLAN = what's in the plan). */
  const [activityCategory, setActivityCategory] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(25);

  const [scheduleQuery, setScheduleQuery] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [schedulePage, setSchedulePage] = useState(1);
  const [schedulePageSize, setSchedulePageSize] = useState(25);
  const [scheduleSelectedIds, setScheduleSelectedIds] = useState<Set<string>>(() => new Set());
  const [rangeOpen, setRangeOpen] = useState(false);
  /** Activity whose calendar is open in the Schedule modal. */
  const [calendarFor, setCalendarFor] = useState<string | null>(null);
  /** Order of activities for Previous / Next, fixed when the modal opens so filters don't shift it. */
  const [calendarList, setCalendarList] = useState<string[]>([]);
  const [rangeFrom, setRangeFrom] = useState<PlanMonth>("oct");
  const [rangeTo, setRangeTo] = useState<PlanMonth>("dec");
  // A six-month plan only schedules the months in its half of the year
  const planPeriod = planPeriodOf(plan ?? {});
  const periodMonths = monthsForPeriod(planPeriod);
  useEffect(() => {
    if (!periodMonths.includes(rangeFrom)) setRangeFrom(periodMonths[0]);
    if (!periodMonths.includes(rangeTo)) setRangeTo(periodMonths[Math.min(2, periodMonths.length - 1)]);
  }, [periodMonths, rangeFrom, rangeTo]);
  const [rangeIntensity, setRangeIntensity] = useState<MonthIntensity>("active");

  useEffect(() => {
    if (!canView) return;
    void (async () => {
      await loadContext();
      if (planId) {
        await loadPlanById(planId);
        // Arriving from "Create plan" carries ?step= so the editor continues where creation left off
        const nextStep = new URLSearchParams(window.location.search).get("step");
        if (nextStep && STEPS.some((s) => s.id === nextStep)) setStep(nextStep as CoreOpsStep);
      }
    })();
  }, [canView, activeProgram?.id, planId, loadContext, loadPlanById, setStep]);

  // Returned plans are fixed on their own page; "Open full planner" there adds ?full=1
  useEffect(() => {
    if (!planId || plan?.id !== planId || plan.statusRaw !== "returned") return;
    if (new URLSearchParams(window.location.search).get("full") === "1") return;
    router.replace(`${CROPFORT_ROUTES.programmePlans}/${planId}/fix`);
  }, [planId, plan?.id, plan?.statusRaw, router]);

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
  // What's still to do on each step, in plain words (null = step done)
  const needQty = issues.filter((i) => i.id.startsWith("qty-")).length;
  const needRate = issues.filter((i) => i.id.startsWith("rate-")).length;
  const unscheduled = issues.filter((i) => i.id.startsWith("sched-")).length;
  const badSplits = issues.filter((i) => i.id.startsWith("share-")).length;
  const stepTodo: Record<CoreOpsStep, string | null> = {
    setup: !plan ? "Create the plan" : !plan.name?.trim() ? "Give the plan a name" : null,
    activities:
      completion.includedCount === 0
        ? "Choose at least one activity"
        : [needQty ? `${needQty} need a quantity` : "", needRate ? `${needRate} need a rate` : ""]
            .filter(Boolean)
            .join(" · ") || null,
    calendar:
      completion.includedCount === 0
        ? "Choose activities first"
        : [unscheduled ? `${unscheduled} without months` : "", badSplits ? `${badSplits} not at 100%` : ""]
            .filter(Boolean)
            .join(" · ") || null,
    review: null,
  };
  const planBlocks = blocksForPlan();
  const band = bandForEtb(completion.budgetEtb);

  const farmEligibleCount = useMemo(
    () => (plan ? eligible.filter((e) => e.farmEstateId === plan.farmEstateId).length : 0),
    [eligible, plan],
  );

  const allActivities = useMemo(() => {
    if (!plan) return [] as CoreOpsActivity[];
    return plan.activityIds
      .map((id) => plan.activities[id])
      .filter((a): a is CoreOpsActivity => Boolean(a));
  }, [plan]);

  // ——— Activities step ———
  const filteredActivities = useMemo(() => {
    const q = activityQuery.trim().toLowerCase();
    // Nothing is listed until a category is chosen, or the user searches
    if (!activityCategory && !q) return [];
    return allActivities.filter((act) => {
      if (activityCategory === IN_PLAN && !act.included) return false;
      if (activityCategory && activityCategory !== IN_PLAN && act.category !== activityCategory) return false;
      return activityMatchesQuery(act, q);
    });
  }, [allActivities, activityCategory, activityQuery]);

  const activityCategories = useMemo(() => {
    const rows = new Map<string, { category: string; total: number; inPlan: number }>();
    for (const act of allActivities) {
      const row = rows.get(act.category) ?? { category: act.category, total: 0, inPlan: 0 };
      row.total += 1;
      if (act.included) row.inPlan += 1;
      rows.set(act.category, row);
    }
    return [...rows.values()];
  }, [allActivities]);

  const activityPageCount = Math.max(1, Math.ceil(filteredActivities.length / activityPageSize));
  const pagedActivities = filteredActivities.slice(
    (activityPage - 1) * activityPageSize,
    activityPage * activityPageSize,
  );

  useEffect(() => {
    setActivityPage(1);
  }, [activityQuery, activityCategory, activityPageSize, plan?.id]);

  const includableFiltered = filteredActivities;
  const includedFilteredCount = includableFiltered.filter((a) => a.included).length;
  const allFilteredIncluded = includableFiltered.length > 0 && includedFilteredCount === includableFiltered.length;

  // ——— Schedule step ———
  const includedActivities = useMemo(() => allActivities.filter((a) => a.included), [allActivities]);

  const filteredSchedule = useMemo(() => {
    const q = scheduleQuery.trim().toLowerCase();
    return includedActivities.filter((act) => {
      const ready = scheduleStatusOf(act) === "scheduled" && Math.abs(sharesTotal(act) - 100) <= 0.01;
      if (scheduleFilter === "ready" && !ready) return false;
      if (scheduleFilter === "todo" && ready) return false;
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

  const pageScheduleSelected = pagedSchedule.filter((a) => scheduleSelectedIds.has(a.id)).length;
  const calendarAct = calendarFor && plan ? plan.activities[calendarFor] ?? null : null;
  const calendarIndex = calendarFor ? calendarList.indexOf(calendarFor) : -1;
  const scheduleReadyCount = includedActivities.filter(
    (a) => scheduleStatusOf(a) === "scheduled" && Math.abs(sharesTotal(a) - 100) <= 0.01,
  ).length;

  const toggleScheduleRow = (id: string, on: boolean) =>
    setScheduleSelectedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

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
    // The plan shows as submitted at once; the save runs behind it and is undone if it fails
    setSubmitOpen(false);
    toast.success("Submitted to the asset owner");
    try {
      await submitToAfps();
      void queryClient.invalidateQueries({ queryKey: queryKeys.programmePlans.all });
    } catch (err) {
      toast.error(err instanceof Error ? `Not submitted: ${err.message}` : "Submit failed");
    }
  };

  // Step buttons, shown in the footer of each step's card
  const todo = step !== "review" ? stepTodo[step] : blockingIssues.length ? `${blockingIssues.length} to fix before submitting` : null;
  const stepActions = plan ? (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="leading-tight">
          <p className="text-xs text-muted-foreground">Plan total</p>
          <p className="text-lg font-semibold tabular-nums">{fmtEtb(completion.budgetEtb)}</p>
        </div>
        {todo ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            {todo}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Step done
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 sm:ml-auto">
        {currentIndex > 0 ? (
          <Button variant="ghost" onClick={() => goTo(currentIndex - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            Back
          </Button>
        ) : null}
        {canEdit ? (
          <Button variant="outline" onClick={() => void onSave()}>
            Save draft
          </Button>
        ) : null}
        {step !== "review" ? (
          <Button className="ml-auto sm:ml-0" onClick={() => goTo(currentIndex + 1)}>
            Next: {STEPS[currentIndex + 1]?.label}
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        ) : canEdit ? (
          <Button
            className="ml-auto sm:ml-0"
            disabled={blockingIssues.length > 0 || completion.budgetEtb <= 0}
            title={blockingIssues.length ? "Fix the issues above first" : undefined}
            onClick={() => setSubmitOpen(true)}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
            Submit for approval
          </Button>
        ) : null}
      </div>
    </div>
  ) : null;

  return (
    <PageContainer className="cf-page-centered">
      <PageHeader
        title={isNew ? "New plan" : plan?.name || "Plan"}
        meta={
          plan && !isNew ? (
            <span>
              {[plan.farmName, budgetYearLabel(plan.budgetYearGc).ec, planPeriod !== "annual" ? planPeriodLabel(planPeriod) : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            {plan && !isNew ? <StatusBadge status={plan.status} /> : null}
            {/* Leaving the editor brings the sidebar and top bar back */}
            <Button
              variant="outline"
              size="sm"
              title="Exit planning"
              onClick={() => {
                if (canEdit && plan) void saveDraft().catch(() => undefined);
                router.push(CROPFORT_ROUTES.programmePlans);
              }}
            >
              <X className="mr-1 h-4 w-4" aria-hidden />
              Exit
            </Button>
          </div>
        }
      />

      {/* ——— DETAILS ——— */}
      {isNew ? (
        <StepPanel icon={FileText} title="Plan details">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Plan name"
              required
              render={(props) => (
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    {...props}
                    autoFocus
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="e.g. 2027 Annual Coffee Operations"
                    className="h-11 rounded-xl border-border/80 bg-background pl-10 text-[15px] shadow-sm transition-colors focus-visible:border-primary sm:h-11 md:text-[15px]"
                  />
                </div>
              )}
            />
            <FormField
              label="Farm area"
              required
              render={({ id }) => (
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Select value={draft.farmEstateId} onValueChange={(v) => setDraft((d) => ({ ...d, farmEstateId: v }))}>
                    <SelectTrigger id={id} className="h-11 rounded-xl border-border/80 bg-background pl-10 text-[15px] shadow-sm sm:h-11">
                      <SelectValue placeholder={farms.length ? "Select farm area" : loading ? "Loading…" : "No farm areas yet"} />
                    </SelectTrigger>
                    <SelectContent>
                      {farms.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
            <FormField
              label="Budget year"
              required
              render={({ id }) => (
                <BudgetYearPicker
                  id={id}
                  value={Number(draft.year)}
                  onChange={(y) => setDraft((d) => ({ ...d, year: String(y) }))}
                />
              )}
            />
            <div className="space-y-1.5 sm:col-span-2">
              <p className="text-sm font-medium">
                Plan covers <span className="text-destructive">*</span>
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PLAN_PERIOD_KINDS.map((p) => {
                  const on = draft.periodKind === p.id;
                  const KindIcon = p.id === "annual" ? CalendarDays : CalendarRange;
                  return (
                    <motion.button
                      key={p.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setDraft((d) => ({ ...d, periodKind: p.id }))}
                      aria-pressed={on}
                      className={cn(
                        "cf-focus relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                        on
                          ? "border-primary bg-primary/[0.06] shadow-[0_0_0_1px_hsl(var(--primary))]"
                          : "border-border/80 bg-background shadow-sm hover:border-primary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          on ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                        )}
                        aria-hidden
                      >
                        <KindIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm font-semibold", on && "text-primary")}>{p.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.id === "annual" ? "All 12 months of the budget year" : "Pick any 6 months"}
                        </span>
                      </span>
                      {on ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                      ) : null}
                    </motion.button>
                  );
                })}
              </div>
              {draft.periodKind === "six_months" ? (
                <div className="mt-2 space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Pick any {SIX_MONTH_COUNT} months of the year ·{" "}
                      <span className={cn("font-medium", draftMonthsOk ? "text-foreground" : "text-destructive")}>
                        {draft.months.length} of {SIX_MONTH_COUNT} chosen
                      </span>
                    </p>
                    <Select onValueChange={(v) => setDraft((d) => ({ ...d, months: sixMonthsFrom(v as PlanMonth) }))}>
                      <SelectTrigger className="h-8 w-[12rem] text-xs" aria-label="Six months starting from">
                        <SelectValue placeholder="Or start from…" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_MONTHS.slice(0, PLAN_MONTHS.length - SIX_MONTH_COUNT + 1).map((m) => (
                          <SelectItem key={m} value={m}>
                            {monthsLabel(sixMonthsFrom(m))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                    {PLAN_MONTHS.map((m) => {
                      const on = draft.months.includes(m);
                      const full = !on && draft.months.length >= SIX_MONTH_COUNT;
                      return (
                        <button
                          key={m}
                          type="button"
                          aria-pressed={on}
                          disabled={full}
                          onClick={() => toggleDraftMonth(m)}
                          className={cn(
                            "cf-focus h-10 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                            on ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/80 bg-background hover:border-primary/40",
                          )}
                        >
                          {PLAN_PERIOD_MONTH_NAMES[m]}
                        </button>
                      );
                    })}
                  </div>
                  {draftMonthsOk ? (
                    <p className="text-xs text-muted-foreground">Covers {monthsLabel(monthsForPeriod(draftPeriod))}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <FormField
                label="Description"
                optional
                render={(props) => (
                  <Textarea
                    {...props}
                    rows={2}
                    placeholder="Scope or goals for this plan"
                    className="rounded-xl border-border/80 bg-background text-[15px] shadow-sm"
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  />
                )}
              />
            </div>
          </div>
          {!loading && farms.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              <Link href={CROPFORT_ROUTES.farmAreas} className="text-primary underline-offset-2 hover:underline">
                Add a farm area
              </Link>{" "}
              first.
            </p>
          ) : null}
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            <Button variant="ghost" asChild>
              <Link href={CROPFORT_ROUTES.programmePlans}>Cancel</Link>
            </Button>
            <Button
              size="lg"
              className="min-w-[12rem]"
              disabled={!canCreatePlan || createMut.isPending || !draft.name.trim() || !draft.farmEstateId || !draftMonthsOk}
              onClick={() => void onCreatePlan()}
            >
              {createMut.isPending ? "Creating…" : "Create plan & continue"}
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
            </Button>
          </div>
        </StepPanel>
      ) : planId && !plan ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{error && !loading ? error : "Loading plan…"}</p>
      ) : step === "setup" ? (
        <StepPanel icon={FileText} title="Plan details">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Plan name"
              required
              render={(props) => (
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    {...props}
                    value={plan?.name || ""}
                    onChange={(e) => updatePlanMeta({ name: e.target.value })}
                    disabled={!canEdit || !plan}
                    placeholder={plan ? "e.g. Annual Coffee Operations" : "Select a farm area first"}
                    className="h-11 rounded-xl border-border/80 bg-background pl-10 text-[15px] shadow-sm transition-colors focus-visible:border-primary sm:h-11 md:text-[15px]"
                  />
                </div>
              )}
            />
            <FormField
              label="Farm area"
              required
              render={({ id }) => (
                <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
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
                  <SelectTrigger id={id} className="h-11 rounded-xl border-border/80 bg-background pl-10 text-[15px] shadow-sm sm:h-11">
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
                </div>
              )}
            />
            <FormField
              label="Budget year"
              required
              render={({ id }) => (
                <BudgetYearPicker
                  id={id}
                  value={plan?.budgetYearGc || new Date().getFullYear()}
                  onChange={(y) => {
                    if (plan) {
                      updatePlanMeta({
                        budgetYearGc: y,
                        budgetYearLabel: budgetYearLabel(y).label,
                        planningCycleLabel: `${y} Core Operations`,
                      });
                    }
                  }}
                  disabled={!canEdit || !plan}
                />
              )}
            />
          </div>

          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

          {/* Continue sits inside this card on the Details step */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              {stepTodo.setup ? stepTodo.setup : "Next: choose the activities for this plan."}
            </p>
            <Button disabled={!plan} onClick={() => goTo(1)} className="min-w-[12rem]">
              Continue to Activities
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
            </Button>
          </div>
        </StepPanel>
      ) : null}

      {/* ——— ACTIVITIES ——— */}
      {step === "activities" && plan ? (
        <StepPanel icon={ListChecks} title="Activities" flush actions={stepActions}>
          <div className="space-y-3 border-b border-border px-4 py-3 sm:px-5">
            <div>
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3" role="tablist" aria-label="Activity categories">
                {[
                  ...activityCategories.map((c) => ({ id: c.category, label: c.category, total: c.total, inPlan: c.inPlan })),
                  { id: IN_PLAN, label: "In this plan", total: completion.includedCount, inPlan: completion.includedCount },
                ].map((chip, i) => {
                  const active = activityCategory === chip.id;
                  const isPlan = chip.id === IN_PLAN;
                  const Icon = isPlan ? ListChecks : categoryIcon(chip.label);
                  const count = isPlan ? chip.total : chip.inPlan;
                  return (
                    <motion.button
                      key={chip.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActivityCategory(active ? "" : chip.id)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        "cf-focus relative flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-border bg-card hover:border-primary/40 hover:shadow-sm",
                        isPlan && !active && "border-dashed",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          active ? "bg-primary-foreground/20" : "bg-primary/10 text-primary",
                        )}
                        aria-hidden
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold leading-tight">{chip.label}</span>
                        <span className={cn("mt-0.5 block text-xs tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {isPlan
                            ? `${chip.total} chosen`
                            : `${chip.total} ${chip.total === 1 ? "activity" : "activities"}`}
                        </span>
                      </span>
                      {count > 0 && !isPlan ? (
                        <span
                          className={cn(
                            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                            active ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
                          )}
                          title={`${count} chosen`}
                        >
                          {count}
                        </span>
                      ) : null}
                    </motion.button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={activityQuery}
                  onChange={(e) => setActivityQuery(e.target.value)}
                  placeholder={
                    activityCategory && activityCategory !== IN_PLAN
                      ? `Search ${activityCategory}`
                      : `Or search all ${allActivities.length} activities`
                  }
                  className="h-10 pl-9"
                  aria-label="Search activities"
                />
              </div>
            </div>
          </div>
          <motion.div
            key={activityCategory || "none"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
          {pagedActivities.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
                <ListChecks className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium">
                {allActivities.length === 0
                  ? "No activities in the activity list yet"
                  : !activityCategory && !activityQuery.trim()
                    ? "Choose a category above"
                    : activityCategory === IN_PLAN && !activityQuery.trim()
                      ? "Nothing in this plan yet"
                      : "No activities match"}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 px-4 pt-3 text-xs text-muted-foreground sm:px-5">
                <span>
                  {includedFilteredCount} of {includableFiltered.length} chosen
                </span>
                {canEdit ? (
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => {
                      const n = setActivitiesIncluded(
                        includableFiltered.map((a) => a.id),
                        !allFilteredIncluded,
                      );
                      if (n) toast.success(`${allFilteredIncluded ? "Removed" : "Added"} ${n} activities`);
                    }}
                  >
                    {allFilteredIncluded ? "Remove all" : "Add all"}
                  </button>
                ) : null}
              </div>
              <ul className="cf-fit-list space-y-2 px-3 py-3 sm:px-4">
                {pagedActivities.map((act, i) => {
                  const hasRate = Boolean(act.agreedRate);
                  const splitting = splitId === act.id;
                  const qty = act.plannedQty || 0;
                  const step = qty >= 100 ? 10 : 1;
                  const setQty = (next: number) => {
                    const value = Math.max(0, Math.round(next * 100) / 100);
                    // Entering a quantity puts the activity in the plan
                    if (value > 0 && !act.included) setActivityIncluded(act.id, true);
                    setPlannedQty(act.id, value);
                  };
                  return (
                    <motion.li
                      key={act.id}
                      id={`act-${act.id}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(i, 10) * 0.025, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        "rounded-xl border bg-card transition-colors",
                        act.included ? "border-primary/50 bg-primary/[0.04] shadow-sm" : "border-border hover:border-primary/30",
                        focusActivityId === act.id && "ring-2 ring-primary/40",
                      )}
                    >
                      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          disabled={!canEdit}
                          aria-pressed={act.included}
                          aria-label={`${act.included ? "Remove" : "Add"} ${act.activityName}`}
                          onClick={() => setActivityIncluded(act.id, !act.included)}
                          className="cf-focus flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left disabled:cursor-default"
                        >
                          <motion.span
                            whileTap={{ scale: 0.85 }}
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                              act.included
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-transparent",
                            )}
                            aria-hidden
                          >
                            <Check className="h-4 w-4" />
                          </motion.span>
                          <span className="min-w-0">
                            <span className={cn("block truncate text-sm font-semibold", !act.included && "text-foreground/80")}>
                              {act.activityName}
                            </span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{act.activityCode}</span>
                              {act.scope === "off_block" ? <span>Nursery</span> : null}
                            </span>
                          </span>
                        </button>

                        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                          {hasRate ? (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => openExpertInput(act)}
                              title={canEdit ? "Open the rate card" : undefined}
                              className="cf-focus rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary transition-colors hover:bg-primary/15 disabled:cursor-default"
                            >
                              {fmtEtb(act.agreedRate!.unitRateEtb)}/{act.uom}
                            </button>
                          ) : canEdit ? (
                            <button
                              type="button"
                              onClick={() => openExpertInput(act)}
                              className="cf-focus rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-400"
                            >
                              Set rate
                            </button>
                          ) : (
                            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                              No rate
                            </span>
                          )}

                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => openExpertInput(act)}
                              aria-label={`Open the rate card for ${act.activityName}`}
                              className="cf-focus inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                            >
                              <FileText className="h-3.5 w-3.5" aria-hidden />
                              Rate card
                            </button>
                          ) : null}

                          <div className="flex items-center rounded-lg border border-border bg-background">
                            <button
                              type="button"
                              disabled={!canEdit || qty <= 0}
                              onClick={() => setQty(qty - step)}
                              className="cf-focus flex h-9 w-8 items-center justify-center rounded-l-lg text-muted-foreground hover:bg-muted disabled:opacity-40"
                              aria-label={`Less ${act.activityName}`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              value={act.plannedQty || ""}
                              placeholder="0"
                              disabled={!canEdit}
                              aria-label={`Quantity for ${act.activityName}`}
                              onChange={(e) => setQty(Number(e.target.value) || 0)}
                              className="h-9 w-16 border-x border-border bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] focus:bg-primary/5 [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setQty(qty + step)}
                              className="cf-focus flex h-9 w-8 items-center justify-center rounded-r-lg text-muted-foreground hover:bg-muted disabled:opacity-40"
                              aria-label={`More ${act.activityName}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-xs text-muted-foreground">{act.uom}</span>


                          <span
                            className={cn(
                              "ml-auto min-w-[6.5rem] text-right text-sm font-semibold tabular-nums sm:ml-2",
                              act.included ? "text-foreground" : "text-muted-foreground/60",
                            )}
                          >
                            {act.included ? fmtEtb(act.plannedCost) : "—"}
                          </span>
                        </div>
                      </div>

                      {act.included && canEdit && act.scope === "block" && planBlocks.length > 1 ? (
                        <div className="border-t border-border/70 px-3 py-2">
                          <button
                            type="button"
                            className="text-xs font-medium text-primary hover:underline"
                            onClick={() => setSplitId(splitting ? null : act.id)}
                          >
                            {splitting ? "Done splitting" : "Split by block"}
                          </button>
                          {splitting ? (
                            <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                              {planBlocks.map((b) => {
                                const alloc = act.blockAllocations.find((x) => x.blockId === b.id);
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
                                          const value = Number(e.target.value) || 0;
                                          const others = act.blockAllocations.filter((x) => x.blockId !== b.id);
                                          setBlockAllocations(act.id, [...others, { blockId: b.id, blockCode: b.code, qty: value }]);
                                        }}
                                      />
                                    )}
                                  />
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </motion.li>
                  );
                })}
              </ul>
            </>
          )}

          <div className="px-3 sm:px-4">
            {filteredActivities.length > activityPageSize ? (
              <TablePagination
                page={activityPage}
                pageCount={activityPageCount}
                total={filteredActivities.length}
                pageSize={activityPageSize}
                onPageChange={setActivityPage}
                pageSizeOptions={PAGE_SIZES}
                onPageSizeChange={setActivityPageSize}
              />
            ) : null}
          </div>
          </motion.div>
        </StepPanel>
      ) : null}

      {/* ——— SCHEDULE ——— */}
      {step === "calendar" && plan ? (
        <StepPanel icon={CalendarDays} title="Schedule" flush actions={stepActions}>
          {canEdit && scheduleSelectedIds.size > 0 ? (
            <div className="flex items-center justify-end border-b border-border px-4 py-2 sm:px-5">
              <Button size="sm" variant="outline" className="h-8" onClick={() => setRangeOpen(true)}>
                Set months for {scheduleSelectedIds.size}…
              </Button>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-28 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${includedActivities.length ? (scheduleReadyCount / includedActivities.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{scheduleReadyCount}</span> of {includedActivities.length} ready
              </span>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
              {(
                [
                  ["all", "All"],
                  ["todo", "To do"],
                  ["ready", "Ready"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScheduleFilter(value)}
                  className={cn(
                    "cf-focus rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    scheduleFilter === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  {value === "todo" ? ` (${includedActivities.length - scheduleReadyCount})` : ""}
                </button>
              ))}
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={scheduleQuery}
                  onChange={(e) => setScheduleQuery(e.target.value)}
                  placeholder="Find an activity"
                  className="h-8 w-44 pl-8 text-xs"
                />
              </div>
              {canEdit && pagedSchedule.length ? (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() =>
                    setScheduleSelectedIds((prev) => {
                      const next = new Set(prev);
                      const all = pageScheduleSelected === pagedSchedule.length;
                      for (const a of pagedSchedule) {
                        if (all) next.delete(a.id);
                        else next.add(a.id);
                      }
                      return next;
                    })
                  }
                >
                  {pageScheduleSelected === pagedSchedule.length ? "Unselect all" : "Select all"}
                </button>
              ) : null}
            </div>
          </div>

          {pagedSchedule.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              {includedActivities.length === 0
                ? "Nothing to schedule yet — choose activities first."
                : scheduleFilter === "todo"
                  ? "All done — every activity adds up to 100%."
                  : "No activities match."}
            </p>
          ) : (
            <ul className="space-y-2 px-3 py-3 sm:px-4">
              {pagedSchedule.map((act) => (
                <ScheduleActivityRow
                  key={act.id}
                  act={act}
                  canEdit={canEdit}
                  selected={scheduleSelectedIds.has(act.id)}
                  focused={focusActivityId === act.id}
                  onSelect={(on) => toggleScheduleRow(act.id, on)}
                  onOpen={() => {
                    setCalendarList(filteredSchedule.map((a) => a.id));
                    setCalendarFor(act.id);
                  }}
                />
              ))}
            </ul>
          )}

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
        </StepPanel>
      ) : null}

      {/* ——— REVIEW ——— */}
      {step === "review" && plan ? (
        <StepPanel icon={ClipboardCheck} title="Review" actions={stepActions}>
          {canApprovePlan ? (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              Waiting for your decision —{" "}
              <Link href={CROPFORT_ROUTES.approvals} className="font-medium underline-offset-4 hover:underline">
                open Approvals
              </Link>
            </div>
          ) : null}

          <PlanAssessmentCard
            planId={plan.id}
            farmEstateId={plan.farmEstateId}
            planYear={plan.budgetYearGc}
            canEdit={canEdit}
          />

          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-muted/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {completion.includedCount} {completion.includedCount === 1 ? "activity" : "activities"}
            </span>
            <span className="text-xl font-semibold tabular-nums">{fmtEtb(completion.budgetEtb)}</span>
          </div>

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
                      // Open the step filtered to the rows with this problem
                      if (issue.id.startsWith("qty-") || issue.id.startsWith("rate-")) {
                        setActivityQuery("");
                        setActivityCategory(IN_PLAN);
                      }
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
              Last submitted{SHOW_SPEND_BANDS ? ` · Band ${plan.promotions[0].band}` : ""}
              {SHOW_SPEND_BANDS && plan.promotions[0].note ? ` · ${plan.promotions[0].note}` : ""}
            </p>
          ) : null}
        </StepPanel>
      ) : null}

      <Dialog open={Boolean(calendarAct)} onOpenChange={(open) => !open && setCalendarFor(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Schedule</DialogTitle>
          </DialogHeader>
          {calendarAct && plan ? (
            <ScheduleActivityCard
              bare
              act={calendarAct}
              months={periodMonths}
              yearOf={(m) => plan.budgetYearGc - (PLAN_MONTHS.indexOf(m) <= 2 ? 1 : 0)}
              canEdit={canEdit}
              selected={false}
              focused={false}
              onSelect={() => undefined}
              onToggleMonth={(m) =>
                setMonthIntensity(calendarAct.id, m, calendarAct.intensities[m] === "none" ? "active" : "none")
              }
              onShare={(m, pct) => setMonthShare(calendarAct.id, m, pct)}
              onSetMonths={(months) => setActivityMonths(calendarAct.id, months)}
              onSplitEvenly={() => splitSharesEvenly(calendarAct.id)}
              onCopyToAll={() => {
                const n = copySchedule(
                  calendarAct.id,
                  includedActivities.map((a) => a.id),
                );
                if (n) toast.success(`Copied ${calendarAct.activityName}'s months to ${n} activit${n === 1 ? "y" : "ies"}`);
              }}
            />
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <span className="text-xs text-muted-foreground sm:self-center">
              {calendarIndex + 1} of {calendarList.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={calendarIndex <= 0}
                onClick={() => setCalendarFor(calendarList[calendarIndex - 1] ?? null)}
              >
                Previous
              </Button>
              {calendarIndex < calendarList.length - 1 ? (
                <Button onClick={() => setCalendarFor(calendarList[calendarIndex + 1] ?? null)}>
                  Next activity
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              ) : (
                <Button onClick={() => setCalendarFor(null)}>Done</Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    {periodMonths.map((m) => (
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
                    {periodMonths.map((m) => (
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


      <Dialog open={Boolean(rateCardTarget && plan)} onOpenChange={(open) => !open && setRateCardFor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Rate card</DialogTitle>
          </DialogHeader>
          {rateCardTarget && plan ? (
            <ActivityRateCardPanel
              key={rateCardTarget.id}
              farmEstateId={plan.farmEstateId}
              budgetYear={plan.budgetYearGc}
              activity={rateCardTarget}
              kind={kindOf(rateCardTarget)}
              currentRate={rateCardTarget.agreedRate?.unitRateEtb ?? null}
              onApplied={(rate) => {
                const target = rateCardTarget;
                rateBeforeRef.current = { id: target.id, rate: target.agreedRate };
                setAgreedRate(target.id, {
                  rateCardId: target.agreedRate?.rateCardId || "pending",
                  unitRateEtb: rate,
                  costKind: kindOf(target),
                  normMdPerUnit: target.agreedRate?.normMdPerUnit ?? null,
                  approvedAt: null,
                });
              }}
              onFailed={() => {
                const before = rateBeforeRef.current;
                if (before) setAgreedRate(before.id, before.rate);
              }}
              // Refresh rates in the background once the server has saved the card
              onSaved={() => {
                void loadContext().then(() => syncActivitiesFromEligible());
              }}
              onClose={() => setRateCardFor(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit plan for approval?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {completion.includedCount} activities · {fmtEtb(completion.budgetEtb)}
            {SHOW_SPEND_BANDS ? ` · Band ${band}` : ""} — goes to the Silva asset owner for approval.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onSubmit()}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
