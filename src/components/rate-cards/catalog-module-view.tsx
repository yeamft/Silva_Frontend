"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { CatalogExportButton } from "@/components/catalogs/export-button";
import { CatalogImportDialog } from "@/components/catalogs/import-dialog";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { TableToolbar } from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { MetricCard, PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { DataTable } from "@/components/cropfort/tanstack-data-table";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CatalogResourceType } from "@/lib/api/catalog-import-export";
import type { CatalogResource } from "@/lib/api/rate-cards";
import { canManageCatalogs } from "@/lib/cropfortAccess";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type CatalogRow = CatalogResource & { stockQuantity?: number };

type FormState = {
  name: string;
  description: string;
  defaultUnit: string;
  stockQuantity: string;
};

const EMPTY: FormState = { name: "", description: "", defaultUnit: "", stockQuantity: "" };
const col = createColumnHelper<CatalogRow>();

export function CatalogModuleView({
  resource,
  title,
  description,
  newLabel,
  rows,
  loading,
  showStock,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
}: {
  resource: CatalogResourceType;
  title: string;
  description?: string;
  newLabel: string;
  rows: CatalogRow[];
  loading: boolean;
  showStock?: boolean;
  onCreate: (input: {
    name: string;
    description?: string | null;
    defaultUnit: string;
    stockQuantity?: number;
  }) => Promise<unknown>;
  onUpdate: (
    id: string,
    input: {
      name?: string;
      description?: string | null;
      defaultUnit?: string;
      stockQuantity?: number;
      isActive?: boolean;
    },
  ) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onRefresh?: () => void;
}) {
  const { user } = useCropfortAuth();
  const canView = canManageCatalogs(user.role);
  const canEdit = canManageCatalogs(user.role);

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<CatalogRow | null>(null);

  // Keep isActive column filter in sync with select
  useEffect(() => {
    if (activeFilter === "all") {
      setColumnFilters((prev) => prev.filter((f) => f.id !== "isActive"));
    } else {
      setColumnFilters([{ id: "isActive", value: activeFilter === "active" }]);
    }
  }, [activeFilter]);

  const columns = useMemo(
    () => [
      col.accessor("name", {
        header: "Name",
        cell: (info) => (
          <div>
            <p className="font-medium">{info.getValue()}</p>
            {info.row.original.description ? (
              <p className="text-xs text-muted-foreground">{info.row.original.description}</p>
            ) : null}
          </div>
        ),
        filterFn: "includesString",
      }),
      col.accessor("defaultUnit", {
        header: "Default unit",
        cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
        enableSorting: true,
      }),
      ...(showStock
        ? [
            col.accessor((r) => r.stockQuantity ?? 0, {
              id: "stockQuantity",
              header: "Stock",
              meta: { align: "right" as const },
              cell: (info) => (
                <span className="cf-numeric">{info.getValue()}</span>
              ),
            }),
          ]
        : []),
      col.accessor("isActive", {
        header: "Status",
        cell: (info) => (
          <StatusBadge status={info.getValue() ? "active" : "inactive"} />
        ),
        filterFn: (row, _id, value) => row.original.isActive === value,
        enableSorting: true,
      }),
      col.display({
        id: "actions",
        header: () => <span className="block w-full text-right">Actions</span>,
        enableSorting: false,
        cell: ({ row }) => {
          if (!canEdit) return <span className="text-xs text-muted-foreground">—</span>;
          const r = row.original;
          return (
            <div className="flex justify-end gap-1">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  setEditing(r);
                  setForm({
                    name: r.name,
                    description: r.description || "",
                    defaultUnit: r.defaultUnit,
                    stockQuantity: r.stockQuantity != null ? String(r.stockQuantity) : "",
                  });
                  setOpen(true);
                }}
              >
                Edit
              </Button>
              {r.isActive ? (
                <Button
                  size="xs"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeactivateTarget(r)}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await onUpdate(r.id, { isActive: true });
                      toast.success("Reactivated");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed");
                    }
                  }}
                >
                  Reactivate
                </Button>
              )}
            </div>
          );
        },
      }),
    ],
    [canEdit, showStock, onUpdate],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      globalFilter: debounced,
      columnFilters,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue || "")
        .trim()
        .toLowerCase();
      if (!q) return true;
      const r = row.original;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        r.defaultUnit.toLowerCase().includes(q)
      );
    },
  });

  const activeCount = rows.filter((r) => r.isActive).length;
  const filteredCount = table.getFilteredRowModel().rows.length;

  if (!canView) return <NotAuthorized title={title} />;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.defaultUnit.trim()) {
      toast.error("Name and default unit are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        defaultUnit: form.defaultUnit.trim(),
        ...(showStock
          ? { stockQuantity: form.stockQuantity.trim() ? Number(form.stockQuantity) : 0 }
          : {}),
      };
      if (editing) await onUpdate(editing.id, payload);
      else await onCreate(payload);
      toast.success(editing ? "Updated" : "Created");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={title}
        actions={
          canEdit ? (
            <>
              <CatalogExportButton resource={resource} search={debounced} />
              <Button size="sm" variant="ghost" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" aria-hidden />
                Import
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" aria-hidden />
                {newLabel}
              </Button>
            </>
          ) : null
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard label="Active records" value={String(activeCount)} emphasis />
        <MetricCard label="In this view" value={String(filteredCount)} />
        <MetricCard label="Inactive" value={String(rows.length - activeCount)} />
      </section>

      <SectionCard flush>
        <div className="border-b border-border px-5 py-4">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name or unit"
            filters={
              <Select
                value={activeFilter}
                onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}
              >
                <SelectTrigger className="w-[140px]" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </div>
        <DataTable
          table={table}
          loading={loading}
          emptyTitle="No records yet"
          emptyDescription="Create a record or import a spreadsheet."
        />
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit record" : newLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField
              label="Name"
              required
              render={(props) => (
                <Input {...props} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              )}
            />
            <FormField
              label="Default unit"
              required
              render={(props) => (
                <Input
                  {...props}
                  value={form.defaultUnit}
                  onChange={(e) => setForm({ ...form, defaultUnit: e.target.value })}
                />
              )}
            />
            {showStock ? (
              <FormField
                label="Stock quantity"
                optional
                render={(props) => (
                  <Input
                    {...props}
                    inputMode="decimal"
                    value={form.stockQuantity}
                    onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                  />
                )}
              />
            ) : null}
            <FormField
              label="Description"
              optional
              render={(props) => (
                <Input
                  {...props}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              )}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CatalogImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        resource={resource}
        title={title}
        showStock={showStock}
        onImported={onRefresh}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(o) => !o && setDeactivateTarget(null)}
        title="Deactivate record?"
        description="Referenced catalog rows are soft-deactivated instead of hard-deleted when used on active rate cards."
        confirmLabel="Deactivate"
        onConfirm={async () => {
          if (!deactivateTarget) return;
          try {
            await onDelete(deactivateTarget.id);
            toast.success("Deactivated");
            setDeactivateTarget(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        }}
      />
    </PageContainer>
  );
}
