"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Grid2x2, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { TableMessageRow, TablePagination, TableSkeleton, TableToolbar } from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
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
  createBlock,
  deleteBlock,
  getBlocks,
  getFarmAreas,
  updateBlock,
} from "@/lib/api/org-map";
import type { EntityStatus, FarmArea, FarmBlockRef } from "@/types/cropfort-modules";

const PAGE_SIZE = 12;
const NONE = "__none__";

type Form = {
  code: string;
  name: string;
  hectares: string;
  farmAreaId: string;
  status: EntityStatus;
};

const EMPTY: Form = {
  code: "",
  name: "",
  hectares: "",
  farmAreaId: NONE,
  status: "active",
};

export default function BlocksPage() {
  const { user } = useCropfortAuth();
  const canEdit = canManageOrgMap(user.role);
  const [blocks, setBlocks] = useState<FarmBlockRef[]>([]);
  const [areas, setAreas] = useState<FarmArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FarmBlockRef | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<FarmBlockRef | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [b, a] = await Promise.all([getBlocks(), getFarmAreas()]);
      setBlocks(b);
      setAreas(a);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const areaName = useCallback(
    (id?: string | null) => (id ? areas.find((a) => a.id === id)?.name ?? "—" : "Unassigned"),
    [areas],
  );

  const visible = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return blocks;
    return blocks.filter(
      (b) =>
        b.code.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        areaName(b.farmAreaId).toLowerCase().includes(q),
    );
  }, [blocks, debounced, areaName]);

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (block: FarmBlockRef) => {
    setEditing(block);
    setForm({
      code: block.code,
      name: block.name,
      hectares: block.hectares ? String(block.hectares) : "",
      farmAreaId: block.farmAreaId || NONE,
      status: block.status || "active",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        hectares: form.hectares.trim() ? form.hectares : null,
        farmAreaId: form.farmAreaId === NONE ? null : form.farmAreaId,
        status: form.status,
      };
      if (editing) await updateBlock(editing.id, payload);
      else await createBlock(payload);
      toast.success(editing ? "Block updated" : "Block created");
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
        title="Blocks"
        actions={
          canEdit ? (
            <Button size="sm" className="h-11 w-full sm:h-9 sm:w-auto" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              New block
            </Button>
          ) : null
        }
      />

      <SectionCard flush>
        <div className="border-b px-4 py-3">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search code, name, or farm area" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Code</TableHead>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Farm area</TableHead>
              <TableHead scope="col" className="text-right">
                Hectares
              </TableHead>
              <TableHead scope="col">Status</TableHead>
              {canEdit ? <TableHead scope="col" className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={8} columns={canEdit ? 6 : 5} />
            ) : paged.length === 0 ? (
              <TableMessageRow colSpan={canEdit ? 6 : 5} icon={Grid2x2} title="No blocks yet" />
            ) : (
              paged.map((block) => (
                <TableRow key={block.id}>
                  <TableCell className="font-mono text-xs">{block.code}</TableCell>
                  <TableCell className="font-medium">{block.name}</TableCell>
                  <TableCell className="text-muted-foreground">{areaName(block.farmAreaId)}</TableCell>
                  <TableCell className="cf-numeric text-right">{block.hectares || "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={block.status || "active"} />
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${block.code}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(block)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(block)}>
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
        <TablePagination page={page} pageCount={pageCount} total={visible.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit block" : "New block"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="Code"
              required
              render={(props) => (
                <Input
                  {...props}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. SH-04"
                />
              )}
            />
            <FormField
              label="Name"
              required
              render={(props) => (
                <Input
                  {...props}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Riverside"
                />
              )}
            />
            <FormField
              label="Hectares"
              render={(props) => (
                <Input
                  {...props}
                  inputMode="decimal"
                  value={form.hectares}
                  onChange={(e) => setForm({ ...form, hectares: e.target.value })}
                />
              )}
            />
            <FormField
              label="Farm area"
              render={({ id }) => (
                <Select value={form.farmAreaId} onValueChange={(v) => setForm({ ...form, farmAreaId: v })}>
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Unassigned</SelectItem>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete block?"
        confirmLabel="Delete"
        loading={busy}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setBusy(true);
          try {
            await deleteBlock(deleteTarget.id);
            toast.success("Block deleted");
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
