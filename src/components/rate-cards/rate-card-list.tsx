"use client";

import type { ReactNode } from "react";
import { TablePagination } from "@/components/cropfort/data-table";
import { SectionCard } from "@/components/cropfort/page-shell";

/**
 * Bordered list shell for rate-card tables — toolbar + table body + pagination.
 */
export function RateCardList({
  toolbar,
  children,
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  toolbar: ReactNode;
  children: ReactNode;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <SectionCard flush>
      <div className="space-y-3 border-b border-border px-5 py-4">{toolbar}</div>
      {children}
      <div className="border-t border-border">
        <TablePagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      </div>
    </SectionCard>
  );
}
