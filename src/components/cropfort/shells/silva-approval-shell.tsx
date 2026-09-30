"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Home,
  Wallet,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { UserMenu } from "@/components/navigation/user-menu";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { ActivePlanSync } from "@/components/navigation/active-plan-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { cn } from "@/lib/utils";

const ThemeToggle = dynamic(() => import("@/components/ThemeToggle"), {
  ssr: false,
});

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
};

const SILVA_NAV: NavItem[] = [
  {
    href: CROPFORT_ROUTES.dashboard,
    label: "Home",
    icon: Home,
    match: (p) => p === CROPFORT_ROUTES.dashboard || p === "/cropfort",
  },
  {
    href: CROPFORT_ROUTES.approvals,
    label: "Approvals",
    icon: ClipboardCheck,
    match: (p) => p.startsWith(CROPFORT_ROUTES.approvals),
  },
  {
    href: CROPFORT_ROUTES.fieldTickets,
    label: "Tickets",
    icon: ClipboardList,
    match: (p) => p.startsWith(CROPFORT_ROUTES.fieldTickets),
  },
  {
    href: CROPFORT_ROUTES.settlements,
    label: "Settlements",
    icon: Wallet,
    match: (p) => p.startsWith(CROPFORT_ROUTES.settlements),
  },
  {
    href: CROPFORT_ROUTES.reports,
    label: "Reports",
    icon: FileText,
    match: (p) => p.startsWith(CROPFORT_ROUTES.reports),
  },
];

function SessionBanner() {
  const { sessionWarning, minutesRemaining, extendSession } = useCropfortAuth();
  if (!sessionWarning) return null;
  return (
    <div
      role="status"
      aria-live="assertive"
      className="flex flex-col gap-2 border-b border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground sm:flex-row sm:items-center sm:justify-between sm:px-4"
    >
      <span className="flex items-center gap-2">
        <Badge variant="warning">Session</Badge>
        Expires in {minutesRemaining} min
      </span>
      <Button size="sm" variant="outline" className="h-8 w-full sm:w-auto" onClick={extendSession}>
        Stay signed in
      </Button>
    </div>
  );
}

/** Approval-first desk for any asset owner (farm_owner). */
export function SilvaApprovalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { activeProgram } = useCropfortAuth();

  return (
    <div
      className="flex min-h-[100dvh] overflow-x-hidden bg-background text-foreground"
      data-desk="silva"
    >
      <a
        href="#cropfort-main"
        className="cf-focus sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to main content
      </a>

      {/* Desktop slim rail */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="border-b border-border px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
            Asset owner desk
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {activeProgram?.name || "Approvals"}
          </p>
        </div>
        <nav aria-label="Asset owner desk" className="flex flex-1 flex-col gap-0.5 p-2">
          {SILVA_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.match
              ? item.match(pathname)
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <div className="min-w-0 flex-1 md:hidden">
              <p className="truncate text-sm font-semibold">
                {activeProgram?.name || "Cropfort"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">Asset owner</p>
            </div>
            <div className="hidden min-w-0 flex-1 md:block">
              <p className="truncate text-sm text-muted-foreground">
                Decide plans, AFEs, and field sign-off
              </p>
            </div>
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
          <SessionBanner />
        </header>

        <main
          id="cropfort-main"
          className="w-full min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0"
          tabIndex={-1}
        >
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav
          aria-label="Asset owner desk"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="grid grid-cols-5">
            {SILVA_NAV.map((item) => {
              const Icon = item.icon;
              const active = item.match
                ? item.match(pathname)
                : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-0.5 py-2.5 text-[10px] font-medium transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <ActivePlanSync />
      <div id="cropfort-route-announcer" className="sr-only" aria-live="polite" aria-atomic="true" />
    </div>
  );
}
