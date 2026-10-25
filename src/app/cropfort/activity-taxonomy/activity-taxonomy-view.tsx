"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Search, X } from "lucide-react";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type RowSelectionState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { DataTable } from "@/components/cropfort/tanstack-data-table";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  bulkUpdateActivities,
  createActivity,
  deactivateActivities,
  updateActivity,
  type CreateActivityInput,
  type PlatformActivity,
} from "@/lib/api/activities";
import { canProposeRateCard, canViewRateCard } from "@/lib/cropfortAccess";
import { useActivities } from "@/lib/query";
import { cn } from "@/lib/utils";

const col = createColumnHelper<PlatformActivity>();

type KindFilter = "all" | "labor" | "materials" | "services";
const ACTIVITY_CATEGORIES = [
  "Nursery",
  "Young Coffee",
  "Matured Coffee",
  "Infilling",
  "Harvesting & Related",
  "Total - All Field Work",
] as const;

const KINDS: { value: KindFilter; label: string; tier: number | "" }[] = [
  { value: "all", label: "All", tier: "" },
  { value: "labor", label: "Labor", tier: 1 },
  { value: "materials", label: "Materials", tier: 2 },
  { value: "services", label: "Services", tier: 3 },
];

function kindLabel(tier: number) {
  if (tier === 1) return "Labor";
  if (tier === 2) return "Materials";
  if (tier === 3) return "Services";
  return `Tier ${tier}`;
}

const EMPTY_ROWS: PlatformActivity[] = [];

