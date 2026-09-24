"use client";

import Link from "next/link";
import { getMobileNavItemsForRole } from "@/config/navigation";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { useNavigation } from "@/hooks/use-navigation";
import { cn } from "@/lib/utils";

const SHORT: Record<string, string> = {
  Overview: "Home",
  Planning: "Plan",
  Execution: "Exec",
  Control: "Ctrl",
  Performance: "Perf",
  "Standards & Rates": "Rates",
  Administration: "Admin",
};

export function CropfortMobileNav() {
  const { user } = useCropfortAuth();
  const { isSectionActive } = useNavigation();
  const items = getMobileNavItemsForRole(user.role);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Primary workspaces"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 shadow-[0_-6px_20px_-8px_rgba(15,23,20,0.14)] backdrop-blur-md md:hidden"
      style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
    >
      <ul
        className="mx-auto grid h-[3.75rem] max-w-lg px-1"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = isSectionActive(item);
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "cf-focus flex h-full min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium leading-tight touch-manipulation",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="max-w-full truncate">{SHORT[item.label] ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
