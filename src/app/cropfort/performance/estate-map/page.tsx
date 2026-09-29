import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./estate-map-view"), {
  loading: () => <PageSkeleton cards={2} />,
});

export default function EstateMapPage() {
  return <View />;
}
