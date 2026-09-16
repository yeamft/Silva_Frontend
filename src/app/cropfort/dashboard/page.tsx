import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const DashboardView = dynamic(() => import("./dashboard-view"), {
  loading: () => <PageSkeleton cards={0} />,
});

export default function DashboardPage() {
  return <DashboardView />;
}
