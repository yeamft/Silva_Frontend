"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, History, Lock, Plus, Upload } from "lucide-react";
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { OpsDeskHeader, OpsDeskPage } from "@/components/cropfort/ops-desk";
import { CompactSummaryCards, SectionCard } from "@/components/cropfort/page-shell";
import { DataTable } from "@/components/cropfort/tanstack-data-table";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { AuditTimelineDrawer } from "@/components/rate-cards/audit-timeline-drawer";
import { BenchmarkFarmDataFields } from "@/components/rate-cards/benchmark-farm-data-fields";
import { RateWorkflowImportDialog } from "@/components/rate-cards/rate-workflow-import-dialog";
import {
  loadWorkflowContext,
  WorkflowContextBar,
} from "@/components/rate-cards/workflow-context-bar";
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
import { CROPFORT_ROUTES } from "@/config/navigation";
import { canProposeRateCard, canViewBenchmarkSurveys } from "@/lib/cropfortAccess";
import {
  buildBenchmarkData,
  emptyBenchmarkFarmInputs,
  findDuplicateBenchmarkFarmName,
  type BenchmarkFarmInputs,
} from "@/lib/benchmark-data";
import { enrichSurvey } from "@/lib/mock-api/rate-card-workflow";
import { useBenchmarkSurveyStore } from "@/store/benchmarkSurveyStore";
import type {
  StandingKind,
  WorkflowContextFilters,
  WorkflowStatus,
} from "@/types/rate-card-workflow";
import { USE_RATE_CARD_MOCK } from "@/types/rate-card-workflow";

