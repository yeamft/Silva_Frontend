"use client";

import { useActiveFarmId } from "@/store/farmWorkspaceStore";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardList, MoreHorizontal, Plus, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import {
  TableMessageRow,
  TablePagination,
  TableSkeleton,
} from "@/components/cropfort/data-table";
import {
  PageContainer,
  PageHeader,
  SectionCard,
} from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { isAnnualPeriod, monthsForPeriod, monthsLabel } from "@/lib/cropfort/plan-period";
import { canCreateProgrammePlan } from "@/lib/cropfort/platform-access";
import { fmtEtb } from "@/store/cropfortOpsStore";
import {
  useArchiveProgrammePlan,
  useDuplicateProgrammePlan,
  useProgrammePlans,
  useSubmitProgrammePlanMutation,
  useCreateWorkOrdersFromPlan,
} from "@/lib/query/hooks/use-programme-plans";
import { listFarms } from "@/lib/api/benchmark-surveys";
import { useQuery } from "@tanstack/react-query";
import type { ProgrammePlanDto } from "@/lib/api/programme-plans";

const PAGE_SIZES = [10, 25, 50];

type StatusFilter = "all" | "draft" | "submitted" | "returned" | "approved";

const STATUS_TABS: { id: StatusFilter; label: string; match: (raw?: string) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "draft", label: "Draft", match: (r) => !r || r === "draft" || r === "ready_for_review" },
  { id: "submitted", label: "Pending", match: (r) => r === "submitted" },
  { id: "approved", label: "Approved", match: (r) => r === "approved" || r === "active" },
];

function statusLabel(raw?: string) {
  if (!raw) return "draft";
  return raw.replace(/_/g, " ");
}

const NEW_PLAN_HREF = `${CROPFORT_ROUTES.programmePlans}/new`;

function planHref(id: string) {
  return `${CROPFORT_ROUTES.programmePlans}/${id}`;
}

