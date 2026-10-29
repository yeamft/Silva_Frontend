"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("@/components/cropfort/plan-fix-view"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function PlanFixPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <View planId={id} />;
}
