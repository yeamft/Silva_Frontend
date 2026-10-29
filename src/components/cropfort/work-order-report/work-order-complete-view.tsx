"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { WorkOrderSummary, monthlyCodeOf, plannedOf } from "@/components/cropfort/work-order-report/work-order-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CROPFORT_ROUTES } from "@/config/navigation";
import type { CompletionItem, CompletionItemStatus, WorkOrderDto } from "@/lib/api/work-orders";
import { useSubmitWorkOrderCompletion, useWorkOrder } from "@/lib/query/hooks/use-work-orders";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: CompletionItemStatus; label: string; tone: string }[] = [
  { value: "completed", label: "Completed", tone: "border-primary bg-primary text-primary-foreground" },
  { value: "partial", label: "Partly done", tone: "border-amber-500 bg-amber-500 text-white" },
  { value: "not_done", label: "Not done", tone: "border-destructive bg-destructive text-destructive-foreground" },
];

type Draft = {
  narrative: string;
  startedOn: string;
  finishedOn: string;
  items: CompletionItem[];
  workers: string;
  mandays: string;
  materialsUsed: string;
  issues: string;
  safety: string;
  nextSteps: string;
};

function initialDraft(wo: WorkOrderDto): Draft {
  const r = wo.completionReport;
  if (r) {
    return {
      narrative: r.narrative,
      startedOn: r.startedOn || "",
      finishedOn: r.finishedOn || "",
      items: r.items,
      workers: r.workers != null ? String(r.workers) : "",
      mandays: r.mandays != null ? String(r.mandays) : "",
      materialsUsed: r.materialsUsed,
      issues: r.issues,
      safety: r.safety,
      nextSteps: r.nextSteps,
    };
  }
  const planned = plannedOf(wo);
  const blocks = wo.blocks.map((b) => b.blockCode || b.blockName).filter(Boolean);
  const label = [wo.activity || wo.title, blocks.join(", ")].filter(Boolean).join(" · ");
  return {
    narrative: "",
    startedOn: "",
    finishedOn: new Date().toISOString().slice(0, 10),
    items: [{ label, plannedQty: planned.qty, unit: planned.unit, doneQty: planned.qty, status: "completed", reason: "" }],
    workers: "",
    mandays: "",
    materialsUsed: "",
    issues: "",
    safety: "",
    nextSteps: "",
  };
}

const numOrNull = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? null : Number(v));

