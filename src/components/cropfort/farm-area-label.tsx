"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listFarms } from "@/lib/api/benchmark-surveys";
import { cn } from "@/lib/utils";
import { useActiveFarmId, useFarmWorkspaceStore } from "@/store/farmWorkspaceStore";

/** Farm areas this user works on: the ones they approve when they have any (asset owner), else all. */
function useMyFarms() {
  const { activeProgram } = useCropfortAuth();
  const query = useQuery({
    queryKey: ["farms", "area-label", activeProgram?.id],
    queryFn: () => listFarms(),
    enabled: Boolean(activeProgram?.id),
    staleTime: 5 * 60_000,
  });
  const farms = query.data ?? [];
  const mine = farms.filter((f) => f.isApprover);
  return { farms: mine.length ? mine : farms, loading: query.isLoading };
}

/** Name of the selected farm area, or of all of them when none is selected. */
export function useFarmAreaName() {
  const { activeProgram } = useCropfortAuth();
  const { farms, loading } = useMyFarms();
  const activeFarmId = useActiveFarmId();
  const selected = farms.find((f) => f.id === activeFarmId);
  const names = farms.map((f) => f.name).filter(Boolean);
  const label = selected
    ? selected.name
    : names.length === 0
      ? activeProgram?.name || ""
      : names.length === 1
        ? names[0]
        : "All farm areas";
  return { label, names, loading };
}

/** "📍 Chaka" — the current farm area, for page headers. */
export function FarmAreaLabel({ className, size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
  const { label, names } = useFarmAreaName();
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 font-semibold text-foreground",
        size === "lg" ? "text-xl sm:text-2xl" : "text-sm",
        className,
      )}
      title={names.join(", ") || label}
    >
      <MapPin className={cn("shrink-0 text-primary", size === "lg" ? "h-5 w-5" : "h-4 w-4")} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

/**
 * Top-bar farm area switcher: works like a workspace. Choosing a farm area limits plans,
 * monthly work orders, work orders, approvals and the desk counts to that farm.
 */
export function FarmAreaSelector({ className }: { className?: string }) {
  const { activeProgram } = useCropfortAuth();
  const { farms } = useMyFarms();
  const activeFarmId = useActiveFarmId();
  const setFarm = useFarmWorkspaceStore((s) => s.setFarm);
  const { label } = useFarmAreaName();

  // A saved choice that no longer exists (farm removed, other workspace) falls back to all
  useEffect(() => {
    if (activeProgram?.id && activeFarmId && farms.length && !farms.some((f) => f.id === activeFarmId)) {
      setFarm(activeProgram.id, null);
    }
  }, [activeProgram?.id, activeFarmId, farms, setFarm]);

  if (!label) return null;

  const choose = (farmId: string | null) => activeProgram?.id && setFarm(activeProgram.id, farmId);

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "FA";
  const workspace = activeProgram?.name || "Workspace";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-w-0 max-w-[16rem] items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none transition-colors",
            "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          aria-label={`Farm area: ${label}. Switch farm area`}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground"
            aria-hidden
          >
            {activeFarmId ? initials(label) : <MapPin className="h-4 w-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold leading-tight tracking-tight text-foreground">{label}</span>
            <span className="block truncate text-xs text-muted-foreground">{workspace}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[min(18rem,calc(100vw-2rem))]">
        <DropdownMenuLabel className="font-normal">
          <p className="text-xs text-muted-foreground">Farm areas</p>
          <p className="truncate text-sm font-medium">{workspace}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => choose(null)} className="gap-2">
          <Check className={cn("h-4 w-4 shrink-0", activeFarmId ? "opacity-0" : "opacity-100")} aria-hidden />
          <span className="min-w-0 flex-1 truncate">All farm areas</span>
          <span className="text-[10px] tabular-nums text-muted-foreground">{farms.length}</span>
        </DropdownMenuItem>
        {farms.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">No farm areas yet</div>
        ) : (
          farms.map((f) => (
            <DropdownMenuItem key={f.id} onSelect={() => choose(f.id)} className="gap-2">
              <Check className={cn("h-4 w-4 shrink-0", activeFarmId === f.id ? "opacity-100" : "opacity-0")} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
