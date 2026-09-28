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
import {
  useCreatePlanScenario,
  useDeletePlanScenario,
  usePlanScenarios,
} from "@/lib/query/hooks/use-plan-scenarios";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";

export default function ScenariosView() {
  const { activeProgram } = useCropfortAuth();
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const loadContext = useCoreOpsPlanStore((s) => s.loadContext);
  const planCompletion = useCoreOpsPlanStore((s) => s.planCompletion);
  const replacePlan = useCoreOpsPlanStore((s) => s.replacePlan);

  const scenariosQuery = usePlanScenarios(Boolean(activeProgram?.id));
  const scenarios = scenariosQuery.data || [];
  const createScenario = useCreatePlanScenario();
  const deleteScenario = useDeletePlanScenario();

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

  const onSave = async () => {
    if (!plan) {
      toast.error("No live plan to snapshot");
      return;
    }
    try {
      const row = await createScenario.mutateAsync({
        name: name || `Scenario ${scenarios.length + 1}`,
        snapshot: structuredClone(plan),
        includedCount: completion.includedCount,
        budgetEtb: completion.budgetEtb,
        scheduledCount: completion.scheduledCount,
      });
      setName("");
      setCompareId(row.id);
      toast.success(`Saved “${row.name}”`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save scenario");
    }
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
                Live · {completion.includedCount} lines · {fmtEtb(completion.budgetEtb)}
              </span>
            </>
          ) : null
        }
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href={CROPFORT_ROUTES.coreOperations}>Programme plan</Link>
          </Button>
        }
      />

      <SectionCard title="Save current plan as scenario">
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-xs"
            placeholder="e.g. Dry-season uplift"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!plan || createScenario.isPending}
            onClick={() => void onSave()}
          >
            Save snapshot
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Saved scenarios" flush>
        {scenariosQuery.isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : scenarios.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No scenarios yet. Snapshot the live programme plan to compare options.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Scheduled</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.includedCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtEtb(s.budgetEtb)}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.scheduledCount}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(s.savedAt).toLocaleString()}
                  </TableCell>
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
                        disabled={deleteScenario.isPending}
                        onClick={() => {
                          void deleteScenario
                            .mutateAsync(s.id)
                            .then(() => toast.success("Removed"))
                            .catch((e) =>
                              toast.error(e instanceof Error ? e.message : "Delete failed"),
                            );
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
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Live budget</p>
              <p className="font-semibold tabular-nums">{fmtEtb(completion.budgetEtb)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Scenario budget</p>
              <p className="font-semibold tabular-nums">{fmtEtb(compare.budgetEtb)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Delta</p>
              <p className="font-semibold tabular-nums">
                {fmtEtb(compare.budgetEtb - completion.budgetEtb)}
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
