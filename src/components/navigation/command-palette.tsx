"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { getWorkspacesForRole } from "@/config/cropfort-workspaces";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { cn } from "@/lib/utils";

type CommandItem = {
  id: string;
  label: string;
  href: string;
  group: string;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { user } = useCropfortAuth();
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const list: CommandItem[] = [
      { id: "home", label: "Open Overview", href: CROPFORT_ROUTES.dashboard, group: "Navigate" },
      { id: "create-wo", label: "Create Work Order", href: CROPFORT_ROUTES.workOrders, group: "Commands" },
      { id: "pending-val", label: "Show Pending Validations", href: CROPFORT_ROUTES.validationQueue, group: "Commands" },
      { id: "at-risk", label: "Show At-Risk Activities", href: "/cropfort/control/exceptions", group: "Commands" },
      { id: "budget", label: "Open Budget Forecast", href: CROPFORT_ROUTES.budget, group: "Commands" },
      { id: "timeline", label: "Open Timeline", href: "/cropfort/planning/timeline", group: "Commands" },
    ];
    for (const ws of getWorkspacesForRole(user.role)) {
      list.push({
        id: `ws-${ws.id}`,
        label: ws.label,
        href: ws.href,
        group: "Workspaces",
      });
      for (const m of ws.modules) {
        list.push({
          id: `mod-${ws.id}-${m.id}`,
          label: `${ws.label} · ${m.label}`,
          href: m.href,
          group: "Modules",
        });
      }
    }
    return list;
  }, [user.role]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items.slice(0, 24);
    return items.filter((i) => i.label.toLowerCase().includes(query)).slice(0, 24);
  }, [items, q]);

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      setQ("");
      router.push(href);
    },
    [onOpenChange, router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-3 py-2">
          <DialogTitle className="sr-only">Search CropFort</DialogTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search programmes, work orders, modules…"
              className="border-0 pl-8 shadow-none focus-visible:ring-0"
            />
          </div>
        </DialogHeader>
        <ul className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">No matches</li>
          ) : (
            filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => go(item.href)}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted",
                  )}
                >
                  <span>{item.label}</span>
                  <span className="text-[11px] text-muted-foreground">{item.group}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
