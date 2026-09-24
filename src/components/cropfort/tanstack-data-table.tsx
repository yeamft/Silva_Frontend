"use client";

import { flexRender, type Table as TanStackTable } from "@tanstack/react-table";
import { SearchX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableMessageRow, TablePagination, TableSkeleton } from "@/components/cropfort/data-table";
import { cn } from "@/lib/utils";

type DataTableProps<TData> = {
  table: TanStackTable<TData>;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Hide pager when all rows fit on one page */
  showPagination?: boolean;
  pageSizeOptions?: number[];
  className?: string;
  containerClassName?: string;
};

/**
 * Headless TanStack Table renderer using Cropfort table primitives.
 * Pass a configured `useReactTable` instance; keep column defs at the call site.
 */
export function DataTable<TData>({
  table,
  loading = false,
  emptyTitle = "No records",
  emptyDescription,
  showPagination = true,
  pageSizeOptions = [10, 25, 50],
  className,
  containerClassName,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const colCount = table.getVisibleLeafColumns().length;
  const pagination = table.getState().pagination;
  const pageCount = table.getPageCount();
  // Prefer filtered count when the table was configured with getFilteredRowModel;
  // fall back to core/row model so missing filter setup cannot freeze the page.
  let filtered = rows.length;
  try {
    filtered = table.getFilteredRowModel().rows.length;
  } catch {
    filtered = table.getCoreRowModel().rows.length;
  }

  return (
    <div className={cn("space-y-0", className)}>
      <Table containerClassName={cn("rounded-none border-0", containerClassName)}>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    aria-sort={
                      sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"
                    }
                    className={cn(
                      header.column.columnDef.meta &&
                        typeof header.column.columnDef.meta === "object" &&
                        "align" in header.column.columnDef.meta &&
                        (header.column.columnDef.meta as { align?: string }).align === "right" &&
                        "text-right",
                      canSort && "p-0",
                    )}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        className={cn(
                          "cf-focus flex h-11 w-full items-center gap-1 px-4 text-xs font-medium uppercase tracking-wide transition-colors hover:text-foreground sm:px-5",
                          sorted ? "text-foreground" : "text-muted-foreground",
                          header.column.columnDef.meta &&
                            typeof header.column.columnDef.meta === "object" &&
                            "align" in header.column.columnDef.meta &&
                            (header.column.columnDef.meta as { align?: string }).align === "right" &&
                            "justify-end",
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="text-[10px] opacity-60" aria-hidden>
                          {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}
                        </span>
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableSkeleton rows={5} columns={colCount || 4} />
          ) : rows.length === 0 ? (
            <TableMessageRow
              colSpan={colCount || 4}
              icon={SearchX}
              title={emptyTitle}
              description={emptyDescription}
            />
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      cell.column.columnDef.meta &&
                        typeof cell.column.columnDef.meta === "object" &&
                        "align" in cell.column.columnDef.meta &&
                        (cell.column.columnDef.meta as { align?: string }).align === "right" &&
                        "text-right",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showPagination && !loading && filtered > 0 ? (
        <div className="px-4 sm:px-5">
          <TablePagination
            page={pagination.pageIndex + 1}
            pageCount={Math.max(pageCount, 1)}
            total={filtered}
            pageSize={pagination.pageSize}
            onPageChange={(page) => table.setPageIndex(page - 1)}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={(size) => {
              table.setPageSize(size);
              table.setPageIndex(0);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "right";
  }
}
