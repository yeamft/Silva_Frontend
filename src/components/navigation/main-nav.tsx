"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  CloudOff,
  Loader2,
  Menu,
  RefreshCw,
  X,
} from "lucide-react";
import { useNavigation } from "@/hooks/use-navigation";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { WorkspaceSwitcher } from "@/components/navigation/workspace-switcher";
import type { NavItem } from "@/config/navigation";
import { CROPFORT_ROLE_LABELS } from "@/types/cropfort";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 280;

function OfflineIndicator({
  isOnline,
  queuedItems,
  syncStatus,
}: {
  isOnline: boolean;
  queuedItems: number;
  syncStatus: "pending" | "syncing" | "synced";
}) {
  const base =
    "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-medium transition-colors duration-150";

  if (!isOnline) {
    return (
      <div
        className={cn(base, "border-warning/40 bg-warning/15 text-warning")}
        role="status"
        aria-live="polite"
        aria-label={`Offline${queuedItems > 0 ? `, ${queuedItems} items queued` : ""}`}
      >
        <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">
          Offline{queuedItems > 0 ? ` · ${queuedItems} queued` : ""}
        </span>
      </div>
    );
  }

  if (syncStatus === "syncing") {
    return (
      <div
        className={cn(base, "border-sidebar-border bg-sidebar-accent text-sidebar-foreground/90")}
        role="status"
        aria-live="polite"
        aria-label="Syncing"
      >
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
        <span className="truncate">Syncing{queuedItems > 0 ? ` · ${queuedItems}` : ""}</span>
      </div>
    );
  }

  if (syncStatus === "pending" || queuedItems > 0) {
    return (
      <div
        className={cn(base, "border-sidebar-border bg-sidebar-accent text-sidebar-foreground/90")}
        role="status"
        aria-label={`${queuedItems} items pending sync`}
      >
        <RefreshCw className="h-3.5 w-3.5 shrink-0 text-sidebar-primary" aria-hidden />
        <span className="truncate">Pending · {queuedItems}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(base, "border-transparent bg-sidebar-accent/60 text-sidebar-foreground/70")}
      role="status"
      aria-label="Online and synced"
    >
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-sidebar-primary" aria-hidden />
      <span className="truncate">All changes synced</span>
    </div>
  );
}

function NavLinks({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { items, isActive, isSectionActive } = useNavigation();
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenIds((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (item.children?.length && isSectionActive(item)) {
          next[item.id] = true;
        }
      }
      return next;
    });
  }, [items, isSectionActive]);

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <nav aria-label="Main" className="cf-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {items.map((item) => (
          <NavEntry
            key={item.id}
            item={item}
            open={Boolean(openIds[item.id])}
            onToggle={() => toggle(item.id)}
            onNavigate={onNavigate}
            isActive={isActive}
            isSectionActive={isSectionActive}
          />
        ))}
      </ul>
    </nav>
  );
}

