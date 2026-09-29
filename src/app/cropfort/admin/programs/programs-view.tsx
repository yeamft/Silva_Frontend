"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Layers3, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { TableMessageRow, TablePagination, TableSkeleton, TableToolbar } from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard, StatusSummaryCards } from "@/components/cropfort/page-shell";
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
import { canManagePrograms } from "@/lib/cropfortAccess";
import type { AdminProgram } from "@/lib/api/programs";
import {
  useArchiveProgram,
  useCreateProgram,
  usePrograms,
  useUpdateProgram,
} from "@/lib/query";

const PAGE_SIZE = 12;

type Form = {
  name: string;
  slug: string;
  status: "active" | "archived";
};

const EMPTY: Form = { name: "", slug: "", status: "active" };

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export default function ProgramsPage() {
  const { user } = useCropfortAuth();
  const canEdit = canManagePrograms(user.role);

  const programsQuery = usePrograms(canEdit);
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const archiveProgram = useArchiveProgram();

  const rows = programsQuery.data ?? [];
  const loading = programsQuery.isLoading;

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProgram | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [archiveTarget, setArchiveTarget] = useState<AdminProgram | null>(null);

  const busy = createProgram.isPending || updateProgram.isPending || archiveProgram.isPending;

  useEffect(() => {
    if (programsQuery.error) {
      toast.error(programsQuery.error instanceof Error ? programsQuery.error.message : "Load failed");
    }
  }, [programsQuery.error]);

  const visible = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  }, [rows, debounced]);

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  if (!canEdit) {
    return <NotAuthorized title="Programs" />;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (program: AdminProgram) => {
    setEditing(program);
    setForm({ name: program.name, slug: program.slug, status: program.status });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        status: form.status,
      };
      if (editing) await updateProgram.mutateAsync({ id: editing.id, input: payload });
      else await createProgram.mutateAsync(payload);
      toast.success(editing ? "Program updated" : "Program created");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administration"
        title="Programs"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            New program
          </Button>
        }
      />

      <StatusSummaryCards
        label="Programs summary"
        columns={3}
        items={[
          {
            id: "total",
            label: "Programs",
            value: String(rows.length),
            icon: Layers3,
            footnote: "All programs",
            emphasis: true,
          },
          {
            id: "active",
            label: "Active",
            value: String(rows.filter((p) => p.status === "active").length),
            icon: CheckCircle2,
            footnote: "Currently available",
            intent: "positive",
          },
        ]}
      />

      <SectionCard flush>
        <div className="border-b px-4 py-3">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search name or slug" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Name</TableHead>
              <TableHead scope="col">Slug</TableHead>
              <TableHead scope="col" className="text-right">
                Orgs
              </TableHead>
              <TableHead scope="col" className="text-right">
                Farm areas
              </TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={8} columns={6} />
            ) : paged.length === 0 ? (
              <TableMessageRow colSpan={6} icon={Layers3} title="No programs yet" />
            ) : (
              paged.map((program) => (
                <TableRow key={program.id}>
                  <TableCell className="font-medium">{program.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{program.slug}</TableCell>
                  <TableCell className="cf-numeric text-right">{program.memberCount}</TableCell>
                  <TableCell className="cf-numeric text-right">{program.farmAreaCount}</TableCell>
                  <TableCell>
                    <StatusBadge status={program.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${program.name}`}>
                          <MoreHorizontal className="h-4 w-4" aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(program)}>Edit</DropdownMenuItem>
                        {program.status !== "archived" ? (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setArchiveTarget(program)}
                          >
                            Archive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                await updateProgram.mutateAsync({
                                  id: program.id,
                                  input: { status: "active" },
                                });
                                toast.success("Program restored");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Restore failed");
                              }
                            }}
                          >
                            Restore
                          </DropdownMenuItem>
                        )}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit program" : "New program"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField
              label="Name"
              required
              render={(props) => (
                <Input
                  {...props}
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: editing ? f.slug : slugify(name),
                    }));
                  }}
                  placeholder="e.g. Silva Kaffa Coffee Program"
                />
              )}
            />
            <FormField
              label="Slug"
              render={(props) => (
                <Input
                  {...props}
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  placeholder="auto from name"
                />
              )}
            />
            <FormField
              label="Status"
              render={({ id }) => (
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as Form["status"] })}
                >
                  <SelectTrigger id={id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
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
        open={Boolean(archiveTarget)}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title="Archive program?"
        confirmLabel="Archive"
        loading={busy}
        onConfirm={async () => {
          if (!archiveTarget) return;
          try {
            await archiveProgram.mutateAsync(archiveTarget.id);
            toast.success("Program archived");
            setArchiveTarget(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Archive failed");
          }
        }}
      />
    </PageContainer>
  );
}
