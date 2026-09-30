"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { NotAuthorized } from "@/components/cropfort/not-authorized";
import {
  OpsDeskChatter,
  OpsDeskControlPanel,
  OpsDeskFilterChips,
  OpsDeskHeader,
  OpsDeskList,
  OpsDeskMeta,
  OpsDeskPage,
} from "@/components/cropfort/ops-desk";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useDeskMode } from "@/components/cropfort/desk-mode";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  canAuthorizeSettlement,
  canSeeSettlements,
} from "@/lib/cropfort/commercial-access";
import { isSilvaDesk } from "@/lib/cropfort/platform-access";
import {
  useMarkSettlementSettled,
  useSettlements,
} from "@/lib/query/hooks/use-payment-requests";
import { fmtEtb } from "@/store/cropfortOpsStore";
import type { SettlementStatus } from "@/types/cropfort-commercial";

type Filter = "all" | SettlementStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "authorized", label: "Authorized" },
  { id: "settled", label: "Settled" },
];

export default function SettlementsView() {
  const { user, activeProgram } = useCropfortAuth();
  const desk = useDeskMode();
  const isSilvaUi = desk === "silva";
  const canView = canSeeSettlements(user.role);
  const canMark = canAuthorizeSettlement(user.role) || isSilvaDesk(user.role);
  const silva = isSilvaDesk(user.role);

  const settlementsQuery = useSettlements(Boolean(activeProgram?.id));
  const markSettled = useMarkSettlementSettled();
  const rows = settlementsQuery.data || [];

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.paymentRequestCode.toLowerCase().includes(q) ||
        r.payee.toLowerCase().includes(q) ||
        r.narrative.toLowerCase().includes(q)
      );
    });
  }, [rows, filter, query]);

  const selected = openId ? rows.find((r) => r.id === openId) : null;

  if (!canView) {
    return <NotAuthorized title="Settlements" />;
  }

  return (
    <OpsDeskPage className={cn(isSilvaUi && "gap-5")}>
      {isSilvaUi ? (
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Settlements</h1>
          <p className="text-sm text-muted-foreground">
            {rows.filter((r) => r.status === "authorized").length} authorized ·{" "}
            {rows.filter((r) => r.status === "settled").length} settled
          </p>
        </header>
      ) : (
        <OpsDeskHeader
          eyebrow={activeProgram?.name || "Control"}
          title="Owner settlements"
          breadcrumbs={[
            { label: "Home", href: CROPFORT_ROUTES.dashboard },
            { label: "Control", href: CROPFORT_ROUTES.approvals },
            { label: "Settlements" },
          ]}
          meta={
            <OpsDeskMeta
              items={[
                {
                  label: "authorized",
                  value: String(rows.filter((r) => r.status === "authorized").length),
                },
                {
                  label: "settled",
                  value: String(rows.filter((r) => r.status === "settled").length),
                },
              ]}
            />
          }
          actions={
            !silva ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={CROPFORT_ROUTES.paymentRequests}>Payment requests</Link>
              </Button>
            ) : null
          }
        />
      )}

      <OpsDeskControlPanel
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search settlement, payee…"
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
      />

      <OpsDeskList>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead>PR</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    {settlementsQuery.isLoading ? "Loading…" : "No settlements yet"}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell className="font-medium">{r.payee}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.paymentRequestCode}
                    </TableCell>
                    <TableCell className="cf-numeric text-right text-sm">
                      {fmtEtb(r.amountEtb)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => setOpenId(r.id === openId ? null : r.id)}
                        >
                          {openId === r.id ? "Hide" : "Open"}
                        </Button>
                        {canMark && r.status === "authorized" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8"
                            disabled={markSettled.isPending}
                            onClick={async () => {
                              try {
                                await markSettled.mutateAsync(r.id);
                                toast.success(`${r.code} marked settled`);
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Update failed");
                              }
                            }}
                          >
                            Mark settled
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

      {selected ? (
        <OpsDeskList flush={false}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">{selected.code}</h2>
              <p className="text-xs text-muted-foreground">
                {selected.payee} · {fmtEtb(selected.amountEtb)} · {selected.paymentRequestCode}
              </p>
            </div>
            <StatusBadge status={selected.status} />
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.narrative}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Summary: {selected.ticketSummary}
          </p>
          <div className="mt-4">
            <OpsDeskChatter
              title="Settlement trail"
              events={[
                {
                  id: `${selected.id}-auth`,
                  title: "Authorized by SPX",
                  subtitle: selected.authorizedByName || "SPX",
                  at: selected.authorizedAt
                    ? new Date(selected.authorizedAt).toLocaleString()
                    : undefined,
                },
                ...(selected.settledAt
                  ? [
                      {
                        id: `${selected.id}-settled`,
                        title: "Marked settled",
                        at: new Date(selected.settledAt).toLocaleString(),
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
