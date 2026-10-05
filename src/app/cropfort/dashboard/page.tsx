"use client";

import { lazyClient } from "@/lib/lazy-client";

const DashboardView = lazyClient(() => import("./dashboard-view"), { skeleton: "page" });

export default function DashboardPage() {
  return <DashboardView />;
}
