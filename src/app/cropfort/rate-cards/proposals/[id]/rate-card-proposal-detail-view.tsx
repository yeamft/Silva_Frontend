"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Archive, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
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
import { getBenchmarkSurvey, type BenchmarkSurvey } from "@/lib/api/benchmark-surveys";
import { enrichRateCard } from "@/lib/mock-api/rate-card-workflow";
import { useRateCardStore } from "@/store/rateCardStore";

function fmtEtb(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtAvail(from: string, to: string | null) {
  if (!from) return "—";
  return to ? `${from} → ${to}` : `${from} → open`;
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

  const [survey, setSurvey] = useState<BenchmarkSurvey | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(false);
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

  useEffect(() => {
    const surveyId = selected?.sourceSurveyId;
    if (!surveyId) {
      setSurvey(null);
      return;
    }
    let cancelled = false;
    setSurveyLoading(true);
    void getBenchmarkSurvey(surveyId)
      .then((row) => {
        if (!cancelled) setSurvey(row);
      })
      .catch(() => {
        if (!cancelled) setSurvey(null);
      })
      .finally(() => {
        if (!cancelled) setSurveyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.sourceSurveyId]);

  const card = selected && selected.id === id ? enrichRateCard(selected) : null;

  const rec = card?.recommendedRate;
  const prop = Number(form.proposedRate);
  const liveVariance =
    rec == null || !Number.isFinite(rec) || !Number.isFinite(prop) || rec === 0
      ? { variancePct: null as number | null, flagged: false }
      : (() => {
          const variancePct = Math.round(((prop - rec) / rec) * 1000) / 10;
          return { variancePct, flagged: Math.abs(variancePct) > 10 };
        })();

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

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Rates"}
        title={card.activity?.name || "Rate card"}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Rates", href: CROPFORT_ROUTES.rateCardProposals },
          {
            label: isAoReview
              ? "Pending review"
              : canDecide && card.status === "approved"
                ? "Approved"
                : "Proposals",
            href: CROPFORT_ROUTES.rateCardProposals,
          },
          { label: card.activity?.name || card.id },
        ]}
        meta={
          <>
            <StatusBadge status={card.status} />
            <StatusBadge status="draft" label={card.kind} />
            {liveVariance.flagged || card.flagged ? (
              <StatusBadge status="flagged" label="Variance flagged" />
            ) : null}
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            {canDecide && card.status === "approved" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  try {
                    await archive(card.id);
                    toast.success("Rate card archived");
                    router.push(CROPFORT_ROUTES.rateCardProposals);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Archive failed");
                  }
                }}
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
              Audit
            </Button>
          </div>
        }
      />

      {card.returnComment ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">Reject comment:</span> {card.returnComment}
        </p>
      ) : null}

      <MakerCheckerPanel
        status={card.status}
        canSubmit={showSpxEdit}
        canDecide={canDecide}
        busy={busy}
        entityLabel={`${card.kind} ${card.id} · ${fmtEtb(card.proposedRate)}`}
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
            toast.success("Rejected — returned to SPX");
            router.push(CROPFORT_ROUTES.rateCardProposals);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Reject failed");
          }
        }}
      />

      <SectionCard
        title="Rate overview"
        description="Review the proposed rate and the activity details before saving or submitting."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-4 sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Proposed rate
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {fmtEtb(Number(form.proposedRate) || card.proposedRate)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {card.activity?.uom || "unit"}
              </span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Benchmark recommendation:{" "}
              <span className="font-medium text-foreground">{fmtEtb(card.recommendedRate)}</span>
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Variance
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {liveVariance.variancePct != null
                ? `${liveVariance.variancePct.toFixed(1)}%`
                : "—"}
            </p>
            {liveVariance.flagged ? (
              <StatusBadge status="flagged" label="Review needed" className="mt-2" />
            ) : null}
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <div className="mt-2">
              <StatusBadge status={card.status} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-x-6 gap-y-4 rounded-lg bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="cf-label">Activity code</p>
            <p className="cf-data font-mono text-xs">{card.activity?.code ?? "—"}</p>
          </div>
          <div>
            <p className="cf-label">Activity</p>
            <p className="cf-data font-medium">{card.activity?.name ?? card.activityId}</p>
          </div>
          <div>
            <p className="cf-label">Scope</p>
            <p className="cf-data">{card.block?.name || card.farmArea?.name || "Program"}</p>
          </div>
          <div>
            <p className="cf-label">Unit</p>
            <p className="cf-data">{card.activity?.uom ?? "—"}</p>
          </div>
          <div>
            <p className="cf-label">Norm</p>
            <p className="cf-data tabular-nums">{card.norm ?? "—"}</p>
          </div>
          <div>
            <p className="cf-label">Fallback rate</p>
            <p className="cf-data tabular-nums">{fmtEtb(card.fallbackRate)}</p>
          </div>
          <div>
            <p className="cf-label">Effective period</p>
            <p className="cf-data">{fmtAvail(card.availableFrom, card.availableTo)}</p>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <p className="cf-label">Source / basis</p>
            <p className="cf-data">{card.sourceBasis || "—"}</p>
          </div>
        </div>

        {card.justificationNote ? (
          <div className="mt-3 rounded-md border border-border px-3 py-2 text-sm">
            <p className="cf-label">Variance justification</p>
            <p className="cf-data">{card.justificationNote}</p>
          </div>
        ) : null}

        {card.notes ? (
          <div className="mt-3 text-sm">
            <p className="cf-label">Notes</p>
            <p className="cf-data text-muted-foreground">{card.notes}</p>
          </div>
        ) : null}

        {showSpxEdit && editable ? (
          <div className="mt-4">
            <DirectRateCardForm
              values={form}
              onChange={setForm}
              flagged={liveVariance.flagged || card.flagged}
              uom={card.activity?.uom}
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

      <SectionCard title="Benchmark survey">
        {survey ? (
          <div className="grid gap-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="cf-label">Survey</p>
                <p className="cf-data">
                  <Link
                    className="underline-offset-2 hover:underline"
                    href={`${CROPFORT_ROUTES.benchmarkSurveys}/${survey.id}`}
                  >
                    {survey.id}
                  </Link>
                </p>
              </div>
              <div>
                <p className="cf-label">Kind</p>
                <p className="cf-data capitalize">{survey.kind || "—"}</p>
              </div>
              <div>
                <p className="cf-label">Scope</p>
                <p className="cf-data">Farm</p>
              </div>
              <div>
                <p className="cf-label">Activity</p>
                <p className="cf-data">
                  {survey.activityName || survey.activityId}
                </p>
              </div>
              <div>
                <p className="cf-label">Locked</p>
                <p className="cf-data">
                  {survey.lockedAt ? survey.lockedAt.slice(0, 10) : "Not locked"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recommended rate
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {fmtEtb(survey.recommendedRate)}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / {survey.activityUnit || "unit"}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Average source
                </p>
                <p className="mt-1 font-medium">
                  {survey.benchmarkData?.recommendedSource === "industry_average"
                    ? "Selected farms"
                    : survey.benchmarkData?.recommendedSource === "six_farm_fallback"
                      ? "All farms with rates"
                      : "Survey average"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {survey.benchmarkData?.recommendedSource === "six_farm_fallback"
                    ? `${survey.benchmarkData.sixFarmAverage.farmsWithRate} farms with rates`
                    : survey.benchmarkData?.industryAverage?.farmsWithRate != null
                      ? `${survey.benchmarkData.industryAverage.farmsWithRate} farms included`
                      : "Farm count unavailable"}
                </p>
              </div>
            </div>

            {survey.benchmarkData?.farms?.length ? (
              <div>
                <h3 className="mb-2 text-sm font-medium">Farm rates</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {survey.benchmarkData.farms
                    .filter((farm) => farm.name.trim())
                    .map((farm) => (
                      <div key={farm.name} className="rounded-lg border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{farm.name}</p>
                          {farm.includeInIndustryAverage ? (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              Included in average
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-base font-semibold tabular-nums">
                          {fmtEtb(farm.costPerUnit)}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            / {survey.activityUnit || "unit"}
                          </span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {farm.manDaysPerUnit != null ? (
                            <span>{farm.manDaysPerUnit} man-days / unit</span>
                          ) : null}
                          {farm.frequency != null ? <span>{farm.frequency} times / year</span> : null}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { name: survey.neighbor1Name, rate: survey.neighbor1Rate },
                  { name: survey.neighbor2Name, rate: survey.neighbor2Rate },
                ]
                  .filter((entry) => entry.name || entry.rate != null)
                  .map((entry, index) => (
                    <div
                      key={`${entry.name || "legacy-farm"}-${index}`}
                      className="rounded-lg border border-border p-3"
                    >
                      <p className="text-xs text-muted-foreground">Farm</p>
                      <p className="mt-1 font-medium">{entry.name || "Unnamed farm"}</p>
                      <p className="mt-1 tabular-nums">{fmtEtb(entry.rate)}</p>
                    </div>
                  ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="cf-label">Source / evidence</p>
                <p className="cf-data">{survey.sourceEvidence || "—"}</p>
              </div>
              <div>
                <p className="cf-label">Notes</p>
                <p className="cf-data text-muted-foreground">{survey.notes || "—"}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {card.sourceSurveyId
              ? `Benchmark ${card.sourceSurveyId}${surveyLoading ? " · Loading…" : ""}`
              : "No linked benchmark (created via rate card import)."}
          </p>
        )}
      </SectionCard>

      <AuditTimelineDrawer
        entityId={auditOpen ? card.id : null}
        entityLabel={card.activity?.name || card.id}
        open={auditOpen}
        onOpenChange={setAuditOpen}
      />
    </PageContainer>
  );
}
