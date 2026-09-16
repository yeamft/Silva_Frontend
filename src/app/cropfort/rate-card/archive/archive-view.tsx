"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArchiveRestore, Flag, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cropfort/confirm-dialog";
import { TableMessageRow, TablePagination, TableSkeleton, TableToolbar } from "@/components/cropfort/data-table";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import { PageContainer, PageHeader, SectionCard, StatCard } from "@/components/cropfort/page-shell";
import { SortableHead, type SortDir } from "@/components/cropfort/sortable-head";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { canEditRateCard, canViewRateCard } from "@/lib/cropfortAccess";
import { formatBirr, formatPct } from "@/lib/formatBirr";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  getRateCardBudgetYears,
  getRateCardCategories,
  getRateCardLines,
  getRateCardSummary,
  unarchiveRateCardYear,
} from "@/lib/api/rate-card";
import type {
  RateCardBudgetYear,
  RateCardCategory,
  RateCardCategoryConfig,
  RateCardLine,
  RateCardStatus,
} from "@/types/cropfort-modules";
import { currentBudgetYear, formatBudgetYearLabel } from "@/types/cropfort-modules";

const PAGE_SIZE = 12;
const ALL_YEARS = "all";

export default function RateCardArchivePage() {
  const { user } = useCropfortAuth();
  const canView = canViewRateCard(user.role);
  const canEdit = canEditRateCard(user.role);

  const [lines, setLines] = useState<RateCardLine[]>([]);
  const [budgetYears, setBudgetYears] = useState<RateCardBudgetYear[]>([]);
  const [categories, setCategories] = useState<RateCardCategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [budgetYear, setBudgetYear] = useState<number | typeof ALL_YEARS>(ALL_YEARS);
  const [status, setStatus] = useState<"all" | RateCardStatus>("all");
  const [category, setCategory] = useState<"all" | RateCardCategory>("all");
  const [sortKey, setSortKey] = useState("budgetYear");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [restoreYear, setRestoreYear] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);

  const categoryLabelFor = useCallback(
    (value: string) => categories.find((c) => c.value === value)?.label ?? value,
    [categories],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [data, years, cats] = await Promise.all([
        getRateCardLines({
          ...(budgetYear === ALL_YEARS ? {} : { budgetYear }),
          archived: "archived",
        }),
        getRateCardBudgetYears(),
        getRateCardCategories(),
      ]);
      setLines(data);
      setBudgetYears(years);
      setCategories(cats);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load archived rates");
    } finally {
      setLoading(false);
    }
  }, [budgetYear]);

  useEffect(() => {
    if (canView) void reload();
  }, [canView, reload]);

  useEffect(() => {
    setPage(1);
  }, [budgetYear, debouncedSearch, status, category]);

  const archivedYears = useMemo(
    () => budgetYears.filter((y) => y.archivedCount > 0).sort((a, b) => b.budgetYear - a.budgetYear),
    [budgetYears],
  );

  const visible = useMemo(() => {
    let rows = lines;
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (l) => l.resourceCode.toLowerCase().includes(q) || l.resourceName.toLowerCase().includes(q),
      );
    }
    if (status !== "all") rows = rows.filter((l) => l.status === status);
    if (category !== "all") rows = rows.filter((l) => l.category === category);

    const dir = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey as keyof RateCardLine];
      const bv = b[sortKey as keyof RateCardLine];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
    });
    return rows;
  }, [lines, debouncedSearch, status, category, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const summary = getRateCardSummary(lines);
  const totalArchived = budgetYears.reduce((sum, y) => sum + y.archivedCount, 0);
  const selectedYearMeta =
    budgetYear === ALL_YEARS ? null : budgetYears.find((y) => y.budgetYear === budgetYear);

  const onSort = (column: string) => {
    if (sortKey === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(column);
      setSortDir(column === "budgetYear" ? "desc" : "asc");
    }
  };

  const confirmRestore = async () => {
    if (restoreYear == null) return;
    setRestoring(true);
    try {
      const result = await unarchiveRateCardYear(restoreYear);
      toast.success(`Restored ${result.restored} rate${result.restored === 1 ? "" : "s"} for ${result.label}`);
      setRestoreYear(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  if (!canView) {
    return <NotAuthorized title="Rate Card Archive" />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Rate Card Archive"
        breadcrumbs={[
          { label: "Rate Card", href: CROPFORT_ROUTES.rateCard },
          { label: "Archive" },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-11 w-full sm:h-9 sm:w-auto" asChild>
              <Link href={CROPFORT_ROUTES.rateCard}>Back to rates</Link>
            </Button>
            {canEdit && budgetYear !== ALL_YEARS ? (
              <Button
                size="sm"
                className="h-11 w-full sm:h-9 sm:w-auto"
                disabled={!selectedYearMeta?.archivedCount}
                onClick={() => setRestoreYear(budgetYear)}
              >
                <ArchiveRestore className="h-4 w-4" aria-hidden />
                Restore {formatBudgetYearLabel(budgetYear)}
              </Button>
            ) : null}
          </>
        }
      />

      <section aria-label="Archive summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Archived lines" value={String(totalArchived)} />
        <StatCard label="Budget years" value={String(archivedYears.length)} />
        <StatCard label="In this view" value={String(summary.total)} />
        <StatCard
          label="Current FY"
          value={formatBudgetYearLabel(currentBudgetYear()).replace("FY ", "")}
        />
      </section>

      {archivedYears.length > 0 ? (
        <SectionCard title="Archived by year">
          <ul className="divide-y divide-border/70" role="list">
            {archivedYears.map((year) => (
              <li key={year.budgetYear} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <button
                  type="button"
                  className="cf-focus rounded text-left"
                  onClick={() => setBudgetYear(year.budgetYear)}
                >
                  <span className="text-sm font-medium text-foreground">{year.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{year.archivedCount}</span>
                </button>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setRestoreYear(year.budgetYear)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Restore
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard flush>
        <div className="space-y-3 border-b px-4 py-3">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search archived code or name"
            activeFilterCount={[budgetYear !== ALL_YEARS, status !== "all", category !== "all"].filter(Boolean).length}
            onClearFilters={() => {
              setBudgetYear(ALL_YEARS);
              setStatus("all");
              setCategory("all");
            }}
            filters={
              <>
                <Select
                  value={budgetYear === ALL_YEARS ? ALL_YEARS : String(budgetYear)}
                  onValueChange={(v) => setBudgetYear(v === ALL_YEARS ? ALL_YEARS : Number(v))}
                >
                  <SelectTrigger className="h-11 min-w-[9rem] shrink-0 sm:h-9 sm:w-[160px]" aria-label="Budget year">
                    <SelectValue placeholder="Budget year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_YEARS}>All years</SelectItem>
                    {(archivedYears.length
                      ? archivedYears.map((y) => y.budgetYear)
                      : [currentBudgetYear(), currentBudgetYear() - 1]
                    ).map((y) => (
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
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
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
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            }
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Code" column="resourceCode" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableHead label="Name" column="resourceName" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <SortableHead label="Budget year" column="budgetYear" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <TableHead scope="col">Category</TableHead>
              <TableHead scope="col">UoM</TableHead>
              <SortableHead label="Rate" column="rateBirr" sortKey={sortKey} sortDir={sortDir} onSort={onSort} numeric />
              {canEdit ? (
                <SortableHead label="Var %" column="variancePct" sortKey={sortKey} sortDir={sortDir} onSort={onSort} numeric />
              ) : null}
              <SortableHead label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
              <TableHead scope="col">Archived</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={8} columns={canEdit ? 9 : 8} />
            ) : paged.length === 0 ? (
              <TableMessageRow
                colSpan={canEdit ? 9 : 8}
                icon={Flag}
                title="No archived rates"
              />
            ) : (
              paged.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-mono text-xs">{line.resourceCode}</TableCell>
                  <TableCell className="font-medium">{line.resourceName}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {line.budgetYearLabel ?? formatBudgetYearLabel(line.budgetYear)}
                  </TableCell>
                  <TableCell>{categoryLabelFor(line.category)}</TableCell>
                  <TableCell className="text-muted-foreground">{line.unitOfMeasure}</TableCell>
                  <TableCell className="cf-numeric text-right">{formatBirr(line.rateBirr)}</TableCell>
                  {canEdit ? (
                    <TableCell className="cf-numeric text-right">{formatPct(line.variancePct)}</TableCell>
                  ) : null}
                  <TableCell>
                    <StatusBadge status={line.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {line.archivedAt
                      ? new Date(line.archivedAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
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

      <ConfirmDialog
        open={restoreYear != null}
        onOpenChange={(open) => !open && setRestoreYear(null)}
        title="Restore budget year?"
        description={
          restoreYear != null
            ? `Restore archived rates for ${formatBudgetYearLabel(restoreYear)} to the active Rates list so they can be edited again.`
            : undefined
        }
        confirmLabel="Restore year"
        loading={restoring}
        destructive={false}
        onConfirm={confirmRestore}
      />
    </PageContainer>
  );
}
