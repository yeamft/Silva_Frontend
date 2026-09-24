"use client";

import { Check, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  WORKSPACE_COLORS,
} from "@/lib/workspace-themes";
import { useThemeStore } from "@/store/themeStore";
import { cn } from "@/lib/utils";

/**
 * Appearance control — light/dark + workspace accent color.
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
      <PopoverContent align="end" className="w-72 space-y-4 p-4 shadow-overlay">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Mode</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setDark(false)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                !dark
                  ? "border-primary/40 bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
              aria-pressed={!dark}
            >
              <Sun className="h-3.5 w-3.5" aria-hidden />
              Light
            </button>
            <button
              type="button"
              onClick={() => setDark(true)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                dark
                  ? "border-primary/40 bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
              aria-pressed={dark}
            >
              <Moon className="h-3.5 w-3.5" aria-hidden />
              Dark
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Workspace color</p>
            <span className="text-[11px] text-muted-foreground">{active.label}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
            {WORKSPACE_COLORS.map((color) => {
              const selected = color.id === workspaceColor;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setWorkspaceColor(color.id)}
                  className={cn(
                    "relative flex h-9 w-full items-center justify-center rounded-md border transition-colors",
                    selected
                      ? "border-foreground ring-1 ring-foreground/20"
                      : "border-border hover:border-foreground/30",
                  )}
                  aria-label={`${color.label}: ${color.description}`}
                  aria-pressed={selected}
                  title={color.label}
                >
                  <span
                    className="absolute inset-1 rounded-[4px]"
                    style={{ backgroundColor: dark ? color.dark.swatch : color.light.swatch }}
                    aria-hidden
                  />
                  {selected ? (
                    <Check className="relative z-[1] h-3.5 w-3.5 text-white drop-shadow" aria-hidden />
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
