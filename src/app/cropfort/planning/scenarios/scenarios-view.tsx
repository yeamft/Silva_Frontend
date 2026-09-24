"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { fmtEtb } from "@/lib/cropfort/planning-helpers";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";
import { useScenarioStore } from "@/store/scenarioStore";

export default function ScenariosView() {
  const { activeProgram } = useCropfortAuth();
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const loadContext = useCoreOpsPlanStore((s) => s.loadContext);
  const planCompletion = useCoreOpsPlanStore((s) => s.planCompletion);
  const replacePlan = useCoreOpsPlanStore((s) => s.replacePlan);
  const scenarios = useScenarioStore((s) => s.scenarios);
  const saveFromPlan = useScenarioStore((s) => s.saveFromPlan);
  const remove = useScenarioStore((s) => s.remove);

  const [name, setName] = useState("");
  const [compareId, setCompareId] = useState<string | null>(null);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const completion = planCompletion();
  const compare = useMemo(
    () => scenarios.find((s) => s.id === compareId) ?? null,
    [scenarios, compareId],
  );

  const onSave = () => {
    if (!plan) {
      toast.error("No live plan to snapshot");
      return;
    }
    const row = saveFromPlan(plan, name || `Scenario ${scenarios.length + 1}`);
    setName("");
    setCompareId(row.id);
    toast.success(`Saved “${row.name}”`);
  };

  const onApply = (id: string) => {
    const row = scenarios.find((s) => s.id === id);
    if (!row) return;
    if (!window.confirm(`Replace the live programme plan with “${row.name}”?`)) return;
    replacePlan(structuredClone(row.snapshot));
    toast.success(`Applied “${row.name}”`);
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Planning"}
        title="Scenarios"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Planning", href: CROPFORT_ROUTES.coreOperations },
          { label: "Scenarios" },
        ]}
        meta={
          plan ? (
            <>
              <StatusBadge status={plan.status} />
              <span className="text-xs tabular-nums">
                Live · {completion.includedCount} activities · {fmtEtb(completion.budgetEtb)}
              </span>
            </>
          ) : null
        }
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href={CROPFORT_ROUTES.coreOperations}>Programme</Link>
          </Button>
        }
      />

      <SectionCard title="Save current plan">
        {!plan ? (
          <p className="text-sm text-muted-foreground">
            Create a programme plan first, then snapshot it here.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Scenario name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dry-season uplift"
              />
            </div>
            <Button onClick={onSave}>Save snapshot</Button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Saved scenarios" flush>
        {scenarios.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No scenarios yet. Save the live plan to compare alternatives.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead className="text-right">Activities</TableHead>
                <TableHead className="text-right">Scheduled</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((s) => (
                <TableRow key={s.id} data-state={compareId === s.id ? "selected" : undefined}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(s.savedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.includedCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.scheduledCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtEtb(s.budgetEtb)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setCompareId(s.id)}>
                        Compare
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onApply(s.id)}>
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          remove(s.id);
                          if (compareId === s.id) setCompareId(null);
                          toast.message("Scenario removed");
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {compare && plan ? (
        <SectionCard title={`Compare · ${compare.name}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Live plan</TableHead>
                <TableHead className="text-right">{compare.name}</TableHead>
                <TableHead className="text-right">Δ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(
                [
                  ["Included activities", completion.includedCount, compare.includedCount],
                  ["Scheduled", completion.scheduledCount, compare.scheduledCount],
                  ["Budget (ETB)", completion.budgetEtb, compare.budgetEtb],
                ] as const
              ).map(([label, live, snap]) => {
                const delta = live - snap;
                return (
                  <TableRow key={label}>
                    <TableCell>{label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {label.includes("ETB") ? fmtEtb(live) : live}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {label.includes("ETB") ? fmtEtb(snap) : snap}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {label.includes("ETB")
                        ? `${delta >= 0 ? "+" : ""}${fmtEtb(delta).replace("ETB ", "")}`
                        : `${delta >= 0 ? "+" : ""}${delta}`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
