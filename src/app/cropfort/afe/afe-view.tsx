"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  TableMessageRow,
  TablePagination,
  TableToolbar,
} from "@/components/cropfort/data-table";
import {
  PageContainer,
  PageHeader,
  PageMetaStrip,
  SectionCard,
} from "@/components/cropfort/page-shell";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { getCropfortArea } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { cn } from "@/lib/utils";
import {
  fmtEtb,
  type AfeDoc,
  type AfeStatus,
  useCropfortOpsStore,
} from "@/store/cropfortOpsStore";

const PAGE_SIZES = [10, 25, 50];

type StatusFilter = "all" | AfeStatus;

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: "draft", label: "Draft" },
  { id: "submitted", label: "Submitted" },
  { id: "approved", label: "Approved" },
  { id: "issued", label: "Issued" },
  { id: "returned", label: "Returned" },
];

const SOURCE_LABEL: Record<AfeDoc["sourceType"], string> = {
  project: "Project",
  intervention: "Intervention",
  afp: "AFP",
};

export default function AfeView() {
  const { activeProgram } = useCropfortAuth();
  const area = getCropfortArea("afe");
  const afes = useCropfortOpsStore((s) => s.afes);
  const projects = useCropfortOpsStore((s) => s.projects);
  const interventions = useCropfortOpsStore((s) => s.interventions);
  const blockName = useCropfortOpsStore((s) => s.blockName);
  const submitAfe = useCropfortOpsStore((s) => s.submitAfe);
  const issueWorkOrder = useCropfortOpsStore((s) => s.issueWorkOrder);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      waiting: afes.filter((a) => a.status === "submitted").length,
      approved: afes.filter((a) => a.status === "approved").length,
      issued: afes.filter((a) => a.status === "issued").length,
      value: afes
        .filter((a) => a.status === "approved" || a.status === "issued")
        .reduce((s, a) => s + a.amountEtb, 0),
    }),
    [afes],
  );

  const sourceLabel = (row: AfeDoc) => {
    if (row.sourceType === "project") {
      const src = projects.find((p) => p.id === row.sourceId);
      return src ? `${src.code}` : "Project";
    }
    if (row.sourceType === "intervention") {
      const src = interventions.find((p) => p.id === row.sourceId);
      return src ? `${src.code}` : "Intervention";
    }
    return "AFP";
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return afes.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${row.code} ${row.title} ${row.sourceType} ${row.band} ${blockName(row.blockId)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [afes, statusFilter, query, blockName]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selected = afes.find((a) => a.id === selectedId) ?? null;

  const onFilterChange = (next: StatusFilter) => {
    setStatusFilter(next);
    setPage(1);
  };

  const onSearchChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Commit"}
        title={area.label}
        description="Authority for Expenditure — raise, approve, and issue work orders."
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: area.label },
        ]}
        meta={
          <PageMetaStrip
            items={[
              { label: "awaiting", value: String(stats.waiting) },
              { label: "approved", value: String(stats.approved) },
              { label: "issued", value: String(stats.issued) },
              { label: "authorized", value: fmtEtb(stats.value) },
            ]}
          />
        }
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href={CROPFORT_ROUTES.projects}>Raise from a project</Link>
          </Button>
        }
      />

      <SectionCard title="AFE register" flush>
        <div className="space-y-2 border-b border-border px-4 py-2.5 sm:px-5">
          <TableToolbar
            className="gap-2"
            search={query}
            onSearchChange={onSearchChange}
            searchPlaceholder="Search code, title, block, or source…"
            activeFilterCount={statusFilter !== "all" ? 1 : 0}
            onClearFilters={() => onFilterChange("all")}
            filters={
              <Select
                value={statusFilter}
                onValueChange={(v) => onFilterChange(v as StatusFilter)}
              >
                <SelectTrigger className="h-8 w-auto min-w-[8.5rem] shrink-0" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
        </div>

        <div className="cf-table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[7rem]">Code</TableHead>
                <TableHead className="min-w-[12rem]">Title</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead className="hidden lg:table-cell">Block</TableHead>
                <TableHead className="w-16">Band</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[7rem]">Status</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableMessageRow
                  colSpan={8}
                  icon={FileText}
                  title={afes.length === 0 ? "No AFEs yet" : "No matching AFEs"}
                  description={
                    afes.length === 0
                      ? "Raise an AFE from an approved project, intervention, or AFP."
                      : "Try a different search or status filter."
                  }
                  action={
                    afes.length === 0 ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={CROPFORT_ROUTES.projects}>Open projects</Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                paged.map((row) => {
                  const active = selected?.id === row.id;
                  return (
                    <TableRow
                      key={row.id}
                      data-state={active ? "selected" : undefined}
                      className={cn(
                        "cursor-pointer",
                        active && "bg-accent/40",
                      )}
                      onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}
                    >
                      <TableCell className="font-mono text-xs font-medium">
                        {row.code}
                      </TableCell>
                      <TableCell>
                        <p className="truncate text-sm font-medium">{row.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground md:hidden">
                          {SOURCE_LABEL[row.sourceType]} · {sourceLabel(row)}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        <span className="font-medium text-foreground">
                          {SOURCE_LABEL[row.sourceType]}
                        </span>
                        <span className="mx-1 text-border">·</span>
                        <span className="font-mono text-xs">{sourceLabel(row)}</span>
                      </TableCell>
                      <TableCell className="hidden text-sm lg:table-cell">
                        {blockName(row.blockId) || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm font-medium">
                        {row.band}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {fmtEtb(row.amountEtb)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label={`Actions for ${row.code}`}
                            >
                              <MoreHorizontal className="h-4 w-4" aria-hidden />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {(row.status === "draft" || row.status === "returned") && (
                              <DropdownMenuItem
                                onClick={() => {
                                  submitAfe(row.id);
                                  toast.success(`${row.code} sent to Approvals`);
                                }}
                              >
                                Submit for approval
                              </DropdownMenuItem>
                            )}
                            {row.status === "approved" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  try {
                                    const wo = issueWorkOrder(row.id);
                                    toast.success(`${wo.code} issued`);
                                  } catch (err) {
                                    toast.error(
                                      err instanceof Error ? err.message : "Could not issue",
                                    );
                                  }
                                }}
                              >
                                Issue work order
                              </DropdownMenuItem>
                            )}
                            {row.status === "issued" && (
                              <DropdownMenuItem asChild>
                                <Link href={CROPFORT_ROUTES.workOrders}>Open work orders</Link>
                              </DropdownMenuItem>
                            )}
                            {row.status === "submitted" && (
                              <DropdownMenuItem asChild>
                                <Link href={CROPFORT_ROUTES.approvals}>Open Approvals</Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setSelectedId(row.id)}>
                              View details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="px-3 sm:px-4">
          <TablePagination
            page={safePage}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            pageSizeOptions={PAGE_SIZES}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      </SectionCard>

      {selected ? (
        <SectionCard
          title={selected.title}
          description={`${selected.code} · Band ${selected.band} · ${blockName(selected.blockId) || "No block"}`}
          action={<StatusBadge status={selected.status} />}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Amount
              </p>
              <p className="cf-numeric mt-0.5 text-sm font-semibold">
                {fmtEtb(selected.amountEtb)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Source
              </p>
              <p className="mt-0.5 text-sm">
                {SOURCE_LABEL[selected.sourceType]} · {sourceLabel(selected)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Block
              </p>
              <p className="mt-0.5 text-sm">{blockName(selected.blockId) || "—"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Band
              </p>
              <p className="mt-0.5 text-sm font-medium">Band {selected.band}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(selected.status === "draft" || selected.status === "returned") && (
              <Button
                size="sm"
                onClick={() => {
                  submitAfe(selected.id);
                  toast.success(`${selected.code} sent to Approvals`);
                }}
              >
                Submit for approval
              </Button>
            )}
            {selected.status === "approved" && (
              <Button
                size="sm"
                onClick={() => {
                  try {
                    const wo = issueWorkOrder(selected.id);
                    toast.success(`${wo.code} issued`);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Could not issue");
                  }
                }}
              >
                Issue work order
              </Button>
            )}
            {selected.status === "issued" && (
              <Button size="sm" variant="outline" asChild>
                <Link href={CROPFORT_ROUTES.workOrders}>Open work orders</Link>
              </Button>
            )}
            {selected.status === "submitted" && (
              <Button size="sm" variant="outline" asChild>
                <Link href={CROPFORT_ROUTES.approvals}>Open Approvals</Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </div>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
