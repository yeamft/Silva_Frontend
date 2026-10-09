"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  canEnterFieldRecords,
  canSiteCheckRecords,
} from "@/lib/cropfort/platform-access";
import { validateDfr } from "@/lib/schedule5";
import { useAgreementConfigStore } from "@/store/agreementConfigStore";
import {
  useCorrectDailyFieldRecord,
  useCreateDailyFieldRecord,
  useDailyFieldRecords,
  useSiteCheckDailyFieldRecord,
  useSubmitDailyFieldRecord,
  useUpdateDailyFieldRecord,
} from "@/lib/query/hooks/use-daily-field-records";
import { useWeeklyPlans } from "@/lib/query/hooks/use-weekly-plans";

export default function DailyFieldRecordsView() {
  const { activeProgram, user } = useCropfortAuth();
  const weeklyQuery = useWeeklyPlans(Boolean(activeProgram?.id));
  const dfrQuery = useDailyFieldRecords(Boolean(activeProgram?.id));
  const createMut = useCreateDailyFieldRecord();
  const updateMut = useUpdateDailyFieldRecord();
  const submitMut = useSubmitDailyFieldRecord();
  const siteCheckMut = useSiteCheckDailyFieldRecord();
  const correctMut = useCorrectDailyFieldRecord();
  const allPlans = weeklyQuery.data || [];
  const records = dfrQuery.data || [];
  const schedule5 = useAgreementConfigStore((s) => s.schedule5);

  const plans = useMemo(
    () => allPlans.filter((p) => p.status === "active"),
    [allPlans],
  );

  const [planId, setPlanId] = useState("");
  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const [lineId, setLineId] = useState("");
  const [actualQty, setActualQty] = useState("1.4");
  const [laborHours, setLaborHours] = useState("8");
  const [notes, setNotes] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!plans.length) {
      if (planId) setPlanId("");
      if (lineId) setLineId("");
      return;
    }
    const nextPlan = plans.find((p) => p.id === planId) ?? plans[0];
    if (nextPlan.id !== planId) setPlanId(nextPlan.id);
    const nextLine = nextPlan.lines.find((l) => l.id === lineId) ?? nextPlan.lines[0];
    if (nextLine && nextLine.id !== lineId) setLineId(nextLine.id);
  }, [plans, planId, lineId]);

  useEffect(() => {
    if (!records.length) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (selectedId && !records.some((r) => r.id === selectedId)) {
      setSelectedId(records[0].id);
    }
  }, [records, selectedId]);

  const selected = useMemo(
    () => records.find((r) => r.id === selectedId) ?? records[0] ?? null,
    [records, selectedId],
  );

  const canEnter = canEnterFieldRecords(user.role);
  const isSite = canSiteCheckRecords(user.role);
  const [entrySource, setEntrySource] = useState<"bagro_platform" | "import_from_chaka">(
    "bagro_platform",
  );

  const previewIssues = selected
    ? validateDfr({ ...selected, expectedBlockId: selected.blockId }, schedule5)
    : [];

  const onCreate = async () => {
    if (!canEnter) {
      toast.error("Only B-Agro enters field records on the Platform (Chaka Buna submits off-Platform)");
      return;
    }
    const line = plan?.lines.find((l) => l.id === lineId) ?? plan?.lines[0];
    if (!plan || !line) {
      toast.error("Select an active weekly plan line");
      return;
    }
    try {
      const row = await createMut.mutateAsync({
        weeklyPlanId: plan.id,
        weeklyPlanLineId: line.id,
        monthlyWoId: plan.monthlyWoId,
        monthlyWoCode: plan.monthlyWoCode,
        monthlyLineId: line.monthlyLineId,
        activityId: line.activityId,
        activityCode: line.activityCode,
        activityName: line.activityName,
        blockId: line.blockId,
        blockCode: line.blockCode,
        plannedQty: line.qty,
        actualQty: Number(actualQty) || 0,
        unit: line.unit,
        laborHours: Number(laborHours) || 0,
        notes,
        entrySource,
        materialsUsed: line.materials ? [line.materials] : [],
      });
      setSelectedId(row.id);
      toast.success(`Created ${row.code}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create DFR");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Execute"}
        title="Daily records"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Daily records" },
        ]}
      />

      <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1 lg:col-span-2">
          <Label>Weekly plan</Label>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No weekly plan</p>
          ) : (
            <Select
              value={planId}
              onValueChange={(v) => {
                setPlanId(v);
                const p = plans.find((x) => x.id === v);
                if (p?.lines[0]) setLineId(p.lines[0].id);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code} · {p.monthlyWoCode || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-1 lg:col-span-2">
          <Label>Plan line</Label>
          {!(plan?.lines?.length) ? (
            <p className="text-sm text-muted-foreground">No lines</p>
          ) : (
            <Select value={lineId} onValueChange={setLineId}>
              <SelectTrigger>
                <SelectValue placeholder="Select line" />
              </SelectTrigger>
              <SelectContent>
                {plan.lines.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.activityName} · {l.blockCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-1">
          <Label>Actual qty</Label>
          <Input value={actualQty} onChange={(e) => setActualQty(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Labor hrs</Label>
          <Input value={laborHours} onChange={(e) => setLaborHours(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Entry source</Label>
          <Select
            value={entrySource}
            onValueChange={(v) => setEntrySource(v as "bagro_platform" | "import_from_chaka")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bagro_platform">Platform</SelectItem>
              <SelectItem value="import_from_chaka">Chaka import</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={onCreate} disabled={!canEnter || !planId || !lineId}>
            New DFR
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <SectionCard title="Records">
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">None</p>
          ) : (
            <ul className="space-y-1">
              {records.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm ${
                    selected?.id === r.id ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                  }`}
                >
                  <span>
                    <span className="font-medium">{r.code}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{r.date}</span>
                  </span>
                  <StatusBadge status={r.status} />
                </button>
              ))}
            </ul>
          )}
        </SectionCard>

        {selected ? (
          <SectionCard
            title={selected.code}
            description={`${selected.activityName} · ${selected.blockCode} · ${selected.monthlyWoCode || ""} · v${selected.version}`}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status={selected.status} />
              {selected.loop !== "none" ? (
                <StatusBadge status="returned" label="Correction" />
              ) : null}
              {(selected.status === "draft" || selected.status === "returned") && canEnter && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await updateMut.mutateAsync({
                          id: selected.id,
                          patch: {
                            actualQty: Number(actualQty) || selected.actualQty,
                            laborHours: Number(laborHours) || selected.laborHours,
                            notes,
                          },
                        });
                        toast.message("Draft updated");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Save failed");
                      }
                    }}
                  >
                    Save draft
                  </Button>
                  {selected.status === "returned" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          const next = await correctMut.mutateAsync({
                            id: selected.id,
                            patch: {
                              actualQty: Number(actualQty) || selected.actualQty,
                              laborHours: Number(laborHours) || selected.laborHours,
                              notes,
                            },
                          });
                          setSelectedId(next.id);
                          toast.success(`New version ${next.code}`);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                    >
                      New version
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await submitMut.mutateAsync(selected.id);
                        toast.success("Submitted");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Submit failed");
                      }
                    }}
                  >
                    Submit
                  </Button>
                </>
              )}
              {selected.status === "submitted" && isSite && (
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await siteCheckMut.mutateAsync({
                        id: selected.id,
                        note: "Site verified",
                        qualityScore: 92,
                      });
                      toast.success("Site checked");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                >
                  Site check
                </Button>
              )}
              {(selected.status === "submitted" || selected.status === "site_checked") && (
                <Button size="sm" variant="outline" asChild>
                  <a href={CROPFORT_ROUTES.validationQueue}>Validation</a>
                </Button>
              )}
            </div>

            <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Monthly WO</dt>
                <dd className="font-medium">{selected.monthlyWoCode || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">% done</dt>
                <dd className="cf-numeric font-medium">
                  {selected.pctDone != null ? `${selected.pctDone}%` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Quality score</dt>
                <dd className="cf-numeric font-medium">
                  {selected.qualityScore != null ? `${selected.qualityScore}%` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Planned</dt>
                <dd className="cf-numeric font-medium">
                  {selected.plannedQty} {selected.unit}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Actual</dt>
                <dd className="cf-numeric font-medium">
                  {selected.actualQty} {selected.unit}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Entry</dt>
                <dd className="text-sm">{selected.entrySource?.replace(/_/g, " ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Labor</dt>
                <dd className="cf-numeric font-medium">{selected.laborHours} h</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Schedule 5</dt>
                <dd>
                  {previewIssues.length === 0 ? (
                    <StatusBadge status="approved" label="Pass" />
                  ) : (
                    <StatusBadge status="at_risk" label={`${previewIssues.length} issue(s)`} />
                  )}
                </dd>
              </div>
            </dl>

            {selected.failedCriteria?.length ? (
              <ul className="mb-3 space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                {selected.failedCriteria.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : null}

            {previewIssues.length > 0 && (
              <ul className="mb-3 space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                {previewIssues.map((i) => (
                  <li key={i.code}>{i.message}</li>
                ))}
              </ul>
            )}

            {selected.notes ? (
              <p className="text-sm text-muted-foreground">{selected.notes}</p>
            ) : null}
            {selected.validationNotes ? (
              <p className="mt-1 text-sm">{selected.validationNotes}</p>
            ) : null}
          </SectionCard>
        ) : (
          <SectionCard title="Detail">
            <p className="text-sm text-muted-foreground">None</p>
          </SectionCard>
        )}
      </div>
    </PageContainer>
  );
}
