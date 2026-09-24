import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./audit-trail-view"), {
  loading: () => <PageSkeleton />,
});

export default function AuditPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <View />
    </Suspense>
  );
}
