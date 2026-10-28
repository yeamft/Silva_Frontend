"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("../../work-orders-view"), {
  loading: () => <PageSkeleton />,
});

/** One plan's work orders: every activity to be done and the work orders under it. */
export default function WorkOrdersPlanPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  return <View planKey={decodeURIComponent(key)} />;
}
