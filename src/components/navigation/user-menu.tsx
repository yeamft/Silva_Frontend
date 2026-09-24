"use client";

import Link from "next/link";
import { ChevronDown, LogOut, MonitorSmartphone, UserRound } from "lucide-react";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { CROPFORT_ROLE_LABELS } from "@/types/cropfort";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { user, logout } = useCropfortAuth();

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-2 touch-manipulation px-1 hover:bg-muted sm:h-8"
          aria-label={`Account menu for ${user.name}`}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold text-foreground"
            aria-hidden
          >
            {initials}
          </span>
          <span className="hidden min-w-0 text-left lg:block">
            <span className="block truncate text-[13px] font-medium leading-tight">
              {user.name}
            </span>
            <span className="block truncate text-[11px] leading-tight text-muted-foreground">
              {CROPFORT_ROLE_LABELS[user.role]}
            </span>
          </span>
          <ChevronDown
            className="hidden h-4 w-4 shrink-0 text-muted-foreground lg:block"
            aria-hidden
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 z-[60]" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 py-1">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground"
              aria-hidden
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={CROPFORT_ROUTES.sessions} className="cursor-pointer gap-2">
            <MonitorSmartphone className="h-4 w-4 text-muted-foreground" aria-hidden />
            Active sessions
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={CROPFORT_ROUTES.profile} className="cursor-pointer gap-2">
            <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
            Profile settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => logout()}
          className={cn(
            "cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive",
          )}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
