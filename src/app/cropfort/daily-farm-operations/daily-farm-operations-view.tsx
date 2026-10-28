"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { useActivities } from "@/lib/query/hooks/use-activities";
import { useBlocks, useFarmAreas } from "@/lib/query/hooks/use-org-map";
import { cn } from "@/lib/utils";
import {
  achievementPct,
  outputPerManDay,
  useFarmOperationsStore,
  type FarmOperationEntry,
} from "@/store/farmOperationsStore";

const PAGE_SIZES = [10, 25, 50];
const NO_BLOCK = "__none";

type Draft = {
  date: string;
  farmOfficeId: string;
  subFarm: string;
  activityId: string;
  unit: string;
  blockId: string;
  standard: string;
  plan: string;
  currentPerformance: string;
  labor: string;
  payment: string;
  comment: string;
  preparedBy: string;
  verifiedBy: string;
  approvedBy: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyDraft = (farmOfficeId = ""): Draft => ({
  date: today(),
  farmOfficeId,
  subFarm: "",
  activityId: "",
  unit: "",
  blockId: "",
  standard: "",
  plan: "",
  currentPerformance: "",
  labor: "",
  payment: "",
  comment: "",
  preparedBy: "",
  verifiedBy: "",
  approvedBy: "",
});

const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));
const str = (n: number | null) => (n == null ? "" : String(n));

