"use client";

import { useMemo, useState } from "react";
import { Gauge, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { TableMessageRow, TableToolbar } from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CROPFORT_ROUTES } from "@/config/navigation";
import type { AfeBand } from "@/lib/cropfort/ethiopian-year";
import { canManagePrograms, canViewOrgMap } from "@/lib/cropfortAccess";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePrograms } from "@/lib/query";
import { useSpendBandStore } from "@/store/spendBandStore";
import {
  DEFAULT_SPEND_BANDS,
  bandRangeLabel,
  validateBandSet,
  type ProgramBandSet,
  type ProgramSpendBand,
} from "@/types/spend-bands";

const BANDS: AfeBand[] = ["A", "B", "C", "D"];

function fmtNum(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "";
  return String(n);
}

function cloneBands(source: ProgramSpendBand[] = DEFAULT_SPEND_BANDS): ProgramSpendBand[] {
  return source.map((b) => ({ ...b }));
}

function summaryOf(set: ProgramBandSet): string {
  const a = set.bands.find((b) => b.band === "A");
  const b = set.bands.find((x) => x.band === "B");
  const c = set.bands.find((x) => x.band === "C");
  if (!a || !b || !c) return "—";
  return `A ≤ ${a.maxEtb?.toLocaleString()} · B ≤ ${b.maxEtb?.toLocaleString()} · C ≤ ${c.maxEtb?.toLocaleString()}`;
}

type FormState = {
  programId: string;
  programName: string;
  effectiveYear: number;
  bands: ProgramSpendBand[];
};

/**
 * CropFort Program bands — table register + create/edit modal.
 */
