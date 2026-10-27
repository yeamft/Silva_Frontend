"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange, MapPin, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  OpsDeskControlPanel,
  OpsDeskFilterChips,
  OpsDeskHeader,
  OpsDeskList,
  OpsDeskPage,
} from "@/components/cropfort/ops-desk";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getCropfortArea } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { isSpxDesk } from "@/lib/cropfort/platform-access";
import { cn } from "@/lib/utils";
import {
  mapTicketDto,
  mapWorkOrderDto,
  useCreateWorkOrder,
  useTransitionWorkOrder,
  useWorkOrders,
} from "@/lib/query/hooks/use-work-orders";
import {
  fmtEtb,
  ticketWaitingOn,
  WO_NEXT,
  type Attention,
  type FieldTicket,
  type WoStatus,
  type WorkOrder,
} from "@/store/cropfortOpsStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFarmAreas } from "@/lib/query/hooks/use-org-map";

type ViewMode = "board" | "list";
type QuickFilter = "all" | "attention";

const COLUMNS: { id: WoStatus; label: string; hint: string; dot: string; wash: string }[] = [
  { id: "draft", label: "Queued", hint: "", dot: "bg-muted-foreground", wash: "bg-muted/50" },
  { id: "issued", label: "Ready", hint: "", dot: "bg-info", wash: "bg-info/[0.06]" },
  { id: "in_progress", label: "In field", hint: "", dot: "bg-primary", wash: "bg-primary/[0.05]" },
  { id: "complete", label: "Done", hint: "", dot: "bg-success", wash: "bg-success/[0.06]" },
];

function attentionLabel(flag: Attention) {
  if (flag === "overdue") return "Overdue";
  if (flag === "insurance") return "Insurance";
  return null;
}

