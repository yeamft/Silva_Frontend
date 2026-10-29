"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { TablePagination } from "@/components/cropfort/data-table";
import { OpsDeskControlPanel, OpsDeskFilterChips } from "@/components/cropfort/ops-desk";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { PLAN_MONTHS, PLAN_MONTH_LABELS, type PlanMonth } from "@/lib/cropfort/ethiopian-year";
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
import { mapWorkOrderDto, useTransitionWorkOrder, useWorkOrders } from "@/lib/query/hooks/use-work-orders";
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

type RowFilter = "all" | "approval" | "ready" | "active" | "draft";

const PAGE_SIZES = [12, 24, 48];

function matchesFilter(o: Order, filter: RowFilter) {
  switch (filter) {
    case "approval":
      return o.status === "submitted";
    case "ready":
      return o.status === "approved";
    case "active":
      return o.status === "active";
    case "draft":
      return o.status === "draft" || o.status === "returned";
    default:
      return true;
  }
}

export default function MonthlyWorkOrdersView({ orderId, planId }: { orderId?: string; planId?: string }) {
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
  // Months each plan already has a work order for; a plan stays available until every month is taken
  const monthsByPlan = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const o of orders) {
      if (!o.sourcePlanId) continue;
      if (!map.has(o.sourcePlanId)) map.set(o.sourcePlanId, new Set());
      map.get(o.sourcePlanId)!.add(o.ethiopianMonth);
    }
    return map;
  }, [orders]);
  const approvedPlans = (approvedPlansQuery.data || []).filter(
    (p) => (monthsByPlan.get(p.id)?.size ?? 0) < PLAN_MONTHS.length,
  );
  const planHref = (key: string) => `${CROPFORT_ROUTES.monthlyWorkOrders}/plan/${encodeURIComponent(key)}`;
  const allPlansQuery = useProgrammePlans(enabled, {});
  const planNames = useMemo(
    () => new Map((allPlansQuery.data || []).map((p) => [p.id, p.name])),
    [allPlansQuery.data],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [createPlanId, setCreatePlanId] = useState<string | null>(null);
  const [createMonths, setCreateMonths] = useState<PlanMonth[]>([]);
  const createPlan = approvedPlans.find((p) => p.id === createPlanId) ?? null;
  const [tabChoice, setTabChoice] = useState<"new" | "active" | null>(null);
  /** Order being returned — set from the detail view or a list row. */
  const [returnTarget, setReturnTarget] = useState<Order | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [bulkApproving, setBulkApproving] = useState(false);
  /** Orders waiting on the activate confirmation. */
  const [activateTargets, setActivateTargets] = useState<Order[] | null>(null);
  const [activating, setActivating] = useState(false);
  const [query, setQuery] = useState("");
  const [rowFilter, setRowFilter] = useState<RowFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [extraOpen, setExtraOpen] = useState(false);
  const [extra, setExtra] = useState({ name: "", qty: "1", etb: "", reason: "" });

  /** One row per plan: its months, totals and how many orders sit in each status. */
  const planGroups = useMemo(() => {
    const groups = new Map<string, Order[]>();
    for (const o of orders) {
      const key = o.sourcePlanId || "none";
      groups.set(key, [...(groups.get(key) || []), o]);
    }
    return [...groups.entries()].map(([key, items]) => {
      const counts = new Map<MonthlyWoStatus, number>();
      for (const o of items) counts.set(o.status, (counts.get(o.status) || 0) + 1);
      return {
        key,
        name: key === "none" ? "Not from a plan" : planNames.get(key) || "Core Operations plan",
        farmName: items[0].farmName,
        orders: items,
        activities: items.reduce((sum, o) => sum + o.lines.length, 0),
        total: items.reduce((sum, o) => sum + o.totalEtb, 0),
        statuses: [...counts.entries()],
      };
    });
  }, [orders, planNames]);

  // New = approved (not yet activated) monthly work orders; Active = activated ones
  const newOrders = orders.filter((o) => o.status !== "active");
  const activeOrders = orders.filter((o) => o.status === "active");
  /** One row per plan: its months in this tab, with totals. */
  const byPlan = (list: Order[]) => {
    const groups = new Map<string, Order[]>();
    for (const o of list) {
      const key = o.sourcePlanId || "none";
      groups.set(key, [...(groups.get(key) || []), o]);
    }
    return [...groups.entries()].map(([key, items]) => ({
      key,
      name: key === "none" ? "Not from a plan" : planNames.get(key) || "Core Operations plan",
      farmName: items[0].farmName,
      orders: items,
      activities: items.reduce((sum, o) => sum + o.lines.length, 0),
      total: items.reduce((sum, o) => sum + o.totalEtb, 0),
      statuses: [...items.reduce((m, o) => m.set(o.status, (m.get(o.status) || 0) + 1), new Map<MonthlyWoStatus, number>())],
    }));
  };
  const listTab = tabChoice ?? (newOrders.length || !activeOrders.length ? "new" : "active");
  const planGroup = planId ? planGroups.find((g) => g.key === planId) ?? null : null;
  const pendingApproval = planGroup?.orders.filter((o) => o.status === "submitted") ?? [];

  const selected = orderId ? orders.find((o) => o.id === orderId) ?? null : null;
  const editable = selected && (selected.status === "draft" || selected.status === "returned");

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const approve = (o: Order) =>
    void run(() => decideMut.mutateAsync({ id: o.id, decision: "approve" }), `${o.code} approved`);

  const approveAll = async (items: Order[]) => {
    setBulkApproving(true);
    const results = await Promise.allSettled(
      items.map((o) => decideMut.mutateAsync({ id: o.id, decision: "approve" })),
    );
    setBulkApproving(false);
    const failed = results.filter((r) => r.status === "rejected").length;
    const ok = items.length - failed;
    if (ok) toast.success(`Approved ${ok} work order${ok === 1 ? "" : "s"}`);
    if (failed) toast.error(`${failed} could not be approved`);
  };

  // Submit every draft / returned month of the plan for approval at once
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const submitAllMonths = async (items: Order[]) => {
    const blocking = schedule7Blocking();
    if (blocking.length) {
      toast.error(`Dependency register incomplete: ${blocking.map((b) => b.label).join(", ")}`);
      return;
    }
    setBulkSubmitting(true);
    // Each month is independent, so they're sent together
    const results = await Promise.allSettled(items.map((o) => submitMut.mutateAsync(o.id)));
    let ok = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") ok += 1;
      else toast.error(`${items[i].code}: ${r.reason instanceof Error ? r.reason.message : "could not submit"}`);
    });
    setBulkSubmitting(false);
    if (ok) toast.success(`Submitted ${ok} month${ok === 1 ? "" : "s"} for approval`);
  };

  // Submit (mark done) every open work order issued from the selected month
  const workOrdersQuery = useWorkOrders(enabled);
  const transitionWo = useTransitionWorkOrder();
  const monthWorkOrders = (workOrdersQuery.data || [])
    .map(mapWorkOrderDto)
    .filter((wo) => selected && wo.monthlyWoCode === selected.code);
  const openMonthWorkOrders = monthWorkOrders.filter((wo) => wo.status === "issued" || wo.status === "in_progress");
  const [submitWosOpen, setSubmitWosOpen] = useState(false);
  const [submittingWos, setSubmittingWos] = useState(false);
  const submitMonthWorkOrders = async () => {
    setSubmittingWos(true);
    const items = openMonthWorkOrders;
    const results = await Promise.allSettled(
      items.map(async (wo) => {
        if (wo.status === "issued") await transitionWo.mutateAsync({ id: wo.id, status: "in_progress" });
        await transitionWo.mutateAsync({ id: wo.id, status: "complete" });
      }),
    );
    let ok = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") ok += 1;
      else toast.error(`${items[i].code}: ${r.reason instanceof Error ? r.reason.message : "could not submit"}`);
    });
    setSubmittingWos(false);
    setSubmitWosOpen(false);
    if (ok) toast.success(`Submitted ${ok} work order${ok === 1 ? "" : "s"}`);
  };

  const canActivate = (o: Order) =>
    canEdit && (o.status === "approved" || (o.status === "submitted" && !o.lines.some((l) => !l.inPlan)));

  /**
   * Activates one month at a time: work order codes come from a running count, so parallel
   * activations could hand out the same code. Each activation is a handful of batched writes.
   */
  const activateAll = async (items: Order[]) => {
    setActivating(true);
    let issued = 0;
    const heldBack: string[] = [];
    const failed: string[] = [];
    for (const o of items) {
      try {
        const row = (await activateMut.mutateAsync(o.id)) as Order & { issuedCount?: number; heldBack?: string[] };
        issued += row.issuedCount ?? 0;
        heldBack.push(...(row.heldBack ?? []));
      } catch (e) {
        failed.push(`${o.code}: ${e instanceof Error ? e.message : "Activate failed"}`);
      }
    }
    setActivating(false);
    setActivateTargets(null);
    if (items.length > failed.length) {
      toast.success(
        `Issued ${issued} work order${issued === 1 ? "" : "s"} to the vendor` +
          (heldBack.length ? ` · ${heldBack.length} kept as draft` : ""),
        { action: { label: "Open", onClick: () => router.push(CROPFORT_ROUTES.workOrders) } },
      );
    }
    if (heldBack.length) toast.warning(heldBack.join("\n"));
    if (failed.length) toast.error(failed.join("\n"));
  };

  const readyToActivate = planGroup?.orders.filter(canActivate) ?? [];
  const readyToSubmit = canEdit ? (planGroup?.orders.filter((o) => o.status === "draft" || o.status === "returned") ?? []) : [];
  const filterOptions: { id: RowFilter; label: string; count: number }[] = (
    [
      { id: "all", label: "All" },
      { id: "approval", label: "Needs approval" },
      { id: "ready", label: "Ready to activate" },
      { id: "active", label: "Active" },
      { id: "draft", label: "Draft / returned" },
    ] as const
  ).map((f) => ({ ...f, count: planGroup?.orders.filter((o) => matchesFilter(o, f.id)).length ?? 0 }));
  const q = query.trim().toLowerCase();
  const visibleOrders = (planGroup?.orders ?? []).filter(
    (o) =>
      matchesFilter(o, rowFilter) &&
      (!q ||
        o.code.toLowerCase().includes(q) ||
        `${PLAN_MONTH_LABELS[o.ethiopianMonth]} ${o.yearGc}`.toLowerCase().includes(q) ||
        o.lines.some((l) => l.activityName.toLowerCase().includes(q) || l.blockCode?.toLowerCase().includes(q))),
  );
  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / pageSize));
  // Clamp rather than reset so an approve/activate that shrinks the list keeps you near where you were.
  const currentPage = Math.min(page, pageCount);
  const pagedOrders = visibleOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    if (canActivate(selected)) {
      return { label: "Activate — issue work orders", onClick: () => setActivateTargets([selected]) };
    }
    return null;
  })();

  const createFromPlan = (planId: string, months: PlanMonth[]) =>
    void fromPlanMut
      .mutateAsync({ id: planId, months })
      .then(({ created }) => {
        setCreateOpen(false);
        setCreatePlanId(null);
        setCreateMonths([]);
        const empty = months.length - created.length;
        toast.success(
          `Created ${created.length} monthly work order${created.length === 1 ? "" : "s"}` +
            (empty > 0 ? ` · ${empty} month${empty === 1 ? "" : "s"} had nothing scheduled` : ""),
        );
        setTabChoice("new");
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
      {planId ? (
        <>
          <PageHeader
            eyebrow={planGroup ? `${planGroup.farmName || "—"} · ${planGroup.orders.length} months` : "Plan"}
            title={planGroup?.name || (ordersQuery.isLoading ? "Loading…" : "No monthly work orders for this plan")}
            breadcrumbs={[
              { label: "Home", href: CROPFORT_ROUTES.dashboard },
              { label: "Monthly orders", href: CROPFORT_ROUTES.monthlyWorkOrders },
              { label: planGroup?.name || "Plan" },
            ]}
            actions={
              <Button size="sm" variant="outline" asChild>
                <Link href={CROPFORT_ROUTES.monthlyWorkOrders}>Back to list</Link>
              </Button>
            }
          />
          {planGroup ? (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <SectionCard>
                  <p className="text-xs text-muted-foreground">Total cost</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{fmtEtb(planGroup.total)}</p>
                </SectionCard>
                <SectionCard>
                  <p className="text-xs text-muted-foreground">Activities across months</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{planGroup.activities}</p>
                </SectionCard>
                <SectionCard>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {planGroup.statuses.map(([status, count]) => (
                      <StatusBadge key={status} status={status} label={`${count} ${status}`} />
                    ))}
                  </span>
                </SectionCard>
              </div>
              <SectionCard
                title="Monthly work orders"
                flush
                action={
                  <span className="flex flex-wrap gap-2">
                    {readyToSubmit.length > 1 ? (
                      <Button size="sm" variant="outline" disabled={bulkSubmitting} onClick={() => void submitAllMonths(readyToSubmit)}>
                        <Send className="mr-1 h-4 w-4" aria-hidden />
                        {bulkSubmitting ? "Submitting…" : `Submit all (${readyToSubmit.length})`}
                      </Button>
                    ) : null}
                    {canApprove && pendingApproval.length > 1 ? (
                      <Button size="sm" variant="outline" disabled={bulkApproving} onClick={() => void approveAll(pendingApproval)}>
                        <Check className="mr-1 h-4 w-4" aria-hidden />
                        Approve all ({pendingApproval.length})
                      </Button>
                    ) : null}
                    {readyToActivate.length > 1 ? (
                      <Button size="sm" disabled={activating} onClick={() => setActivateTargets(readyToActivate)}>
                        <Send className="mr-1 h-4 w-4" aria-hidden />
                        Activate all ({readyToActivate.length})
                      </Button>
                    ) : null}
                  </span>
                }
              >
                <OpsDeskControlPanel
                  className="rounded-none border-x-0 border-t-0"
                  search={query}
                  onSearchChange={(value) => {
                    setQuery(value);
                    setPage(1);
                  }}
                  searchPlaceholder="Search month, code, activity or block"
                  filters={
                    <OpsDeskFilterChips
                      value={rowFilter}
                      onChange={(id) => {
                        setRowFilter(id as RowFilter);
                        setPage(1);
                      }}
                      options={filterOptions}
                    />
                  }
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Activities</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Status</TableHead>
                      {canApprove || canEdit ? <TableHead className="text-right">Actions</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canApprove || canEdit ? 5 : 4} className="py-8 text-center text-sm text-muted-foreground">
                          No months match these filters.{" "}
                          <button
                            type="button"
                            className="font-medium text-primary hover:underline"
                            onClick={() => {
                              setQuery("");
                              setRowFilter("all");
                              setPage(1);
                            }}
                          >
                            Clear filters
                          </button>
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {pagedOrders.map((o) => (
                      <TableRow key={o.id} onClick={() => router.push(`${CROPFORT_ROUTES.monthlyWorkOrders}/${o.id}`)}>
                        <TableCell>
                          <span className="block font-medium">
                            {PLAN_MONTH_LABELS[o.ethiopianMonth]} {o.yearGc}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">{o.code}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {o.lines
                            .slice(0, 3)
                            .map((l) => l.activityName)
                            .join(", ")}
                          {o.lines.length > 3 ? ` +${o.lines.length - 3} more` : ""}
                          {o.lines.some((l) => !l.inPlan) ? (
                            <span className="ml-1.5 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                              Extra
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{fmtEtb(o.totalEtb)}</TableCell>
                        <TableCell>
                          <StatusBadge status={o.status} />
                        </TableCell>
                        {canApprove || canEdit ? (
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <span className="inline-flex gap-1.5">
                              {o.status === "submitted" && canApprove ? (
                                <>
                                  <Button size="sm" disabled={decideMut.isPending || bulkApproving} onClick={() => approve(o)}>
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setReturnTarget(o)}>
                                    Return
                                  </Button>
                                </>
                              ) : canActivate(o) ? (
                                <Button
                                  size="sm"
                                  disabled={activating}
                                  title="Issue this month's work orders to the vendor"
                                  onClick={() => setActivateTargets([o])}
                                >
                                  <Send className="mr-1 h-3.5 w-3.5" aria-hidden />
                                  Activate
                                </Button>
                              ) : null}
                            </span>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={currentPage}
                  pageCount={pageCount}
                  total={visibleOrders.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  pageSizeOptions={PAGE_SIZES}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </SectionCard>
            </>
          ) : null}
        </>
      ) : orderId ? (
        <>
      <PageHeader
        eyebrow={selected ? `${selected.code} · ${selected.farmName || "—"}` : "Monthly work order"}
        title={
          selected
            ? `${PLAN_MONTH_LABELS[selected.ethiopianMonth]} ${selected.yearGc}`
            : ordersQuery.isLoading
              ? "Loading…"
              : "Work order not found"
        }
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Monthly orders", href: CROPFORT_ROUTES.monthlyWorkOrders },
          ...(selected
            ? [
                {
                  label: planGroups.find((g) => g.key === (selected.sourcePlanId || "none"))?.name || "Plan",
                  href: planHref(selected.sourcePlanId || "none"),
                },
              ]
            : []),
          { label: selected?.code || "Order" },
        ]}
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href={selected ? planHref(selected.sourcePlanId || "none") : CROPFORT_ROUTES.monthlyWorkOrders}>
              Back to plan
            </Link>
          </Button>
        }
      />
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
                  <Button variant="outline" onClick={() => setReturnTarget(selected)}>
                    Return
                  </Button>
                ) : null}
                {editable && canEdit ? (
                  <Button variant="outline" onClick={() => setExtraOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" aria-hidden />
                    Add extra work
                  </Button>
                ) : null}
                {selected.status === "active" && canEdit && openMonthWorkOrders.length > 0 ? (
                  <Button disabled={submittingWos} onClick={() => setSubmitWosOpen(true)}>
                    <Send className="mr-1.5 h-4 w-4" aria-hidden />
                    Submit all work orders ({openMonthWorkOrders.length})
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
      ) : !ordersQuery.isLoading ? (
        <SectionCard>
          <p className="py-6 text-center text-sm text-muted-foreground">
            This monthly work order doesn&apos;t exist or isn&apos;t available to you.
          </p>
        </SectionCard>
      ) : null}

        </>
      ) : (
        <>
      <PageHeader
        title="Monthly orders"
        breadcrumbs={[{ label: "Home", href: CROPFORT_ROUTES.dashboard }, { label: "Monthly orders" }]}
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Create from plan
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Monthly work orders">
        {(
          [
            { id: "new", label: "New", count: byPlan(newOrders).length },
            { id: "active", label: "Active", count: byPlan(activeOrders).length },
          ] as const
        ).map((t) => {
          const active = listTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTabChoice(t.id)}
              className={cn(
                "cf-focus inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", active ? "bg-primary-foreground/20" : "bg-muted")}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {ordersQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (listTab === "new" ? newOrders : activeOrders).length === 0 ? (
        <SectionCard>
          <div className="py-10 text-center">
            <p className="font-medium">{listTab === "new" ? "No new monthly work orders" : "No active monthly work orders"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {listTab === "new"
                ? approvedPlans.length && canEdit
                  ? "Create them from an approved Core Operations plan — one per scheduled month."
                  : "Approved monthly work orders appear here, ready to activate."
                : "Monthly work orders move here once they're activated and their work orders are issued."}
            </p>
            {listTab === "new" && canEdit && approvedPlans.length ? (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 h-4 w-4" aria-hidden />
                Create from plan
              </Button>
            ) : null}
          </div>
        </SectionCard>
      ) : (
        <SectionCard flush>
          <Table containerClassName="cf-fit-table">
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden md:table-cell">Farm area</TableHead>
                <TableHead>Months</TableHead>
                <TableHead className="text-right">Activities</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byPlan(listTab === "new" ? newOrders : activeOrders).map((group) => {
                const first = group.orders[0];
                const last = group.orders[group.orders.length - 1];
                const toActivate = group.orders.filter(canActivate);
                return (
                  <TableRow key={group.key} onClick={() => router.push(planHref(group.key))}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{group.farmName || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {PLAN_MONTH_LABELS[first.ethiopianMonth]} {first.yearGc}
                      {group.orders.length > 1 ? ` – ${PLAN_MONTH_LABELS[last.ethiopianMonth]} ${last.yearGc}` : ""}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({group.orders.length} month{group.orders.length === 1 ? "" : "s"})
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{group.activities}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{fmtEtb(group.total)}</TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        {group.statuses.map(([status, count]) => (
                          <StatusBadge key={status} status={status} label={`${count} ${status}`} />
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {listTab === "new" && toActivate.length ? (
                        <Button size="sm" className="h-8" disabled={activating} onClick={() => setActivateTargets(toActivate)}>
                          <Send className="mr-1 h-3.5 w-3.5" aria-hidden />
                          {toActivate.length === 1 ? "Activate" : `Activate all (${toActivate.length})`}
                        </Button>
                      ) : listTab === "active" ? (
                        <Button size="sm" variant="outline" className="h-8" asChild>
                          <Link href={CROPFORT_ROUTES.workOrders}>Work orders</Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionCard>
      )}

        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create from an approved plan</DialogTitle>
          </DialogHeader>
          {approvedPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {(approvedPlansQuery.data || []).length ? "Every approved plan already has its work orders." : "No approved plans yet."}{" "}
              <Link href={CROPFORT_ROUTES.programmePlans} className="font-medium text-primary hover:underline">
                Open Core Operations plans
              </Link>
            </p>
          ) : (
            <>
              <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border">
                {approvedPlans.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatePlanId(p.id);
                        setCreateMonths([]);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                        createPlanId === p.id && "bg-primary/5 ring-1 ring-inset ring-primary/40",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.farmName} · {p.budgetYearLabel} · {fmtEtb(p.plannedCostEtb ?? 0)}
                        </span>
                      </span>
                      {createPlanId === p.id ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
                    </button>
                  </li>
                ))}
              </ul>
              {createPlan ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Months</Label>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        const open = PLAN_MONTHS.filter((m) => !monthsByPlan.get(createPlan.id)?.has(m));
                        setCreateMonths(createMonths.length === open.length ? [] : open);
                      }}
                    >
                      {createMonths.length &&
                      createMonths.length === PLAN_MONTHS.filter((m) => !monthsByPlan.get(createPlan.id)?.has(m)).length
                        ? "Clear"
                        : "Select all"}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                    {PLAN_MONTHS.map((m, i) => {
                      const taken = monthsByPlan.get(createPlan.id)?.has(m) ?? false;
                      const year = createPlan.budgetYearGc - (i <= 2 ? 1 : 0);
                      return (
                        <Button
                          key={m}
                          type="button"
                          size="sm"
                          variant={createMonths.includes(m) ? "default" : "outline"}
                          aria-pressed={createMonths.includes(m)}
                          disabled={taken}
                          title={taken ? "Already has a work order" : undefined}
                          className="h-auto flex-col py-1.5 leading-tight"
                          onClick={() =>
                            setCreateMonths((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))
                          }
                        >
                          <span>{PLAN_MONTH_LABELS[m]}</span>
                          <span className="text-[10px] opacity-70">{year}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!createPlan || !createMonths.length || fromPlanMut.isPending}
                  onClick={() => createPlan && createMonths.length && createFromPlan(createPlan.id, createMonths)}
                >
                  {fromPlanMut.isPending
                    ? "Creating…"
                    : createMonths.length === 1
                      ? `Create ${PLAN_MONTH_LABELS[createMonths[0]]} work order`
                      : createMonths.length
                        ? `Create ${createMonths.length} work orders`
                        : "Create"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(returnTarget)} onOpenChange={(open) => !open && setReturnTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return for changes{returnTarget ? ` · ${returnTarget.code}` : ""}</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
            placeholder="What needs to change?"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!returnNote.trim() || !returnTarget}
              onClick={() => {
                if (!returnTarget) return;
                const id = returnTarget.id;
                void run(
                  () => decideMut.mutateAsync({ id, decision: "return", comment: returnNote.trim() }),
                  "Returned",
                ).then(() => {
                  setReturnTarget(null);
                  setReturnNote("");
                });
              }}
            >
              Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(activateTargets)} onOpenChange={(open) => !open && !activating && setActivateTargets(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Issue work orders for {activateTargets?.length === 1 ? "this month" : `${activateTargets?.length ?? 0} months`}?
            </DialogTitle>
          </DialogHeader>
          <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-md border border-border text-sm">
            {activateTargets?.map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {PLAN_MONTH_LABELS[o.ethiopianMonth]} {o.yearGc}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {o.lines.length} activit{o.lines.length === 1 ? "y" : "ies"} · {o.code}
                  </span>
                </span>
                <span className="tabular-nums">{fmtEtb(o.totalEtb)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Total {fmtEtb(activateTargets?.reduce((sum, o) => sum + o.totalEtb, 0) ?? 0)}. Work orders are sent to the
            vendor; any that can&apos;t be issued yet are kept as drafts.
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={activating} onClick={() => setActivateTargets(null)}>
              Cancel
            </Button>
            <Button disabled={activating} onClick={() => activateTargets && void activateAll(activateTargets)}>
              <Send className="mr-1 h-4 w-4" aria-hidden />
              {activating ? "Issuing…" : "Activate — issue work orders"}
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
      <Dialog open={submitWosOpen} onOpenChange={(o) => !o && !submittingWos && setSubmitWosOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit all {openMonthWorkOrders.length} work orders for this month?</DialogTitle>
          </DialogHeader>
          <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border text-sm">
            {openMonthWorkOrders.map((wo) => (
              <li key={wo.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{wo.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {wo.code} · {wo.block}
                  </span>
                </span>
                <span className="tabular-nums">{fmtEtb(wo.etb)}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">Submitting marks the work as done.</p>
          <DialogFooter>
            <Button variant="outline" disabled={submittingWos} onClick={() => setSubmitWosOpen(false)}>
              Cancel
            </Button>
            <Button disabled={submittingWos} onClick={() => void submitMonthWorkOrders()}>
              <Send className="mr-1.5 h-4 w-4" aria-hidden />
              {submittingWos ? "Submitting…" : "Submit all"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
