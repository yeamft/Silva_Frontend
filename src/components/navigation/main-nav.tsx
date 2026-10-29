"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  CalendarRange,
  ChevronDown,
  FileText,
  Home,
  Leaf,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Wrench,
  type LucideIcon,
  RotateCcw,
} from "lucide-react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { CROPFORT_ROUTES } from "@/config/navigation-routes";
import { useDeskCounts } from "@/lib/cropfort/use-desk-counts";
import { useNavigation } from "@/hooks/use-navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

type Workspace = ReturnType<typeof useNavigation>["workspaces"][number];

/** Pages listed under each sidebar section. */
function childLinksFor(workspace: Workspace) {
  if (workspace.id === "planning")
    return workspace.modules.filter((m) => m.id === "programme" || m.id === "farm-assessments" || m.id === "programme-archive");
  if (workspace.id === "execution")
    return workspace.modules.filter((m) => m.id === "monthly-work-orders" || m.id === "work-orders");
  if (workspace.id === "control") return workspace.modules.filter((m) => m.id === "approvals" || m.id === "reports");
  if (workspace.id === "standards" || workspace.id === "administration") return workspace.modules;
  return [];
}

/** SPX Account Manager: links in the order the work happens, each with what's waiting. */
const RETURNED_PLANS_HREF = `${CROPFORT_ROUTES.programmePlans}/returned`;

