"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCropfortAuth, CROPFORT_ROLE_LABELS } from "@/components/navigation/auth-context";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ORG_TYPE_LABELS: Record<string, string> = {
  silva: "Silva",
  spx: "SPX",
  vendor: "Vendor",
};

function orgInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function WorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const { user, tenant, activeProgram, programs, switchProgram } = useCropfortAuth();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const orgName = tenant?.displayName || tenant?.name || user.tenantName;
  const orgType = tenant?.type || "";
  const orgTypeLabel = ORG_TYPE_LABELS[orgType] || orgType || "Org";
  const programName = activeProgram?.name || "No workspace";
  const activeId = activeProgram?.id;

  const handleSelect = async (programId: string) => {
    if (programId === activeId || switchingId) return;
    setSwitchingId(programId);
    const result = await switchProgram(programId);
    setSwitchingId(null);
    if (result.ok) {
      const next = programs.find((p) => p.id === programId);
      toast.success(next ? `Switched to ${next.name}` : "Workspace updated");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg text-left outline-none transition-colors",
            "hover:bg-sidebar-accent/70 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            compact ? "px-2 py-1.5" : "px-2.5 py-2",
          )}
          aria-label={`Workspace: ${programName}. Organization: ${orgName}`}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground"
            aria-hidden
          >
            {orgInitials(orgName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                {programName}
              </span>
              {!compact ? (
                <Badge
                  variant="muted"
                  className="h-5 shrink-0 px-1.5 text-[10px] font-medium uppercase tracking-wide"
                >
                  {orgTypeLabel}
                </Badge>
              ) : null}
            </span>
            <span className="block truncate text-xs text-sidebar-foreground/50">{orgName}</span>
          </span>
          <ChevronsUpDown
            className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[min(18rem,calc(100vw-2rem))]">
        <DropdownMenuLabel className="font-normal">
          <p className="text-xs text-muted-foreground">Programs</p>
          <p className="truncate text-sm font-medium">{orgName}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {programs.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">No workspaces assigned</div>
        ) : (
          programs.map((program) => {
            const selected = program.id === activeId;
            const busy = switchingId === program.id;
            return (
              <DropdownMenuItem
                key={program.id}
                disabled={!!switchingId}
                onSelect={(e) => {
                  e.preventDefault();
                  void handleSelect(program.id);
                }}
                className="gap-2"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Check
                    className={cn("h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")}
                    aria-hidden
                  />
                )}
                <span className="min-w-0 flex-1 truncate">{program.name}</span>
                {program.status !== "active" ? (
                  <span className="text-[10px] uppercase text-muted-foreground">{program.status}</span>
                ) : null}
              </DropdownMenuItem>
            );
          })
        )}

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="truncate text-xs font-medium">{orgName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {CROPFORT_ROLE_LABELS[user.role]}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkspaceChip() {
  const { user, tenant, activeProgram, programs, switchProgram } = useCropfortAuth();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const orgName = tenant?.displayName || tenant?.name || user.tenantName;
  const programName = activeProgram?.name || "Workspace";
  const activeId = activeProgram?.id;
  const canSwitch = programs.length > 1;

  const handleSelect = async (programId: string) => {
    if (programId === activeId || switchingId) return;
    setSwitchingId(programId);
    const result = await switchProgram(programId);
    setSwitchingId(null);
    if (result.ok) {
      const next = programs.find((p) => p.id === programId);
      toast.success(next ? `Switched to ${next.name}` : "Workspace updated");
    } else {
      toast.error(result.error);
    }
  };

  const chip = (
    <span
      className={cn(
        "flex min-w-0 max-w-[14rem] items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1.5 sm:max-w-xs",
        canSwitch && "cursor-pointer transition-colors hover:bg-muted",
      )}
      title={`${orgName} · ${programName}`}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-semibold text-primary-foreground"
        aria-hidden
      >
        {orgInitials(orgName)}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs sm:text-sm">
        <span className="font-medium text-foreground">{programName}</span>
        <span className="hidden text-muted-foreground sm:inline"> · {orgName}</span>
      </span>
      {canSwitch ? (
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </span>
  );

  if (!canSwitch) return chip;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          aria-label={`Switch program. Current: ${programName}`}
        >
          {chip}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(18rem,calc(100vw-2rem))]">
        <DropdownMenuLabel className="font-normal">
          <p className="text-xs text-muted-foreground">Programs</p>
          <p className="truncate text-sm font-medium">{orgName}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {programs.map((program) => {
          const selected = program.id === activeId;
          const busy = switchingId === program.id;
          return (
            <DropdownMenuItem
              key={program.id}
              disabled={!!switchingId}
              onSelect={(e) => {
                e.preventDefault();
                void handleSelect(program.id);
              }}
              className="gap-2"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Check
                  className={cn("h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")}
                  aria-hidden
                />
              )}
              <span className="min-w-0 flex-1 truncate">{program.name}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
