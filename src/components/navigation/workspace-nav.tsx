"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCropfortAuth } from "@/components/navigation/auth-context";
import {
  pathMatches,
  resolveWorkspaceFromPath,
} from "@/config/cropfort-workspaces";
import { DensityToggle } from "@/components/cropfort/density-toggle";
import { cn } from "@/lib/utils";

/** Level 2 — horizontal modules for the active workspace. */
export function WorkspaceNav() {
  const pathname = usePathname() ?? "";
  const { user } = useCropfortAuth();
  const { workspace, module } = resolveWorkspaceFromPath(pathname, user.role);

  if (!workspace || workspace.hideModuleNav || workspace.modules.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-border bg-card">
      <div className="flex flex-col gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <p className="cf-eyebrow text-[11px] sm:text-[13px]">{workspace.label}</p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
              {module?.label ?? workspace.label}
            </h1>
          </div>
          <DensityToggle className="hidden shrink-0 sm:flex" />
        </div>

        <nav
          aria-label={`${workspace.label} modules`}
          className="cf-tab-scroll -mx-3 border-b border-border px-3 sm:-mx-1 sm:px-0"
        >
          {workspace.modules.map((mod) => {
            const active = module?.id === mod.id || pathMatches(pathname, mod.href);
            return (
              <Link
                key={mod.id}
                href={mod.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative shrink-0 touch-manipulation px-3 py-2.5 text-[13px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {mod.label}
                {active ? (
                  <span
                    className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary"
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
