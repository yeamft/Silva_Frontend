"use client";

import { useMemo, useRef, useState } from "react";
import { Layers, Search, Tag, Upload, X } from "lucide-react";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { CompactSummaryCards, PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { DataTable } from "@/components/cropfort/tanstack-data-table";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  commitActivityWorkbookImport,
  createActivity,
  previewActivityWorkbookImport,
  type ActivityWorkbookImportPreview,
  type ActivityWorkbookImportRow,
  type CreateActivityInput,
  type PlatformActivity,
} from "@/lib/api/activities";
import { canProposeRateCard, canViewRateCard } from "@/lib/cropfortAccess";
import { useActivities } from "@/lib/query";
import { cn } from "@/lib/utils";

const col = createColumnHelper<PlatformActivity>();

const ACTIVITY_CATEGORIES = [
  "Nursery",
  "Young Coffee",
  "Matured Coffee",
  "Infilling",
  "Harvesting & Related",
] as const;

const EMPTY_ROWS: PlatformActivity[] = [];

const BLANK_DRAFT: CreateActivityInput = {
  code: "",
  name: "",
  nameAm: "",
  tier: 1,
  category: "",
  subgroup: "",
  unitOfMeasure: "",
  description: "",
  active: true,
  sortOrder: 0,
};

