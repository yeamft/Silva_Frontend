import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const ArchiveView = dynamic(() => import("./archive-view"), {
  loading: () => <PageSkeleton cards={4} />,
});

export default function RateCardArchivePage() {
  return <ArchiveView />;
}
