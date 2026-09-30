"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Home,
  MessageSquare,
  Wrench,
  WalletCards,
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

const VENDOR_NAV: NavItem[] = [
  {
    href: CROPFORT_ROUTES.dashboard,
    label: "Home",
    icon: Home,
    match: (p) => p === CROPFORT_ROUTES.dashboard || p === "/cropfort",
  },
  {
    href: CROPFORT_ROUTES.fieldTickets,
    label: "My work",
    icon: ClipboardList,
    match: (p) => p.startsWith(CROPFORT_ROUTES.fieldTickets),
  },
  {
    href: CROPFORT_ROUTES.paymentRequests,
    label: "Payments",
    icon: WalletCards,
    match: (p) => p.startsWith(CROPFORT_ROUTES.paymentRequests),
  },
  {
    href: CROPFORT_ROUTES.communications,
    label: "Messages",
    icon: MessageSquare,
    match: (p) => p.startsWith(CROPFORT_ROUTES.communications),
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

function isNavActive(item: NavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname.startsWith(item.href);
}

/** Field desk for bagro_office / field_supervisor — slim rail on desktop, bottom nav on phone. */
export function VendorFieldShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { activeProgram } = useCropfortAuth();

  return (
    <div
      className="flex min-h-[100dvh] overflow-x-hidden bg-background text-foreground"
      data-desk="vendor"
    >
      <a
        href="#cropfort-main"
        className="cf-focus sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to main content
      </a>

      <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold tracking-tight text-sidebar-foreground">
            <Wrench className="h-4 w-4 text-sidebar-primary" aria-hidden />
            Field desk
          </p>
          <p className="mt-1 truncate text-xs text-sidebar-foreground/50">
            {activeProgram?.name || "Cropfort"}
          </p>
        </div>
        <nav aria-label="Field desk" className="flex flex-1 flex-col gap-0.5 p-2">
          {VENDOR_NAV.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-sm bg-sidebar-primary"
                    aria-hidden
                  />
                ) : null}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-sidebar-primary" : "text-sidebar-foreground/50",
                  )}
                  aria-hidden
                />
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
              <p className="truncate text-sm font-semibold tracking-tight">
                {activeProgram?.name || "Cropfort"}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">Field desk</p>
            </div>
            <div className="hidden min-w-0 flex-1 md:block">
              <p className="truncate text-sm text-muted-foreground">
                My work, payments, and messages
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

        <nav
          aria-label="Field desk"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur md:hidden supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="grid grid-cols-4">
            {VENDOR_NAV.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-0.5 px-1 py-2.5 text-[11px] font-medium transition-colors",
                      active
                        ? "text-sidebar-primary"
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
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
