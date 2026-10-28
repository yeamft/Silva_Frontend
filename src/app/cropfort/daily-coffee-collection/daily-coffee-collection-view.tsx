"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TablePagination } from "@/components/cropfort/data-table";
import { OpsDeskControlPanel } from "@/components/cropfort/ops-desk";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { useBlocks, useFarmAreas } from "@/lib/query/hooks/use-org-map";
import {
  UNIT_TO_KG,
  cumulativePickedKg,
  useCoffeeCollectionStore,
  type CoffeeCollectionEntry,
  type CollectionUnit,
} from "@/store/coffeeCollectionStore";

const PAGE_SIZES = [10, 25, 50];
const UNITS: { value: CollectionUnit; label: string }[] = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "quintal", label: "Quintals (100 kg)" },
];

type Draft = {
  date: string;
  fieldId: string;
  unit: CollectionUnit;
  pickedQty: string;
  deliveredQty: string;
  weighingStaff: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyDraft = (): Draft => ({
  date: today(),
  fieldId: "",
  unit: "kg",
  pickedQty: "",
  deliveredQty: "",
  weighingStaff: "",
});

function qty(n: number, unit: CollectionUnit = "kg") {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit === "kg" ? "kg" : "qt"}`;
}

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const toKg = (e: Pick<CoffeeCollectionEntry, "unit">, n: number) => n * UNIT_TO_KG[e.unit];

export default function DailyCoffeeCollectionView() {
  const { activeProgram } = useCropfortAuth();
  const programId = activeProgram?.id ?? "";
  const blocksQuery = useBlocks(Boolean(programId));
  const farmsQuery = useFarmAreas(Boolean(programId));
  const fields = useMemo(
    () => (blocksQuery.data ?? []).slice().sort((a, b) => a.code.localeCompare(b.code)),
    [blocksQuery.data],
  );
  const farms = farmsQuery.data ?? [];
  const fieldLabel = (f: { code: string; name: string }) => (f.name && f.name !== f.code ? `${f.code} · ${f.name}` : f.code);

  const allEntries = useCoffeeCollectionStore((s) => s.entries);
  const add = useCoffeeCollectionStore((s) => s.add);
  const update = useCoffeeCollectionStore((s) => s.update);
  const remove = useCoffeeCollectionStore((s) => s.remove);

  const entries = useMemo(
    () =>
      allEntries
        .filter((e) => e.programId === programId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [allEntries, programId],
  );

  const [query, setQuery] = useState("");
  const [farmFilter, setFarmFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<CoffeeCollectionEntry | null>(null);

  const q = query.trim().toLowerCase();
  const visible = entries.filter(
    (e) =>
      (farmFilter === "all" || e.farmAreaId === farmFilter) &&
      (!from || e.date >= from) &&
      (!to || e.date <= to) &&
      (!q || `${e.fieldName} ${e.weighingStaff}`.toLowerCase().includes(q)),
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const summary = useMemo(() => {
    const todayIso = today();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekIso = weekStart.toISOString().slice(0, 10);
    const picked = (list: CoffeeCollectionEntry[]) => list.reduce((acc, e) => acc + toKg(e, e.pickedQty), 0);
    const delivered = (list: CoffeeCollectionEntry[]) => list.reduce((acc, e) => acc + toKg(e, e.deliveredQty), 0);
    const todays = entries.filter((e) => e.date === todayIso);
    return {
      pickedToday: picked(todays),
      deliveredToday: delivered(todays),
      pickedWeek: picked(entries.filter((e) => e.date >= weekIso)),
      undelivered: Math.max(0, picked(visible) - delivered(visible)),
    };
  }, [entries, visible]);

  const resetPage = () => setPage(1);

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setFormOpen(true);
  };

  const openEdit = (e: CoffeeCollectionEntry) => {
    setEditingId(e.id);
    setDraft({
      date: e.date,
      fieldId: e.fieldId,
      unit: e.unit,
      pickedQty: e.pickedQty ? String(e.pickedQty) : "",
      deliveredQty: e.deliveredQty ? String(e.deliveredQty) : "",
      weighingStaff: e.weighingStaff,
    });
    setFormOpen(true);
  };

  const draftPicked = Number(draft.pickedQty) || 0;
  const draftCumulativeKg = draft.fieldId
    ? cumulativePickedKg(entries, draft.fieldId, draft.date, editingId ?? undefined) + draftPicked * UNIT_TO_KG[draft.unit]
    : null;

  const save = () => {
    const picked = Number(draft.pickedQty) || 0;
    const delivered = Number(draft.deliveredQty) || 0;
    if (!draft.date) return toast.error("Choose the date");
    if (draft.date > today()) return toast.error("The date can't be in the future");
    if (!draft.fieldId) return toast.error("Choose the field name");
    if (picked < 0 || delivered < 0) return toast.error("Quantities can't be negative");
    if (picked + delivered === 0) return toast.error("Enter the quantity picked or delivered");

    const field = fields.find((f) => f.id === draft.fieldId);
    const input = {
      programId,
      date: draft.date,
      fieldId: draft.fieldId,
      fieldName: field ? fieldLabel(field) : "",
      farmAreaId: field?.farmAreaId ?? null,
      unit: draft.unit,
      pickedQty: picked,
      deliveredQty: delivered,
      weighingStaff: draft.weighingStaff.trim(),
    };
    if (editingId) {
      update(editingId, input);
      toast.success("Record updated");
    } else {
      add(input);
      toast.success(`Recorded ${qty(picked, draft.unit)} picked on ${input.fieldName || "the field"}`);
    }
    setFormOpen(false);
  };

  const set = <K extends keyof Draft>(field: K) => (value: Draft[K]) => setDraft((d) => ({ ...d, [field]: value }));

  return (
    <PageContainer>
      <PageHeader
        title="Daily coffee collection"
        breadcrumbs={[{ label: "Home", href: CROPFORT_ROUTES.dashboard }, { label: "Daily coffee collection" }]}
        actions={
          <Button size="sm" onClick={openNew} disabled={!programId}>
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Add record
          </Button>
        }
      />

      <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
        Records are saved on this device only for now. They won&apos;t appear on other devices or for other users yet.
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Picked today", value: qty(summary.pickedToday) },
          { label: "Delivered to yard today", value: qty(summary.deliveredToday) },
          { label: "Picked, last 7 days", value: qty(summary.pickedWeek) },
          { label: "Picked, not yet delivered", value: qty(summary.undelivered), hint: "In current filter" },
        ].map((m) => (
          <SectionCard key={m.label}>
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{m.value}</p>
            {m.hint ? <p className="text-[11px] text-muted-foreground">{m.hint}</p> : null}
          </SectionCard>
        ))}
      </div>

      <SectionCard flush>
        <OpsDeskControlPanel
          className="rounded-none border-x-0 border-t-0"
          search={query}
          onSearchChange={(v) => {
            setQuery(v);
            resetPage();
          }}
          searchPlaceholder="Search field or weighing staff"
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={farmFilter}
                onValueChange={(v) => {
                  setFarmFilter(v);
                  resetPage();
                }}
              >
                <SelectTrigger className="h-8 w-[160px] text-xs" aria-label="Farm area filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All farm areas</SelectItem>
                  {farms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                aria-label="From date"
                value={from}
                max={to || undefined}
                onChange={(e) => {
                  setFrom(e.target.value);
                  resetPage();
                }}
                className="h-8 w-[140px] text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                aria-label="To date"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setTo(e.target.value);
                  resetPage();
                }}
                className="h-8 w-[140px] text-xs"
              />
            </div>
          }
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Field name</TableHead>
              <TableHead className="text-right">Picked by workers</TableHead>
              <TableHead className="text-right">Delivered to yard</TableHead>
              <TableHead className="text-right">Cumulatively picked</TableHead>
              <TableHead>Weighing staff</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  {entries.length === 0 ? (
                    <>
                      No records yet.{" "}
                      <button type="button" className="font-medium text-primary hover:underline" onClick={openNew}>
                        Add today&apos;s record
                      </button>
                    </>
                  ) : (
                    "No records match these filters."
                  )}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap font-medium">{fmtDate(e.date)}</TableCell>
                  <TableCell className="text-sm">{e.fieldName || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{e.pickedQty ? qty(e.pickedQty, e.unit) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{e.deliveredQty ? qty(e.deliveredQty, e.unit) : "—"}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {qty(cumulativePickedKg(entries, e.fieldId, e.date))}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{e.weighingStaff || "—"}</TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit record" onClick={() => openEdit(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Delete record"
                        onClick={() => setDeleteTarget(e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          page={currentPage}
          pageCount={pageCount}
          total={visible.length}
          pageSize={pageSize}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZES}
          onPageSizeChange={(size) => {
            setPageSize(size);
            resetPage();
          }}
        />
      </SectionCard>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit record" : "Add record"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cc-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input id="cc-date" type="date" max={today()} value={draft.date} onChange={(e) => set("date")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Field name <span className="text-destructive">*</span>
              </Label>
              <Select value={draft.fieldId} onValueChange={set("fieldId")}>
                <SelectTrigger aria-label="Field name">
                  <SelectValue
                    placeholder={
                      blocksQuery.isLoading ? "Loading…" : fields.length === 0 ? "No fields set up" : "Select field name"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {fieldLabel(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Unit</Label>
              <Select value={draft.unit} onValueChange={(v) => set("unit")(v as CollectionUnit)}>
                <SelectTrigger aria-label="Unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-picked">Picked by workers ({draft.unit === "kg" ? "kg" : "qt"})</Label>
              <Input
                id="cc-picked"
                type="number"
                min={0}
                step="0.01"
                value={draft.pickedQty}
                onChange={(e) => set("pickedQty")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-delivered">Delivered to collection yard ({draft.unit === "kg" ? "kg" : "qt"})</Label>
              <Input
                id="cc-delivered"
                type="number"
                min={0}
                step="0.01"
                value={draft.deliveredQty}
                onChange={(e) => set("deliveredQty")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cc-cumulative">Cumulatively picked</Label>
              <Input
                id="cc-cumulative"
                readOnly
                tabIndex={-1}
                value={draftCumulativeKg == null ? "Select a field first" : qty(draftCumulativeKg)}
                className="bg-muted/40 font-semibold tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground">
                Calculated: everything picked on this field up to this date, including this record.
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cc-staff">Weighing staff (names / roles)</Label>
              <Input
                id="cc-staff"
                value={draft.weighingStaff}
                placeholder="e.g. Abebe (weigher), Tigist (recorder)"
                onChange={(e) => set("weighingStaff")(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>{editingId ? "Save changes" : "Add record"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this record?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteTarget
              ? `${fmtDate(deleteTarget.date)} · ${deleteTarget.fieldName} · ${qty(deleteTarget.pickedQty, deleteTarget.unit)} picked`
              : null}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) remove(deleteTarget.id);
                setDeleteTarget(null);
                toast.success("Record deleted");
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