export default function ActivityTaxonomyView() {
  const { user, activeProgram } = useCropfortAuth();
  const canView =
    canViewRateCard(user.role) ||
    user.role === "spx_platform_admin" ||
    user.role === "spx_validator";
  const canManage = canProposeRateCard(user.role);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [draft, setDraft] = useState<CreateActivityInput>(BLANK_DRAFT);
  const [importPreview, setImportPreview] = useState<ActivityWorkbookImportPreview | null>(null);
  const [importPreviewing, setImportPreviewing] = useState(false);
  const [importCommitting, setImportCommitting] = useState(false);
  const [selectedImportRows, setSelectedImportRows] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const query = useActivities({}, canView);
  const rows = query.data ?? EMPTY_ROWS;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (categoryFilter === "all" || r.category === categoryFilter) &&
        (!term ||
          r.name.toLowerCase().includes(term) ||
          r.code.toLowerCase().includes(term) ||
          (r.subgroup || "").toLowerCase().includes(term) ||
          (r.nameAm || "").toLowerCase().includes(term)),
    );
  }, [rows, q, categoryFilter]);

  const categoryCount = useMemo(() => new Set(rows.map((r) => r.category)).size, [rows]);
  const typeCount = useMemo(() => new Set(rows.map((r) => r.tier)).size, [rows]);

  const columns = useMemo(
    () => [
      col.accessor("code", {
        header: "Code",
        size: 100,
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
            <span className="text-sm text-muted-foreground/40">—</span>
          ),
      }),
      col.accessor("name", {
        header: "Activity",
        cell: (c) => <span className="font-medium text-foreground">{c.getValue()}</span>,
      }),
      col.accessor("unitOfMeasure", {
        header: "Unit",
        size: 90,
        cell: (c) => (
          <span className="rounded-md border border-border bg-card px-2 py-1 text-xs font-medium">
            {c.getValue()}
          </span>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    initialState: { pagination: { pageSize: 25 } },
  });

  if (!canView) return <NotAuthorized title="Activity Taxonomy" />;

  const canSubmitCreate =
    draft.code.trim() && draft.name.trim() && draft.category.trim() && draft.unitOfMeasure.trim();

  const handleCreate = async () => {
    if (!canSubmitCreate) return;
    try {
      await createActivity({
        ...draft,
        code: draft.code.trim(),
        name: draft.name.trim(),
        nameAm: draft.nameAm?.trim() || undefined,
        category: draft.category.trim(),
        subgroup: draft.subgroup?.trim() || "",
        unitOfMeasure: draft.unitOfMeasure.trim(),
        description: draft.description?.trim() || undefined,
      });
      setCreateOpen(false);
      setDraft(BLANK_DRAFT);
      toast.success("Activity created.");
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create activity.");
    }
  };

  const handleFileSelect = async (file: File) => {
    setImportPreview(null);
    setSelectedImportRows(new Set());
    setImportPreviewing(true);
    try {
      const preview = await previewActivityWorkbookImport(file);
      setImportPreview(preview);
      setSelectedImportRows(new Set(preview.newActivities.map((r) => r.code)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed.");
    } finally {
      setImportPreviewing(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importPreview) return;
    const toImport = importPreview.newActivities.filter((r) => selectedImportRows.has(r.code));
    if (!toImport.length) {
      toast.error("Select at least one activity to import.");
      return;
    }
    setImportCommitting(true);
    try {
      const result = await commitActivityWorkbookImport(
        toImport.map((r) => ({ ...r, tier: (r.tier ?? 1) as 1 | 2 | 3 })),
      );
      toast.success(`${result.importedCount} activities imported.`);
      setImportOpen(false);
      setImportPreview(null);
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImportCommitting(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Standards & Rates"}
        title="Activity Taxonomy"
        description="Manage standardized farm activities"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Standards & Rates", href: CROPFORT_ROUTES.activityTaxonomy },
          { label: "Activity Taxonomy" },
        ]}
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-1.5 h-4 w-4" aria-hidden />
                Import
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Create
              </Button>
            </div>
          ) : null
        }
      />

      {/* Stats bar */}
      <CompactSummaryCards
        label="Activity taxonomy summary"
        items={[
          {
            id: "categories",
            label: "Operational categories",
            value: query.isLoading ? "—" : String(categoryCount || ACTIVITY_CATEGORIES.length),
            icon: Layers,
          },
          {
            id: "types",
            label: "Activity types",
            value: query.isLoading ? "—" : String(typeCount || 3),
            icon: Tag,
          },
          {
            id: "registered",
            label: "Registered activities",
            value: query.isLoading ? "—" : String(rows.length),
            icon: Search,
          },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger
            aria-label="Filter by category"
            className="h-9 w-full bg-background sm:w-[220px]"
          >
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {ACTIVITY_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
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
            className="h-9 w-full bg-background pl-9 pr-9"
            placeholder="Search activities, codes, or sub-groups"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search activities"
          />
          {q ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <span className="text-xs text-muted-foreground" aria-live="polite">
          {filtered.length} activities
        </span>

        {(categoryFilter !== "all" || q) && (
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
        )}
      </div>

      <SectionCard flush className="overflow-hidden">
        <DataTable
          table={table}
          loading={query.isLoading}
          emptyTitle="No activities"
          emptyDescription={
            q
              ? "Try another activity name, code, or sub-group."
              : "The activity catalogue is empty or has not finished loading."
          }
          className="[&_thead_tr]:border-b [&_thead_tr]:bg-muted/40 [&_thead_th]:h-11 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-[0.06em] [&_tbody_tr:nth-child(even)]:bg-muted/10 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-primary/[0.04] [&_tbody_td]:py-3.5"
        />
      </SectionCard>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create activity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ac-code">Activity code *</Label>
              <Input
                id="ac-code"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                placeholder="e.g. MC-03"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ac-type">Type *</Label>
              <select
                id="ac-type"
                value={draft.tier}
                onChange={(e) =>
                  setDraft({ ...draft, tier: Number(e.target.value) as 1 | 2 | 3 })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value={1}>Labor</option>
                <option value={2}>Materials</option>
                <option value={3}>Services</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ac-name">Activity name *</Label>
              <Input
                id="ac-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Pruning"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ac-category">Category *</Label>
              <select
                id="ac-category"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Choose a category</option>
                {ACTIVITY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ac-subgroup">Sub-group</Label>
              <Input
                id="ac-subgroup"
                value={draft.subgroup ?? ""}
                onChange={(e) => setDraft({ ...draft, subgroup: e.target.value })}
                placeholder="e.g. Canopy management"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ac-unit">Unit of measure *</Label>
              <Input
                id="ac-unit"
                value={draft.unitOfMeasure}
                onChange={(e) => setDraft({ ...draft, unitOfMeasure: e.target.value })}
                placeholder="e.g. ha, kg, tree"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ac-status">Status</Label>
              <select
                id="ac-status"
                value={draft.active ? "active" : "inactive"}
                onChange={(e) => setDraft({ ...draft, active: e.target.value === "active" })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ac-desc">Description</Label>
              <Textarea
                id="ac-desc"
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Optional notes on scope or operational context"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={!canSubmitCreate}>
              Save activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setImportPreview(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import from workbook</DialogTitle>
          </DialogHeader>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelect(file);
              e.target.value = "";
            }}
          />

          {!importPreview ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border py-12 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" aria-hidden />
              <div>
                <p className="text-sm font-medium">Select the Silva Annual Plan workbook</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reads unique activity codes from the Benchmark Data sheet, skips duplicate
                  scenario rows, and excludes aggregate totals.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importPreviewing}
              >
                {importPreviewing ? "Previewing…" : "Choose file (.xlsx)"}
              </Button>
            </div>
          ) : (
            <ImportPreviewPanel
              preview={importPreview}
              selected={selectedImportRows}
              onToggle={(code) =>
                setSelectedImportRows((prev) => {
                  const next = new Set(prev);
                  next.has(code) ? next.delete(code) : next.add(code);
                  return next;
                })
              }
              onToggleAll={(codes, select) =>
                setSelectedImportRows((prev) => {
                  const next = new Set(prev);
                  codes.forEach((c) => (select ? next.add(c) : next.delete(c)));
                  return next;
                })
              }
            />
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setImportOpen(false);
                setImportPreview(null);
              }}
            >
              Cancel
            </Button>
            {importPreview ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importCommitting}
                >
                  Choose different file
                </Button>
                <Button
                  onClick={() => void handleCommitImport()}
                  disabled={importCommitting || selectedImportRows.size === 0}
                >
                  {importCommitting
                    ? "Importing…"
                    : `Import ${selectedImportRows.size} ${selectedImportRows.size === 1 ? "activity" : "activities"}`}
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function ImportPreviewPanel({
  preview,
  selected,
  onToggle,
  onToggleAll,
}: {
  preview: ActivityWorkbookImportPreview;
  selected: Set<string>;
  onToggle: (code: string) => void;
  onToggleAll: (codes: string[], select: boolean) => void;
}) {
  const newCodes = preview.newActivities.map((r) => r.code);
  const allSelected = newCodes.length > 0 && newCodes.every((c) => selected.has(c));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
          {preview.newActivities.length} new
        </span>
        {preview.matches.length > 0 && (
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
            {preview.matches.length} already exist
          </span>
        )}
        {preview.conflicts.length > 0 && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {preview.conflicts.length} code conflicts
          </span>
        )}
        {preview.invalid.length > 0 && (
          <span className="rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
            {preview.invalid.length} invalid
          </span>
        )}
        {preview.aggregates.length > 0 && (
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
            {preview.aggregates.length} aggregate rows skipped
          </span>
        )}
      </div>

      {preview.newActivities.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">New activities to import</p>
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => onToggleAll(newCodes, !allSelected)}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {preview.newActivities.map((row) => (
              <ImportRow
                key={row.code}
                row={row}
                checked={selected.has(row.code)}
                onToggle={() => onToggle(row.code)}
              />
            ))}
          </div>
        </div>
      )}

      {preview.conflicts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Code conflicts (skipped)
          </p>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-amber-200 dark:border-amber-800 divide-y divide-border">
            {preview.conflicts.map((row) => (
              <div key={row.code} className="flex items-start gap-3 px-3 py-2.5 text-xs">
                <span className="font-mono text-muted-foreground w-14 shrink-0">{row.code}</span>
                <span className="flex-1 text-foreground">{row.name}</span>
                <span className="text-amber-600 dark:text-amber-400 shrink-0">
                  Existing record differs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {preview.invalid.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">Invalid rows (skipped)</p>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-destructive/30 divide-y divide-border">
            {preview.invalid.map((row) => (
              <div
                key={`${row.code}-${row.sourceRow}`}
                className="flex items-start gap-3 px-3 py-2.5 text-xs"
              >
                <span className="font-mono text-muted-foreground w-14 shrink-0">
                  {row.code || "—"}
                </span>
                <span className="flex-1 text-foreground">{row.name || "—"}</span>
                <span className="text-destructive shrink-0">{row.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ImportRow({
  row,
  checked,
  onToggle,
}: {
  row: ActivityWorkbookImportRow;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 px-3 py-2.5 text-xs transition-colors hover:bg-muted/50",
        checked && "bg-primary/5",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-border accent-primary"
      />
      <span className="w-14 shrink-0 font-mono text-muted-foreground">{row.code}</span>
      <span className="flex-1 font-medium text-foreground">{row.name}</span>
      <span className="shrink-0 text-muted-foreground">{row.category}</span>
      <span className="shrink-0 rounded border border-border bg-card px-1.5 py-0.5">
        {row.unitOfMeasure}
      </span>
    </label>
  );
}
