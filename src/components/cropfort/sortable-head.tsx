"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export function SortableHead({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  className,
  numeric,
}: {
  label: string;
  column: string;
  sortKey: string;
  sortDir: SortDir;
  onSort: (column: string) => void;
  className?: string;
  numeric?: boolean;
}) {
  const active = sortKey === column;
  const ariaSort = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";

  return (
    <TableHead
      scope="col"
      aria-sort={ariaSort}
      className={cn(numeric && "text-right", className)}
    >
      <button
        type="button"
        className={cn(
          "cf-focus inline-flex items-center gap-1 rounded-sm font-medium uppercase tracking-wide",
          numeric && "ml-auto"
        )}
        onClick={() => onSort(column)}
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" aria-hidden />
          ) : (
            <ArrowDown className="h-3 w-3" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />
        )}
        <span className="sr-only">
          {active ? `sorted ${sortDir}` : "not sorted"}
        </span>
      </button>
    </TableHead>
  );
}
