"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, Eye, Search, Send, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { isSpxDesk } from "@/lib/cropfort/platform-access";
import { cn } from "@/lib/utils";
import {
  mapWorkOrderDto,
  useReportWorkOrderOutcome,
  useReviewWorkOrder,
  useTransitionWorkOrder,
  useWorkOrders,
} from "@/lib/query/hooks/use-work-orders";
import { Textarea } from "@/components/ui/textarea";
import { useMonthlyWorkOrders } from "@/lib/query/hooks/use-monthly-work-orders";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { PLAN_MONTHS, PLAN_MONTH_LABELS } from "@/lib/cropfort/ethiopian-year";
import { fmtEtb, type WoStatus, type WorkOrder } from "@/store/cropfortOpsStore";

/** Steps a work order still has to go through to be submitted (complete). */
const PATH_TO_SUBMITTED: Record<WoStatus, WoStatus[]> = {
  draft: ["issued", "in_progress", "complete"],
  issued: ["in_progress", "complete"],
  in_progress: ["complete"],
  complete: [],
};

/** Runs one action per work order in parallel; failures are collected rather than stopping the rest. */
async function runAll(items: WorkOrder[], action: (wo: WorkOrder) => Promise<unknown>, fallback: string) {
  const results = await Promise.allSettled(items.map(action));
  const failed = results.flatMap((r, i) =>
    r.status === "rejected" ? [`${items[i].code}: ${r.reason instanceof Error ? r.reason.message : fallback}`] : [],
  );
  return { done: items.length - failed.length, failed };
}

const canSubmit = (wo: WorkOrder) => wo.status === "issued" || wo.status === "in_progress";

/**
 * Work orders, as issued from monthly work orders. One table, no detail page and no tickets:
 * each work order is simply submitted once the work is done — one at a time or all together.
 */
