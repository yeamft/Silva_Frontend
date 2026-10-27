"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Check, History, Lock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
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
import { cn } from "@/lib/utils";
import { useRateCardStore } from "@/store/rateCardStore";

function fmtEtb(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** Keeps small per-unit values readable: 0.003 stays 0.003 instead of rounding to 0.0. */
function fmtQty(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: Math.abs(n) < 1 ? 3 : 2 });
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
  const [confirmLock, setConfirmLock] = useState(false);

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

  // Warn if frequency looks unusual (> 52 times/year for a field activity)
  const freqWarning =
    recommendedFreq != null && recommendedFreq > 52
      ? `Frequency of ${recommendedFreq}/year is unusually high — please verify.`
      : null;

  const uom = survey.activity?.uom || "unit";
  const hasRates = sixFarmAverage.farmsWithRate > 0;
  const title = survey.activity?.code
    ? `${survey.activity.code} · ${survey.activity.name || "Rate survey"}`
    : survey.activity?.name || "Rate survey";

  const saveObservations = async () => {
    const dup = findDuplicateBenchmarkFarmName(farmInputs);
    if (dup) {
      toast.error(`Source farm "${dup}" is listed more than once`);
      return false;
    }
    await update(survey.id, patchBenchmark);
    return true;
  };

  // Survey workflow: enter farm rates → lock the benchmark → create a rate card from it
  const steps = [
    { label: "Enter farm rates", done: hasRates },
    { label: "Lock the benchmark", done: locked },
    { label: "Create a rate card", done: false },
  ];
  const currentStep = !hasRates ? 0 : !locked ? 1 : 2;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Rates"}
        title={title}
        description={[survey.activity?.category, survey.activity?.subgroup, survey.farmArea?.name ? `Farm area: ${survey.farmArea.name}` : null]
          .filter(Boolean)
          .join(" · ")}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Rate surveys", href: CROPFORT_ROUTES.benchmarkSurveys },
          { label: survey.activity?.code || "Survey" },
        ]}
        meta={
          <>
            {locked ? <StatusBadge status="approved" label="Locked" /> : <StatusBadge status={survey.status} />}
            <span className="text-xs capitalize text-muted-foreground">{survey.kind} · per {uom}</span>
          </>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}>
            <History className="h-4 w-4" aria-hidden />
            History
          </Button>
        }
      />

      {/* What happens now */}
      {canPropose ? (
        <section aria-label="Survey steps" className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <ol className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {steps.map((step, index) => (
              <li key={step.label} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    step.done
                      ? "bg-primary text-primary-foreground"
                      : index === currentStep
                        ? "border-2 border-primary text-primary"
                        : "border border-border text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {step.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className={cn(index === currentStep ? "font-medium" : "text-muted-foreground")}>{step.label}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {currentStep === 0
                ? "Add the source farms below and enter what each pays for this activity."
                : currentStep === 1
                  ? "Check the recommended rate, then lock the benchmark. Locked figures can't be changed."
                  : "The benchmark is locked. Create a rate card from it and submit it for approval."}
            </p>
            {currentStep === 1 && benchmarkEditable ? (
              <Button className="shrink-0" disabled={busy} onClick={() => setConfirmLock(true)}>
                <Lock className="h-4 w-4" aria-hidden />
                Lock benchmark
              </Button>
            ) : currentStep === 2 ? (
              <Button
                className="shrink-0"
                disabled={busy}
                onClick={async () => {
                  try {
                    const card = await createCard(survey.farmAreaId, { sourceSurveyId: survey.id });
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
            ) : null}
          </div>
        </section>
      ) : null}

      <SectionCard
        title="Recommended rate"
        description={
          recommendedSource === "industry_average"
            ? `Industry average of ${industryAverage.farmsWithRate} farm${industryAverage.farmsWithRate !== 1 ? "s" : ""}`
            : hasRates
              ? `All-farm average of ${sixFarmAverage.farmsWithRate} farm${sixFarmAverage.farmsWithRate !== 1 ? "s" : ""} — no farms marked for the industry average`
              : "Enter farm rates to see the recommendation"
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile label="Recommended rate" value={fmtEtb(recommendedRate)} sub={`per ${uom}`} highlight />
          <MetricTile label="Labour norm" value={recommendedNorm != null ? `${fmtQty(recommendedNorm)} MD` : "—"} sub={`man-days per ${uom}`} />
          <MetricTile label="Wage" value={fmtEtb(recommendedWage)} sub="per man-day" />
          <MetricTile label="Frequency" value={recommendedFreq != null ? `${fmtQty(recommendedFreq)}` : "—"} sub="times per year" />
        </div>
        {freqWarning ? (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {freqWarning}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Farm rates"
        description={
          benchmarkEditable
            ? "Add each source farm and what it pays. Tick “Include in industry average” for the farms that should set the benchmark."
            : locked
              ? "Locked — these are the figures the rate card is based on."
              : undefined
        }
      >
        <BenchmarkFarmDataFields value={farmInputs} onChange={setFarmInputs} disabled={!benchmarkEditable} />

        <details className="mt-4 rounded-md border border-border px-3 py-2 text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">How the recommendation is calculated</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Industry average (ticked farms)", avg: industryAverage },
              { label: "All-farm average (fallback)", avg: sixFarmAverage },
            ].map(({ label, avg }) => (
              <div key={label} className="rounded-md bg-muted/30 p-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">{label}</p>
                <p className="font-semibold">
                  {fmtEtb(avg.costPerUnit)} / {uom}
                  {avg.manDaysPerUnit != null ? ` · ${fmtQty(avg.manDaysPerUnit)} MD` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fmtEtb(avg.wagePerManDay)} / MD
                  {avg.frequency != null ? ` · ${fmtQty(avg.frequency)} times/yr` : ""} · {avg.farmsWithRate} farm
                  {avg.farmsWithRate !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Wage = average cost ÷ average man-days, so man-days × wage reproduces the farms&apos; average cost. The all-farm average is used only when no farm is ticked.
          </p>
        </details>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FormField
            label="Source / evidence"
            render={(props) => (
              <Input {...props} value={sourceEvidence} disabled={!benchmarkEditable} onChange={(e) => setSourceEvidence(e.target.value)} />
            )}
          />
          <FormField
            label="Notes"
            render={(props) => (
              <Textarea {...props} value={notes} disabled={!benchmarkEditable} onChange={(e) => setNotes(e.target.value)} rows={2} />
            )}
          />
        </div>

        {benchmarkEditable ? (
          <div className="mt-4">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                try {
                  if (await saveObservations()) toast.success("Farm rates saved");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Save failed");
                }
              }}
            >
              Save farm rates
            </Button>
          </div>
        ) : null}
      </SectionCard>

      <ConfirmDialog
        open={confirmLock}
        onOpenChange={setConfirmLock}
        destructive={false}
        title="Lock this benchmark?"
        description={`The recommended rate of ${fmtEtb(recommendedRate)} per ${uom} and its farm figures will be fixed. You can then create a rate card from it.`}
        confirmLabel="Save & lock"
        loading={busy}
        onConfirm={async () => {
          try {
            if (!(await saveObservations())) return;
            await lock(survey.id);
            setConfirmLock(false);
            toast.success("Benchmark locked — create a rate card next");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Lock failed");
          }
        }}
      />

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
