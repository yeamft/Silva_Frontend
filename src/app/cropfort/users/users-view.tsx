"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus, SearchX } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { TableMessageRow, TablePagination, TableSkeleton, TableToolbar } from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
import { MultiCheck } from "@/components/cropfort/multi-check";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { RoleBadge } from "@/components/cropfort/role-badge";
import { SortableHead, type SortDir } from "@/components/cropfort/sortable-head";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { canManageUsers } from "@/lib/cropfortAccess";
import {
  useActivateUser,
  useCreateUser,
  useDeleteUser,
  useRevokeUserSessions,
  useSuspendUser,
  useUpdateUser,
  useUserAuditTrail,
  useUsers,
  useUsersMeta,
} from "@/lib/query";
import type { UsersMeta } from "@/lib/api/users";
import { CROPFORT_ROLE_LABELS, type CropfortRole } from "@/types/cropfort";
import type { AccountStatus, AdminUser, UserOrgKind } from "@/types/cropfort-modules";
import { USER_ORG_LABELS } from "@/types/cropfort-modules";

const PAGE_SIZE = 20;

const ROLE_OPTIONS = (Object.keys(CROPFORT_ROLE_LABELS) as CropfortRole[]).map((value) => ({
  value,
  label: CROPFORT_ROLE_LABELS[value],
}));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UserForm = {
  name: string;
  email: string;
  organization: UserOrgKind;
  status: AccountStatus;
  roles: CropfortRole[];
  tenantIds: string[];
  blockIds: string[];
};

const EMPTY_FORM: UserForm = {
  name: "",
  email: "",
  organization: "spx",
  status: "invited",
  roles: [],
  tenantIds: [],
  blockIds: [],
};

function toForm(user: AdminUser): UserForm {
  return {
    name: user.name,
    email: user.email,
    organization: user.organization,
    status: user.status,
    roles: user.roles,
    tenantIds: user.tenants.map((t) => t.tenantId),
    blockIds: [...new Set(user.tenants.flatMap((t) => t.blockIds))],
  };
}

function toInput(
  form: UserForm,
  programs: UsersMeta["programs"],
) {
  return {
    name: form.name,
    email: form.email,
    organization: form.organization,
    status: form.status,
    roles: form.roles,
    tenants: form.tenantIds.map((id) => {
      const meta = programs.find((t) => t.tenantId === id);
      return {
        tenantId: id,
        tenantName: meta?.tenantName ?? id,
        roles: form.roles,
        blockIds: form.roles.includes("field_supervisor") ? form.blockIds : [],
      };
    }),
  };
}

