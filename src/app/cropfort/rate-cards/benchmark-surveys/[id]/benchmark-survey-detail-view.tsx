"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { History, Lock } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { AuditTimelineDrawer } from "@/components/rate-cards/audit-timeline-drawer";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { canProposeRateCard, canViewBenchmarkSurveys } from "@/lib/cropfortAccess";
import { enrichSurvey } from "@/lib/mock-api/rate-card-workflow";
import { useBenchmarkSurveyStore } from "@/store/benchmarkSurveyStore";
import { useRateCardStore } from "@/store/rateCardStore";

function fmtEtb(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** Benchmark Survey = neighbor evidence. Rate card (from this survey) goes to Silva. */
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

  const [n1Name, setN1Name] = useState("");
  const [n2Name, setN2Name] = useState("");
  const [n1Rate, setN1Rate] = useState("");
  const [n2Rate, setN2Rate] = useState("");
  const [surveyDate, setSurveyDate] = useState("");
  const [sourceEvidence, setSourceEvidence] = useState("");
  const [notes, setNotes] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    if (!canView || !id) return;
    void loadOne(id);
  }, [canView, id, loadOne]);

  useEffect(() => {
    if (!selected || selected.id !== id) return;
    setN1Name(selected.neighbor1Name);
    setN2Name(selected.neighbor2Name);
    setN1Rate(String(selected.neighbor1Rate));
    setN2Rate(String(selected.neighbor2Rate));
    setSurveyDate(selected.surveyDate);
    setSourceEvidence(selected.sourceEvidence);
    setNotes(selected.notes);
  }, [selected, id]);

  const survey = selected && selected.id === id ? enrichSurvey(selected) : null;

  const a = Number(n1Rate);
  const b = Number(n2Rate);
  const liveRecommended =
    Number.isFinite(a) && Number.isFinite(b) ? Math.round(((a + b) / 2) * 100) / 100 : null;

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
  const neighborsEditable = editable && !locked;
  const busy = actionPending || cardPending;

  const patchNeighbors = {
    neighbor1Name: n1Name,
    neighbor2Name: n2Name,
    neighbor1Rate: Number(n1Rate),
    neighbor2Rate: Number(n2Rate),
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

      <SectionCard title="Neighbor evidence">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            label="Neighbor 1 name"
            required
            render={(props) => (
              <Input
                {...props}
                value={n1Name}
                disabled={!neighborsEditable}
                onChange={(e) => setN1Name(e.target.value)}
              />
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
                disabled={!neighborsEditable}
                onChange={(e) => setN1Rate(e.target.value)}
              />
            )}
          />
          <FormField
            label="Neighbor 2 name"
            required
            render={(props) => (
              <Input
                {...props}
                value={n2Name}
                disabled={!neighborsEditable}
                onChange={(e) => setN2Name(e.target.value)}
              />
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
                disabled={!neighborsEditable}
                onChange={(e) => setN2Rate(e.target.value)}
              />
            )}
          />
          <FormField
            label="Survey date"
            required
            render={(props) => (
              <Input
                {...props}
                type="date"
                value={surveyDate}
                disabled={!neighborsEditable}
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
                disabled={!neighborsEditable}
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
                  disabled={!neighborsEditable}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              )}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm sm:grid-cols-2">
          <div>
            <p className="cf-label">Recommended (neighbor AVG)</p>
            <p className="cf-data">{fmtEtb(liveRecommended ?? survey.recommendedRate)}</p>
          </div>
          <div>
            <p className="cf-label">Activity</p>
            <p className="cf-data">
              {survey.activity?.code} · {survey.activity?.name} · {survey.farmArea?.name}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {neighborsEditable ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                try {
                  await update(survey.id, patchNeighbors);
                  toast.success("Neighbors saved");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Save failed");
                }
              }}
            >
              Save neighbors
            </Button>
          ) : null}
          {canPropose && editable && !locked ? (
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                try {
                  await update(survey.id, patchNeighbors);
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
