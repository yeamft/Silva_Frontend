import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./farm-areas-view"), {
  loading: () => <PageSkeleton cards={2} />,
});

export default function FarmAreasPage() {
  return <View />;
}
