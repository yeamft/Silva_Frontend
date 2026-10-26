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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
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

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "15rem" } as React.CSSProperties}
      className="min-h-[100dvh] items-stretch overflow-x-hidden bg-background text-foreground"
      data-desk="silva"
    >
      <a
        href="#cropfort-main"
        className="cf-focus sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to main content
      </a>

      <Sidebar className="border-sidebar-border bg-gradient-to-b from-emerald-50 to-sidebar">
        <SidebarHeader className="p-4">
          <Link
            href={CROPFORT_ROUTES.dashboard}
            className="group flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Leaf className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-sidebar-foreground">
                Cropfort
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
                Asset owner
              </span>
            </span>
          </Link>
          <SidebarSeparator className="mx-0 mt-2" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu aria-label="Asset owner desk">
                {SILVA_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = item.match
                    ? item.match(pathname)
                    : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        size="lg"
                        tooltip={item.label}
                      >
                        <Link href={item.href} aria-current={active ? "page" : undefined}>
                          <Icon aria-hidden />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarSeparator className="mx-0" />
          <p className="px-2 py-1 text-xs text-sidebar-foreground/60">
            {activeProgram?.name || "Cropfort"}
          </p>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset
        id="cropfort-main"
        tabIndex={-1}
        className="min-w-0 overflow-x-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0"
      >
        <header className="sticky top-0 z-30 border-b border-border bg-card supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
            <SidebarTrigger
              className="shrink-0 border border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground hover:bg-sidebar-accent"
              aria-label="Toggle navigation"
            />
            <div className="flex-1" />
            <NotificationBell />
            <UserMenu />
          </div>
          <SessionBanner />
        </header>

        {children}

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
                  <Button
                    asChild
                    variant="ghost"
                    className={cn(
                      "h-auto w-full flex-col gap-0.5 rounded-none px-0.5 py-2.5 text-[10px] font-medium",
                      active
                        ? "text-sidebar-primary"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    <Link href={item.href} aria-current={active ? "page" : undefined}>
                      <Icon className="size-5" aria-hidden />
                      {item.label}
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>
      </SidebarInset>

      <ActivePlanSync />
      <div id="cropfort-route-announcer" className="sr-only" aria-live="polite" aria-atomic="true" />
    </SidebarProvider>
  );
}
