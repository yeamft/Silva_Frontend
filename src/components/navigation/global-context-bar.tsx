"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
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

const PROGRAMME_YEARS = ["2026 Programme", "2027 Programme", "2028 Programme"];
const FARM_AREAS = ["All Farm Areas", "Sheka", "Gore", "Bonga"];

type GlobalContextBarProps = {
  onOpenSearch?: () => void;
  onOpenAttention?: () => void;
  attentionCount?: number;
  className?: string;
};

/**
 * Global context — estate / programme / area / search / attention.
 * Mobile: single estate control + icon utilities (no wrap).
 * Desktop: separate programme / farm area selectors.
 */
export function GlobalContextBar({
  onOpenSearch,
  onOpenAttention,
  attentionCount = 0,
  className,
}: GlobalContextBarProps) {
  const { activeProgram, programs, switchProgram, tenant } = useCropfortAuth();
  const [programmeYear, setProgrammeYear] = useState("2027 Programme");
  const [farmArea, setFarmArea] = useState("All Farm Areas");
  const [switching, setSwitching] = useState(false);

  const estateLabel = useMemo(
    () => activeProgram?.name || tenant?.displayName || tenant?.name || "Estate",
    [activeProgram?.name, tenant?.displayName, tenant?.name],
  );

  const onSelectProgram = async (programId: string) => {
    if (programId === activeProgram?.id || switching) return;
    setSwitching(true);
    const result = await switchProgram(programId);
    setSwitching(false);
    if (!result.ok) toast.error(result.error || "Could not switch programme");
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
      {/* Mobile: one context menu covers estate + year + farm area */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(triggerClass, "min-w-0 max-w-[min(42vw,11rem)] sm:hidden")}
            disabled={switching}
            aria-label={`Workspace context: ${estateLabel}, ${programmeYear}`}
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
          <DropdownMenuLabel>Planning period</DropdownMenuLabel>
          {PROGRAMME_YEARS.map((y) => (
            <DropdownMenuItem key={y} onClick={() => setProgrammeYear(y)}>
              <span className="flex-1">{y}</span>
              {y === programmeYear ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Farm areas</DropdownMenuLabel>
          {FARM_AREAS.map((area) => (
            <DropdownMenuItem key={area} onClick={() => setFarmArea(area)}>
              <span className="flex-1">{area}</span>
              {area === farmArea ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Desktop+ : separate selectors */}
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
          <Button variant="ghost" size="sm" className={cn(triggerClass, "hidden sm:inline-flex")}>
            <span className="truncate">{programmeYear}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Planning period</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PROGRAMME_YEARS.map((y) => (
            <DropdownMenuItem key={y} onClick={() => setProgrammeYear(y)}>
              {y}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="hidden h-4 w-px bg-border md:block" aria-hidden />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={cn(triggerClass, "hidden md:inline-flex")}>
            <span className="truncate">{farmArea}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Farm areas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {FARM_AREAS.map((area) => (
            <DropdownMenuItem key={area} onClick={() => setFarmArea(area)}>
              {area}
            </DropdownMenuItem>
          ))}
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
