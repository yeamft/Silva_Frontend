"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/cropfort/status-badge";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import {
  buildWorkspaceInbox,
  inboxTotal,
} from "@/lib/cropfort/workspace-inbox";
import { useCropfortOpsStore } from "@/store/cropfortOpsStore";
import { useDailyFieldRecordStore } from "@/store/dailyFieldRecordStore";
import { useMonthlyWorkOrderStore } from "@/store/monthlyWorkOrderStore";
import { useWeeklyPlanStore } from "@/store/weeklyPlanStore";

type NeedsAttentionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function useAttentionItems() {
  const { user } = useCropfortAuth();
  const tickets = useCropfortOpsStore((s) => s.tickets);
  const afes = useCropfortOpsStore((s) => s.afes);
  const projects = useCropfortOpsStore((s) => s.projects);
  const interventions = useCropfortOpsStore((s) => s.interventions);
  const workOrders = useCropfortOpsStore((s) => s.workOrders);
  const dfrs = useDailyFieldRecordStore((s) => s.records);
  const monthly = useMonthlyWorkOrderStore((s) => s.orders);
  const weekly = useWeeklyPlanStore((s) => s.plans);

  return useMemo(
    () =>
      buildWorkspaceInbox({
        role: user.role,
        userName: user.name,
        workOrders,
        tickets,
        afes,
        projects,
        interventions,
        dfrs,
        monthly,
        weekly,
      }),
    [
      user.role,
      user.name,
      workOrders,
      tickets,
      afes,
      projects,
      interventions,
      dfrs,
      monthly,
      weekly,
    ],
  );
}

export function NeedsAttentionDrawer({ open, onOpenChange }: NeedsAttentionDrawerProps) {
  const items = useAttentionItems();
  const total = inboxTotal(items);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
            Needs attention
            <StatusBadge status="pending" label={String(total)} />
          </SheetTitle>
          <SheetDescription>Issues and decisions that need your action.</SheetDescription>
        </SheetHeader>
        {items.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Nothing needs attention right now.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <StatusBadge status={item.tone} label={String(item.count)} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function useAttentionCount() {
  const items = useAttentionItems();
  return useMemo(() => inboxTotal(items), [items]);
}
