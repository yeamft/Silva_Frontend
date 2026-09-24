"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  PanelLeft,
  X,
} from "lucide-react";
import { useNavigation } from "@/hooks/use-navigation";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIDEBAR_EXPANDED = 232;
const SIDEBAR_COLLAPSED = 68;
const COLLAPSE_KEY = "cropfort.sidebar.collapsed";

function WorkspaceLinks({
  onNavigate,
  collapsed,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const { workspaces, isWorkspaceActive } = useNavigation();

  const linkClass = (active: boolean) =>
    cn(
      "group relative flex min-h-9 w-full items-center gap-2.5 rounded-md py-2 text-[13px] font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
      collapsed ? "justify-center px-0" : "px-2.5",
      active
        ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
    );

  return (
    <nav aria-label="Modules" className="cf-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-3 pt-3">
      {!collapsed ? (
        <p className="px-2.5 pb-1.5 text-[11px] font-medium text-sidebar-foreground/45">
          Navigate
        </p>
      ) : null}

      <TooltipProvider delayDuration={200}>
        <ul className="space-y-0.5">
          {workspaces.map((ws) => {
            const active = isWorkspaceActive(ws.id);
            const Icon = ws.icon;
            const row = (
              <Link
                href={ws.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={linkClass(active)}
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
                {!collapsed ? <span className="truncate">{ws.label}</span> : null}
              </Link>
            );

            return (
              <li key={ws.id}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{row}</TooltipTrigger>
                    <TooltipContent side="right">{ws.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      </TooltipProvider>
    </nav>
  );
}

function SidebarChrome({
  children,
  collapsed,
  onToggleCollapse,
}: {
  children: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { activeProgram } = useCropfortAuth();

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("shrink-0 border-b border-sidebar-border", collapsed ? "px-2 pb-3 pt-5" : "px-3 pb-3 pt-5")}>
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-[10px] font-semibold text-sidebar-primary-foreground"
            aria-hidden
          >
            CF
          </span>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold tracking-wide text-sidebar-foreground">
                CROPFORT
              </p>
              {activeProgram?.name ? (
                <p className="truncate text-[11px] text-sidebar-foreground/50">{activeProgram.name}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {children}

      {onToggleCollapse ? (
        <div className={cn("mt-auto shrink-0 border-t border-sidebar-border", collapsed ? "px-2 py-3" : "px-3 py-3")}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[12px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <PanelLeft className="h-4 w-4" />
                <span>Collapse</span>
                <ChevronLeft className="ml-auto h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function MainNav({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
} = {}) {
  const pathname = usePathname();
  const titleId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const controlled = typeof mobileOpen === "boolean";
  const [internalOpen, setInternalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const open = controlled ? mobileOpen! : internalOpen;
  const setOpen = onMobileOpenChange ?? setInternalOpen;

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    const live = document.getElementById("cropfort-route-announcer");
    if (live) live.textContent = `Navigated to ${pathname}`;
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    closeBtnRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, setOpen]);

  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <>
      <aside
        className="fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-sidebar-border bg-sidebar md:flex"
        style={{ width }}
        aria-label="Cropfort sidebar"
      >
        <SidebarChrome collapsed={collapsed} onToggleCollapse={toggleCollapse}>
          <WorkspaceLinks collapsed={collapsed} />
        </SidebarChrome>
      </aside>

      <div className="hidden shrink-0 md:block" style={{ width }} aria-hidden />

      {!controlled ? (
        <button
          type="button"
          className="cf-focus fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card md:hidden"
          aria-label="Open navigation menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/50 backdrop-blur-[2px]"
            aria-label="Close navigation menu"
            onClick={() => setOpen(false)}
          />
          <div
            ref={drawerRef}
            id="cropfort-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 left-0 flex h-full max-h-[100dvh] w-full max-w-[300px] flex-col bg-sidebar shadow-lg"
          >
            <SidebarChrome>
              <div className="flex items-center justify-between border-b border-sidebar-border/70 px-4 py-2">
                <p id={titleId} className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">
                  Navigate
                </p>
                <button
                  ref={closeBtnRef}
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sidebar-accent"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <WorkspaceLinks onNavigate={() => setOpen(false)} />
            </SidebarChrome>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function MobileNavTrigger({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="cf-focus flex h-9 w-9 touch-manipulation items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground md:hidden"
      aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={open}
      aria-controls="cropfort-mobile-nav"
      onClick={() => onOpenChange(!open)}
    >
      <Menu className="h-5 w-5" aria-hidden />
    </button>
  );
}
