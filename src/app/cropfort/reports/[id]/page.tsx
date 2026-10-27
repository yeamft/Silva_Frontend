import { Suspense, use } from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("../reports-view"), {
  loading: () => <PageSkeleton />,
});

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <View reportId={id} />
    </Suspense>
  );
}
