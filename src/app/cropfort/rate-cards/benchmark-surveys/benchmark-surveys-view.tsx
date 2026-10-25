"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { History, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import {
  OpsDeskControlPanel,
  OpsDeskHeader,
  OpsDeskList,
  OpsDeskMeta,
  OpsDeskPage,
} from "@/components/cropfort/ops-desk";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  // One request via store — mock and live share the same store path.
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
  }, [
    canView,
    activeProgram?.id,
    status,
    kindFilter,
    ctx.programId,
    ctx.budgetYearId,
    loadList,
  ]);

  useEffect(() => {
    if (!open) return;
    void loadActivities(kind, category || undefined);
  }, [open, kind, category, loadActivities]);

  const rows = items.map((s) => enrichSurvey(s));

  if (!canView) return <NotAuthorized title="Benchmark surveys" />;

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
        meta={
          <OpsDeskMeta
            items={[
              { label: "surveys", value: String(rows.length) },
              {
                label: "locked",
                value: String(rows.filter((r) => r.lockedAt).length),
              },
            ]}
          />
        }
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
                  setFarmAreaId(
                    ctx.farmAreaId !== "all" ? ctx.farmAreaId : loaded[0]?.id || "",
                  );
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

      <WorkflowContextBar value={ctx} onChange={setCtx} />

      <OpsDeskControlPanel
        filters={
          <>
            <Select
              value={kindFilter}
              onValueChange={(v) => setKindFilter(v as StandingKind | "all")}
            >
              <SelectTrigger className="h-8 w-[140px]" aria-label="Kind filter">
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
              <SelectTrigger className="h-8 w-[150px]" aria-label="Status filter">
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

      <OpsDeskList>
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <Table aria-label="Benchmark surveys" className="min-w-[1320px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Type</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Code</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Category</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Sub-group</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Activity</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Unit</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Farm area</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Industry average</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">All-farm fallback</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Lock</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Status</TableHead>
                <TableHead className="h-12 bg-muted/50 text-right text-[10px] font-semibold uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listLoading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center text-sm text-muted-foreground">
                    Loading benchmark surveys…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-12 text-center">
                    <p className="text-sm font-medium text-foreground">No benchmark surveys found</p>
                    <p className="mt-1 text-xs text-muted-foreground">Try changing your filters or create a new survey.</p>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open benchmark survey for ${row.activity?.name || "activity"}`}
                    className="cursor-pointer odd:bg-background even:bg-muted/20 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) return;
                      router.push(`${CROPFORT_ROUTES.benchmarkSurveys}/${row.id}`);
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`${CROPFORT_ROUTES.benchmarkSurveys}/${row.id}`);
                      }
                    }}
                  >
                    <TableCell className="h-auto py-3.5">
                      <span className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold capitalize text-primary">
                        {row.kind}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.activity?.code ?? row.activityId}</TableCell>
                    <TableCell>{row.activity?.category || "—"}</TableCell>
                    <TableCell>{row.activity?.subgroup || "—"}</TableCell>
                    <TableCell className="min-w-[180px] font-semibold">{row.activity?.name ?? row.activityId}</TableCell>
                    <TableCell>{row.activity?.uom || "—"}</TableCell>
                    <TableCell className="min-w-[180px] text-sm font-medium">{row.farmArea?.name ?? "—"}</TableCell>
                    <TableCell className="min-w-[220px] py-3.5 text-xs">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{fmtEtb(row.benchmarkData?.industryAverage.costPerUnit)} / unit</p>
                        <p className="text-muted-foreground">
                          {row.benchmarkData?.industryAverage.manDaysPerUnit?.toFixed(3) ?? "—"} MD/unit ·{" "}
                          {fmtEtb(row.benchmarkData?.industryAverage.wagePerManDay)} / MD
                        </p>
                        <p className="text-muted-foreground">
                          {row.benchmarkData?.industryAverage.frequency?.toFixed(2) ?? "—"} times/year ·{" "}
                          {row.benchmarkData?.industryAverage.farmsWithRate ?? "—"} farms with rate
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[220px] py-3.5 text-xs">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{fmtEtb(row.benchmarkData?.sixFarmAverage.costPerUnit)} / unit</p>
                        <p className="text-muted-foreground">
                          {row.benchmarkData?.sixFarmAverage.manDaysPerUnit?.toFixed(3) ?? "—"} MD/unit ·{" "}
                          {fmtEtb(row.benchmarkData?.sixFarmAverage.wagePerManDay)} / MD
                        </p>
                        <p className="text-muted-foreground">
                          {row.benchmarkData?.sixFarmAverage.frequency?.toFixed(2) ?? "—"} times/year ·{" "}
                          {row.benchmarkData?.sixFarmAverage.farmsWithRate ?? "—"} farms with rate
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[90px]">
                      {row.lockedAt ? (
                        <StatusBadge status="approved" label="Locked" />
                      ) : (
                        <span className="inline-flex rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                          Unlocked
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[110px]">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="min-w-[105px] text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`${CROPFORT_ROUTES.benchmarkSurveys}/${row.id}`}>Open</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Audit history for ${row.activity?.name || "survey"}`}
                          onClick={() => {
                            setAuditId(row.id);
                            setAuditLabel(row.activity?.name || row.id);
                          }}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </OpsDeskList>

      <AuditTimelineDrawer
        entityId={auditId}
        entityLabel={auditLabel}
        open={Boolean(auditId)}
        onOpenChange={(next) => {
          if (!next) setAuditId(null);
        }}
      />

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
                  onValueChange={(v) => {
                    setKind(v as StandingKind);
                    setCategory("");
                    setActivityId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  onValueChange={(v) => {
                    setCategory(v);
                    setActivityId("");
                  }}
                  disabled={categories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        categories.length === 0
                          ? "No categories in taxonomy"
                          : "Select taxonomy category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              label="Farm area"
              required
              render={() => (
                <Select
                  value={farmAreaId}
                  onValueChange={(v) => {
                    setFarmAreaId(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select farm area" />
                  </SelectTrigger>
                  <SelectContent>
                    {farms.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
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
                    <SelectValue
                      placeholder={
                        !category
                          ? "Select a category first"
                          : activities.length === 0
                            ? "No activities in this category"
                            : "Select activity"
                      }
                    />
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
                  {fmtEtb(
                    benchmarkSummary.industryAverage.costPerUnit ??
                      benchmarkSummary.sixFarmAverage.costPerUnit,
                  )}
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
                <Input
                  {...props}
                  value={sourceEvidence}
                  onChange={(e) => setSourceEvidence(e.target.value)}
                />
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={actionPending}
              onClick={async () => {
                if (!farmAreaId || farmAreaId === "all") {
                  toast.error("Select a farm before creating a survey");
                  return;
                }
                if (!category) {
                  toast.error("Select a category from Activity Taxonomy");
                  return;
                }
                if (!activityId) {
                  toast.error("Select an activity");
                  return;
                }
                const duplicateFarmName = findDuplicateBenchmarkFarmName(farmInputs);
                if (duplicateFarmName) {
                  toast.error(`Source farm "${duplicateFarmName}" is listed more than once`);
                  return;
                }
                if (benchmarkSummary.sixFarmAverage.farmsWithRate === 0) {
                  toast.error("Enter cost per unit for at least one source farm");
                  return;
                }
                try {
                  const created = await create(farmAreaId, {
                    activityId,
                    kind,
                    benchmarkData: { farms: farmInputs, dataNotes: notes },
                    sourceEvidence,
                    notes,
                    programId: ctx.programId,
                    budgetYearId: ctx.budgetYearId,
                  });
                  if (ctx.farmAreaId !== farmAreaId) {
                    setCtx({ ...ctx, farmAreaId });
                  }
                  toast.success("Draft created — lock it, then create a rate card");
                  setOpen(false);
                  router.push(`${CROPFORT_ROUTES.benchmarkSurveys}/${created.id}`);
                  void loadList(
                    {
                      status,
                      kind: kindFilter,
                      programWide: true,
                      programId: ctx.programId || activeProgram?.id,
                      budgetYearId: ctx.budgetYearId,
                    },
                    { force: true },
                  );
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
        onImported={() => {
          void loadList({ status, kind: kindFilter, programWide: true }, { force: true });
        }}
      />
    </OpsDeskPage>
  );
}
