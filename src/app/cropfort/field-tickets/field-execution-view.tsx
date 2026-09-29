"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clock3,
  MoreHorizontal,
  Plus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/cropfort/form-field";
import {
  OpsDeskChatter,
  OpsDeskControlPanel,
  OpsDeskFilterChips,
  OpsDeskHeader,
  OpsDeskList,
  OpsDeskPage,
} from "@/components/cropfort/ops-desk";
import { StatCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getCropfortArea } from "@/config/cropfort-areas";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { canCreatePaymentRequest } from "@/lib/cropfort/commercial-access";
import { cn } from "@/lib/utils";
import { CROPFORT_ROLE_LABELS } from "@/types/cropfort";
import {
  useCreatePaymentRequest,
  usePaymentRequests,
} from "@/lib/query/hooks/use-payment-requests";
import { useUsersDirectory } from "@/lib/query/hooks/use-users";
import {
  mapTicketDto,
  mapWorkOrderDto,
  uiTicketToApi,
  useCreateFieldTicket,
  useTransitionFieldTicket,
  useWorkOrders,
} from "@/lib/query/hooks/use-work-orders";
import {
  TICKET_NEXT,
  execPartyForRole,
  fmtEtb,
  ticketWaitingOn,
  type ExecParty,
  type FieldTicket,
  type TicketStatus,
} from "@/store/cropfortOpsStore";

/** API-aligned next actions (maps through UI statuses). */
const API_TICKET_NEXT: typeof TICKET_NEXT = {
  vendor: {
    assigned: { status: "submitted", label: "Submit work" },
    returned: { status: "submitted", label: "Resubmit" },
  },
  site_owner: {
    submitted: { status: "site_reviewed", label: "Site check OK" },
  },
  asset_owner: {
    site_reviewed: { status: "validated", label: "Close ticket" },
  },
  spx: {
    site_reviewed: { status: "validated", label: "Close ticket" },
    submitted: { status: "site_reviewed", label: "Site check OK" },
  },
};

const COLUMNS: {
  id: string;
  label: string;
  statuses: TicketStatus[];
  wash: string;
  dot: string;
}[] = [
  {
    id: "assigned",
    label: "Assigned",
    statuses: ["assigned", "accepted"],
    wash: "bg-muted/50",
    dot: "bg-muted-foreground",
  },
  {
    id: "field",
    label: "Vendor",
    statuses: ["in_progress", "returned"],
    wash: "bg-primary/[0.05]",
    dot: "bg-primary",
  },
  {
    id: "site",
    label: "Site check",
    statuses: ["submitted"],
    wash: "bg-warning/[0.08]",
    dot: "bg-warning",
  },
  {
    id: "asset",
    label: "Asset close",
    statuses: ["site_reviewed"],
    wash: "bg-info/[0.08]",
    dot: "bg-info",
  },
  {
    id: "done",
    label: "Closed",
    statuses: ["validated"],
    wash: "bg-success/[0.06]",
    dot: "bg-success",
  },
];

const PARTY_LABEL: Record<ExecParty, string> = {
  vendor: "Vendor",
  site_owner: "Site owner",
  asset_owner: "Asset owner",
  spx: "SPX",
};

type Filter = "mine" | "all";
type ViewMode = "board" | "table";

function waitingLabel(status: TicketStatus) {
  const party = ticketWaitingOn(status);
  return party ? PARTY_LABEL[party] : "Closed";
}

