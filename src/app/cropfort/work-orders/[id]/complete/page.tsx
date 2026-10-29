"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("@/components/cropfort/work-order-report/work-order-complete-view"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function WorkOrderCompletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <View id={id} />;
}
