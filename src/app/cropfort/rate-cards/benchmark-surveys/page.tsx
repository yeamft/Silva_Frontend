import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./benchmark-surveys-view"), {
  loading: () => <PageSkeleton />,
});

export default function BenchmarkSurveysPage() {
  return <View />;
}
