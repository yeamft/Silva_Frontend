"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, MoreHorizontal, Plus } from "lucide-react";
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
import { canApproveOperations, canEditPlanScope } from "@/lib/cropfort/platform-access";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { CropfortAfeDto } from "@/lib/api/afes";
import { cn } from "@/lib/utils";
import {
  useAfes,
  useCreateAfe,
  useDecideAfe,
  useSubmitAfe,
} from "@/lib/query/hooks/use-afes";
import { useCreateWorkOrder, useTransitionWorkOrder } from "@/lib/query/hooks/use-work-orders";
import { fmtEtb } from "@/store/cropfortOpsStore";

const PAGE_SIZES = [10, 25, 50];

type StatusFilter = "all" | CropfortAfeDto["status"];

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All statuses" },
  { id: "draft", label: "Draft" },
  { id: "submitted", label: "Submitted" },
  { id: "approved", label: "Approved" },
  { id: "returned", label: "Returned" },
];

export default function AfeView() {
  const { activeProgram, user } = useCropfortAuth();
  const area = getCropfortArea("afe");
  const canCreate = canEditPlanScope(user.role);
  const canDecide = canApproveOperations(user.role);
  const afesQuery = useAfes(Boolean(activeProgram?.id));
  const createAfe = useCreateAfe();
  const submitAfeMut = useSubmitAfe();
  const decideAfeMut = useDecideAfe();
  const createWo = useCreateWorkOrder();
  const transitionWo = useTransitionWorkOrder();

  const afes = afesQuery.data || [];
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("50000");

  const stats = useMemo(
    () => ({
      waiting: afes.filter((a) => a.status === "submitted").length,
      approved: afes.filter((a) => a.status === "approved").length,
      returned: afes.filter((a) => a.status === "returned").length,
      value: afes
        .filter((a) => a.status === "approved")
        .reduce((s, a) => s + a.amountEtb, 0),
    }),
    [afes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return afes.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return `${row.id} ${row.title} ${row.band} ${row.sourceType}`.toLowerCase().includes(q);
    });
  }, [afes, statusFilter, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selected = afes.find((a) => a.id === selectedId) ?? null;

  const create = async () => {
    try {
      const amountEtb = Number(amount);
      if (!title.trim()) throw new Error("Title is required");
      if (!Number.isFinite(amountEtb) || amountEtb < 0) throw new Error("Enter a valid amount");
      const row = await createAfe.mutateAsync({
        title: title.trim(),
        amountEtb,
        sourceType: "manual",
      });
      setCreateOpen(false);
      setTitle("");
      setSelectedId(row.id);
      toast.success("AFE draft created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    }
  };

  const issueWo = async (afe: CropfortAfeDto) => {
    try {
      const wo = await createWo.mutateAsync({
        title: afe.title,
        activity: afe.title,
        plannedCostEtb: afe.amountEtb,
        cropfortAfeId: afe.id,
      });
      await transitionWo.mutateAsync({ id: wo.id, status: "issued" });
      toast.success(`${wo.code} issued from AFE`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not issue work order");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Commit"}
        title={area.label}
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: area.label },
        ]}
        meta={
          <PageMetaStrip
            items={[
              { label: "awaiting", value: String(stats.waiting) },
              { label: "approved", value: String(stats.approved) },
              { label: "returned", value: String(stats.returned) },
              { label: "authorized", value: fmtEtb(stats.value) },
            ]}
          />
        }
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!canCreate}>
            <Plus className="h-3.5 w-3.5" />
            New AFE
          </Button>
        }
      />

      {afesQuery.isError ? (
        <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {afesQuery.error instanceof Error ? afesQuery.error.message : "Failed to load AFEs"}
        </p>
      ) : null}

      <SectionCard title="AFE register" flush>
        <div className="space-y-2 border-b border-border px-4 py-2.5 sm:px-5">
          <TableToolbar
            className="gap-2"
            search={query}
            onSearchChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            searchPlaceholder="Search title, band, or source…"
            activeFilterCount={statusFilter !== "all" ? 1 : 0}
            onClearFilters={() => {
              setStatusFilter("all");
              setPage(1);
            }}
            filters={
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as StatusFilter);
                  setPage(1);
                }}
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
                <TableHead className="w-[7rem]">ID</TableHead>
                <TableHead className="min-w-[12rem]">Title</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead className="w-16">Band</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[7rem]">Status</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {afesQuery.isLoading ? (
                <TableMessageRow colSpan={7} title="Loading AFEs…" />
              ) : paged.length === 0 ? (
                <TableMessageRow
                  colSpan={7}
                  icon={FileText}
                  title={afes.length === 0 ? "No AFEs yet" : "No matching AFEs"}
                  description={
                    afes.length === 0
                      ? "Create an AFE draft, submit it, and approve before issuing work orders."
                      : "Try a different search or status filter."
                  }
                  action={
                    afes.length === 0 ? (
                      <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!canCreate}>
                        New AFE
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
                      className={cn("cursor-pointer", active && "bg-accent/40")}
                      onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}
                    >
                      <TableCell className="font-mono text-xs font-medium">
                        {row.id.slice(0, 10)}
                      </TableCell>
                      <TableCell>
                        <p className="truncate text-sm font-medium">{row.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground md:hidden">
                          {row.sourceType} · Band {row.band}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {row.sourceType}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm font-medium">{row.band}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {fmtEtb(row.amountEtb)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon-sm" variant="ghost" aria-label="Actions">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(row.status === "draft" || row.status === "returned") && canCreate ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  void submitAfeMut
                                    .mutateAsync(row.id)
                                    .then(() => toast.success("AFE submitted"))
                                    .catch((err) =>
                                      toast.error(
                                        err instanceof Error ? err.message : "Submit failed",
                                      ),
                                    )
                                }
                              >
                                Submit for approval
                              </DropdownMenuItem>
                            ) : null}
                            {row.status === "submitted" && canDecide ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    void decideAfeMut
                                      .mutateAsync({ id: row.id, decision: "approve" })
                                      .then(() => toast.success("AFE approved"))
                                      .catch((err) =>
                                        toast.error(
                                          err instanceof Error ? err.message : "Approve failed",
                                        ),
                                      )
                                  }
                                >
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const comment = window.prompt("Return reason");
                                    if (!comment?.trim()) return;
                                    void decideAfeMut
                                      .mutateAsync({
                                        id: row.id,
                                        decision: "return",
                                        comment: comment.trim(),
                                      })
                                      .then(() => toast.success("AFE returned"))
                                      .catch((err) =>
                                        toast.error(
                                          err instanceof Error ? err.message : "Return failed",
                                        ),
                                      );
                                  }}
                                >
                                  Return
                                </DropdownMenuItem>
                              </>
                            ) : null}
                            {row.status === "approved" ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => void issueWo(row)}>
                                  Issue work order
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={CROPFORT_ROUTES.workOrders}>Open work orders</Link>
                                </DropdownMenuItem>
                              </>
                            ) : null}
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

        <TablePagination
          page={safePage}
          pageCount={pageCount}
          pageSize={pageSize}
          pageSizes={PAGE_SIZES}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </SectionCard>

      {selected ? (
        <SectionCard title={selected.title}>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge status={selected.status} />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Band / amount</dt>
              <dd className="font-medium">
                {selected.band} · {fmtEtb(selected.amountEtb)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created by</dt>
              <dd>{selected.createdByName || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Source</dt>
              <dd>{selected.sourceType}</dd>
            </div>
            {selected.returnedComment ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Return comment</dt>
                <dd>{selected.returnedComment}</dd>
              </div>
            ) : null}
          </dl>
        </SectionCard>
      ) : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New AFE</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="afe-title">Title</Label>
              <Input
                id="afe-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Canopy pruning — Q1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="afe-amount">Amount (ETB)</Label>
              <Input
                id="afe-amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void create()} disabled={createAfe.isPending}>
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
