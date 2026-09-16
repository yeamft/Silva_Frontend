"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Flag, MoreHorizontal, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { TableMessageRow, TablePagination, TableSkeleton, TableToolbar } from "@/components/cropfort/data-table";
import { FormField } from "@/components/cropfort/form-field";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard, StatCard } from "@/components/cropfort/page-shell";
import { SortableHead, type SortDir } from "@/components/cropfort/sortable-head";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { canDecideRateCard, canEditRateCard, canViewRateCard } from "@/lib/cropfortAccess";
import { formatBirr, formatPct } from "@/lib/formatBirr";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  approveRateCardLine,
  archiveRateCardYear,
  createRateCardCategory,
  createRateCardLine,
  deleteRateCardCategory,
  deleteRateCardLine,
  getRateCardBudgetYears,
  getRateCardCategories,
  getRateCardLines,
  getRateCardSummary,
  returnRateCardLine,
  submitRateCardLines,
  updateRateCardCategory,
  updateRateCardLine,
} from "@/lib/api/rate-card";
import { VARIANCE_FLAG_THRESHOLD_PCT, computeVariance } from "@/lib/mock-api/variance";
import type {
  RateCardBudgetYear,
  RateCardCategory,
  RateCardCategoryConfig,
  RateCardLine,
  RateCardStatus,
} from "@/types/cropfort-modules";
import { currentBudgetYear, formatBudgetYearLabel } from "@/types/cropfort-modules";

const PAGE_SIZE = 12;
const EMPTY_FORM = {
  resourceCode: "",
  resourceName: "",
  category: "" as RateCardCategory,
  unitOfMeasure: "person-day",
  rateBirr: "",
  benchmarkFarmARate: "",
  benchmarkFarmBRate: "",
  justificationNote: "",
  budgetYear: String(currentBudgetYear()),
  effectiveFrom: "",
  effectiveTo: "",
};

type FormState = typeof EMPTY_FORM;

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

