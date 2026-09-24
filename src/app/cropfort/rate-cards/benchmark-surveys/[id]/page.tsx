import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./benchmark-survey-detail-view"), {
  loading: () => <PageSkeleton />,
});

export default function BenchmarkSurveyDetailPage() {
  return <View />;
}
