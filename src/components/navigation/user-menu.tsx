"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Loader2, LogOut, MonitorSmartphone, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { CROPFORT_ROUTES } from "@/config/navigation";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import { CROPFORT_ROLE_LABELS } from "@/types/cropfort";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { user, logout, activeProgram, programs, switchProgram } = useCropfortAuth();
  const mfaEnabled = useAuthStore((s) => s.me?.mfaEnabled);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const itemClass =
    "cf-focus flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-muted";

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${user.name}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "cf-focus flex items-center gap-2 rounded-lg border border-transparent py-1 pl-1 pr-1.5 transition-colors duration-150 hover:bg-muted",
          open && "border-border bg-muted",
        )}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
          aria-hidden
        >
          {initials}
        </span>
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block truncate text-[13px] font-medium leading-tight">{user.name}</span>
          <span className="block truncate text-[11px] leading-tight text-muted-foreground">
            {CROPFORT_ROLE_LABELS[user.role]}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 lg:block",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(calc(100vw-1.5rem),18rem)] overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3.5">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              aria-hidden
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-border/70 px-4 py-2.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden />
            <span className="text-xs text-muted-foreground">
              {mfaEnabled ? "2FA active" : "JWT session"} · {CROPFORT_ROLE_LABELS[user.role]}
            </span>
          </div>

          {programs.length > 0 ? (
            <div className="border-b border-border/70 p-1.5">
              <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Program
              </p>
              {programs.map((program) => {
                const selected = program.id === activeProgram?.id;
                const busy = switchingId === program.id;
                return (
                  <button
                    key={program.id}
                    type="button"
                    role="menuitem"
                    disabled={!!switchingId}
                    className={itemClass}
                    onClick={async () => {
                      if (selected || switchingId) return;
                      setSwitchingId(program.id);
                      const result = await switchProgram(program.id);
                      setSwitchingId(null);
                      if (result.ok) {
                        toast.success(`Switched to ${program.name}`);
                        setOpen(false);
                      } else {
                        toast.error(result.error);
                      }
                    }}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                    ) : (
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground",
                          selected ? "opacity-100" : "opacity-0",
                        )}
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate text-left">{program.name}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="p-1.5">
            <Link
              href={CROPFORT_ROUTES.sessions}
              role="menuitem"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <MonitorSmartphone className="h-4 w-4 text-muted-foreground" aria-hidden />
              Active sessions
            </Link>
          </div>

          <div className="border-t border-border/70 p-1.5">
            <Link
              href={CROPFORT_ROUTES.profile}
              role="menuitem"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden />
              Profile settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className={cn(itemClass, "text-destructive hover:bg-destructive/10")}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
