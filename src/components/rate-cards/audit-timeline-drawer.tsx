"use client";

import { StatusBadge } from "@/components/cropfort/status-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useWorkflowAudit } from "@/lib/query";

/**
 * Immutable audit timeline for a survey or standing line (mock store).
 */
export function AuditTimelineDrawer({
  entityId,
  entityLabel,
  open,
  onOpenChange,
}: {
  entityId: string | null;
  entityLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const audit = useWorkflowAudit(entityId, open && Boolean(entityId));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Audit history</SheetTitle>
          <SheetDescription>{entityLabel}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          {audit.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (audit.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events yet.</p>
          ) : (
            <ul className="space-y-3">
              {(audit.data ?? []).map((event) => (
                <li key={event.id} className="rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={event.action} label={event.action.replace(/_/g, " ")} />
                    <time className="text-[11px] text-muted-foreground">
                      {new Date(event.at).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-1.5 text-sm text-foreground">{event.actorName}</p>
                  {event.comment ? (
                    <p className="mt-1 text-xs text-muted-foreground">{event.comment}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
