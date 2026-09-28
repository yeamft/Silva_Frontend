"use client";

import { Check, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WORKSPACE_COLORS } from "@/lib/workspace-themes";
import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";

/**
 * Appearance control — light/dark + workspace accent color.
 * Font is configured on Profile → Preferences.
 */
const ThemeToggle = () => {
  const dark = useThemeStore((s) => s.dark);
  const setDark = useThemeStore((s) => s.setDark);
  const workspaceColor = useThemeStore((s) => s.workspaceColor);
  const setWorkspaceColor = useThemeStore((s) => s.setWorkspaceColor);

  const active = WORKSPACE_COLORS.find((c) => c.id === workspaceColor) ?? WORKSPACE_COLORS[0];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 touch-manipulation text-muted-foreground sm:h-8 sm:w-8"
          aria-label="Workspace appearance"
          title="Workspace appearance"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 space-y-3 p-3 shadow-overlay">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">Mode</p>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setDark(false)}
              className={cn(
                "flex h-7 items-center justify-center gap-1 rounded-md border px-1.5 text-[11px] font-medium transition-colors",
                !dark
                  ? "border-primary/40 bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
              aria-pressed={!dark}
            >
              <Sun className="h-3 w-3" aria-hidden />
              Light
            </button>
            <button
              type="button"
              onClick={() => setDark(true)}
              className={cn(
                "flex h-7 items-center justify-center gap-1 rounded-md border px-1.5 text-[11px] font-medium transition-colors",
                dark
                  ? "border-primary/40 bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
              aria-pressed={dark}
            >
              <Moon className="h-3 w-3" aria-hidden />
              Dark
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-medium text-muted-foreground">Color</p>
            <span className="truncate text-[10px] text-muted-foreground">{active.label}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {WORKSPACE_COLORS.map((color) => {
              const selected = color.id === workspaceColor;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setWorkspaceColor(color.id)}
                  className={cn(
                    "relative flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                    selected
                      ? "border-foreground ring-1 ring-foreground/25"
                      : "border-border hover:border-foreground/40",
                  )}
                  aria-label={`${color.label}: ${color.description}`}
                  aria-pressed={selected}
                  title={`${color.label} — ${color.description}`}
                >
                  <span
                    className="absolute inset-0.5 rounded-full"
                    style={{ backgroundColor: color.primaryHex }}
                    aria-hidden
                  />
                  {selected ? (
                    <Check className="relative z-[1] h-2.5 w-2.5 text-white drop-shadow" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ThemeToggle;
