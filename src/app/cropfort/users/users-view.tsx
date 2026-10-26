"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Plus, SearchX, UserCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import {
  MultiSelectFilter,
  TableMessageRow,
  TablePagination,
  TableSkeleton,
  TableToolbar,
} from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
import { MultiCheck } from "@/components/cropfort/multi-check";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { CompactSummaryCards, PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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
  const [pageSize, setPageSize] = useState(20);

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

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const paged = visible.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, roleFilter, tenantFilter, sortKey, sortDir]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

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
        description="Find accounts, review access, and manage program assignments."
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

      <CompactSummaryCards
        label="Access and security summary"
        items={[
          { id: "users", label: "Users", value: loading ? "—" : String(rows.length), footnote: "Registered accounts", icon: Users },
          { id: "active", label: "Active", value: loading ? "—" : String(rows.filter((row) => row.status === "active").length), footnote: "Access enabled", icon: UserCheck },
          { id: "invited", label: "Invited", value: loading ? "—" : String(rows.filter((row) => row.status === "invited").length), footnote: "Awaiting activation", icon: UserPlus },
        ]}
      />

      <SectionCard flush>
        <div className="border-b px-4 py-3">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name or email"
            activeFilterCount={[status !== "all", roleFilter.length > 0, tenantFilter.length > 0].filter(Boolean).length}
            onClearFilters={() => {
              setStatus("all");
              setRoleFilter([]);
              setTenantFilter([]);
              setPage(1);
            }}
            filters={
              <>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger className="h-11 min-w-[8.5rem] shrink-0 sm:h-8 sm:w-[140px]" aria-label="Filter by status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <MultiSelectFilter
                  label="Role"
                  options={ROLE_OPTIONS}
                  selected={roleFilter}
                  onChange={(v) => setRoleFilter(v as CropfortRole[])}
                />
                {programs.length > 1 ? (
                  <MultiSelectFilter
                    label="Program"
                    options={programs.map((t) => ({ value: t.tenantId, label: t.tenantName }))}
                    selected={tenantFilter}
                    onChange={setTenantFilter}
                  />
                ) : null}
              </>
            }
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="User" column="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <TableHead scope="col">Organization</TableHead>
              <TableHead scope="col">Roles</TableHead>
              <TableHead scope="col">Programs</TableHead>
              <SortableHead label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableHead label="Last login" column="lastLoginAt" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={8} columns={7} />
            ) : paged.length === 0 ? (
              <TableMessageRow colSpan={7} icon={SearchX} title="No users match" />
            ) : (
              paged.map((u) => (
                <TableRow key={u.id} className="group">
                  <TableCell className="min-w-[15rem]">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0 border border-border/70">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {u.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="whitespace-nowrap bg-background font-medium text-muted-foreground"
                    >
                      {USER_ORG_LABELS[u.organization]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.roles.length > 0 ? (
                      <div
                        className="flex max-w-[15rem] flex-wrap items-center gap-1"
                        aria-label={`${u.roles.length} access role${u.roles.length === 1 ? "" : "s"}: ${u.roles.map((role) => CROPFORT_ROLE_LABELS[role]).join(", ")}`}
                      >
                        {u.roles.slice(0, 2).map((role) => (
                          <RoleBadge key={role} role={role} />
                        ))}
                        {u.roles.length > 2 ? (
                          <Badge
                            variant="secondary"
                            className="h-6 px-2 text-[11px]"
                            title={u.roles.slice(2).map((role) => CROPFORT_ROLE_LABELS[role]).join(", ")}
                          >
                            +{u.roles.length - 2} more
                          </Badge>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No roles assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.tenants.length > 0 ? (
                      <div
                        className="flex max-w-[14rem] flex-wrap items-center gap-1"
                        aria-label={`${u.tenants.length} assigned program${u.tenants.length === 1 ? "" : "s"}: ${u.tenants.map((tenant) => tenant.tenantName).join(", ")}`}
                      >
                        {u.tenants.slice(0, 2).map((tenant) => (
                          <Badge
                            key={tenant.tenantId}
                            variant="muted"
                            className="h-6 max-w-[9rem] truncate px-2 text-[11px]"
                            title={tenant.tenantName}
                          >
                            {tenant.tenantName}
                          </Badge>
                        ))}
                        {u.tenants.length > 2 ? (
                          <Badge
                            variant="secondary"
                            className="h-6 px-2 text-[11px]"
                            title={u.tenants.slice(2).map((tenant) => tenant.tenantName).join(", ")}
                          >
                            +{u.tenants.length - 2} more
                          </Badge>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No programs assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={u.status}
                      label={u.status === "invited" ? "Invited" : u.status === "active" ? "Active" : "Suspended"}
                      className="whitespace-nowrap"
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {u.lastLoginAt ? (
                      <time dateTime={u.lastLoginAt}>
                        {new Date(u.lastLoginAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </time>
                    ) : (
                      <span className="text-muted-foreground/80">Never logged in</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          aria-label={`Actions for ${u.name}`}
                        >
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
        <TablePagination
          page={page}
          pageCount={pageCount}
          total={visible.length}
          pageSize={pageSize}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
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