function num(n: number | null | undefined, digits = 2) {
  return n == null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function etb(n: number | null | undefined) {
  return n == null ? "—" : `ETB ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function pctTone(pct: number | null) {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 100) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 80) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function SignOff({ label, name }: { label: string; name: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", name ? "text-foreground" : "text-muted-foreground/60")} title={name ? `${label}: ${name}` : `${label}: pending`}>
      {name ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden /> : <Circle className="h-3.5 w-3.5" aria-hidden />}
      <span className="sr-only">{label}: </span>
      {name || label}
    </span>
  );
}

export default function DailyFarmOperationsView() {
  const { activeProgram } = useCropfortAuth();
  const programId = activeProgram?.id ?? "";
  const enabled = Boolean(programId);
  const farmsQuery = useFarmAreas(enabled);
  const blocksQuery = useBlocks(enabled);
  const activitiesQuery = useActivities({}, enabled);
  const farms = farmsQuery.data ?? [];
  const activities = useMemo(
    () => (activitiesQuery.data ?? []).filter((a) => a.active !== false).sort((a, b) => a.code.localeCompare(b.code)),
    [activitiesQuery.data],
  );

  const allEntries = useFarmOperationsStore((s) => s.entries);
  const add = useFarmOperationsStore((s) => s.add);
  const update = useFarmOperationsStore((s) => s.update);
  const remove = useFarmOperationsStore((s) => s.remove);

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
  const [deleteTarget, setDeleteTarget] = useState<FarmOperationEntry | null>(null);

  const q = query.trim().toLowerCase();
  const visible = entries.filter(
    (e) =>
      (farmFilter === "all" || e.farmOfficeId === farmFilter) &&
      (!from || e.date >= from) &&
      (!to || e.date <= to) &&
      (!q ||
        `${e.activityCode} ${e.activityName} ${e.subFarm} ${e.blockCode} ${e.comment} ${e.preparedBy}`
          .toLowerCase()
          .includes(q)),
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const summary = useMemo(() => {
    const todays = entries.filter((e) => e.date === today());
    const withPlan = visible.map(achievementPct).filter((p): p is number => p != null);
    return {
      todayCount: todays.length,
      todayLabor: todays.reduce((s, e) => s + (e.labor ?? 0), 0),
      todayPayment: todays.reduce((s, e) => s + (e.payment ?? 0), 0),
      avgAchievement: withPlan.length ? withPlan.reduce((s, p) => s + p, 0) / withPlan.length : null,
      awaitingApproval: visible.filter((e) => !e.approvedBy).length,
    };
  }, [entries, visible]);

  const resetPage = () => setPage(1);
  const set = <K extends keyof Draft>(field: K) => (value: Draft[K]) => setDraft((d) => ({ ...d, [field]: value }));

  const fieldBlocks = useMemo(
    () =>
      (blocksQuery.data ?? [])
        .filter((b) => !draft.farmOfficeId || !b.farmAreaId || b.farmAreaId === draft.farmOfficeId)
        .sort((a, b) => a.code.localeCompare(b.code)),
    [blocksQuery.data, draft.farmOfficeId],
  );

  const openNew = () => {
    setEditingId(null);
    setDraft(emptyDraft(farmFilter !== "all" ? farmFilter : farms.length === 1 ? farms[0].id : ""));
    setFormOpen(true);
  };

  const openEdit = (e: FarmOperationEntry) => {
    setEditingId(e.id);
    setDraft({
      date: e.date,
      farmOfficeId: e.farmOfficeId,
      subFarm: e.subFarm,
      activityId: e.activityId,
      unit: e.unit,
      blockId: e.blockId ?? "",
      standard: str(e.standard),
      plan: str(e.plan),
      currentPerformance: str(e.currentPerformance),
      labor: str(e.labor),
      payment: str(e.payment),
      comment: e.comment,
      preparedBy: e.preparedBy,
      verifiedBy: e.verifiedBy,
      approvedBy: e.approvedBy,
    });
    setFormOpen(true);
  };

  const draftAchievement = achievementPct({ plan: numOrNull(draft.plan), currentPerformance: numOrNull(draft.currentPerformance) });
  const draftOutput = outputPerManDay({ labor: numOrNull(draft.labor), currentPerformance: numOrNull(draft.currentPerformance) });
  const draftStandard = numOrNull(draft.standard);

  const save = () => {
    if (!draft.date) return toast.error("Choose the date");
    if (draft.date > today()) return toast.error("The date can't be in the future");
    if (!draft.farmOfficeId) return toast.error("Choose the farm office");
    if (!draft.activityId) return toast.error("Choose the activity");
    const numbers = {
      standard: numOrNull(draft.standard),
      plan: numOrNull(draft.plan),
      currentPerformance: numOrNull(draft.currentPerformance),
      labor: numOrNull(draft.labor),
      payment: numOrNull(draft.payment),
    };
    if (Object.values(numbers).some((n) => n != null && (!Number.isFinite(n) || n < 0))) {
      return toast.error("Numbers must be zero or more");
    }

    const activity = activities.find((a) => a.id === draft.activityId);
    const block = (blocksQuery.data ?? []).find((b) => b.id === draft.blockId);
    const input = {
      programId,
      date: draft.date,
      farmOfficeId: draft.farmOfficeId,
      farmOfficeName: farms.find((f) => f.id === draft.farmOfficeId)?.name ?? "",
      subFarm: draft.subFarm.trim(),
      activityId: draft.activityId,
      activityCode: activity?.code ?? "",
      activityName: activity?.name ?? "",
      unit: draft.unit.trim() || activity?.unitOfMeasure || "",
      blockId: block?.id ?? null,
      blockCode: block?.code ?? "",
      ...numbers,
      comment: draft.comment.trim(),
      preparedBy: draft.preparedBy.trim(),
      verifiedBy: draft.verifiedBy.trim(),
      approvedBy: draft.approvedBy.trim(),
    };
    if (editingId) {
      update(editingId, input);
      toast.success("Record updated");
    } else {
      add(input);
      toast.success(`Recorded ${input.activityName || "activity"} for ${fmtDate(input.date)}`);
    }
    setFormOpen(false);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Daily farm operations"
        breadcrumbs={[{ label: "Home", href: CROPFORT_ROUTES.dashboard }, { label: "Daily farm operations" }]}
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
          { label: "Records today", value: String(summary.todayCount) },
          { label: "Labor today", value: `${num(summary.todayLabor, 1)} man-days` },
          { label: "Payment today", value: etb(summary.todayPayment) },
          {
            label: "Avg. plan achieved",
            value: summary.avgAchievement == null ? "—" : `${num(summary.avgAchievement, 0)}%`,
            hint: `${summary.awaitingApproval} awaiting approval`,
          },
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
          searchPlaceholder="Search activity, sub-farm, block or names"
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={farmFilter}
                onValueChange={(v) => {
                  setFarmFilter(v);
                  resetPage();
                }}
              >
                <SelectTrigger className="h-8 w-[160px] text-xs" aria-label="Farm office filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All farm offices</SelectItem>
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Farm office · sub-farm</TableHead>
                <TableHead>Activity · block</TableHead>
                <TableHead className="text-right">Plan</TableHead>
                <TableHead className="text-right">Performance</TableHead>
                <TableHead className="text-right">Labor</TableHead>
                <TableHead className="text-right">Payment</TableHead>
                <TableHead>Sign-off</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
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
                paged.map((e) => {
                  const pct = achievementPct(e);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap font-medium">{fmtDate(e.date)}</TableCell>
                      <TableCell className="text-sm">
                        {e.farmOfficeName || "—"}
                        {e.subFarm ? <span className="text-muted-foreground"> · {e.subFarm}</span> : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium">{e.activityName || "—"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {[e.activityCode, e.blockCode].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {num(e.plan)} <span className="text-xs text-muted-foreground">{e.unit}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {num(e.currentPerformance)}
                        {pct != null ? <span className={cn("block text-xs font-medium", pctTone(pct))}>{num(pct, 0)}% of plan</span> : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{num(e.labor, 1)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{etb(e.payment)}</TableCell>
                      <TableCell>
                        <span className="flex flex-col gap-0.5 text-xs">
                          <SignOff label="Prepared" name={e.preparedBy} />
                          <SignOff label="Verified" name={e.verifiedBy} />
                          <SignOff label="Approved" name={e.approvedBy} />
                        </span>
                      </TableCell>
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit record" : "Add record"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fo-date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input id="fo-date" type="date" max={today()} value={draft.date} onChange={(e) => set("date")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Farm office <span className="text-destructive">*</span>
              </Label>
              <Select
                value={draft.farmOfficeId}
                onValueChange={(v) => setDraft((d) => ({ ...d, farmOfficeId: v, blockId: "" }))}
              >
                <SelectTrigger aria-label="Farm office">
                  <SelectValue placeholder={farmsQuery.isLoading ? "Loading…" : "Select farm office"} />
                </SelectTrigger>
                <SelectContent>
                  {farms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fo-subfarm">Sub-farm</Label>
              <Input id="fo-subfarm" value={draft.subFarm} onChange={(e) => set("subFarm")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Activities <span className="text-destructive">*</span>
              </Label>
              <Select
                value={draft.activityId}
                onValueChange={(v) => {
                  const activity = activities.find((a) => a.id === v);
                  setDraft((d) => ({ ...d, activityId: v, unit: activity?.unitOfMeasure ?? d.unit }));
                }}
              >
                <SelectTrigger aria-label="Activity">
                  <SelectValue placeholder={activitiesQuery.isLoading ? "Loading…" : "Select activity"} />
                </SelectTrigger>
                <SelectContent>
                  {activities.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.code} · {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fo-unit">Unit</Label>
              <Input id="fo-unit" value={draft.unit} placeholder="Filled from the activity" onChange={(e) => set("unit")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Block</Label>
              <Select value={draft.blockId || NO_BLOCK} onValueChange={(v) => set("blockId")(v === NO_BLOCK ? "" : v)}>
                <SelectTrigger aria-label="Block">
                  <SelectValue placeholder="Select block" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BLOCK}>No block</SelectItem>
                  {fieldBlocks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name && b.name !== b.code ? `${b.code} · ${b.name}` : b.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 rounded-lg border border-border p-3 sm:col-span-2 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="fo-standard">Standard</Label>
                <Input id="fo-standard" type="number" min={0} step="0.01" value={draft.standard} onChange={(e) => set("standard")(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">{draft.unit || "units"} per man-day</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fo-plan">Plan</Label>
                <Input id="fo-plan" type="number" min={0} step="0.01" value={draft.plan} onChange={(e) => set("plan")(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">{draft.unit || "units"} planned today</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fo-performance">Current performance</Label>
                <Input
                  id="fo-performance"
                  type="number"
                  min={0}
                  step="0.01"
                  value={draft.currentPerformance}
                  onChange={(e) => set("currentPerformance")(e.target.value)}
                />
                <p className={cn("text-[11px]", draftAchievement == null ? "text-muted-foreground" : pctTone(draftAchievement))}>
                  {draftAchievement == null ? `${draft.unit || "units"} done today` : `${num(draftAchievement, 0)}% of plan`}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fo-labor">Labor</Label>
                <Input id="fo-labor" type="number" min={0} step="0.5" value={draft.labor} onChange={(e) => set("labor")(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">
                  {draftOutput == null
                    ? "Man-days"
                    : `${num(draftOutput)} ${draft.unit || "units"}/man-day${
                        draftStandard ? ` · ${num((draftOutput / draftStandard) * 100, 0)}% of standard` : ""
                      }`}
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fo-payment">Payment (ETB)</Label>
                <Input id="fo-payment" type="number" min={0} step="0.01" value={draft.payment} onChange={(e) => set("payment")(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fo-comment">Daily summary comment</Label>
              <Textarea id="fo-comment" rows={3} value={draft.comment} onChange={(e) => set("comment")(e.target.value)} />
            </div>

            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="fo-prepared">Prepared by</Label>
                <Input id="fo-prepared" value={draft.preparedBy} onChange={(e) => set("preparedBy")(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fo-verified">Verified by</Label>
                <Input id="fo-verified" value={draft.verifiedBy} onChange={(e) => set("verifiedBy")(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fo-approved">Approved by</Label>
                <Input id="fo-approved" value={draft.approvedBy} onChange={(e) => set("approvedBy")(e.target.value)} />
              </div>
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
              ? `${fmtDate(deleteTarget.date)} · ${deleteTarget.farmOfficeName} · ${deleteTarget.activityName}`
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
