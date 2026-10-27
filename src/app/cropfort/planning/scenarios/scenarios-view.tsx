"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
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
  const scenarios = useMemo(() => scenariosQuery.data || [], [scenariosQuery.data]);
  const createScenario = useCreatePlanScenario();
  const deleteScenario = useDeletePlanScenario();

  const [name, setName] = useState("");
  const [compareId, setCompareId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "apply" | "delete"; id: string } | null>(null);

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
    replacePlan(structuredClone(row.snapshot));
    toast.success(`Restored “${row.name}” — save the plan to keep it`, {
      action: plan
        ? { label: "Open plan", onClick: () => { window.location.href = `${CROPFORT_ROUTES.programmePlans}/${plan.id}`; } }
        : undefined,
    });
  };
  const confirmRow = confirm ? scenarios.find((s) => s.id === confirm.id) ?? null : null;

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
                {completion.includedCount} lines · {fmtEtb(completion.budgetEtb)}
              </span>
            </>
          ) : null
        }
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href={CROPFORT_ROUTES.coreOperations}>Core Operations plan</Link>
          </Button>
        }
      />

      <SectionCard
        title="Save a snapshot"
        description="Keep a copy of the current plan so you can compare alternatives or go back to it later."
      >
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-xs"
            placeholder={`Scenario ${scenarios.length + 1}`}
            aria-label="Snapshot name"
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

      <SectionCard title="Scenarios" flush>
        {scenariosQuery.isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : scenarios.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No snapshots yet. Save one above before trying changes to the plan.
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
                      <Button size="sm" variant="outline" onClick={() => setConfirm({ kind: "apply", id: s.id })}>
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={deleteScenario.isPending}
                        onClick={() => setConfirm({ kind: "delete", id: s.id })}
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
      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(o) => !o && setConfirm(null)}
        destructive={confirm?.kind === "delete"}
        title={confirm?.kind === "apply" ? `Restore “${confirmRow?.name ?? ""}”?` : `Delete “${confirmRow?.name ?? ""}”?`}
        description={
          confirm?.kind === "apply"
            ? "The plan you have open is replaced by this snapshot. It isn't saved until you save the plan — save a snapshot of the current plan first if you may want it back."
            : "The snapshot is removed. The live plan isn't affected."
        }
        confirmLabel={confirm?.kind === "apply" ? "Restore" : "Delete"}
        loading={deleteScenario.isPending}
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.kind === "apply") {
            onApply(confirm.id);
            setConfirm(null);
            return;
          }
          try {
            await deleteScenario.mutateAsync(confirm.id);
            toast.success("Snapshot deleted");
            setConfirm(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
          }
        }}
      />
    </PageContainer>
  );
}
