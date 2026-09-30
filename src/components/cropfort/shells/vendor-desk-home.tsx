"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Home,
  MessageSquare,
  WalletCards,
} from "lucide-react";
import { useMemo } from "react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { mapTicketDto, useWorkOrders } from "@/lib/query/hooks/use-work-orders";
import { usePaymentRequests } from "@/lib/query/hooks/use-payment-requests";
import { ticketWaitingOn } from "@/store/cropfortOpsStore";

/** Field desk home for bagro_office / field_supervisor. */
export function VendorDeskHome() {
  const { user, activeProgram } = useCropfortAuth();
  const enabled = Boolean(activeProgram?.id);
  const woQuery = useWorkOrders(enabled);
  const prQuery = usePaymentRequests(enabled);

  const tickets = useMemo(() => {
    return (woQuery.data || []).flatMap((wo) =>
      (wo.tickets || []).map((t) => mapTicketDto(t, wo)),
    );
  }, [woQuery.data]);

  const needsYou = useMemo(
    () => tickets.filter((t) => ticketWaitingOn(t.status) === "vendor"),
    [tickets],
  );

  const withSite = useMemo(
    () => tickets.filter((t) => ticketWaitingOn(t.status) === "site_owner").length,
    [tickets],
  );

  const closed = useMemo(
    () => tickets.filter((t) => t.status === "validated").length,
    [tickets],
  );

  const openPrs = useMemo(() => {
    const rows = prQuery.data || [];
    return rows.filter((r) => r.status === "draft" || r.status === "submitted" || r.status === "returned")
      .length;
  }, [prQuery.data]);

  const queuePreview = needsYou.slice(0, 6);
  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <div className="cf-page space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Field desk
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Hi {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          {activeProgram?.name || "Your programme"} · tickets that need you
        </p>
      </header>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <div className="rounded-xl border border-border bg-card p-3 sm:p-5">
          <p className="text-[10px] text-muted-foreground sm:text-xs">Needs you</p>
          <p className="cf-numeric mt-1 text-lg font-semibold sm:text-3xl">{needsYou.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 sm:p-5">
          <p className="text-[10px] text-muted-foreground sm:text-xs">With site</p>
          <p className="cf-numeric mt-1 text-lg font-semibold sm:text-3xl">{withSite}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 sm:p-5">
          <p className="text-[10px] text-muted-foreground sm:text-xs">Closed</p>
          <p className="cf-numeric mt-1 text-lg font-semibold sm:text-3xl">{closed}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 sm:p-5">
          <p className="text-[10px] text-muted-foreground sm:text-xs">Open PRs</p>
          <p className="cf-numeric mt-1 text-lg font-semibold sm:text-3xl">{openPrs}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <Button asChild className="h-auto flex-col gap-1.5 py-4">
          <Link href={CROPFORT_ROUTES.dashboard}>
            <Home className="h-5 w-5" />
            <span className="text-xs sm:text-sm">Home</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-4">
          <Link href={CROPFORT_ROUTES.fieldTickets}>
            <ClipboardList className="h-5 w-5" />
            <span className="text-xs sm:text-sm">Tickets</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-4">
          <Link href={CROPFORT_ROUTES.paymentRequests}>
            <WalletCards className="h-5 w-5" />
            <span className="text-xs sm:text-sm">Payments</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-4">
          <Link href={CROPFORT_ROUTES.communications}>
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs sm:text-sm">Messages</span>
          </Link>
        </Button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold sm:text-base">Needs you</h2>
          <Button size="sm" variant="ghost" asChild>
            <Link href={CROPFORT_ROUTES.fieldTickets}>
              All
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {woQuery.isLoading ? (
          <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Loading tickets…
          </p>
        ) : queuePreview.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No tickets waiting on you right now.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {queuePreview.map((t) => (
              <li key={t.id}>
                <Link
                  href={`${CROPFORT_ROUTES.fieldTickets}?ticket=${t.id}`}
                  className="flex h-full items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.code}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                      {t.title || t.activity || "Field ticket"}
                      {t.block ? ` · ${t.block}` : ""}
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
