"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  FileText,
  Files,
  Home,
  Archive,
  Leaf,
} from "lucide-react";
import type { ReactNode } from "react";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { UserMenu } from "@/components/navigation/user-menu";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { ActivePlanSync } from "@/components/navigation/active-plan-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { cn } from "@/lib/utils";

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
    href: CROPFORT_ROUTES.farmAssessments,
    label: "Farm assessments",
    icon: Files,
    match: (p) => p.startsWith(CROPFORT_ROUTES.farmAssessments),
  },
  {
    href: CROPFORT_ROUTES.programmePlansArchive,
    label: "Archived plans",
    icon: Archive,
    match: (p) => p.startsWith(CROPFORT_ROUTES.programmePlansArchive),
  },
  {
    href: CROPFORT_ROUTES.reports,
    label: "Reports",
    icon: FileText,
    match: (p) => p.startsWith(CROPFORT_ROUTES.reports),
  },
];

// Keep assessment notifications available through their direct links on mobile.
const SILVA_MOBILE_NAV = SILVA_NAV.filter(
  (item) => item.href !== CROPFORT_ROUTES.farmAssessments,
);

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
  const currentPage = SILVA_NAV.find((item) =>
    item.match ? item.match(pathname) : pathname.startsWith(item.href),
  );

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

      {/* Desktop slim rail — shared sidebar tokens keep the desks visually consistent. */}
      <aside className="relative z-20 hidden w-60 shrink-0 flex-col border-r border-emerald-900/10 bg-gradient-to-b from-emerald-50 to-sidebar text-sidebar-foreground shadow-[4px_0_20px_-8px_rgba(15,23,20,0.18)] md:flex">
        <div className="border-b border-emerald-900/10 px-4 pb-5 pt-5">
          <Link href={CROPFORT_ROUTES.dashboard} className="group flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <Leaf className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-sidebar-foreground">Cropfort</span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
                Asset owner
              </span>
            </span>
          </Link>
        </div>
        <nav aria-label="Asset owner desk" className="flex flex-1 flex-col p-3">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
            Workspace
          </p>
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
                  "relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[color,background-color,box-shadow,transform] duration-150 ease-out hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transform-none motion-reduce:transition-none",
                  active
                    ? "bg-white font-semibold text-sidebar-accent-foreground shadow-sm ring-1 ring-emerald-900/10"
                    : "text-sidebar-foreground/70 hover:bg-white/70 hover:text-sidebar-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  <span
                    className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-sm bg-sidebar-primary"
                    aria-hidden
                  />
                ) : null}
                <Icon
                  className={cn(
                    "size-[18px] shrink-0",
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
        <header className="sticky top-0 z-30 border-b border-border bg-card shadow-[0_1px_2px_rgba(15,23,20,0.06),0_4px_16px_-6px_rgba(15,23,20,0.12)] supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
                <Leaf className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {currentPage?.label || "Home"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {activeProgram?.name || "Cropfort"}
                </p>
              </div>
            </div>
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
          className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur md:hidden supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]"
        >
          <ul
            className="grid"
            style={{ gridTemplateColumns: `repeat(${SILVA_MOBILE_NAV.length}, minmax(0, 1fr))` }}
          >
            {SILVA_MOBILE_NAV.map((item) => {
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
                        ? "text-sidebar-primary"
                        :                         "text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground motion-reduce:transition-none",
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
