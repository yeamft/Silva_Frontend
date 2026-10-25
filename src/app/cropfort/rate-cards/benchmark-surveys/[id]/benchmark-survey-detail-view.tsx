"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, History, Lock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { BenchmarkFarmDataFields } from "@/components/rate-cards/benchmark-farm-data-fields";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { AuditTimelineDrawer } from "@/components/rate-cards/audit-timeline-drawer";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  buildBenchmarkData,
  emptyBenchmarkFarmInputs,
  findDuplicateBenchmarkFarmName,
  normalizeBenchmarkFarmInputs,
  type BenchmarkFarmInputs,
} from "@/lib/benchmark-data";
import { canProposeRateCard, canViewBenchmarkSurveys } from "@/lib/cropfortAccess";
import { enrichSurvey } from "@/lib/mock-api/rate-card-workflow";
import { useBenchmarkSurveyStore } from "@/store/benchmarkSurveyStore";
import { useRateCardStore } from "@/store/rateCardStore";

function fmtEtb(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function MetricTile({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SourceBadge({ source }: { source: "industry_average" | "six_farm_fallback" }) {
  const isIndustry = source === "industry_average";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        isIndustry
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
      }`}
    >
      {isIndustry ? "Industry average" : "All-farm fallback"}
    </span>
  );
}

export default function BenchmarkSurveyDetailView() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user, activeProgram } = useCropfortAuth();
  const canView = canViewBenchmarkSurveys(user.role);
  const canPropose = canProposeRateCard(user.role);

  const selected = useBenchmarkSurveyStore((s) => s.selected);
  const detailLoading = useBenchmarkSurveyStore((s) => s.detailLoading);
  const actionPending = useBenchmarkSurveyStore((s) => s.actionPending);
  const loadOne = useBenchmarkSurveyStore((s) => s.loadOne);
  const update = useBenchmarkSurveyStore((s) => s.update);
  const lock = useBenchmarkSurveyStore((s) => s.lock);
  const createCard = useRateCardStore((s) => s.createFromSurvey);
  const cardPending = useRateCardStore((s) => s.actionPending);

  const [farmInputs, setFarmInputs] = useState<BenchmarkFarmInputs>(emptyBenchmarkFarmInputs);
  const [sourceEvidence, setSourceEvidence] = useState("");
  const [notes, setNotes] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    if (!canView || !id) return;
    void loadOne(id);
  }, [canView, id, loadOne]);

  useEffect(() => {
    if (!selected || selected.id !== id) return;
    setFarmInputs(
      normalizeBenchmarkFarmInputs(selected.benchmarkData?.farms ?? emptyBenchmarkFarmInputs()),
    );
    setSourceEvidence(selected.sourceEvidence);
    setNotes(selected.notes);
  }, [selected, id]);

  const survey = selected && selected.id === id ? enrichSurvey(selected) : null;
  const benchmarkSummary = buildBenchmarkData(farmInputs, notes);

  if (!canView) return <NotAuthorized title="Benchmark survey" />;
  if (detailLoading && !survey) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageContainer>
    );
  }
  if (!survey) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Survey not found.</p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => router.push(CROPFORT_ROUTES.benchmarkSurveys)}
        >
          Back
        </Button>
      </PageContainer>
    );
  }

  const locked = Boolean(survey.lockedAt);
  const editable = canPropose && (survey.status === "draft" || survey.status === "returned");
  const benchmarkEditable = editable && !locked;
  const busy = actionPending || cardPending;

  const patchBenchmark = {
    benchmarkData: { farms: farmInputs, dataNotes: notes },
    sourceEvidence,
    notes,
  };

  const { industryAverage, sixFarmAverage, recommendedSource } = benchmarkSummary;
  const recommendedRate =
    industryAverage.costPerUnit ?? sixFarmAverage.costPerUnit ?? survey.recommendedRate;
  const recommendedNorm =
    industryAverage.manDaysPerUnit ?? sixFarmAverage.manDaysPerUnit;
  const recommendedWage =
    industryAverage.wagePerManDay ?? sixFarmAverage.wagePerManDay;
  const recommendedFreq =
    industryAverage.frequency ?? sixFarmAverage.frequency;

  const activityLabel = survey.activity
    ? [
        survey.activity.code,
        survey.activity.category,
        survey.activity.subgroup,
        survey.activity.name,
        survey.activity.uom,
      ]
        .filter(Boolean)
        .join(" · ")
    : survey.activityId;

  // Warn if frequency looks unusual (> 52 times/year for a field activity)
  const freqWarning =
    recommendedFreq != null && recommendedFreq > 52
      ? `Frequency of ${recommendedFreq}/year is unusually high — please verify.`
      : null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Rates"}
        title={
          survey.activity?.code
            ? `${survey.activity.code} · ${survey.activity.name || "Benchmark survey"}`
            : survey.activity?.name || "Benchmark survey"
        }
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Rates", href: CROPFORT_ROUTES.rateCardProposals },
          { label: "Benchmark surveys", href: CROPFORT_ROUTES.benchmarkSurveys },
          {
            label: survey.activity?.code
              ? `${survey.activity.code} · ${survey.activity.name || survey.id}`
              : survey.activity?.name || survey.id,
          },
        ]}
        meta={
          <>
            <StatusBadge status={survey.status} />
            {locked ? <StatusBadge status="approved" label="Locked" /> : null}
            <StatusBadge status="draft" label={survey.kind} />
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}>
            <History className="h-4 w-4" aria-hidden />
            Audit
          </Button>
        }
      />

      {/* ── Section 1: Benchmark summary ── */}
      <SectionCard title="Benchmark summary">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SourceBadge source={recommendedSource} />
          <span className="text-xs text-muted-foreground">
            {recommendedSource === "industry_average"
              ? `${industryAverage.farmsWithRate} farm${industryAverage.farmsWithRate !== 1 ? "s" : ""} in industry average`
              : `${sixFarmAverage.farmsWithRate} farm${sixFarmAverage.farmsWithRate !== 1 ? "s" : ""} · no industry average set`}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Recommended rate"
            value={fmtEtb(recommendedRate)}
            sub={`per ${survey.activity?.uom || "unit"}`}
            highlight
          />
          <MetricTile
            label="Labor norm"
            value={recommendedNorm != null ? `${recommendedNorm.toFixed(1)} MD` : "—"}
            sub={`per ${survey.activity?.uom || "unit"}`}
          />
          <MetricTile
            label="Derived wage"
            value={recommendedWage != null ? fmtEtb(recommendedWage) : "—"}
            sub="per man-day"
          />
          <MetricTile
            label="Frequency"
            value={recommendedFreq != null ? `${recommendedFreq}/yr` : "—"}
            sub="times per year"
          />
        </div>
        {freqWarning && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {freqWarning}
          </div>
        )}
        <div className="mt-4 rounded-md border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Activity
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{activityLabel}</p>
          {survey.farmArea?.name && (
            <p className="mt-0.5 text-xs text-muted-foreground">Farm area: {survey.farmArea.name}</p>
          )}
        </div>
      </SectionCard>

      {/* ── Section 2: Farm observations ── */}
      <SectionCard title="Farm observations">
        <p className="mb-4 text-sm text-muted-foreground">
          Add source farms and enter observed rates. Check{" "}
          <strong>Include in industry average</strong> for farms that should drive the primary
          benchmark. If no farms are included, the all-farm fallback is used instead.
        </p>
        <BenchmarkFarmDataFields
          value={farmInputs}
          onChange={setFarmInputs}
          disabled={!benchmarkEditable}
        />

        {/* Calculation breakdown */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Industry average
            </p>
            <p className="font-semibold">
              {fmtEtb(industryAverage.costPerUnit)} / unit
              {industryAverage.manDaysPerUnit != null
                ? ` · ${industryAverage.manDaysPerUnit.toFixed(3)} MD/unit`
                : ""}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fmtEtb(industryAverage.wagePerManDay)} / MD
              {industryAverage.frequency != null
                ? ` · ${industryAverage.frequency.toFixed(2)} times/yr`
                : ""}
              {" · "}
              {industryAverage.farmsWithRate} farm
              {industryAverage.farmsWithRate !== 1 ? "s" : ""} with rate
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              All-farm fallback
            </p>
            <p className="font-semibold">
              {fmtEtb(sixFarmAverage.costPerUnit)} / unit
              {sixFarmAverage.manDaysPerUnit != null
                ? ` · ${sixFarmAverage.manDaysPerUnit.toFixed(3)} MD/unit`
                : ""}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fmtEtb(sixFarmAverage.wagePerManDay)} / MD
              {sixFarmAverage.frequency != null
                ? ` · ${sixFarmAverage.frequency.toFixed(2)} times/yr`
                : ""}
              {" · "}
              {sixFarmAverage.farmsWithRate} farm
              {sixFarmAverage.farmsWithRate !== 1 ? "s" : ""} with rate
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FormField
            label="Source / evidence"
            render={(props) => (
              <Input
                {...props}
                value={sourceEvidence}
                disabled={!benchmarkEditable}
                onChange={(e) => setSourceEvidence(e.target.value)}
              />
            )}
          />
          <FormField
            label="Notes"
            render={(props) => (
              <Textarea
                {...props}
                value={notes}
                disabled={!benchmarkEditable}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            )}
          />
        </div>

        {benchmarkEditable && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                const dup = findDuplicateBenchmarkFarmName(farmInputs);
                if (dup) {
                  toast.error(`Source farm "${dup}" is listed more than once`);
                  return;
                }
                try {
                  await update(survey.id, patchBenchmark);
                  toast.success("Benchmark data saved");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Save failed");
                }
              }}
            >
              Save observations
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                const dup = findDuplicateBenchmarkFarmName(farmInputs);
                if (dup) {
                  toast.error(`Source farm "${dup}" is listed more than once`);
                  return;
                }
                try {
                  await update(survey.id, patchBenchmark);
                  await lock(survey.id);
                  toast.success("Benchmark locked — create a rate card next");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Lock failed");
                }
              }}
            >
              <Lock className="h-4 w-4" aria-hidden />
              Save &amp; lock
            </Button>
          </div>
        )}
      </SectionCard>

      {/* ── Section 3: Rate proposal ── */}
      <SectionCard title="Rate proposal">
        <p className="mb-4 text-sm text-muted-foreground">
          {locked
            ? "This benchmark is locked. Use the validated rate as the basis for a Rate Card."
            : "Lock the benchmark first, then create a Rate Card from the validated rate."}
        </p>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recommended rate
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {fmtEtb(recommendedRate)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              per {survey.activity?.uom || "unit"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Source
            </p>
            <div className="mt-2">
              <SourceBadge source={recommendedSource} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {recommendedSource === "industry_average"
                ? `${industryAverage.farmsWithRate} contributing farm${industryAverage.farmsWithRate !== 1 ? "s" : ""}`
                : `${sixFarmAverage.farmsWithRate} farm${sixFarmAverage.farmsWithRate !== 1 ? "s" : ""} (fallback)`}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge status={survey.status} />
              {locked && <StatusBadge status="approved" label="Locked" />}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canPropose && locked && (
            <Button
              disabled={busy}
              onClick={async () => {
                try {
                  const card = await createCard(survey.farmAreaId, {
                    sourceSurveyId: survey.id,
                  });
                  toast.success("Rate card draft created");
                  router.push(`${CROPFORT_ROUTES.rateCardProposals}/${card.id}`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Create rate card failed");
                }
              }}
            >
              <TrendingUp className="h-4 w-4" aria-hidden />
              Create rate card
            </Button>
          )}
          <Button variant="outline" size={locked ? "default" : "sm"} asChild>
            <a href={CROPFORT_ROUTES.rateCardProposals}>View rate cards</a>
          </Button>
        </div>
      </SectionCard>

      <AuditTimelineDrawer
        entityId={auditOpen ? survey.id : null}
        entityLabel={
          survey.activity?.code
            ? `${survey.activity.code} · ${survey.activity.name || survey.id}`
            : survey.activity?.name || survey.id
        }
        open={auditOpen}
        onOpenChange={setAuditOpen}
      />
    </PageContainer>
  );
}
