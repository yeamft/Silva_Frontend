"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useAcknowledgeAllNotifications,
  useAcknowledgeNotification,
  useNotifications,
} from "@/lib/query";
import { cn } from "@/lib/utils";

function relativeTime(iso: string | null) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const notificationsQuery = useNotifications(true);
  const acknowledgeOne = useAcknowledgeNotification();
  const acknowledgeAll = useAcknowledgeAllNotifications();
  const seenIdsRef = useRef<Set<string> | null>(null);

  const items = notificationsQuery.data ?? [];
  const loading = notificationsQuery.isLoading;
  const { refetch, error } = notificationsQuery;

  useEffect(() => {
    if (error) {
      toast.error(error instanceof Error ? error.message : "Could not load notifications");
    }
  }, [error]);

  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  useEffect(() => {
    if (!notificationsQuery.data) return;
    const next = notificationsQuery.data;
    const seen = seenIdsRef.current;
    if (seen == null) {
      seenIdsRef.current = new Set(next.map((n) => n.id));
      return;
    }
    const fresh = next.filter((n) => !seen.has(n.id) && !n.acknowledged);
    for (const n of fresh) {
      seen.add(n.id);
      toast.message(n.message, {
        description: relativeTime(n.sentAt) || "Just now",
      });
    }
    for (const n of next) seen.add(n.id);
  }, [notificationsQuery.data]);

  const unread = items.filter((n) => !n.acknowledged).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 touch-manipulation sm:h-9 sm:w-9"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="h-4 w-4" aria-hidden />
          {unread > 0 ? (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground"
              aria-hidden
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-[11px]"
              onClick={async () => {
                try {
                  await acknowledgeAll.mutateAsync();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not mark all read");
                }
              }}
            >
              Mark all read
            </Button>
          ) : null}
        </div>
        <ScrollArea className="h-80">
          {loading && items.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">No notifications yet.</p>
          ) : (
            items.map((n) => {
              const body = (
                <div
                  className={cn(
                    "w-full border-b border-border/40 px-4 py-3 text-left hover:bg-secondary/40",
                    !n.acknowledged && "border-l-2 border-l-primary",
                    n.acknowledged && "opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium leading-snug">{n.message}</p>
                    {!n.acknowledged ? (
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(n.sentAt)}</p>
                </div>
              );

              const onOpen = async () => {
                if (!n.acknowledged) {
                  try {
                    await acknowledgeOne.mutateAsync(n.id);
                  } catch {
                    // keep unread if ack fails
                  }
                }
                setOpen(false);
              };

              if (n.href) {
                return (
                  <Link key={n.id} href={n.href} onClick={() => void onOpen()}>
                    {body}
                  </Link>
                );
              }

              return (
                <button key={n.id} type="button" className="block w-full" onClick={() => void onOpen()}>
                  {body}
                </button>
              );
            })
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
