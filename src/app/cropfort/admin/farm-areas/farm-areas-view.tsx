"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, FolderKanban, LandPlot, MapPinned, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { TableMessageRow, TablePagination, TableSkeleton, TableToolbar } from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
import { CompactSummaryCards, PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { canManageOrgMap } from "@/lib/cropfortAccess";
import {
  useAssetOwners,
  useBlocks,
  useCreateFarmArea,
  useDeleteFarmArea,
  useFarmAreas,
  useUpdateFarmArea,
  useVendors,
} from "@/lib/query";
import { cn } from "@/lib/utils";
import type { EntityStatus, FarmArea, FarmBlockRef } from "@/types/cropfort-modules";

const PAGE_SIZE = 10;

type BlockRow = {
  /** Stable key for React; equals the block id for saved blocks. */
  key: string;
  id?: string;
  code: string;
  name: string;
  hectares: string;
};

type Form = {
  name: string;
  totalHectares: string;
  status: EntityStatus;
  blocks: BlockRow[];
  vendorIds: string[];
  assetOwnerIds: string[];
};

const EMPTY: Form = {
  name: "",
  totalHectares: "",
  status: "active",
  blocks: [],
  vendorIds: [],
  assetOwnerIds: [],
};

let rowSeq = 0;
const newKey = () => `new-${(rowSeq += 1)}`;

function toRow(block: FarmBlockRef): BlockRow {
  return {
    key: block.id,
    id: block.id,
    code: block.code,
    name: block.name === block.code ? "" : block.name,
    hectares: block.hectares ? String(block.hectares) : "",
  };
}

/** Suggests the next code from the last row (B-07 → B-08), or one from the area's initials. */
function suggestCode(rows: BlockRow[], areaName: string) {
  const last = [...rows].reverse().find((r) => r.code.trim());
  const match = last?.code.trim().match(/^(.*?)(\d+)$/);
  if (match) {
    const next = String(Number(match[2]) + 1).padStart(match[2].length, "0");
    return `${match[1]}${next}`.toUpperCase();
  }
  const initials = areaName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  return `${initials || "B"}-${String(rows.length + 1).padStart(2, "0")}`;
}

function ChipToggleGroup({
  legend,
  options,
  values,
  onChange,
  emptyHint,
}: {
  legend: string;
  options: { value: string; label: string }[];
  values: string[];
  onChange: (next: string[]) => void;
  emptyHint: ReactNode;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="flex w-full items-center justify-between text-sm font-medium">
        {legend}
        {values.length ? (
          <span className="text-xs font-normal text-muted-foreground">{values.length} selected</span>
        ) : null}
      </legend>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const selected = values.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  onChange(selected ? values.filter((v) => v !== opt.value) : [...values, opt.value])
                }
                className={cn(
                  "cf-focus inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors duration-150",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/50",
                )}
              >
                {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

export default function FarmAreasPage() {
  const { user } = useCropfortAuth();
  const canEdit = canManageOrgMap(user.role);

  const areasQuery = useFarmAreas();
  const blocksQuery = useBlocks();
  const vendorsQuery = useVendors();
  const ownersQuery = useAssetOwners();
  const createFarmArea = useCreateFarmArea();
  const updateFarmArea = useUpdateFarmArea();
  const deleteFarmArea = useDeleteFarmArea();

  const areas = useMemo(() => areasQuery.data ?? [], [areasQuery.data]);
  const blocks = useMemo(() => blocksQuery.data ?? [], [blocksQuery.data]);
  const vendors = vendorsQuery.data ?? [];
  const owners = ownersQuery.data ?? [];
  const loading =
    areasQuery.isLoading || blocksQuery.isLoading || vendorsQuery.isLoading || ownersQuery.isLoading;
  const saving = createFarmArea.isPending || updateFarmArea.isPending;

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FarmArea | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<{ name?: string; totalHectares?: string; blocks?: string }>({});
  const [deleteTarget, setDeleteTarget] = useState<FarmArea | null>(null);

  useEffect(() => {
    const err = areasQuery.error || blocksQuery.error || vendorsQuery.error || ownersQuery.error;
    if (err) toast.error(err instanceof Error ? err.message : "Load failed");
  }, [areasQuery.error, blocksQuery.error, vendorsQuery.error, ownersQuery.error]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const blocksByArea = useMemo(() => {
    const map = new Map<string, FarmBlockRef[]>();
    for (const b of blocks) {
      if (!b.farmAreaId) continue;
      map.set(b.farmAreaId, [...(map.get(b.farmAreaId) ?? []), b]);
    }
    for (const list of map.values()) list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    return map;
  }, [blocks]);
  const unassignedBlocks = useMemo(() => blocks.filter((b) => !b.farmAreaId), [blocks]);

  const nameOf = (ids: string[], list: { id: string; name: string }[]) =>
    ids.map((id) => list.find((x) => x.id === id)?.name).filter((n): n is string => Boolean(n));

  const visible = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return areas;
    return areas.filter((a) => {
      const blockCodes = (blocksByArea.get(a.id) ?? []).map((b) => b.code).join(" ");
      return `${a.name} ${blockCodes}`.toLowerCase().includes(q);
    });
  }, [areas, blocksByArea, debounced]);

  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalHa = areas.reduce((sum, a) => sum + (Number(a.totalHectares) || 0), 0);

  const openEditor = (area?: FarmArea) => {
    setEditing(area ?? null);
    setErrors({});
    setForm(
      area
        ? {
            name: area.name,
            totalHectares: area.totalHectares ? String(area.totalHectares) : "",
            status: area.status,
            blocks: (blocksByArea.get(area.id) ?? []).map(toRow),
            vendorIds: area.vendorIds,
            assetOwnerIds: area.assetOwnerIds,
          }
        : EMPTY,
    );
    setOpen(true);
  };

  const updateRow = (key: string, patch: Partial<BlockRow>) =>
    setForm((f) => ({ ...f, blocks: f.blocks.map((r) => (r.key === key ? { ...r, ...patch } : r)) }));

  const addRow = () =>
    setForm((f) => ({
      ...f,
      blocks: [...f.blocks, { key: newKey(), code: suggestCode(f.blocks, f.name), name: "", hectares: "" }],
    }));

  const blockHa = form.blocks.reduce((sum, r) => sum + (Number(r.hectares) || 0), 0);
  const areaHa = Number(form.totalHectares) || 0;

  const save = async () => {
    const next: typeof errors = {};
    const ha = Number(form.totalHectares);
    if (!form.name.trim()) next.name = "Give the farm area a name.";
    if (!Number.isFinite(ha) || ha <= 0) next.totalHectares = "Enter the total area in hectares.";
    const codes = form.blocks.map((r) => r.code.trim().toUpperCase());
    if (codes.some((c) => !c)) next.blocks = "Every block needs a code.";
    else if (new Set(codes).size !== codes.length) next.blocks = "Block codes must be unique.";
    else if (form.blocks.some((r) => r.hectares && !(Number(r.hectares) >= 0))) {
      next.blocks = "Block hectares must be a number.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      name: form.name.trim(),
      totalHectares: ha,
      status: form.status,
      blocks: form.blocks.map((r) => ({
        id: r.id,
        code: r.code.trim().toUpperCase(),
        name: r.name.trim() || undefined,
        hectares: r.hectares ? Number(r.hectares) : null,
      })),
      vendorIds: form.vendorIds,
      assetOwnerIds: form.assetOwnerIds,
    };
    try {
      if (editing) await updateFarmArea.mutateAsync({ id: editing.id, input: payload });
      else await createFarmArea.mutateAsync(payload);
      toast.success(editing ? "Farm area updated" : "Farm area added");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administration"
        title="Farm areas"
        description="Each farm area holds its blocks and the vendors and asset owners who work on it."
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => openEditor()}>
              <Plus className="h-4 w-4" aria-hidden />
              Add farm area
            </Button>
          ) : null
        }
      />

      <CompactSummaryCards
        label="Farm areas summary"
        items={[
          { id: "areas", label: "Farm areas", value: String(areas.length), icon: MapPinned },
          { id: "ha", label: "Total hectares", value: totalHa.toLocaleString(), icon: LandPlot },
          {
            id: "blocks",
            label: "Blocks",
            value: String(blocks.length - unassignedBlocks.length),
            icon: FolderKanban,
            footnote: unassignedBlocks.length ? `${unassignedBlocks.length} not in a farm area` : undefined,
          },
        ]}
      />

      <SectionCard flush>
        <div className="border-b px-4 py-3">
          <TableToolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search farm area or block code" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Farm area</TableHead>
              <TableHead scope="col" className="text-right">
                Hectares
              </TableHead>
              <TableHead scope="col">Blocks</TableHead>
              <TableHead scope="col">Vendors</TableHead>
              <TableHead scope="col">Asset owners</TableHead>
              <TableHead scope="col">Status</TableHead>
              {canEdit ? <TableHead scope="col" className="w-12" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={5} columns={canEdit ? 7 : 6} />
            ) : paged.length === 0 ? (
              <TableMessageRow
                colSpan={canEdit ? 7 : 6}
                icon={MapPinned}
                title={search ? "No farm areas match" : "No farm areas yet"}
                description={search ? undefined : "Add a farm area, then its blocks, vendors and asset owners."}
                action={
                  canEdit && !search ? (
                    <Button size="sm" onClick={() => openEditor()}>
                      <Plus className="h-4 w-4" aria-hidden />
                      Add farm area
                    </Button>
                  ) : null
                }
              />
            ) : (
              paged.map((fa) => {
                const areaBlocks = blocksByArea.get(fa.id) ?? [];
                const vendorNames = nameOf(fa.vendorIds, vendors);
                const ownerNames = nameOf(fa.assetOwnerIds, owners);
                return (
                  <TableRow key={fa.id} onClick={canEdit ? () => openEditor(fa) : undefined}>
                    <TableCell className="font-medium">{fa.name}</TableCell>
                    <TableCell className="cf-numeric text-right">{fa.totalHectares.toLocaleString()}</TableCell>
                    <TableCell>
                      {areaBlocks.length ? (
                        <span className="flex flex-wrap items-center gap-1">
                          {areaBlocks.slice(0, 4).map((b) => (
                            <span key={b.id} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                              {b.code}
                            </span>
                          ))}
                          {areaBlocks.length > 4 ? (
                            <span className="text-xs text-muted-foreground">+{areaBlocks.length - 4}</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No blocks</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-sm" title={vendorNames.join(", ")}>
                      {vendorNames.join(", ") || <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-sm" title={ownerNames.join(", ")}>
                      {ownerNames.join(", ") || <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={fa.status} />
                    </TableCell>
                    {canEdit ? (
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${fa.name}`}>
                              <MoreHorizontal className="h-4 w-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditor(fa)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(fa)}>
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
        <TablePagination
          page={page}
          pageCount={Math.max(1, Math.ceil(visible.length / PAGE_SIZE))}
          total={visible.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl sm:p-0">
          <DialogHeader className="border-b px-6 py-5 text-left">
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Add farm area"}</DialogTitle>
            <DialogDescription>Details, blocks and who works on it. Everything saves together.</DialogDescription>
          </DialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</h3>
                <FormField
                  label="Name"
                  required
                  error={errors.name}
                  render={(props) => (
                    <Input
                      {...props}
                      autoFocus
                      placeholder="e.g. Chaka North"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Total hectares"
                    required
                    error={errors.totalHectares}
                    render={(props) => (
                      <Input
                        {...props}
                        inputMode="decimal"
                        placeholder="0"
                        value={form.totalHectares}
                        onChange={(e) => setForm({ ...form, totalHectares: e.target.value })}
                      />
                    )}
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="farm-area-active">Status</Label>
                    <div className="flex h-10 items-center gap-2.5">
                      <Switch
                        id="farm-area-active"
                        checked={form.status === "active"}
                        onCheckedChange={(on) => setForm({ ...form, status: on ? "active" : "inactive" })}
                      />
                      <span className="text-sm">{form.status === "active" ? "Active" : "Inactive"}</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Blocks {form.blocks.length ? `· ${form.blocks.length}` : ""}
                  </h3>
                  {form.blocks.length ? (
                    <span
                      className={cn(
                        "cf-numeric text-xs",
                        areaHa && blockHa > areaHa ? "font-medium text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {blockHa.toLocaleString()} of {areaHa.toLocaleString()} ha in blocks
                    </span>
                  ) : null}
                </div>

                {form.blocks.length ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_5rem_2rem] gap-2 px-0.5 text-[11px] font-medium text-muted-foreground">
                      <span>Code</span>
                      <span>Name (optional)</span>
                      <span>Hectares</span>
                      <span className="sr-only">Remove</span>
                    </div>
                    {form.blocks.map((row) => (
                      <div key={row.key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_5rem_2rem] items-center gap-2">
                        <Input
                          aria-label="Block code"
                          value={row.code}
                          onChange={(e) => updateRow(row.key, { code: e.target.value.toUpperCase() })}
                          className="h-9 font-mono text-xs"
                        />
                        <Input
                          aria-label="Block name"
                          value={row.name}
                          placeholder={row.code || "Name"}
                          onChange={(e) => updateRow(row.key, { name: e.target.value })}
                          className="h-9"
                        />
                        <Input
                          aria-label="Block hectares"
                          inputMode="decimal"
                          value={row.hectares}
                          placeholder="0"
                          onChange={(e) => updateRow(row.key, { hectares: e.target.value })}
                          className="cf-numeric h-9"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove block ${row.code || ""}`}
                          title={row.id ? "Remove from this farm area (the block is kept)" : "Remove"}
                          onClick={() => setForm((f) => ({ ...f, blocks: f.blocks.filter((r) => r.key !== row.key) }))}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">
                    No blocks yet. Add the blocks this farm area is divided into.
                  </p>
                )}

                {errors.blocks ? <p className="text-xs text-destructive">{errors.blocks}</p> : null}

                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Add block
                </Button>

                {(() => {
                  const inForm = new Set(form.blocks.map((r) => r.id));
                  const available = unassignedBlocks.filter((b) => !inForm.has(b.id));
                  return available.length ? (
                    <div className="space-y-1.5 rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Existing blocks not in any farm area — tap to add:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {available.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, blocks: [...f.blocks, toRow(b)] }))}
                            className="cf-focus inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2.5 font-mono text-[11px] transition-colors hover:border-primary/40"
                          >
                            <Plus className="h-3 w-3" aria-hidden />
                            {b.code}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </section>

              <section className="space-y-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned to</h3>
                <ChipToggleGroup
                  legend="Vendors"
                  options={vendors.map((v) => ({ value: v.id, label: v.name }))}
                  values={form.vendorIds}
                  onChange={(vendorIds) => setForm({ ...form, vendorIds })}
                  emptyHint={
                    <>
                      No vendors yet.{" "}
                      <Link href={CROPFORT_ROUTES.vendors} className="text-primary underline-offset-2 hover:underline">
                        Add vendors
                      </Link>
                    </>
                  }
                />
                <ChipToggleGroup
                  legend="Asset owners"
                  options={owners.map((o) => ({ value: o.id, label: o.name }))}
                  values={form.assetOwnerIds}
                  onChange={(assetOwnerIds) => setForm({ ...form, assetOwnerIds })}
                  emptyHint={
                    <>
                      No asset owners yet.{" "}
                      <Link href={CROPFORT_ROUTES.assetOwners} className="text-primary underline-offset-2 hover:underline">
                        Add asset owners
                      </Link>
                    </>
                  }
                />
              </section>
            </div>

            <div className="flex items-center justify-end gap-2 border-t bg-background px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Add farm area"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "farm area"}?`}
        confirmLabel="Delete"
        loading={deleteFarmArea.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteFarmArea.mutateAsync(deleteTarget.id);
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