export default function SpendBandsView() {
  const { user, activeProgram } = useCropfortAuth();
  const canView = canViewOrgMap(user.role) || canManagePrograms(user.role);
  const canEdit = canManagePrograms(user.role);

  const programsQuery = usePrograms(canEdit);
  const apiPrograms = programsQuery.data ?? [];

  const sets = useSpendBandStore((s) => s.sets);
  const activeProgramId = useSpendBandStore((s) => s.activeProgramId);
  const createSet = useSpendBandStore((s) => s.createSet);
  const removeSet = useSpendBandStore((s) => s.removeSet);
  const replaceBands = useSpendBandStore((s) => s.replaceBands);
  const resetToDefaults = useSpendBandStore((s) => s.resetToDefaults);
  const setEffectiveYear = useSpendBandStore((s) => s.setEffectiveYear);
  const setActiveProgram = useSpendBandStore((s) => s.setActiveProgram);

  const programOptions = useMemo(() => {
    if (apiPrograms.length > 0) {
      return apiPrograms.map((p) => ({ id: p.id, name: p.name }));
    }
    if (activeProgram) {
      return [{ id: activeProgram.id, name: activeProgram.name }];
    }
    return [
      { id: "prog-sheka", name: "Sheka Program" },
      { id: "prog-1", name: "Sheka Turnaround 2026" },
    ];
  }, [apiPrograms, activeProgram]);

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramBandSet | null>(null);
  const [form, setForm] = useState<FormState>({
    programId: "",
    programName: "",
    effectiveYear: new Date().getFullYear(),
    bands: cloneBands(),
  });
  const [deleteTarget, setDeleteTarget] = useState<ProgramBandSet | null>(null);

  const visible = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter(
      (s) =>
        s.programName.toLowerCase().includes(q) ||
        String(s.effectiveYear).includes(q),
    );
  }, [sets, debounced]);

  const programsWithoutBands = useMemo(
    () => programOptions.filter((p) => !sets.some((s) => s.programId === p.id)),
    [programOptions, sets],
  );

  if (!canView) return <NotAuthorized title="Program bands" />;

  const patchBand = (band: AfeBand, patch: Partial<ProgramSpendBand>) => {
    setForm((prev) => ({
      ...prev,
      bands: prev.bands.map((r) => (r.band === band ? { ...r, ...patch, band } : r)),
    }));
  };

  const startCreate = () => {
    const first = programsWithoutBands[0];
    setEditing(null);
    setForm({
      programId: first?.id ?? "",
      programName: first?.name ?? "",
      effectiveYear: new Date().getFullYear(),
      bands: cloneBands(),
    });
    setOpen(true);
  };

  const startEdit = (row: ProgramBandSet) => {
    setEditing(row);
    setForm({
      programId: row.programId,
      programName: row.programName,
      effectiveYear: row.effectiveYear,
      bands: cloneBands(row.bands),
    });
    setOpen(true);
  };

  const save = () => {
    if (!canEdit) return;
    if (!form.programId) {
      toast.error("Select a program");
      return;
    }
    const err = validateBandSet(form.bands);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      if (editing) {
        replaceBands(editing.programId, form.bands);
        setEffectiveYear(editing.programId, form.effectiveYear);
        toast.success("Spend band updated");
      } else {
        const name =
          programOptions.find((p) => p.id === form.programId)?.name ||
          form.programName ||
          form.programId;
        createSet({
          programId: form.programId,
          programName: name,
          effectiveYear: form.effectiveYear,
          bands: form.bands,
        });
        toast.success("Spend band created");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Plan"}
        title="Program bands"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Plan", href: CROPFORT_ROUTES.coreOperations },
          { label: "Program bands" },
        ]}
        meta={
          <>
            <StatusBadge status="approved" label="Schedule 3" />
            <span className="text-xs text-muted-foreground">
              {sets.length} program{sets.length === 1 ? "" : "s"}
            </span>
            <a
              href={CROPFORT_ROUTES.agreementLifecycle}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Sch. 5–9 config
            </a>
          </>
        }
        actions={
          canEdit ? (
            <Button size="sm" onClick={startCreate} disabled={programsWithoutBands.length === 0}>
              <Plus className="h-4 w-4" aria-hidden />
              Create spend band
            </Button>
          ) : null
        }
      />

      <SectionCard flush>
        <div className="border-b px-4 py-3">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search program or year"
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>ETB ranges</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                {canEdit ? (
                  <TableHead className="text-right">Actions</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableMessageRow
                  colSpan={canEdit ? 6 : 5}
                  icon={Gauge}
                  title="No spend bands yet"
                  description={
                    canEdit
                      ? "Create a spend band set for a program."
                      : undefined
                  }
                />
              ) : (
                visible.map((row) => {
                  const isActive = row.programId === activeProgramId;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.programName}</TableCell>
                      <TableCell className="tabular-nums">{row.effectiveYear}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {summaryOf(row)}
                      </TableCell>
                      <TableCell>
                        {isActive ? (
                          <StatusBadge status="approved" label="Active" />
                        ) : (
                          <StatusBadge status="draft" label="Idle" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(row.updatedAt).toLocaleDateString()}
                      </TableCell>
                      {canEdit ? (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Actions for ${row.programName}`}
                              >
                                <MoreHorizontal className="h-4 w-4" aria-hidden />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEdit(row)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setActiveProgram(row.programId);
                                  toast.success(`Active · ${row.programName}`);
                                }}
                              >
                                Set active
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  resetToDefaults(row.programId);
                                  toast.success("Restored Schedule 3 defaults");
                                }}
                              >
                                Reset defaults
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTarget(row)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit spend band" : "Create spend band"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Program"
              required
              render={() =>
                editing ? (
                  <Input value={form.programName} disabled />
                ) : (
                  <Select
                    value={form.programId}
                    onValueChange={(id) => {
                      const p = programOptions.find((x) => x.id === id);
                      setForm((prev) => ({
                        ...prev,
                        programId: id,
                        programName: p?.name ?? id,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programsWithoutBands.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              }
            />
            <FormField
              label="Effective year"
              required
              render={(props) => (
                <Input
                  {...props}
                  type="number"
                  value={form.effectiveYear}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      effectiveYear: Number(e.target.value) || prev.effectiveYear,
                    }))
                  }
                />
              )}
            />
          </div>

          <div className="mt-2 space-y-3">
            <p className="text-sm font-medium">Bands A–D (ETB)</p>
            {BANDS.map((band) => {
              const row = form.bands.find((b) => b.band === band);
              if (!row) return null;
              const openEnded = band === "D";
              return (
                <div
                  key={band}
                  className="rounded-md border border-border px-3 py-3"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Band {band}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {bandRangeLabel(row, "ETB")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <label className="inline-flex items-center gap-2">
                        <Checkbox
                          checked={row.autoApprove}
                          onCheckedChange={(v) =>
                            patchBand(band, {
                              autoApprove: Boolean(v),
                              requiresSilvaApproval: Boolean(v)
                                ? false
                                : row.requiresSilvaApproval,
                            })
                          }
                        />
                        Auto-issue
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <Checkbox
                          checked={row.requiresSilvaApproval}
                          onCheckedChange={(v) =>
                            patchBand(band, {
                              requiresSilvaApproval: Boolean(v),
                              autoApprove: Boolean(v) ? false : row.autoApprove,
                            })
                          }
                        />
                        Silva gate
                      </label>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <FormField
                      label="Min ETB"
                      render={(props) => (
                        <Input
                          {...props}
                          type="number"
                          value={fmtNum(row.minEtb)}
                          onChange={(e) =>
                            patchBand(band, {
                              minEtb: Number(e.target.value) || 0,
                            })
                          }
                        />
                      )}
                    />
                    <FormField
                      label="Max ETB"
                      render={(props) =>
                        openEnded ? (
                          <Input {...props} value="Open" disabled />
                        ) : (
                          <Input
                            {...props}
                            type="number"
                            value={fmtNum(row.maxEtb)}
                            onChange={(e) =>
                              patchBand(band, {
                                maxEtb: Number(e.target.value) || 0,
                              })
                            }
                          />
                        )
                      }
                    />
                    <FormField
                      label="SPX authority"
                      render={(props) => (
                        <Input
                          {...props}
                          value={row.spxAuthority}
                          onChange={(e) =>
                            patchBand(band, { spxAuthority: e.target.value })
                          }
                        />
                      )}
                    />
                    <FormField
                      label="Silva authority"
                      render={(props) => (
                        <Input
                          {...props}
                          value={row.silvaAuthority}
                          onChange={(e) =>
                            patchBand(band, { silvaAuthority: e.target.value })
                          }
                        />
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>
              {editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
        title="Delete spend band?"
        description={
          deleteTarget
            ? `Remove Program bands for ${deleteTarget.programName} (${deleteTarget.effectiveYear}).`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleteTarget) return;
          removeSet(deleteTarget.programId);
          toast.success("Spend band deleted");
          setDeleteTarget(null);
        }}
      />
    </PageContainer>
  );
}
