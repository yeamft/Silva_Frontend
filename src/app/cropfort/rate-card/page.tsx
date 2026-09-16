import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const RateCardView = dynamic(() => import("./rate-card-view"), {
  loading: () => <PageSkeleton cards={6} />,
});

export default function RateCardPage() {
  return <RateCardView />;
}
