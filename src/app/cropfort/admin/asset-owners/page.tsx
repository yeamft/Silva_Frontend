import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./asset-owners-view"), {
  loading: () => <PageSkeleton cards={2} />,
});

export default function AssetOwnersPage() {
  return <View />;
}
