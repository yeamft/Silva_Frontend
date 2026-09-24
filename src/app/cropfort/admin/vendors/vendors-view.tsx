"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Plus, Truck } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { TableMessageRow, TablePagination, TableSkeleton, TableToolbar } from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
import { MultiCheck } from "@/components/cropfort/multi-check";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { canManageOrgMap } from "@/lib/cropfortAccess";
import {
  useBlocks,
  useCreateVendor,
  useDeleteVendor,
  useFarmAreas,
  useUpdateVendor,
  useVendors,
} from "@/lib/query";
import {
  VENDOR_CATEGORIES,
  type VendorRecord,
  type VendorStatus,
} from "@/types/cropfort-modules";

const PAGE_SIZE = 12;
const STATUSES: VendorStatus[] = ["active", "pending", "expired", "terminated"];

type Form = {
  name: string;
  category: string;
  status: VendorStatus;
  prequalified: boolean;
  insuranceOnFile: boolean;
  farmAreaIds: string[];
  blockIds: string[];
};

const EMPTY: Form = {
  name: "",
  category: "",
  status: "pending",
  prequalified: false,
  insuranceOnFile: false,
  farmAreaIds: [],
  blockIds: [],
};

export default function VendorsPage() {
  const { user } = useCropfortAuth();
  const canEdit = canManageOrgMap(user.role);

  const vendorsQuery = useVendors();
  const areasQuery = useFarmAreas();
  const blocksQuery = useBlocks();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();

  const vendors = vendorsQuery.data ?? [];
  const areas = areasQuery.data ?? [];
  const blocks = blocksQuery.data ?? [];
  const loading = vendorsQuery.isLoading || areasQuery.isLoading || blocksQuery.isLoading;
  const busy = createVendor.isPending || updateVendor.isPending || deleteVendor.isPending;

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<"all" | VendorStatus>("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VendorRecord | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<VendorRecord | null>(null);

  useEffect(() => {
    const err = vendorsQuery.error || areasQuery.error || blocksQuery.error;
    if (err) toast.error(err instanceof Error ? err.message : "Load failed");
  }, [vendorsQuery.error, areasQuery.error, blocksQuery.error]);

  const visible = useMemo(() => {
    let list = vendors;
    const q = debounced.trim().toLowerCase();
    if (q) list = list.filter((v) => v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q));
    if (status !== "all") list = list.filter((v) => v.status === status);
    return list;
  }, [vendors, debounced, status]);

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const startEdit = (v?: VendorRecord) => {
    setEditing(v ?? null);
    setForm(
      v
        ? {
            name: v.name,
            category: v.category,
            status: v.status,
            prequalified: v.prequalified,
            insuranceOnFile: v.insuranceOnFile,
            farmAreaIds: v.farmAreaIds,
            blockIds: v.blockIds,
          }
        : EMPTY
    );
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.category.trim()) {
      toast.error("Name and category are required");
      return;
    }
    try {
      const payload = { ...form, name: form.name.trim(), category: form.category.trim() };
      if (editing) await updateVendor.mutateAsync({ id: editing.id, input: payload });
      else await createVendor.mutateAsync(payload);
      toast.success("Saved");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Vendors"
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => startEdit()}>
              <Plus className="h-4 w-4" aria-hidden />
              Create vendor
            </Button>
          ) : null
        }
      />
      <SectionCard flush>
        <div className="border-b px-4 py-3">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name or category"
            activeFilterCount={status !== "all" ? 1 : 0}
            onClearFilters={() => setStatus("all")}
            filters={
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="h-11 min-w-[8.5rem] shrink-0 sm:h-9 sm:w-[150px]" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Category</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col" className="text-right">
                Farm areas
              </TableHead>
              <TableHead scope="col" className="text-right">
                Blocks
              </TableHead>
              <TableHead scope="col">Prequalified</TableHead>
              <TableHead scope="col">Insurance</TableHead>
              {canEdit ? <TableHead scope="col" className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={6} columns={8} />
            ) : paged.length === 0 ? (
              <TableMessageRow colSpan={8} icon={Truck} title="No vendors" />
            ) : (
              paged.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.category}</TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="cf-numeric text-right">{v.farmAreaIds.length}</TableCell>
                  <TableCell className="cf-numeric text-right">{v.blockIds.length}</TableCell>
                  <TableCell>
                    <Badge variant={v.prequalified ? "success" : "muted"}>{v.prequalified ? "Yes" : "No"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={v.insuranceOnFile ? "success" : "warning"}>
                      {v.insuranceOnFile ? "On file" : "Missing"}
                    </Badge>
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${v.name}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEdit(v)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(v)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          page={page}
          pageCount={Math.max(1, Math.ceil(visible.length / PAGE_SIZE))}
          total={visible.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit vendor" : "Create vendor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="Name"
              required
              render={(props) => <Input {...props} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            />
            <FormField
              label="Category"
              required
              render={({ id }) => {
                const options = form.category && !(VENDOR_CATEGORIES as readonly string[]).includes(form.category)
                  ? [form.category, ...VENDOR_CATEGORIES]
                  : [...VENDOR_CATEGORIES];
                return (
                  <Select value={form.category || undefined} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger id={id}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              }}
            />
            <FormField
              label="Status"
              render={({ id }) => (
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as VendorStatus })}>
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.prequalified}
                  onCheckedChange={(v) => setForm({ ...form, prequalified: v === true })}
                />
                Prequalified
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.insuranceOnFile}
                  onCheckedChange={(v) => setForm({ ...form, insuranceOnFile: v === true })}
                />
                Insurance on file
              </label>
            </div>
            <MultiCheck
              legend="Farm areas"
              options={areas.map((a) => ({ value: a.id, label: a.name }))}
              values={form.farmAreaIds}
              onChange={(farmAreaIds) => setForm({ ...form, farmAreaIds })}
            />
            <MultiCheck
              legend="Blocks"
              options={blocks.map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` }))}
              values={form.blockIds}
              onChange={(blockIds) => setForm({ ...form, blockIds })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete vendor?"
        confirmLabel="Delete"
        loading={busy}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteVendor.mutateAsync(deleteTarget.id);
            toast.success("Deleted");
            setDeleteTarget(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Delete failed");
          }
        }}
      />
    </PageContainer>
  );
}
