import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./farm-map-view"), {
  loading: () => <PageSkeleton cards={2} />,
});

export default function FarmMapPage() {
  return <View />;
}
