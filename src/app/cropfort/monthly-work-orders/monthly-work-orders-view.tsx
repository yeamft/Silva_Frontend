"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { PLAN_MONTHS, PLAN_MONTH_LABELS } from "@/lib/cropfort/ethiopian-year";
import { canApproveOutOfPlan, canEditPlanScope } from "@/lib/cropfort/platform-access";
import { cn } from "@/lib/utils";
import { fmtEtb } from "@/store/cropfortOpsStore";
import { useAgreementConfigStore } from "@/store/agreementConfigStore";
import {
  useActivateMonthlyWorkOrder,
  useAddMonthlyOutOfPlanLine,
  useDecideMonthlyWorkOrder,
  useMonthlyWorkOrders,
  useSubmitMonthlyWorkOrder,
} from "@/lib/query/hooks/use-monthly-work-orders";
import { useCreateWorkOrdersFromPlan, useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import type { MonthlyWorkOrder, MonthlyWoStatus } from "@/types/agronomic-cycle";

type Order = MonthlyWorkOrder & { returnedComment?: string | null };

const STEPS: { status: MonthlyWoStatus; label: string }[] = [
  { status: "draft", label: "Draft" },
  { status: "submitted", label: "Submitted" },
  { status: "approved", label: "Approved" },
  { status: "active", label: "Active" },
];

function stepIndex(status: MonthlyWoStatus) {
  return status === "returned" ? 0 : STEPS.findIndex((s) => s.status === status);
}

export default function MonthlyWorkOrdersView() {
  const { activeProgram, user } = useCropfortAuth();
  const router = useRouter();
  const enabled = Boolean(activeProgram?.id);
  const ordersQuery = useMonthlyWorkOrders(enabled);
  const approvedPlansQuery = useProgrammePlans(enabled, { status: "approved" });
  const fromPlanMut = useCreateWorkOrdersFromPlan();
  const submitMut = useSubmitMonthlyWorkOrder();
  const decideMut = useDecideMonthlyWorkOrder();
  const activateMut = useActivateMonthlyWorkOrder();
  const addExtraMut = useAddMonthlyOutOfPlanLine();
  const schedule7Blocking = useAgreementConfigStore((s) => s.schedule7Blocking);

  const canEdit = canEditPlanScope(user.role);
  const canApprove = canApproveOutOfPlan(user.role);

  const orders = useMemo(
    () =>
      ((ordersQuery.data || []) as Order[])
        .slice()
        .sort(
          (a, b) =>
            a.yearGc * 12 + PLAN_MONTHS.indexOf(a.ethiopianMonth) -
            (b.yearGc * 12 + PLAN_MONTHS.indexOf(b.ethiopianMonth)),
        ),
    [ordersQuery.data],
  );
  const approvedPlans = approvedPlansQuery.data || [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const [extraOpen, setExtraOpen] = useState(false);
  const [extra, setExtra] = useState({ name: "", qty: "1", etb: "", reason: "" });

  useEffect(() => {
    if (!orders.length) return;
    if (!selectedId || !orders.some((o) => o.id === selectedId)) setSelectedId(orders[0].id);
  }, [orders, selectedId]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;
  const editable = selected && (selected.status === "draft" || selected.status === "returned");
  const hasExtra = selected?.lines.some((l) => !l.inPlan) ?? false;

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  /** The one thing to do next on the selected order, for this user. */
  const primary = (() => {
    if (!selected) return null;
    if (editable && canEdit) {
      return {
        label: "Submit",
        onClick: () => {
          const blocking = schedule7Blocking();
          if (blocking.length) {
            toast.error(`Dependency register incomplete: ${blocking.map((b) => b.label).join(", ")}`);
            return;
          }
          void run(() => submitMut.mutateAsync(selected.id), "Submitted");
        },
      };
    }
    if (selected.status === "submitted" && canApprove) {
      return {
        label: "Approve",
        onClick: () => void run(() => decideMut.mutateAsync({ id: selected.id, decision: "approve" }), "Approved"),
      };
    }
    if (
      canEdit &&
      (selected.status === "approved" || (selected.status === "submitted" && !hasExtra))
    ) {
      return {
        label: "Activate — issue work orders",
        onClick: () =>
          void activateMut
            .mutateAsync(selected.id)
            .then((row) => {
              const { issuedCount = 0, heldBack = [] } = row as Order & { issuedCount?: number; heldBack?: string[] };
              toast.success(
                `Issued ${issuedCount} work order${issuedCount === 1 ? "" : "s"} to the vendor` +
                  (heldBack.length ? ` · ${heldBack.length} kept as draft` : ""),
                { action: { label: "Open", onClick: () => router.push(CROPFORT_ROUTES.workOrders) } },
              );
              if (heldBack.length) toast.warning(heldBack.join("\n"));
            })
            .catch((e) => toast.error(e instanceof Error ? e.message : "Activate failed")),
      };
    }
    return null;
  })();

  const createFromPlan = (planId: string) =>
    void fromPlanMut
      .mutateAsync(planId)
      .then(({ created }) => {
        setCreateOpen(false);
        if (!created.length) {
          toast.info("Every scheduled month already has a work order");
          return;
        }
        setSelectedId(created[0].id);
        toast.success(`Created ${created.length} monthly work order${created.length === 1 ? "" : "s"}`);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not create work orders"));

  const addExtra = async () => {
    if (!selected) return;
    if (!extra.name.trim() || !extra.reason.trim()) {
      toast.error("Activity and reason are required");
      return;
    }
    await run(
      () =>
        addExtraMut.mutateAsync({
          id: selected.id,
          activityName: extra.name.trim(),
          plannedQty: Number(extra.qty) || 1,
          unit: selected.lines[0]?.unit || "ha",
          etb: Number(extra.etb) || 0,
          blockId: selected.lines[0]?.blockId,
          blockCode: selected.lines[0]?.blockCode,
          reason: extra.reason.trim(),
        }),
      "Extra work added · needs asset owner approval",
    );
    setExtra({ name: "", qty: "1", etb: "", reason: "" });
    setExtraOpen(false);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Monthly Work Orders"
        breadcrumbs={[{ label: "Home", href: CROPFORT_ROUTES.dashboard }, { label: "Monthly Work Orders" }]}
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Create from plan
            </Button>
          ) : null
        }
      />

      {ordersQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <SectionCard>
          <div className="py-10 text-center">
            <p className="font-medium">No monthly work orders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              They are created from an approved Core Operations plan — one per scheduled month.
            </p>
            {canEdit ? (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                Create from plan
              </Button>
            ) : null}
          </div>
        </SectionCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <SectionCard title="Months" flush>
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(o.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                      selected?.id === o.id ? "bg-primary/[0.07]" : "hover:bg-muted/50",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {PLAN_MONTH_LABELS[o.ethiopianMonth]} {o.yearGc}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {o.farmName || "—"} · {fmtEtb(o.totalEtb)}
                      </span>
                    </span>
                    <StatusBadge status={o.status} />
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>

          {selected ? (
            <SectionCard
              title={`${PLAN_MONTH_LABELS[selected.ethiopianMonth]} ${selected.yearGc}`}
              description={`${selected.farmName || "—"} · ${selected.lines.length} activities · ${fmtEtb(selected.totalEtb)}`}
            >
              <ol className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                {STEPS.map((step, i) => {
                  const current = stepIndex(selected.status);
                  const done = i < current;
                  return (
                    <li key={step.status} className="flex items-center gap-2">
                      {i > 0 ? <span className="h-px w-5 bg-border" aria-hidden /> : null}
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-full px-2.5 py-1 font-medium",
                          i === current
                            ? "bg-primary text-primary-foreground"
                            : done
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="h-3 w-3" aria-hidden /> : null}
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {selected.status === "returned" && selected.returnedComment ? (
                <p className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                  Returned: {selected.returnedComment}
                </p>
              ) : null}

              <div className="overflow-x-auto rounded-md border border-border">
                <table className="cf-table w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Activity</th>
                      <th className="px-3 py-2">Block</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.lines.map((l) => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="px-3 py-2">
                          <span className="font-medium">{l.activityName}</span>
                          {!l.inPlan ? (
                            <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                              Extra
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{l.blockCode || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {l.plannedQty.toLocaleString()} <span className="text-xs text-muted-foreground">{l.unit}</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtEtb(l.etb)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.outOfPlanReason ? (
                <p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">
                  Extra work reason: {selected.outOfPlanReason}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                {primary ? <Button onClick={primary.onClick}>{primary.label}</Button> : null}
                {selected.status === "submitted" && canApprove ? (
                  <Button variant="outline" onClick={() => setReturnOpen(true)}>
                    Return
                  </Button>
                ) : null}
                {editable && canEdit ? (
                  <Button variant="outline" onClick={() => setExtraOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" aria-hidden />
                    Add extra work
                  </Button>
                ) : null}
                {selected.status === "active" ? (
                  <Button variant="outline" asChild>
                    <Link href={CROPFORT_ROUTES.workOrders}>Go to work orders</Link>
                  </Button>
                ) : null}
                {selected.status === "active" && selected.note ? (
                  <p className="w-full whitespace-pre-wrap text-xs text-muted-foreground">{selected.note}</p>
                ) : null}
                {!primary && selected.status !== "active" ? (
                  <p className="self-center text-sm text-muted-foreground">
                    {selected.status === "submitted" ? "Waiting for the asset owner." : "Nothing to do here."}
                  </p>
                ) : null}
              </div>
            </SectionCard>
          ) : null}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create from an approved plan</DialogTitle>
          </DialogHeader>
          {approvedPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No approved plans yet.{" "}
              <Link href={CROPFORT_ROUTES.programmePlans} className="font-medium text-primary hover:underline">
                Open Core Operations plans
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {approvedPlans.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.farmName} · {p.budgetYearLabel} · {fmtEtb(p.plannedCostEtb ?? 0)}
                    </span>
                  </span>
                  <Button size="sm" disabled={fromPlanMut.isPending} onClick={() => createFromPlan(p.id)}>
                    Create
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return for changes</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
            placeholder="What needs to change?"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!returnNote.trim() || !selected}
              onClick={() => {
                if (!selected) return;
                void run(
                  () => decideMut.mutateAsync({ id: selected.id, decision: "return", comment: returnNote.trim() }),
                  "Returned",
                ).then(() => {
                  setReturnOpen(false);
                  setReturnNote("");
                });
              }}
            >
              Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={extraOpen} onOpenChange={setExtraOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add extra work</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="extra-name">Activity</Label>
              <Input id="extra-name" value={extra.name} onChange={(e) => setExtra((x) => ({ ...x, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="extra-qty">Quantity</Label>
                <Input id="extra-qty" type="number" value={extra.qty} onChange={(e) => setExtra((x) => ({ ...x, qty: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="extra-etb">Cost (ETB)</Label>
                <Input id="extra-etb" type="number" value={extra.etb} onChange={(e) => setExtra((x) => ({ ...x, etb: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="extra-reason">Why is it needed?</Label>
              <Textarea id="extra-reason" rows={2} value={extra.reason} onChange={(e) => setExtra((x) => ({ ...x, reason: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">Work outside the plan needs the asset owner&apos;s approval.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtraOpen(false)}>
              Cancel
            </Button>
            <Button disabled={addExtraMut.isPending} onClick={() => void addExtra()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
