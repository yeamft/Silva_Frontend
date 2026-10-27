"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Archive, CheckCircle2, Clock, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { AuditTimelineDrawer } from "@/components/rate-cards/audit-timeline-drawer";
import { MakerCheckerPanel } from "@/components/rate-cards/maker-checker-panel";
import {
  DirectRateCardForm,
  type RateCardFormValues,
} from "@/components/rate-cards/rate-card-proposal-form";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  canApproveAsAssetOwner,
  canProposeRateCard,
  canViewRateCard,
  canViewRateCardArchive,
} from "@/lib/cropfortAccess";
import { enrichRateCard } from "@/lib/mock-api/rate-card-workflow";
import { useRateCardStore } from "@/store/rateCardStore";

function fmtEtb(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** Keeps small per-unit values readable: 0.003 stays 0.003 instead of 0. */
function fmtQty(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: Math.abs(n) < 1 ? 3 : 2 });
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

function MetricTile({
  label,
  value,
  sub,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight
          ? "border-primary/30 bg-primary/5"
          : warn
            ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
            : "border-border bg-muted/30"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-bold ${
          highlight
            ? "text-primary"
            : warn
              ? "text-amber-700 dark:text-amber-300"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function RateCardProposalDetailView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user, activeProgram } = useCropfortAuth();
  const canView = canViewRateCard(user.role);
  const canPropose = canProposeRateCard(user.role);
  const canDecide = canApproveAsAssetOwner(user.role);
  const canRestore = canViewRateCardArchive(user.role) || canDecide;

  const selected = useRateCardStore((s) => s.selected);
  const detailLoading = useRateCardStore((s) => s.detailLoading);
  const actionPending = useRateCardStore((s) => s.actionPending);
  const loadOne = useRateCardStore((s) => s.loadOne);
  const update = useRateCardStore((s) => s.update);
  const submit = useRateCardStore((s) => s.submit);
  const approve = useRateCardStore((s) => s.approve);
  const reject = useRateCardStore((s) => s.reject);
  const archive = useRateCardStore((s) => s.archive);
  const restore = useRateCardStore((s) => s.restore);

  const [form, setForm] = useState<RateCardFormValues>({
    proposedRate: "",
    availableFrom: "",
    availableTo: "",
    fallbackRate: "",
    norm: "",
    sourceBasis: "",
    sourceEvidence: "",
    justificationNote: "",
    notes: "",
  });
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    if (!canView || !id) return;
    void loadOne(id);
  }, [canView, id, loadOne]);

  useEffect(() => {
    if (!selected || selected.id !== id) return;
    setForm({
      proposedRate: String(selected.proposedRate),
      availableFrom: selected.availableFrom,
      availableTo: selected.availableTo ?? "",
      fallbackRate: selected.fallbackRate != null ? String(selected.fallbackRate) : "",
      norm: selected.norm != null ? String(selected.norm) : "",
      sourceBasis: selected.sourceBasis || "",
      sourceEvidence: selected.sourceEvidence,
      justificationNote: selected.justificationNote || "",
      notes: selected.notes,
    });
  }, [selected, id]);

  const card = selected && selected.id === id ? enrichRateCard(selected) : null;

  const rec = card?.recommendedRate;
  const prop = Number(form.proposedRate);
  const variance =
    rec != null && Number.isFinite(rec) && Number.isFinite(prop) && rec > 0
      ? ((prop - rec) / rec) * 100
      : null;
  const flagged = variance != null && Math.abs(variance) > 10;

  if (!canView) return <NotAuthorized title="Rate card" />;
  if (detailLoading && !card) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageContainer>
    );
  }
  if (!card) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Rate card not found.</p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => router.push(CROPFORT_ROUTES.rateCardProposals)}
        >
          Back
        </Button>
      </PageContainer>
    );
  }

  const editable = canPropose && (card.status === "draft" || card.status === "returned");
  const isAoReview = canDecide && card.status === "submitted";
  const showSpxEdit = canPropose && !canDecide;
  const busy = actionPending;
  const uom = card.activity?.uom || "unit";

  const patch = {
    proposedRate: Number(form.proposedRate),
    availableFrom: form.availableFrom,
    availableTo: form.availableTo.trim() ? form.availableTo.trim() : null,
    fallbackRate: form.fallbackRate.trim() === "" ? null : Number(form.fallbackRate),
    norm: form.norm.trim() === "" ? null : Number(form.norm),
    sourceBasis: form.sourceBasis.trim(),
    sourceEvidence: form.sourceEvidence,
    justificationNote: form.justificationNote,
    notes: form.notes,
  };

  // Benchmark data from the enriched survey attached by enrichRateCard
  const linkedSurvey = card.survey ?? null;
  const benchmarkData = linkedSurvey?.benchmarkData ?? null;
  const fromIndustry = benchmarkData?.recommendedSource === "industry_average";
  const benchmarkAvg = fromIndustry
    ? benchmarkData?.industryAverage
    : benchmarkData?.sixFarmAverage;
  const benchmarkNorm = card.norm ?? benchmarkAvg?.manDaysPerUnit ?? null;
  const benchmarkWage = benchmarkAvg?.wagePerManDay ?? null;
  const benchmarkFreq = benchmarkAvg?.frequency ?? null;

  // Suspicious wage warning (< ETB 1/MD is likely a data issue)
  const wageWarning =
    benchmarkWage != null && benchmarkWage < 1
      ? `Derived wage of ${fmtEtb(benchmarkWage)}/MD is unusually low — verify source data.`
      : null;

  const activityLabel = card.activity
    ? [card.activity.code, card.activity.name].filter(Boolean).join(" · ")
    : card.activityId;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Rates"}
        title={activityLabel}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Rates", href: CROPFORT_ROUTES.rateCardProposals },
          {
            label: isAoReview ? "Pending review" : "Rate cards",
            href: CROPFORT_ROUTES.rateCardProposals,
          },
          { label: activityLabel },
        ]}
        meta={
          <>
            <StatusBadge status={card.status} />
            <span className="text-xs capitalize text-muted-foreground">
              {card.kind} · per {uom}
              {card.year?.name ? ` · budget year ${card.year.name}` : ""}
            </span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {canDecide && card.status === "approved" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmArchive(true)}
              >
                <Archive className="h-4 w-4" aria-hidden />
                Archive
              </Button>
            ) : null}
            {canRestore && card.status === "archived" ? (
              <Button
                size="sm"
                disabled={busy}
                onClick={async () => {
                  try {
                    await restore(card.id);
                    toast.success("Restored to approved");
                    router.push(CROPFORT_ROUTES.rateCardProposals);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Restore failed");
                  }
                }}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Restore
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}>
              <History className="h-4 w-4" aria-hidden />
              History
            </Button>
          </div>
        }
      />

      {/* What happens now — the decision sits at the top so reviewers don't scroll past the evidence */}
      <section
        aria-label="Approval"
        className={`rounded-xl border p-4 sm:p-5 ${
          isAoReview ? "border-primary/40 bg-primary/[0.04]" : card.status === "returned" ? "border-warning/40 bg-warning/5" : "border-border bg-card"
        }`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {card.status === "approved" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            ) : card.status === "returned" ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
            ) : (
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="font-semibold">
                {isAoReview
                  ? "Waiting for your decision"
                  : card.status === "submitted"
                    ? "Submitted — waiting for the asset owner"
                    : card.status === "approved"
                      ? `Approved${card.approvedByName ? ` by ${card.approvedByName}` : ""}${card.approvedAt ? ` on ${fmtDate(card.approvedAt)}` : ""}`
                      : card.status === "returned"
                        ? "Returned for changes"
                        : card.status === "archived"
                          ? "Archived — no longer used for rate resolution"
                          : editable
                            ? "Draft — check the rate, then submit it for approval"
                            : "Draft"}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Proposed <span className="font-medium text-foreground">{fmtEtb(Number(form.proposedRate) || card.proposedRate)}</span> per {uom}
                {variance != null ? (
                  <>
                    {" · "}
                    <span className={flagged ? "font-medium text-warning" : undefined}>
                      {variance > 0 ? "+" : ""}
                      {variance.toFixed(1)}% vs benchmark {fmtEtb(card.recommendedRate)}
                    </span>
                  </>
                ) : null}
                {card.status === "approved" ? " · used for rate resolution within its effective period" : ""}
              </p>
              {card.returnComment && (card.status === "returned" || card.status === "draft") ? (
                <p className="mt-2 rounded-md bg-background/80 px-3 py-2 text-sm">
                  <span className="font-medium">Reviewer: </span>
                  {card.returnComment}
                </p>
              ) : null}
              {flagged && (isAoReview || editable) ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {card.justificationNote
                    ? `More than 10% from the benchmark. Justification: ${card.justificationNote}`
                    : "More than 10% from the benchmark — add a variance justification before submitting."}
                </p>
              ) : null}
            </div>
          </div>
          <div className="shrink-0">
            <MakerCheckerPanel
              status={card.status}
              canSubmit={showSpxEdit}
              canDecide={canDecide}
              busy={busy}
              entityLabel={`${card.kind} · ${activityLabel} · ${fmtEtb(card.proposedRate)}`}
              onSubmit={async () => {
                try {
                  if (editable) await update(card.id, patch);
                  await submit(card.id);
                  toast.success("Rate card submitted for review");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Submit failed");
                }
              }}
              onApprove={async () => {
                try {
                  await approve(card.id);
                  toast.success("Approved");
                  router.push(CROPFORT_ROUTES.rateCardProposals);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Approve failed");
                }
              }}
              onReturn={async (comment) => {
                try {
                  await reject(card.id, comment);
                  toast.success("Returned to SPX for revision");
                  router.push(CROPFORT_ROUTES.rateCardProposals);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Return failed");
                }
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Section 1: Rate summary ── */}
      <SectionCard title="Rate summary">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Proposed rate"
            value={fmtEtb(Number(form.proposedRate) || card.proposedRate)}
            sub={`per ${uom}`}
            highlight
          />
          <MetricTile
            label="Benchmark"
            value={fmtEtb(card.recommendedRate)}
            sub={`per ${uom}`}
          />
          <MetricTile
            label="Variance"
            value={variance != null ? `${variance > 0 ? "+" : ""}${variance.toFixed(1)}%` : "—"}
            warn={flagged}
          />
          <MetricTile
            label="Labor norm"
            value={benchmarkNorm != null ? `${fmtQty(benchmarkNorm)} MD` : "—"}
            sub={`man-days per ${uom}`}
          />
        </div>

        {wageWarning && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {wageWarning}
          </div>
        )}

      </SectionCard>

      {/* ── Section 2: Rate details ── */}
      <SectionCard title="Rate details">
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="cf-label">Activity</p>
            <p className="cf-data font-medium">{activityLabel}</p>
          </div>
          <div>
            <p className="cf-label">Unit</p>
            <p className="cf-data">{uom}</p>
          </div>
          <div>
            <p className="cf-label">Farm area</p>
            <p className="cf-data">{card.block?.name || card.farmArea?.name || "Program"}</p>
          </div>
          <div>
            <p className="cf-label">Effective from</p>
            <p className="cf-data">{fmtDate(card.availableFrom)}</p>
          </div>
          <div>
            <p className="cf-label">Effective until</p>
            <p className="cf-data">{card.availableTo ? fmtDate(card.availableTo) : "Open-ended"}</p>
          </div>
          <div>
            <p className="cf-label">Source / basis</p>
            <p className="cf-data">{card.sourceBasis || "—"}</p>
          </div>
          {card.justificationNote ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="cf-label">Variance justification</p>
              <p className="cf-data">{card.justificationNote}</p>
            </div>
          ) : null}
          {card.notes ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="cf-label">Notes</p>
              <p className="cf-data text-muted-foreground">{card.notes}</p>
            </div>
          ) : null}
        </div>

        {showSpxEdit && editable ? (
          <div className="mt-5 border-t border-border pt-5">
            <p className="mb-3 text-sm font-medium">Edit rate card</p>
            <DirectRateCardForm
              values={form}
              onChange={setForm}
              flagged={flagged}
              uom={uom}
              disabled={false}
            />
            <Button
              className="mt-3"
              size="sm"
              disabled={busy}
              onClick={async () => {
                try {
                  await update(card.id, patch);
                  toast.success("Rate card saved");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Save failed");
                }
              }}
            >
              Save rate card
            </Button>
          </div>
        ) : null}
      </SectionCard>

      {/* ── Section 3: Benchmark evidence ── */}
      <SectionCard title="Benchmark evidence" description="The farm rates behind the benchmark this card is compared with.">
        {linkedSurvey ? (
          <div className="space-y-4">
            {/* Source farms */}
            {benchmarkData?.farms?.filter((f) => f.name.trim()).length ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Source farms
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {benchmarkData.farms
                    .filter((f) => f.name.trim())
                    .map((farm) => (
                      <div
                        key={farm.name}
                        className="rounded-lg border border-border bg-card p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-foreground">{farm.name}</p>
                          {farm.includeInIndustryAverage ? (
                            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              In industry avg
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-base font-semibold tabular-nums">
                          {fmtEtb(farm.costPerUnit)}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            /{uom}
                          </span>
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {farm.manDaysPerUnit != null && (
                            <span>{fmtQty(farm.manDaysPerUnit)} MD/{uom}</span>
                          )}
                          {farm.frequency != null && (
                            <span>{farm.frequency} times/yr</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}

            {/* Calculation summary */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {fromIndustry ? "Industry average" : "All-farm fallback"}
                </p>
                <p className="font-semibold">
                  {fmtEtb(benchmarkAvg?.costPerUnit)} /{uom}
                  {benchmarkNorm != null ? ` · ${fmtQty(benchmarkNorm)} MD/${uom}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {benchmarkWage != null ? `${fmtEtb(benchmarkWage)}/MD` : "—"}
                  {benchmarkFreq != null ? ` · ${fmtQty(benchmarkFreq)} times/yr` : ""}
                  {" · "}
                  {benchmarkAvg?.farmsWithRate ?? 0} farm
                  {(benchmarkAvg?.farmsWithRate ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Rate survey
                </p>
                <p className="font-medium">
                  <Link
                    href={`${CROPFORT_ROUTES.benchmarkSurveys}/${linkedSurvey.id}`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Open the survey this rate came from →
                  </Link>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Locked {linkedSurvey.lockedAt ? fmtDate(linkedSurvey.lockedAt) : "—"}
                  {linkedSurvey.sourceEvidence ? ` · ${linkedSurvey.sourceEvidence}` : ""}
                </p>
              </div>
            </div>

            {!fromIndustry && (
              <p className="text-xs text-muted-foreground">
                {(benchmarkData?.industryAverage.farmsWithRate ?? 0) === 0
                  ? `${benchmarkData?.sixFarmAverage.farmsWithRate ?? 0} source farm${(benchmarkData?.sixFarmAverage.farmsWithRate ?? 0) !== 1 ? "s" : ""} contributed to the fallback recommendation. The industry average currently has no eligible observations.`
                  : "Fallback used — industry average farms had no rates."}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {card.sourceSurveyId
              ? `Linked to benchmark ${card.sourceSurveyId}.`
              : "No linked benchmark — created via rate card import."}
          </p>
        )}
      </SectionCard>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archive this rate card?"
        description="It stops being used for rate resolution. You can restore it from the archive later."
        confirmLabel="Archive"
        loading={busy}
        onConfirm={async () => {
          try {
            await archive(card.id);
            setConfirmArchive(false);
            toast.success("Rate card archived");
            router.push(CROPFORT_ROUTES.rateCardProposals);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Archive failed");
          }
        }}
      />

      <AuditTimelineDrawer
        entityId={auditOpen ? card.id : null}
        entityLabel={activityLabel}
        open={auditOpen}
        onOpenChange={setAuditOpen}
      />
    </PageContainer>
  );
}