export default function RateCardPage() {
  const router = useRouter();
  const { user } = useCropfortAuth();
  const canView = canViewRateCard(user.role);
  const canEdit = canEditRateCard(user.role);
  const canDecide = canDecideRateCard(user.role);

  const [lines, setLines] = useState<RateCardLine[]>([]);
  const [budgetYears, setBudgetYears] = useState<RateCardBudgetYear[]>([]);
  const [categories, setCategories] = useState<RateCardCategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [budgetYear, setBudgetYear] = useState(currentBudgetYear());
  const [status, setStatus] = useState<"all" | RateCardStatus>("all");
  const [category, setCategory] = useState<"all" | RateCardCategory>("all");
  const [flagged, setFlagged] = useState<"all" | "flagged" | "not_flagged">("all");
  const [sortKey, setSortKey] = useState("resourceCode");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RateCardLine | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState("");
  const [editingCategory, setEditingCategory] = useState<RateCardCategoryConfig | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<RateCardCategoryConfig | null>(null);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RateCardLine | null>(null);
  const [approveTarget, setApproveTarget] = useState<RateCardLine | null>(null);
  const [returnTarget, setReturnTarget] = useState<RateCardLine | null>(null);
  const [returnComment, setReturnComment] = useState("");
  const [busy, setBusy] = useState(false);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.active).sort((a, b) => a.label.localeCompare(b.label)),
    [categories],
  );

  const categoryLabelFor = useCallback(
    (value: string) => categories.find((c) => c.value === value)?.label ?? value,
    [categories],
  );

  const reloadCategories = useCallback(async () => {
    const data = await getRateCardCategories();
    setCategories(data);
    return data;
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [data, years] = await Promise.all([
        getRateCardLines({ budgetYear, archived: "active" }),
        getRateCardBudgetYears(),
        reloadCategories(),
      ]);
      setLines(data);
      setBudgetYears(years);
      setSelectedIds((prev) => {
        const draftIds = new Set(
          data.filter((l) => l.status === "draft" && !l.archivedAt).map((l) => l.id),
        );
        return new Set([...prev].filter((id) => draftIds.has(id)));
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load rate card");
    } finally {
      setLoading(false);
    }
  }, [budgetYear, reloadCategories]);

  useEffect(() => {
    if (canView) void reload();
  }, [canView, reload]);

  useEffect(() => {
    setPage(1);
  }, [budgetYear]);

  const yearMeta = budgetYears.find((y) => y.budgetYear === budgetYear);
  const budgetYearOptions = useMemo(() => {
    const years = new Set(budgetYears.map((y) => y.budgetYear));
    years.add(budgetYear);
    years.add(currentBudgetYear());
    years.add(currentBudgetYear() + 1);
    years.add(currentBudgetYear() - 1);
    return [...years].sort((a, b) => b - a);
  }, [budgetYears, budgetYear]);

  const visible = useMemo(() => {
    let rows = lines;
    if (canDecide && !canEdit) {
      rows = rows.filter((l) => l.status === "submitted" || l.status === "approved");
    }
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (l) => l.resourceCode.toLowerCase().includes(q) || l.resourceName.toLowerCase().includes(q)
      );
    }
    if (status !== "all") rows = rows.filter((l) => l.status === status);
    if (category !== "all") rows = rows.filter((l) => l.category === category);
    if (flagged === "flagged") rows = rows.filter((l) => l.flagged);
    if (flagged === "not_flagged") rows = rows.filter((l) => !l.flagged);

    const dir = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey as keyof RateCardLine];
      const bv = b[sortKey as keyof RateCardLine];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
    return rows;
  }, [lines, canDecide, canEdit, debouncedSearch, status, category, flagged, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const summary = getRateCardSummary(canDecide && !canEdit ? lines.filter((l) => l.status === "submitted" || l.status === "approved") : lines);
  const drafts = lines.filter((l) => l.status === "draft" && !l.archivedAt);
  const selectedDrafts = drafts.filter((l) => selectedIds.has(l.id));
  const flaggedSelected = selectedDrafts.filter((l) => l.flagged);
  const missingJustification = flaggedSelected.filter((l) => !l.justificationNote.trim());
  const canSubmit = selectedDrafts.length > 0 && missingJustification.length === 0;
  const visibleDrafts = visible.filter((l) => l.status === "draft" && !l.archivedAt);
  const allVisibleDraftsSelected =
    visibleDrafts.length > 0 && visibleDrafts.every((l) => selectedIds.has(l.id));

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const line of visibleDrafts) {
        if (checked) next.add(line.id);
        else next.delete(line.id);
      }
      return next;
    });
  };

  const selectAllDrafts = () => setSelectedIds(new Set(drafts.map((l) => l.id)));
  const clearSelection = () => setSelectedIds(new Set());

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, category, flagged]);

  const onSort = (column: string) => {
    if (sortKey === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(column);
      setSortDir("asc");
    }
  };

  const openCategories = () => {
    router.push(CROPFORT_ROUTES.rateCardCategories);
  };

  const openCreate = () => {
    if (activeCategories.length === 0) {
      toast.message("Configure categories first", {
        description: "Add Labour, Material, or other categories before creating a rate.",
      });
      openCategories();
      return;
    }
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      category: activeCategories[0].value,
      budgetYear: String(budgetYear),
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (line: RateCardLine) => {
    if (line.archivedAt) {
      toast.message("Archived rates are read-only", {
        description: "Switch to Active rates or restore this budget year to edit.",
      });
      return;
    }
    setEditing(line);
    setForm({
      resourceCode: line.resourceCode,
      resourceName: line.resourceName,
      category: line.category,
      unitOfMeasure: line.unitOfMeasure,
      rateBirr: String(line.rateBirr),
      benchmarkFarmARate: line.benchmarkFarmARate == null ? "" : String(line.benchmarkFarmARate),
      benchmarkFarmBRate: line.benchmarkFarmBRate == null ? "" : String(line.benchmarkFarmBRate),
      justificationNote: line.justificationNote,
      budgetYear: String(line.budgetYear),
      effectiveFrom: line.effectiveFrom ?? "",
      effectiveTo: line.effectiveTo ?? "",
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const saveCategory = async () => {
    if (!categoryLabel.trim()) {
      toast.error("Enter a category name");
      return;
    }
    setCategorySaving(true);
    try {
      if (editingCategory) {
        await updateRateCardCategory(editingCategory.id, {
          label: categoryLabel.trim(),
          active: editingCategory.active,
        });
        toast.success("Category updated");
      } else {
        await createRateCardCategory({ label: categoryLabel.trim() });
        toast.success("Category added");
      }
      setCategoryLabel("");
      setEditingCategory(null);
      await reloadCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save category");
    } finally {
      setCategorySaving(false);
    }
  };

  const preview = computeVariance({
    rateBirr: Number(form.rateBirr) || 0,
    benchmarkFarmARate: parseOptionalNumber(form.benchmarkFarmARate),
    benchmarkFarmBRate: parseOptionalNumber(form.benchmarkFarmBRate),
  });

  const saveLine = async () => {
    const errors: Record<string, string> = {};
    if (!form.resourceCode.trim()) errors.resourceCode = "Resource code is required";
    if (!form.resourceName.trim()) errors.resourceName = "Resource name is required";
    if (!form.category) errors.category = "Select a category";
    if (!form.unitOfMeasure.trim()) errors.unitOfMeasure = "Unit of measure is required";
    const rate = Number(form.rateBirr);
    if (!form.rateBirr.trim() || !Number.isFinite(rate) || rate <= 0) errors.rateBirr = "Enter a rate greater than 0";
    const a = parseOptionalNumber(form.benchmarkFarmARate);
    const b = parseOptionalNumber(form.benchmarkFarmBRate);
    if (form.benchmarkFarmARate && Number.isNaN(a)) errors.benchmarkFarmARate = "Enter a number";
    if (form.benchmarkFarmBRate && Number.isNaN(b)) errors.benchmarkFarmBRate = "Enter a number";
    if (preview.flagged && !form.justificationNote.trim()) {
      errors.justificationNote = `Justification is required when variance exceeds ±${VARIANCE_FLAG_THRESHOLD_PCT}%`;
    }
    const by = Number(form.budgetYear);
    if (!Number.isInteger(by) || by < 2000 || by > 2100) {
      errors.budgetYear = "Select a budget year";
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        resourceCode: form.resourceCode.trim().toUpperCase(),
        resourceName: form.resourceName.trim(),
        category: form.category,
        unitOfMeasure: form.unitOfMeasure.trim(),
        rateBirr: rate,
        benchmarkFarmARate: a && !Number.isNaN(a) ? a : null,
        benchmarkFarmBRate: b && !Number.isNaN(b) ? b : null,
        justificationNote: form.justificationNote.trim(),
        budgetYear: by,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo: form.effectiveTo || null,
      };
      if (editing) await updateRateCardLine(editing.id, payload);
      else await createRateCardLine(payload);
      toast.success(editing ? "Line updated" : "Line created");
      setFormOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmArchiveYear = async () => {
    setArchiving(true);
    try {
      const result = await archiveRateCardYear(budgetYear);
      toast.success(`Archived ${result.archived} rate${result.archived === 1 ? "" : "s"} for ${result.label}`);
      setArchiveOpen(false);
      await reload();
      router.push(CROPFORT_ROUTES.rateCardArchive);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Archive action failed");
    } finally {
      setArchiving(false);
    }
  };

  if (!canView) {
    return <NotAuthorized title="Rate Card" />;
  }

  const showBenchmarks = canEdit;

  return (
    <PageContainer>
      <PageHeader
        title="Rate Card"
        description={`${formatBudgetYearLabel(budgetYear)} · Active rates`}
        actions={
          canEdit ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-11 w-full sm:h-9 sm:w-auto"
                disabled={!(yearMeta?.activeCount ?? lines.length)}
                onClick={() => setArchiveOpen(true)}
              >
                <Archive className="h-4 w-4" aria-hidden />
                Archive year
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-11 w-full sm:h-9 sm:w-auto"
                disabled={selectedDrafts.length === 0}
                onClick={() => setSubmitOpen(true)}
              >
                <Send className="h-4 w-4" aria-hidden />
                <span className="sm:hidden">Submit{selectedDrafts.length ? ` (${selectedDrafts.length})` : ""}</span>
                <span className="hidden sm:inline">
                  Submit for approval{selectedDrafts.length ? ` (${selectedDrafts.length})` : ""}
                </span>
              </Button>
              <Button size="sm" className="h-11 w-full sm:h-9 sm:w-auto" onClick={openCreate}>
                <Plus className="h-4 w-4" aria-hidden />
                New line
              </Button>
            </>
          ) : null
        }
      />

      <section aria-label="Rate card summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total" value={String(summary.total)} />
        {canEdit ? <StatCard label="Draft" value={String(summary.draft)} /> : null}
        <StatCard label="Submitted" value={String(summary.submitted)} />
        <StatCard label="Approved" value={String(summary.approved)} />
        {canEdit ? <StatCard label="Returned" value={String(summary.returned)} /> : null}
        {canEdit ? <StatCard label="Flagged" value={String(summary.flagged)} /> : null}
      </section>

      <SectionCard flush>
        <div className="space-y-3 border-b px-4 py-3">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search code or name"
            activeFilterCount={[status !== "all", category !== "all", flagged !== "all"].filter(Boolean).length}
            onClearFilters={() => {
              setStatus("all");
              setCategory("all");
              setFlagged("all");
            }}
            filters={
              <>
                <Select
                  value={String(budgetYear)}
                  onValueChange={(v) => setBudgetYear(Number(v))}
                >
                  <SelectTrigger className="h-11 min-w-[9rem] shrink-0 sm:h-9 sm:w-[150px]" aria-label="Budget year">
                    <SelectValue placeholder="Budget year" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetYearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {formatBudgetYearLabel(y)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger className="h-11 min-w-[8.5rem] shrink-0 sm:h-9 sm:w-[140px]" aria-label="Filter by status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {canEdit ? <SelectItem value="draft">Draft</SelectItem> : null}
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    {canEdit ? <SelectItem value="returned">Returned</SelectItem> : null}
                  </SelectContent>
                </Select>
                <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                  <SelectTrigger className="h-11 min-w-[8.5rem] shrink-0 sm:h-9 sm:w-[140px]" aria-label="Filter by category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.value}>
                        {c.label}
                        {!c.active ? " (inactive)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canEdit ? (
                  <Select value={flagged} onValueChange={(v) => setFlagged(v as typeof flagged)}>
                    <SelectTrigger className="h-11 min-w-[8.5rem] shrink-0 sm:h-9 sm:w-[150px]" aria-label="Filter by flag">
                      <SelectValue placeholder="Flagged" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All flags</SelectItem>
                      <SelectItem value="flagged">Flagged only</SelectItem>
                      <SelectItem value="not_flagged">Not flagged</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
              </>
            }
          />
          {canEdit && drafts.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {selectedDrafts.length} of {drafts.length} draft{drafts.length === 1 ? "" : "s"} selected
              </span>
              <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs" onClick={selectAllDrafts}>
                Select all drafts
              </Button>
              {selectedDrafts.length > 0 ? (
                <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs" onClick={clearSelection}>
                  Clear
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {canEdit ? (
                <TableHead scope="col" className="w-10 pr-0">
                  <Checkbox
                    checked={allVisibleDraftsSelected ? true : visibleDrafts.some((l) => selectedIds.has(l.id)) ? "indeterminate" : false}
                    onCheckedChange={(v) => toggleSelectAllVisible(v === true)}
                    disabled={visibleDrafts.length === 0}
                    aria-label="Select all draft rates on this page"
                  />
                </TableHead>
              ) : null}
              <SortableHead label="Code" column="resourceCode" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableHead label="Name" column="resourceName" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <TableHead scope="col">Budget year</TableHead>
              <TableHead scope="col">Category</TableHead>
              <TableHead scope="col">UoM</TableHead>
              <SortableHead label="Rate" column="rateBirr" sortKey={sortKey} sortDir={sortDir} onSort={onSort} numeric />
              {showBenchmarks ? (
                <>
                  <TableHead scope="col" className="text-right">
                    Farm A
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Farm B
                  </TableHead>
                  <SortableHead label="Var %" column="variancePct" sortKey={sortKey} sortDir={sortDir} onSort={onSort} numeric />
                  <TableHead scope="col">Flag</TableHead>
                </>
              ) : null}
              <SortableHead label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={8} columns={showBenchmarks ? 13 : 8} />
            ) : paged.length === 0 ? (
              <TableMessageRow colSpan={showBenchmarks ? 13 : 8} icon={Flag} title="No rate card lines" />
            ) : (
              paged.map((line) => (
                <TableRow key={line.id} data-state={selectedIds.has(line.id) ? "selected" : undefined}>
                  {canEdit ? (
                    <TableCell className="pr-0">
                      {line.status === "draft" && !line.archivedAt ? (
                        <Checkbox
                          checked={selectedIds.has(line.id)}
                          onCheckedChange={(v) => toggleSelect(line.id, v === true)}
                          aria-label={`Select ${line.resourceCode}`}
                        />
                      ) : (
                        <span className="inline-block w-4" aria-hidden />
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell className="font-mono text-xs">{line.resourceCode}</TableCell>
                  <TableCell className="font-medium">{line.resourceName}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {line.budgetYearLabel ?? formatBudgetYearLabel(line.budgetYear)}
                    {line.archivedAt ? (
                      <Badge variant="muted" className="ml-1.5 font-normal">
                        Archived
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{categoryLabelFor(line.category)}</TableCell>
                  <TableCell className="text-muted-foreground">{line.unitOfMeasure}</TableCell>
                  <TableCell className="cf-numeric text-right">{formatBirr(line.rateBirr)}</TableCell>
                  {showBenchmarks ? (
                    <>
                      <TableCell className="cf-numeric text-right text-muted-foreground">
                        {line.benchmarkFarmARate == null ? "—" : formatBirr(line.benchmarkFarmARate)}
                      </TableCell>
                      <TableCell className="cf-numeric text-right text-muted-foreground">
                        {line.benchmarkFarmBRate == null ? "—" : formatBirr(line.benchmarkFarmBRate)}
                      </TableCell>
                      <TableCell className="cf-numeric text-right">{formatPct(line.variancePct)}</TableCell>
                      <TableCell>
                        {line.flagged ? (
                          <Badge variant="warning" className="gap-1">
                            <Flag className="h-3 w-3" aria-hidden />
                            Flagged
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Clear</span>
                        )}
                      </TableCell>
                    </>
                  ) : null}
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={line.status} />
                      {line.archivedAt ? <StatusBadge status="archived" /> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && !line.archivedAt && (line.status === "draft" || line.status === "returned") ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${line.resourceCode}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(line)}>Edit</DropdownMenuItem>
                          {line.status === "draft" ? (
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(line)}>
                              Delete
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : canDecide && line.status === "submitted" && !line.archivedAt ? (
                      <div className="flex justify-end gap-1">
                        <Button size="xs" variant="outline" onClick={() => setApproveTarget(line)}>
                          Approve
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => setReturnTarget(line)}>
                          Return
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </SectionCard>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit line" : "New line"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Resource code"
              required
              error={formErrors.resourceCode}
              render={(props) => (
                <Input {...props} value={form.resourceCode} onChange={(e) => setForm({ ...form, resourceCode: e.target.value })} />
              )}
            />
            <FormField
              label="Resource name"
              required
              error={formErrors.resourceName}
              render={(props) => (
                <Input {...props} value={form.resourceName} onChange={(e) => setForm({ ...form, resourceName: e.target.value })} />
              )}
            />
            <FormField
              label="Budget year"
              required
              error={formErrors.budgetYear}
              render={({ id }) => (
                <Select
                  value={form.budgetYear || undefined}
                  onValueChange={(v) => setForm({ ...form, budgetYear: v })}
                >
                  <SelectTrigger id={id}>
                    <SelectValue placeholder="Select FY" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetYearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {formatBudgetYearLabel(y)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FormField
              label="Category"
              required
              error={formErrors.category}
              render={({ id }) => (
                <div className="space-y-2">
                  <Select
                    value={form.category || undefined}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger id={id}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCategories.map((c) => (
                        <SelectItem key={c.id} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                      {editing &&
                      form.category &&
                      !activeCategories.some((c) => c.value === form.category) ? (
                        <SelectItem value={form.category}>
                          {categoryLabelFor(form.category)} (inactive)
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-xs"
                      onClick={() => {
                        setFormOpen(false);
                        openCategories();
                      }}
                    >
                      Manage categories
                    </Button>
                  ) : null}
                </div>
              )}
            />
            <FormField
              label="Unit of measure"
              required
              error={formErrors.unitOfMeasure}
              render={(props) => (
                <Input {...props} value={form.unitOfMeasure} onChange={(e) => setForm({ ...form, unitOfMeasure: e.target.value })} />
              )}
            />
            <FormField
              label="Rate (Birr)"
              required
              error={formErrors.rateBirr}
              render={(props) => (
                <Input {...props} inputMode="decimal" value={form.rateBirr} onChange={(e) => setForm({ ...form, rateBirr: e.target.value })} />
              )}
            />
            <FormField
              label="Benchmark farm A (Birr)"
              optional
              error={formErrors.benchmarkFarmARate}
              render={(props) => (
                <Input
                  {...props}
                  inputMode="decimal"
                  value={form.benchmarkFarmARate}
                  onChange={(e) => setForm({ ...form, benchmarkFarmARate: e.target.value })}
                />
              )}
            />
            <FormField
              label="Benchmark farm B (Birr)"
              optional
              error={formErrors.benchmarkFarmBRate}
              render={(props) => (
                <Input
                  {...props}
                  inputMode="decimal"
                  value={form.benchmarkFarmBRate}
                  onChange={(e) => setForm({ ...form, benchmarkFarmBRate: e.target.value })}
                />
              )}
            />
            <FormField
              label="Effective from"
              optional
              render={(props) => (
                <Input {...props} type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
              )}
            />
            <FormField
              label="Effective to"
              optional
              render={(props) => (
                <Input {...props} type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} />
              )}
            />
            {preview.variancePct != null ? (
              <div className="sm:col-span-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
                <span className="font-medium">{formatPct(preview.variancePct)}</span>
                <span className="text-muted-foreground">
                  {" "}
                  vs benchmark
                  {preview.flagged ? ` · flagged over ±${VARIANCE_FLAG_THRESHOLD_PCT}%` : ""}
                </span>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <FormField
                label="Justification"
                required={preview.flagged}
                error={formErrors.justificationNote}
                render={(props) => (
                  <Textarea
                    {...props}
                    rows={3}
                    value={form.justificationNote}
                    onChange={(e) => setForm({ ...form, justificationNote: e.target.value })}
                  />
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveLine()} disabled={saving}>
              {saving ? "Saving…" : "Save line"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={categoriesOpen}
        onOpenChange={(open) => {
          setCategoriesOpen(open);
          if (!open) {
            setEditingCategory(null);
            setCategoryLabel("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rate categories</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Configure Labour, Material, and other categories before creating rate lines.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <FormField
              className="flex-1"
              label={editingCategory ? "Rename category" : "New category"}
              required
              render={(props) => (
                <Input
                  {...props}
                  placeholder="e.g. Labour, Material, Machinery"
                  value={categoryLabel}
                  onChange={(e) => setCategoryLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void saveCategory();
                    }
                  }}
                />
              )}
            />
            <div className="flex gap-2">
              {editingCategory ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryLabel("");
                  }}
                  disabled={categorySaving}
                >
                  Cancel
                </Button>
              ) : null}
              <Button type="button" onClick={() => void saveCategory()} disabled={categorySaving}>
                {categorySaving ? "Saving…" : editingCategory ? "Update" : "Add"}
              </Button>
            </div>
          </div>

          <ul className="divide-y rounded-lg border">
            {categories.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                No categories yet. Add Labour or Material to get started.
              </li>
            ) : (
              categories
                .slice()
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((cat) => (
                  <li key={cat.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{cat.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{cat.value}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={cat.active}
                        aria-label={`${cat.active ? "Deactivate" : "Activate"} ${cat.label}`}
                        onCheckedChange={async (checked) => {
                          try {
                            await updateRateCardCategory(cat.id, {
                              label: cat.label,
                              active: checked,
                            });
                            await reloadCategories();
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Update failed");
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCategory(cat);
                          setCategoryLabel(cat.label);
                        }}
                      >
                        Rename
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setCategoryDeleteTarget(cat)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))
            )}
          </ul>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCategoriesOpen(false);
                if (activeCategories.length > 0) openCreate();
              }}
            >
              {activeCategories.length > 0 ? "Done — new line" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive budget year?"
        description={`Archive all active rates for ${formatBudgetYearLabel(budgetYear)}. You can review and restore them later from the Archive page.`}
        confirmLabel="Archive year"
        loading={archiving}
        onConfirm={confirmArchiveYear}
      />

      <ConfirmDialog
        open={Boolean(categoryDeleteTarget)}
        onOpenChange={(open) => !open && setCategoryDeleteTarget(null)}
        title="Delete category?"
        description={
          categoryDeleteTarget
            ? `Remove “${categoryDeleteTarget.label}”? Categories used by rate lines cannot be deleted.`
            : undefined
        }
        confirmLabel="Delete"
        loading={busy}
        onConfirm={async () => {
          if (!categoryDeleteTarget) return;
          setBusy(true);
          try {
            await deleteRateCardCategory(categoryDeleteTarget.id);
            toast.success("Category deleted");
            setCategoryDeleteTarget(null);
            if (editingCategory?.id === categoryDeleteTarget.id) {
              setEditingCategory(null);
              setCategoryLabel("");
            }
            await reloadCategories();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Delete failed");
          } finally {
            setBusy(false);
          }
        }}
      />

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for approval</DialogTitle>
          </DialogHeader>
          {flaggedSelected.length > 0 ? (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Submitting {selectedDrafts.length} selected draft{selectedDrafts.length === 1 ? "" : "s"}.
              </p>
              <ul className="space-y-1 text-muted-foreground">
                {flaggedSelected.map((l) => (
                  <li key={l.id}>
                    {l.resourceCode}
                    {l.justificationNote.trim() ? "" : " · needs justification"}
                  </li>
                ))}
              </ul>
              {missingJustification.length > 0 ? (
                <p className="text-destructive">Add a justification to each flagged selected draft first.</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Submit {selectedDrafts.length} selected draft{selectedDrafts.length === 1 ? "" : "s"} for approval?
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canSubmit || submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  const result = await submitRateCardLines(selectedDrafts.map((l) => l.id));
                  toast.success(`Submitted ${result.submitted} line(s)`);
                  setSubmitOpen(false);
                  clearSelection();
                  await reload();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Submit failed");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Submitting…" : `Submit ${selectedDrafts.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete draft line?"
        confirmLabel="Delete"
        loading={busy}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setBusy(true);
          try {
            await deleteRateCardLine(deleteTarget.id);
            toast.success("Line deleted");
            setDeleteTarget(null);
            await reload();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Delete failed");
          } finally {
            setBusy(false);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(approveTarget)}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        title="Approve this rate?"
        confirmLabel="Approve"
        destructive={false}
        loading={busy}
        onConfirm={async () => {
          if (!approveTarget) return;
          setBusy(true);
          try {
            await approveRateCardLine(approveTarget.id);
            toast.success("Line approved");
            setApproveTarget(null);
            await reload();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Approve failed");
          } finally {
            setBusy(false);
          }
        }}
      />

      <Dialog
        open={Boolean(returnTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setReturnTarget(null);
            setReturnComment("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return line</DialogTitle>
          </DialogHeader>
          <FormField
            label="Decision comment"
            required
            render={(props) => (
              <Textarea {...props} value={returnComment} onChange={(e) => setReturnComment(e.target.value)} rows={4} />
            )}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!returnComment.trim() || busy}
              onClick={async () => {
                if (!returnTarget) return;
                setBusy(true);
                try {
                  await returnRateCardLine(returnTarget.id, returnComment);
                  toast.success("Line returned");
                  setReturnTarget(null);
                  setReturnComment("");
                  await reload();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Return failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Return line
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
