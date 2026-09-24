import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./progress-view"), {
  loading: () => <PageSkeleton />,
});

export default function ProgressPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <View />
    </Suspense>
  );
}
