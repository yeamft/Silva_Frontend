"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers, ListChecks, Plus, Upload } from "lucide-react";
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { TableToolbar } from "@/components/cropfort/data-table";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { CompactSummaryCards, PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
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
  updateActivity,
  type ActivityWorkbookImportPreview,
  type ActivityWorkbookImportRow,
  type CreateActivityInput,
  type PlatformActivity,
} from "@/lib/api/activities";
import { canProposeRateCard, canViewRateCard } from "@/lib/cropfortAccess";
import { useActivities } from "@/lib/query";
import { cn } from "@/lib/utils";

const col = createColumnHelper<PlatformActivity>();

/** Suggested categories; anything already in the catalogue is offered too. */
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

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60";

export default function ActivityTaxonomyView() {
  const { user, activeProgram } = useCropfortAuth();
  const canView =
    canViewRateCard(user.role) ||
    user.role === "spx_platform_admin" ||
    user.role === "spx_validator";
  const canManage = canProposeRateCard(user.role);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [q, setQ] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformActivity | null>(null);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [draft, setDraft] = useState<CreateActivityInput>(BLANK_DRAFT);
  const [importPreview, setImportPreview] = useState<ActivityWorkbookImportPreview | null>(null);
  const [importPreviewing, setImportPreviewing] = useState(false);
  const [importCommitting, setImportCommitting] = useState(false);
  const [selectedImportRows, setSelectedImportRows] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Managers see inactive activities too, so a deactivated one can be found and reactivated
  const query = useActivities({ includeInactive: canManage }, canView);
  const rows = query.data ?? EMPTY_ROWS;

  const categories = useMemo(
    () =>
      [...new Set([...ACTIVITY_CATEGORIES, ...rows.map((r) => r.category).filter(Boolean)])].sort((a, b) =>
        a.localeCompare(b),
      ),
    [rows],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (categoryFilter === "all" || r.category === categoryFilter) &&
        (!term ||
          `${r.name} ${r.code} ${r.subgroup || ""} ${r.nameAm || ""}`.toLowerCase().includes(term)),
    );
  }, [rows, q, categoryFilter]);

  const activeCount = rows.filter((r) => r.active !== false).length;
  const inactiveCount = rows.length - activeCount;
  const categoryCount = useMemo(() => new Set(rows.map((r) => r.category)).size, [rows]);

  const openEditor = (activity?: PlatformActivity) => {
    setEditing(activity ?? null);
    setDraft(
      activity
        ? {
            code: activity.code,
            name: activity.name,
            nameAm: activity.nameAm ?? "",
            tier: (activity.tier as 1 | 2 | 3) || 1,
            category: activity.category,
            subgroup: activity.subgroup ?? "",
            unitOfMeasure: activity.unitOfMeasure,
            description: activity.description ?? "",
            active: activity.active !== false,
            sortOrder: activity.sortOrder ?? 0,
          }
        : BLANK_DRAFT,
    );
    setEditorOpen(true);
  };

  const columns = useMemo(
    () => [
      col.accessor("name", {
        header: "Activity",
        cell: (c) => {
          const row = c.row.original;
          return (
            <div className="flex min-w-[14rem] items-center gap-2.5 py-1">
              <span className="shrink-0 rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {row.code}
              </span>
              <span className="min-w-0">
                <span className={cn("block truncate font-medium", row.active === false && "text-muted-foreground")}>
                  {row.name}
                </span>
                {row.subgroup ? (
                  <span className="block truncate text-xs text-muted-foreground">{row.subgroup}</span>
                ) : null}
              </span>
            </div>
          );
        },
      }),
      col.accessor("category", { header: "Category" }),
      col.accessor("unitOfMeasure", { header: "Unit", size: 90 }),
      col.accessor((r) => (r.active === false ? "inactive" : "active"), {
        id: "status",
        header: "Status",
        size: 100,
        cell: (c) => <StatusBadge status={c.getValue()} />,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    initialState: { pagination: { pageSize: 25 } },
    state: { columnVisibility: { status: inactiveCount > 0 } },
  });

  // New filter → back to the first page
  useEffect(() => {
    table.setPageIndex(0);
  }, [q, categoryFilter, table]);

  if (!canView) return <NotAuthorized title="Activity Taxonomy" />;

  const canSubmit =
    draft.code.trim() && draft.name.trim() && draft.category.trim() && draft.unitOfMeasure.trim();

  const handleSave = async () => {
    if (!canSubmit) return;
    const payload = {
      ...draft,
      code: draft.code.trim(),
      name: draft.name.trim(),
      nameAm: draft.nameAm?.trim() || undefined,
      category: draft.category.trim(),
      subgroup: draft.subgroup?.trim() || "",
      unitOfMeasure: draft.unitOfMeasure.trim(),
      description: draft.description?.trim() || undefined,
    };
    setSaving(true);
    try {
      if (editing) {
        // The code is referenced by rate cards and plans, so it stays fixed once created
        const { code: _code, ...patch } = payload;
        void _code;
        await updateActivity(editing.id, patch);
        toast.success("Activity updated.");
      } else {
        await createActivity(payload);
        toast.success("Activity created.");
      }
      setEditorOpen(false);
      void query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save activity.");
    } finally {
      setSaving(false);
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

  const activeFilterCount = categoryFilter !== "all" ? 1 : 0;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Standards & Rates"}
        title="Activities"
        description="The standard farm activities that plans, surveys and rate cards are built from."
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Standards & Rates", href: CROPFORT_ROUTES.activityTaxonomy },
          { label: "Activities" },
        ]}
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-1.5 h-4 w-4" aria-hidden />
                Import
              </Button>
              <Button size="sm" onClick={() => openEditor()}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                New activity
              </Button>
            </div>
          ) : null
        }
      />

      <CompactSummaryCards
        label="Activity summary"
        items={[
          {
            id: "registered",
            label: "Active activities",
            value: query.isLoading ? "—" : String(activeCount),
            icon: ListChecks,
          },
          {
            id: "categories",
            label: "Categories",
            value: query.isLoading ? "—" : String(categoryCount),
            icon: Layers,
            footnote: inactiveCount ? `${inactiveCount} inactive activities` : undefined,
          },
        ]}
      />

      <SectionCard flush>
        <div className="border-b px-4 py-3">
          <TableToolbar
            search={q}
            onSearchChange={setQ}
            searchPlaceholder="Search name, code or sub-group"
            activeFilterCount={activeFilterCount}
            onClearFilters={() => {
              setCategoryFilter("all");
            }}
            filters={
              <>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger aria-label="Filter by category" className="h-8 w-[190px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
            actions={
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {filtered.length} of {rows.length}
              </span>
            }
          />
        </div>
        <DataTable
          table={table}
          loading={query.isLoading}
          onRowClick={canManage ? (row) => openEditor(row.original) : undefined}
          emptyTitle={q || activeFilterCount ? "No activities match" : "No activities yet"}
          emptyDescription={
            q || activeFilterCount
              ? "Try another name, code, category or type."
              : canManage
                ? "Add activities one by one or import them from the annual plan workbook."
                : undefined
          }
        />
      </SectionCard>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.code}` : "New activity"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="ac-code">Activity code *</Label>
              <Input
                id="ac-code"
                value={draft.code}
                disabled={Boolean(editing)}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="e.g. MC-03"
              />
              {editing ? (
                <p className="text-xs text-muted-foreground">Codes can&apos;t change once rates and plans use them.</p>
              ) : null}
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
                className={selectClass}
              >
                <option value="">Choose a category</option>
                {categories.map((cat) => (
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
                className={selectClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive — hidden from new plans and surveys</option>
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
            <DialogFooter className="pt-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Save activity"}
              </Button>
            </DialogFooter>
          </form>
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
                  if (next.has(code)) next.delete(code);
                  else next.add(code);
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
