"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { WorkOrderSummary, monthlyCodeOf } from "@/components/cropfort/work-order-report/work-order-summary";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import type { CompletionItemStatus } from "@/lib/api/work-orders";
import { isSpxDesk } from "@/lib/cropfort/platform-access";
import { useReviewWorkOrder, useWorkOrder } from "@/lib/query/hooks/use-work-orders";
import { cn } from "@/lib/utils";

const ITEM_STATUS: Record<CompletionItemStatus, { label: string; tone: string }> = {
  completed: { label: "Completed", tone: "bg-primary/10 text-primary" },
  partial: { label: "Partly done", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  not_done: { label: "Not done", tone: "bg-destructive/10 text-destructive" },
};

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

/** SPX: read the vendor's completion report, then approve the work order or return it. */
export default function WorkOrderReviewView({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useCropfortAuth();
  const canReview = isSpxDesk(user.role) || user.role === "field_supervisor";
  const query = useWorkOrder(id);
  const review = useReviewWorkOrder();
  const [returning, setReturning] = useState(false);
  const [comment, setComment] = useState("");
  const wo = query.data;

  if (!wo) {
    return (
      <PageContainer className="cf-page-centered">
        <p className="py-10 text-center text-sm text-muted-foreground">
          {query.isError ? (query.error instanceof Error ? query.error.message : "Couldn't load the work order") : "Loading…"}
        </p>
      </PageContainer>
    );
  }

  const report = wo.completionReport;
  const pending = wo.status === "complete" && wo.statusRaw !== "closed";
  const backHref = `${CROPFORT_ROUTES.workOrders}?view=review`;

  const decide = (decision: "approve" | "return") => {
    review.mutate(
      { id: wo.id, decision, comment: decision === "return" ? comment.trim() : undefined },
      {
        onSuccess: () => toast.success(decision === "approve" ? `${wo.code} approved` : `${wo.code} returned to the vendor`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save the decision"),
      },
    );
    router.push(backHref);
  };

  const facts = report
    ? [
        { label: "Started", value: fmtDate(report.startedOn) },
        { label: "Finished", value: fmtDate(report.finishedOn) },
        { label: "Workers", value: report.workers ?? "—" },
        { label: "Man-days", value: report.mandays ?? "—" },
      ]
    : [];
  const notes = report
    ? [
        { label: "Materials and tools used", value: report.materialsUsed },
        { label: "Problems or delays", value: report.issues },
        { label: "Safety incidents", value: report.safety },
        { label: "Recommendations or follow-up", value: report.nextSteps },
      ].filter((n) => n.value)
    : [];

  return (
    <PageContainer className="cf-page-centered">
      <PageHeader
        title={`Review · ${wo.code}`}
        breadcrumbs={[
          { label: "Work orders", href: backHref },
          { label: wo.code },
        ]}
        meta={
          <span>
            {[wo.title, monthlyCodeOf(wo), report?.submittedBy ? `Sent by ${report.submittedBy}` : null, report?.submittedAt ? fmtDate(report.submittedAt) : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        }
        actions={
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              wo.statusRaw === "closed"
                ? "bg-primary/10 text-primary"
                : pending
                  ? wo.vendorOutcome === "partial"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {wo.statusRaw === "closed"
              ? "Approved"
              : pending
                ? wo.vendorOutcome === "partial"
                  ? "Sent for review · partly done"
                  : "Sent for review"
                : wo.vendorOutcome === "returned"
                  ? "Returned to vendor"
                  : "Not sent yet"}
          </span>
        }
      />

      <WorkOrderSummary wo={wo} />

      {!report ? (
        <SectionCard title="Vendor's report">
          <p className="text-sm text-muted-foreground">
            {pending
              ? `The vendor marked this done without a written report.${wo.vendorNote ? ` Note: ${wo.vendorNote}` : ""}`
              : "The vendor hasn't sent a report for this work order yet."}
          </p>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="What was done">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{report.narrative}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums">{f.value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard
            title="Activities"
            description={`${report.items.filter((i) => i.status === "completed").length} of ${report.items.length} completed`}
          >
            <ul className="divide-y divide-border">
              {report.items.map((item, i) => (
                <li key={i} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 text-sm font-semibold">{item.label}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {item.doneQty ?? "—"} / {item.plannedQty ?? "—"} {item.unit}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", ITEM_STATUS[item.status].tone)}>
                      {ITEM_STATUS[item.status].label}
                    </span>
                  </div>
                  {item.reason ? (
                    <p className="mt-1.5 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <span className="font-medium">Reason: </span>
                      {item.reason}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </SectionCard>

          {notes.length ? (
            <SectionCard title="Notes">
              <dl className="grid gap-4 sm:grid-cols-2">
                {notes.map((n) => (
                  <div key={n.label}>
                    <dt className="text-xs text-muted-foreground">{n.label}</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-sm">{n.value}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          ) : null}
        </>
      )}

      {pending && canReview ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-4">
          {returning ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold">What must the vendor fix?</p>
              <Textarea
                rows={3}
                autoFocus
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Rows 30–40 still need weeding — finish them and report again."
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setReturning(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" disabled={!comment.trim() || review.isPending} onClick={() => decide("return")}>
                  <Undo2 className="mr-1.5 h-4 w-4" aria-hidden />
                  Return to vendor
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground sm:mr-auto">
                Approving confirms the work is done and closes the work order.
              </p>
              <Button variant="outline" onClick={() => setReturning(true)}>
                <Undo2 className="mr-1.5 h-4 w-4" aria-hidden />
                Return
              </Button>
              <Button disabled={review.isPending} onClick={() => decide("approve")}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden />
                Approve
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-sm">
          <Link href={backHref} className="font-medium text-primary hover:underline">
            Back to work orders
          </Link>
        </p>
      )}
    </PageContainer>
  );
}
