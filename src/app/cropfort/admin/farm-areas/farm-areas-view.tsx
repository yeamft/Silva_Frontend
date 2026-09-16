"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPinned, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { TableMessageRow, TablePagination, TableSkeleton, TableToolbar } from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
import { MultiCheck } from "@/components/cropfort/multi-check";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
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
  createFarmArea,
  deleteFarmArea,
  getAssetOwners,
  getBlocks,
  getFarmAreas,
  getOrganizations,
  getVendors,
  updateFarmArea,
} from "@/lib/api/org-map";
import type {
  AdminOrganization,
  AssetOwner,
  EntityStatus,
  FarmArea,
  FarmBlockRef,
  VendorRecord,
} from "@/types/cropfort-modules";

const PAGE_SIZE = 10;

type Form = {
  name: string;
  organizationId: string;
  totalHectares: string;
  status: EntityStatus;
  blockIds: string[];
  vendorIds: string[];
  assetOwnerIds: string[];
};

const EMPTY: Form = {
  name: "",
  organizationId: "",
  totalHectares: "",
  status: "active",
  blockIds: [],
  vendorIds: [],
  assetOwnerIds: [],
};

export default function FarmAreasPage() {
  const { user } = useCropfortAuth();
  const canEdit = canManageOrgMap(user.role);
  const [areas, setAreas] = useState<FarmArea[]>([]);
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [blocks, setBlocks] = useState<FarmBlockRef[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [owners, setOwners] = useState<AssetOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FarmArea | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<FarmArea | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [a, o, b, v, ao] = await Promise.all([
        getFarmAreas(),
        getOrganizations(),
        getBlocks(),
        getVendors(),
        getAssetOwners(),
      ]);
      setAreas(a);
      setOrgs(o);
      setBlocks(b);
      setVendors(v);
      setOwners(ao);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter((a) => {
      const org = orgs.find((o) => o.id === a.organizationId)?.name ?? "";
      return a.name.toLowerCase().includes(q) || org.toLowerCase().includes(q);
    });
  }, [areas, orgs, debounced]);

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? "—";
  const names = (ids: string[], list: { id: string; name: string }[]) =>
    ids
      .map((id) => list.find((x) => x.id === id)?.name)
      .filter(Boolean)
      .join(", ") || "—";

  const startEdit = (area?: FarmArea) => {
    setEditing(area ?? null);
    setForm(
      area
        ? {
            name: area.name,
            organizationId: area.organizationId,
            totalHectares: String(area.totalHectares),
            status: area.status,
            blockIds: area.blockIds,
            vendorIds: area.vendorIds,
            assetOwnerIds: area.assetOwnerIds,
          }
        : { ...EMPTY, organizationId: orgs[0]?.id ?? "" }
    );
    setOpen(true);
  };

  const save = async () => {
    const ha = Number(form.totalHectares);
    if (!form.name.trim() || !form.organizationId || !Number.isFinite(ha) || ha <= 0) {
      toast.error("Name, organization, and hectares are required");
      return;
    }
    const payload = {
      name: form.name,
      organizationId: form.organizationId,
      totalHectares: ha,
      status: form.status,
      blockIds: form.blockIds,
      vendorIds: form.vendorIds,
      assetOwnerIds: form.assetOwnerIds,
    };
    setBusy(true);
    try {
      if (editing) await updateFarmArea(editing.id, payload);
      else await createFarmArea(payload);
      toast.success("Saved");
      setOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Farm areas"
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => startEdit()}>
              <Plus className="h-4 w-4" aria-hidden />
              Create farm area
            </Button>
          ) : null
        }
      />
      <SectionCard flush>
        <div className="border-b px-4 py-3">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search farm or organization" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Organization</TableHead>
              <TableHead scope="col" className="text-right">
                Hectares
              </TableHead>
              <TableHead scope="col" className="text-right">
                Blocks
              </TableHead>
              <TableHead scope="col">Vendors</TableHead>
              <TableHead scope="col">Asset owners</TableHead>
              <TableHead scope="col">Status</TableHead>
              {canEdit ? <TableHead scope="col" className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={6} columns={8} />
            ) : paged.length === 0 ? (
              <TableMessageRow colSpan={8} icon={MapPinned} title="No farm areas" />
            ) : (
              paged.map((fa) => (
                <TableRow key={fa.id}>
                  <TableCell className="font-medium">{fa.name}</TableCell>
                  <TableCell>{orgName(fa.organizationId)}</TableCell>
                  <TableCell className="cf-numeric text-right">{fa.totalHectares.toLocaleString()}</TableCell>
                  <TableCell className="cf-numeric text-right">{fa.blockIds.length}</TableCell>
                  <TableCell className="max-w-[12rem] truncate text-sm">{names(fa.vendorIds, vendors)}</TableCell>
                  <TableCell className="max-w-[12rem] truncate text-sm">{names(fa.assetOwnerIds, owners)}</TableCell>
                  <TableCell>
                    <StatusBadge status={fa.status} />
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${fa.name}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEdit(fa)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(fa)}>
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
            <DialogTitle>{editing ? "Edit farm area" : "Create farm area"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="Name"
              required
              render={(props) => <Input {...props} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            />
            <FormField
              label="Organization"
              required
              render={({ id }) => (
                <Select value={form.organizationId} onValueChange={(v) => setForm({ ...form, organizationId: v })}>
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Total hectares"
                required
                render={(props) => (
                  <Input
                    {...props}
                    inputMode="decimal"
                    value={form.totalHectares}
                    onChange={(e) => setForm({ ...form, totalHectares: e.target.value })}
                  />
                )}
              />
              <FormField
                label="Status"
                render={({ id }) => (
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as EntityStatus })}>
                    <SelectTrigger id={id}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <MultiCheck
              legend="Blocks"
              options={blocks.map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` }))}
              values={form.blockIds}
              onChange={(blockIds) => setForm({ ...form, blockIds })}
            />
            <MultiCheck
              legend="Primary vendors"
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
              values={form.vendorIds}
              onChange={(vendorIds) => setForm({ ...form, vendorIds })}
            />
            <MultiCheck
              legend="Asset owners"
              options={owners.map((a) => ({ value: a.id, label: a.name }))}
              values={form.assetOwnerIds}
              onChange={(assetOwnerIds) => setForm({ ...form, assetOwnerIds })}
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
        title="Delete farm area?"
        confirmLabel="Delete"
        loading={busy}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setBusy(true);
          try {
            await deleteFarmArea(deleteTarget.id);
            toast.success("Deleted");
            setDeleteTarget(null);
            await reload();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Delete failed");
          } finally {
            setBusy(false);
          }
        }}
      />
    </PageContainer>
  );
}
