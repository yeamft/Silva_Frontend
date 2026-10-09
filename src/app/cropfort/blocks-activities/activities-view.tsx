"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer, PageHeader, SectionCard } from "@/components/cropfort/page-shell";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CROPFORT_ROUTES } from "@/config/navigation";
import {
  fmtEtb,
  includedActivities,
  scheduleLabel,
  scheduleStatusOf,
} from "@/lib/cropfort/planning-helpers";
import { useCoreOpsPlanStore } from "@/store/coreOpsPlanStore";

export default function ActivitiesView() {
  const { activeProgram } = useCropfortAuth();
  const plan = useCoreOpsPlanStore((s) => s.plan);
  const blocks = useCoreOpsPlanStore((s) => s.blocks);
  const loading = useCoreOpsPlanStore((s) => s.loading);
  const loadContext = useCoreOpsPlanStore((s) => s.loadContext);
  const planCompletion = useCoreOpsPlanStore((s) => s.planCompletion);

  const [blockFilter, setBlockFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const completion = planCompletion();
  const rows = useMemo(() => {
    const acts = includedActivities(plan);
    const query = q.trim().toLowerCase();
    return acts
      .flatMap((act) => {
        const allocs =
          act.blockAllocations.length > 0
            ? act.blockAllocations
            : [{ blockId: "__estate", blockCode: "Estate-wide", qty: act.plannedQty }];
        return allocs.map((a) => ({ act, alloc: a }));
      })
      .filter(({ act, alloc }) => {
        if (blockFilter !== "all" && alloc.blockId !== blockFilter) return false;
        if (!query) return true;
        return (
          act.activityName.toLowerCase().includes(query) ||
          act.activityCode.toLowerCase().includes(query) ||
          alloc.blockCode.toLowerCase().includes(query)
        );
      });
  }, [plan, blockFilter, q]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={activeProgram?.name || "Planning"}
        title="Activities"
        breadcrumbs={[
          { label: "Home", href: CROPFORT_ROUTES.dashboard },
          { label: "Planning", href: CROPFORT_ROUTES.coreOperations },
          { label: "Activities" },
        ]}
        meta={
          plan ? (
            <>
              <StatusBadge status={plan.status} />
              <span className="text-xs text-muted-foreground">{plan.farmName}</span>
              <span className="text-xs text-muted-foreground">{plan.budgetYearLabel}</span>
              <span className="text-xs tabular-nums">
                {completion.includedCount} included · {fmtEtb(completion.budgetEtb)}
              </span>
            </>
          ) : null
        }
        actions={
          <Button size="sm" asChild>
            <Link href={CROPFORT_ROUTES.coreOperations}>Programme</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          className="h-9 max-w-xs"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={blockFilter} onValueChange={setBlockFilter}>
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="Block" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All blocks</SelectItem>
            {blocks.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SectionCard title="Activities" flush>
        {loading && !plan ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : !plan ? (
          <p className="p-4 text-sm text-muted-foreground">
            No plan.{" "}
            <Link href={CROPFORT_ROUTES.coreOperations} className="underline underline-offset-2">
              Programme
            </Link>
          </p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">None</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Schedule</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ act, alloc }) => {
                  const rate = act.agreedRate?.unitRateEtb ?? 0;
                  const lineCost = Math.round(alloc.qty * rate * 100) / 100;
                  return (
                    <TableRow key={`${act.id}-${alloc.blockId}`}>
                      <TableCell>
                        <p className="font-medium">{act.activityName}</p>
                        <p className="text-xs text-muted-foreground">
                          {act.activityCode} · {act.category}
                        </p>
                      </TableCell>
                      <TableCell>{alloc.blockCode}</TableCell>
                      <TableCell className="text-right tabular-nums">{alloc.qty}</TableCell>
                      <TableCell>{act.uom}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtEtb(rate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtEtb(lineCost)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={
                            scheduleStatusOf(act) === "scheduled" ? "approved" : "draft"
                          }
                          label={scheduleLabel(act)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}
