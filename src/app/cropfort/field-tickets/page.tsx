"use client";

import { Suspense } from "react";
import { lazyClient } from "@/lib/lazy-client";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = lazyClient(() => import("./field-execution-view"), { skeleton: "page" });

export default function FieldExecutionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <View />
    </Suspense>
  );
}