function TicketLane({ status }: { status: TicketStatus }) {
  const waiting = ticketWaitingOn(status);
  const steps: { id: ExecParty; label: string }[] = [
    { id: "vendor", label: "Vendor" },
    { id: "site_owner", label: "Site" },
    { id: "asset_owner", label: "Asset" },
  ];
  const order: ExecParty[] = ["vendor", "site_owner", "asset_owner"];
  const waitingIdx = waiting ? order.indexOf(waiting) : order.length;
  return (
    <ol className="flex items-center gap-1.5 text-[11px]">
      {steps.map((step, i) => {
        const current = waiting === step.id;
        const done = waitingIdx > i;
        return (
          <li key={step.id} className="flex items-center gap-1.5">
            {i > 0 ? <span className="text-border">→</span> : null}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium",
                current && "bg-primary/10 text-primary",
                done && "text-muted-foreground",
                !current && !done && "text-muted-foreground/70",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function FieldExecutionView() {
  const area = getCropfortArea("field_execution");
  const { user, activeProgram } = useCropfortAuth();
  const party = execPartyForRole(user.role);
  const params = useSearchParams();
  const woQuery = useWorkOrders(Boolean(activeProgram?.id));
  const createTicket = useCreateFieldTicket();
  const transitionTicket = useTransitionFieldTicket();

  const workOrders = useMemo(
    () => (woQuery.data || []).map(mapWorkOrderDto),
    [woQuery.data],
  );
  const tickets = useMemo(() => {
    const byId = new Map((woQuery.data || []).map((w) => [w.id, w]));
    return (woQuery.data || []).flatMap((wo) =>
      (wo.tickets || []).map((t) => mapTicketDto(t, byId.get(wo.id))),
    );
  }, [woQuery.data]);

  const createPaymentRequest = useCreatePaymentRequest();
  const paymentRequestsQuery = usePaymentRequests(Boolean(activeProgram?.id));
  const paymentRequests = paymentRequestsQuery.data || [];
  const usersDirectory = useUsersDirectory(Boolean(activeProgram?.id));
  const directoryUsers = usersDirectory.data || [];

  const vendorLeads = useMemo(
    () => directoryUsers.filter((u) => u.organization === "bagro" && u.status === "active"),
    [directoryUsers],
  );
  const siteOwners = useMemo(
    () =>
      directoryUsers.filter(
        (u) => u.organization === "spx" && u.status === "active" && !u.roles.includes("spx_platform_admin"),
      ),
    [directoryUsers],
  );
  const assetOwners = useMemo(
    () => directoryUsers.filter((u) => u.organization === "silva" && u.status === "active"),
    [directoryUsers],
  );

  const canAssign = party === "spx" || party === "asset_owner" || party === "site_owner";
  const canBill = canCreatePaymentRequest(user.role);

  const [filter, setFilter] = useState<Filter>("mine");
  const [view, setView] = useState<ViewMode>("board");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [form, setForm] = useState({
    workOrderId: params.get("wo") || "",
    title: "",
    description: "",
    vendorLead: "",
    siteOwner: "",
    assetOwner: "",
    hours: "8",
    amount: "3200",
    due: "Fri",
  });
  const [reassignForm, setReassignForm] = useState({
    vendorLead: "",
    siteOwner: "",
    assetOwner: "",
    due: "Fri",
  });

  useEffect(() => {
    const vendorDefault = vendorLeads[0]?.id || "";
    const siteDefault = siteOwners[0]?.name || "";
    const assetDefault = assetOwners[0]?.name || "";
    if (!vendorDefault && !siteDefault && !assetDefault) return;
    setForm((f) => ({
      ...f,
      vendorLead: f.vendorLead || vendorDefault,
      siteOwner: f.siteOwner || siteDefault,
      assetOwner: f.assetOwner || assetDefault,
    }));
    setReassignForm((f) => ({
      ...f,
      vendorLead: f.vendorLead || vendorDefault,
      siteOwner: f.siteOwner || siteDefault,
      assetOwner: f.assetOwner || assetDefault,
    }));
  }, [vendorLeads, siteOwners, assetOwners]);

  const woParam = params.get("wo");
  const ticketParam = params.get("ticket");

  useEffect(() => {
    if (ticketParam) setOpenId(ticketParam);
  }, [ticketParam]);

  useEffect(() => {
    if (!woParam || !canAssign) return;
    setForm((f) => ({ ...f, workOrderId: woParam }));
    setAssignOpen(true);
  }, [woParam, canAssign]);

  useEffect(() => {
    if (form.workOrderId) return;
    const fallback =
      workOrders.find((w) => w.status === "issued" || w.status === "in_progress")?.id ||
      workOrders[0]?.id ||
      "";
    if (fallback) setForm((f) => ({ ...f, workOrderId: fallback }));
  }, [workOrders, form.workOrderId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filter === "mine") {
        const waiting = ticketWaitingOn(t.status);
        if (party === "spx") {
          if (waiting == null) return false;
        } else if (waiting !== party) {
          return false;
        }
      }
      if (!q) return true;
      return [t.code, t.title, t.vendor, t.vendorLead, t.siteOwner, t.block]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [tickets, filter, query, party]);

  const selected = tickets.find((t) => t.id === openId) ?? null;
  const selectedWo = selected
    ? workOrders.find((w) => w.id === selected.workOrderId)
    : null;
  const next = selected ? API_TICKET_NEXT[party][selected.status] : undefined;
  const openWos = workOrders.filter(
    (w) => w.status === "issued" || w.status === "in_progress" || w.status === "draft",
  );
  const canReturn =
    Boolean(selected) &&
    (party === "site_owner" || party === "asset_owner" || party === "spx") &&
    (selected?.status === "submitted" || selected?.status === "site_reviewed");

  const assign = async () => {
    if (!form.workOrderId) {
      toast.error("Select a work order");
      return;
    }
    const title = form.title.trim();
    if (!title) {
      toast.error("Enter a task title");
      return;
    }
    try {
      const hours = Number(form.hours) || 0;
      const amount = Number(form.amount) || 0;
      const unitRate = hours > 0 ? amount / hours : amount || null;
      const vendorUser = vendorLeads.find((u) => u.id === form.vendorLead);
      const vendorLabel = vendorUser ? `${vendorUser.name} (${vendorUser.email})` : form.vendorLead;
      const created = await createTicket.mutateAsync({
        workOrderId: form.workOrderId,
        input: {
          activityRecorded: title,
          materialsUsed: [
            form.description,
            `Crew: ${vendorLabel}`,
            `Site: ${form.siteOwner}`,
            `Asset: ${form.assetOwner}`,
            `Due: ${form.due}`,
          ]
            .filter(Boolean)
            .join("\n"),
          actualMandays: hours || null,
          actualQuantity: hours || 1,
          unitRateEtb: unitRate,
          laborCount: 1,
          areaHa: 0,
          vendorUserId: vendorUser?.id || form.vendorLead || null,
        },
      });
      setAssignOpen(false);
      setForm((f) => ({ ...f, title: "", description: "" }));
      setOpenId(created.id);
      toast.success(`Ticket assigned to ${vendorLabel}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign");
    }
  };

  const act = async (ticket: FieldTicket, status: TicketStatus, label: string, note?: string) => {
    try {
      const apiStatus = uiTicketToApi(status);
      if (!apiStatus || apiStatus === "draft") {
        throw new Error("Unsupported transition");
      }
      await transitionTicket.mutateAsync({
        ticketId: ticket.id,
        status: apiStatus,
        comment: note || label,
      });
      setActionNote("");
      toast.success(label);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  };

  const doReassign = () => {
    toast.message("Crew reassignment is recorded on new tickets; create a follow-up ticket for changes.");
    setReassignOpen(false);
  };

  const waitingCounts = {
    vendor: tickets.filter((t) => ticketWaitingOn(t.status) === "vendor").length,
    site: tickets.filter((t) => ticketWaitingOn(t.status) === "site_owner").length,
    asset: tickets.filter((t) => ticketWaitingOn(t.status) === "asset_owner").length,
  };

  return (
    <OpsDeskPage className="max-w-none">
      <OpsDeskHeader
        eyebrow={activeProgram?.name || "Execution"}
        title="Field execution"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Execution", href: CROPFORT_ROUTES.fieldTickets },
          { label: area.label },
        ]}
        actions={
          canAssign ? (
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Assign ticket
            </Button>
          ) : (
            <StatusBadge status="issued" label={CROPFORT_ROLE_LABELS[user.role]} />
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Waiting on vendor"
          value={String(waitingCounts.vendor)}
          footnote="Accept / do the work"
        />
        <StatCard
          label="Waiting on site"
          value={String(waitingCounts.site)}
          emphasis
          footnote="Field check"
        />
        <StatCard
          label="Waiting on asset owner"
          value={String(waitingCounts.asset)}
          footnote="Close or return"
        />
        <StatCard
          label="Closed"
          value={String(tickets.filter((t) => t.status === "validated").length)}
        />
      </div>

      <OpsDeskControlPanel
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search ticket, block, crew…"
        view={view === "table" ? "list" : "board"}
        onViewChange={(v) => setView(v === "list" ? "table" : "board")}
        filters={
          <OpsDeskFilterChips
            value={filter}
            onChange={(id) => setFilter(id as Filter)}
            options={[
              {
                id: "mine",
                label: party === "spx" ? "Open queue" : `Needs ${PARTY_LABEL[party]}`,
              },
              { id: "all", label: "All tickets" },
            ]}
          />
        }
      />

      {view === "board" ? (
        <div className="cf-scroll -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {COLUMNS.map((col) => {
            const items = visible.filter((t) => col.statuses.includes(t.status));
            return (
              <section
                key={col.id}
                className={cn(
                  "flex w-[min(100%,18.5rem)] shrink-0 snap-start flex-col rounded-xl border border-border/80 p-2 sm:w-[18.5rem]",
                  col.wash,
                )}
              >
                <header className="flex items-center gap-2 px-2 py-2">
                  <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                  <h2 className="text-sm font-semibold">{col.label}</h2>
                  <span className="cf-numeric ml-auto text-xs font-semibold">
                    {items.length}
                  </span>
                </header>
                <ul className="flex min-h-[10rem] flex-col gap-2 p-1">
                  {items.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-border/80 px-3 py-8 text-center text-xs text-muted-foreground">
                      None
                    </li>
                  ) : (
                    items.map((t) => {
                      const cardNext = API_TICKET_NEXT[party][t.status];
                      return (
                        <li key={t.id}>
                          <div className="rounded-xl border border-border bg-card p-3 shadow-xs transition-colors hover:border-primary/30">
                            <button
                              type="button"
                              onClick={() => setOpenId(t.id)}
                              className="w-full text-left"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="cf-numeric text-[11px] text-muted-foreground">
                                  {t.code}
                                </span>
                                <StatusBadge status={t.status} />
                              </div>
                              <p className="mt-1.5 text-sm font-semibold leading-snug">
                                {t.title}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{t.block}</p>
                              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <UserRound className="h-3 w-3" />
                                  {t.vendorLead}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock3 className="h-3 w-3" />
                                  {t.due}
                                </span>
                              </div>
                              <div className="mt-2">
                                <TicketLane status={t.status} />
                              </div>
                            </button>
                            {cardNext ? (
                              <Button
                                size="sm"
                                className="mt-2 h-7 w-full text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void act(t, cardNext.status, cardNext.label);
                                }}
                              >
                                {cardNext.label}
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <OpsDeskList>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Waiting on</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No tickets in this queue
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((t) => {
                    const rowNext = API_TICKET_NEXT[party][t.status];
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">{t.code}</TableCell>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {t.block}
                        </TableCell>
                        <TableCell className="text-sm">{t.vendorLead}</TableCell>
                        <TableCell className="text-sm">
                          {waitingLabel(t.status)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={t.status} />
                        </TableCell>
                        <TableCell className="cf-numeric text-right text-sm">
                          {fmtEtb(t.amountEtb)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Actions for ${t.code}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setOpenId(t.id)}>
                                Open
                              </DropdownMenuItem>
                              {rowNext ? (
                                <DropdownMenuItem
                                  onClick={() => void act(t, rowNext.status, rowNext.label)}
                                >
                                  {rowNext.label}
                                </DropdownMenuItem>
                              ) : null}
                              {(party === "site_owner" ||
                                party === "asset_owner" ||
                                party === "spx") &&
                              (t.status === "submitted" ||
                                t.status === "site_reviewed") ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setOpenId(t.id);
                                    setActionNote("Returned for rework");
                                  }}
                                >
                                  Return…
                                </DropdownMenuItem>
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
        </OpsDeskList>
      )}

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(o) => {
          if (!o) {
            setOpenId(null);
            setActionNote("");
          }
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader className="space-y-1 border-b border-border px-6 py-5 text-left">
                <p className="cf-numeric text-xs text-muted-foreground">{selected.code}</p>
                <SheetTitle className="text-xl">{selected.title}</SheetTitle>
                <SheetDescription>
                  {selected.block} · {selected.vendor}
                  {selectedWo ? (
                    <>
                      {" · "}
                      <Link
                        href={`${CROPFORT_ROUTES.workOrders}?wo=${selectedWo.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {selectedWo.code}
                      </Link>
                    </>
                  ) : null}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-6 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <span className="text-xs text-muted-foreground">
                    Waiting on {waitingLabel(selected.status)}
                  </span>
                </div>
                <TicketLane status={selected.status} />
                <dl className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Vendor</dt>
                    <dd className="font-medium">
                      {selected.vendorLead} · {selected.vendor}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Site owner</dt>
                    <dd className="font-medium">{selected.siteOwner}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Asset owner</dt>
                    <dd className="font-medium">{selected.assetOwner}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Value</dt>
                    <dd className="cf-numeric font-medium">
                      {fmtEtb(selected.amountEtb)} · {selected.hours}h · due {selected.due}
                    </dd>
                  </div>
                </dl>
                {selected.description ? (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                ) : null}

                {(next || canReturn) && selected.status !== "validated" ? (
                  <FormField
                    label="Action note"
                    optional={!canReturn || Boolean(next)}
                    render={(p) => (
                      <Textarea
                        {...p}
                        rows={2}
                        placeholder={
                          canReturn && !next
                            ? "Reason for return (required)"
                            : "Optional note for the trail"
                        }
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                      />
                    )}
                  />
                ) : null}

                <div className="flex flex-col gap-2">
                  {next ? (
                    <Button
                      onClick={() =>
                        void act(selected, next.status, next.label, actionNote || next.label)
                      }
                    >
                      {next.label}
                    </Button>
                  ) : null}
                  {canReturn ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        void act(
                          selected,
                          "returned",
                          "Returned for rework",
                          actionNote.trim() || "Returned for rework",
                        )
                      }
                    >
                      Return to vendor
                    </Button>
                  ) : null}
                  {canAssign && selected.status !== "validated" ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setReassignForm({
                          vendorLead: selected.vendorLead,
                          siteOwner: selected.siteOwner,
                          assetOwner: selected.assetOwner,
                          due: selected.due,
                        });
                        setReassignOpen(true);
                      }}
                    >
                      Reassign
                    </Button>
                  ) : null}
                  {canBill && selected.status === "validated" ? (
                    paymentRequests.some(
                      (p) => p.fieldTicketId === selected.id && p.status !== "returned",
                    ) ? (
                      <Button variant="outline" asChild>
                        <Link href={CROPFORT_ROUTES.paymentRequests}>Open payment request</Link>
                      </Button>
                    ) : (
                      <Button
                        disabled={createPaymentRequest.isPending}
                        onClick={() => {
                          void createPaymentRequest
                            .mutateAsync(selected.id)
                            .then((row) => toast.success(`${row.code} submitted`))
                            .catch((err) =>
                              toast.error(
                                err instanceof Error ? err.message : "Could not create PR",
                              ),
                            );
                        }}
                      >
                        Request payment
                      </Button>
                    )
                  ) : null}
                </div>

                <OpsDeskChatter
                  title="Chatter"
                  events={[...selected.events].reverse().map((e) => ({
                    id: e.id,
                    title: e.action,
                    subtitle: `${e.actor} · ${PARTY_LABEL[e.party]}`,
                    at: new Date(e.at).toLocaleString(),
                  }))}
                />
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign a task ticket</DialogTitle>
          </DialogHeader>
          <FormField
            label="Work order"
            required
            render={() =>
              openWos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No open work orders. Issue one under Work Orders first.
                </p>
              ) : (
                <Select
                  value={
                    openWos.some((w) => w.id === form.workOrderId)
                      ? form.workOrderId
                      : openWos[0].id
                  }
                  onValueChange={(workOrderId) => setForm((f) => ({ ...f, workOrderId }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select WO" />
                  </SelectTrigger>
                  <SelectContent>
                    {openWos.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.code} · {w.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }
          />
          <FormField
            label="Task"
            required
            render={(p) => (
              <Input
                {...p}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            )}
          />
          <FormField
            label="Notes for the crew"
            optional
            render={(p) => (
              <Textarea
                {...p}
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            )}
          />
          <FormField
            label="Vendor lead"
            render={() => (
              <Select
                value={form.vendorLead}
                onValueChange={(vendorLead) => setForm((f) => ({ ...f, vendorLead }))}
                disabled={!vendorLeads.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder={usersDirectory.isLoading ? "Loading users…" : "Select vendor"} />
                </SelectTrigger>
                <SelectContent>
                  {vendorLeads.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormField
            label="Site owner"
            render={() => (
              <Select
                value={form.siteOwner}
                onValueChange={(siteOwner) => setForm((f) => ({ ...f, siteOwner }))}
                disabled={!siteOwners.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder={usersDirectory.isLoading ? "Loading users…" : "Select site owner"} />
                </SelectTrigger>
                <SelectContent>
                  {siteOwners.map((u) => (
                    <SelectItem key={u.id} value={u.name}>
                      {u.name} · {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormField
            label="Asset owner"
            render={() => (
              <Select
                value={form.assetOwner}
                onValueChange={(assetOwner) => setForm((f) => ({ ...f, assetOwner }))}
                disabled={!assetOwners.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder={usersDirectory.isLoading ? "Loading users…" : "Select asset owner"} />
                </SelectTrigger>
                <SelectContent>
                  {assetOwners.map((u) => (
                    <SelectItem key={u.id} value={u.name}>
                      {u.name} · {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField
              label="Hours"
              render={(p) => (
                <Input
                  {...p}
                  type="number"
                  value={form.hours}
                  onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                />
              )}
            />
            <FormField
              label="Amount (ETB)"
              render={(p) => (
                <Input
                  {...p}
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              )}
            />
            <FormField
              label="Due"
              render={(p) => (
                <Input
                  {...p}
                  value={form.due}
                  onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))}
                />
              )}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void assign()}
              disabled={
                !form.title.trim() ||
                !form.workOrderId ||
                openWos.length === 0 ||
                createTicket.isPending
              }
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign ticket</DialogTitle>
          </DialogHeader>
          <FormField
            label="Vendor lead"
            render={() => (
              <Select
                value={reassignForm.vendorLead}
                onValueChange={(vendorLead) =>
                  setReassignForm((f) => ({ ...f, vendorLead }))
                }
                disabled={!vendorLeads.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendorLeads.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormField
            label="Site owner"
            render={() => (
              <Select
                value={reassignForm.siteOwner}
                onValueChange={(siteOwner) =>
                  setReassignForm((f) => ({ ...f, siteOwner }))
                }
                disabled={!siteOwners.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site owner" />
                </SelectTrigger>
                <SelectContent>
                  {siteOwners.map((u) => (
                    <SelectItem key={u.id} value={u.name}>
                      {u.name} · {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormField
            label="Asset owner"
            render={() => (
              <Select
                value={reassignForm.assetOwner}
                onValueChange={(assetOwner) =>
                  setReassignForm((f) => ({ ...f, assetOwner }))
                }
                disabled={!assetOwners.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset owner" />
                </SelectTrigger>
                <SelectContent>
                  {assetOwners.map((u) => (
                    <SelectItem key={u.id} value={u.name}>
                      {u.name} · {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormField
            label="Due"
            render={(p) => (
              <Input
                {...p}
                value={reassignForm.due}
                onChange={(e) =>
                  setReassignForm((f) => ({ ...f, due: e.target.value }))
                }
              />
            )}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={doReassign}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OpsDeskPage>
  );
}
