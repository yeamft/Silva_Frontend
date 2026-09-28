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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Farm area</TableHead>
                <TableHead>Neighbors</TableHead>
                <TableHead className="text-right">Recommended</TableHead>
                <TableHead>Locked</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listLoading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No benchmarks for this program
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm capitalize">{row.kind}</TableCell>
                    <TableCell>
                      <div className="font-medium">{row.activity?.name ?? row.activityId}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {row.activity?.code}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{row.farmArea?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      <div className="truncate max-w-[140px]">
                        {row.neighbor1Name} / {row.neighbor2Name}
                      </div>
                    </TableCell>
                    <TableCell className="cf-numeric text-right tabular-nums">
                      {fmtEtb(row.recommendedRate)}
                    </TableCell>
                    <TableCell>
                      {row.lockedAt ? (
                        <StatusBadge status="approved" label="Locked" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Open</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`${CROPFORT_ROUTES.benchmarkSurveys}/${row.id}`}>Open</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Audit history"
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
