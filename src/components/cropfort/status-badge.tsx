import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = NonNullable<BadgeProps["variant"]>;

/**
 * Single source of truth for status colour across the app.
 * Add new statuses here rather than colouring badges at the call site.
 */
const STATUS_TONE: Record<string, Tone> = {
  // positive / terminal-good
  approved: "success",
  validated: "success",
  released: "success",
  settled: "success",
  synced: "success",
  active: "success",
  complete: "success",
  completed: "success",
  on_track: "success",
  paid: "success",

  // in-flight
  submitted: "info",
  in_review: "info",
  pending_owner: "info",
  processing: "info",
  syncing: "info",
  issued: "info",
  open: "info",

  // needs attention
  pending: "warning",
  at_risk: "warning",
  on_hold: "warning",
  draft_review: "warning",
  queued: "warning",
  returned: "warning",
  invited: "warning",
  flagged: "warning",

  // negative
  rejected: "destructive",
  overdue: "destructive",
  failed: "destructive",
  expired: "destructive",
  suspended: "destructive",
  blocked: "destructive",
  terminated: "destructive",

  // neutral
  draft: "muted",
  archived: "muted",
  inactive: "muted",
  closed: "muted",
};

export function statusTone(status: string): Tone {
  return STATUS_TONE[status.toLowerCase().replace(/[\s-]+/g, "_")] ?? "muted";
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  /** Override the displayed text; defaults to a humanised status. */
  label?: string;
  className?: string;
}) {
  return (
    <Badge variant={statusTone(status)} className={cn("capitalize", className)}>
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
