"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, ClipboardList, MapPinned, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  TableMessageRow,
  TablePagination,
} from "@/components/cropfort/data-table";
import {
  OpsDeskChatter,
  OpsDeskControlPanel,
  OpsDeskFilterChips,
  OpsDeskHeader,
  OpsDeskList,
  OpsDeskPage,
} from "@/components/cropfort/ops-desk";
import { StatusSummaryCards } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { MISS_CAUSE_OPTIONS, type MissCause } from "@/lib/cropfort/miss-cause";
import {
  canSiteCheckRecords,
  canValidateRecords,
} from "@/lib/cropfort/platform-access";
import { validateDfr } from "@/lib/schedule5";
import { cn } from "@/lib/utils";
import {
  useDailyFieldRecords,
  useReturnDailyFieldRecord,
  useSiteCheckDailyFieldRecord,
  useValidateDailyFieldRecord,
} from "@/lib/query/hooks/use-daily-field-records";
import { useAgreementConfigStore } from "@/store/agreementConfigStore";
import type { DailyFieldRecord, DfrStatus } from "@/types/agronomic-cycle";

const PAGE_SIZES = [10, 25, 50];

type StatusFilter = "all" | "submitted" | "site_checked";

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All in queue" },
  { id: "submitted", label: "Submitted" },
  { id: "site_checked", label: "Site checked" },
];

function varianceTone(pct: number) {
  const abs = Math.abs(pct);
  if (abs <= 10) return "text-foreground";
  if (abs <= 20) return "text-warning";
  return "text-destructive";
}

