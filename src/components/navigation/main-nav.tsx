"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";

function WorkspaceLinks() {
  const { workspaces, isWorkspaceActive, isActive, pathname } = useNavigation();
  const { isMobile, setOpenMobile } = useSidebar();
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
            .filter(
              (workspace) =>
                workspace.id !== "execution" &&
                workspace.id !== "performance",
            )
            .map((workspace) => {
              const active = isWorkspaceActive(workspace.id);
              const Icon = workspace.icon;
              const childLinks =
                workspace.id === "planning"
                  ? workspace.modules.filter(
                      (module) =>
                        module.id === "programme" ||
                        module.id === "farm-assessments" ||
                        module.id === "programme-archive",
                    )
                  : workspace.id === "control"
                    ? workspace.modules.filter((module) => module.id === "approvals")
                    : workspace.id === "standards"
                      ? workspace.modules
                      : workspace.id === "administration"
                        ? workspace.modules
                        : [];
              const childIsActive = childLinks.some((module) => isActive(module.href));
              const expanded = manuallyExpanded
                ? expandedWorkspace === workspace.id
                : active;

              return (
                <SidebarMenuItem key={workspace.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={workspace.label}
                    className="relative h-11 rounded-xl text-[13px] font-medium transition-[color,background-color] duration-150 ease-out hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none data-[active=true]:bg-white data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground"
                  >
                    <Link
                      href={workspace.href}
                      onClick={closeMobileSidebar}
                      aria-current={active && !childIsActive ? "page" : undefined}
                    >
                      {active ? (
                        <span
                          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-sm bg-sidebar-primary"
                          aria-hidden
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          "transition-colors duration-150 motion-reduce:transition-none",
                          active ? "text-sidebar-primary" : "text-sidebar-foreground/60",
                        )}
                        aria-hidden
                      />
                      <span>{workspace.label}</span>
                    </Link>
                  </SidebarMenuButton>
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
                                  className="relative h-10 rounded-xl text-[13px] transition-colors duration-150 motion-reduce:transition-none data-[active=true]:bg-white data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground"
                                >
                                  <Link
                                    href={module.href}
                                    onClick={closeMobileSidebar}
                                    aria-current={childActive ? "page" : undefined}
                                  >
                                    {childActive ? (
                                      <span
                                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-sm bg-sidebar-primary"
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
  return (
    <Sidebar
      collapsible="icon"
      className="bg-sidebar"
    >
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar px-3 py-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-[10px] font-bold tracking-wide text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/15"
            aria-hidden
          >
            CF
          </span>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">
              Cropfort
            </p>
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/50">
              Field operations
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="cf-scroll gap-0 bg-sidebar">
        <WorkspaceLinks />
      </SidebarContent>
    </Sidebar>
  );
}
