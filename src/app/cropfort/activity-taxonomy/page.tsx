import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./activity-taxonomy-view"), {
  loading: () => <PageSkeleton />,
});

export default function ActivityTaxonomyPage() {
  return <View />;
}
