"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, FileEdit, Library, MoreHorizontal, Plus, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import {
  TableMessageRow,
  TablePagination,
  TableToolbar,
} from "@/components/cropfort/data-table";
import {
  PageContainer,
  PageHeader,
  SectionCard,
  StatusSummaryCards,
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

type StatusFilter =
  | "all"
  | "draft"
  | "ready_for_review"
  | "submitted"
  | "returned"
  | "approved"
  | "active";

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
  const [planningCycle, setPlanningCycle] = useState(
    `${new Date().getFullYear()} Programme`,
  );
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

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
    q: query.trim() || undefined,
  });
  const allPlans = plansQuery.data || [];
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

  const stats = useMemo(() => {
    return {
      total: allPlans.length,
      draft: allPlans.filter((p) => p.statusRaw === "draft" || p.statusRaw === "ready_for_review").length,
      submitted: allPlans.filter((p) => p.statusRaw === "submitted").length,
      approved: allPlans.filter((p) => p.statusRaw === "approved" || p.statusRaw === "active").length,
      returned: allPlans.filter((p) => p.statusRaw === "returned").length,
    };
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

  const openCreate = () => {
    setName("");
    setFarmEstateId(farms[0]?.id || "");
    const y = new Date().getFullYear();
    setPlanYear(String(y));
    setPlanningCycle(`${y} Programme`);
    setDescription("");
    setNotes("");
    setCreateOpen(true);
  };

  const onCreate = async () => {
    if (!canCreate) {
      toast.error("Only SPX can create programme plans");
      return;
    }
    if (!name.trim() || !farmEstateId) {
      toast.error("Name and farm area are required");
      return;
    }
    const year = Number(planYear);
    try {
      const row = await createMut.mutateAsync({
        name: name.trim(),
        farmEstateId,
        planYear: year,
        planningCycleLabel: planningCycle.trim() || `${year} Programme`,
        budgetYearLabel: budgetYearLabel(year).label,
        description: description.trim(),
        notes: notes.trim(),
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
        title={archiveMode ? "Archive" : "Programme plans"}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Planning" },
          { label: "Programme plans", href: CROPFORT_ROUTES.programmePlans },
          ...(archiveMode ? [{ label: "Archive" }] : []),
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {archiveMode ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={CROPFORT_ROUTES.programmePlans}>Register</Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" asChild>
                <Link href={CROPFORT_ROUTES.programmePlansArchive}>
                  <Library className="h-3.5 w-3.5" />
                  Archive
                </Link>
              </Button>
            )}
            {canCreate ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            ) : null}
          </div>
        }
      />

      {!archiveMode ? (
      <StatusSummaryCards
        label="Programme plans"
        columns={5}
        items={[
          {
            id: "all",
            label: "Total",
            value: String(stats.total),
            icon: ClipboardList,
            emphasis: true,
            active: statusFilter === "all",
            onClick: () => {
              setStatusFilter("all");
              setPage(1);
            },
          },
          {
            id: "draft",
            label: "Draft",
            value: String(stats.draft),
            icon: FileEdit,
            active: statusFilter === "draft",
            onClick: () => {
              setStatusFilter("draft");
              setPage(1);
            },
          },
          {
            id: "submitted",
            label: "Submitted",
            value: String(stats.submitted),
            icon: Send,
            active: statusFilter === "submitted",
            onClick: () => {
              setStatusFilter("submitted");
              setPage(1);
            },
          },
          {
            id: "approved",
            label: "Approved",
            value: String(stats.approved),
            icon: CheckCircle2,
            intent: "positive",
            active: statusFilter === "approved",
            onClick: () => {
              setStatusFilter("approved");
              setPage(1);
            },
          },
          {
            id: "returned",
            label: "Returned",
            value: String(stats.returned),
            icon: RotateCcw,
            intent: "negative",
            active: statusFilter === "returned",
            onClick: () => {
              setStatusFilter("returned");
              setPage(1);
            },
          },
        ]}
      />
      ) : null}

      <SectionCard title={archiveMode ? "Archived plans" : "Register"} flush>
        <div className="space-y-2 border-b border-border px-4 py-2.5 sm:px-5">
          <TableToolbar
            search={query}
            onSearchChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            searchPlaceholder="Search programme, farm area, cycle…"
            filters={
              <div className="flex flex-wrap gap-2">
                {archiveMode ? null : (
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as StatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="ready_for_review">Ready for review</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
                )}
                <Select
                  value={farmFilter}
                  onValueChange={(v) => {
                    setFarmFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[160px]">
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
                  onValueChange={(v) => {
                    setYearFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[140px]">
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
              </div>
            }
          />
        </div>

        <div className="cf-table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Programme plan</TableHead>
                <TableHead>Farm area</TableHead>
                <TableHead>Budget year</TableHead>
                <TableHead className="text-right">Activities</TableHead>
                <TableHead className="text-right">Scheduled</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plansQuery.isLoading ? (
                <TableMessageRow
                  colSpan={8}
                  icon={ClipboardList}
                  title="Loading programme plans…"
                />
              ) : paged.length === 0 ? (
                <TableMessageRow
                  colSpan={8}
                  icon={ClipboardList}
                  title={
                    plans.length === 0
                      ? archiveMode
                        ? "No archived plans"
                        : "No plans"
                      : "No results"
                  }
                />
              ) : (
                paged.map((row) => {
                  const included = row.includedCount ?? 0;
                  const scheduled = row.scheduledCount ?? 0;
                  return (
                    <TableRow key={row.id} className="cursor-pointer hover:bg-muted/40">
                      <TableCell>
                        <Link
                          href={planHref(row.id)}
                          className="font-medium text-foreground hover:underline"
                        >
                          {row.name || "Untitled plan"}
                        </Link>
                        {row.code ? (
                          <p className="text-[11px] text-muted-foreground">{row.code}</p>
                        ) : null}
                        {row.planningCycleLabel ? (
                          <p className="text-[11px] text-muted-foreground">
                            Cycle: {row.planningCycleLabel}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>{row.farmName || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {row.budgetYearLabel || `${row.budgetYearGc} GC`}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{included}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {scheduled}/{included || 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtEtb(row.plannedCostEtb || 0)}
                      </TableCell>
                      <TableCell>
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
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon-sm" variant="ghost" aria-label="Actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={planHref(row.id)}>Open</Link>
                            </DropdownMenuItem>
                            {canEditRow(row) ? (
                              <DropdownMenuItem asChild>
                                <Link href={planHref(row.id)}>Edit</Link>
                              </DropdownMenuItem>
                            ) : null}
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
                                    .mutateAsync(row.id)
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
                                <DropdownMenuItem
                                  onClick={() =>
                                    void archiveMut
                                      .mutateAsync(row.id)
                                      .then(() => toast.message("Archived"))
                                      .catch((e) =>
                                        toast.error(
                                          e instanceof Error ? e.message : "Archive failed",
                                        ),
                                      )
                                  }
                                >
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
            <DialogTitle>New programme plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Programme plan name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2027 Annual Coffee Operations"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Planning cycle *</Label>
                <Input
                  value={planningCycle}
                  onChange={(e) => setPlanningCycle(e.target.value)}
                  placeholder="2027 Programme"
                />
              </div>
              <div className="space-y-1">
                <Label>Budget year (GC) *</Label>
                <Input
                  type="number"
                  value={planYear}
                  onChange={(e) => {
                    setPlanYear(e.target.value);
                    const y = Number(e.target.value);
                    if (Number.isFinite(y)) setPlanningCycle(`${y} Programme`);
                  }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Farm / estate *</Label>
              <Select value={farmEstateId} onValueChange={setFarmEstateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select farm area" />
                </SelectTrigger>
                <SelectContent>
                  {farms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void onCreate()} disabled={createMut.isPending}>
              Create programme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
