import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("../programme-plans-register-view"), {
  loading: () => <PageSkeleton />,
});

/** Archived programme plans register. */
export default function ProgrammePlansArchivePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <View archiveMode />
    </Suspense>
  );
}
