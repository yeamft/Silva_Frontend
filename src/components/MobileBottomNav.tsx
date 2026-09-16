"use client";

import { useMemo } from "react";
import { useLocaleStore } from "@/store/localeStore";
import { t } from "@/lib/translations";
import { ROLE_NAV_ACCESS } from "@/lib/roleNav";
import type { UserRole } from "@/store/authStore";
import { MOBILE_PRIMARY_NAV, OS_NAV_GROUPS } from "@/lib/osModules";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onOpenMenu: () => void;
  userRole?: UserRole | null;
}

const MobileBottomNav = ({
  activeView,
  onViewChange,
  userRole,
}: MobileBottomNavProps) => {
  const locale = useLocaleStore((s) => s.locale);
  const allowed = userRole ? ROLE_NAV_ACCESS[userRole] ?? [] : [];

  const items = useMemo(() => {
    const flat = OS_NAV_GROUPS.flatMap((g) => g.items);
    return MOBILE_PRIMARY_NAV.map((id) => flat.find((i) => i.id === id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => allowed.length === 0 || allowed.includes(item.id));
  }, [allowed]);

  const cols = Math.max(items.length, 1);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="mx-auto grid h-16 max-w-lg px-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = activeView === item.id;
          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              onClick={() => onViewChange(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "h-full flex-col gap-0.5 rounded-none px-1 py-1.5",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              <span className="max-w-full truncate text-[10px] font-medium leading-tight">
                {t(locale, item.labelKey)}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
