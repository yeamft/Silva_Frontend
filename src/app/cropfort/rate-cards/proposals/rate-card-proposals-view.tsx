"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, Clock, History, Plus, Upload } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  canApproveAsAssetOwner,
  canProposeRateCard,
  canViewRateCard,
  canViewRateCardArchive,
} from "@/lib/cropfortAccess";
import { enrichRateCard } from "@/lib/mock-api/rate-card-workflow";
import { useRateCardStore } from "@/store/rateCardStore";
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

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return s; }
}

function budgetYearOf(budgetYearId: string) {
  const n = Number(String(budgetYearId).replace(/\D/g, "").slice(0, 4));
  return Number.isFinite(n) && n > 2000 ? n : new Date().getFullYear();
}

type EnrichedCard = ReturnType<typeof enrichRateCard>;

const col = createColumnHelper<EnrichedCard>();

export default function RateCardProposalsListView({ archiveMode = false }: { archiveMode?: boolean }) {
  const router = useRouter();
  const { user, activeProgram } = useCropfortAuth();
  const canView = archiveMode ? canViewRateCardArchive(user.role) : canViewRateCard(user.role);
  const canPropose = canProposeRateCard(user.role);
  const isAssetOwner = canApproveAsAssetOwner(user.role);

  const items = useRateCardStore((s) => s.items);
  const listLoading = useRateCardStore((s) => s.listLoading);
  const actionPending = useRateCardStore((s) => s.actionPending);
  const locked = useRateCardStore((s) => s.locked);
  const loadList = useRateCardStore((s) => s.loadList);
  const loadLocked = useRateCardStore((s) => s.loadLocked);
  const createFromSurvey = useRateCardStore((s) => s.createFromSurvey);

  const [ctx, setCtx] = useState<WorkflowContextFilters>(() => loadWorkflowContext());
  const [status, setStatus] = useState<WorkflowStatus | "all">(() =>
    archiveMode ? "archived" : isAssetOwner ? "submitted" : "all",
  );
  const [kind, setKind] = useState<StandingKind | "all">("all");
  const [auditId, setAuditId] = useState<string | null>(null);
  const [auditLabel, setAuditLabel] = useState("");
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sourceSurveyId, setSourceSurveyId] = useState("");

  const effectiveStatus: WorkflowStatus | "all" = archiveMode ? "archived" : status;
  const programWide =
    isAssetOwner ||
    effectiveStatus === "submitted" ||
    effectiveStatus === "approved" ||
    effectiveStatus === "returned";

  useEffect(() => {
    if (!canView) return;
    if (!USE_RATE_CARD_MOCK && !activeProgram?.id) return;
    if (USE_RATE_CARD_MOCK && !ctx.programId) return;
    const farmEstateId = ctx.farmAreaId && ctx.farmAreaId !== "all" ? ctx.farmAreaId : undefined;
    void loadList({
      status: effectiveStatus,
      kind,
      programWide: programWide || !farmEstateId,
      programId: ctx.programId,
      budgetYearId: ctx.budgetYearId,
      farmEstateId: programWide || !farmEstateId ? undefined : farmEstateId,
      budgetYear: programWide || !farmEstateId ? undefined : budgetYearOf(ctx.budgetYearId),
    });
  }, [canView, activeProgram?.id, effectiveStatus, kind, programWide, ctx.programId, ctx.farmAreaId, ctx.budgetYearId, loadList]);

  const rows = useMemo(() => items.map((r) => enrichRateCard(r)), [items]);

  const columns = useMemo(
    () => [
      col.accessor((r) => r.activity?.name ?? r.activityId, {
        id: "activity",
        header: "Activity",
        cell: (c) => {
          const row = c.row.original;
          const uom = row.activity?.uom || "unit";
          return (
            <div className="flex min-w-[12rem] flex-col gap-1">
              <span className="font-semibold leading-5 text-foreground">
                {row.activity?.name ?? row.activityId}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {row.activity?.code ? (
                  <span className="inline-flex rounded-md border border-border/80 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                    {row.activity.code}
                  </span>
                ) : null}
                <span className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold capitalize text-primary">
                  {row.kind}
                </span>
                <span className="text-[11px] text-muted-foreground">per {uom}</span>
              </div>
            </div>
          );
        },
      }),
      col.accessor((r) => r.block?.name || r.farmArea?.name || "Program", {
        id: "scope",
        header: "Scope",
        size: 130,
        cell: (c) => (
          <span className="inline-flex max-w-full rounded-md bg-muted/60 px-2 py-1 text-xs font-medium text-foreground/80">
            <span className="truncate">{c.getValue()}</span>
          </span>
        ),
      }),
      col.accessor("proposedRate", {
        header: "Proposed rate",
        meta: { align: "right" },
        cell: (c) => {
          const uom = c.row.original.activity?.uom || "unit";
          return (
            <span className="flex flex-col items-end gap-0.5 tabular-nums">
              <span className="font-semibold text-foreground">{fmtEtb(c.getValue())}</span>
              <span className="text-[11px] text-muted-foreground">per {uom}</span>
            </span>
          );
        },
      }),
      col.accessor("recommendedRate", {
        header: "Benchmark",
        meta: { align: "right" },
        cell: (c) => (
          <span className="tabular-nums text-muted-foreground">{fmtEtb(c.getValue())}</span>
        ),
      }),
      col.accessor("norm", {
        header: "Norm",
        size: 90,
        meta: { align: "right" },
        cell: (c) => (
          <span className="tabular-nums text-muted-foreground">
            {c.getValue() != null ? `${c.getValue()} MD` : "—"}
          </span>
        ),
      }),
      col.accessor((r) => {
        if (r.recommendedRate == null || !Number.isFinite(r.recommendedRate) || r.recommendedRate === 0) return null;
        return ((r.proposedRate - r.recommendedRate) / r.recommendedRate) * 100;
      }, {
        id: "variance",
        header: "Variance",
        size: 90,
        meta: { align: "right" },
        cell: (c) => {
          const v = c.getValue();
          if (v == null) return <span className="text-muted-foreground">—</span>;
          const flagged = Math.abs(v) > 10;
          return (
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold tabular-nums ${
                flagged ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
              }`}
            >
              {v > 0 ? "+" : ""}{v.toFixed(1)}%
            </span>
          );
        },
      }),
      col.accessor("availableFrom", {
        header: "Effective",
        size: 130,
        cell: (c) => {
          const row = c.row.original;
          if (!c.getValue()) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="whitespace-nowrap text-xs">
              <span className="font-medium text-foreground/80">{fmtDate(c.getValue())}</span>
              {row.availableTo ? (
                <span className="mt-0.5 block text-muted-foreground">Until {fmtDate(row.availableTo)}</span>
              ) : (
                <span className="mt-0.5 block text-muted-foreground/70">No end date</span>
              )}
            </div>
          );
        },
      }),
      col.accessor("status", {
        header: "Status",
        size: 120,
        cell: (c) => <StatusBadge status={c.getValue()} />,
      }),
      col.display({
        id: "actions",
        header: "Actions",
        size: 110,
        cell: (c) => {
          const row = c.row.original;
          return (
            <div className="flex items-center justify-end gap-1 pr-2">
              <Button
                variant={row.status === "submitted" && isAssetOwner ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link href={`${CROPFORT_ROUTES.rateCardProposals}/${row.id}`}>
                  {row.status === "submitted" && isAssetOwner ? "Review" : "View"}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Audit history for ${row.activity?.name || "rate card"}`}
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
    [isAssetOwner],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (r) => r.id,
    initialState: { pagination: { pageSize: 25 } },
  });

  if (!canView) return <NotAuthorized title="Rate cards" />;

  const totalCount = rows.length;
  const submittedCount = rows.filter((r) => r.status === "submitted").length;
  const approvedCount = rows.filter((r) => r.status === "approved").length;
  const pageTitle = archiveMode ? "Archive" : "Rate cards";

  return (
    <OpsDeskPage>
      <OpsDeskHeader
        eyebrow={activeProgram?.name || "Rates"}
        title={pageTitle}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Rates", href: CROPFORT_ROUTES.rateCardProposals },
          { label: archiveMode ? "Archive" : "Rate cards" },
        ]}
        actions={
          canPropose && !archiveMode ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" aria-hidden />
                Import
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSourceSurveyId("");
                  const farmId = ctx.farmAreaId !== "all" ? ctx.farmAreaId : "all";
                  void loadLocked(farmId, undefined, { programId: ctx.programId, budgetYearId: ctx.budgetYearId });
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                New rate card
              </Button>
            </div>
          ) : null
        }
      />

      <CompactSummaryCards
        label="Rate card summary"
        items={[
          { id: "total", label: "Total rates", value: listLoading ? "—" : String(totalCount), icon: ClipboardList },
          { id: "submitted", label: "Submitted", value: listLoading ? "—" : String(submittedCount), icon: Clock },
          { id: "approved", label: "Approved", value: listLoading ? "—" : String(approvedCount), icon: CheckCircle2 },
        ]}
      />

      <WorkflowContextBar
        value={ctx}
        onChange={setCtx}
        filters={
          <>
            <Select value={kind} onValueChange={(v) => setKind(v as StandingKind | "all")}>
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
            {!archiveMode && (
              <Select value={status} onValueChange={(v) => setStatus(v as WorkflowStatus | "all")}>
                <SelectTrigger className="h-7 w-[120px] text-xs" aria-label="Status filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isAssetOwner ? (
                    <>
                      <SelectItem value="submitted">Pending review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                      <SelectItem value="all">All statuses</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
            {archiveMode && (
              <Button variant="outline" size="sm" asChild>
                <Link href={CROPFORT_ROUTES.rateCardProposals}>← Rate cards</Link>
              </Button>
            )}
          </>
        }
      />

      <SectionCard flush>
        <DataTable
          table={table}
          loading={listLoading}
          emptyTitle={isAssetOwner ? "No rate cards for this filter" : "No rate cards — create one from a locked benchmark"}
          emptyDescription="Adjust the filters or open a benchmark survey to create a rate card."
          pageSizeOptions={[10, 25, 50]}
          className="[&_thead_tr]:border-b [&_thead_tr]:bg-muted/50 [&_thead_th]:h-11 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.06em] [&_tbody_tr]:border-b [&_tbody_tr:nth-child(even)]:bg-muted/20 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-primary/[0.04] [&_tbody_td]:py-3.5"
          containerClassName="rounded-none border-0"
        />
      </SectionCard>

      <AuditTimelineDrawer
        entityId={auditId}
        entityLabel={auditLabel}
        open={Boolean(auditId)}
        onOpenChange={(next) => { if (!next) setAuditId(null); }}
      />

      {/* ── New rate card dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New rate card</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <FormField
              label="Benchmark survey"
              required
              render={() => (
                <Select value={sourceSurveyId} onValueChange={setSourceSurveyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select locked benchmark" />
                  </SelectTrigger>
                  <SelectContent>
                    {locked.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No unused locked benchmarks — lock a survey first
                      </SelectItem>
                    ) : (
                      locked.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.activityName || s.activityId} · {s.farmAreaName || "Farm"} · rec {fmtEtb(s.recommendedRate)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {locked.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Lock a benchmark survey first, then return here — or open the survey and use{" "}
                <Link href={CROPFORT_ROUTES.benchmarkSurveys} className="underline underline-offset-2">
                  Benchmark surveys
                </Link>.
              </p>
            ) : sourceSurveyId ? (
              <p className="text-xs text-muted-foreground">
                Rate card fields are prefilled from the benchmark. Edit the draft, then submit for review.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={actionPending || !sourceSurveyId || (!USE_RATE_CARD_MOCK && ctx.farmAreaId === "all")}
              onClick={async () => {
                try {
                  const farmId = ctx.farmAreaId !== "all" ? ctx.farmAreaId : "fa-tumi";
                  const card = await createFromSurvey(farmId, { sourceSurveyId, budgetYear: budgetYearOf(ctx.budgetYearId) });
                  toast.success("Draft rate card created from benchmark");
                  setOpen(false);
                  router.push(`${CROPFORT_ROUTES.rateCardProposals}/${card.id}`);
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
        kinds={["labor_rate_card", "material_rate_card", "service_rate_card"]}
        defaultKind="labor_rate_card"
        ctx={ctx}
        onImported={() => {
          void loadList({
            status: effectiveStatus, kind,
            programWide: programWide || ctx.farmAreaId === "all",
            programId: ctx.programId,
            budgetYearId: ctx.budgetYearId,
            farmEstateId: programWide || ctx.farmAreaId === "all" ? undefined : ctx.farmAreaId,
            budgetYear: programWide || ctx.farmAreaId === "all" ? undefined : budgetYearOf(ctx.budgetYearId),
          }, { force: true });
        }}
      />
    </OpsDeskPage>
  );
}