function fmtEtb(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

type EnrichedSurvey = ReturnType<typeof enrichSurvey>;

const col = createColumnHelper<EnrichedSurvey>();

export default function BenchmarkSurveysListView() {
  const router = useRouter();
  const { user, activeProgram } = useCropfortAuth();
  const canView = canViewBenchmarkSurveys(user.role);
  const canPropose = canProposeRateCard(user.role);

  const items = useBenchmarkSurveyStore((s) => s.items);
  const listLoading = useBenchmarkSurveyStore((s) => s.listLoading);
  const actionPending = useBenchmarkSurveyStore((s) => s.actionPending);
  const farms = useBenchmarkSurveyStore((s) => s.farms);
  const activities = useBenchmarkSurveyStore((s) => s.activities);
  const categories = useBenchmarkSurveyStore((s) => s.categories);
  const loadList = useBenchmarkSurveyStore((s) => s.loadList);
  const loadFarms = useBenchmarkSurveyStore((s) => s.loadFarms);
  const loadActivities = useBenchmarkSurveyStore((s) => s.loadActivities);
  const create = useBenchmarkSurveyStore((s) => s.create);

  const [ctx, setCtx] = useState<WorkflowContextFilters>(() => loadWorkflowContext());
  const [status, setStatus] = useState<WorkflowStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<StandingKind | "all">("all");
  const [auditId, setAuditId] = useState<string | null>(null);
  const [auditLabel, setAuditLabel] = useState("");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [kind, setKind] = useState<StandingKind>("labor");
  const [category, setCategory] = useState("");
  const [activityId, setActivityId] = useState("");
  const [farmAreaId, setFarmAreaId] = useState("");
  const [farmInputs, setFarmInputs] = useState<BenchmarkFarmInputs>(emptyBenchmarkFarmInputs);
  const [sourceEvidence, setSourceEvidence] = useState("");
  const [notes, setNotes] = useState("");
  const benchmarkSummary = buildBenchmarkData(farmInputs, notes);

  useEffect(() => {
    if (!canView) return;
    if (!USE_RATE_CARD_MOCK && !activeProgram?.id) return;
    if (USE_RATE_CARD_MOCK && !ctx.programId) return;
    void loadList({
      status,
      kind: kindFilter,
      programWide: true,
      programId: ctx.programId || activeProgram?.id,
      budgetYearId: ctx.budgetYearId,
    });
  }, [canView, activeProgram?.id, status, kindFilter, ctx.programId, ctx.budgetYearId, loadList]);

  useEffect(() => {
    if (!open) return;
    void loadActivities(kind, category || undefined);
  }, [open, kind, category, loadActivities]);

  const rows = useMemo(() => items.map((s) => enrichSurvey(s)), [items]);

  const columns = useMemo(
    () => [
      col.accessor((r) => r.activity?.name ?? r.activityId, {
        id: "activity",
        header: "Activity",
        cell: (c) => {
          const row = c.row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">
                {row.activity?.code ? (
                  <span className="mr-1.5 inline-flex rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {row.activity.code}
                  </span>
                ) : null}
                {row.activity?.name ?? row.activityId}
              </span>
              <span className="text-xs text-muted-foreground">
                {[row.activity?.category, row.activity?.subgroup, row.activity?.uom]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          );
        },
      }),
      col.accessor("kind", {
        header: "Kind",
        size: 110,
        cell: (c) => (
          <span className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold capitalize text-primary">
            {c.getValue()}
          </span>
        ),
      }),
      col.accessor((r) => r.recommendedRate, {
        id: "rate",
        header: "Recommended rate",
        cell: (c) => {
          const row = c.row.original;
          const bd = row.benchmarkData;
          const fromIndustry = bd?.recommendedSource === "industry_average";
          const rate = fromIndustry
            ? bd?.industryAverage.costPerUnit
            : bd?.sixFarmAverage.costPerUnit;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold tabular-nums text-foreground">
                {fmtEtb(rate ?? row.recommendedRate)}
                {row.activity?.uom ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    /{row.activity.uom}
                  </span>
                ) : null}
              </span>
              <span
                className={`text-[11px] font-medium ${
                  fromIndustry
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {fromIndustry ? "Industry average" : "All-farm fallback"}
              </span>
            </div>
          );
        },
      }),
      col.accessor((r) => r.benchmarkData?.sixFarmAverage.farmsWithRate ?? 0, {
        id: "farms",
        header: "Farms",
        size: 90,
        cell: (c) => {
          const row = c.row.original;
          const bd = row.benchmarkData;
          const fromIndustry = bd?.recommendedSource === "industry_average";
          const farmCount = fromIndustry
            ? bd?.industryAverage.farmsWithRate
            : bd?.sixFarmAverage.farmsWithRate;
          const industryCount = bd?.industryAverage.farmsWithRate ?? 0;
          return (
            <div className="flex flex-col items-center gap-0.5 text-center">
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {farmCount ?? "—"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {industryCount} in avg
              </span>
            </div>
          );
        },
      }),
      col.accessor("status", {
        header: "Status",
        size: 160,
        cell: (c) => {
          const row = c.row.original;
          const locked = Boolean(row.lockedAt);
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={c.getValue()} />
              {locked ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <Lock className="h-2.5 w-2.5" aria-hidden />
                  Locked
                </span>
              ) : null}
            </div>
          );
        },
      }),
      col.display({
        id: "actions",
        header: "Actions",
        size: 100,
        cell: (c) => {
          const row = c.row.original;
          return (
            <div className="flex items-center justify-end gap-1 pr-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`${CROPFORT_ROUTES.benchmarkSurveys}/${row.id}`}>View</Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Audit history for ${row.activity?.name || "survey"}`}
                onClick={() => {
                  setAuditId(row.id);
                  setAuditLabel(
                    row.activity?.code
                      ? `${row.activity.code} · ${row.activity.name || row.id}`
                      : row.activity?.name || row.id,
                  );
                }}
              >
                <History className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (r) => r.id,
    initialState: { pagination: { pageSize: 25 } },
  });

  if (!canView) return <NotAuthorized title="Benchmark surveys" />;

  const totalCount = rows.length;
  const lockedCount = rows.filter((r) => r.lockedAt).length;
  const approvedCount = rows.filter((r) => r.status === "approved").length;

  return (
    <OpsDeskPage>
      <OpsDeskHeader
        eyebrow={activeProgram?.name || "Rates"}
        title="Benchmark surveys"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Rates", href: CROPFORT_ROUTES.rateCardProposals },
          { label: "Benchmark surveys" },
        ]}
        actions={
          canPropose ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" aria-hidden />
                Import
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  const loaded = await loadFarms(ctx.programId || undefined);
                  setFarmAreaId(ctx.farmAreaId !== "all" ? ctx.farmAreaId : loaded[0]?.id || "");
                  setCategory("");
                  setActivityId("");
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                New survey
              </Button>
            </div>
          ) : null
        }
      />

      <CompactSummaryCards
        label="Benchmark survey summary"
        items={[
          { id: "total", label: "Total surveys", value: listLoading ? "—" : String(totalCount), icon: History },
          { id: "locked", label: "Locked", value: listLoading ? "—" : String(lockedCount), icon: Lock },
          { id: "approved", label: "Approved", value: listLoading ? "—" : String(approvedCount), icon: CheckCircle2 },
        ]}
      />

      <WorkflowContextBar
        value={ctx}
        onChange={setCtx}
        filters={
          <>
            <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as StandingKind | "all")}>
              <SelectTrigger className="h-7 w-[110px] text-xs" aria-label="Kind filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="materials">Materials</SelectItem>
                <SelectItem value="services">Services</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as WorkflowStatus | "all")}>
              <SelectTrigger className="h-7 w-[120px] text-xs" aria-label="Status filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <SectionCard flush>
        <DataTable
          table={table}
          loading={listLoading}
          emptyTitle="No benchmark surveys found"
          emptyDescription="Try changing your filters or create a new survey."
          pageSizeOptions={[10, 25, 50]}
          className="[&_thead_tr]:border-b [&_thead_tr]:bg-muted/40 [&_thead_th]:h-11 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.06em] [&_tbody_tr:nth-child(even)]:bg-muted/10 [&_tbody_tr]:cursor-pointer [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-primary/[0.04] [&_tbody_td]:py-3.5"
          containerClassName="rounded-none border-0"
        />
      </SectionCard>

      <AuditTimelineDrawer
        entityId={auditId}
        entityLabel={auditLabel}
        open={Boolean(auditId)}
        onOpenChange={(next) => { if (!next) setAuditId(null); }}
      />

      {/* ── New survey dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>New farm benchmark</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Kind"
              required
              render={() => (
                <Select
                  value={kind}
                  onValueChange={(v) => { setKind(v as StandingKind); setCategory(""); setActivityId(""); }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="labor">Labor</SelectItem>
                    <SelectItem value="materials">Materials</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              label="Category"
              required
              render={() => (
                <Select
                  value={category}
                  onValueChange={(v) => { setCategory(v); setActivityId(""); }}
                  disabled={categories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={categories.length === 0 ? "No categories in taxonomy" : "Select taxonomy category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              label="Farm area"
              required
              render={() => (
                <Select value={farmAreaId} onValueChange={setFarmAreaId}>
                  <SelectTrigger><SelectValue placeholder="Select farm area" /></SelectTrigger>
                  <SelectContent>
                    {farms.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              label="Activity"
              required
              render={() => (
                <Select
                  value={activityId}
                  onValueChange={setActivityId}
                  disabled={!category || activities.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!category ? "Select a category first" : activities.length === 0 ? "No activities in this category" : "Select activity"} />
                  </SelectTrigger>
                  <SelectContent>
                    {activities.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} · {a.subgroup ? `${a.subgroup} · ` : ""}{a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <div className="space-y-2 sm:col-span-2">
              <div>
                <p className="text-sm font-medium">Source farm rates</p>
                <p className="text-xs text-muted-foreground">
                  Add farms and enter available rates. Mark farms to include in the industry average.
                </p>
              </div>
              <BenchmarkFarmDataFields value={farmInputs} onChange={setFarmInputs} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3 sm:col-span-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Recommended rate</p>
                <p className="text-lg font-semibold">
                  {fmtEtb(benchmarkSummary.industryAverage.costPerUnit ?? benchmarkSummary.sixFarmAverage.costPerUnit)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">per unit</span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Based on{" "}
                {benchmarkSummary.recommendedSource === "industry_average"
                  ? `industry average · ${benchmarkSummary.industryAverage.farmsWithRate} farms`
                  : `all-farm average · ${benchmarkSummary.sixFarmAverage.farmsWithRate} farms`}
              </p>
            </div>
            <FormField
              label="Source / evidence"
              render={(props) => (
                <Input {...props} value={sourceEvidence} onChange={(e) => setSourceEvidence(e.target.value)} />
              )}
            />
            <FormField
              label="Data notes"
              render={(props) => (
                <Textarea {...props} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              )}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={actionPending}
              onClick={async () => {
                if (!farmAreaId || farmAreaId === "all") { toast.error("Select a farm before creating a survey"); return; }
                if (!category) { toast.error("Select a category from Activity Taxonomy"); return; }
                if (!activityId) { toast.error("Select an activity"); return; }
                const duplicateFarmName = findDuplicateBenchmarkFarmName(farmInputs);
                if (duplicateFarmName) { toast.error(`Source farm "${duplicateFarmName}" is listed more than once`); return; }
                if (benchmarkSummary.sixFarmAverage.farmsWithRate === 0) { toast.error("Enter cost per unit for at least one source farm"); return; }
                try {
                  const created = await create(farmAreaId, {
                    activityId, kind,
                    benchmarkData: { farms: farmInputs, dataNotes: notes },
                    sourceEvidence, notes,
                    programId: ctx.programId,
                    budgetYearId: ctx.budgetYearId,
                  });
                  if (ctx.farmAreaId !== farmAreaId) setCtx({ ...ctx, farmAreaId });
                  toast.success("Draft created — lock it, then create a rate card");
                  setOpen(false);
                  router.push(`${CROPFORT_ROUTES.benchmarkSurveys}/${created.id}`);
                  void loadList({ status, kind: kindFilter, programWide: true, programId: ctx.programId || activeProgram?.id, budgetYearId: ctx.budgetYearId }, { force: true });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Create failed");
                }
              }}
            >
              Create benchmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RateWorkflowImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        kinds={["benchmark_survey"]}
        defaultKind="benchmark_survey"
        ctx={ctx}
        onImported={() => { void loadList({ status, kind: kindFilter, programWide: true }, { force: true }); }}
      />
    </OpsDeskPage>
  );
}
