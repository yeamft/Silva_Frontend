import { cn } from "@/lib/utils";

type Tone = "success" | "info" | "warning" | "destructive" | "muted";

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
  published: "success",

  // in-flight
  in_review: "info",
  pending_owner: "info",
  processing: "info",
  syncing: "info",
  in_progress: "info",
  assigned: "info",
  accepted: "info",
  issued: "info",
  open: "info",
  planned: "info",
  executing: "info",
  info: "info",
  site_reviewed: "warning",
  site_checked: "warning",
  pending_silva: "warning",
  corrective_action: "warning",
  not_started: "muted",

  // needs attention
  submitted: "warning",
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
  finalized: "info",
  archived: "muted",
  inactive: "muted",
  closed: "muted",
};

const TONE_STYLES: Record<Tone, { wrap: string; mark: string }> = {
  success: {
    wrap: "bg-success/10 text-success",
    mark: "bg-success",
  },
  info: {
    wrap: "bg-info/10 text-info",
    mark: "bg-info",
  },
  warning: {
    wrap: "bg-warning/10 text-warning",
    mark: "bg-warning",
  },
  destructive: {
    wrap: "bg-destructive/10 text-destructive",
    mark: "bg-destructive",
  },
  muted: {
    wrap: "bg-muted text-muted-foreground",
    mark: "bg-muted-foreground/70",
  },
};

/** Symbol per health-style status (● ▲ ■) — still paired with text. */
function StatusMark({ status, tone }: { status: string; tone: Tone }) {
  const key = status.toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "at_risk") {
    return (
      <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center text-[10px] leading-none" aria-hidden>
        ▲
      </span>
    );
  }
  if (key === "blocked") {
    return (
      <span
        className={cn("inline-block h-2 w-2 shrink-0 rounded-[1px]", TONE_STYLES[tone].mark)}
        aria-hidden
      />
    );
  }
  return <span className={cn("cf-status-dot", TONE_STYLES[tone].mark)} aria-hidden />;
}

export function statusTone(status: string): Tone {
  return STATUS_TONE[status.toLowerCase().replace(/[\s-]+/g, "_")] ?? "muted";
}

function sentenceCaseStatus(status: string) {
  const text = status.replace(/_/g, " ").toLowerCase();
  return text.length ? text.charAt(0).toUpperCase() + text.slice(1) : text;
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
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        TONE_STYLES[tone].wrap,
        className,
      )}
    >
      <StatusMark status={status} tone={tone} />
      {label ?? sentenceCaseStatus(status)}
    </span>
  );
}