export default function WorkOrdersView({ planKey }: { planKey?: string } = {}) {
  const { user, activeProgram } = useCropfortAuth();
  const router = useRouter();
  const canAct = isSpxDesk(user.role) || user.role === "field_supervisor";
  // Vendors report on the orders issued to them: done, or not done with a reason
  const isVendor = user.role === "bagro_office";
  const showActions = canAct || isVendor;
  const reportOutcome = useReportWorkOrderOutcome();
  const [notDoneFor, setNotDoneFor] = useState<WorkOrder | null>(null);
  const [notDoneNote, setNotDoneNote] = useState("");
  const woQuery = useWorkOrders(Boolean(activeProgram?.id));
  const transitionWo = useTransitionWorkOrder();
  const reviewWo = useReviewWorkOrder();
  const [returnFor, setReturnFor] = useState<WorkOrder[] | null>(null);
  const [returnNote, setReturnNote] = useState("");

  const orders = useMemo(() => (woQuery.data || []).map(mapWorkOrderDto), [woQuery.data]);

  const [month, setMonth] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirm, setConfirm] = useState<WorkOrder[] | null>(null);
  const [busy, setBusy] = useState(false);
  // To do = still open; Sent for review = vendor marked done, SPX to verify; Approved = SPX approved
  const [view, setView] = useState<"todo" | "review" | "approved">(() => {
    if (typeof window === "undefined") return "todo";
    const v = new URLSearchParams(window.location.search).get("view");
    if (v === "review" || v === "approved") return v;
    return "todo";
  });

  // Active monthly work orders: the months whose work orders have been issued
  const monthlyQuery = useMonthlyWorkOrders(Boolean(activeProgram?.id));
  const activeMonthlies = useMemo(
    () =>
      (monthlyQuery.data || [])
        .filter((m) => m.status === "active")
        .sort(
          (a, b) =>
            a.yearGc * 12 + PLAN_MONTHS.indexOf(a.ethiopianMonth) - (b.yearGc * 12 + PLAN_MONTHS.indexOf(b.ethiopianMonth)),
        ),
    [monthlyQuery.data],
  );
  const monthName = (m: { ethiopianMonth: (typeof PLAN_MONTHS)[number]; yearGc: number }) =>
    `${PLAN_MONTH_LABELS[m.ethiopianMonth]} ${m.yearGc}`;
  const months = useMemo(() => {
    const known = activeMonthlies.map((m) => ({ code: m.code, label: `${monthName(m)} · ${m.code}` }));
    const extra = [...new Set(orders.map((o) => o.monthlyWoCode).filter((c): c is string => Boolean(c)))]
      .filter((c) => !known.some((k) => k.code === c))
      .map((c) => ({ code: c, label: c }));
    return [...known, ...extra];
  }, [activeMonthlies, orders]);

  const inMonth = orders.filter((o) => month === "all" || o.monthlyWoCode === month);
  const q = query.trim().toLowerCase();
  // Work still to do: issued orders to submit, plus orders activation couldn't issue yet
  const rows = inMonth.filter(
    (o) =>
      (view === "review"
        ? o.status === "complete" && !o.spxApproved
        : view === "approved"
          ? o.spxApproved
          : canSubmit(o) || (canAct && o.status === "draft")) &&
      (!q || `${o.title} ${o.code} ${o.block} ${o.farm} ${o.vendor}`.toLowerCase().includes(q)),
  );
  const notIssued = rows.filter((o) => o.status === "draft");

  const plansQuery = useProgrammePlans(Boolean(activeProgram?.id), {});
  const planNames = new Map((plansQuery.data || []).map((p) => [p.id, p.name] as const));
  const monthlyByCode = new Map((monthlyQuery.data || []).map((m) => [m.code, m] as const));
  const planGroups = (() => {
    type Merged = {
      key: string;
      activity: string;
      wos: WorkOrder[];
      open: WorkOrder[];
      drafts: WorkOrder[];
      cost: number;
      monthKeys: Map<number, string>;
    };
    const groups = new Map<string, { key: string; name: string; farm: string; byActivity: Map<string, Merged> }>();
    for (const wo of rows) {
      const monthly = wo.monthlyWoCode ? monthlyByCode.get(wo.monthlyWoCode) : undefined;
      const planKey = monthly?.sourcePlanId || "none";
      const group =
        groups.get(planKey) ??
        {
          key: planKey,
          name: planKey === "none" ? "Other work orders" : planNames.get(planKey) || "Core Operations plan",
          farm: wo.farm,
          byActivity: new Map<string, Merged>(),
        };
      groups.set(planKey, group);
      const activity = wo.activity || wo.title.split(" · ")[0];
      const merged =
        group.byActivity.get(activity) ??
        { key: `${planKey}:${activity}`, activity, wos: [], open: [], drafts: [], cost: 0, monthKeys: new Map() };
      group.byActivity.set(activity, merged);
      merged.wos.push(wo);
      if (canSubmit(wo)) merged.open.push(wo);
      if (wo.status === "draft") merged.drafts.push(wo);
      merged.cost += wo.etb || 0;
      if (monthly) merged.monthKeys.set(monthly.yearGc * 12 + PLAN_MONTHS.indexOf(monthly.ethiopianMonth), monthName(monthly));
    }
    return [...groups.values()].map((g) => {
      const activities = [...g.byActivity.values()].map((a) => ({
        ...a,
        months: [...a.monthKeys.entries()].sort((x, y) => x[0] - y[0]).map(([, label]) => label),
      }));
      const monthKeys = new Map<number, string>();
      for (const a of activities) for (const [k, label] of a.monthKeys) monthKeys.set(k, label);
      const ordered = [...monthKeys.entries()].sort((x, y) => x[0] - y[0]).map(([, label]) => label);
      return {
        key: g.key,
        name: g.name,
        farm: g.farm,
        activities,
        cost: activities.reduce((sum, a) => sum + a.cost, 0),
        open: activities.flatMap((a) => a.open),
        drafts: activities.flatMap((a) => a.drafts),
        all: activities.flatMap((a) => a.wos),
        count: activities.reduce((sum, a) => sum + a.wos.length, 0),
        monthRange: ordered.length > 1 ? `${ordered[0]} – ${ordered[ordered.length - 1]}` : ordered[0] ?? "",
      };
    });
  })();
  // Approved months that were never activated have no work orders yet
  const waitingToActivate = (monthlyQuery.data || []).filter((m) => m.status === "approved").length;

  /** Issues draft work orders to their vendor. */
  const issue = async (items: WorkOrder[]) => {
    setBusy(true);
    const { done, failed } = await runAll(
      items,
      (wo) => transitionWo.mutateAsync({ id: wo.id, status: "issued" }),
      "could not issue",
    );
    setBusy(false);
    if (done) toast.success(`Issued ${done} work order${done === 1 ? "" : "s"} to the vendor`);
    if (failed.length) toast.error(failed.join("\n"), { duration: 10000 });
  };
  const submittable = rows.filter(canSubmit);
  const selectedRows = submittable.filter((o) => selected.has(o.id));
  const allSelected = submittable.length > 0 && selectedRows.length === submittable.length;

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  /** Moves each work order through the remaining steps to submitted, one after another. */
  const submit = async (items: WorkOrder[]) => {
    // The list updates straight away, so the dialog can close before the server answers
    setConfirm(null);
    setSelected(new Set());
    setBusy(true);
    const { done, failed } = await runAll(
      items,
      async (wo) => {
        for (const status of PATH_TO_SUBMITTED[wo.status]) {
          await transitionWo.mutateAsync({ id: wo.id, status });
        }
      },
      "failed",
    );
    setBusy(false);
    if (done) toast.success(`Submitted ${done} work order${done === 1 ? "" : "s"}`);
    if (failed.length) toast.error(failed.join("\n"));
  };

  const totalOf = (items: WorkOrder[]) => items.reduce((sum, o) => sum + (o.etb || 0), 0);

  const markDone = async (items: WorkOrder[]) => {
    setConfirm(null);
    setBusy(true);
    const { done, failed } = await runAll(
      items,
      (wo) => reportOutcome.mutateAsync({ id: wo.id, outcome: "done" }),
      "failed",
    );
    setBusy(false);
    if (done) toast.success(`Marked ${done} work order${done === 1 ? "" : "s"} as done`);
    if (failed.length) toast.error(failed.join("\n"));
  };

  const approveWorkOrders = async (items: WorkOrder[]) => {
    setConfirm(null);
    setBusy(true);
    const { done, failed } = await runAll(
      items,
      (wo) => reviewWo.mutateAsync({ id: wo.id, decision: "approve" }),
      "failed",
    );
    setBusy(false);
    if (done) toast.success(`Approved ${done} work order${done === 1 ? "" : "s"}`);
    if (failed.length) toast.error(failed.join("\n"));
  };

  const returnWorkOrders = async () => {
    if (!returnFor?.length || !returnNote.trim()) return;
    const items = returnFor;
    const comment = returnNote.trim();
    setReturnFor(null);
    setReturnNote("");
    setBusy(true);
    const { done, failed } = await runAll(
      items,
      (wo) => reviewWo.mutateAsync({ id: wo.id, decision: "return", comment }),
      "failed",
    );
    setBusy(false);
    if (done) toast.success(`Returned ${done} work order${done === 1 ? "" : "s"} to the vendor`);
    if (failed.length) toast.error(failed.join("\n"));
  };

  const markNotDone = async () => {
    if (!notDoneFor || !notDoneNote.trim()) return;
    const wo = notDoneFor;
    const note = notDoneNote.trim();
    setNotDoneFor(null);
    setNotDoneNote("");
    setBusy(true);
    try {
      await reportOutcome.mutateAsync({ id: wo.id, outcome: "not_done", note });
      toast.success(`${wo.code} marked as not done`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const detailHref = (key: string) =>
    `${CROPFORT_ROUTES.workOrders}/plan/${encodeURIComponent(key)}${view !== "todo" ? `?view=${view}` : ""}`;
  /** First part of the instructions is the quantity ("12 ha"); the rest is guidance. */
  const qtyOf = (wo: WorkOrder) => {
    const first = (wo.manualsRef || "").split(" · ")[0] ?? "";
    return first && !first.startsWith("From ") ? first : "—";
  };

  function PlanDetail() {
    const plan = planGroups.find((p) => p.key === planKey);
    if (!plan) {
      return (
        <>
          <PageHeader
            title="Work orders"
            breadcrumbs={[{ label: "Home", href: CROPFORT_ROUTES.dashboard }, { label: "Work orders", href: CROPFORT_ROUTES.workOrders }]}
          />
          <SectionCard>
            <p className="py-8 text-center text-sm text-muted-foreground">
              {woQuery.isLoading ? "Loading work orders…" : "Nothing left to do for this plan."}{" "}
              <Link href={CROPFORT_ROUTES.workOrders} className="font-medium text-primary hover:underline">
                Back to work orders
              </Link>
            </p>
          </SectionCard>
        </>
      );
    }
    return (
      <>
        <PageHeader
          title={plan.name}
          breadcrumbs={[
            { label: "Home", href: CROPFORT_ROUTES.dashboard },
            { label: "Work orders", href: CROPFORT_ROUTES.workOrders },
            { label: plan.name },
          ]}
          actions={
            canAct && view === "review" ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={busy} onClick={() => setReturnFor(plan.all)}>
                  Return
                </Button>
                <Button disabled={busy} onClick={() => setConfirm(plan.all)}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
                  Approve all ({plan.all.length})
                </Button>
              </div>
            ) : canAct && view === "todo" ? (
              <div className="flex flex-wrap gap-2">
                {plan.drafts.length ? (
                  <Button variant="outline" disabled={busy} onClick={() => void issue(plan.drafts)}>
                    Issue all ({plan.drafts.length})
                  </Button>
                ) : null}
                {plan.open.length ? (
                  <Button disabled={busy} onClick={() => setConfirm(plan.open)}>
                    <Send className="mr-1.5 h-4 w-4" aria-hidden />
                    Submit all ({plan.open.length})
                  </Button>
                ) : null}
              </div>
            ) : null
          }
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Farm area", value: plan.farm },
            { label: "Months", value: plan.monthRange || "—" },
            { label: "Activities · work orders", value: `${plan.activities.length} · ${plan.count}` },
            { label: "Cost", value: fmtEtb(plan.cost) },
          ].map((t) => (
            <SectionCard key={t.label}>
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className="mt-1 truncate text-lg font-semibold tabular-nums">{t.value}</p>
            </SectionCard>
          ))}
        </div>

        {plan.activities.map((a) => (
          <SectionCard
            key={a.key}
            title={a.activity}
            description={[a.months.join(", "), fmtEtb(a.cost)]
              .filter(Boolean)
              .join(" · ")}
            action={
              canAct ? (
                <span className="inline-flex gap-1.5">
                  {a.drafts.length ? (
                    <Button size="sm" className="h-8" disabled={busy} onClick={() => void issue(a.drafts)}>
                      Issue ({a.drafts.length})
                    </Button>
                  ) : null}
                  {a.open.length ? (
                    <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => setConfirm(a.open)}>
                      Submit ({a.open.length})
                    </Button>
                  ) : null}
                </span>
              ) : null
            }
            flush
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work order</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="hidden md:table-cell">Vendor</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                  {showActions ? (
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {a.wos.map((wo) => {
                  const monthly = wo.monthlyWoCode ? monthlyByCode.get(wo.monthlyWoCode) : undefined;
                  const open = canSubmit(wo);
                  return (
                    <TableRow key={wo.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{wo.code}</TableCell>
                      <TableCell className="text-sm">{monthly ? monthName(monthly) : "—"}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{qtyOf(wo)}</TableCell>
                      <TableCell className="hidden text-sm md:table-cell">{wo.vendor}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{fmtEtb(wo.etb)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            open
                              ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {wo.spxApproved
                            ? "Approved"
                            : wo.status === "complete"
                              ? wo.vendorOutcome === "partial"
                                ? "Sent for review · partly done"
                                : "Sent for review"
                              : open
                                ? wo.vendorOutcome === "not_done"
                                  ? "Not done"
                                  : wo.vendorOutcome === "returned"
                                    ? "Returned"
                                    : "To do"
                                : "Not issued"}
                        </span>
                        {(wo.vendorOutcome === "not_done" || wo.vendorOutcome === "returned") && wo.vendorNote && !wo.spxApproved ? (
                          <span className="mt-0.5 block max-w-[16rem] truncate text-[11px] text-muted-foreground" title={wo.vendorNote}>
                            {wo.vendorNote}
                          </span>
                        ) : null}
                      </TableCell>
                      {view === "review" && canAct ? (
                        <TableCell className="text-right">
                          <Button size="sm" className="h-8" asChild>
                            <Link href={`${CROPFORT_ROUTES.workOrders}/${wo.id}/review`}>
                              <Eye className="mr-1 h-3.5 w-3.5" aria-hidden />
                              Review
                            </Link>
                          </Button>
                        </TableCell>
                      ) : view !== "todo" ? (
                        showActions ? <TableCell /> : null
                      ) : isVendor && !canAct ? (
                        <TableCell className="text-right">
                          {open ? (
                            <span className="inline-flex gap-1.5">
                              <Button size="sm" variant="ghost" className="h-8" disabled={busy} onClick={() => setNotDoneFor(wo)}>
                                Not done
                              </Button>
                              <Button size="sm" className="h-8" asChild>
                                <Link href={`${CROPFORT_ROUTES.workOrders}/${wo.id}/complete`}>
                                  {wo.vendorOutcome === "returned" ? "Fix & resend" : "Report done"}
                                </Link>
                              </Button>
                            </span>
                          ) : null}
                        </TableCell>
                      ) : canAct ? (
                        <TableCell className="text-right">
                          {open ? (
                            <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => setConfirm([wo])}>
                              Submit
                            </Button>
                          ) : (
                            <Button size="sm" className="h-8" disabled={busy} onClick={() => void issue([wo])}>
                              Issue
                            </Button>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </SectionCard>
        ))}
      </>
    );
  }

  return (
    <PageContainer>
      {planKey ? (
        <PlanDetail />
      ) : (
        <>
      <PageHeader
        title="Work orders"
        breadcrumbs={[{ label: "Home", href: CROPFORT_ROUTES.dashboard }, { label: "Work orders" }]}
        actions={
          view === "review" ? (
            canAct && rows.length ? (
              <Button disabled={busy} onClick={() => setConfirm(rows)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
                Approve all ({rows.length})
              </Button>
            ) : null
          ) : view === "approved" ? null : canAct && (submittable.length > 0 || notIssued.length > 0) ? (
            <div className="flex flex-wrap gap-2">
              {notIssued.length ? (
                <Button variant="outline" disabled={busy} onClick={() => void issue(notIssued)}>
                  Issue all ({notIssued.length})
                </Button>
              ) : null}
              {submittable.length ? (
                <Button disabled={busy} onClick={() => setConfirm(selectedRows.length ? selectedRows : submittable)}>
              <Send className="mr-1.5 h-4 w-4" aria-hidden />
              {selectedRows.length ? `Submit selected (${selectedRows.length})` : `Submit all (${submittable.length})`}
            </Button>
              ) : null}
            </div>
          ) : null
        }
      />

      {woQuery.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {woQuery.error instanceof Error ? woQuery.error.message : "Couldn't load work orders"}
        </p>
      ) : null}

      {canAct && notIssued.length ? (
        <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] px-4 py-3 text-sm">
          <span className="min-w-0 flex-1">
            <span className="font-semibold">
              {notIssued.length} work order{notIssued.length === 1 ? "" : "s"} not issued to the vendor yet.
            </span>{" "}
            <span className="text-muted-foreground">Press Issue to send them to the vendor.</span>
          </span>
          {canAct ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void issue(notIssued)}>
              Issue all ({notIssued.length})
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Show">
        {(
          [
            { id: "todo", label: "To do", count: inMonth.filter((o) => canSubmit(o) || (canAct && o.status === "draft")).length },
            { id: "review", label: "Sent for review", count: inMonth.filter((o) => o.status === "complete" && !o.spxApproved).length },
            { id: "approved", label: "Approved", count: inMonth.filter((o) => o.spxApproved).length },
          ] as const
        ).map((t) => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setView(t.id);
                setSelected(new Set());
              }}
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

      <SectionCard flush>
        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
            <Select
              value={month}
              onValueChange={(v) => {
                setMonth(v);
                setSelected(new Set());
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-xl sm:w-[16rem]" aria-label="Month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m.code} value={m.code}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search activity or vendor"
                className="h-10 rounded-xl pl-9"
                aria-label="Search work orders"
              />
            </div>
          </div>
        </div>

        <Table containerClassName="cf-fit-table">
          <TableHeader>
            <TableRow>
              {canAct ? (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ? true : selectedRows.length ? "indeterminate" : false}
                    disabled={submittable.length === 0 || busy}
                    aria-label="Select all to submit"
                    onCheckedChange={(v) => setSelected(v ? new Set(submittable.map((o) => o.id)) : new Set())}
                  />
                </TableHead>
              ) : null}
              <TableHead>Activity</TableHead>
              <TableHead className="hidden md:table-cell">Months</TableHead>
              <TableHead className="text-right">Work orders</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              {showActions ? (
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {woQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Loading work orders…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-14">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
                      {orders.length ? <CheckCircle2 className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
                    </span>
                    <p className="text-sm font-semibold">
                      {orders.length === 0
                        ? "No work orders yet"
                        : view === "review" && !q
                          ? "No work orders pending review"
                          : view === "approved" && !q
                            ? "No approved work orders yet"
                            : !q
                              ? "Nothing left to submit"
                              : "No work orders match"}
                    </p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                      {orders.length === 0 ? (
                        <>
                          {waitingToActivate
                            ? `${waitingToActivate} approved monthly work order${waitingToActivate === 1 ? " is" : "s are"} waiting — press Activate on Monthly Work Orders to create and issue the work orders.`
                            : "Work orders appear here when a monthly work order is activated."}{" "}
                          <Link href={CROPFORT_ROUTES.monthlyWorkOrders} className="font-medium text-primary hover:underline">
                            Open monthly work orders
                          </Link>
                        </>
                      ) : !q ? (
                        "Every work order in this view has been submitted."
                      ) : (
                        "Try another month or search word."
                      )}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              planGroups.map((plan) => (
                <Fragment key={plan.key}>
                  <TableRow className="cursor-pointer" onClick={() => router.push(detailHref(plan.key))}>
                    {canAct ? (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={
                            plan.open.length && plan.open.every((o) => selected.has(o.id))
                              ? true
                              : plan.open.some((o) => selected.has(o.id))
                                ? "indeterminate"
                                : false
                          }
                          disabled={!plan.open.length || busy}
                          aria-label={`Select ${plan.name}`}
                          onCheckedChange={(v) => {
                            for (const o of plan.open) toggle(o.id, Boolean(v));
                          }}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="py-3">
                      <Link
                        href={detailHref(plan.key)}
                        className="block rounded-sm font-semibold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {plan.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {plan.farm} · {plan.activities.length} activit{plan.activities.length === 1 ? "y" : "ies"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{plan.monthRange || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {plan.count}
                      {plan.drafts.length ? (
                        <span className="block text-[11px] font-medium text-amber-700 dark:text-amber-400">
                          {plan.drafts.length} not issued
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmtEtb(plan.cost)}</TableCell>
                    {view === "review" ? (
                      showActions ? (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {canAct ? (
                            <span className="inline-flex gap-1.5">
                              <Button size="sm" variant="ghost" className="h-8" disabled={busy} onClick={() => setReturnFor(plan.all)}>
                                Return
                              </Button>
                              <Button size="sm" className="h-8" disabled={busy} onClick={() => setConfirm(plan.all)}>
                                Approve ({plan.all.length})
                              </Button>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Waiting for SPX</span>
                          )}
                        </TableCell>
                      ) : null
                    ) : view === "approved" ? (
                      showActions ? (
                        <TableCell className="text-right">
                          <CheckCircle2 className="ml-auto h-4 w-4 text-primary" aria-label="Approved" />
                        </TableCell>
                      ) : null
                    ) : isVendor && !canAct ? (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {plan.open.length ? (
                          <Button size="sm" className="h-8" asChild>
                            <Link href={detailHref(plan.key)}>Report work ({plan.open.length})</Link>
                          </Button>
                        ) : null}
                      </TableCell>
                    ) : canAct ? (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex gap-1.5">
                          {plan.drafts.length ? (
                            <Button size="sm" className="h-8" disabled={busy} onClick={() => void issue(plan.drafts)}>
                              Issue ({plan.drafts.length})
                            </Button>
                          ) : null}
                          {plan.open.length ? (
                            <Button size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => setConfirm(plan.open)}>
                              Submit ({plan.open.length})
                            </Button>
                          ) : null}
                        </span>
                      </TableCell>
                    ) : null}
                  </TableRow>
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>

        </>
      )}

      <Dialog open={Boolean(returnFor)} onOpenChange={(o) => !o && !busy && setReturnFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Return {returnFor?.length === 1 ? returnFor[0].code : `${returnFor?.length ?? 0} work orders`} to the vendor
            </DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
            placeholder="What must the vendor fix? e.g. weeding incomplete on the lower block"
            aria-label="What to fix"
          />
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setReturnFor(null)}>
              Cancel
            </Button>
            <Button disabled={busy || !returnNote.trim()} onClick={() => void returnWorkOrders()}>
              {busy ? "Returning…" : "Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(notDoneFor)} onOpenChange={(o) => !o && !busy && setNotDoneFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Not done — {notDoneFor?.title}</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            value={notDoneNote}
            onChange={(e) => setNotDoneNote(e.target.value)}
            placeholder="Why wasn't it done? e.g. heavy rain, no access to the block"
            aria-label="Reason"
          />
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setNotDoneFor(null)}>
              Cancel
            </Button>
            <Button disabled={busy || !notDoneNote.trim()} onClick={() => void markNotDone()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirm)} onOpenChange={(o) => !o && !busy && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {view === "review"
                ? confirm?.length === 1
                  ? "Approve this work order?"
                  : `Approve ${confirm?.length ?? 0} work orders?`
                : isVendor && !canAct
                ? confirm?.length === 1
                  ? "Mark this work order as done?"
                  : `Mark ${confirm?.length ?? 0} work orders as done?`
                : confirm?.length === 1
                  ? "Submit this work order?"
                  : `Submit ${confirm?.length ?? 0} work orders?`}
            </DialogTitle>
          </DialogHeader>
          <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border text-sm">
            {confirm?.map((wo) => (
              <li key={wo.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{wo.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {wo.code}
                  </span>
                </span>
                <span className="tabular-nums">{fmtEtb(wo.etb)}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Total <span className="font-semibold text-foreground">{fmtEtb(totalOf(confirm ?? []))}</span>.{" "}
            {view === "review" ? "Approving confirms the vendor's work is verified." : "Submitting marks the work as done."}
          </p>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                confirm &&
                void (view === "review" ? approveWorkOrders(confirm) : isVendor && !canAct ? markDone(confirm) : submit(confirm))
              }
            >
              <Send className="mr-1.5 h-4 w-4" aria-hidden />
              {busy ? "Saving…" : view === "review" ? "Approve" : isVendor && !canAct ? "Mark as done" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
