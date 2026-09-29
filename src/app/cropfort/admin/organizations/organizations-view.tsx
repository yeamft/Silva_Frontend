"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, MoreHorizontal, Plus, Store, Trees } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { TableMessageRow, TablePagination, TableSkeleton, TableToolbar } from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
import { PageContainer, PageHeader, SectionCard, StatusSummaryCards } from "@/components/cropfort/page-shell";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { canManageOrgMap } from "@/lib/cropfortAccess";
import {
  useCreateOrganization,
  useDeleteOrganization,
  useFarmAreas,
  useOrganizations,
  useUpdateOrganization,
  useVendors,
} from "@/lib/query";
import type { AdminOrganization, EntityStatus, OrganizationType } from "@/types/cropfort-modules";
import { ORGANIZATION_TYPES, ORG_TYPE_LABELS } from "@/types/cropfort-modules";

const PAGE_SIZE = 12;

export default function OrganizationsPage() {
  const { user } = useCropfortAuth();
  const canEdit = canManageOrgMap(user.role);

  const orgsQuery = useOrganizations();
  const areasQuery = useFarmAreas();
  const vendorsQuery = useVendors();
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();

  const orgs = orgsQuery.data ?? [];
  const areas = areasQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];
  const loading = orgsQuery.isLoading || areasQuery.isLoading || vendorsQuery.isLoading;
  const busy =
    createOrganization.isPending || updateOrganization.isPending || deleteOrganization.isPending;

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminOrganization | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<OrganizationType>("silva_estate");
  const [status, setStatus] = useState<EntityStatus>("active");
  const [deleteTarget, setDeleteTarget] = useState<AdminOrganization | null>(null);

  useEffect(() => {
    const err = orgsQuery.error || areasQuery.error || vendorsQuery.error;
    if (err) toast.error(err instanceof Error ? err.message : "Load failed");
  }, [orgsQuery.error, areasQuery.error, vendorsQuery.error]);

  const { farmCounts, vendorCounts } = useMemo(() => {
    const fc: Record<string, number> = {};
    const vc: Record<string, number> = {};
    for (const o of orgs) {
      const areaIds = areas.filter((a) => a.organizationId === o.id).map((a) => a.id);
      fc[o.id] = areaIds.length;
      vc[o.id] = vendors.filter((v) => v.farmAreaIds.some((id) => areaIds.includes(id))).length;
    }
    return { farmCounts: fc, vendorCounts: vc };
  }, [orgs, areas, vendors]);

  const visible = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return q ? orgs.filter((o) => o.name.toLowerCase().includes(q) || o.type.includes(q)) : orgs;
  }, [orgs, debounced]);

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const startEdit = (org?: AdminOrganization) => {
    setEditing(org ?? null);
    setName(org?.name ?? "");
    setType(org?.type ?? "silva_estate");
    setStatus(org?.status ?? "active");
    setOpen(true);
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administration"
        title="Organizations"
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => startEdit()}>
              <Plus className="h-4 w-4" aria-hidden />
              Create organization
            </Button>
          ) : null
        }
      />

      <StatusSummaryCards
        label="Organization map summary"
        columns={3}
        items={[
          {
            id: "orgs",
            label: "Organizations",
            value: String(orgs.length),
            icon: Building2,
            footnote: "Registered entities",
            emphasis: true,
          },
          {
            id: "vendors",
            label: "Vendors",
            value: String(vendors.length),
            icon: Store,
            footnote: "Delivery partners",
          },
          {
            id: "areas",
            label: "Farm areas",
            value: String(areas.length),
            icon: Trees,
            footnote: "Mapped estates",
          },
        ]}
      />

      <SectionCard flush>
        <div className="border-b px-4 py-3">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search name or type" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Type</TableHead>
              <TableHead scope="col" className="text-right">
                Farm areas
              </TableHead>
              <TableHead scope="col" className="text-right">
                Vendors
              </TableHead>
              <TableHead scope="col">Status</TableHead>
              {canEdit ? (
                <TableHead scope="col" className="text-right">
                  Actions
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={6} columns={canEdit ? 6 : 5} />
            ) : paged.length === 0 ? (
              <TableMessageRow colSpan={6} icon={Building2} title="No organizations" />
            ) : (
              paged.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{ORG_TYPE_LABELS[org.type]}</TableCell>
                  <TableCell className="cf-numeric text-right">{farmCounts[org.id] ?? 0}</TableCell>
                  <TableCell className="cf-numeric text-right">{vendorCounts[org.id] ?? 0}</TableCell>
                  <TableCell>
                    <StatusBadge status={org.status} />
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${org.name}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEdit(org)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(org)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit organization" : "Create organization"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="Name"
              required
              render={(props) => <Input {...props} value={name} onChange={(e) => setName(e.target.value)} />}
            />
            <FormField
              label="Type"
              render={({ id }) => (
                <Select value={type} onValueChange={(v) => setType(v as OrganizationType)}>
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORGANIZATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              label="Status"
              render={({ id }) => (
                <Select value={status} onValueChange={(v) => setStatus(v as EntityStatus)}>
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
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || busy}
              onClick={async () => {
                try {
                  if (editing) {
                    await updateOrganization.mutateAsync({
                      id: editing.id,
                      input: { name, type, status },
                    });
                  } else {
                    await createOrganization.mutateAsync({ name, type, status });
                  }
                  toast.success("Saved");
                  setOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Save failed");
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete organization?"
        confirmLabel="Delete"
        loading={busy}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteOrganization.mutateAsync(deleteTarget.id);
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