export default function ValidationQueueView() {
  const { activeProgram, user } = useCropfortAuth();
  const dfrQuery = useDailyFieldRecords(Boolean(activeProgram?.id));
  const siteCheckMut = useSiteCheckDailyFieldRecord();
  const validateMut = useValidateDailyFieldRecord();
  const returnMut = useReturnDailyFieldRecord();
  const records = dfrQuery.data || [];
  const schedule5 = useAgreementConfigStore((s) => s.schedule5);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [qualityScore, setQualityScore] = useState("92");
  const [missCause, setMissCause] = useState<MissCause | "">("");
  const [failedCriteriaText, setFailedCriteriaText] = useState("");

  const canSite = canSiteCheckRecords(user.role);
  const canValidate = canValidateRecords(user.role);

  const queue = useMemo(
    () => records.filter((r) => r.status === "submitted" || r.status === "site_checked"),
    [records],
  );

  const stats = useMemo(
    () => ({
      submitted: queue.filter((r) => r.status === "submitted").length,
      siteChecked: queue.filter((r) => r.status === "site_checked").length,
      highVariance: queue.filter((r) => Math.abs(r.variancePct) > 10).length,
    }),
    [queue],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return queue.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${row.code} ${row.activityName} ${row.activityCode} ${row.blockCode} ${row.date}`.toLowerCase();
      return hay.includes(q);
    });
  }, [queue, statusFilter, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selected = useMemo(
    () =>
      (selectedId
        ? queue.find((r) => r.id === selectedId)
        : null) ?? null,
    [queue, selectedId],
  );

  const issues = selected
    ? validateDfr({ ...selected, expectedBlockId: selected.blockId }, schedule5)
    : [];

  const onFilterChange = (next: StatusFilter) => {
    setStatusFilter(next);
    setPage(1);
  };

  const onSearchChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const runSiteCheck = async (row: DailyFieldRecord) => {
    try {
      const q = Number(qualityScore);
      await siteCheckMut.mutateAsync({
        id: row.id,
        note: note || "Site verified",
        qualityScore: Number.isFinite(q) ? q : undefined,
      });
      setNote("");
      toast.success(`${row.code} site checked`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const runValidate = async (row: DailyFieldRecord) => {
    try {
      const q = Number(qualityScore);
      await validateMut.mutateAsync({
        id: row.id,
        note: note || "Validated under Sch. 5",
        qualityScore: Number.isFinite(q) ? q : undefined,
        missCause: missCause || null,
      });
      setSelectedId(null);
      setNote("");
      setMissCause("");
      toast.success(`${row.code} validated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validation failed");
    }
  };

  const runReturn = async (row: DailyFieldRecord) => {
    if (!note.trim()) {
      toast.error("Return note required");
      return;
    }
    const criteria = failedCriteriaText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await returnMut.mutateAsync({
        id: row.id,
        note,
        failedCriteria: criteria.length ? criteria : [note.trim()],
      });
      setSelectedId(null);
      setNote("");
      setFailedCriteriaText("");
      toast.message(`${row.code} returned for correction`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Return failed");
    }
  };

  return (
    <OpsDeskPage>
      <OpsDeskHeader
        eyebrow={activeProgram?.name || "Control"}
        title="Validation"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Control" },
          { label: "Validation" },
        ]}
      />

      <StatusSummaryCards
        label="Validation queue status summary"
        columns={3}
        items={[
          {
            id: "submitted",
            label: "Submitted",
            value: String(stats.submitted),
            icon: ClipboardList,
            footnote: "Awaiting site check",
            active: statusFilter === "submitted",
            onClick: () => {
              setStatusFilter("submitted");
              setPage(1);
            },
          },
          {
            id: "site_checked",
            label: "Site checked",
            value: String(stats.siteChecked),
            icon: MapPinned,
            footnote: "Ready to validate",
            intent: "positive",
            active: statusFilter === "site_checked",
            onClick: () => {
              setStatusFilter("site_checked");
              setPage(1);
            },
          },
          {
            id: "high_variance",
            label: ">10% variance",
            value: String(stats.highVariance),
            icon: AlertTriangle,
            footnote: "Needs attention",
            intent: "negative",
            emphasis: stats.highVariance > 0,
          },
        ]}
      />

      <OpsDeskControlPanel
        search={query}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search code, activity, or block…"
        filters={
          <OpsDeskFilterChips
            value={statusFilter}
            onChange={(id) => onFilterChange(id as StatusFilter)}
            options={STATUS_OPTIONS}
          />
        }
      />

      <OpsDeskList>
        <div className="cf-table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[7rem]">Code</TableHead>
                <TableHead className="min-w-[11rem]">Activity</TableHead>
                <TableHead className="hidden sm:table-cell">Block</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Planned</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Var %</TableHead>
                <TableHead className="w-[7.5rem]">Status</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableMessageRow
                  colSpan={9}
                  icon={ClipboardCheck}
                  title={queue.length === 0 ? "No DFRs waiting" : "No matching records"}
                  description={
                    queue.length === 0
                      ? "Submitted and site-checked daily field records appear here."
                      : "Try a different search or status filter."
                  }
                />
              ) : (
                paged.map((row) => {
                  const active = selected?.id === row.id;
                  const overTolerance = Math.abs(row.variancePct) > 10;
                  return (
                    <TableRow
                      key={row.id}
                      data-state={active ? "selected" : undefined}
                      className={cn("cursor-pointer", active && "bg-accent/40")}
                      onClick={() => {
                        setSelectedId(row.id === selectedId ? null : row.id);
                        setNote("");
                      }}
                    >
                      <TableCell className="font-mono text-xs font-medium">{row.code}</TableCell>
                      <TableCell>
                        <p className="truncate text-sm font-medium">{row.activityName}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {row.activityCode}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-sm sm:table-cell">{row.blockCode}</TableCell>
                      <TableCell className="hidden tabular-nums text-sm md:table-cell">
                        {row.date}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {row.plannedQty} {row.unit}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {row.actualQty} {row.unit}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums text-sm font-medium",
                          varianceTone(row.variancePct),
                        )}
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          {overTolerance ? (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          ) : null}
                          {row.variancePct > 0 ? "+" : ""}
                          {row.variancePct}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status as DfrStatus} />
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
                            {row.status === "submitted" && canSite ? (
                              <DropdownMenuItem onClick={() => runSiteCheck(row)}>
                                Site check
                              </DropdownMenuItem>
                            ) : null}
                            {row.status === "site_checked" && canValidate ? (
                              <DropdownMenuItem onClick={() => runValidate(row)}>
                                Validate (Sch. 5)
                              </DropdownMenuItem>
                            ) : null}
                            {(canSite || canValidate) && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedId(row.id);
                                  if (!note.trim()) {
                                    toast.error("Open the row and add a return note first");
                                  } else {
                                    runReturn(row);
                                  }
                                }}
                              >
                                Return…
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedId(row.id);
                                setNote("");
                              }}
                            >
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
      </OpsDeskList>

      {selected ? (
        <OpsDeskList flush={false}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{selected.code}</h2>
              <p className="text-xs text-muted-foreground">
                {selected.activityName} · {selected.blockCode} · {selected.monthlyWoCode || ""} ·{" "}
                {selected.date}
              </p>
            </div>
            <StatusBadge status={selected.status} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Planned
              </p>
              <p className="cf-numeric mt-0.5 text-sm font-semibold">
                {selected.plannedQty} {selected.unit}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Actual
              </p>
              <p className="cf-numeric mt-0.5 text-sm font-semibold">
                {selected.actualQty} {selected.unit}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                % done
              </p>
              <p className="cf-numeric mt-0.5 text-sm font-semibold">
                {selected.pctDone != null ? `${selected.pctDone}%` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Variance
              </p>
              <p className={cn("cf-numeric mt-0.5 text-sm font-semibold", varianceTone(selected.variancePct))}>
                {selected.variancePct > 0 ? "+" : ""}
                {selected.variancePct}%
              </p>
            </div>
          </div>

          {selected.materialsUsed.length > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Materials: {selected.materialsUsed.join(", ")}
            </p>
          ) : null}

          {selected.notes ? (
            <p className="mt-2 text-sm leading-relaxed">{selected.notes}</p>
          ) : null}

          {issues.length > 0 ? (
            <ul className="mt-3 space-y-1 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              {issues.map((i) => (
                <li key={i.code} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                  <span>{i.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <ClipboardCheck className="h-4 w-4" aria-hidden />
              Within Schedule 5 checks for this record.
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="quality-score">
                Quality score (% units meeting manual)
              </label>
              <Input
                id="quality-score"
                value={qualityScore}
                onChange={(e) => setQualityScore(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Miss cause (if target missed)</label>
              <Select
                value={missCause || "none"}
                onValueChange={(v) => setMissCause(v === "none" ? "" : (v as MissCause))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {MISS_CAUSE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium" htmlFor="validation-note">
              Review note
              <span className="ml-1 font-normal text-muted-foreground">(required to return)</span>
            </label>
            <Textarea
              id="validation-note"
              rows={2}
              placeholder="What did you verify? If returning, what must change?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="mt-3 space-y-2">
            <label className="text-sm font-medium" htmlFor="failed-criteria">
              Failed criteria (on return)
            </label>
            <Textarea
              id="failed-criteria"
              rows={2}
              placeholder="One criterion per line, e.g. Qty below 90% of plan"
              value={failedCriteriaText}
              onChange={(e) => setFailedCriteriaText(e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {selected.status === "submitted" && canSite ? (
              <Button size="sm" onClick={() => runSiteCheck(selected)}>
                Site check
              </Button>
            ) : null}
            {selected.status === "site_checked" && canValidate ? (
              <Button size="sm" onClick={() => runValidate(selected)}>
                Validate (Sch. 5)
              </Button>
            ) : null}
            {(canSite || canValidate) && (
              <Button size="sm" variant="outline" onClick={() => runReturn(selected)}>
                Return
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </div>

          <div className="mt-5">
            <OpsDeskChatter
              title="Validation trail"
              events={[
                {
                  id: `${selected.id}-entry`,
                  title: "Field record submitted",
                  subtitle: selected.entrySource?.replace(/_/g, " ") || "B-Agro entry",
                  at: selected.date,
                },
                ...(selected.status !== "submitted"
                  ? [
                      {
                        id: `${selected.id}-status`,
                        title: `Current status: ${selected.status.replace(/_/g, " ")}`,
                        subtitle: note.trim() || undefined,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </OpsDeskList>
      ) : null}
    </OpsDeskPage>
  );
}
