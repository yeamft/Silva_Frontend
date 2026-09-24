import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("../proposals/rate-card-proposals-view"), {
  loading: () => <PageSkeleton />,
});

/** Archived rate cards register (status locked to archived). */
export default function RateCardArchivePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <View archiveMode />
    </Suspense>
  );
}
