import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./daily-coffee-collection-view"), {
  loading: () => <PageSkeleton />,
});

export default function DailyCoffeeCollectionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <View />
    </Suspense>
  );
}