export default function ProgrammePlansRegisterView({
  archiveMode = false,
}: {
  archiveMode?: boolean;
}) {
  const { activeProgram, user } = useCropfortAuth();
  const router = useRouter();
  const canCreate = canCreateProgrammePlan(user.role) && !archiveMode;
  const canDuplicate = canCreateProgrammePlan(user.role);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [farmFilter, setFarmFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [archiveTarget, setArchiveTarget] = useState<ProgrammePlanDto | null>(null);

  const farmsQuery = useQuery({
    queryKey: ["farms", "programme-register", activeProgram?.id],
    queryFn: () => listFarms(),
    enabled: Boolean(activeProgram?.id),
  });
  const farms = farmsQuery.data || [];
  const workspaceFarmId = useActiveFarmId();

  const plansQuery = useProgrammePlans(Boolean(activeProgram?.id), {
    status: archiveMode ? "archived" : undefined,
    includeArchived: archiveMode,
    farmEstateId: farmFilter !== "all" ? farmFilter : undefined,
    planYear: yearFilter !== "all" ? Number(yearFilter) : undefined,
  });
  // Returned plans live on their own "Returned to fix" page
  const allPlans = useMemo(() => (plansQuery.data || []).filter((p) => p.statusRaw !== "returned"), [plansQuery.data]);
  const returnedCount = (plansQuery.data || []).filter((p) => p.statusRaw === "returned").length;
  const duplicateMut = useDuplicateProgrammePlan();
  const archiveMut = useArchiveProgrammePlan();
  const submitMut = useSubmitProgrammePlanMutation();
  const workOrdersMut = useCreateWorkOrdersFromPlan();

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const p of allPlans) set.add(p.budgetYearGc);
    const y = new Date().getFullYear();
    for (let i = y - 1; i <= y + 2; i++) set.add(i);
    return [...set].sort((a, b) => b - a);
  }, [allPlans]);

  const plans = useMemo(() => {
    if (archiveMode) return allPlans;
    if (statusFilter === "all") return allPlans;
    if (statusFilter === "draft") {
      return allPlans.filter(
        (p) => p.statusRaw === "draft" || p.statusRaw === "ready_for_review",
      );
    }
    if (statusFilter === "approved") {
      return allPlans.filter((p) => p.statusRaw === "approved" || p.statusRaw === "active");
    }
    return allPlans.filter((p) => p.statusRaw === statusFilter);
  }, [allPlans, statusFilter, archiveMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plans.filter((p) => {
      if (!q) return true;
      const hay = `${p.name} ${p.code} ${p.farmName} ${p.budgetYearLabel} ${p.planningCycleLabel}`.toLowerCase();
      return hay.includes(q);
    });
  }, [plans, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasActiveFilters =
    Boolean(query.trim()) ||
    farmFilter !== "all" ||
    yearFilter !== "all" ||
    (!archiveMode && statusFilter !== "all");

  const canEditRow = (p: ProgrammePlanDto) =>
    canCreate &&
    (p.statusRaw === "draft" ||
      p.statusRaw === "returned" ||
      p.statusRaw === "ready_for_review");

  /** The one obvious next step for a plan, shown as the row's button. */
  const nextActionFor = (
    p: ProgrammePlanDto,
  ): { label: string; href?: string; onClick?: () => void; primary: boolean; disabled?: boolean } | null => {
    if (archiveMode) return null;
    if (p.statusRaw === "returned" && canEditRow(p))
      return { label: "Fix", href: `${planHref(p.id)}/fix`, primary: true };
    if (canEditRow(p)) return { label: "Continue", primary: true };
    if (p.statusRaw === "submitted") return { label: "View approval", href: CROPFORT_ROUTES.approvals, primary: false };
    if (canCreate && (p.statusRaw === "approved" || p.statusRaw === "active"))
      return {
        label: "Work orders",
        primary: false,
        disabled: workOrdersMut.isPending,
        onClick: () =>
          void workOrdersMut
            .mutateAsync({ id: p.id })
            .then(({ created, skipped }) => {
              if (!created.length) {
                toast.info(
                  skipped.length
                    ? "Work orders already exist for every scheduled month"
                    : "No scheduled activities to turn into work orders",
                );
                return;
              }
              toast.success(`Created ${created.length} monthly work order${created.length === 1 ? "" : "s"}`, {
                action: { label: "Open", onClick: () => router.push(CROPFORT_ROUTES.monthlyWorkOrders) },
              });
            })
            .catch((e) => toast.error(e instanceof Error ? e.message : "Could not create work orders")),
      };
    return { label: "Open", primary: false };
  };

  const renderTable = (list: ProgrammePlanDto[]) => (
          <div className="cf-table-scroll">
            <Table aria-label={archiveMode ? "Archived plans" : "Plans"}>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead className="hidden md:table-cell">Scheduled</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plansQuery.isLoading ? (
                  <TableSkeleton rows={5} columns={5} />
                ) : list.length === 0 ? (
                  <TableMessageRow
                    colSpan={5}
                    icon={ClipboardList}
                    title={
                      !hasActiveFilters
                        ? archiveMode
                          ? "No archived plans"
                          : "No plans"
                        : "No results"
                    }
                    description={
                      !hasActiveFilters
                        ? archiveMode
                          ? "Archived plans will appear here."
                          : "Create a Core Operations plan to start planning work for a farm area."
                        : "Try changing your search or filters."
                    }
                    action={
                      !hasActiveFilters && canCreate ? (
                        <Button size="sm" asChild>
                          <Link href={NEW_PLAN_HREF}>
                            <Plus className="h-3.5 w-3.5" />
                            New Core Operations plan
                          </Link>
                        </Button>
                      ) : hasActiveFilters ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setQuery("");
                            setStatusFilter("all");
                            setFarmFilter("all");
                            setYearFilter("all");
                            setPage(1);
                          }}
                        >
                          Clear filters
                        </Button>
                      ) : null
                    }
                  />
                ) : (
                  list.map((row) => {
                    const included = row.includedCount ?? 0;
                    const scheduled = row.scheduledCount ?? 0;
                    return (
                      <TableRow
                        key={row.id}
                        onClick={(event) => {
                          const target = event.target as HTMLElement;
                          // Let links and menu actions handle their own navigation.
                          if (
                            event.defaultPrevented ||
                            !event.currentTarget.contains(target) ||
                            target.closest("a, button, [role='menuitem']")
                          ) return;
                          router.push(planHref(row.id));
                        }}
                      >
                        <TableCell className="h-auto min-w-[240px] py-3.5">
                          <Link
                            href={planHref(row.id)}
                            aria-label={`Open ${row.name || "untitled Core Operations plan"}`}
                            className="block truncate rounded-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {row.name || "Untitled plan"}
                          </Link>
                          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/80">{row.farmName || "—"}</span>
                            <span aria-hidden>·</span>
                            <span className="tabular-nums">{row.budgetYearGc} GC</span>
                            {!isAnnualPeriod(row.planPeriod) ? (
                              <span className="rounded bg-info/10 px-1.5 py-0.5 text-[10px] font-medium text-info">
                                {monthsLabel(monthsForPeriod(row.planPeriod))}
                              </span>
                            ) : null}
                          </p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm tabular-nums">
                            <span className={cn("font-semibold", included > 0 && scheduled >= included ? "text-primary" : "text-foreground")}>
                              {scheduled}
                            </span>
                            <span className="text-muted-foreground"> / {included}</span>
                          </span>
                        </TableCell>
                        <TableCell className="min-w-[130px] text-right font-semibold tabular-nums text-foreground">
                          {fmtEtb(row.plannedCostEtb || 0)}
                        </TableCell>
                        <TableCell className="min-w-[110px]">
                          <StatusBadge
                            status={
                              row.statusRaw === "archived"
                                ? "archived"
                                : row.statusRaw === "approved" || row.statusRaw === "active"
                                ? "approved"
                                : row.statusRaw === "submitted"
                                  ? "submitted"
                                  : row.statusRaw === "returned"
                                    ? "returned"
                                    : "draft"
                            }
                            label={statusLabel(row.statusRaw)}
                            className="whitespace-nowrap"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            {(() => {
                              const next = nextActionFor(row);
                              return next ? (
                                next.onClick ? (
                                  <Button size="sm" variant={next.primary ? "default" : "outline"} className="h-8" disabled={next.disabled} onClick={next.onClick}>
                                    {next.label}
                                  </Button>
                                ) : (
                                  <Button size="sm" variant={next.primary ? "default" : "outline"} className="h-8" asChild>
                                    <Link href={next.href ?? planHref(row.id)}>{next.label}</Link>
                                  </Button>
                                )
                              ) : null;
                            })()}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label={`Actions for ${row.name || "Core Operations plan"}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={planHref(row.id)}>Open</Link>
                              </DropdownMenuItem>
                              {canDuplicate ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    void duplicateMut
                                      .mutateAsync(row.id)
                                      .then((p) => {
                                        toast.success(
                                          archiveMode
                                            ? "Duplicated into a new draft"
                                            : "Duplicated",
                                        );
                                        router.push(planHref(p.id));
                                      })
                                      .catch((e) =>
                                        toast.error(
                                          e instanceof Error ? e.message : "Duplicate failed",
                                        ),
                                      )
                                  }
                                >
                                  Duplicate
                                </DropdownMenuItem>
                              ) : null}
                              {!archiveMode && canEditRow(row) ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    void submitMut
                                      .mutateAsync(row)
                                      .then(() => toast.success("Submitted for Silva approval"))
                                      .catch((e) =>
                                        toast.error(
                                          e instanceof Error ? e.message : "Submit failed",
                                        ),
                                      )
                                  }
                                >
                                  Submit
                                </DropdownMenuItem>
                              ) : null}
                              {canCreate && (row.statusRaw === "approved" || row.statusRaw === "active") ? (
                                <DropdownMenuItem
                                  disabled={workOrdersMut.isPending}
                                  onClick={() =>
                                    void workOrdersMut
                                      .mutateAsync({ id: row.id })
                                      .then(({ created, skipped }) => {
                                        if (!created.length) {
                                          toast.info(
                                            skipped.length
                                              ? "Work orders already exist for every scheduled month"
                                              : "No scheduled activities to turn into work orders",
                                          );
                                          return;
                                        }
                                        toast.success(
                                          `Created ${created.length} monthly work order${created.length === 1 ? "" : "s"}`,
                                          {
                                            action: {
                                              label: "Open",
                                              onClick: () => router.push(CROPFORT_ROUTES.monthlyWorkOrders),
                                            },
                                          },
                                        );
                                      })
                                      .catch((e) =>
                                        toast.error(e instanceof Error ? e.message : "Could not create work orders"),
                                      )
                                  }
                                >
                                  Create work orders
                                </DropdownMenuItem>
                              ) : null}
                              {!archiveMode && row.statusRaw === "submitted" ? (
                                <DropdownMenuItem asChild>
                                  <Link href={CROPFORT_ROUTES.approvals}>View approval</Link>
                                </DropdownMenuItem>
                              ) : null}
                              {!archiveMode &&
                              canCreate &&
                              row.statusRaw !== "archived" &&
                              row.statusRaw !== "submitted" ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => setArchiveTarget(row)}>
                                    Archive
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
  );

  return (
    <PageContainer>
      <PageHeader
        title={archiveMode ? "Archived plans" : "Plans"}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          ...(archiveMode ? [{ label: "Plans", href: CROPFORT_ROUTES.programmePlans }, { label: "Archive" }] : [{ label: "Plans" }]),
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {archiveMode ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={CROPFORT_ROUTES.programmePlans}>Back to plans</Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" asChild>
                <Link href={CROPFORT_ROUTES.activityTaxonomy}>Activities</Link>
              </Button>
            )}
            {canCreate ? (
              <Button size="sm" asChild>
                <Link href={NEW_PLAN_HREF}>
                  <Plus className="h-3.5 w-3.5" />
                  New plan
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {!archiveMode && returnedCount ? (
        <Link
          href={`${CROPFORT_ROUTES.programmePlans}/returned`}
          className="group flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.07] px-4 py-3 text-sm transition-colors hover:bg-amber-500/[0.12]"
        >
          <RotateCcw className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
          <span className="flex-1 font-semibold">
            {returnedCount} plan{returnedCount === 1 ? "" : "s"} returned to fix
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-primary">
            Open
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </Link>
      ) : null}

      <SectionCard flush>
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:px-5 lg:flex-row lg:items-center">
          {!archiveMode ? (
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter by status">
              {STATUS_TABS.map((tab) => {
                const active = statusFilter === tab.id;
                const count = allPlans.filter((p) => tab.match(p.statusRaw)).length;
                // Empty statuses only add noise
                if (!count && !active && tab.id !== "all") return null;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setPage(1);
                    }}
                    className={cn(
                      "cf-focus inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
                      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {tab.label}
                    <span className={cn("tabular-nums", active ? "opacity-80" : "opacity-60")}>{count}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search"
                aria-label="Search plans"
                className="h-9 rounded-lg bg-background pl-9"
              />
            </div>
            {farms.length > 1 && !workspaceFarmId ? (
              <Select
                value={farmFilter}
                aria-label="Filter by farm area"
                onValueChange={(v) => {
                  setFarmFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[150px] rounded-lg bg-background">
                  <SelectValue placeholder="Farm area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All farms</SelectItem>
                  {farms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {years.length > 1 ? (
              <Select
                value={yearFilter}
                aria-label="Filter by budget year"
                onValueChange={(v) => {
                  setYearFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[110px] rounded-lg bg-background">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All years</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {hasActiveFilters ? (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setFarmFilter("all");
                  setYearFilter("all");
                  setPage(1);
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {renderTable(paged)}
        <TablePagination
          page={safePage}
          pageCount={pageCount}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZES}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </SectionCard>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title={`Archive ${archiveTarget?.name || "this plan"}?`}
        description="It moves to Archived plans and frees its budget year — you can create a new plan for that year, or duplicate this one into a new draft."
        confirmLabel="Archive"
        loading={archiveMut.isPending}
        onConfirm={async () => {
          if (!archiveTarget) return;
          try {
            await archiveMut.mutateAsync(archiveTarget.id);
            toast.message("Archived");
            setArchiveTarget(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Archive failed");
          }
        }}
      />
    </PageContainer>
  );
}
