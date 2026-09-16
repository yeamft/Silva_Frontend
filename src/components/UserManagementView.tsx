"use client";

import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore, type User, type UserRole } from "@/store/authStore";
import { ROLE_LABELS } from "@/lib/rbac";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  PageContainer,
  PageHeader,
  StatCard,
} from "@/components/cropfort/page-shell";
import {
  TableMessageRow,
  TablePagination,
  TableSkeleton,
  TableToolbar,
} from "@/components/cropfort/data-table";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { FormField } from "@/components/cropfort/form-field";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 8;

const ROLES: { value: UserRole; label: string }[] = (
  Object.entries(ROLE_LABELS) as [UserRole, string][]
).map(([value, label]) => ({ value, label }));

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function roleVariant(role: UserRole): "default" | "secondary" | "outline" {
  if (role === "silva_owner") return "default";
  if (role === "spx_principal") return "secondary";
  return "outline";
}

interface FormState {
  name: string;
  email: string;
  role: UserRole;
}

interface FormErrors {
  name?: string;
  email?: string;
}

const EMPTY_FORM: FormState = { name: "", email: "", role: "spx_principal" };

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email address";
  return errors;
}

const UserManagementView = () => {
  const currentUser = useAuthStore((s) => s.user);
  const usersData = useAuthStore((s) => s.usersData);
  const createUser = useAuthStore((s) => s.createUser);
  const updateUser = useAuthStore((s) => s.updateUser);
  const deleteUser = useAuthStore((s) => s.deleteUser);
  const setPassword = useAuthStore((s) => s.setPassword);
  const refreshUsers = useAuthStore((s) => s.refreshUsers);

  const users = useMemo(() => Object.values(usersData).map((e) => e.user), [usersData]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void refreshUsers().finally(() => {
      if (active) setLoadingUsers(false);
    });
    return () => {
      active = false;
    };
  }, [refreshUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, search, roleFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const roleCounts = useMemo(() => {
    const counts: Partial<Record<UserRole, number>> = {};
    users.forEach((u) => {
      counts[u.role] = (counts[u.role] ?? 0) + 1;
    });
    return counts;
  }, [users]);

  const activeFilters = (search ? 1 : 0) + (roleFilter !== "all" ? 1 : 0);
  const isFiltered = activeFilters > 0;

  const resetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setPage(1);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setCreateOpen(true);
  };

  const openEdit = (user: User) => {
    setForm({ name: user.name, email: user.email, role: user.role });
    setErrors({});
    setEditUser(user);
  };

  const openPassword = (user: User) => {
    setNewPassword("");
    setPasswordError(undefined);
    setPasswordUser(user);
  };

  const handleCreate = async () => {
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const result = await createUser(form.email, "", form.name, form.role);
    setSubmitting(false);

    if (result.success) {
      toast.success("User created", {
        description: result.generatedPin
          ? `Temporary password: ${result.generatedPin}`
          : `${form.name} can now sign in.`,
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    } else {
      toast.error("Could not create user", { description: result.error });
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const result = await updateUser(editUser.id, {
      name: form.name,
      email: form.email,
      role: form.role,
    });
    setSubmitting(false);

    if (result.success) {
      toast.success("Changes saved");
      setEditUser(null);
    } else {
      toast.error("Could not save changes", { description: result.error });
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setSubmitting(true);
    const result = await deleteUser(userToDelete.id);
    setSubmitting(false);

    if (result.success) {
      toast.success(`${userToDelete.name} was removed`);
      setUserToDelete(null);
    } else {
      toast.error("Could not delete user", { description: result.error });
    }
  };

  const handleSetPassword = async () => {
    if (!passwordUser) return;
    if (newPassword.trim().length < 4) {
      setPasswordError("Use at least 4 characters");
      return;
    }

    setSubmitting(true);
    const result = await setPassword(passwordUser.id, newPassword);
    setSubmitting(false);

    if (result.success) {
      toast.success("Password updated");
      setPasswordUser(null);
    } else {
      toast.error("Could not update password", { description: result.error });
    }
  };

  const formFields = (idPrefix: string) => (
    <div className="space-y-4">
      <FormField
        label="Full name"
        required
        error={errors.name}
        render={(props) => (
          <Input
            {...props}
            value={form.name}
            autoComplete="name"
            placeholder="e.g. Sara Mengistu"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        )}
      />
      <FormField
        label="Email address"
        required
        helper="Used as the sign-in identifier."
        error={errors.email}
        render={(props) => (
          <Input
            {...props}
            type="email"
            value={form.email}
            autoComplete="email"
            placeholder="name@example.com"
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        )}
      />
      <FormField
        label="Role"
        helper="Determines which modules this user can reach."
        render={({ id }) => (
          <Select
            value={form.role}
            onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}
          >
            <SelectTrigger id={id} key={`${idPrefix}-role`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        title="User management"
        description="Create accounts and control which desk each person can access."
        actions={
          <Button className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Add user
          </Button>
        }
      />

      <section aria-label="User summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total users" value={String(users.length)} icon={Users} emphasis />
        {ROLES.map((r) => (
          <StatCard key={r.value} label={r.label} value={String(roleCounts[r.value] ?? 0)} />
        ))}
      </section>

      <Card className="overflow-hidden">
        <div className="border-b p-3">
          <TableToolbar
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            searchPlaceholder="Search name or email"
            activeFilterCount={activeFilters}
            onClearFilters={resetFilters}
            filters={
              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v as UserRole | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[11rem]" aria-label="Filter by role">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-12 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingUsers ? (
              <TableSkeleton rows={5} columns={4} />
            ) : pageRows.length === 0 ? (
              <TableMessageRow
                colSpan={4}
                icon={isFiltered ? SearchX : UserRound}
                title={isFiltered ? "No matching users" : "No users yet"}
                description={
                  isFiltered
                    ? "Try a different search term or clear the filters."
                    : "Add your first user to give someone access."
                }
                action={
                  isFiltered ? (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button size="sm" className="gap-1.5" onClick={openCreate}>
                      <Plus className="h-4 w-4" aria-hidden />
                      Add user
                    </Button>
                  )
                }
              />
            ) : (
              pageRows.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                            {initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium">{u.name}</p>
                            {isSelf ? <Badge variant="muted">You</Badge> : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground sm:hidden">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleVariant(u.role)}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.name}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openEdit(u)}>
                            <Pencil className="mr-2 h-4 w-4" aria-hidden />
                            Edit details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPassword(u)}>
                            <KeyRound className="mr-2 h-4 w-4" aria-hidden />
                            Set password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={isSelf}
                            className="text-destructive focus:text-destructive"
                            onClick={() => setUserToDelete(u)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                            Delete user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {!loadingUsers ? (
          <TablePagination
            page={currentPage}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        ) : null}
      </Card>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              {isSupabaseConfigured
                ? "A temporary password is generated and shown once after creation."
                : "Create a desk account for this programme."}
            </DialogDescription>
          </DialogHeader>
          {formFields("create")}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting} className="gap-1.5">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Create user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update details and desk access for {editUser?.name}.</DialogDescription>
          </DialogHeader>
          {formFields("edit")}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={submitting} className="gap-1.5">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set password */}
      <Dialog open={!!passwordUser} onOpenChange={(o) => !o && setPasswordUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set password</DialogTitle>
            <DialogDescription>
              Choose a new sign-in password for {passwordUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <FormField
            label="New password"
            required
            helper="Minimum 4 characters."
            error={passwordError}
            render={(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError(undefined);
                }}
              />
            )}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordUser(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSetPassword} disabled={submitting} className="gap-1.5">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Update password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!userToDelete}
        onOpenChange={(o) => !o && setUserToDelete(null)}
        title="Delete this user?"
        description={
          <>
            <span className="font-medium text-foreground">{userToDelete?.name}</span> will lose access
            immediately. This cannot be undone.
          </>
        }
        confirmLabel="Delete user"
        loading={submitting}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
};

export default UserManagementView;
