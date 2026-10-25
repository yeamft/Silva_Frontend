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
  const [n1Name, setN1Name] = useState("");
  const [n2Name, setN2Name] = useState("");
  const [n1Rate, setN1Rate] = useState("");
  const [n2Rate, setN2Rate] = useState("");
  const [surveyDate, setSurveyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sourceEvidence, setSourceEvidence] = useState("");
  const [notes, setNotes] = useState("");

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
          <Table aria-label="Benchmark surveys" className="min-w-[980px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Type</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Activity</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Farm area</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Neighbor benchmarks</TableHead>
                <TableHead className="h-12 bg-muted/50 text-right text-[10px] font-semibold uppercase tracking-wide">Recommended rate</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Lock</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Status</TableHead>
                <TableHead className="h-12 bg-muted/50 text-right text-[10px] font-semibold uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listLoading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                    Loading benchmark surveys…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
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
                    <TableCell className="h-auto min-w-[190px] py-3.5">
                      <div className="font-semibold leading-snug text-foreground">{row.activity?.name ?? row.activityId}</div>
                      {row.activity?.code ? (
                        <div className="mt-1 inline-flex rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {row.activity.code}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="min-w-[130px] text-sm font-medium">{row.farmArea?.name ?? "—"}</TableCell>
                    <TableCell className="min-w-[190px] py-3.5 text-sm">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="max-w-[145px] truncate text-xs font-medium" title={row.neighbor1Name}>{row.neighbor1Name}</p>
                          <span className="cf-numeric shrink-0 text-xs tabular-nums text-muted-foreground">{fmtEtb(row.neighbor1Rate)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="max-w-[145px] truncate text-xs text-muted-foreground" title={row.neighbor2Name}>{row.neighbor2Name}</p>
                          <span className="cf-numeric shrink-0 text-xs tabular-nums text-muted-foreground">{fmtEtb(row.neighbor2Rate)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="cf-numeric min-w-[155px] text-right tabular-nums">
                      <span className="font-semibold text-foreground">{fmtEtb(row.recommendedRate)}</span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">Average benchmark</span>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New benchmark survey</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
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
                        {a.code} · {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Neighbor 1 name"
                required
                render={(props) => (
                  <Input {...props} value={n1Name} onChange={(e) => setN1Name(e.target.value)} />
                )}
              />
              <FormField
                label="Neighbor 1 rate (ETB)"
                required
                render={(props) => (
                  <Input
                    {...props}
                    type="number"
                    value={n1Rate}
                    onChange={(e) => setN1Rate(e.target.value)}
                  />
                )}
              />
              <FormField
                label="Neighbor 2 name"
                required
                render={(props) => (
                  <Input {...props} value={n2Name} onChange={(e) => setN2Name(e.target.value)} />
                )}
              />
              <FormField
                label="Neighbor 2 rate (ETB)"
                required
                render={(props) => (
                  <Input
                    {...props}
                    type="number"
                    value={n2Rate}
                    onChange={(e) => setN2Rate(e.target.value)}
                  />
                )}
              />
            </div>
            <FormField
              label="Survey date"
              required
              render={(props) => (
                <Input
                  {...props}
                  type="date"
                  value={surveyDate}
                  onChange={(e) => setSurveyDate(e.target.value)}
                />
              )}
            />
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
              label="Notes"
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
                try {
                  const created = await create(farmAreaId, {
                    activityId,
                    kind,
                    neighbor1Name: n1Name,
                    neighbor2Name: n2Name,
                    neighbor1Rate: Number(n1Rate),
                    neighbor2Rate: Number(n2Rate),
                    sourceEvidence,
                    notes,
                    surveyDate,
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
              Create draft
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
