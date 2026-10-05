"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import {
  AttentionItem,
  AttentionPanel,
  DeskMetric,
} from "@/components/cropfort/attention-panel";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { usePaymentRequests } from "@/lib/query/hooks/use-payment-requests";
import { mapTicketDto, useWorkOrders } from "@/lib/query/hooks/use-work-orders";
import { ticketWaitingOn } from "@/store/cropfortOpsStore";

/** Field desk home for bagro / field supervisor — same lean pattern as asset owner. */
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
    return rows.filter(
      (r) => r.status === "draft" || r.status === "submitted" || r.status === "returned",
    ).length;
  }, [prQuery.data]);

  const firstName = user.name.split(" ")[0] || user.name;
  const estate = activeProgram?.name || "Your programme";
  const loading = woQuery.isLoading;
  const hasAttention = !loading && needsYou.length > 0;

  const hour = new Date().getHours();
  const hello =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="cf-page space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{estate}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {hello}, {firstName}
          </h1>
        </div>
        {!loading ? (
          hasAttention ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {needsYou.length} for you
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              All clear
            </span>
          )
        ) : null}
      </header>

      {hasAttention ? (
        <AttentionPanel
          title="My work"
          actionHref={CROPFORT_ROUTES.fieldTickets}
          actionLabel="View all"
        >
          {needsYou.slice(0, 8).map((t) => (
            <AttentionItem
              key={t.id}
              href={`${CROPFORT_ROUTES.fieldTickets}?ticket=${t.id}`}
              eyebrow="Ticket"
              title={t.code}
              meta={[t.title || t.description || "Field ticket", t.block]
                .filter(Boolean)
                .join(" · ")}
              cta="Open"
            />
          ))}
        </AttentionPanel>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DeskMetric
          href={CROPFORT_ROUTES.fieldTickets}
          label="Needs you"
          value={loading ? "—" : String(needsYou.length)}
          emphasis={!loading && needsYou.length > 0}
        />
        <DeskMetric
          href={CROPFORT_ROUTES.fieldTickets}
          label="With site"
          value={loading ? "—" : String(withSite)}
          hint={withSite > 0 ? "Awaiting check" : undefined}
        />
        <DeskMetric
          label="Closed"
          value={loading ? "—" : String(closed)}
        />
        <DeskMetric
          href={CROPFORT_ROUTES.paymentRequests}
          label="Open PRs"
          value={loading ? "—" : String(openPrs)}
          emphasis={!loading && openPrs > 0}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={CROPFORT_ROUTES.fieldTickets}>
            My work
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={CROPFORT_ROUTES.paymentRequests}>
            Payment requests
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
