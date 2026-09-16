"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Landmark, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { TableMessageRow, TablePagination, TableSkeleton, TableToolbar } from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
import { MultiCheck } from "@/components/cropfort/multi-check";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Badge } from "@/components/ui/badge";
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
  createAssetOwner,
  deleteAssetOwner,
  getAssetOwners,
  getBlocks,
  getFarmAreas,
  getOrganizations,
  updateAssetOwner,
} from "@/lib/api/org-map";
import type { AdminOrganization, AssetOwner, FarmArea, FarmBlockRef } from "@/types/cropfort-modules";

const PAGE_SIZE = 10;
const NONE = "__none__";

type Form = {
  name: string;
  organizationId: string;
  contactEmail: string;
  contactPhone: string;
  farmAreaIds: string[];
  blockIds: string[];
};

const EMPTY: Form = {
  name: "",
  organizationId: NONE,
  contactEmail: "",
  contactPhone: "",
  farmAreaIds: [],
  blockIds: [],
};

export default function AssetOwnersPage() {
  const { user } = useCropfortAuth();
  const canEdit = canManageOrgMap(user.role);
  const [owners, setOwners] = useState<AssetOwner[]>([]);
  const [orgs, setOrgs] = useState<AdminOrganization[]>([]);
  const [areas, setAreas] = useState<FarmArea[]>([]);
  const [blocks, setBlocks] = useState<FarmBlockRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssetOwner | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<AssetOwner | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [ao, o, a, b] = await Promise.all([getAssetOwners(), getOrganizations(), getFarmAreas(), getBlocks()]);
      setOwners(ao);
      setOrgs(o);
      setAreas(a);
      setBlocks(b);
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
    if (!q) return owners;
    return owners.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.contactEmail ?? "").toLowerCase().includes(q) ||
        (a.contactPhone ?? "").includes(q)
    );
  }, [owners, debounced]);

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const orgName = (id: string | null) => orgs.find((o) => o.id === id)?.name ?? "—";
  const areaNames = (ids: string[]) =>
    ids
      .map((id) => areas.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .join(", ") || "—";

  const startEdit = (owner?: AssetOwner) => {
    setEditing(owner ?? null);
    setForm(
      owner
        ? {
            name: owner.name,
            organizationId: owner.organizationId ?? NONE,
            contactEmail: owner.contactEmail ?? "",
            contactPhone: owner.contactPhone ?? "",
            farmAreaIds: owner.farmAreaIds,
            blockIds: owner.blockIds,
          }
        : EMPTY
    );
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      name: form.name.trim(),
      organizationId: form.organizationId === NONE ? null : form.organizationId,
      contactEmail: form.contactEmail.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      farmAreaIds: form.farmAreaIds,
      blockIds: form.blockIds,
    };
    setBusy(true);
    try {
      if (editing) await updateAssetOwner(editing.id, payload);
      else await createAssetOwner(payload);
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
        title="Asset owners"
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => startEdit()}>
              <Plus className="h-4 w-4" aria-hidden />
              Create asset owner
            </Button>
          ) : null
        }
      />
      <SectionCard flush>
        <div className="border-b px-4 py-3">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search name or contact" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Organization</TableHead>
              <TableHead scope="col">Farm areas</TableHead>
              <TableHead scope="col">Blocks</TableHead>
              <TableHead scope="col">Contact</TableHead>
              {canEdit ? <TableHead scope="col" className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : paged.length === 0 ? (
              <TableMessageRow colSpan={6} icon={Landmark} title="No asset owners" />
            ) : (
              paged.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{orgName(a.organizationId)}</TableCell>
                  <TableCell className="max-w-[14rem] truncate text-sm">{areaNames(a.farmAreaIds)}</TableCell>
                  <TableCell>
                    <Badge variant="muted">{a.blockIds.length}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[a.contactEmail, a.contactPhone].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${a.name}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEdit(a)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(a)}>
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
            <DialogTitle>{editing ? "Edit asset owner" : "Create asset owner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="Name"
              required
              render={(props) => <Input {...props} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            />
            <FormField
              label="Organization"
              optional
              render={({ id }) => (
                <Select value={form.organizationId} onValueChange={(v) => setForm({ ...form, organizationId: v })}>
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {orgs.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              label="Contact email"
              optional
              render={(props) => (
                <Input
                  {...props}
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                />
              )}
            />
            <FormField
              label="Contact phone"
              optional
              render={(props) => (
                <Input {...props} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
              )}
            />
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
        title="Delete asset owner?"
        confirmLabel="Delete"
        loading={busy}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setBusy(true);
          try {
            await deleteAssetOwner(deleteTarget.id);
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
