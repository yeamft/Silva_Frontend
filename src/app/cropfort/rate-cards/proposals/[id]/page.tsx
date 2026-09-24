import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./rate-card-proposal-detail-view"), {
  loading: () => <PageSkeleton />,
});

export default function RateCardProposalDetailPage() {
  return <View />;
}
