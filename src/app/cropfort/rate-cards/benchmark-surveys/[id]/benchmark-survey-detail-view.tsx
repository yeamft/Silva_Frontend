"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { History, Lock } from "lucide-react";
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

/** Benchmark Survey = farm-level evidence. Rate card (from this survey) goes to Silva. */
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

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Rates"}
        title={survey.activity?.name || "Benchmark survey"}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Rates", href: CROPFORT_ROUTES.rateCardProposals },
          { label: "Benchmark surveys", href: CROPFORT_ROUTES.benchmarkSurveys },
          { label: survey.activity?.name || survey.id },
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

      <SectionCard title="Farm benchmark data">
        <p className="mb-3 text-sm text-muted-foreground">
          Include any farms in the industry average. If none of those farms have rates, all farms
          with rates are used for the fallback. Wage per man-day is cost per unit divided by
          man-days per unit.
        </p>
        <BenchmarkFarmDataFields
          value={farmInputs}
          onChange={setFarmInputs}
          disabled={!benchmarkEditable}
        />
        <div className="mt-3 grid gap-3 rounded-md bg-muted/40 p-3 text-sm sm:grid-cols-2">
          <div>
            <p className="cf-label">Industry average</p>
            <p className="font-semibold">
              {fmtEtb(benchmarkSummary.industryAverage.costPerUnit)} / unit ·{" "}
              {benchmarkSummary.industryAverage.manDaysPerUnit?.toFixed(3) ?? "—"} MD/unit
            </p>
            <p className="text-xs text-muted-foreground">
              {fmtEtb(benchmarkSummary.industryAverage.wagePerManDay)} / MD ·{" "}
              {benchmarkSummary.industryAverage.frequency?.toFixed(2) ?? "—"} times/year ·{" "}
              {benchmarkSummary.industryAverage.farmsWithRate} farms with rate
            </p>
          </div>
          <div>
            <p className="cf-label">All-farm fallback</p>
            <p className="font-semibold">
              {fmtEtb(benchmarkSummary.sixFarmAverage.costPerUnit)} / unit ·{" "}
              {benchmarkSummary.sixFarmAverage.manDaysPerUnit?.toFixed(3) ?? "—"} MD/unit
            </p>
            <p className="text-xs text-muted-foreground">
              {fmtEtb(benchmarkSummary.sixFarmAverage.wagePerManDay)} / MD ·{" "}
              {benchmarkSummary.sixFarmAverage.frequency?.toFixed(2) ?? "—"} times/year ·{" "}
              {benchmarkSummary.sixFarmAverage.farmsWithRate} farms with rate
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          <div className="sm:col-span-2">
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
        </div>

        <div className="mt-3 grid gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm sm:grid-cols-2">
          <div>
            <p className="cf-label">Recommended rate / unit</p>
            <p className="cf-data">
              {fmtEtb(
                benchmarkSummary.industryAverage.costPerUnit ??
                  benchmarkSummary.sixFarmAverage.costPerUnit ??
                  survey.recommendedRate,
              )}
            </p>
          </div>
          <div>
            <p className="cf-label">Activity</p>
            <p className="cf-data">
              {survey.activity?.code} · {survey.activity?.category}
              {survey.activity?.subgroup ? ` · ${survey.activity.subgroup}` : ""} ·{" "}
              {survey.activity?.name} · {survey.activity?.uom} · {survey.farmArea?.name}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {benchmarkEditable ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                const duplicateFarmName = findDuplicateBenchmarkFarmName(farmInputs);
                if (duplicateFarmName) {
                  toast.error(`Source farm "${duplicateFarmName}" is listed more than once`);
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
              Save benchmark
            </Button>
          ) : null}
          {canPropose && editable && !locked ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                const duplicateFarmName = findDuplicateBenchmarkFarmName(farmInputs);
                if (duplicateFarmName) {
                  toast.error(`Source farm "${duplicateFarmName}" is listed more than once`);
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
              Lock benchmark
            </Button>
          ) : null}
          {canPropose && locked ? (
            <Button
              size="sm"
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
              Create rate card
            </Button>
          ) : null}
          <Button variant="outline" size="sm" asChild>
            <a href={CROPFORT_ROUTES.rateCardProposals}>Rate cards</a>
          </Button>
        </div>
      </SectionCard>

      <AuditTimelineDrawer
        entityId={auditOpen ? survey.id : null}
        entityLabel={survey.activity?.name || survey.id}
        open={auditOpen}
        onOpenChange={setAuditOpen}
      />
    </PageContainer>
  );
}
