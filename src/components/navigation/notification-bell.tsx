"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  acknowledgeAllNotifications,
  acknowledgeNotification,
  getNotifications,
  type AppNotification,
} from "@/lib/api/notifications";
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
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getNotifications());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const id = window.setInterval(() => void reload(), 60000);
    return () => window.clearInterval(id);
  }, [reload]);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

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
                  await acknowledgeAllNotifications();
                  await reload();
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
                    await acknowledgeNotification(n.id);
                    setItems((prev) =>
                      prev.map((x) => (x.id === n.id ? { ...x, acknowledged: true } : x)),
                    );
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