export default function UsersAdminPage() {
  const { user: current } = useCropfortAuth();
  const allowed = canManageUsers(current.role);

  const usersQuery = useUsers(allowed);
  const metaQuery = useUsersMeta(allowed);
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const suspendUserMutation = useSuspendUser();
  const activateUserMutation = useActivateUser();
  const revokeSessionsMutation = useRevokeUserSessions();
  const deleteUserMutation = useDeleteUser();

  const rows = usersQuery.data ?? [];
  const programs = metaQuery.data?.programs ?? [];
  const blocks = metaQuery.data?.blocks ?? [];
  const loading = usersQuery.isLoading || metaQuery.isLoading;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<"all" | AccountStatus>("all");
  const [roleFilter, setRoleFilter] = useState<CropfortRole[]>([]);
  const [tenantFilter, setTenantFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);
  const [activateTarget, setActivateTarget] = useState<AdminUser | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [auditUser, setAuditUser] = useState<AdminUser | null>(null);

  const auditQuery = useUserAuditTrail(auditUser?.id ?? null, Boolean(auditUser));
  const audit = auditQuery.data ?? [];

  const saving = createUserMutation.isPending || updateUserMutation.isPending;
  const busy =
    suspendUserMutation.isPending ||
    activateUserMutation.isPending ||
    revokeSessionsMutation.isPending ||
    deleteUserMutation.isPending;

  useEffect(() => {
    const err = usersQuery.error || metaQuery.error;
    if (err) toast.error(err instanceof Error ? err.message : "Could not load users");
  }, [usersQuery.error, metaQuery.error]);

  useEffect(() => {
    if (auditQuery.error) {
      toast.error(auditQuery.error instanceof Error ? auditQuery.error.message : "Could not load audit trail");
    }
  }, [auditQuery.error]);

  const blockOptions = useMemo(() => {
    const tenantSet = new Set(form.tenantIds);
    return blocks
      .filter((b) => tenantSet.size === 0 || tenantSet.has(b.programId))
      .map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` }));
  }, [blocks, form.tenantIds]);

  const visible = useMemo(() => {
    let list = rows;
    const q = debouncedSearch.trim().toLowerCase();
    if (q) list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    if (status !== "all") list = list.filter((u) => u.status === status);
    if (roleFilter.length) list = list.filter((u) => u.roles.some((r) => roleFilter.includes(r)));
    if (tenantFilter.length) list = list.filter((u) => u.tenants.some((t) => tenantFilter.includes(t.tenantId)));
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "lastLoginAt") {
        return ((a.lastLoginAt ?? "") > (b.lastLoginAt ?? "") ? 1 : -1) * dir;
      }
      const av = String(a[sortKey as keyof AdminUser] ?? "");
      const bv = String(b[sortKey as keyof AdminUser] ?? "");
      return av.localeCompare(bv) * dir;
    });
  }, [rows, debouncedSearch, status, roleFilter, tenantFilter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, roleFilter, tenantFilter]);

  const onSort = (column: string) => {
    if (sortKey === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(column);
      setSortDir("asc");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm(toForm(u));
    setFormErrors({});
    setFormOpen(true);
  };

  const save = async () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Full name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!EMAIL_RE.test(form.email)) errors.email = "Enter a valid email address";
    if (form.roles.length === 0) errors.roles = "Select at least one role";
    if (form.tenantIds.length === 0) errors.tenants = "Select at least one program";
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      if (editing) {
        await updateUserMutation.mutateAsync({ id: editing.id, input: toInput(form, programs) });
        toast.success("User updated");
      } else {
        const result = await createUserMutation.mutateAsync(toInput(form, programs));
        if (form.status === "invited") {
          if (result.inviteSent) {
            toast.success("Invitation email sent");
          } else if (result.inviteUrl) {
            toast.success("Invite created — email not configured; copy the invite link");
            try {
              await navigator.clipboard.writeText(result.inviteUrl);
              toast.message("Invite link copied to clipboard");
            } catch {
              toast.message(result.inviteUrl);
            }
          } else {
            toast.success("User invite created");
          }
        } else {
          toast.success(
            result.temporaryPassword
              ? `User created. Temporary password: ${result.temporaryPassword}`
              : "User created",
          );
        }
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  if (!allowed) {
    return <NotAuthorized title="User management" />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Users"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" size="sm" className="h-11 w-full sm:h-9 sm:w-auto" asChild>
              <Link href={CROPFORT_ROUTES.userRoles}>Roles</Link>
            </Button>
            <Button size="sm" className="h-11 w-full sm:h-9 sm:w-auto" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              Create user
            </Button>
          </div>
        }
      />

      <SectionCard flush>
        <div className="space-y-3 border-b px-4 py-3">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name or email"
            activeFilterCount={[status !== "all", roleFilter.length > 0, tenantFilter.length > 0].filter(Boolean).length}
            onClearFilters={() => {
              setStatus("all");
              setRoleFilter([]);
              setTenantFilter([]);
            }}
            filters={
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="h-11 min-w-[8.5rem] shrink-0 sm:h-9 sm:w-[140px]" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <MultiCheck
              legend="Role"
              options={ROLE_OPTIONS}
              values={roleFilter}
              onChange={(v) => setRoleFilter(v as CropfortRole[])}
            />
            <MultiCheck
              legend="Program"
              options={programs.map((t) => ({ value: t.tenantId, label: t.tenantName }))}
              values={tenantFilter}
              onChange={setTenantFilter}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Name" column="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableHead label="Email" column="email" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <TableHead scope="col">Organization</TableHead>
              <TableHead scope="col">Roles</TableHead>
              <TableHead scope="col">Tenants</TableHead>
              <SortableHead label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableHead label="Created" column="createdAt" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableHead label="Last login" column="lastLoginAt" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={8} columns={9} />
            ) : paged.length === 0 ? (
              <TableMessageRow colSpan={9} icon={SearchX} title="No users match" />
            ) : (
              paged.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{USER_ORG_LABELS[u.organization]}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <RoleBadge key={r} role={r} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.tenants.map((t) => (
                        <Badge key={t.tenantId} variant="muted">
                          {t.tenantName}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${u.name}`}>
                          <MoreHorizontal className="h-4 w-4" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(u)}>Edit</DropdownMenuItem>
                        {u.status === "suspended" ? (
                          <DropdownMenuItem onClick={() => setActivateTarget(u)}>Activate</DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setSuspendTarget(u)}>Suspend</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setRevokeTarget(u)}>Revoke sessions</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAuditUser(u)}>
                          View audit trail
                        </DropdownMenuItem>
                        {u.neverLoggedIn ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(u)}>
                              Delete
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination page={page} pageCount={pageCount} total={visible.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </SectionCard>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "Create user"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="Full name"
              required
              error={formErrors.name}
              render={(props) => (
                <Input {...props} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              )}
            />
            <FormField
              label="Email"
              required
              error={formErrors.email}
              render={(props) => (
                <Input
                  {...props}
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Organization"
                render={({ id }) => (
                  <Select value={form.organization} onValueChange={(v) => setForm({ ...form, organization: v as UserOrgKind })}>
                    <SelectTrigger id={id}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(USER_ORG_LABELS) as UserOrgKind[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {USER_ORG_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {!editing ? (
                <FormField
                  label="Initial status"
                  render={({ id }) => (
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AccountStatus })}>
                      <SelectTrigger id={id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invited">Invited</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : null}
            </div>
            <MultiCheck
              legend="Roles"
              options={ROLE_OPTIONS}
              values={form.roles}
              onChange={(v) => setForm({ ...form, roles: v as CropfortRole[] })}
              error={formErrors.roles}
            />
            <MultiCheck
              legend="Programs"
              options={programs.map((t) => ({ value: t.tenantId, label: t.tenantName }))}
              values={form.tenantIds}
              onChange={(tenantIds) => setForm({ ...form, tenantIds })}
              error={formErrors.tenants}
            />
            {form.roles.includes("field_supervisor") ? (
              <MultiCheck
                legend="Blocks (field supervisor)"
                options={blockOptions}
                values={form.blockIds}
                onChange={(blockIds) => setForm({ ...form, blockIds })}
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(suspendTarget)}
        onOpenChange={(o) => !o && setSuspendTarget(null)}
        title="Suspend this account?"
        confirmLabel="Suspend"
        loading={busy}
        onConfirm={async () => {
          if (!suspendTarget) return;
          try {
            await suspendUserMutation.mutateAsync(suspendTarget.id);
            toast.success("Account suspended");
            setSuspendTarget(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(activateTarget)}
        onOpenChange={(o) => !o && setActivateTarget(null)}
        title="Activate this account?"
        confirmLabel="Activate"
        destructive={false}
        loading={busy}
        onConfirm={async () => {
          if (!activateTarget) return;
          try {
            await activateUserMutation.mutateAsync(activateTarget.id);
            toast.success("Account activated");
            setActivateTarget(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title="Revoke all sessions?"
        confirmLabel="Revoke sessions"
        loading={busy}
        onConfirm={async () => {
          if (!revokeTarget) return;
          try {
            await revokeSessionsMutation.mutateAsync(revokeTarget.id);
            toast.success("Sessions revoked");
            setRevokeTarget(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete this user?"
        confirmLabel="Delete"
        loading={busy}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteUserMutation.mutateAsync(deleteTarget.id);
            toast.success("User deleted");
            setDeleteTarget(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        }}
      />

      <Dialog open={Boolean(auditUser)} onOpenChange={(o) => !o && setAuditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit trail</DialogTitle>
          </DialogHeader>
          {auditQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
              {audit.map((e) => (
                <li key={e.id} className="rounded-md border px-3 py-2">
                  <p className="font-medium">{e.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.actorName} · {new Date(e.at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
