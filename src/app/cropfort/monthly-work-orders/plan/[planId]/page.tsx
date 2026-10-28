import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("../../monthly-work-orders-view"), {
  loading: () => <PageSkeleton />,
});

export default function MonthlyWorkOrdersPlanPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <View planId={decodeURIComponent(planId)} />
    </Suspense>
  );
}
