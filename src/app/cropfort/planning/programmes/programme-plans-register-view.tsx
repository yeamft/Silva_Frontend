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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { budgetYearLabel } from "@/lib/cropfort/ethiopian-year";
import { canCreateProgrammePlan } from "@/lib/cropfort/platform-access";
import { fmtEtb } from "@/store/cropfortOpsStore";
import {
  useArchiveProgrammePlan,
  useCreateProgrammePlan,
  useDuplicateProgrammePlan,
  useProgrammePlans,
  useSubmitProgrammePlanMutation,
} from "@/lib/query/hooks/use-programme-plans";
import { listFarms } from "@/lib/api/benchmark-surveys";
import { useQuery } from "@tanstack/react-query";
import type { ProgrammePlanDto } from "@/lib/api/programme-plans";

const PAGE_SIZES = [10, 25, 50];

type StatusFilter = "all" | "draft" | "submitted" | "returned" | "approved";

function statusLabel(raw?: string) {
  if (!raw) return "draft";
  return raw.replace(/_/g, " ");
}

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
  const [pageSize, setPageSize] = useState(25);
  const [createOpen, setCreateOpen] = useState(false);

  const [name, setName] = useState("");
  const [farmEstateId, setFarmEstateId] = useState("");
  const [planYear, setPlanYear] = useState(String(new Date().getFullYear()));
  const [description, setDescription] = useState("");
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
  const createMut = useCreateProgrammePlan();
  const duplicateMut = useDuplicateProgrammePlan();
  const archiveMut = useArchiveProgrammePlan();
  const submitMut = useSubmitProgrammePlanMutation();

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

  const openCreate = () => {
    setName("");
    setFarmEstateId(farms[0]?.id || "");
    setPlanYear(String(new Date().getFullYear()));
    setDescription("");
    setCreateOpen(true);
  };

  const onCreate = async () => {
    if (!canCreate) {
      toast.error("Only SPX can create Core Operations plans");
      return;
    }
    if (!name.trim() || !farmEstateId) {
      toast.error("Name and farm area are required");
      return;
    }
    const year = Number(planYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      toast.error("Enter a valid budget year, e.g. 2027");
      return;
    }
    try {
      const row = await createMut.mutateAsync({
        name: name.trim(),
        farmEstateId,
        planYear: year,
        planningCycleLabel: `${year} Core Operations`,
        budgetYearLabel: budgetYearLabel(year).label,
        description: description.trim(),
        notes: "",
      });
      setCreateOpen(false);
      toast.success(`Created ${row.name}`);
      router.push(planHref(row.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create plan");
    }
  };

  const canEditRow = (p: ProgrammePlanDto) =>
    canCreate &&
    (p.statusRaw === "draft" ||
      p.statusRaw === "returned" ||
      p.statusRaw === "ready_for_review");

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Workspace"}
        title={archiveMode ? "Archive" : "Core Operations plans"}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Planning" },
          { label: "Core Operations plans", href: CROPFORT_ROUTES.programmePlans },
          ...(archiveMode ? [{ label: "Archive" }] : []),
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {archiveMode ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={CROPFORT_ROUTES.programmePlans}>Register</Link>
              </Button>
            ) : null}
            {canCreate ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                New plan
              </Button>
            ) : null}
          </div>
        }
      />

      <SectionCard title={archiveMode ? "Archived plans" : "All Core Operations plans"} flush>
        <div className="border-b border-border bg-muted/15 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1 xl:max-w-md">
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
                placeholder="Search by plan, code, farm area, or cycle"
                aria-label="Search Core Operations plans"
                className="h-10 bg-background pl-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              {!archiveMode ? (
                <Select
                  value={statusFilter}
                  aria-label="Filter by status"
                  onValueChange={(v) => {
                    setStatusFilter(v as StatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 w-full bg-background sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
                <Select
                  value={farmFilter}
                  aria-label="Filter by farm area"
                  onValueChange={(v) => {
                    setFarmFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 w-full bg-background sm:w-[170px]">
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
                  <SelectTrigger className="h-10 w-full bg-background sm:w-[140px]">
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

        <div className="cf-table-scroll">
          <Table aria-label={archiveMode ? "Archived Core Operations plans" : "Core Operations plans"}>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Farm area</TableHead>
                <TableHead>Budget year</TableHead>
                <TableHead className="text-right">Activities scheduled</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plansQuery.isLoading ? (
                <TableSkeleton rows={5} columns={7} />
              ) : paged.length === 0 ? (
                <TableMessageRow
                  colSpan={7}
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
                      <Button size="sm" onClick={openCreate}>
                        <Plus className="h-3.5 w-3.5" />
                        New Core Operations plan
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
                paged.map((row) => {
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
                      <TableCell className="h-auto min-w-[250px] py-4">
                        <Link
                          href={planHref(row.id)}
                          aria-label={`Open ${row.name || "untitled Core Operations plan"}`}
                          className="group/plan inline-flex items-center gap-1.5 rounded-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="truncate">{row.name || "Untitled plan"}</span>
                          <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover/plan:opacity-100 group-focus-visible/plan:opacity-100" aria-hidden>
                            Open
                          </span>
                        </Link>
                        {row.code || row.planningCycleLabel ? (
                          <p className="mt-0.5 max-w-[26rem] truncate text-xs text-muted-foreground">
                            {[row.code, row.planningCycleLabel].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="min-w-[120px] font-medium text-foreground/85">
                        {row.farmName || "—"}
                      </TableCell>
                      <TableCell className="min-w-[140px] text-sm tabular-nums">
                        <span className="whitespace-nowrap">
                          {row.budgetYearLabel || `${row.budgetYearGc} GC`}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <div className="ml-auto max-w-32">
                          <p className="text-right text-xs tabular-nums">
                            <span className="font-semibold text-foreground">{scheduled}</span>
                            <span className="text-muted-foreground"> of {included} scheduled</span>
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
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Core Operations plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="plan-name">Plan name *</Label>
              <Input
                id="plan-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2027 Annual Coffee Operations"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="plan-farm">Farm area *</Label>
                <Select value={farmEstateId} onValueChange={setFarmEstateId}>
                  <SelectTrigger id="plan-farm">
                    <SelectValue placeholder={farms.length ? "Select farm area" : "No farm areas yet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {farms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!farmsQuery.isLoading && farms.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    <Link href={CROPFORT_ROUTES.farmAreas} className="text-primary underline-offset-2 hover:underline">
                      Add a farm area
                    </Link>{" "}
                    first.
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="plan-year">Budget year (GC) *</Label>
                <Input
                  id="plan-year"
                  type="number"
                  inputMode="numeric"
                  value={planYear}
                  onChange={(e) => setPlanYear(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-description">Description</Label>
              <Textarea
                id="plan-description"
                rows={2}
                placeholder="Optional — scope or goals for this plan"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onCreate()} disabled={createMut.isPending || !name.trim() || !farmEstateId}>
              {createMut.isPending ? "Creating…" : "Create plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
