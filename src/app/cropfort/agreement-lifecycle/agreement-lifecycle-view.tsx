"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  PROCESS_MAP_DESK_LABELS,
  PROCESS_MAP_LOOPS,
  PROCESS_MAP_PHASES,
  PROCESS_MAP_STEPS,
} from "@/lib/process-map";
import { useAgreementConfigStore } from "@/store/agreementConfigStore";

type Tab = "process_map" | "establishment" | "six_month" | "schedules";

export default function AgreementLifecycleView() {
  const { activeProgram } = useCropfortAuth();
  const [tab, setTab] = useState<Tab>("process_map");

  const establishment = useAgreementConfigStore((s) => s.establishment);
  const startEstablishment = useAgreementConfigStore((s) => s.startEstablishment);
  const toggleDeliverable = useAgreementConfigStore((s) => s.toggleDeliverable);
  const sixMonthReviews = useAgreementConfigStore((s) => s.sixMonthReviews);
  const createSixMonthReview = useAgreementConfigStore((s) => s.createSixMonthReview);
  const updateSixMonthReview = useAgreementConfigStore((s) => s.updateSixMonthReview);
  const schedule5 = useAgreementConfigStore((s) => s.schedule5);
  const setSchedule5 = useAgreementConfigStore((s) => s.setSchedule5);
  const schedule7 = useAgreementConfigStore((s) => s.schedule7);
  const toggleSchedule7 = useAgreementConfigStore((s) => s.toggleSchedule7);
  const processCalendar = useAgreementConfigStore((s) => s.processCalendar);
  const updateProcessCalendarItem = useAgreementConfigStore((s) => s.updateProcessCalendarItem);
  const reservedMatters = useAgreementConfigStore((s) => s.reservedMatters);
  const setReservedMatters = useAgreementConfigStore((s) => s.setReservedMatters);
  const directInstructionValueEtb = useAgreementConfigStore(
    (s) => s.directInstructionValueEtb,
  );
  const setDirectInstructionValueEtb = useAgreementConfigStore(
    (s) => s.setDirectInstructionValueEtb,
  );

  const [reviewId, setReviewId] = useState<string | null>(sixMonthReviews[0]?.id ?? null);
  const review = sixMonthReviews.find((r) => r.id === reviewId) ?? sixMonthReviews[0] ?? null;
  const [phaseFilter, setPhaseFilter] = useState<string>("all");

  const tabs: { id: Tab; label: string }[] = [
    { id: "process_map", label: "Process Map" },
    { id: "establishment", label: "Establishment" },
    { id: "six_month", label: "Six-month review" },
    { id: "schedules", label: "Schedules" },
  ];

  const visibleSteps =
    phaseFilter === "all"
      ? PROCESS_MAP_STEPS
      : PROCESS_MAP_STEPS.filter((s) => s.phase === phaseFilter);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Plan"}
        title="Agreement lifecycle"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Agreement lifecycle" },
        ]}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "process_map" && (
        <div className="space-y-4">
          <SectionCard title="Phases">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PROCESS_MAP_PHASES.map((p) => (
                <li key={p.id} className="rounded-lg border px-3 py-2">
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.cadence}</p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Main steps"
            action={
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant={phaseFilter === "all" ? "default" : "outline"}
                  onClick={() => setPhaseFilter("all")}
                >
                  All
                </Button>
                {PROCESS_MAP_PHASES.map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant={phaseFilter === p.id ? "default" : "outline"}
                    onClick={() => setPhaseFilter(p.id)}
                  >
                    {p.id === "0" ? "0" : p.id}
                  </Button>
                ))}
              </div>
            }
          >
            <ol className="space-y-3">
              {visibleSteps.map((step) => (
                <li key={String(step.id)} className="rounded-xl border px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        <span className="cf-numeric text-muted-foreground">
                          {step.id}.
                        </span>{" "}
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {PROCESS_MAP_DESK_LABELS[step.desk]}
                        {step.timing ? ` · ${step.timing}` : ""}
                      </p>
                    </div>
                    {step.href ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={step.href}>Open</Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>

          <SectionCard title="Exception paths">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Path</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Trigger</th>
                    <th className="px-3 py-2">Re-entry</th>
                  </tr>
                </thead>
                <tbody>
                  {PROCESS_MAP_LOOPS.map((loop) => (
                    <tr key={loop.id} className="border-t align-top">
                      <td className="px-3 py-2 font-semibold">{loop.letter}</td>
                      <td className="px-3 py-2">{loop.title}</td>
                      <td className="px-3 py-2 text-muted-foreground">{loop.trigger}</td>
                      <td className="px-3 py-2 text-muted-foreground">{loop.reentry}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Non-implementation escalates through mandate exclusion stages. Response clocks run from
              receipt and extend day-for-day.
            </p>
          </SectionCard>
        </div>
      )}

      {tab === "establishment" && (
        <SectionCard
          title="Establishment (90 / 120 days)"
          description={
            establishment
              ? `${establishment.farmName} · started ${establishment.startDate}`
              : "Not started"
          }
        >
          {!establishment ? (
            <Button
              onClick={() => {
                startEstablishment({
                  programId: activeProgram?.id ?? "prog-1",
                  farmName: activeProgram?.name ?? "Sheka Estate",
                });
                toast.success("Establishment started");
              }}
            >
              Start establishment
            </Button>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2 text-sm">
                <StatusBadge status={establishment.status} />
                <span className="text-muted-foreground">Day-90 due {establishment.day90Due}</span>
                <span className="text-muted-foreground">
                  Day-120 longstop {establishment.day120Due}
                </span>
              </div>
              <ul className="space-y-2">
                {establishment.deliverables.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-start gap-3 rounded-lg border px-3 py-2"
                  >
                    <Checkbox
                      checked={d.done}
                      onCheckedChange={() => toggleDeliverable(d.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">Due day {d.dueDay}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SectionCard>
      )}

      {tab === "six_month" && (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <SectionCard title="Reviews">
            <Button
              size="sm"
              className="mb-3 w-full"
              onClick={() => {
                const row = createSixMonthReview();
                setReviewId(row.id);
                toast.success("Draft six-month review created");
              }}
            >
              New review
            </Button>
            <ul className="space-y-1">
              {sixMonthReviews.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReviewId(r.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm ${
                    review?.id === r.id ? "bg-primary/10" : "hover:bg-muted/60"
                  }`}
                >
                  <span>{r.budgetYearLabel}</span>
                  <StatusBadge status={r.status} />
                </button>
              ))}
            </ul>
          </SectionCard>
          {review ? (
            <SectionCard title={`${review.farmName} — Formal review`}>
              <p className="mb-3 text-sm text-muted-foreground">
                Variance {review.variancePct}% · ETB {review.varianceEtb.toLocaleString()}
              </p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Findings</Label>
                  <Textarea
                    rows={3}
                    value={review.findings}
                    onChange={(e) =>
                      updateSixMonthReview(review.id, { findings: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Corrective actions</Label>
                  <Textarea
                    rows={3}
                    value={review.correctiveActions}
                    onChange={(e) =>
                      updateSixMonthReview(review.id, {
                        correctiveActions: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      updateSixMonthReview(review.id, { status: "submitted" });
                      toast.success("Submitted to Silva");
                    }}
                  >
                    Submit to Silva
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      updateSixMonthReview(review.id, { status: "accepted" });
                      toast.success("Performance accepted");
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateSixMonthReview(review.id, { status: "corrective_action" });
                      toast.message("Corrective action opened");
                    }}
                  >
                    Open corrective action
                  </Button>
                </div>
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="No review yet">
              <p className="text-sm text-muted-foreground">
                Create a six-month performance review to begin.
              </p>
            </SectionCard>
          )}
        </div>
      )}

      {tab === "schedules" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Schedule 5 — Standards">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Direct Instruction value (ETB)</Label>
                <Input
                  type="number"
                  value={directInstructionValueEtb}
                  onChange={(e) =>
                    setDirectInstructionValueEtb(Number(e.target.value) || 0)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Operating Standards limit (RB03.8). Above this, DIs escalate to Intervention.
                </p>
              </div>
              <div className="space-y-1">
                <Label>Qty variance max (%)</Label>
                <Input
                  type="number"
                  value={schedule5.qtyVariancePctMax}
                  onChange={(e) =>
                    setSchedule5({ qtyVariancePctMax: Number(e.target.value) || 10 })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={schedule5.requireLaborHours}
                  onCheckedChange={(v) => setSchedule5({ requireLaborHours: Boolean(v) })}
                />
                Require labor hours
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={schedule5.requireBlockMatch}
                  onCheckedChange={(v) => setSchedule5({ requireBlockMatch: Boolean(v) })}
                />
                Require block match
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={schedule5.requireNotesIfVariance}
                  onCheckedChange={(v) =>
                    setSchedule5({ requireNotesIfVariance: Boolean(v) })
                  }
                />
                Require notes when over variance
              </label>
            </div>
          </SectionCard>

          <SectionCard title="Schedule 7 — Dependencies">
            {schedule7.map((d) => (
              <label key={d.id} className="mb-2 flex items-center gap-2 text-sm">
                <Checkbox checked={d.met} onCheckedChange={() => toggleSchedule7(d.id)} />
                <span>
                  {d.label}
                  {d.required ? (
                    <span className="ml-1 text-xs text-muted-foreground">(required)</span>
                  ) : null}
                </span>
              </label>
            ))}
          </SectionCard>

          <SectionCard title="Schedule 9 — Reserved matters">
            {(
              [
                ["procurementAboveBand", "Procurement above band"],
                ["permanentHire", "Permanent hire"],
                ["relatedParty", "Related-party transaction"],
                ["landDisposition", "Land disposition"],
                ["financing", "Financing / encumbrance"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="mb-2 flex items-center gap-2 text-sm">
                <Checkbox
                  checked={reservedMatters[key]}
                  onCheckedChange={(v) => setReservedMatters({ [key]: Boolean(v) })}
                />
                {label}
              </label>
            ))}
          </SectionCard>

          <SectionCard title="Schedule 6 — Process calendar" className="lg:col-span-2">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Phase</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Due offset (days)</th>
                    <th className="px-3 py-2">Owner desk</th>
                  </tr>
                </thead>
                <tbody>
                  {processCalendar.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2">{c.phase}</td>
                      <td className="px-3 py-2">{c.label}</td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-8 w-24"
                          type="number"
                          value={c.dueOffsetDays}
                          onChange={(e) =>
                            updateProcessCalendarItem(c.id, {
                              dueOffsetDays: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2 uppercase text-xs">{c.ownerDesk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Sch. 8 KPI attribution: DFR variance % and monthly ETB roll into Progress and six-month
              review. SPX clocks run from receipt (clause 24).
            </p>
          </SectionCard>
        </div>
      )}
    </PageContainer>
  );
}
