"use client";

import { FarmAreaSelector } from "@/components/cropfort/farm-area-label";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Wrench,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { UserMenu } from "@/components/navigation/user-menu";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { ActivePlanSync } from "@/components/navigation/active-plan-sync";
import { LiveUpdates } from "@/components/navigation/live-updates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { useVendorCounts } from "@/lib/cropfort/use-vendor-counts";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
  /** Shows the open-work count next to this link. */
  counted?: boolean;
};

const VENDOR_NAV: NavItem[] = [
  {
    href: CROPFORT_ROUTES.dashboard,
    label: "Home",
    icon: Home,
    match: (p) => p === CROPFORT_ROUTES.dashboard || p === "/cropfort",
  },
  {
    href: CROPFORT_ROUTES.workOrders,
    label: "Work orders",
    icon: Wrench,
    match: (p) => p.startsWith(CROPFORT_ROUTES.workOrders),
    counted: true,
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

const COLLAPSED_KEY = "cropfort.vendor-sidebar.collapsed";

function CountBadge({ value, dot }: { value: number; dot?: boolean }) {
  if (value <= 0) return null;
  if (dot) return <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" aria-label={`${value} open`} />;
  return (
    <span className="ml-auto rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-amber-700 dark:text-amber-400">
      {value}
    </span>
  );
}

/** Field desk for bagro_office / field_supervisor — slim rail on desktop that can be closed, menu sheet on phone. */
export function VendorFieldShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { badge } = useVendorCounts();

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, prev ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !prev;
    });
  };

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

      <aside
        className={cn(
          "sticky top-0 z-20 hidden h-[100dvh] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[4px_0_16px_-6px_rgba(15,23,20,0.16)] transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-14" : "w-[11.5rem]",
        )}
      >
        <div className={cn("flex items-center gap-1 border-b border-sidebar-border py-3", collapsed ? "justify-center px-2" : "px-3")}>
          {collapsed ? null : (
            <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold tracking-tight text-sidebar-foreground">
              <Wrench className="h-4 w-4 shrink-0 text-sidebar-primary" aria-hidden />
              <span className="truncate">Field desk</span>
            </p>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
            title={collapsed ? "Open sidebar" : "Close sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden /> : <PanelLeftClose className="h-4 w-4" aria-hidden />}
          </Button>
        </div>
        <nav aria-label="Field desk" className="flex flex-1 flex-col gap-0.5 p-2">
          {VENDOR_NAV.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  "relative flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-[color,background-color,transform] duration-150 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transform-none motion-reduce:transition-none",
                  active
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  collapsed && "justify-center px-0 hover:translate-x-0",
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
                {collapsed ? null : item.label}
                {item.counted ? <CountBadge value={badge} dot={collapsed} /> : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-card shadow-[0_1px_2px_rgba(15,23,20,0.06),0_4px_16px_-6px_rgba(15,23,20,0.12)] supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-xl md:hidden" aria-label="Open menu">
                  <Menu className="h-4 w-4" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-3">
                <SheetTitle className="px-2 pb-3 pt-1 text-sm">Field desk</SheetTitle>
                <nav aria-label="Field desk" className="flex flex-col gap-0.5">
                  {VENDOR_NAV.map((item) => {
                    const Icon = item.icon;
                    const active = isNavActive(item, pathname);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                          active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        {item.label}
                        {item.counted ? <CountBadge value={badge} /> : null}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            <div className="flex min-w-0 flex-1 items-center">
              <FarmAreaSelector />
            </div>
            <NotificationBell />
            <UserMenu />
          </div>
          <SessionBanner />
        </header>

        <main
          id="cropfort-main"
          className="w-full min-w-0 flex-1 pb-[env(safe-area-inset-bottom)]"
          tabIndex={-1}
        >
          {children}
        </main>

      </div>

      <LiveUpdates />
      <ActivePlanSync />
      <div id="cropfort-route-announcer" className="sr-only" aria-live="polite" aria-atomic="true" />
    </div>
  );
}
