"use client";

import { CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import {
  AttentionItem,
  AttentionPanel,
  DeskMetric,
} from "@/components/cropfort/attention-panel";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { usePaymentRequests } from "@/lib/query/hooks/use-payment-requests";
import { mapTicketDto, useWorkOrders } from "@/lib/query/hooks/use-work-orders";
import { cn } from "@/lib/utils";
import { ticketWaitingOn } from "@/store/cropfortOpsStore";

/** Field desk home for bagro / field supervisor. */
export function VendorDeskHome() {
  const { activeProgram } = useCropfortAuth();
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

  const estate = activeProgram?.name || "Field desk";
  const loading = woQuery.isLoading;
  const hasAttention = !loading && needsYou.length > 0;

  return (
    <div className="cf-page space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{estate}</h1>
        {!loading ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tabular-nums",
              hasAttention
                ? "bg-primary/10 font-semibold text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {hasAttention ? (
              needsYou.length
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                0
              </>
            )}
          </span>
        ) : null}
      </header>

      {hasAttention ? (
        <AttentionPanel title="Queue" actionHref={CROPFORT_ROUTES.fieldTickets} actionLabel="All">
          {needsYou.slice(0, 8).map((t) => (
            <AttentionItem
              key={t.id}
              href={`${CROPFORT_ROUTES.fieldTickets}?ticket=${t.id}`}
              title={t.code}
              meta={[t.block, t.title].filter(Boolean).join(" · ") || undefined}
              cta="Open"
            />
          ))}
        </AttentionPanel>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DeskMetric
          href={CROPFORT_ROUTES.fieldTickets}
          label="Queue"
          value={loading ? "—" : String(needsYou.length)}
          emphasis={!loading && needsYou.length > 0}
        />
        <DeskMetric
          href={CROPFORT_ROUTES.fieldTickets}
          label="With site"
          value={loading ? "—" : String(withSite)}
        />
        <DeskMetric label="Closed" value={loading ? "—" : String(closed)} />
        <DeskMetric
          href={CROPFORT_ROUTES.paymentRequests}
          label="PRs"
          value={loading ? "—" : String(openPrs)}
          emphasis={!loading && openPrs > 0}
        />
      </section>
    </div>
  );
}
