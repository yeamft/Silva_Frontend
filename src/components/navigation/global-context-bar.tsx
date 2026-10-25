"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, ChevronDown, HelpCircle, Search } from "lucide-react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { NotificationBell } from "@/components/navigation/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useProgrammePlans } from "@/lib/query/hooks/use-programme-plans";
import { usePlanningContextStore } from "@/store/planningContextStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const UserMenu = dynamic(
  () => import("@/components/navigation/user-menu").then((m) => m.UserMenu),
  {
    ssr: false,
    loading: () => (
      <div className="h-9 w-9 rounded-full border border-border bg-muted" aria-hidden />
    ),
  },
);

type GlobalContextBarProps = {
  onOpenSearch?: () => void;
  onOpenAttention?: () => void;
  attentionCount?: number;
  className?: string;
};

/**
 * Global context — estate / programme plan / search / attention.
 */
export function GlobalContextBar({
  onOpenSearch,
  onOpenAttention,
  attentionCount = 0,
  className,
}: GlobalContextBarProps) {
  const { activeProgram, programs, switchProgram, tenant } = useCropfortAuth();
  const [switching, setSwitching] = useState(false);

  const programId = activeProgram?.id;
  const activePlanId = usePlanningContextStore((s) =>
    programId ? s.activePlanIdByProgram[programId] ?? null : null,
  );
  const setActivePlanId = usePlanningContextStore((s) => s.setActivePlanId);

  const plansQuery = useProgrammePlans(Boolean(programId));
  const plans = useMemo(
    () => (plansQuery.data || []).filter((p) => p.statusRaw !== "archived"),
    [plansQuery.data],
  );

  const activePlan = useMemo(
    () => plans.find((p) => p.id === activePlanId) ?? null,
    [plans, activePlanId],
  );

  const estateLabel = useMemo(() => {
    if (activePlan?.farmName) return activePlan.farmName;
    return activeProgram?.name || tenant?.displayName || tenant?.name || "Estate";
  }, [activePlan?.farmName, activeProgram?.name, tenant?.displayName, tenant?.name]);

  const yearLabel = useMemo(() => {
    if (!activePlan) return null;
    return activePlan.budgetYearLabel || activePlan.planningCycleLabel || null;
  }, [activePlan]);

  const planLabel = useMemo(() => {
    if (activePlan) {
      const year = yearLabel || "";
      return year ? `${activePlan.name} · ${year}` : activePlan.name;
    }
    if (plansQuery.isLoading) return "Loading plans…";
    return "Select Core Operations plan";
  }, [activePlan, plansQuery.isLoading, yearLabel]);

  // Drop stale remembered plan ids. ActivePlanSync then picks a valid preferred
  // plan — both share the same useProgrammePlans cache so they cannot oscillate.
  useEffect(() => {
    if (!programId || plansQuery.isLoading) return;
    if (activePlanId && plans.length > 0 && !plans.some((p) => p.id === activePlanId)) {
      setActivePlanId(programId, null);
    }
  }, [programId, activePlanId, plans, plansQuery.isLoading, setActivePlanId]);

  const onSelectProgram = async (nextProgramId: string) => {
    if (nextProgramId === activeProgram?.id || switching) return;
    setSwitching(true);
    const result = await switchProgram(nextProgramId);
    setSwitching(false);
    if (!result.ok) toast.error(result.error || "Could not switch Core Operations");
  };

  const onSelectPlan = (planId: string) => {
    if (!programId) return;
    setActivePlanId(programId, planId);
  };

  const triggerClass =
    "h-9 gap-1.5 rounded-lg border border-border/80 bg-card px-3 font-medium text-foreground shadow-sm transition-[border-color,background-color,box-shadow] duration-150 ease-out hover:border-primary/25 hover:bg-primary/[0.03] hover:shadow focus-visible:ring-2 focus-visible:ring-ring touch-manipulation motion-reduce:transition-none";

  const iconBtn =
    "relative h-9 w-9 shrink-0 rounded-lg border border-transparent text-muted-foreground transition-[border-color,background-color,color] duration-150 ease-out hover:border-border/70 hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring touch-manipulation motion-reduce:transition-none";

  return (
    <div
      className={cn(
        "sticky top-0 z-30 flex h-14 min-h-14 items-center gap-1 border-b border-border/80 bg-background/95 px-2 shadow-[0_2px_10px_-8px_hsl(var(--foreground)/0.25)] backdrop-blur-md sm:gap-2 sm:px-4 md:px-6",
        className,
      )}
    >


      <div className="ml-auto flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconBtn}
          onClick={onOpenSearch}
          aria-label="Search"
        >
          <Search className="h-4 w-4" aria-hidden />
        </Button>
        <NotificationBell />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconBtn}
          onClick={onOpenAttention}
          aria-label={
            attentionCount > 0
              ? `Needs attention, ${attentionCount} items`
              : "Needs attention"
          }
        >
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {attentionCount > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
              {attentionCount > 99 ? "99+" : attentionCount}
            </span>
          ) : null}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(iconBtn, "hidden sm:inline-flex")}
          aria-label="Help"
        >
          <HelpCircle className="h-4 w-4" aria-hidden />
        </Button>
        <div className="ml-0.5">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