/** Vendor: report the finished work — what was done, anything not done and why — and send it to SPX. */
export default function WorkOrderCompleteView({ id }: { id: string }) {
  const router = useRouter();
  const query = useWorkOrder(id);
  const submit = useSubmitWorkOrderCompletion();
  const wo = query.data;
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => {
    if (wo && !draft) setDraft(initialDraft(wo));
  }, [wo, draft]);

  if (!wo || !draft) {
    return (
      <PageContainer className="cf-page-centered">
        <p className="py-10 text-center text-sm text-muted-foreground">
          {query.isError ? (query.error instanceof Error ? query.error.message : "Couldn't load the work order") : "Loading…"}
        </p>
      </PageContainer>
    );
  }

  const open = wo.status === "issued" || wo.status === "in_progress";
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const setItem = (index: number, patch: Partial<CompletionItem>) =>
    set(
      "items",
      draft.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );

  const missingReason = draft.items.findIndex((i) => i.status !== "completed" && !i.reason.trim());
  const narrativeOk = draft.narrative.trim().length >= 10;
  const labelsOk = draft.items.every((i) => i.label.trim());
  const datesOk = !draft.startedOn || !draft.finishedOn || draft.startedOn <= draft.finishedOn;
  const canSend = open && narrativeOk && labelsOk && missingReason < 0 && datesOk && !submit.isPending;
  const doneCount = draft.items.filter((i) => i.status === "completed").length;

  const send = () => {
    if (!canSend) return;
    submit.mutate(
      {
        id: wo.id,
        report: {
          narrative: draft.narrative.trim(),
          startedOn: draft.startedOn || undefined,
          finishedOn: draft.finishedOn || undefined,
          items: draft.items.map((i) => ({ ...i, label: i.label.trim(), reason: i.reason.trim() })),
          workers: numOrNull(draft.workers),
          mandays: numOrNull(draft.mandays),
          materialsUsed: draft.materialsUsed.trim(),
          issues: draft.issues.trim(),
          safety: draft.safety.trim(),
          nextSteps: draft.nextSteps.trim(),
        },
      },
      {
        onSuccess: () => toast.success(`${wo.code} sent to SPX for review`),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Could not send the report"),
      },
    );
    router.push(CROPFORT_ROUTES.workOrders);
  };

  const monthly = monthlyCodeOf(wo);

  return (
    <PageContainer className="cf-page-centered">
      <PageHeader
        title={`Report work · ${wo.code}`}
        breadcrumbs={[
          { label: "Work orders", href: CROPFORT_ROUTES.workOrders },
          { label: wo.code },
        ]}
        meta={<span>{[wo.title, monthly].filter(Boolean).join(" · ")}</span>}
      />

      <WorkOrderSummary wo={wo} />

      {wo.vendorOutcome === "returned" && wo.vendorNote ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/[0.07] px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            <span className="font-semibold">SPX returned this work order:</span> {wo.vendorNote}
          </span>
        </div>
      ) : null}

      {!open ? (
        <SectionCard>
          <p className="text-sm text-muted-foreground">
            This work order is {wo.statusRaw === "closed" ? "approved" : wo.status === "complete" ? "already sent for review" : "not issued yet"}.{" "}
            <Link href={CROPFORT_ROUTES.workOrders} className="font-medium text-primary hover:underline">
              Back to work orders
            </Link>
          </p>
        </SectionCard>
      ) : null}

      {/* 1. Narrative */}
      <SectionCard title="What was done" description="Describe the work in your own words — how it went and what was achieved.">
        <div className="space-y-4">
          <Textarea
            rows={5}
            value={draft.narrative}
            disabled={!open}
            onChange={(e) => set("narrative", e.target.value)}
            placeholder="e.g. Weeded all of block B-12 by hand over three days. Rows 1–40 fully cleared; slashed the paths and piled the weeds at the edge…"
          />
          {!narrativeOk && draft.narrative ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">Add a bit more detail (at least a sentence).</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="started">Started on</Label>
              <Input id="started" type="date" value={draft.startedOn} disabled={!open} onChange={(e) => set("startedOn", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="finished">Finished on</Label>
              <Input id="finished" type="date" value={draft.finishedOn} disabled={!open} onChange={(e) => set("finishedOn", e.target.value)} />
            </div>
          </div>
          {!datesOk ? <p className="text-xs text-destructive">The finish date is before the start date.</p> : null}
        </div>
      </SectionCard>

      {/* 2. Activities */}
      <SectionCard
        title="Activities"
        description={`${doneCount} of ${draft.items.length} completed. For anything not completed, say why.`}
        action={
          open ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                set("items", [
                  ...draft.items,
                  { label: "", plannedQty: null, unit: draft.items[0]?.unit || "", doneQty: null, status: "completed", reason: "" },
                ])
              }
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Add activity
            </Button>
          ) : null
        }
      >
        <ul className="space-y-3">
          {draft.items.map((item, index) => (
            <li
              key={index}
              className={cn(
                "rounded-xl border p-3",
                item.status === "completed"
                  ? "border-primary/30"
                  : item.status === "partial"
                    ? "border-amber-500/40 bg-amber-500/[0.04]"
                    : "border-destructive/40 bg-destructive/[0.03]",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={item.label}
                  disabled={!open}
                  onChange={(e) => setItem(index, { label: e.target.value })}
                  placeholder="Activity done"
                  aria-label="Activity"
                  className="h-9 min-w-[12rem] flex-1 font-medium"
                />
                {open && draft.items.length > 1 ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    aria-label="Remove activity"
                    onClick={() => set("items", draft.items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="inline-flex rounded-lg border border-border p-0.5" role="radiogroup" aria-label="Status">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={item.status === opt.value}
                      disabled={!open}
                      onClick={() =>
                        setItem(index, {
                          status: opt.value,
                          doneQty: opt.value === "completed" ? item.plannedQty : opt.value === "not_done" ? 0 : item.doneQty,
                        })
                      }
                      className={cn(
                        "cf-focus rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold transition-colors",
                        item.status === opt.value ? opt.tone : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Planned</Label>
                  <Input
                    type="number"
                    min={0}
                    value={item.plannedQty ?? ""}
                    disabled={!open}
                    onChange={(e) => setItem(index, { plannedQty: numOrNull(e.target.value) })}
                    className="h-9 w-24 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Done</Label>
                  <Input
                    type="number"
                    min={0}
                    value={item.doneQty ?? ""}
                    disabled={!open}
                    onChange={(e) => setItem(index, { doneQty: numOrNull(e.target.value) })}
                    className="h-9 w-24 tabular-nums"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Unit</Label>
                  <Input
                    value={item.unit}
                    disabled={!open}
                    onChange={(e) => setItem(index, { unit: e.target.value })}
                    className="h-9 w-20"
                  />
                </div>
              </div>

              {item.status !== "completed" ? (
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor={`reason-${index}`}>
                    Why wasn&apos;t it {item.status === "partial" ? "finished" : "done"}? <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id={`reason-${index}`}
                    rows={2}
                    value={item.reason}
                    disabled={!open}
                    onChange={(e) => setItem(index, { reason: e.target.value })}
                    placeholder="e.g. Heavy rain for two days; the lower rows were flooded. Will finish next week."
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* 3. Resources and notes */}
      <SectionCard title="Labour, materials and notes" description="Optional, but it helps SPX approve faster.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="workers">Workers on site</Label>
            <Input id="workers" type="number" min={0} value={draft.workers} disabled={!open} onChange={(e) => set("workers", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mandays">Man-days used</Label>
            <Input id="mandays" type="number" min={0} value={draft.mandays} disabled={!open} onChange={(e) => set("mandays", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="materials">Materials and tools used</Label>
            <Textarea id="materials" rows={2} value={draft.materialsUsed} disabled={!open} onChange={(e) => set("materialsUsed", e.target.value)} placeholder="e.g. 20 kg urea, 4 knapsack sprayers" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="issues">Problems or delays</Label>
            <Textarea id="issues" rows={2} value={draft.issues} disabled={!open} onChange={(e) => set("issues", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="safety">Safety incidents</Label>
            <Textarea id="safety" rows={2} value={draft.safety} disabled={!open} onChange={(e) => set("safety", e.target.value)} placeholder="None" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="next">Recommendations or follow-up</Label>
            <Textarea id="next" rows={2} value={draft.nextSteps} disabled={!open} onChange={(e) => set("nextSteps", e.target.value)} />
          </div>
        </div>
      </SectionCard>

      {open ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground sm:mr-auto">
            {!narrativeOk
              ? "Describe what was done to send the report."
              : missingReason >= 0
                ? "Give a reason for every activity that isn't completed."
                : !labelsOk
                  ? "Name every activity."
                  : "SPX reviews the report and approves it or sends it back."}
          </p>
          <Button variant="ghost" asChild>
            <Link href={CROPFORT_ROUTES.workOrders}>Cancel</Link>
          </Button>
          <Button disabled={!canSend} onClick={send}>
            <Send className="mr-1.5 h-4 w-4" aria-hidden />
            Send to SPX for review
          </Button>
        </div>
      ) : null}
    </PageContainer>
  );
}
