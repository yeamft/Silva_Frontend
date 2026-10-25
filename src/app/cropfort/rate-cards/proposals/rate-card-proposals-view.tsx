"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  canApproveAsAssetOwner,
  canProposeRateCard,
  canViewRateCard,
  canViewRateCardArchive,
} from "@/lib/cropfortAccess";
import { enrichRateCard } from "@/lib/mock-api/rate-card-workflow";
import { useRateCardStore } from "@/store/rateCardStore";
import type { StandingKind, WorkflowContextFilters, WorkflowStatus } from "@/types/rate-card-workflow";
import { USE_RATE_CARD_MOCK } from "@/types/rate-card-workflow";

function fmtEtb(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtAvail(from: string, to: string | null) {
  if (!from) return "—";
  return to ? `${from} → ${to}` : `${from} → open`;
}

function budgetYearOf(budgetYearId: string) {
  const n = Number(String(budgetYearId).replace(/\D/g, "").slice(0, 4));
  return Number.isFinite(n) && n > 2000 ? n : new Date().getFullYear();
}

/** Rate cards: create from locked benchmark → submit → asset owner review. */
export default function RateCardProposalsListView({
  archiveMode = false,
}: {
  archiveMode?: boolean;
}) {
  const router = useRouter();
  const { user, activeProgram } = useCropfortAuth();
  const canView = archiveMode
    ? canViewRateCardArchive(user.role)
    : canViewRateCard(user.role);
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

  // One backend / mock request via store — no React Query / farm fan-out.
  useEffect(() => {
    if (!canView) return;
    if (!USE_RATE_CARD_MOCK && !activeProgram?.id) return;
    if (USE_RATE_CARD_MOCK && !ctx.programId) return;
    const farmEstateId =
      ctx.farmAreaId && ctx.farmAreaId !== "all" ? ctx.farmAreaId : undefined;
    void loadList({
      status: effectiveStatus,
      kind,
      programWide: programWide || !farmEstateId,
      programId: ctx.programId,
      budgetYearId: ctx.budgetYearId,
      farmEstateId: programWide || !farmEstateId ? undefined : farmEstateId,
      budgetYear: programWide || !farmEstateId ? undefined : budgetYearOf(ctx.budgetYearId),
    });
  }, [
    canView,
    activeProgram?.id,
    effectiveStatus,
    kind,
    programWide,
    ctx.programId,
    ctx.farmAreaId,
    ctx.budgetYearId,
    loadList,
  ]);

  const rows = items.map((r) => enrichRateCard(r));

  const pendingReview = !archiveMode && isAssetOwner && effectiveStatus === "submitted";
  const approvedRegister = !archiveMode && isAssetOwner && effectiveStatus === "approved";

  if (!canView) return <NotAuthorized title="Rate cards" />;

  const pageTitle = archiveMode
    ? "Archive"
    : pendingReview
      ? "Pending review"
      : approvedRegister
        ? "Approved rate cards"
        : "Rate cards";
  const crumbLabel = archiveMode
    ? "Archive"
    : pendingReview
      ? "Pending review"
      : approvedRegister
        ? "Approved"
        : "Proposals";

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Rates"}
        title={pageTitle}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Rates", href: CROPFORT_ROUTES.rateCardProposals },
          { label: crumbLabel },
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
                  void loadLocked(farmId, undefined, {
                    programId: ctx.programId,
                    budgetYearId: ctx.budgetYearId,
                  });
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

      <WorkflowContextBar value={ctx} onChange={setCtx} />

      {pendingReview ? (
        <p className="text-xs text-muted-foreground">
          Showing submitted rate cards across farms in this program. Open a card to Approve or
          Reject.
        </p>
      ) : null}
      {approvedRegister ? (
        <p className="text-xs text-muted-foreground">
          Approved rate cards across farms in this program. Open any card to review the decision
          packet.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as StandingKind | "all")}>
          <SelectTrigger className="h-9 w-[160px]" aria-label="Kind filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            <SelectItem value="labor">Labor</SelectItem>
            <SelectItem value="materials">Materials</SelectItem>
            <SelectItem value="services">Services</SelectItem>
          </SelectContent>
        </Select>
        {archiveMode ? null : (
          <Select value={status} onValueChange={(v) => setStatus(v as WorkflowStatus | "all")}>
            <SelectTrigger className="h-9 w-[180px]" aria-label="Status filter">
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
                  <SelectItem value="archived">Archived</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        )}
        {!isAssetOwner && !archiveMode ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={CROPFORT_ROUTES.benchmarkSurveys}>Benchmarks →</Link>
          </Button>
        ) : null}
        {archiveMode ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={CROPFORT_ROUTES.rateCardProposals}>← Rate cards</Link>
          </Button>
        ) : null}
      </div>

      <SectionCard
        title={
          archiveMode
            ? "Archived rate cards"
            : pendingReview
              ? "Awaiting your decision"
              : approvedRegister
                ? "Approved register"
                : "Rate card register"
        }
        flush
      >
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <Table aria-label={archiveMode ? "Archived rate cards" : "Rate cards"} className="min-w-[1240px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Code</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Activity</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Scope</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Unit</TableHead>
                <TableHead className="h-12 bg-muted/50 text-right text-[10px] font-semibold uppercase tracking-wide">Norm</TableHead>
                <TableHead className="h-12 bg-muted/50 text-right text-[10px] font-semibold uppercase tracking-wide">Proposed rate</TableHead>
                <TableHead className="h-12 bg-muted/50 text-right text-[10px] font-semibold uppercase tracking-wide">Fallback</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Source / basis</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Effective</TableHead>
                <TableHead className="h-12 bg-muted/50 text-[10px] font-semibold uppercase tracking-wide">Status</TableHead>
                <TableHead className="h-12 bg-muted/50 text-right text-[10px] font-semibold uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listLoading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-sm text-muted-foreground">
                    Loading rate cards…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center">
                    <p className="text-sm font-medium text-foreground">
                    {pendingReview
                      ? "No rate cards pending review"
                      : approvedRegister
                        ? "No approved rate cards in this program yet"
                        : isAssetOwner
                          ? "No rate cards for this filter"
                          : "No rate cards — create one from a locked benchmark"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Adjust the filters or open a benchmark survey to create a rate card.</p>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open rate card for ${row.activity?.name || "activity"}`}
                    className="cursor-pointer odd:bg-background even:bg-muted/20 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) return;
                      router.push(`${CROPFORT_ROUTES.rateCardProposals}/${row.id}`);
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`${CROPFORT_ROUTES.rateCardProposals}/${row.id}`);
                      }
                    }}
                  >
                    <TableCell className="min-w-[115px] py-3.5">
                      <span className="inline-flex rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-[11px] font-medium text-muted-foreground">
                        {row.activity?.code ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="h-auto min-w-[190px] py-3.5">
                      <p className="font-semibold leading-snug text-foreground">
                        {row.activity?.name ?? row.activityId}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                          {row.kind}
                        </span>
                        {row.flagged ? (
                          <StatusBadge status="flagged" label="Flagged" />
                        ) : null}
                        {row.activity?.code ? (
                          <span className="font-mono text-[10px] text-muted-foreground">{row.activity.code}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[130px] text-sm text-muted-foreground">
                      {row.block?.name || row.farmArea?.name || "Program"}
                    </TableCell>
                    <TableCell className="min-w-[70px]">
                      <span className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium">
                        {row.activity?.uom ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="cf-numeric min-w-[85px] text-right tabular-nums">
                      {row.norm ?? "—"}
                    </TableCell>
                    <TableCell className="cf-numeric min-w-[150px] text-right tabular-nums">
                      <span className="font-semibold text-foreground">{fmtEtb(row.proposedRate)}</span>
                      {row.recommendedRate != null ? (
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          Benchmark {fmtEtb(row.recommendedRate)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="cf-numeric min-w-[135px] text-right tabular-nums text-muted-foreground">
                      {fmtEtb(row.fallbackRate)}
                    </TableCell>
                    <TableCell className="max-w-[220px] py-3 text-xs text-muted-foreground">
                      <span className="line-clamp-2" title={row.sourceBasis || undefined}>
                        {row.sourceBasis || "No source recorded"}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[140px] whitespace-nowrap text-xs text-muted-foreground">
                      {fmtAvail(row.availableFrom, row.availableTo)}
                    </TableCell>
                    <TableCell className="min-w-[110px]">
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="min-w-[110px] text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant={row.status === "submitted" && isAssetOwner ? "default" : "ghost"}
                          size="sm"
                          asChild
                        >
                          <Link href={`${CROPFORT_ROUTES.rateCardProposals}/${row.id}`}>
                            {row.status === "submitted" && isAssetOwner ? "Review" : "Open"}
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Audit history for ${row.activity?.name || "rate card"}`}
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
      </SectionCard>

      <AuditTimelineDrawer
        entityId={auditId}
        entityLabel={auditLabel}
        open={Boolean(auditId)}
        onOpenChange={(next) => {
          if (!next) setAuditId(null);
        }}
      />

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
                          {s.activityName || s.activityId} · {s.farmAreaName || "Farm"} · rec{" "}
                          {fmtEtb(s.recommendedRate)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {locked.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Create a benchmark, click <span className="font-medium">Lock benchmark</span>, then
                return here — or open the survey and use{" "}
                <Link href={CROPFORT_ROUTES.benchmarkSurveys} className="underline underline-offset-2">
                  Benchmark surveys
                </Link>
                .
              </p>
            ) : sourceSurveyId ? (
              <p className="text-xs text-muted-foreground">
                Rate card fields are prefilled from the benchmark. Edit the draft, then submit for
                review.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                actionPending ||
                !sourceSurveyId ||
                (!USE_RATE_CARD_MOCK && ctx.farmAreaId === "all")
              }
              onClick={async () => {
                try {
                  const farmId =
                    ctx.farmAreaId !== "all" ? ctx.farmAreaId : "fa-tumi";
                  const card = await createFromSurvey(farmId, {
                    sourceSurveyId,
                    budgetYear: budgetYearOf(ctx.budgetYearId),
                  });
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
          void loadList(
            {
              status: effectiveStatus,
              kind,
              programWide: programWide || ctx.farmAreaId === "all",
              programId: ctx.programId,
              budgetYearId: ctx.budgetYearId,
              farmEstateId:
                programWide || ctx.farmAreaId === "all" ? undefined : ctx.farmAreaId,
              budgetYear:
                programWide || ctx.farmAreaId === "all"
                  ? undefined
                  : budgetYearOf(ctx.budgetYearId),
            },
            { force: true },
          );
        }}
      />
    </PageContainer>
  );
}