function waitingOnLabel(tickets: FieldTicket[]) {
  const open = tickets.filter((t) => ticketWaitingOn(t.status));
  if (!tickets.length) return "No tickets";
  if (!open.length) return "Closed";
  const vendor = open.filter((t) => ticketWaitingOn(t.status) === "vendor").length;
  const site = open.filter((t) => ticketWaitingOn(t.status) === "site_owner").length;
  const asset = open.filter((t) => ticketWaitingOn(t.status) === "asset_owner").length;
  return [
    vendor ? `${vendor} vendor` : null,
    site ? `${site} site` : null,
    asset ? `${asset} asset` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function waitingOnSentence(tickets: FieldTicket[]) {
  if (!tickets.length) return "No tickets";
  const hold = waitingOnLabel(tickets);
  if (hold === "Closed" || hold.startsWith("No")) return hold;
  return hold || "Closed";
}

function WorkOrderCard({
  wo,
  tickets,
  onOpen,
  onAdvance,
  onMove,
}: {
  wo: WorkOrder;
  tickets: FieldTicket[];
  onOpen: () => void;
  onAdvance: () => void;
  onMove: (status: WoStatus) => void;
}) {
  const next = WO_NEXT[wo.status];
  const flag = attentionLabel(wo.attention);
  const hold = waitingOnSentence(tickets);

  return (
    <article className="rounded-xl border border-border bg-card p-3.5 shadow-xs transition-colors hover:border-primary/30 hover:shadow-card">
      <button type="button" className="w-full text-left" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2">
          <span className="cf-numeric text-[11px] font-medium text-muted-foreground">{wo.code}</span>
          {flag ? <StatusBadge status={wo.attention === "overdue" ? "overdue" : "blocked"} label={flag} /> : null}
        </div>
        <p className="mt-1.5 text-sm font-semibold leading-snug tracking-tight">{wo.title}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          {wo.block} · {wo.farm}
        </p>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {wo.ticketsDone}/{wo.ticketsTotal} tickets
            </span>
            <span className="cf-numeric font-medium">{wo.progress}%</span>
          </div>
          <Progress value={wo.progress} className="mt-1.5 h-1.5" />
          <p className="mt-1.5 text-[11px] text-muted-foreground">{hold}</p>
        </div>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">{wo.initials}</AvatarFallback>
          </Avatar>
          <span className="truncate text-[11px] text-muted-foreground">{wo.vendor}</span>
        </div>
        <span className="cf-numeric shrink-0 text-[11px] font-medium">{fmtEtb(wo.etb)}</span>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {next ? (
          <Button size="sm" className="h-8 flex-1" onClick={onAdvance}>
            {next.label}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="h-8 flex-1" onClick={onOpen}>
            View
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="outline" aria-label={`More for ${wo.code}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {COLUMNS.map((col) => (
              <DropdownMenuItem key={col.id} disabled={col.id === wo.status} onClick={() => onMove(col.id)}>
                Move to {col.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}

export default function WorkOrdersView() {
  const area = getCropfortArea("work_orders");
  const { user, activeProgram } = useCropfortAuth();
  // Vendors carry out work orders; only SPX and field supervisors raise them
  const canCreate = isSpxDesk(user.role) || user.role === "field_supervisor";
  const woQuery = useWorkOrders(Boolean(activeProgram?.id));
  const createWo = useCreateWorkOrder();
  const transitionWo = useTransitionWorkOrder();
  const farmsQuery = useFarmAreas(Boolean(activeProgram?.id));

  const orders = useMemo(
    () => (woQuery.data || []).map(mapWorkOrderDto),
    [woQuery.data],
  );
  const tickets = useMemo(
    () =>
      (woQuery.data || []).flatMap((wo) =>
        (wo.tickets || []).map((dto) => mapTicketDto(dto, wo)),
      ),
    [woQuery.data],
  );

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QuickFilter>("all");
  const [view, setView] = useState<ViewMode>("board");
  const [openId, setOpenId] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueFarmId, setIssueFarmId] = useState("");

  const selected = orders.find((o) => o.id === openId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((wo) => {
      if (filter === "attention" && wo.attention === "none") return false;
      if (!q) return true;
      return [wo.title, wo.code, wo.block, wo.vendor, wo.assignee, wo.activity].join(" ").toLowerCase().includes(q);
    });
  }, [orders, query, filter]);

  const byColumn = useMemo(() => {
    const map: Record<WoStatus, WorkOrder[]> = { draft: [], issued: [], in_progress: [], complete: [] };
    for (const wo of filtered) map[wo.status].push(wo);
    return map;
  }, [filtered]);

  const move = async (id: string, status: WoStatus) => {
    const wo = orders.find((o) => o.id === id);
    if (!wo || wo.status === status) return;
    try {
      await transitionWo.mutateAsync({ id, status });
      toast.success(`${wo.code} → ${COLUMNS.find((c) => c.id === status)?.label ?? status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update work order");
    }
  };

  const advance = (id: string) => {
    const wo = orders.find((o) => o.id === id);
    if (!wo) return;
    const next = WO_NEXT[wo.status];
    if (!next) return;
    void move(id, next.status);
  };

  const issueFromForm = async () => {
    const title = issueTitle.trim();
    if (!title) {
      toast.error("Enter an activity title");
      return;
    }
    try {
      const created = await createWo.mutateAsync({
        title,
        activity: title,
        farmEstateId: issueFarmId || null,
        weekStart: (() => {
          const now = new Date();
          const start = new Date(Date.UTC(now.getFullYear(), 0, 1));
          return Math.min(53, Math.max(1, Math.ceil((((now.getTime() - start.getTime()) / 86400000) + start.getUTCDay() + 1) / 7)));
        })(),
      });
      await transitionWo.mutateAsync({ id: created.id, status: "issued" });
      setIssueOpen(false);
      setIssueTitle("");
      toast.success(`${created.code} issued`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not issue");
    }
  };

  const attentionCount = orders.filter((o) => o.attention !== "none").length;
  const filters: { id: QuickFilter; label: string }[] = [
    { id: "all", label: `All (${orders.length})` },
    { id: "attention", label: `Needs attention (${attentionCount})` },
  ];

  return (
    <OpsDeskPage className="max-w-none">
      {woQuery.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {woQuery.error instanceof Error ? woQuery.error.message : "Failed to load work orders"}
        </p>
      ) : null}
      {woQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}
      <OpsDeskHeader
        eyebrow={activeProgram?.name || "Execution"}
        title="Work orders"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Execution", href: CROPFORT_ROUTES.fieldTickets },
          { label: area.label },
        ]}
        actions={
          canCreate ? (
            <div className="flex items-center gap-2">
              <Button size="sm" asChild>
                <Link href={CROPFORT_ROUTES.monthlyWorkOrders}>From monthly orders</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIssueOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                One-off
              </Button>
            </div>
          ) : null
        }
      />

      <OpsDeskControlPanel
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search activity, block or vendor"
        view={view === "list" ? "list" : "board"}
        onViewChange={(v) => setView(v === "list" ? "list" : "board")}
        filters={
          <OpsDeskFilterChips
            value={filter}
            onChange={(id) => setFilter(id as QuickFilter)}
            options={filters}
          />
        }
      />

      {view === "board" ? (
        <div className="cf-scroll -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {COLUMNS.map((col) => {
            const items = byColumn[col.id];
            return (
              <section key={col.id} className={cn("flex w-[min(100%,19.5rem)] shrink-0 snap-start flex-col rounded-xl border border-border/80 p-2 sm:w-[19.5rem]", col.wash)} aria-label={`${col.label} column`}>
                <header className="flex items-center gap-2 px-2 py-2">
                  <span className={cn("h-2 w-2 rounded-full", col.dot)} aria-hidden />
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold leading-none">{col.label}</h2>
                    {col.hint ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">{col.hint}</p>
                    ) : null}
                  </div>
                  <span className="cf-numeric ml-auto rounded-md bg-background/80 px-1.5 py-0.5 text-xs font-semibold tabular-nums">{items.length}</span>
                </header>
                <ul className="flex min-h-[12rem] flex-1 flex-col gap-2 p-1">
                  {items.length === 0 ? (
                    <li className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/80 px-3 py-8 text-center text-xs text-muted-foreground">None</li>
                  ) : (
                    items.map((wo) => (
                      <li key={wo.id}>
                        <WorkOrderCard
                          wo={wo}
                          tickets={tickets.filter((t) => t.workOrderId === wo.id)}
                          onOpen={() => setOpenId(wo.id)}
                          onAdvance={() => advance(wo.id)}
                          onMove={(status) => move(wo.id, status)}
                        />
                      </li>
                    ))
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <OpsDeskList>
          <ul>
            {filtered.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">None</li>
            ) : (
              filtered.map((wo) => (
                <li key={wo.id} className="border-b border-border last:border-b-0">
                  <button type="button" onClick={() => setOpenId(wo.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40">
                    <span className="cf-numeric w-16 shrink-0 text-xs text-muted-foreground">{wo.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{wo.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{wo.block} · {wo.vendor} · {wo.week}</span>
                    </span>
                    <span className="cf-numeric hidden w-24 text-xs font-medium sm:block">{fmtEtb(wo.etb)}</span>
                    <StatusBadge status={wo.status} />
                  </button>
                </li>
              ))
            )}
          </ul>
        </OpsDeskList>
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
                <p className="cf-numeric text-xs font-medium text-muted-foreground">{selected.code}</p>
                <SheetTitle className="text-xl">{selected.title}</SheetTitle>
                <SheetDescription>
                  {[selected.block, selected.vendor].filter(Boolean).join(" · ")}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-6 py-5">
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge status={selected.status} />
                  {attentionLabel(selected.attention) ? (
                    <StatusBadge status={selected.attention === "overdue" ? "overdue" : "blocked"} label={attentionLabel(selected.attention) ?? undefined} />
                  ) : null}
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Block</dt>
                    <dd className="mt-0.5 font-medium">{selected.block}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Lead</dt>
                    <dd className="mt-0.5 font-medium">{selected.assignee}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Week</dt>
                    <dd className="mt-0.5 flex items-center gap-1 font-medium">
                      <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      {selected.week}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Value</dt>
                    <dd className="cf-numeric mt-0.5 font-medium">{fmtEtb(selected.etb)}</dd>
                  </div>
                </dl>
                <Progress value={selected.progress} className="h-2" />
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Field tickets</p>
                  <ul className="space-y-2">
                    {tickets.filter((t) => t.workOrderId === selected.id).length === 0 ? (
                      <li className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                        No tickets
                      </li>
                    ) : (
                      tickets
                        .filter((t) => t.workOrderId === selected.id)
                        .map((t) => (
                          <li key={t.id}>
                            <Link
                              href={`${CROPFORT_ROUTES.fieldTickets}?ticket=${t.id}`}
                              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-xs hover:bg-muted/40"
                            >
                              <span className="min-w-0 truncate">
                                <span className="font-medium">{t.code}</span> · {t.title}
                                <span className="mt-0.5 block text-muted-foreground">
                                  {t.vendorLead} → {t.siteOwner} → {t.assetOwner}
                                </span>
                              </span>
                              <StatusBadge status={t.status} />
                            </Link>
                          </li>
                        ))
                    )}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  {WO_NEXT[selected.status] ? <Button onClick={() => advance(selected.id)}>{WO_NEXT[selected.status]?.label}</Button> : null}
                  <Button variant="outline" asChild>
                    <Link href={`${CROPFORT_ROUTES.fieldTickets}?wo=${selected.id}`}>Assign a field ticket</Link>
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>One-off work order</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            For work that isn&apos;t in a plan. Planned work is issued automatically when a monthly work order is
            activated.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="wo-title">Activity</Label>
              <Input
                id="wo-title"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                placeholder="e.g. Manual weeding, block B1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Farm area</Label>
              <Select value={issueFarmId || "__none__"} onValueChange={(v) => setIssueFarmId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional farm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All / unspecified</SelectItem>
                  {(farmsQuery.data || []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void issueFromForm()}
              disabled={!issueTitle.trim() || createWo.isPending || transitionWo.isPending}
            >
              Create and issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OpsDeskPage>
  );
}