function FlatLinks() {
  const { isActive } = useNavigation();
  const { isMobile, setOpenMobile } = useSidebar();
  const { badges } = useDeskCounts();
  const links: { id: string; href: string; label: string; icon: LucideIcon; badge?: number; exact?: boolean }[] = [
    { id: "home", href: CROPFORT_ROUTES.dashboard, label: "Home", icon: Home, exact: true },
    { id: "assessments", href: CROPFORT_ROUTES.farmAssessments, label: "Farm assessments", icon: Leaf },
    { id: "plans", href: CROPFORT_ROUTES.programmePlans, label: "Plans", icon: Briefcase, badge: badges.plans },
    // Only shown while something is waiting to be fixed
    ...(badges.returned
      ? [{ id: "returned", href: RETURNED_PLANS_HREF, label: "Returned to fix", icon: RotateCcw, badge: badges.returned }]
      : []),
    { id: "monthly", href: CROPFORT_ROUTES.monthlyWorkOrders, label: "Monthly orders", icon: CalendarRange, badge: badges.monthly },
    { id: "work-orders", href: CROPFORT_ROUTES.workOrders, label: "Work orders", icon: Wrench, badge: badges.workOrders },
    { id: "reports", href: CROPFORT_ROUTES.reports, label: "Reports", icon: FileText },
    { id: "activities", href: CROPFORT_ROUTES.activityTaxonomy, label: "Activities", icon: ListChecks },
  ];

  return (
    <SidebarGroup className="px-2 py-3">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {links.map((link) => {
            // "Plans" isn't highlighted on the returned page, which sits under it
            const active =
              isActive(link.href, { exact: link.exact }) && !(link.id === "plans" && isActive(RETURNED_PLANS_HREF));
            const Icon = link.icon;
            return (
              <SidebarMenuItem key={link.id}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={link.badge ? `${link.label} · ${link.badge} waiting` : link.label}
                  className="h-10 rounded-lg text-[13px] font-medium text-sidebar-foreground/75 transition-colors hover:bg-primary/[0.08] hover:text-sidebar-foreground data-[active=true]:bg-primary/[0.12] data-[active=true]:font-semibold data-[active=true]:text-primary group-data-[collapsible=icon]:justify-center"
                >
                  <Link href={link.href} onClick={() => isMobile && setOpenMobile(false)} aria-current={active ? "page" : undefined}>
                    <span className="relative">
                      <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-sidebar-foreground/55")} aria-hidden />
                      {link.badge ? (
                        <span className="absolute -right-1.5 -top-1.5 hidden h-2 w-2 rounded-full bg-amber-500 group-data-[collapsible=icon]:block" aria-hidden />
                      ) : null}
                    </span>
                    <span className="flex-1 truncate">{link.label}</span>
                    {link.badge ? (
                      <span className="ml-auto rounded-full bg-amber-500/15 px-1.5 text-[11px] font-semibold tabular-nums text-amber-700 group-data-[collapsible=icon]:hidden dark:text-amber-400">
                        {link.badge}
                      </span>
                    ) : null}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function WorkspaceLinks() {
  const { workspaces, isWorkspaceActive, isActive, pathname } = useNavigation();
  const { isMobile, setOpenMobile, state } = useSidebar();
  // Icon rail on desktop: each section's pages open in a pop-out on hover
  const railMode = state === "collapsed" && !isMobile;
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null);
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  useEffect(() => {
    setExpandedWorkspace(null);
    setManuallyExpanded(false);
  }, [pathname]);

  return (
    <SidebarGroup className="px-2.5 py-3">
      {/* <SidebarGroupLabel className="gap-2 px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
        <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary/70" aria-hidden />
        Your workspaces
      </SidebarGroupLabel> */}
      <SidebarGroupContent>
        <SidebarMenu>
          {workspaces
            .filter((workspace) => workspace.id !== "performance")
            .map((workspace) => {
              const active = isWorkspaceActive(workspace.id);
              const Icon = workspace.icon;
              const childLinks = childLinksFor(workspace);
              const childIsActive = childLinks.some((module) => isActive(module.href));
              const expanded = manuallyExpanded
                ? expandedWorkspace === workspace.id
                : active;

              return (
                <SidebarMenuItem key={workspace.id}>
                  {railMode && childLinks.length > 0 ? (
                    <HoverCard openDelay={60} closeDelay={120}>
                      <HoverCardTrigger asChild>
                        <div>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={railMode && childLinks.length > 0 ? undefined : workspace.label}
                        className="relative h-11 rounded-xl text-[13px] font-medium text-sidebar-foreground/75 transition-[color,background-color] duration-150 ease-out hover:bg-primary/[0.08] hover:text-sidebar-foreground motion-reduce:transition-none data-[active=true]:bg-primary/[0.12] data-[active=true]:font-semibold data-[active=true]:text-primary group-data-[collapsible=icon]:justify-center"
                      >
                        <Link
                          href={workspace.href}
                          onClick={closeMobileSidebar}
                          aria-current={active && !childIsActive ? "page" : undefined}
                        >
                          {active ? (
                            <span
                              className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary group-data-[collapsible=icon]:hidden"
                              aria-hidden
                            />
                          ) : null}
                          <Icon
                            className={cn(
                              "transition-colors duration-150 motion-reduce:transition-none",
                              active ? "text-primary" : "text-sidebar-foreground/55",
                            )}
                            aria-hidden
                          />
                          <span>{workspace.label}</span>
                        </Link>
                      </SidebarMenuButton>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" align="start" sideOffset={10} className="w-56 p-1.5">
                        <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {workspace.label}
                        </p>
                        <ul className="space-y-0.5">
                          {childLinks.map((module) => {
                            const on = isActive(module.href);
                            return (
                              <li key={module.id}>
                                <Link
                                  href={module.href}
                                  aria-current={on ? "page" : undefined}
                                  className={cn(
                                    "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                                    on ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-muted",
                                  )}
                                >
                                  <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-primary" : "bg-border")} aria-hidden />
                                  {workspace.id === "standards" && module.id === "taxonomy" ? "Activities" : module.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={railMode && childLinks.length > 0 ? undefined : workspace.label}
                    className="relative h-11 rounded-xl text-[13px] font-medium text-sidebar-foreground/75 transition-[color,background-color] duration-150 ease-out hover:bg-primary/[0.08] hover:text-sidebar-foreground motion-reduce:transition-none data-[active=true]:bg-primary/[0.12] data-[active=true]:font-semibold data-[active=true]:text-primary group-data-[collapsible=icon]:justify-center"
                  >
                    <Link
                      href={workspace.href}
                      onClick={closeMobileSidebar}
                      aria-current={active && !childIsActive ? "page" : undefined}
                    >
                      {active ? (
                        <span
                          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary group-data-[collapsible=icon]:hidden"
                          aria-hidden
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          "transition-colors duration-150 motion-reduce:transition-none",
                          active ? "text-primary" : "text-sidebar-foreground/55",
                        )}
                        aria-hidden
                      />
                      <span>{workspace.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  )}
                  {childLinks.length > 0 ? (
                    <SidebarMenuAction
                      aria-label={`${expanded ? "Collapse" : "Expand"} ${workspace.label} pages`}
                      aria-expanded={expanded}
                      aria-controls={`workspace-${workspace.id}-pages`}
                      onClick={() => {
                        setManuallyExpanded(true);
                        setExpandedWorkspace(expanded ? null : workspace.id);
                      }}
                      className="right-1 top-1.5 h-7 w-7 rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200 ease-out motion-reduce:transition-none",
                          !expanded && "-rotate-90",
                        )}
                        aria-hidden
                      />
                    </SidebarMenuAction>
                  ) : null}
                  {childLinks.length > 0 ? (
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                      aria-hidden={!expanded}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <SidebarMenuSub id={`workspace-${workspace.id}-pages`} className="mb-2 mt-1">
                          {childLinks.map((module) => {
                            const childActive =
                              isActive(module.href) &&
                              !childLinks.some(
                                (other) =>
                                  other.id !== module.id &&
                                  other.href.startsWith(`${module.href}/`) &&
                                  isActive(other.href),
                              );
                            const label =
                              workspace.id === "standards" && module.id === "taxonomy"
                                ? "Activities"
                                : workspace.id === "standards" && module.id === "benchmarks"
                                  ? "Rate surveys"
                                  : workspace.id === "standards" && module.id === "rate-cards"
                                    ? "Rate cards"
                                    : module.label;

                            return (
                              <SidebarMenuSubItem key={module.id}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={childActive}
                                  tabIndex={expanded ? 0 : -1}
                                  className="relative h-9 rounded-lg text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-primary/[0.08] hover:text-sidebar-foreground motion-reduce:transition-none data-[active=true]:bg-primary/[0.10] data-[active=true]:font-semibold data-[active=true]:text-primary"
                                >
                                  <Link
                                    href={module.href}
                                    onClick={closeMobileSidebar}
                                    aria-current={childActive ? "page" : undefined}
                                  >
                                    {childActive ? (
                                      <span
                                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary"
                                        aria-hidden
                                      />
                                    ) : null}
                                    <span>{label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </div>
                    </div>
                  ) : null}
                </SidebarMenuItem>
              );
            })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function MainNav() {
  const { user } = useCropfortAuth();
  const { toggleSidebar, state, isMobile } = useSidebar();
  // The Account Manager closes and reopens the sidebar from its top (the top bar has no toggle on desktop)
  const showToggle = user.role === "spx_validator";
  const collapsed = state === "collapsed" && !isMobile;
  return (
    <Sidebar
      collapsible="icon"
      className="bg-sidebar"
    >
      <SidebarHeader className="flex h-16 justify-center border-b border-sidebar-border/70 bg-sidebar px-3 py-0">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          {showToggle && collapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Open menu"
              title="Open menu"
              className="cf-focus flex h-9 w-9 items-center justify-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <PanelLeftOpen className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <>
              <div className="min-w-0 flex-1 px-1 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-base font-bold tracking-tight text-sidebar-foreground">
                  Cropfort
                </p>
              </div>
              {showToggle ? (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Close menu"
                  title="Close menu"
                  className="cf-focus flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <PanelLeftClose className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="cf-scroll gap-0 bg-sidebar pt-2">
        {user.role === "spx_validator" ? <FlatLinks /> : <WorkspaceLinks />}
      </SidebarContent>
    </Sidebar>
  );
}
