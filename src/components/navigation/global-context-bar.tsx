"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Check, ChevronDown, HelpCircle, Search } from "lucide-react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
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

const ThemeToggle = dynamic(() => import("@/components/ThemeToggle"), {
  ssr: false,
  loading: () => <div className="h-9 w-9" aria-hidden />,
});

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

  const estateLabel = useMemo(
    () => activeProgram?.name || tenant?.displayName || tenant?.name || "Estate",
    [activeProgram?.name, tenant?.displayName, tenant?.name],
  );

  const planLabel = useMemo(() => {
    if (activePlan) {
      const year = activePlan.budgetYearLabel || activePlan.planningCycleLabel || "";
      return year ? `${activePlan.name} · ${year}` : activePlan.name;
    }
    if (plansQuery.isLoading) return "Loading plans…";
    return "Select programme plan";
  }, [activePlan, plansQuery.isLoading]);

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
    if (!result.ok) toast.error(result.error || "Could not switch programme");
  };

  const onSelectPlan = (planId: string) => {
    if (!programId) return;
    setActivePlanId(programId, planId);
  };

  const triggerClass =
    "h-9 gap-1 border-transparent bg-transparent px-2 font-medium text-foreground shadow-none hover:bg-muted touch-manipulation";

  const iconBtn =
    "relative h-9 w-9 shrink-0 touch-manipulation text-muted-foreground";

  return (
    <div
      className={cn(
        "flex h-14 min-h-14 items-center gap-0.5 bg-card px-2 sm:gap-1 sm:px-4 md:px-6",
        className,
      )}
    >
      {/* Mobile: estate + plan in one menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(triggerClass, "min-w-0 max-w-[min(42vw,11rem)] sm:hidden")}
            disabled={switching}
            aria-label={`Workspace context: ${estateLabel}, ${planLabel}`}
          >
            <span className="min-w-0 truncate">{estateLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[min(calc(100vw-1.5rem),18rem)]">
          <DropdownMenuLabel>Estate / programme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {programs.length === 0 ? (
            <DropdownMenuItem disabled>No workspaces</DropdownMenuItem>
          ) : (
            programs.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => void onSelectProgram(p.id)}
                className={cn(p.id === activeProgram?.id && "bg-accent")}
              >
                <span className="flex-1 truncate">{p.name}</span>
                {p.id === activeProgram?.id ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                ) : null}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Programme plan</DropdownMenuLabel>
          {plans.length === 0 ? (
            <DropdownMenuItem asChild>
              <Link href={CROPFORT_ROUTES.programmePlans}>Create a plan…</Link>
            </DropdownMenuItem>
          ) : (
            plans.slice(0, 12).map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => onSelectPlan(p.id)}
                className={cn(p.id === activePlanId && "bg-accent")}
              >
                <span className="flex-1 truncate">
                  {p.name}
                  {p.budgetYearLabel ? ` · ${p.budgetYearLabel}` : ""}
                </span>
                {p.id === activePlanId ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                ) : null}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Desktop: separate selectors */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(triggerClass, "hidden max-w-[14rem] sm:inline-flex")}
            disabled={switching}
          >
            <span className="truncate">{estateLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Estate / programme workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {programs.length === 0 ? (
            <DropdownMenuItem disabled>No workspaces</DropdownMenuItem>
          ) : (
            programs.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => void onSelectProgram(p.id)}
                className={cn(p.id === activeProgram?.id && "bg-accent")}
              >
                {p.name}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(triggerClass, "hidden max-w-[18rem] sm:inline-flex")}
          >
            <span className="truncate">{planLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Active programme plan</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {plans.length === 0 ? (
            <DropdownMenuItem asChild>
              <Link href={CROPFORT_ROUTES.programmePlans}>Open Programme Plans…</Link>
            </DropdownMenuItem>
          ) : (
            plans.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => onSelectPlan(p.id)}
                className={cn(p.id === activePlanId && "bg-accent")}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{p.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[p.farmName, p.budgetYearLabel, p.statusRaw?.replace(/_/g, " ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {p.id === activePlanId ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                ) : null}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={CROPFORT_ROUTES.programmePlans}>Manage plans…</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
          <Bell className="h-4 w-4" aria-hidden />
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
        <ThemeToggle />
        <div className="ml-0.5">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
