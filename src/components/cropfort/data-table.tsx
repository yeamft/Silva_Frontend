"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Check,
  Search,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Search + filter bar that sits above a table. Filters are passed as children. */
export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  actions,
  activeFilterCount = 0,
  onClearFilters,
  className,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  activeFilterCount?: number;
  onClearFilters?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative w-full">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-11 pl-8 sm:h-9"
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {filters ? (
            <div className="cf-tab-scroll min-w-0 flex-1 sm:flex-wrap sm:overflow-visible">
              {filters}
            </div>
          ) : null}
          {activeFilterCount > 0 && onClearFilters ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 shrink-0 gap-1.5 text-muted-foreground sm:h-8"
              onClick={onClearFilters}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Clear
            </Button>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

/** Result count + prev/next pager. Keeps pagination identical across tables. */
export function TablePagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  className?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        "flex flex-col-reverse items-stretch gap-3 border-t px-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-2",
        className
      )}
    >
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing <span className="cf-numeric font-medium text-foreground">{from}</span>–
        <span className="cf-numeric font-medium text-foreground">{to}</span> of{" "}
        <span className="cf-numeric font-medium text-foreground">{total}</span>
      </p>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {pageSizeOptions && onPageSizeChange ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">Rows per page</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              value={pageSize}
              aria-label="Rows per page"
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <span className="px-2 text-xs text-muted-foreground">
            Page <span className="cf-numeric font-medium text-foreground">{page}</span> of{" "}
            <span className="cf-numeric font-medium text-foreground">{Math.max(pageCount, 1)}</span>
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Skeleton rows so tables don't collapse while data loads. */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((__, c) => (
            <TableCell key={c}>
              <Skeleton className={cn("h-4", c === 0 ? "w-40" : "w-20")} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Full-width message row for empty / no-match / error states inside a table body. */
export function TableMessageRow({
  colSpan,
  icon: Icon,
  title,
  description,
  action,
}: {
  colSpan: number;
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-12">
        <div className="flex flex-col items-center justify-center gap-2.5 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{title}</p>
            {description ? (
              <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      </TableCell>
    </TableRow>
  );
}

export type SortDirection = "asc" | "desc";

export interface SortState<K extends string = string> {
  key: K;
  direction: SortDirection;
}

/** Toggles a sort state, defaulting a newly selected column to ascending. */
export function nextSort<K extends string>(current: SortState<K>, key: K): SortState<K> {
  if (current.key !== key) return { key, direction: "asc" };
  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}

/**
 * Sortable column header. Announces direction via `aria-sort` and keeps the
 * whole label keyboard-activatable.
 */
export function SortableHead<K extends string>({
  columnKey,
  sort,
  onSortChange,
  children,
  className,
  align = "left",
}: {
  columnKey: K;
  sort: SortState<K>;
  onSortChange: (next: SortState<K>) => void;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  const active = sort.key === columnKey;
  const Icon = !active ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead
      scope="col"
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      className={cn("p-0", className)}
    >
      <button
        type="button"
        onClick={() => onSortChange(nextSort(sort, columnKey))}
        className={cn(
          "cf-focus flex h-10 w-full items-center gap-1 px-4 text-xs font-medium uppercase tracking-wide transition-colors hover:text-foreground",
          align === "right" && "justify-end",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <span>{children}</span>
        <Icon className={cn("h-3.5 w-3.5 shrink-0", !active && "opacity-40")} aria-hidden />
      </button>
    </TableHead>
  );
}

/** Applies a `SortState` to a row list using a per-column accessor map. */
export function sortRows<T, K extends string>(
  rows: T[],
  sort: SortState<K>,
  accessors: Record<K, (row: T) => string | number | null | undefined>
): T[] {
  const accessor = accessors[sort.key];
  if (!accessor) return rows;
  const factor = sort.direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
    return String(av).localeCompare(String(bv), undefined, { numeric: true }) * factor;
  });
}

export interface FilterOption {
  value: string;
  label: string;
}

/** Checkbox-list filter in a popover. Selecting nothing means "no filter". */
export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5 font-normal", className)}>
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {label}
          {selected.length > 0 ? (
            <Badge variant="secondary" className="ml-0.5 px-1.5 py-0">
              {selected.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5">
        <fieldset>
          <legend className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{label}</legend>
          <div className="cf-scroll max-h-64 overflow-y-auto">
            {options.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(option.value)}
                    className="cf-focus h-3.5 w-3.5 rounded border-input accent-primary"
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {checked ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
                </label>
              );
            })}
          </div>
        </fieldset>
        {selected.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start text-xs text-muted-foreground"
            onClick={() => onChange([])}
          >
            Clear {label.toLowerCase()}
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export { SlidersHorizontal };
