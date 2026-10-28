"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, MoreHorizontal, Plus, Search } from "lucide-react";
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
  { id: "submitted", label: "Waiting approval", match: (r) => r === "submitted" },
  { id: "returned", label: "Returned", match: (r) => r === "returned" },
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

  const plansQuery = useProgrammePlans(Boolean(activeProgram?.id), {
    status: archiveMode ? "archived" : undefined,
    includeArchived: archiveMode,
    farmEstateId: farmFilter !== "all" ? farmFilter : undefined,
    planYear: yearFilter !== "all" ? Number(yearFilter) : undefined,
  });
  const allPlans = useMemo(() => plansQuery.data || [], [plansQuery.data]);
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
    if (p.statusRaw === "returned" && canEditRow(p)) return { label: "Fix", primary: true };
    if (canEditRow(p)) return { label: "Continue", primary: true };
    if (p.statusRaw === "submitted") return { label: "View approval", href: CROPFORT_ROUTES.approvals, primary: false };
    if (canCreate && (p.statusRaw === "approved" || p.statusRaw === "active"))
      return {
        label: "Work orders",
        primary: false,
        disabled: workOrdersMut.isPending,
        onClick: () =>
          void workOrdersMut
            .mutateAsync(p.id)
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
                        <TableCell className="hidden min-w-[140px] md:table-cell">
                          <div className="max-w-36">
                            <p className="text-xs tabular-nums">
                              <span className="font-semibold text-foreground">{scheduled}</span>
                              <span className="text-muted-foreground"> / {included} activities</span>
                            </p>
                            <div
                              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                              aria-label={`${scheduled} of ${included} activities scheduled`}
                              aria-valuemin={0}
                              aria-valuemax={Math.max(included, 1)}
                              aria-valuenow={Math.min(scheduled, included)}
                            >
                              <div
                                className="h-full rounded-full bg-primary transition-[width]"
                                style={{
                                  width: `${included > 0 ? Math.min(100, (scheduled / included) * 100) : 0}%`,
                                }}
                              />
                            </div>
                          </div>
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
                                      .mutateAsync(row.id)
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

      <SectionCard flush>
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
          {!archiveMode ? (
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by status">
              {STATUS_TABS.map((tab) => {
                const active = statusFilter === tab.id;
                const count = allPlans.filter((p) => tab.match(p.statusRaw)).length;
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
                      "cf-focus inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                    <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", active ? "bg-primary-foreground/20" : "bg-muted")}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
            <div className="relative min-w-0 sm:w-60">
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
                placeholder="Search plans"
                aria-label="Search plans"
                className="h-9 rounded-xl bg-background pl-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">

                <Select
                  value={farmFilter}
                  aria-label="Filter by farm area"
                  onValueChange={(v) => {
                    setFarmFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-xl bg-background sm:w-[150px]">
                    <SelectValue placeholder="Farm area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All farm areas</SelectItem>
                    {farms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={yearFilter}
                  aria-label="Filter by budget year"
                  onValueChange={(v) => {
                    setYearFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-xl bg-background sm:w-[120px]">
                    <SelectValue placeholder="Budget year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y} GC
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="col-span-2 h-10 sm:col-span-1 sm:h-9"
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
              ) : null}
            </div>
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