export default function ActivityTaxonomyView() {
  const { user, activeProgram } = useCropfortAuth();
  const canView =
    canViewRateCard(user.role) || user.role === "spx_platform_admin" || user.role === "spx_validator";
  const canPropose = canProposeRateCard(user.role);
  const [kind, setKind] = useState<KindFilter>("all");
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<Partial<CreateActivityInput>>({});
  const [draft, setDraft] = useState<CreateActivityInput>({
    code: "",
    name: "",
    tier: 1,
    category: "",
    subgroup: "",
    unitOfMeasure: "",
    description: "",
    active: true,
    sortOrder: 0,
  });

  const tier = KINDS.find((k) => k.value === kind)?.tier ?? "";
  const query = useActivities({ tier }, canView);
  const rows = query.data ?? EMPTY_ROWS;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (categoryFilter === "all" || r.category === categoryFilter) &&
        (!term ||
          r.name.toLowerCase().includes(term) ||
          r.code.toLowerCase().includes(term) ||
          r.category.toLowerCase().includes(term) ||
          (r.subgroup || "").toLowerCase().includes(term) ||
          kindLabel(r.tier).toLowerCase().includes(term)),
    );
  }, [rows, q, categoryFilter]);
  const categories = useMemo(
    () => [...new Set(rows.map((row) => row.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const columns = useMemo(
    () => [
      ...(canPropose
        ? [
            col.display({
              id: "select",
              header: ({ table }) => (
                <Checkbox
                  aria-label="Select activities on this page"
                  checked={
                    table.getIsAllPageRowsSelected()
                      ? true
                      : table.getIsSomePageRowsSelected()
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked === true)}
                />
              ),
              cell: ({ row }) => (
                <Checkbox
                  aria-label={`Select ${row.original.name}`}
                  checked={row.getIsSelected()}
                  onCheckedChange={(checked) => row.toggleSelected(checked === true)}
                />
              ),
              size: 44,
            }),
          ]
        : []),
      col.accessor("code", {
        header: "Activity code",
        cell: (c) => (
          <span className="inline-flex rounded-md border border-border bg-muted/60 px-2 py-1 font-mono text-xs font-medium text-muted-foreground">
            {c.getValue()}
          </span>
        ),
      }),
      col.accessor("category", {
        header: "Category",
        cell: (c) => (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary/70" aria-hidden />
            {c.getValue()}
          </span>
        ),
      }),
      col.accessor((row) => row.subgroup || "", {
        id: "subgroup",
        header: "Sub-group",
        cell: (c) =>
          c.getValue() ? (
            <span className="text-sm text-muted-foreground">{c.getValue()}</span>
          ) : (
            <span className="text-sm text-muted-foreground/50">—</span>
          ),
      }),
      col.accessor("name", {
        header: "Activity",
        cell: (c) => <span className="font-medium text-foreground">{c.getValue()}</span>,
      }),
      col.accessor("unitOfMeasure", {
        header: "Unit",
        cell: (c) => (
          <span className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium">
            {c.getValue()}
          </span>
        ),
      }),
    ],
    [canPropose],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: canPropose,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    state: { rowSelection },
    initialState: { pagination: { pageSize: 25 } },
  });
  const selectedActivities = table.getSelectedRowModel().rows.map((row) => row.original);

  if (!canView) return <NotAuthorized title="Activity Taxonomy" />;

  const categoryCount = new Set(filtered.map((r) => r.category)).size;
  const summary = query.isLoading
    ? "Loading catalogue…"
    : `${filtered.length} activities${categoryCount ? ` · ${categoryCount} categories` : ""}`;

  const canSubmitCreate =
    draft.code.trim() && draft.name.trim() && draft.category.trim() && draft.unitOfMeasure.trim();

  const handleCreate = async () => {
    if (!canSubmitCreate) {
      toast.error("Please complete the required fields before creating the activity.");
      return;
    }

    try {
      await createActivity({
        code: draft.code.trim(),
        name: draft.name.trim(),
        nameAm: draft.nameAm?.trim() || undefined,
        tier: draft.tier,
        category: draft.category.trim(),
        subgroup: draft.subgroup?.trim() || "",
        unitOfMeasure: draft.unitOfMeasure.trim(),
        description: draft.description.trim() || undefined,
        active: draft.active,
        sortOrder: draft.sortOrder,
      });

      setCreateOpen(false);
      setDraft({
        code: "",
        name: "",
        tier: 1,
        category: "",
        subgroup: "",
        unitOfMeasure: "",
        description: "",
        active: true,
        sortOrder: 0,
      });
      toast.success("Activity draft created.");
      void query.refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to create the activity right now.",
      );
    }
  };

  const openEditSelected = () => {
    if (selectedActivities.length === 1) {
      const activity = selectedActivities[0];
      setEditDraft({
        code: activity.code,
        name: activity.name,
        tier: activity.tier as 1 | 2 | 3,
        category: activity.category,
        subgroup: activity.subgroup || "",
        unitOfMeasure: activity.unitOfMeasure,
        description: activity.description || "",
      });
    } else {
      setEditDraft({});
    }
    setEditOpen(true);
  };

  const handleEditSelected = async () => {
    if (selectedActivities.length === 0) return;
    try {
      if (selectedActivities.length === 1) {
        const activity = selectedActivities[0];
        if (
          !editDraft.code?.trim() ||
          !editDraft.name?.trim() ||
          !editDraft.category?.trim() ||
          !editDraft.unitOfMeasure?.trim()
        ) {
          toast.error("Code, activity name, category, and unit are required.");
          return;
        }
        await updateActivity(activity.id, {
          ...editDraft,
          code: editDraft.code.trim(),
          name: editDraft.name.trim(),
          category: editDraft.category.trim(),
          subgroup: editDraft.subgroup?.trim() || "",
          unitOfMeasure: editDraft.unitOfMeasure.trim(),
        });
      } else {
        const patch: Partial<CreateActivityInput> = {};
        if (editDraft.category?.trim()) patch.category = editDraft.category.trim();
        if (editDraft.subgroup?.trim()) patch.subgroup = editDraft.subgroup.trim();
        if (editDraft.unitOfMeasure?.trim()) patch.unitOfMeasure = editDraft.unitOfMeasure.trim();
        if (editDraft.tier) patch.tier = editDraft.tier;
        if (Object.keys(patch).length === 0) {
          toast.error("Enter at least one field to update.");
          return;
        }
        await bulkUpdateActivities(
          selectedActivities.map((activity) => activity.id),
          patch,
        );
      }
      setEditOpen(false);
      setRowSelection({});
      toast.success(
        selectedActivities.length === 1
          ? "Activity updated."
          : `${selectedActivities.length} activities updated.`,
      );
      await query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update activities.");
    }
  };

  const handleDeactivateSelected = async () => {
    if (!selectedActivities.length) return;
    try {
      const result = await deactivateActivities(selectedActivities.map((activity) => activity.id));
      setDeleteOpen(false);
      setRowSelection({});
      toast.success(`${result.deactivatedCount} activities removed from the active catalogue.`);
      await query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to remove activities.");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Rates"}
        title="Activity Taxonomy"
        meta={<span className="text-xs text-muted-foreground">{summary}</span>}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Rates", href: CROPFORT_ROUTES.rateCardProposals },
          { label: "Activity taxonomy" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {canPropose ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Create activity
              </Button>
            ) : null}
            {canPropose ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={CROPFORT_ROUTES.benchmarkSurveys}>Benchmark surveys</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Activity kind"
            className="inline-flex h-10 w-fit max-w-full flex-wrap items-center rounded-lg bg-muted/70 p-1 text-muted-foreground"
          >
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                role="tab"
                aria-selected={kind === k.value}
                className={cn(
                  "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  kind === k.value
                    ? "bg-background text-foreground shadow-sm"
                    : "hover:text-foreground",
                )}
                onClick={() => {
                  setKind(k.value);
                  setCategoryFilter("all");
                }}
              >
                {k.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger
                  aria-label="Filter by category"
                  className="h-10 w-full bg-background sm:w-[230px]"
                >
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative min-w-0 flex-1 sm:min-w-[260px]">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  className="h-10 w-full bg-background pl-9 pr-9"
                  placeholder="Search activities, codes, or sub-groups"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search activities by name, code, or sub-group"
                />
                {q ? (
                  <button
                    type="button"
                    aria-label="Clear activity search"
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground lg:justify-end">
              <span aria-live="polite">
                Showing <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
                activities
              </span>
              <div className="flex items-center gap-2">
                {categoryFilter !== "all" || q ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => {
                      setCategoryFilter("all");
                      setQ("");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null}
                {canPropose ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={selectedActivities.length === 0}
                        className="h-8"
                      >
                        <MoreHorizontal className="mr-1 h-4 w-4" aria-hidden />
                        Actions
                        {selectedActivities.length ? ` (${selectedActivities.length})` : ""}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={openEditSelected}>
                        Edit selected
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteOpen(true)}
                      >
                        Delete selected
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionCard flush className="overflow-hidden">
        <DataTable
          table={table}
          loading={query.isLoading}
          emptyTitle="No activities"
          emptyDescription={
            q
              ? "Try another activity name, code, sub-group, or category."
              : "The activity catalogue is empty or has not finished loading."
          }
          className="[&_thead_tr]:border-b [&_thead_tr]:bg-muted/40 [&_thead_th]:h-11 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-wide [&_tbody_tr:nth-child(even)]:bg-muted/10 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-primary/[0.04] [&_tbody_td]:py-3.5"
        />
      </SectionCard>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create activity</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="activity-code">Code</Label>
              <Input
                id="activity-code"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder="e.g. LAB-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-tier">Tier</Label>
              <select
                id="activity-tier"
                value={draft.tier}
                onChange={(e) => setDraft({ ...draft, tier: Number(e.target.value) as 1 | 2 | 3 })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={1}>Labor</option>
                <option value={2}>Materials</option>
                <option value={3}>Services</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="activity-name">Activity name *</Label>
              <Input
                id="activity-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Enter the activity name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-category">Category</Label>
              <select
                id="activity-category"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Choose a category</option>
                {ACTIVITY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-unit">Unit of measure</Label>
              <Input
                id="activity-unit"
                value={draft.unitOfMeasure}
                onChange={(e) => setDraft({ ...draft, unitOfMeasure: e.target.value })}
                placeholder="e.g. ha, kg, hr, m3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-subgroup">Sub-group</Label>
              <Input
                id="activity-subgroup"
                value={draft.subgroup ?? ""}
                onChange={(e) => setDraft({ ...draft, subgroup: e.target.value })}
                placeholder="e.g. Site preparation"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="activity-description">Description</Label>
              <Textarea
                id="activity-description"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Optional notes on scope, norms, or operational context"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-sort-order">Sort order</Label>
              <Input
                id="activity-sort-order"
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  setDraft({ ...draft, sortOrder: Number(e.target.value || 0) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-active">Status</Label>
              <select
                id="activity-active"
                value={draft.active ? "active" : "inactive"}
                onChange={(e) => setDraft({ ...draft, active: e.target.value === "active" })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={!canSubmitCreate}>
              Save activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedActivities.length === 1
                ? `Edit activity · ${selectedActivities[0]?.code || ""}`
                : `Edit ${selectedActivities.length} activities`}
            </DialogTitle>
          </DialogHeader>
          {selectedActivities.length === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-activity-code">Code *</Label>
                <Input
                  id="edit-activity-code"
                  value={editDraft.code || ""}
                  onChange={(event) =>
                    setEditDraft({ ...editDraft, code: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-activity-tier">Type *</Label>
                <select
                  id="edit-activity-tier"
                  value={editDraft.tier || 1}
                  onChange={(event) =>
                    setEditDraft({ ...editDraft, tier: Number(event.target.value) as 1 | 2 | 3 })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={1}>Labor</option>
                  <option value={2}>Materials</option>
                  <option value={3}>Services</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-activity-name">Activity name *</Label>
                <Input
                  id="edit-activity-name"
                  value={editDraft.name || ""}
                  onChange={(event) =>
                    setEditDraft({ ...editDraft, name: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-activity-category">Category *</Label>
                <Input
                  id="edit-activity-category"
                  value={editDraft.category || ""}
                  onChange={(event) =>
                    setEditDraft({ ...editDraft, category: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-activity-subgroup">Sub-group</Label>
                <Input
                  id="edit-activity-subgroup"
                  value={editDraft.subgroup || ""}
                  onChange={(event) =>
                    setEditDraft({ ...editDraft, subgroup: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-activity-unit">Unit *</Label>
                <Input
                  id="edit-activity-unit"
                  value={editDraft.unitOfMeasure || ""}
                  onChange={(event) =>
                    setEditDraft({ ...editDraft, unitOfMeasure: event.target.value })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Fill only the fields you want to change. Blank fields are left as they are.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bulk-edit-tier">Set type</Label>
                  <select
                    id="bulk-edit-tier"
                    value={editDraft.tier ?? ""}
                    onChange={(event) =>
                      setEditDraft({
                        ...editDraft,
                        tier: event.target.value
                          ? (Number(event.target.value) as 1 | 2 | 3)
                          : undefined,
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No change</option>
                    <option value={1}>Labor</option>
                    <option value={2}>Materials</option>
                    <option value={3}>Services</option>
                  </select>
                </div>
                {([
                  ["category", "Set category"],
                  ["subgroup", "Set sub-group"],
                  ["unitOfMeasure", "Set unit"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`bulk-edit-${key}`}>{label}</Label>
                    <Input
                      id={`bulk-edit-${key}`}
                      value={editDraft[key] || ""}
                      placeholder="Leave blank for no change"
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, [key]: event.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleEditSelected()}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete selected activities?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {selectedActivities.length} selected{" "}
            {selectedActivities.length === 1 ? "activity will" : "activities will"} be removed
            from the active catalogue. Existing plans and rate records will be preserved.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDeactivateSelected()}>
              Delete selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
