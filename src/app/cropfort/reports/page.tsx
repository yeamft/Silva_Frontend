import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./reports-view"), {
  loading: () => <PageSkeleton />,
});

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <View />
    </Suspense>
  );
}
