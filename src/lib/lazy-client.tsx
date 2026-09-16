"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { PageSkeleton, ChartSkeleton, TableSkeletonBlock } from "@/components/cropfort/page-skeleton";

type DynOpts = {
  ssr?: boolean;
  skeleton?: "page" | "chart" | "table" | "none";
};

/** Shared dynamic() helper for Cropfort route chunks. */
export function lazyClient<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T } | T>,
  opts: DynOpts = {}
) {
  const { ssr = false, skeleton = "page" } = opts;

  const loading =
    skeleton === "none"
      ? undefined
      : () =>
          skeleton === "chart" ? (
            <ChartSkeleton />
          ) : skeleton === "table" ? (
            <div className="cf-card">
              <TableSkeletonBlock />
            </div>
          ) : (
            <PageSkeleton />
          );

  return dynamic(
    async () => {
      const mod = await loader();
      return "default" in (mod as object) ? (mod as { default: T }) : { default: mod as T };
    },
    { ssr, loading }
  );
}
