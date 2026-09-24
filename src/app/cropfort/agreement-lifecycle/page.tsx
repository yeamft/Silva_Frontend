import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./agreement-lifecycle-view"), {
  loading: () => <PageSkeleton />,
});

export default function AgreementLifecyclePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <View />
    </Suspense>
  );
}
