"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { WalletCards } from "lucide-react";
import { toast } from "sonner";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import {
  OpsDeskControlPanel,
  OpsDeskFilterChips,
  OpsDeskHeader,
  OpsDeskList,
  OpsDeskMeta,
  OpsDeskPage,
} from "@/components/cropfort/ops-desk";
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
import {
  canCreatePaymentRequest,
  canSeePaymentRequests,
  canVerifyPaymentRequest,
} from "@/lib/cropfort/commercial-access";
import { fmtEtb, useCropfortOpsStore } from "@/store/cropfortOpsStore";
import { useCommercialStore } from "@/store/commercialStore";
import type { PaymentRequestStatus } from "@/types/cropfort-commercial";

type Filter = "all" | PaymentRequestStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "submitted", label: "Submitted" },
  { id: "verified", label: "Verified" },
  { id: "returned", label: "Returned" },
  { id: "settled", label: "Settled" },
];

export default function PaymentRequestsView() {
  const { user, activeProgram } = useCropfortAuth();
  const canView = canSeePaymentRequests(user.role);
  const canCreate = canCreatePaymentRequest(user.role);
  const canVerify = canVerifyPaymentRequest(user.role);

  const tickets = useCropfortOpsStore((s) => s.tickets);
  const list = useCommercialStore((s) => s.listPaymentRequestsForRole);
  const createPaymentRequest = useCommercialStore((s) => s.createPaymentRequest);
  const verifyPaymentRequest = useCommercialStore((s) => s.verifyPaymentRequest);
  const returnPaymentRequest = useCommercialStore((s) => s.returnPaymentRequest);
  const authorizeSettlement = useCommercialStore((s) => s.authorizeSettlement);
  const rows = list(user.role);

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [returnId, setReturnId] = useState<string | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [settleId, setSettleId] = useState<string | null>(null);
  const [narrative, setNarrative] = useState("");

  const actor = {
    userId: user.id,
    name: user.name,
    role: user.role,
  };

  const validatedTickets = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.status === "validated" &&
          !rows.some((p) => p.fieldTicketId === t.id && p.status !== "returned"),
      ),
    [tickets, rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.fieldTicketCode.toLowerCase().includes(q) ||
        r.ticketTitle.toLowerCase().includes(q) ||
        r.vendor.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  if (!canView) {
    return <NotAuthorized title="Payment requests" />;
  }

  return (
    <OpsDeskPage>
      <OpsDeskHeader
        eyebrow={activeProgram?.name || "Control"}
        title="Payment requests"
        description="Bill from validated field tickets. SPX verifies; then authorize settlement for Silva."
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Control", href: CROPFORT_ROUTES.approvals },
          { label: "Payment Requests" },
        ]}
        meta={
          <OpsDeskMeta
            items={[
              { label: "open", value: String(rows.filter((r) => r.status === "submitted").length) },
              { label: "verified", value: String(rows.filter((r) => r.status === "verified").length) },
              { label: "settled", value: String(rows.filter((r) => r.status === "settled").length) },
            ]}
          />
        }
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={validatedTickets.length === 0}>
              <WalletCards className="h-3.5 w-3.5" />
              New from ticket
            </Button>
          ) : null
        }
      />

      <OpsDeskControlPanel
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search PR, ticket, vendor…"
        filters={
          <OpsDeskFilterChips
            value={filter}
            onChange={(id) => setFilter(id as Filter)}
            options={FILTERS.map((f) => ({
              id: f.id,
              label: f.label,
              count: f.id === "all" ? rows.length : rows.filter((r) => r.status === f.id).length,
            }))}
          />
        }
        trailing={
          <Button size="sm" variant="outline" asChild>
            <Link href={CROPFORT_ROUTES.settlements}>Settlements</Link>
          </Button>
        }
      />

      <OpsDeskList>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No payment requests in this filter
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.ticketTitle}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {r.fieldTicketCode} · {r.block}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.vendor}</TableCell>
                    <TableCell className="cf-numeric text-right text-sm">
                      {fmtEtb(r.amountEtb)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1">
                        {canVerify && r.status === "submitted" ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8"
                              onClick={() => {
                                try {
                                  verifyPaymentRequest(r.id, actor);
                                  toast.success(`${r.code} verified`);
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : "Verify failed");
                                }
                              }}
                            >
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => {
                                setReturnId(r.id);
                                setReturnNote("");
                              }}
                            >
                              Return
                            </Button>
                          </>
                        ) : null}
                        {canVerify && r.status === "verified" ? (
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              setSettleId(r.id);
                              setNarrative(
                                `Settlement for ${r.fieldTicketCode} · ${r.ticketTitle} · ${fmtEtb(r.amountEtb)}`,
                              );
                            }}
                          >
                            Authorize settlement
                          </Button>
                        ) : null}
                        {r.settlementId ? (
                          <Button size="sm" variant="ghost" className="h-8" asChild>
                            <Link href={CROPFORT_ROUTES.settlements}>Open settlement</Link>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </OpsDeskList>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New payment request</DialogTitle>
          </DialogHeader>
          {validatedTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No validated tickets available. Close a field ticket first.
            </p>
          ) : (
            <Select value={ticketId} onValueChange={setTicketId}>
              <SelectTrigger>
                <SelectValue placeholder="Select validated ticket" />
              </SelectTrigger>
              <SelectContent>
                {validatedTickets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.code} · {t.title} · {fmtEtb(t.amountEtb)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!ticketId}
              onClick={() => {
                try {
                  const row = createPaymentRequest(
                    ticketId,
                    actor,
                    activeProgram?.id || "prog-1",
                  );
                  toast.success(`${row.code} submitted`);
                  setCreateOpen(false);
                  setTicketId("");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Create failed");
                }
              }}
            >
              Create & submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(returnId)} onOpenChange={(o) => !o && setReturnId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return payment request</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={3}
            value={returnNote}
            onChange={(e) => setReturnNote(e.target.value)}
            placeholder="What must change?"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!returnId) return;
                try {
                  returnPaymentRequest(returnId, returnNote, actor);
                  toast.message("Payment request returned");
                  setReturnId(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Return failed");
                }
              }}
            >
              Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(settleId)} onOpenChange={(o) => !o && setSettleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authorize settlement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            SPX narrative for Silva — no raw field ticket channel.
          </p>
          <Textarea
            rows={4}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!settleId) return;
                try {
                  const stl = authorizeSettlement(settleId, narrative, actor);
                  toast.success(`${stl.code} authorized for Silva`);
                  setSettleId(null);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Authorize failed");
                }
              }}
            >
              Authorize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OpsDeskPage>
  );
}
