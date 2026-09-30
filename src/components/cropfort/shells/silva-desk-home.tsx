"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { mapTicketDto, useWorkOrders } from "@/lib/query/hooks/use-work-orders";
import { useAfes } from "@/lib/query/hooks/use-afes";
import { ticketWaitingOn, fmtEtb } from "@/store/cropfortOpsStore";
import { useSettlements } from "@/lib/query/hooks/use-payment-requests";

/** Compact home for Silva / asset-owner approval desk. */
export function SilvaDeskHome() {
  const { user, activeProgram } = useCropfortAuth();
  const enabled = Boolean(activeProgram?.id);
  const woQuery = useWorkOrders(enabled);
  const afesQuery = useAfes(enabled);
  const settlementsQuery = useSettlements(enabled);

  const assetTickets = useMemo(() => {
    const tickets = (woQuery.data || []).flatMap((wo) =>
      (wo.tickets || []).map((t) => mapTicketDto(t, wo)),
    );
    return tickets
      .filter((t) => ticketWaitingOn(t.status) === "asset_owner")
      .slice(0, 6);
  }, [woQuery.data]);

  const awaitingAfe = useMemo(
    () => (afesQuery.data || []).filter((a) => a.status === "submitted").length,
    [afesQuery.data],
  );

  const settlementHint = useMemo(() => {
    const rows = settlementsQuery.data || [];
    const authorized = rows.filter((r) => r.status === "authorized");
    const value = authorized.reduce((s, r) => s + (r.amountEtb || 0), 0);
    return { count: authorized.length, value };
  }, [settlementsQuery.data]);

  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <div className="cf-page space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Asset owner desk
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Hi {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          {activeProgram?.name || "Your programme"} · decisions and sign-off
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-xs text-muted-foreground">AFEs awaiting</p>
          <p className="cf-numeric mt-1 text-2xl font-semibold sm:text-3xl">{awaitingAfe}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <p className="text-xs text-muted-foreground">Asset tickets</p>
          <p className="cf-numeric mt-1 text-2xl font-semibold sm:text-3xl">{assetTickets.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2 sm:p-5">
          <p className="text-xs text-muted-foreground">Authorized to settle</p>
          <p className="cf-numeric mt-1 text-2xl font-semibold sm:text-3xl">
            {fmtEtb(settlementHint.value)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {settlementHint.count} settlement{settlementHint.count === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:max-w-3xl">
        <Button asChild className="h-auto flex-col gap-1.5 py-4">
          <Link href={CROPFORT_ROUTES.approvals}>
            <ClipboardCheck className="h-5 w-5" />
            <span className="text-xs sm:text-sm">Approvals</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-4">
          <Link href={CROPFORT_ROUTES.fieldTickets}>
            <ClipboardList className="h-5 w-5" />
            <span className="text-xs sm:text-sm">Tickets</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-4">
          <Link href={CROPFORT_ROUTES.settlements}>
            <Wallet className="h-5 w-5" />
            <span className="text-xs sm:text-sm">Settlements</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-4">
          <Link href={CROPFORT_ROUTES.reports}>
            <FileText className="h-5 w-5" />
            <span className="text-xs sm:text-sm">Reports</span>
          </Link>
        </Button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold sm:text-base">Awaiting asset sign-off</h2>
          <Button size="sm" variant="ghost" asChild>
            <Link href={CROPFORT_ROUTES.fieldTickets}>
              Open
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {woQuery.isLoading ? (
          <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : assetTickets.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No tickets waiting on asset owner.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {assetTickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`${CROPFORT_ROUTES.fieldTickets}?ticket=${t.id}`}
                  className="flex h-full items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.code}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                      {t.title || t.activity || "Field ticket"}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
