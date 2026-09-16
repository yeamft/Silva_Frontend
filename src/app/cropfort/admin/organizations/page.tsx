import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/cropfort/page-skeleton";

const View = dynamic(() => import("./organizations-view"), {
  loading: () => <PageSkeleton cards={2} />,
});

export default function OrganizationsPage() {
  return <View />;
}
