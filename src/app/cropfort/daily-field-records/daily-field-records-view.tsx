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
import { useDailyFieldRecordStore } from "@/store/dailyFieldRecordStore";
import { useWeeklyPlanStore } from "@/store/weeklyPlanStore";

export default function DailyFieldRecordsView() {
  const { activeProgram, user } = useCropfortAuth();
  const allPlans = useWeeklyPlanStore((s) => s.plans);
  const allRecords = useDailyFieldRecordStore((s) => s.records);
  const createFromWeeklyLine = useDailyFieldRecordStore((s) => s.createFromWeeklyLine);
  const updateDraft = useDailyFieldRecordStore((s) => s.updateDraft);
  const submit = useDailyFieldRecordStore((s) => s.submit);
  const siteCheck = useDailyFieldRecordStore((s) => s.siteCheck);
  const correctAsNewVersion = useDailyFieldRecordStore((s) => s.correctAsNewVersion);
  const schedule5 = useAgreementConfigStore((s) => s.schedule5);

  const records = useMemo(() => {
    const byKey = new Map<string, (typeof allRecords)[0]>();
    for (const r of allRecords) {
      const key = r.code.split("-v")[0];
      const prev = byKey.get(key);
      if (!prev || r.version >= prev.version) byKey.set(key, r);
    }
    return Array.from(byKey.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [allRecords]);

  const plans = useMemo(
    () => allPlans.filter((p) => p.status === "active"),
    [allPlans],
  );

  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const [lineId, setLineId] = useState(plan?.lines[0]?.id ?? "");
  const [actualQty, setActualQty] = useState("1.4");
  const [laborHours, setLaborHours] = useState("8");
  const [notes, setNotes] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null);

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

  const onCreate = () => {
    if (!canEnter) {
      toast.error("Only B-Agro enters field records on the Platform (Chaka Buna submits off-Platform)");
      return;
    }
    try {
      const row = createFromWeeklyLine({
        weeklyPlanId: planId,
        weeklyPlanLineId: lineId,
        actualQty: Number(actualQty) || 0,
        laborHours: Number(laborHours) || 0,
        notes,
        entrySource,
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
        title="Daily Field Records"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Daily Field Records" },
        ]}
      />

      <p className="mb-3 text-xs text-muted-foreground">
        Chaka Buna records work off-Platform; B-Agro is the only route for field data into the
        Platform (RB04 / RB09).
      </p>

      <div className="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1 lg:col-span-2">
          <Label>Weekly plan</Label>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active weekly plan. Activate one under Weekly Plans first.
            </p>
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
            <p className="text-sm text-muted-foreground">No lines on this plan.</p>
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
              <SelectItem value="bagro_platform">B-Agro on Platform</SelectItem>
              <SelectItem value="import_from_chaka">Import from Chaka (paper/digital)</SelectItem>
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
            <p className="text-sm text-muted-foreground">No daily field records yet.</p>
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
                <StatusBadge status="returned" label="Needs correction" />
              ) : null}
              {(selected.status === "draft" || selected.status === "returned") && canEnter && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateDraft(selected.id, {
                        actualQty: Number(actualQty) || selected.actualQty,
                        laborHours: Number(laborHours) || selected.laborHours,
                        notes,
                      });
                      toast.message("Draft updated");
                    }}
                  >
                    Save draft
                  </Button>
                  {selected.status === "returned" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        try {
                          const next = correctAsNewVersion(selected.id, {
                            actualQty: Number(actualQty) || selected.actualQty,
                            laborHours: Number(laborHours) || selected.laborHours,
                            notes,
                          });
                          setSelectedId(next.id);
                          toast.success(`New version ${next.code} (original kept)`);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                    >
                      Correct as new version
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    onClick={() => {
                      submit(selected.id);
                      toast.success("Submitted for site check");
                    }}
                  >
                    Submit
                  </Button>
                </>
              )}
              {selected.status === "submitted" && isSite && (
                <Button
                  size="sm"
                  onClick={() => {
                    try {
                      siteCheck(selected.id, "Site verified", 92);
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
                  <a href={CROPFORT_ROUTES.validationQueue}>Open validation queue</a>
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
                <dt className="text-xs text-muted-foreground">Sch. 5 preview</dt>
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
              <p className="text-sm text-muted-foreground">Notes: {selected.notes}</p>
            ) : null}
            {selected.validationNotes ? (
              <p className="mt-1 text-sm">Validation: {selected.validationNotes}</p>
            ) : null}
            {selected.supersedesId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Supersedes prior version (id {selected.supersedesId.slice(0, 12)}…)
              </p>
            ) : null}
          </SectionCard>
        ) : (
          <SectionCard title="Record detail">
            <p className="text-sm text-muted-foreground">Select or create a DFR to review.</p>
          </SectionCard>
        )}
      </div>
    </PageContainer>
  );
}