function NavEntry({
  item,
  open,
  onToggle,
  onNavigate,
  isActive,
  isSectionActive,
}: {
  item: NavItem;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  isActive: (href: string, options?: { exact?: boolean }) => boolean;
  isSectionActive: (item: NavItem) => boolean;
}) {
  const Icon = item.icon;
  const hasChildren = Boolean(item.children?.length);
  const sectionActive = isSectionActive(item);
  const leafActive = !hasChildren && isActive(item.href);

  const rowClass = cn(
    "group relative flex min-h-11 w-full items-center gap-3 rounded-lg py-2 pl-3 pr-2.5 text-[13px] font-medium",
    "transition-[background-color,color] duration-150 ease-in-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
    sectionActive || leafActive
      ? "bg-sidebar-accent text-sidebar-foreground"
      : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
  );

  const iconClass = cn(
    "h-[17px] w-[17px] shrink-0 transition-colors duration-150",
    sectionActive || leafActive
      ? "text-sidebar-primary"
      : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/80"
  );

  if (!hasChildren) {
    return (
      <li>
        <Link
          href={item.href}
          aria-current={leafActive ? "page" : undefined}
          onClick={onNavigate}
          className={rowClass}
        >
          {leafActive ? (
            <span
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary"
              aria-hidden
            />
          ) : null}
          <Icon className={iconClass} aria-hidden />
          <span className="truncate">{item.label}</span>
        </Link>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={rowClass}
      >
        {sectionActive ? (
          <span
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary"
            aria-hidden
          />
        ) : null}
        <Icon className={iconClass} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-sidebar-foreground/40 transition-transform duration-150",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className="mt-0.5 space-y-0.5 border-l border-sidebar-border/70 ml-4 pl-2">
          {item.children!.map((child) => {
            const active = isActive(child.href, { exact: true });
            return (
              <li key={child.id}>
                <Link
                  href={child.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "flex min-h-10 items-center rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                    active
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <span className="truncate">{child.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

function SidebarChrome({ children }: { children: ReactNode }) {
  const { user } = useCropfortAuth();
  const { isOnline, queuedItems, syncStatus } = useNavigation();

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 border-b border-sidebar-border/70 px-2.5 py-3">
        <WorkspaceSwitcher />
      </div>

      {children}

      <div className="mt-auto shrink-0 space-y-3 border-t border-sidebar-border/70 px-3 py-3">
        <OfflineIndicator isOnline={isOnline} queuedItems={queuedItems} syncStatus={syncStatus} />
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-foreground"
            aria-hidden
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{user.name}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/50">
              {CROPFORT_ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cropfort main navigation — desktop sidebar + mobile drawer.
 * Role filtering, active states, offline indicator, keyboard + ARIA support.
 */
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
  const open = controlled ? mobileOpen! : internalOpen;
  const setOpen = onMobileOpenChange ?? setInternalOpen;

  useEffect(() => {
    const live = document.getElementById("cropfort-route-announcer");
    if (live) {
      live.textContent = `Navigated to ${pathname}`;
    }
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    closeBtnRef.current?.focus();

    const focusable = () =>
      Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select, textarea, input, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = focusable();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, setOpen]);

  return (
    <>
      <aside
        className="fixed inset-y-0 left-0 z-20 hidden w-[280px] flex-col border-r border-sidebar-border bg-sidebar shadow-[4px_0_24px_-8px_rgba(15,23,20,0.14),1px_0_4px_rgba(15,23,20,0.06)] md:flex"
        style={{ width: SIDEBAR_WIDTH }}
        aria-label="Cropfort sidebar"
      >
        <SidebarChrome>
          <NavLinks />
        </SidebarChrome>
      </aside>

      {/* Spacer keeps content clear of the fixed sidebar */}
      <div
        className="hidden shrink-0 md:block"
        style={{ width: SIDEBAR_WIDTH }}
        aria-hidden
      />

      {!controlled ? (
        <button
          type="button"
          className="cf-focus fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm md:hidden"
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="cropfort-mobile-nav"
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
            className="absolute inset-y-0 left-0 flex h-full max-h-[100dvh] w-full max-w-[300px] flex-col bg-sidebar shadow-[8px_0_32px_-8px_rgba(15,23,20,0.22),2px_0_8px_rgba(15,23,20,0.08)]"
          >
            <SidebarChrome>
              <div className="flex items-center justify-between border-y border-sidebar-border/70 px-4 py-2">
                <p id={titleId} className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">
                  Navigation
                </p>
                <button
                  ref={closeBtnRef}
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                  <X className="h-4.5 w-4.5" aria-hidden />
                </button>
              </div>
              <NavLinks onNavigate={() => setOpen(false)} />
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
      className="cf-focus flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors duration-150 hover:bg-muted md:hidden"
      aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={open}
      aria-controls="cropfort-mobile-nav"
      onClick={() => onOpenChange(!open)}
    >
      <Menu className="h-5 w-5" aria-hidden />
    </button>
  );
}
