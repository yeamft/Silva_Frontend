"use client";

import { PanelLeftClose, PanelLeftOpen, Sprout } from "lucide-react";
import { useLocaleStore } from "@/store/localeStore";
import { useAuthStore } from "@/store/authStore";
import { useFieldOsStore } from "@/store/fieldOsStore";
import { t } from "@/lib/translations";
import { ROLE_LABELS } from "@/lib/rbac";
import { ROLE_NAV_ACCESS } from "@/lib/roleNav";
import type { UserRole } from "@/store/authStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OS_NAV_GROUPS } from "@/lib/osModules";
import { cn } from "@/lib/utils";

interface SideNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
  userRole?: UserRole | null;
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

function NavBody({
  activeView,
  onNavigate,
  userRole,
  showLabels,
}: {
  activeView: string;
  onNavigate: (id: string) => void;
  userRole?: UserRole | null;
  showLabels: boolean;
}) {
  const locale = useLocaleStore((s) => s.locale);

  const allowedIds = userRole ? ROLE_NAV_ACCESS[userRole] ?? [] : [];
  const groups = OS_NAV_GROUPS.map((group) => ({
    ...group,
    items:
      allowedIds.length > 0
        ? group.items.filter((i) => allowedIds.includes(i.id))
        : group.items,
  })).filter((group) => group.items.length > 0);

  return (
    <TooltipProvider delayDuration={0}>
      <ScrollArea className="flex-1">
        <div className={cn("space-y-5 py-4", showLabels ? "px-3" : "px-2")}>
          {groups.map((group, groupIndex) => (
            <div key={group.id} className="space-y-1">
              {groupIndex > 0 ? <Separator className="mb-4 bg-sidebar-border/80" /> : null}
              {showLabels ? (
                <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40">
                  {t(locale, group.labelKey)}
                </p>
              ) : null}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeView === item.id;
                  const label = t(locale, item.labelKey);
                  const button = (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onNavigate(item.id)}
                      title={label}
                      aria-label={showLabels ? undefined : label}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative h-9 w-full gap-3 rounded-md px-3 text-sidebar-foreground/65",
                        showLabels ? "justify-start" : "justify-center px-0",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent"
                          : "hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                      )}
                    >
                      {isActive ? (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary"
                          aria-hidden
                        />
                      ) : null}
                      <item.icon
                        className={cn(
                          "h-[17px] w-[17px] shrink-0",
                          isActive ? "text-sidebar-primary" : "text-sidebar-foreground/45"
                        )}
                        aria-hidden
                      />
                      {showLabels ? <span className="truncate text-[13px] font-medium">{label}</span> : null}
                    </Button>
                  );

                  if (!showLabels) {
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                        <TooltipContent side="right">{label}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <div key={item.id}>{button}</div>;
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}

function UserFooter({ showLabels }: { showLabels: boolean }) {
  const user = useAuthStore((s) => s.user);
  const program = useFieldOsStore((s) => s.program);
  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!showLabels) {
    return (
      <div className="flex justify-center border-t border-sidebar-border p-3">
        <Avatar className="h-9 w-9 border border-sidebar-border">
          <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-sidebar-accent text-xs font-medium text-sidebar-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-sidebar-foreground">{user.name}</p>
          <p className="truncate text-xs text-sidebar-foreground/50">
            {ROLE_LABELS[user.role] ?? user.role} · {program.code}
          </p>
        </div>
      </div>
    </div>
  );
}

const SideNav = ({
  activeView,
  onViewChange,
  userRole,
  collapsed,
  onToggle,
  isMobile,
}: SideNavProps) => {
  const locale = useLocaleStore((s) => s.locale);
  const program = useFieldOsStore((s) => s.program);
  const drawerOpen = isMobile ? !collapsed : true;
  const showLabels = isMobile || !collapsed;

  const handleNavigate = (id: string) => {
    onViewChange(id);
    if (isMobile) onToggle();
  };

  const brand = (
    <div className={cn("flex min-w-0 items-center", showLabels && "flex-1 gap-3")}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary">
        <Sprout className="h-4 w-4 text-sidebar-primary-foreground" />
      </div>
      {showLabels ? (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight tracking-tight text-sidebar-foreground">
            Coffee Field OS
          </p>
          <p className="truncate text-xs text-sidebar-foreground/50">{program.name}</p>
        </div>
      ) : null}
    </div>
  );

  const header = (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 border-b border-sidebar-border px-3",
        collapsed && !isMobile ? "h-auto flex-col justify-center gap-2 py-3" : "h-14 sm:h-16"
      )}
    >
      {brand}
      {!isMobile ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={collapsed ? t(locale, "nav_expand") : t(locale, "nav_collapse")}
          title={collapsed ? t(locale, "nav_expand") : t(locale, "nav_collapse")}
          className="shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      ) : null}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={drawerOpen} onOpenChange={(open) => !open && onToggle()}>
        <SheetContent
          side="left"
          className="flex w-[min(100%,18rem)] flex-col border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="space-y-0 border-b border-sidebar-border px-4 py-4 text-left">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {brand}
          </SheetHeader>
          <NavBody activeView={activeView} onNavigate={handleNavigate} userRole={userRole} showLabels />
          <UserFooter showLabels />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "fixed bottom-0 left-0 top-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out",
        collapsed ? "w-[4.5rem]" : "w-64"
      )}
    >
      {header}
      <NavBody
        activeView={activeView}
        onNavigate={handleNavigate}
        userRole={userRole}
        showLabels={showLabels}
      />
      <UserFooter showLabels={showLabels} />
    </aside>
  );
};

export default SideNav;
